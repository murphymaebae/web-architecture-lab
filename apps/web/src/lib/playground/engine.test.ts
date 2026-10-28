// Unit tests for the playground's simulation engine and latency maths.
// Run them with `npm test` from the repo root.
//
// The engine is plain TypeScript (no React), so we can build a tiny graph,
// run the clock forward and check that the numbers behave like real systems.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mix, quantile, slowestOf, then, withTimeout, work } from "./distribution";
import { initialState, step, wouldCreateCycle } from "./engine";
import { makeNode, SCENARIOS } from "./scenarios";
import type { Graph, NodeParams } from "./types";

/** Run the simulation for `seconds` simulated seconds. */
function run(graph: Graph, seconds: number, state = initialState(graph)) {
  let s = state;
  for (let i = 0; i < seconds * 10; i++) s = step(graph, s, 0.1);
  return s;
}

function chain(appParams: Partial<NodeParams> = {}, rps = 50): Graph {
  const users = makeNode("client", 0, 0, "Users", { rps });
  const app = makeNode("app", 0, 0, "App", { capacity: 100, latencyMs: 20, ...appParams });
  const db = makeNode("db", 0, 0, "DB", { capacity: 1000, latencyMs: 5 });
  return {
    nodes: [users, app, db],
    edges: [
      { id: "e1", from: users.id, to: app.id },
      { id: "e2", from: app.id, to: db.id },
    ],
  };
}

describe("latency distributions", () => {
  it("adds latencies when one call follows another", () => {
    const d = then(work(10), work(30));
    const mean = d.pts.reduce((s, [m, p]) => s + m * p, 0);
    assert.ok(Math.abs(mean - 40) < 0.01);
  });

  it("waits for the slowest call when calls run in parallel", () => {
    const fast = work(10);
    const slow = work(100);
    assert.ok(quantile(slowestOf([fast, slow]), 0.5) >= quantile(slow, 0.5));
    assert.ok(quantile(slowestOf([fast, slow]), 0.5) < quantile(then(fast, slow), 0.5));
  });

  it("blends cache hits and misses by likelihood", () => {
    const d = mix([
      { weight: 9, dist: work(1) },
      { weight: 1, dist: work(100) },
    ]);
    assert.ok(quantile(d, 0.5) < 5);
    assert.ok(quantile(d, 0.99) > 50);
  });

  it("counts requests slower than the timeout as failures", () => {
    const d = withTimeout(work(1000), 1500);
    assert.ok(d.fail > 0 && d.fail < 0.5);
  });
});

describe("simulation engine", () => {
  it("serves everything when there is plenty of capacity", () => {
    const s = run(chain(), 10);
    assert.ok(s.metrics.errorRate < 0.001);
    assert.ok(s.metrics.okRps > 45);
  });

  it("gets slower as a server gets busier, before it fails", () => {
    const quiet = run(chain({}, 20), 10).metrics.p50;
    const busy = run(chain({}, 90), 10).metrics.p50;
    assert.ok(busy > quiet * 1.5, `p50 ${quiet} -> ${busy}`);
  });

  it("refuses requests once a server is past its capacity", () => {
    const s = run(chain({}, 300), 10);
    assert.ok(s.metrics.errorRate > 0.4);
  });

  it("fixes the overload when you add replicas", () => {
    const s = run(chain({ replicas: 4 }, 300), 10);
    assert.ok(s.metrics.errorRate < 0.01);
  });

  it("autoscales, but only after the boot time", () => {
    const g = chain({ autoscale: true, bootSeconds: 5 }, 300);
    const early = run(g, 2);
    assert.ok(early.metrics.errorRate > 0.2, "still overloaded while booting");
    const later = run(g, 20, early);
    assert.ok(later.metrics.errorRate < 0.01, "recovered once replicas are up");
    assert.ok(later.runtime[g.nodes[1].id].replicas >= 5);
  });

  it("routes around a crashed server behind a load balancer", () => {
    const g = SCENARIOS.find((s) => s.id === "scale-out")!.build();
    const server1 = g.nodes.find((n) => n.label === "Server 1")!;
    server1.params.down = true;
    const s = run(g, 5);
    assert.equal(s.nodeStats[server1.id].inRps, 0);
  });

  it("sends everything to the database when the cache crashes", () => {
    const g = SCENARIOS.find((s) => s.id === "cache")!.build();
    const cache = g.nodes.find((n) => n.kind === "cache")!;
    const db = g.nodes.find((n) => n.kind === "db")!;
    const warm = run(g, 10);
    cache.params.down = true;
    const crashed = run(g, 5, warm);
    assert.ok(crashed.nodeStats[db.id].inRps > warm.nodeStats[db.id].inRps * 5);
    assert.ok(crashed.metrics.errorRate > warm.metrics.errorRate);
  });

  it("lets a queue absorb a spike instead of failing", () => {
    const g = SCENARIOS.find((s) => s.id === "queue")!.build();
    const queue = g.nodes.find((n) => n.kind === "queue")!;
    let s = run(g, 5);
    s = { ...s, spikeUntil: s.time + 5 };
    s = run(g, 5, s);
    assert.ok(s.nodeStats[queue.id].backlog > 100);
    s = run(g, 120, s);
    assert.ok(s.nodeStats[queue.id].backlog < 1, "drains afterwards");
  });

  it("refuses connections that would make a loop", () => {
    const g = chain();
    const [, app, db] = g.nodes;
    assert.equal(wouldCreateCycle(g, db.id, app.id), true);
    assert.equal(wouldCreateCycle(g, app.id, db.id), false);
  });
});
