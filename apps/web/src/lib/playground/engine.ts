/**
 * The simulation engine.
 *
 * Every tick (a fraction of a simulated second) it does two passes over the
 * graph:
 *
 *  1. **Top-down, following the traffic.** Starting at the users, work out how
 *     many requests per second reach each box, how many it can handle, how many
 *     wait in line and how many it has to drop. What a box handles is passed on
 *     to the boxes it is connected to.
 *
 *  2. **Bottom-up, building the user's experience.** Starting at the databases
 *     and APIs at the bottom, build a latency histogram for "a request that
 *     enters this box", combining each box's own time with everything below it.
 *     At the top, that histogram is what users feel: p50, p95, p99, errors.
 *
 * The maths is deliberately simple, but it is the same thinking real capacity
 * planning uses: utilisation, queueing, Little's Law and tail latency.
 */
import { KINDS } from "./catalog";
import {
  type Dist,
  FAILED,
  ZERO,
  mean,
  mix,
  quantile,
  slowestOf,
  then,
  withTimeout,
  work,
} from "./distribution";
import type {
  EdgeStats,
  Graph,
  Metrics,
  NodeRuntime,
  NodeStats,
  PlayNode,
  SimState,
} from "./types";

/** Autoscalers usually aim for about 60% busy, leaving headroom for surprises. */
const TARGET_UTILIZATION = 0.6;
/** Wait this many seconds between removing replicas, so the count doesn't flap. */
const SCALE_DOWN_COOLDOWN = 15;
/** A server only queues about one second of work before it starts refusing (HTTP 503). */
const MAX_QUEUE_SECONDS = 1;
/** Roughly how long (in seconds) a cold cache takes to fill back up. */
const WARM_UP_SECONDS = 20;
/** Keep a sample for the sparklines every half simulated second. */
const HISTORY_EVERY = 0.5;
const HISTORY_LENGTH = 240;
const SECONDS_PER_MONTH = 60 * 60 * 24 * 30;

const EMPTY_METRICS: Metrics = {
  time: 0,
  offeredRps: 0,
  okRps: 0,
  errorRate: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  meanMs: 0,
  costPerMonth: 0,
};

export function initialState(graph: Graph): SimState {
  const state: SimState = {
    time: 0,
    runtime: {},
    nodeStats: {},
    edgeStats: {},
    metrics: EMPTY_METRICS,
    history: [],
    spikeUntil: 0,
  };
  syncRuntime(graph, state);
  return state;
}

/** Make sure every node has runtime memory (call after adding/removing nodes). */
export function syncRuntime(graph: Graph, state: SimState) {
  for (const node of graph.nodes) {
    state.runtime[node.id] ??= {
      backlog: 0,
      replicas: node.params.replicas,
      booting: [],
      lastScaleDown: 0,
      warmHitRate: node.params.hitRate / 100,
    };
  }
  const ids = new Set(graph.nodes.map((n) => n.id));
  for (const id of Object.keys(state.runtime)) if (!ids.has(id)) delete state.runtime[id];
}

/** Order nodes so that every box comes after the boxes that send it traffic. */
export function topoOrder(graph: Graph): string[] {
  const indegree = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (const e of graph.edges) indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  const ready = graph.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    order.push(id);
    for (const e of graph.edges) {
      if (e.from !== id) continue;
      const d = (indegree.get(e.to) ?? 0) - 1;
      indegree.set(e.to, d);
      if (d === 0) ready.push(e.to);
    }
  }
  return order;
}

/** Would adding from → to create a loop? Loops would send requests round forever. */
export function wouldCreateCycle(graph: Graph, from: string, to: string): boolean {
  if (from === to) return true;
  const stack = [to];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of graph.edges) if (e.from === id) stack.push(e.to);
  }
  return false;
}

/** Total requests per second one box can handle right now. */
export function capacityOf(node: PlayNode, rt: NodeRuntime): number {
  const info = KINDS[node.kind];
  if (!info.limited) return Infinity;
  const p = node.params;
  switch (node.kind) {
    case "db":
      return p.capacity * (1 + p.readReplicas);
    case "cache":
    case "external":
      return p.capacity;
    default:
      return p.capacity * Math.max(rt.replicas, 0);
  }
}

/** How many parallel "servers" a box has, for the queueing formula. */
function serversOf(node: PlayNode, rt: NodeRuntime): number {
  if (node.kind === "db") return 1 + node.params.readReplicas;
  if (node.kind === "app" || node.kind === "gateway" || node.kind === "worker") {
    return Math.max(rt.replicas, 1);
  }
  return 1;
}

function isScalable(node: PlayNode) {
  return node.kind === "app" || node.kind === "gateway" || node.kind === "worker";
}

/** Multiplier on a client's traffic at simulated time t. */
function trafficShape(node: PlayNode, t: number): number {
  const noise = 1 + (Math.random() - 0.5) * 0.06;
  switch (node.params.pattern) {
    case "wave":
      // A two-minute "day": swings between 40% and 160% of the set traffic.
      return noise * (1 + 0.6 * Math.sin((2 * Math.PI * t) / 120));
    case "bursty": {
      const s = Math.sin(t * 0.9) + Math.sin(t * 0.31 + 1) + Math.sin(t * 0.17 + 2);
      return noise * (s > 2 ? 3 : 1);
    }
    default:
      return noise;
  }
}

/** Advance the simulation by `dt` simulated seconds. Returns a new state. */
export function step(graph: Graph, prev: SimState, dt: number): SimState {
  const t = prev.time + dt;
  const runtime: Record<string, NodeRuntime> = {};
  for (const [id, rt] of Object.entries(prev.runtime)) {
    runtime[id] = { ...rt, booting: [...rt.booting] };
  }
  const state: SimState = { ...prev, time: t, runtime };
  syncRuntime(graph, state);

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const outEdges = (id: string) =>
    graph.edges.filter(
      (e) => e.from === id && byId.has(e.to) && KINDS[byId.get(e.to)!.kind].acceptsInput,
    );
  const order = topoOrder(graph);
  const spiking = t < prev.spikeUntil;

  const inflow = new Map<string, number>();
  const edgeRps = new Map<string, number>();
  const nodeStats: Record<string, NodeStats> = {};
  const add = (id: string, rps: number) => inflow.set(id, (inflow.get(id) ?? 0) + rps);

  /** Healthy targets for a load balancer: it stops sending to crashed boxes. */
  const healthy = (id: string) =>
    outEdges(id).filter((e) => {
      const n = byId.get(e.to)!;
      return !n.params.down || KINDS[n.kind].failOpen;
    });

  const send = (edges: { id: string; to: string }[], rps: number) => {
    for (const e of edges) {
      edgeRps.set(e.id, (edgeRps.get(e.id) ?? 0) + rps);
      add(e.to, rps);
    }
  };

  // ---- Pass 1: follow the traffic down -----------------------------------
  for (const id of order) {
    const node = byId.get(id)!;
    const info = KINDS[node.kind];
    const p = node.params;
    const rt = runtime[id];

    if (node.kind === "client") {
      inflow.set(id, p.rps * trafficShape(node, t) * (spiking ? 5 : 1));
    }
    const inRps = inflow.get(id) ?? 0;

    // Autoscaling: decide how many replicas we want, and boot or retire them.
    if (isScalable(node)) {
      const ready = rt.booting.filter((at) => at <= t);
      rt.booting = rt.booting.filter((at) => at > t);
      rt.replicas += ready.length;
      if (p.autoscale && !p.down) {
        const want = Math.min(
          p.maxReplicas,
          Math.max(p.minReplicas, Math.ceil(inRps / (p.capacity * TARGET_UTILIZATION))),
        );
        const coming = rt.replicas + rt.booting.length;
        for (let i = coming; i < want; i++) rt.booting.push(t + p.bootSeconds);
        if (want < rt.replicas && t - rt.lastScaleDown > SCALE_DOWN_COOLDOWN) {
          rt.replicas -= 1;
          rt.lastScaleDown = t;
        }
      } else {
        rt.replicas = p.replicas;
        rt.booting = [];
      }
    }

    // Caches warm up gradually, and come back empty after a crash.
    if (node.kind === "cache" || node.kind === "cdn") {
      const target = p.hitRate / 100;
      if (p.down) rt.warmHitRate = 0;
      else if (rt.warmHitRate > target) rt.warmHitRate = target;
      else rt.warmHitRate += (target - rt.warmHitRate) * Math.min(1, dt / (WARM_UP_SECONDS / 3));
    }

    const stats: NodeStats = {
      inRps,
      servedRps: 0,
      errorRate: 0,
      utilization: 0,
      ownLatencyMs: 0,
      totalLatencyMs: 0,
      pathErrorRate: 0,
      backlog: 0,
      replicas: rt.replicas,
      booting: rt.booting.length,
      hitRate: rt.warmHitRate,
      costPerMonth: 0,
    };
    nodeStats[id] = stats;

    if (p.down) {
      rt.backlog = 0;
      if (info.failOpen) {
        // A crashed cache or CDN is skipped: everything goes straight through.
        stats.servedRps = inRps;
        const targets = outEdges(id);
        send(targets, targets.length ? inRps / targets.length : 0);
      } else {
        stats.errorRate = inRps > 0 ? 1 : 0;
      }
      continue;
    }

    if (node.kind === "queue") {
      // A queue accepts everything, and lets workers drain it at their own pace.
      const workers = outEdges(id);
      const drain = workers.reduce((sum, e) => {
        const w = byId.get(e.to)!;
        return w.params.down ? sum : sum + Math.min(capacityOf(w, runtime[w.id]), 1e6);
      }, 0);
      const total = rt.backlog + inRps * dt;
      const out = Math.min(total, drain * dt);
      rt.backlog = total - out;
      stats.servedRps = inRps;
      stats.ownLatencyMs = p.latencyMs;
      stats.backlog = rt.backlog;
      stats.utilization = drain > 0 ? Math.min(1, inRps / drain) : inRps > 0 ? 1 : 0;
      if (rt.backlog > 1) stats.utilization = 1;
      // Share the drained work between workers in proportion to their capacity.
      for (const e of workers) {
        const w = byId.get(e.to)!;
        if (w.params.down || drain === 0) continue;
        const share = Math.min(capacityOf(w, runtime[w.id]), 1e6) / drain;
        send([e], (out / dt) * share);
      }
      continue;
    }

    // Everything else: a server with some capacity and a short waiting line.
    const cap = capacityOf(node, rt);
    const total = rt.backlog + inRps * dt;
    const served = Math.min(total, cap * dt);
    const waiting = total - served;
    const maxQueue = Number.isFinite(cap) ? cap * MAX_QUEUE_SECONDS : 0;
    const dropped = Math.max(0, waiting - maxQueue);
    rt.backlog = waiting - dropped;

    const servedRps = served / dt;
    let errorRate = inRps > 0 ? Math.min(1, dropped / (inRps * dt)) : 0;
    if (node.kind === "external") errorRate = 1 - (1 - errorRate) * (1 - p.failureRate / 100);

    // Queueing delay. As a box gets busier, requests wait longer, and it gets
    // dramatically worse past ~80% busy. This is the Sakasegawa approximation
    // for a queue with c identical servers (M/M/c).
    const c = serversOf(node, rt);
    const rho = Number.isFinite(cap) && cap > 0 ? Math.min(inRps / cap, 0.97) : 0;
    const queueWait =
      rho > 0 ? (p.latencyMs * Math.pow(rho, Math.sqrt(2 * (c + 1)) - 1)) / (c * (1 - rho)) : 0;
    // Plus time spent behind the requests already waiting in line (Little's Law).
    const backlogWait = Number.isFinite(cap) && cap > 0 ? (rt.backlog / cap) * 1000 : 0;

    stats.servedRps = servedRps;
    stats.errorRate = errorRate;
    stats.utilization = Number.isFinite(cap) && cap > 0 ? Math.min(1, inRps / cap) : 0;
    if (rt.backlog > 1) stats.utilization = 1;
    stats.ownLatencyMs = p.latencyMs + queueWait + backlogWait;
    stats.backlog = rt.backlog;

    // Pass the handled traffic on.
    const targets = outEdges(id);
    if (node.kind === "cdn" || node.kind === "cache") {
      const misses = servedRps * (1 - rt.warmHitRate);
      send(targets, targets.length ? misses / targets.length : 0);
    } else if (node.kind === "lb") {
      const up = healthy(id);
      send(up, up.length ? servedRps / up.length : 0);
    } else if (info.hasOutput) {
      // Servers, gateways, workers and users call every box they are connected to.
      send(targets, servedRps);
    }
  }

  // ---- Pass 2: build the latency picture from the bottom up --------------
  const dists = new Map<string, Dist>();
  const distOf = (id: string) => dists.get(id) ?? FAILED;
  const splitEvenly = (ids: string[]) =>
    ids.length ? mix(ids.map((to) => ({ weight: 1, dist: distOf(to) }))) : FAILED;

  for (const id of [...order].reverse()) {
    const node = byId.get(id)!;
    const info = KINDS[node.kind];
    const p = node.params;
    const stats = nodeStats[id];
    const rt = runtime[id];
    const children = outEdges(id).map((e) => e.to);
    let d: Dist;

    if (p.down) {
      d = info.failOpen ? splitEvenly(children) : FAILED;
    } else {
      const own = work(stats.ownLatencyMs, stats.errorRate);
      switch (node.kind) {
        case "client":
          d = withTimeout(children.length ? slowestOf(children.map(distOf)) : FAILED, p.timeoutMs);
          break;
        case "cdn":
        case "cache": {
          const h = rt.warmHitRate;
          d = mix([
            { weight: h, dist: own },
            { weight: 1 - h, dist: then(own, splitEvenly(children)) },
          ]);
          break;
        }
        case "lb":
          d = then(own, splitEvenly(healthy(id).map((e) => e.to)));
          break;
        case "gateway":
          d = then(
            own,
            p.fanOut === "parallel"
              ? slowestOf(children.map(distOf))
              : children.reduce((acc, c) => then(acc, distOf(c)), ZERO),
          );
          break;
        case "app":
        case "worker":
          d = children.reduce((acc, c) => then(acc, distOf(c)), own);
          break;
        default:
          // Queues answer straight away (the work happens later); databases
          // and external APIs are at the bottom of the stack.
          d = own;
      }
    }
    dists.set(id, d);
    stats.totalLatencyMs = mean(d);
    stats.pathErrorRate = d.fail;

    // Cost: instances you pay for, plus per-request charges.
    const instances =
      node.kind === "db"
        ? 1 + p.readReplicas
        : isScalable(node)
          ? rt.replicas + rt.booting.length
          : 1;
    stats.costPerMonth =
      info.baseCost * instances + (info.costPerMillion * stats.servedRps * SECONDS_PER_MONTH) / 1e6;
  }

  const edgeStats: Record<string, EdgeStats> = {};
  for (const e of graph.edges) {
    edgeStats[e.id] = {
      rps: edgeRps.get(e.id) ?? 0,
      errorRate: nodeStats[e.to]?.pathErrorRate ?? 0,
    };
  }

  // ---- Headline numbers, from the users' point of view -------------------
  const clients = graph.nodes.filter((n) => n.kind === "client");
  const offeredRps = clients.reduce((s, c) => s + (inflow.get(c.id) ?? 0), 0);
  const userDist = mix(clients.map((c) => ({ weight: inflow.get(c.id) ?? 0, dist: distOf(c.id) })));
  const errorRate = offeredRps > 0 ? userDist.fail : 0;
  const metrics: Metrics = {
    time: t,
    offeredRps,
    okRps: offeredRps * (1 - errorRate),
    errorRate,
    p50: quantile(userDist, 0.5),
    p95: quantile(userDist, 0.95),
    p99: quantile(userDist, 0.99),
    meanMs: mean(userDist),
    costPerMonth: Object.values(nodeStats).reduce((s, n) => s + n.costPerMonth, 0),
  };

  const last = prev.history[prev.history.length - 1];
  const history =
    !last || t - last.time >= HISTORY_EVERY
      ? [...prev.history, metrics].slice(-HISTORY_LENGTH)
      : prev.history;

  return { ...state, nodeStats, edgeStats, metrics, history };
}

/** Five times the normal traffic for ten simulated seconds. A flash sale! */
export function startSpike(state: SimState): SimState {
  return { ...state, spikeUntil: state.time + 10 };
}
