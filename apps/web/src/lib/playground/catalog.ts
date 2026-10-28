/**
 * The "parts bin": every kind of box you can put on the canvas, with its
 * default settings, which knobs it shows, and a plain-English explanation.
 */
import type { NodeKind, NodeParams } from "./types";

/** One knob in the inspector panel. */
export type ParamSpec =
  | {
      key: keyof NodeParams;
      type: "slider";
      label: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
      /** Slide along a log scale, for values that range from 1 to 100,000. */
      log?: boolean;
      help: string;
    }
  | { key: keyof NodeParams; type: "toggle"; label: string; help: string }
  | {
      key: keyof NodeParams;
      type: "select";
      label: string;
      options: { value: string; label: string }[];
      help: string;
    };

export type KindInfo = {
  kind: NodeKind;
  name: string;
  icon: string;
  /** Tailwind-free hex colour so the SVG canvas can use it directly. */
  color: string;
  /** One-line summary for the palette. */
  short: string;
  /** What it is and why architects use it. */
  about: string;
  /** Can other boxes send requests to it? (Users only send, never receive.) */
  acceptsInput: boolean;
  /** Can it send requests onwards? */
  hasOutput: boolean;
  /** If it crashes, does traffic go straight through instead of failing? */
  failOpen: boolean;
  /** Does this kind of box have a capacity limit worth modelling? */
  limited: boolean;
  /** Monthly cost of one replica / instance (made-up but realistic ratios). */
  baseCost: number;
  /** Extra cost per million requests handled (CDNs and APIs charge per call). */
  costPerMillion: number;
  params: ParamSpec[];
  defaults: Partial<NodeParams>;
};

const BASE_PARAMS: NodeParams = {
  rps: 200,
  pattern: "steady",
  timeoutMs: 3000,
  latencyMs: 20,
  capacity: 100,
  replicas: 1,
  readReplicas: 0,
  hitRate: 80,
  failureRate: 0,
  autoscale: false,
  minReplicas: 1,
  maxReplicas: 10,
  bootSeconds: 20,
  fanOut: "sequential",
  down: false,
};

const down: ParamSpec = {
  key: "down",
  type: "toggle",
  label: "Crash it",
  help: "Pretend this box has crashed. Watch who notices and who doesn't.",
};

const latency = (max = 500): ParamSpec => ({
  key: "latencyMs",
  type: "slider",
  label: "Work time",
  min: 1,
  max,
  step: 1,
  unit: "ms",
  log: true,
  help: "How long one request takes when the box is idle. Real latency grows as it gets busier.",
});

const capacity: ParamSpec = {
  key: "capacity",
  type: "slider",
  label: "Capacity per replica",
  min: 10,
  max: 20000,
  step: 10,
  unit: "req/s",
  log: true,
  help: "The most requests per second one copy can handle before requests start to queue up.",
};

const replicas: ParamSpec = {
  key: "replicas",
  type: "slider",
  label: "Replicas",
  min: 1,
  max: 20,
  step: 1,
  help: "Identical copies behind a load balancer. More copies = more capacity (horizontal scaling).",
};

const autoscaling: ParamSpec[] = [
  {
    key: "autoscale",
    type: "toggle",
    label: "Autoscale",
    help: "Add replicas when busy, remove them when quiet. Aims for about 60% busy.",
  },
  {
    key: "maxReplicas",
    type: "slider",
    label: "Max replicas",
    min: 1,
    max: 30,
    step: 1,
    help: "A ceiling so a traffic spike (or an attack) can't run up an unlimited bill.",
  },
  {
    key: "bootSeconds",
    type: "slider",
    label: "Boot time",
    min: 1,
    max: 120,
    step: 1,
    unit: "s",
    help: "How long a new replica takes to start. Containers: seconds. Big VMs: minutes.",
  },
];

const hitRate = (help: string): ParamSpec => ({
  key: "hitRate",
  type: "slider",
  label: "Hit rate",
  min: 0,
  max: 100,
  step: 1,
  unit: "%",
  help,
});

export const KINDS: Record<NodeKind, KindInfo> = {
  client: {
    kind: "client",
    name: "Users",
    icon: "👥",
    color: "#6366f1",
    short: "Where traffic comes from",
    about:
      "A group of people using your site or app. Add more than one to model different channels (web, mobile, partners) hitting the same backend.",
    acceptsInput: false,
    hasOutput: true,
    failOpen: false,
    limited: false,
    baseCost: 0,
    costPerMillion: 0,
    params: [
      {
        key: "rps",
        type: "slider",
        label: "Traffic",
        min: 1,
        max: 50000,
        step: 1,
        unit: "req/s",
        log: true,
        help: "Requests per second. 100 req/s is a busy small shop; 10,000+ is a big sale day.",
      },
      {
        key: "pattern",
        type: "select",
        label: "Pattern",
        options: [
          { value: "steady", label: "Steady" },
          { value: "wave", label: "Daily wave (busy, quiet, busy)" },
          { value: "bursty", label: "Bursty (random surges)" },
        ],
        help: "Real traffic is never flat. Waves and bursts test how well the system adapts.",
      },
      {
        key: "timeoutMs",
        type: "slider",
        label: "Patience",
        min: 100,
        max: 10000,
        step: 100,
        unit: "ms",
        log: true,
        help: "Users give up (and browsers time out) after this long. Slow counts as broken.",
      },
    ],
    defaults: { rps: 200 },
  },
  cdn: {
    kind: "cdn",
    name: "CDN",
    icon: "🌍",
    color: "#0ea5e9",
    short: "Copies of pages near users",
    about:
      "A Content Delivery Network keeps copies of pages and files in data centres close to users. A hit is answered in milliseconds and never touches your servers. Statically rendered (SSG) and ISR pages are what make high hit rates possible.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: true,
    limited: false,
    baseCost: 20,
    costPerMillion: 0.75,
    params: [
      hitRate(
        "Share of requests served from the edge. Static pages: 95%+. Personalised pages: close to 0%.",
      ),
      latency(100),
      down,
    ],
    defaults: { hitRate: 85, latencyMs: 15 },
  },
  lb: {
    kind: "lb",
    name: "Load balancer",
    icon: "⚖️",
    color: "#8b5cf6",
    short: "Spreads traffic across servers",
    about:
      "Shares incoming requests evenly between the boxes behind it, and stops sending to any that fail their health check. Connect it to several servers to see it route around a crash.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: false,
    limited: false,
    baseCost: 25,
    costPerMillion: 0.1,
    params: [latency(20), down],
    defaults: { latencyMs: 1 },
  },
  gateway: {
    kind: "gateway",
    name: "API gateway",
    icon: "🚪",
    color: "#f59e0b",
    short: "One front door to many services",
    about:
      "A single entry point (often GraphQL) that calls several services to answer one request. The big question: does it call them one after another, or all at once? Like the federation gateway in step 2.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: false,
    limited: true,
    baseCost: 60,
    costPerMillion: 0,
    params: [
      {
        key: "fanOut",
        type: "select",
        label: "Calls services",
        options: [
          { value: "sequential", label: "One after another" },
          { value: "parallel", label: "All at once (parallel)" },
        ],
        help: "Sequential: latencies add up. Parallel: you wait for the slowest one.",
      },
      latency(200),
      capacity,
      replicas,
      ...autoscaling,
      down,
    ],
    defaults: { latencyMs: 5, capacity: 2000, replicas: 1 },
  },
  app: {
    kind: "app",
    name: "Server / service",
    icon: "🖥️",
    color: "#10b981",
    short: "Runs your code (SSR, APIs)",
    about:
      "An application server: renders pages on demand (SSR) or answers API calls. Can be a whole monolith or one microservice. It calls everything it is connected to for every request.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: false,
    limited: true,
    baseCost: 70,
    costPerMillion: 0,
    params: [latency(500), capacity, replicas, ...autoscaling, down],
    defaults: { latencyMs: 40, capacity: 150, replicas: 1 },
  },
  worker: {
    kind: "worker",
    name: "Worker",
    icon: "⚙️",
    color: "#14b8a6",
    short: "Does background jobs",
    about:
      "Picks jobs off a queue and does them in the background: sending emails, processing orders, resizing images. Users never wait for it directly.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: false,
    limited: true,
    baseCost: 50,
    costPerMillion: 0,
    params: [latency(2000), capacity, replicas, ...autoscaling, down],
    defaults: { latencyMs: 200, capacity: 50, replicas: 1 },
  },
  cache: {
    kind: "cache",
    name: "Cache",
    icon: "⚡",
    color: "#ef4444",
    short: "Remembers recent answers",
    about:
      "An in-memory store (like Redis) that remembers answers so the database doesn't have to work them out again. When it crashes or restarts, it comes back empty (cold) and everything hits the database at once.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: true,
    limited: true,
    baseCost: 150,
    costPerMillion: 0,
    params: [hitRate("Share of lookups the cache can answer once it is warm."), latency(20), down],
    defaults: { hitRate: 90, latencyMs: 1, capacity: 50000 },
  },
  db: {
    kind: "db",
    name: "Database",
    icon: "🗄️",
    color: "#64748b",
    short: "Where the data lives",
    about:
      "The source of truth. Usually the hardest part to scale: you can add read replicas, but every write still goes to one primary. Often the first bottleneck you'll hit.",
    acceptsInput: true,
    hasOutput: false,
    failOpen: false,
    limited: true,
    baseCost: 400,
    costPerMillion: 0,
    params: [
      latency(200),
      { ...capacity, label: "Capacity", max: 50000 },
      {
        key: "readReplicas",
        type: "slider",
        label: "Read replicas",
        min: 0,
        max: 5,
        step: 1,
        help: "Read-only copies. Each one adds capacity for reads (this model treats all traffic as reads).",
      },
      down,
    ],
    defaults: { latencyMs: 8, capacity: 600 },
  },
  queue: {
    kind: "queue",
    name: "Queue",
    icon: "📬",
    color: "#d946ef",
    short: "Holds work for later",
    about:
      "A message queue (like SQS, RabbitMQ or Kafka). Accepts work instantly and lets workers catch up at their own pace. Great for spikes: the backlog grows instead of requests failing.",
    acceptsInput: true,
    hasOutput: true,
    failOpen: false,
    limited: false,
    baseCost: 15,
    costPerMillion: 0.4,
    params: [latency(50), down],
    defaults: { latencyMs: 3 },
  },
  external: {
    kind: "external",
    name: "3rd-party API",
    icon: "🔌",
    color: "#78716c",
    short: "Someone else's service",
    about:
      "Payments, search, recommendations, address lookup... Outside your control: often slower, sometimes flaky, and with a rate limit.",
    acceptsInput: true,
    hasOutput: false,
    failOpen: false,
    limited: true,
    baseCost: 0,
    costPerMillion: 5,
    params: [
      latency(2000),
      {
        ...capacity,
        label: "Rate limit",
        help: "Calls per second they allow before refusing you.",
      },
      {
        key: "failureRate",
        type: "slider",
        label: "Flakiness",
        min: 0,
        max: 50,
        step: 1,
        unit: "%",
        help: "Share of calls that fail on their side, however quiet things are.",
      },
      down,
    ],
    defaults: { latencyMs: 150, capacity: 500, failureRate: 1 },
  },
};

/** The order kinds appear in the palette. */
export const PALETTE: NodeKind[] = [
  "client",
  "cdn",
  "lb",
  "gateway",
  "app",
  "cache",
  "db",
  "queue",
  "worker",
  "external",
];

export function defaultParams(kind: NodeKind): NodeParams {
  return { ...BASE_PARAMS, ...KINDS[kind].defaults };
}
