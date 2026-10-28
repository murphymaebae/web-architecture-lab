# 05 · Architecture playground: see the mechanics move

**Goal:** build an intuition for *why* architectures look the way they do.
Steps 1 to 4 showed you real code. This page lets you skip the code and play
with the forces underneath it: traffic, capacity, queueing, caching, failure
and cost.

Open it at **http://localhost:3000/playground** (`npm run dev:web` is enough;
it needs no backend).

## What you're looking at

- **Boxes** are parts of a system: users, a CDN, load balancers, servers,
  caches, databases, queues, workers, third-party APIs. Click one to see what
  it is and to change its settings.
- **Arrows** are calls. `A → B` means "every request A handles also needs B".
  The number on an arrow is requests per second (req/s), and the moving dots
  are that traffic. **Red dots** are requests that will fail further along.
- **The bar under each box** shows how busy it is. Green is fine, amber means
  over 80% busy (things slow down), red means it's refusing work.
- **The numbers along the top** are what users feel: how many requests
  succeed, the error rate, latency percentiles (p50, p95, p99) and a rough
  monthly bill.

Drag boxes around, add new ones from the parts bin, and connect them by
dragging from the blue dot on a box's right edge to another box. Your canvas
is remembered in the browser.

## Six scenarios, six lessons

| Scenario | The lesson |
| --- | --- |
| 1 · One server | Latency climbs long before errors start. Scaling one part moves the bottleneck to the next. |
| 2 · Scale out | Replicas give capacity *and* redundancy. Autoscaling helps, but new replicas take time to boot. |
| 3 · Add a cache | Caches make small databases look big, until the cache goes away (thundering herd, cold start). |
| 4 · CDN + static pages | Why rendering strategy matters at scale: every personalised (per-request) page is a CDN miss. Compare with `/rendering`. |
| 5 · Microservices + gateway | Fan-out: calling services one after another adds latencies; in parallel, you wait for the slowest. One flaky dependency hurts every request. Compare with `/architecture`. |
| 6 · Queue the slow work | Asynchronous work: queues turn failures into backlog. Great for users, but someone has to watch the backlog. |

Each scenario has a **Try this** list in the side panel when nothing is selected.

## The ideas behind the numbers

**Capacity and utilisation.** Each box can handle `capacity × replicas`
requests per second. Utilisation is `arriving ÷ capacity`.

**Queueing.** Requests that arrive while a box is busy wait in line. Waiting
time doesn't grow in a straight line, it shoots up as you approach 100%:

| Busy | Waiting time, roughly (one server) |
| --- | --- |
| 50% | 1 × the work time |
| 80% | 4 × |
| 90% | 9 × |
| 95% | 19 × |

That's why engineers aim to run at 50 to 70%, and why the autoscaler here
targets 60%. With several replicas the curve is gentler (the playground uses
the Sakasegawa approximation for an M/M/c queue, if you want to look it up).

**Little's Law.** `items waiting = arrival rate × time waiting`. If 200
requests are queued and a box handles 100 per second, the last one waits 2
seconds. The playground uses this for backlogs, and the queue tells you how
long its backlog will take to drain.

**Load shedding.** A server only queues about one second of work. Past that it
refuses new requests (an HTTP 503) instead of making everyone wait forever.

**Percentiles, not averages.** Every box has a small latency histogram with a
long tail (most requests are quick, a few are slow). The engine combines them
from the bottom up: adds them for sequential calls, takes the slowest for
parallel calls, and blends them for cache hits and misses. A request slower
than the users' *Patience* counts as an error.

**Fail open vs fail closed.** A crashed cache or CDN is skipped (traffic goes
straight through to what's behind it). A crashed server or database fails its
requests, unless a load balancer can route around it.

## How the code is organised

```
apps/web/src/lib/playground/       Pure TypeScript, no React
  types.ts          The data model: boxes, arrows, simulation state
  catalog.ts        Every kind of box: defaults, knobs, explanations, prices
  distribution.ts   Latency histograms and how to combine them
  engine.ts         One tick of the simulation (the two passes)
  insights.ts       Plain-English hints about what's going on
  scenarios.ts      The ready-made architectures
  engine.test.ts    Tests: run them with `npm test`
apps/web/src/components/playground/
  Playground.tsx    State, the clock (10 ticks a second), controls
  Canvas.tsx        The SVG drawing board, dragging, connecting, moving dots
  Inspector.tsx     The side panel of knobs and live numbers
  MetricsBar.tsx    Headline numbers and sparklines
apps/web/src/app/playground/page.tsx   The page (a Server Component)
```

Two patterns worth noticing:

1. **The engine knows nothing about React.** `step(graph, state, dt)` takes
   plain data and returns new plain data. That makes it easy to test (see
   `engine.test.ts`) and would let you reuse it anywhere, for example in the
   Expo app from step 4.
2. **The page is a Server Component; the playground is a Client Component.**
   `page.tsx` is rendered once on the server (it has no data). `Playground.tsx`
   starts with `"use client"`, so its JavaScript is sent to the browser and the
   simulation runs there. This is the same split as `/rendering/client` in
   step 1, used for a component that is interactive by nature.

## It's a model

The numbers are made up and the maths is simplified. Real systems have
connection pools, retries, garbage collection pauses, network partitions and
much more. But the *shapes* are real: the hockey-stick latency curve, the
bottleneck that moves, the thundering herd, the slow autoscaler. When you see
those in a real dashboard at work, you'll recognise them.

## Ideas to extend it

- Add **retries** to the client, and watch them make an overload worse (a
  "retry storm").
- Add a **circuit breaker** box that stops calling a failing dependency.
- Model **writes vs reads**, so read replicas only help with reads.
- Add **regions**: two copies of the stack and a global load balancer.
