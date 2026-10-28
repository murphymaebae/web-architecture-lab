/**
 * Shared types for the architecture playground.
 *
 * The playground is a *model*, not a real system: every box on the canvas is a
 * small set of numbers (capacity, latency, hit rate...) and the engine works out
 * what would happen to traffic flowing through those boxes. Keeping the model
 * as plain data (no React in here) means the engine can be tested and reasoned
 * about on its own.
 */

/** Every kind of box you can drop on the canvas. */
export type NodeKind =
  | "client"
  | "cdn"
  | "lb"
  | "gateway"
  | "app"
  | "worker"
  | "cache"
  | "db"
  | "queue"
  | "external";

/** How a client's traffic changes over time. */
export type TrafficPattern = "steady" | "wave" | "bursty";

/** How a gateway calls the services behind it. */
export type FanOut = "sequential" | "parallel";

/**
 * The knobs on a box. Not every kind uses every knob; `catalog.ts` lists which
 * knobs each kind shows in the inspector.
 */
export type NodeParams = {
  /** Client only: requests per second this group of users sends. */
  rps: number;
  /** Client only: the shape of the traffic over time. */
  pattern: TrafficPattern;
  /** Client only: how long a user waits before giving up (milliseconds). */
  timeoutMs: number;
  /** Time to do the work for one request when the box is idle (milliseconds). */
  latencyMs: number;
  /** Requests per second ONE copy of this box can handle. */
  capacity: number;
  /** How many identical copies run side by side (horizontal scaling). */
  replicas: number;
  /** Database only: extra read-only copies that share the load. */
  readReplicas: number;
  /** CDN and cache: percentage of requests answered without asking downstream. */
  hitRate: number;
  /** External API only: percentage of calls that fail on their own. */
  failureRate: number;
  /** Add or remove replicas automatically based on load. */
  autoscale: boolean;
  minReplicas: number;
  maxReplicas: number;
  /** Seconds a new replica takes to boot before it can take traffic. */
  bootSeconds: number;
  /** Gateway only: call downstream services one after another, or all at once. */
  fanOut: FanOut;
  /** Simulates the box crashing. */
  down: boolean;
};

export type PlayNode = {
  id: string;
  kind: NodeKind;
  /** Your own name for it, e.g. "catalog service". */
  label: string;
  /** Position on the canvas (in canvas units, not screen pixels). */
  x: number;
  y: number;
  params: NodeParams;
};

/** A directed connection: `from` sends requests to `to`. */
export type PlayEdge = {
  id: string;
  from: string;
  to: string;
};

export type Graph = {
  nodes: PlayNode[];
  edges: PlayEdge[];
};

/**
 * Things the engine has to remember between ticks. Everything else is
 * recalculated from scratch every tick.
 */
export type NodeRuntime = {
  /** Requests waiting in line (or messages sitting in a queue). */
  backlog: number;
  /** Replicas that are running and taking traffic right now. */
  replicas: number;
  /** Simulated times at which replicas that are still booting will be ready. */
  booting: number[];
  /** Last time autoscaling removed a replica (so it doesn't flap). */
  lastScaleDown: number;
  /** Cache/CDN: the hit rate we actually get right now (a cold cache starts at 0). */
  warmHitRate: number;
};

/** What the engine worked out for one box during the latest tick. */
export type NodeStats = {
  /** Requests per second arriving. */
  inRps: number;
  /** Requests per second actually handled. */
  servedRps: number;
  /** Fraction of arriving requests this box itself failed (0..1). */
  errorRate: number;
  /** How busy the box is (0 = idle, 1 = flat out). */
  utilization: number;
  /** Average time spent in this box alone, including waiting in line (ms). */
  ownLatencyMs: number;
  /** Average time for a request that enters this box, including everything downstream (ms). */
  totalLatencyMs: number;
  /** Fraction of requests entering here that fail somewhere at or below this box. */
  pathErrorRate: number;
  backlog: number;
  replicas: number;
  booting: number;
  /** Cache/CDN: hit rate right now (0..1). */
  hitRate: number;
  /** Estimated running cost per month in made-up dollars. */
  costPerMonth: number;
};

export type EdgeStats = {
  /** Requests per second travelling along this connection. */
  rps: number;
  /** Fraction of those that fail at or below the target. */
  errorRate: number;
};

/** Headline numbers, as a user would experience them. */
export type Metrics = {
  time: number;
  offeredRps: number;
  okRps: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  meanMs: number;
  costPerMonth: number;
};

export type SimState = {
  /** Simulated seconds since the start. */
  time: number;
  runtime: Record<string, NodeRuntime>;
  nodeStats: Record<string, NodeStats>;
  edgeStats: Record<string, EdgeStats>;
  metrics: Metrics;
  /** Recent metrics, oldest first, for the sparklines. */
  history: Metrics[];
  /** Until this simulated time, clients send 5x their normal traffic. */
  spikeUntil: number;
};
