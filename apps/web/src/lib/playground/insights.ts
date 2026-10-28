/**
 * Plain-English observations about what the simulation is doing right now,
 * so you don't have to read every number to know where to look.
 */
import { KINDS } from "./catalog";
import type { Graph, SimState } from "./types";

export type Insight = { level: "good" | "info" | "warn" | "bad"; text: string; nodeId?: string };

export function insights(graph: Graph, state: SimState): Insight[] {
  const out: Insight[] = [];
  const { metrics } = state;

  for (const node of graph.nodes) {
    const s = state.nodeStats[node.id];
    const rt = state.runtime[node.id];
    if (!s || !rt) continue;
    const info = KINDS[node.kind];
    const name = node.label;

    if (node.params.down) {
      if (info.failOpen) {
        out.push({
          level: "warn",
          nodeId: node.id,
          text: `${name} is down, so everything falls straight through to what's behind it.`,
        });
      } else if (graph.edges.some((e) => e.to === node.id && kindOf(graph, e.from) === "lb")) {
        out.push({
          level: "info",
          nodeId: node.id,
          text: `${name} is down. The load balancer noticed and stopped sending it traffic.`,
        });
      } else if (node.kind === "worker") {
        out.push({
          level: "warn",
          nodeId: node.id,
          text: `${name} is down. Users don't notice yet, but the work is piling up.`,
        });
      } else {
        out.push({
          level: "bad",
          nodeId: node.id,
          text: `${name} is down and requests to it fail.`,
        });
      }
      continue;
    }

    if (node.kind === "queue" && s.backlog > 1) {
      const outRps = graph.edges
        .filter((e) => e.from === node.id)
        .reduce((sum, e) => sum + (state.edgeStats[e.id]?.rps ?? 0), 0);
      const net = outRps - s.inRps;
      const backlog = Math.round(s.backlog).toLocaleString();
      out.push({
        level: net > 0 ? "info" : "warn",
        nodeId: node.id,
        text:
          net > 0
            ? `${name} holds ${backlog} jobs and is draining: clear in about ${fmtSeconds(s.backlog / net)}.`
            : `${name} holds ${backlog} jobs and is growing. Workers can't keep up.`,
      });
      continue;
    }

    if (s.booting > 0) {
      out.push({
        level: "info",
        nodeId: node.id,
        text: `Autoscaler is booting ${s.booting} more ${name} replica${s.booting > 1 ? "s" : ""}. The others take the strain until then.`,
      });
    }

    if (
      (node.kind === "cache" || node.kind === "cdn") &&
      s.hitRate < node.params.hitRate / 100 - 0.05
    ) {
      out.push({
        level: "warn",
        nodeId: node.id,
        text: `${name} is cold: hitting ${Math.round(s.hitRate * 100)}% of an eventual ${node.params.hitRate}%. Extra traffic goes to what's behind it while it warms up.`,
      });
    }

    if (s.errorRate > 0.005) {
      out.push({
        level: "bad",
        nodeId: node.id,
        text:
          node.kind === "external" && node.params.failureRate > 0 && s.utilization < 1
            ? `${name} fails ${pct(s.errorRate)} of calls on its own. Every request that needs it is at risk.`
            : `${name} is overloaded and refusing ${pct(s.errorRate)} of requests.`,
      });
    } else if (info.limited && s.utilization > 0.85) {
      out.push({
        level: "warn",
        nodeId: node.id,
        text: `${name} is ${pct(s.utilization)} busy. Requests queue up and slow down well before it fails.`,
      });
    }

    if (
      node.kind === "gateway" &&
      node.params.fanOut === "sequential" &&
      graph.edges.filter((e) => e.from === node.id).length > 1
    ) {
      out.push({
        level: "info",
        nodeId: node.id,
        text: `${name} calls its services one after another. Try "All at once".`,
      });
    }

    // These boxes can't answer requests on their own: they need something behind them.
    const needsDownstream = ["client", "cdn", "cache", "lb", "gateway", "queue"];
    if (needsDownstream.includes(node.kind) && !graph.edges.some((e) => e.from === node.id)) {
      out.push({
        level: "bad",
        nodeId: node.id,
        text: `${name} isn't connected to anything yet. Drag from its right-hand dot to another box.`,
      });
    }
  }

  const timeouts = graph.nodes.some(
    (n) => n.kind === "client" && metrics.p99 > n.params.timeoutMs * 0.8,
  );
  if (timeouts && metrics.offeredRps > 0) {
    out.push({
      level: "bad",
      text: "Some requests are so slow that users give up (timeouts count as errors).",
    });
  }

  const order = { bad: 0, warn: 1, info: 2, good: 3 };
  out.sort((a, b) => order[a.level] - order[b.level]);

  if (out.length === 0) {
    out.push({
      level: "good",
      text: "Everything is healthy. Try raising the traffic, pressing Traffic spike, or crashing something.",
    });
  }
  return out.slice(0, 6);
}

function kindOf(graph: Graph, id: string) {
  return graph.nodes.find((n) => n.id === id)?.kind;
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function fmtSeconds(s: number) {
  if (s < 90) return `${Math.max(1, Math.round(s))}s`;
  return `${Math.round(s / 60)} min`;
}
