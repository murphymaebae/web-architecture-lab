/**
 * Ready-made architectures to start from. Each one tells a small story and
 * comes with a few experiments to try.
 */
import { defaultParams, KINDS } from "./catalog";
import type { Graph, NodeKind, NodeParams, PlayEdge, PlayNode } from "./types";

export type Scenario = {
  id: string;
  title: string;
  summary: string;
  tryThis: string[];
  /** A page elsewhere in the lab that shows the real version of this idea. */
  related?: { href: string; label: string };
  build: () => Graph;
};

let counter = 0;
/** Unique-enough ids for nodes and edges created in the browser. */
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function makeNode(
  kind: NodeKind,
  x: number,
  y: number,
  label?: string,
  params: Partial<NodeParams> = {},
): PlayNode {
  return {
    id: newId(kind),
    kind,
    label: label ?? KINDS[kind].name,
    x,
    y,
    params: { ...defaultParams(kind), ...params },
  };
}

function link(...chain: PlayNode[]): PlayEdge[] {
  const edges: PlayEdge[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push({ id: newId("edge"), from: chain[i].id, to: chain[i + 1].id });
  }
  return edges;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "single",
    title: "1 · One server",
    summary:
      "Where every product starts: users, one server, one database. Simple, cheap, and fine until it isn't.",
    tryThis: [
      "Select Users and slowly raise Traffic to 120, then 300. Watch p95 climb long before anything breaks.",
      "At 300 req/s the server is red and requests are being refused. Give it 3 replicas.",
      "Now push traffic to 800. The database becomes the bottleneck. Scaling one part just moves the problem.",
    ],
    build: () => {
      const users = makeNode("client", 80, 240, "Users", { rps: 60 });
      const app = makeNode("app", 400, 240, "Web server");
      const db = makeNode("db", 720, 240, "Database");
      return { nodes: [users, app, db], edges: link(users, app, db) };
    },
  },
  {
    id: "scale-out",
    title: "2 · Scale out",
    summary:
      "Three copies of the server behind a load balancer. This is horizontal scaling, and it also gives you redundancy.",
    tryThis: [
      "Crash one server. The load balancer routes around it, but the other two are now overloaded.",
      "Turn on Autoscale for the survivors. Notice the gap while new replicas boot.",
      "Press Traffic spike. How long does it take to recover? Try a shorter Boot time.",
    ],
    build: () => {
      const users = makeNode("client", 80, 240, "Users", { rps: 270 });
      const lb = makeNode("lb", 280, 240);
      const apps = [100, 240, 380].map((y, i) => makeNode("app", 520, y, `Server ${i + 1}`));
      const db = makeNode("db", 780, 240, "Database", { capacity: 800 });
      return {
        nodes: [users, lb, ...apps, db],
        edges: [...link(users, lb), ...apps.flatMap((a) => [...link(lb, a), ...link(a, db)])],
      };
    },
  },
  {
    id: "cache",
    title: "3 · Add a cache",
    summary:
      "A cache in front of a small database absorbs 90% of lookups. Everything looks great... as long as the cache is up.",
    tryThis: [
      "Crash the cache. Every lookup lands on the database at once (a 'thundering herd').",
      "Bring it back. It returns empty (cold), so the pain lasts until it warms up.",
      "Lower the hit rate to 50%. How small can the database be with and without the cache?",
    ],
    build: () => {
      const users = makeNode("client", 80, 240, "Users", { rps: 600 });
      const lb = makeNode("lb", 260, 240);
      const a1 = makeNode("app", 460, 160, "Server 1", { capacity: 500, latencyMs: 30 });
      const a2 = makeNode("app", 460, 320, "Server 2", { capacity: 500, latencyMs: 30 });
      const cache = makeNode("cache", 660, 240, "Redis cache");
      const db = makeNode("db", 860, 240, "Database", { capacity: 300, latencyMs: 15 });
      return {
        nodes: [users, lb, a1, a2, cache, db],
        edges: [...link(users, lb, a1, cache, db), ...link(lb, a2, cache)],
      };
    },
  },
  {
    id: "cdn",
    title: "4 · CDN + static pages",
    summary:
      "Most page views are answered by a CDN at the edge. This is why the rendering strategy (SSG, ISR, SSR) matters so much at scale.",
    tryThis: [
      "Drop the CDN hit rate from 85% to 30%. That's what happens when every page is personalised (rendered per request).",
      "Crash the CDN. Traffic falls through to your servers: could they cope on their own?",
      "Raise Users to 10,000 req/s. With a high hit rate, what's the cheapest setup that survives?",
    ],
    related: { href: "/rendering", label: "Rendering strategies" },
    build: () => {
      const users = makeNode("client", 80, 240, "Users", { rps: 3000 });
      const cdn = makeNode("cdn", 260, 240, "CDN");
      const lb = makeNode("lb", 460, 240);
      const a1 = makeNode("app", 650, 160, "Next.js 1", { capacity: 400 });
      const a2 = makeNode("app", 650, 320, "Next.js 2", { capacity: 400 });
      const db = makeNode("db", 860, 240, "Database", { capacity: 1000 });
      return {
        nodes: [users, cdn, lb, a1, a2, db],
        edges: [...link(users, cdn, lb, a1, db), ...link(lb, a2, db)],
      };
    },
  },
  {
    id: "gateway",
    title: "5 · Microservices + gateway",
    summary:
      "Web and mobile apps share one API gateway, which calls three services to answer each request. Like step 2's federation gateway.",
    tryThis: [
      "Switch the gateway from 'One after another' to 'All at once'. Which number changes most: p50 or p99?",
      "Make the recommendations API flaky (10%). One weak dependency hurts every request.",
      "Raise the 3rd-party Work time to 2000 ms. Now check what Patience (timeout) does to errors.",
    ],
    related: { href: "/architecture", label: "Monolith vs microservices" },
    build: () => {
      const web = makeNode("client", 80, 150, "Web users", { rps: 150 });
      const mobile = makeNode("client", 80, 330, "Mobile app", { rps: 100 });
      const gw = makeNode("gateway", 260, 240, "GraphQL gateway");
      const catalog = makeNode("app", 480, 90, "Catalog service", { capacity: 400, latencyMs: 25 });
      const accounts = makeNode("app", 480, 240, "Accounts service", {
        capacity: 400,
        latencyMs: 20,
      });
      const recs = makeNode("app", 480, 390, "Recommendations", { capacity: 400, latencyMs: 15 });
      const catDb = makeNode("db", 720, 90, "Catalog DB");
      const accDb = makeNode("db", 720, 240, "Accounts DB");
      const ext = makeNode("external", 720, 390, "ML recs API");
      return {
        nodes: [web, mobile, gw, catalog, accounts, recs, catDb, accDb, ext],
        edges: [
          ...link(web, gw),
          ...link(mobile, gw),
          ...link(gw, catalog, catDb),
          ...link(gw, accounts, accDb),
          ...link(gw, recs, ext),
        ],
      };
    },
  },
  {
    id: "queue",
    title: "6 · Queue the slow work",
    summary:
      "Checkout replies straight away and drops the slow work (emails, payments, stock updates) on a queue for background workers.",
    tryThis: [
      "Press Traffic spike. Users barely notice; the queue backlog grows instead and drains afterwards.",
      "Crash the worker. Nothing fails for users, but the backlog keeps growing. Who would notice, and when?",
      "Now connect the server straight to the worker (and delete the queue). Spike again and compare.",
    ],
    related: { href: "/journey", label: "Event-driven journeys" },
    build: () => {
      const users = makeNode("client", 80, 240, "Shoppers", { rps: 150 });
      const app = makeNode("app", 280, 240, "Checkout API", { capacity: 400, replicas: 2 });
      const queue = makeNode("queue", 500, 240, "Order queue");
      const worker = makeNode("worker", 700, 240, "Order worker", { replicas: 4 });
      const db = makeNode("db", 880, 240, "Orders DB");
      return { nodes: [users, app, queue, worker, db], edges: link(users, app, queue, worker, db) };
    },
  },
  {
    id: "blank",
    title: "Blank canvas",
    summary: "Just users. Build your own architecture from the parts bin.",
    tryThis: [
      "Add boxes from the parts bin, then drag from a box's right-hand dot to another box to connect them.",
      "Try sketching an architecture you know (your work, a shop, a streaming site) and find its bottleneck.",
    ],
    build: () => ({ nodes: [makeNode("client", 80, 240, "Users", { rps: 100 })], edges: [] }),
  },
];
