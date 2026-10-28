/**
 * Latency distributions.
 *
 * Averages hide the pain. If 95 requests take 20 ms and 5 take 4 seconds, the
 * average looks fine (219 ms) but one user in twenty is having a terrible time.
 * That's why engineers talk about percentiles: p50 (the typical request), p95
 * and p99 (the unlucky ones).
 *
 * To get percentiles, the engine carries a small histogram for every box: a list
 * of (latency, probability) points, plus the probability that the request fails.
 * Combining boxes is then a handful of simple rules:
 *
 *  - one box calls another:          add the latencies           (`then`)
 *  - a cache hit OR a miss:          blend the two by likelihood (`mix`)
 *  - wait for several calls at once: take the slowest of them    (`slowestOf`)
 */

export type Dist = {
  /** [latency in ms, probability] pairs for requests that succeed. */
  pts: [number, number][];
  /** Probability that the request fails. pts probabilities + fail = 1. */
  fail: number;
};

/** Keep histograms small so the engine stays fast. */
const MAX_POINTS = 40;

/**
 * Real work times vary: most requests are near the average, a few are much
 * slower (garbage collection, a cold disk, a noisy neighbour). This shape is a
 * rough stand-in for that long tail. The factors are scaled so the mean is 1.
 */
const JITTER: [number, number][] = (() => {
  const raw: [number, number][] = [
    [0.5, 0.15],
    [0.8, 0.25],
    [1, 0.25],
    [1.4, 0.2],
    [2.5, 0.1],
    [5, 0.05],
  ];
  const mean = raw.reduce((sum, [f, p]) => sum + f * p, 0);
  return raw.map(([f, p]) => [f / mean, p]);
})();

export const ZERO: Dist = { pts: [[0, 1]], fail: 0 };
export const FAILED: Dist = { pts: [], fail: 1 };

/** A single box's own time: `meanMs` on average with a long tail, failing `failRate` of the time. */
export function work(meanMs: number, failRate = 0): Dist {
  const ok = 1 - clamp01(failRate);
  return { pts: JITTER.map(([f, p]) => [f * meanMs, p * ok]), fail: 1 - ok };
}

/** Do `a`, then do `b`. Latencies add up; either one can fail. */
export function then(a: Dist, b: Dist): Dist {
  const pts: [number, number][] = [];
  for (const [ma, pa] of a.pts) for (const [mb, pb] of b.pts) pts.push([ma + mb, pa * pb]);
  return compress({ pts, fail: 1 - (1 - a.fail) * (1 - b.fail) });
}

/** One of several outcomes happens, each with a weight (e.g. 90% hit, 10% miss). */
export function mix(parts: { weight: number; dist: Dist }[]): Dist {
  const total = parts.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return FAILED;
  const pts: [number, number][] = [];
  let fail = 0;
  for (const { weight, dist } of parts) {
    const w = weight / total;
    for (const [m, p] of dist.pts) pts.push([m, p * w]);
    fail += dist.fail * w;
  }
  return compress({ pts, fail });
}

/**
 * Start several calls at the same time and wait for all of them. You finish
 * when the slowest one finishes, and you fail if any of them fails.
 * Maths: P(slowest <= t) = P(a <= t) * P(b <= t).
 */
export function slowestOf(dists: Dist[]): Dist {
  if (dists.length === 0) return ZERO;
  return dists.reduce((a, b) => {
    const okA = 1 - a.fail;
    const okB = 1 - b.fail;
    if (okA <= 0 || okB <= 0) return FAILED;
    const xs = [...new Set([...a.pts.map(([m]) => m), ...b.pts.map(([m]) => m)])].sort(
      (x, y) => x - y,
    );
    const pts: [number, number][] = [];
    let prev = 0;
    for (const x of xs) {
      const cdf = (cdfAt(a, x) / okA) * (cdfAt(b, x) / okB);
      if (cdf - prev > 1e-12) pts.push([x, (cdf - prev) * okA * okB]);
      prev = cdf;
    }
    return compress({ pts, fail: 1 - okA * okB });
  });
}

/** Anything slower than `timeoutMs` counts as a failure: the user gave up. */
export function withTimeout(d: Dist, timeoutMs: number): Dist {
  let lost = 0;
  const pts = d.pts.filter(([m, p]) => {
    if (m > timeoutMs) {
      lost += p;
      return false;
    }
    return true;
  });
  return { pts, fail: d.fail + lost };
}

/** The latency below which `q` (e.g. 0.95) of successful requests finish. */
export function quantile(d: Dist, q: number): number {
  const ok = 1 - d.fail;
  if (ok <= 0 || d.pts.length === 0) return 0;
  const sorted = [...d.pts].sort((x, y) => x[0] - y[0]);
  let acc = 0;
  for (const [m, p] of sorted) {
    acc += p / ok;
    if (acc >= q - 1e-9) return m;
  }
  return sorted[sorted.length - 1][0];
}

/** Average latency of successful requests. */
export function mean(d: Dist): number {
  const ok = 1 - d.fail;
  if (ok <= 0) return 0;
  return d.pts.reduce((s, [m, p]) => s + m * p, 0) / ok;
}

function cdfAt(d: Dist, x: number): number {
  let s = 0;
  for (const [m, p] of d.pts) if (m <= x) s += p;
  return s;
}

/**
 * Merge neighbouring points until at most MAX_POINTS remain. Each merged point
 * keeps the combined probability and the probability-weighted latency, so the
 * mean is preserved exactly and percentiles stay close.
 */
function compress(d: Dist): Dist {
  const sorted = d.pts.filter(([, p]) => p > 0).sort((a, b) => a[0] - b[0]);
  if (sorted.length <= MAX_POINTS) return { pts: sorted, fail: d.fail };
  const total = sorted.reduce((s, [, p]) => s + p, 0);
  const bucket = total / MAX_POINTS;
  const pts: [number, number][] = [];
  let accP = 0;
  let accM = 0;
  for (const [m, p] of sorted) {
    accP += p;
    accM += m * p;
    if (accP >= bucket) {
      pts.push([accM / accP, accP]);
      accP = 0;
      accM = 0;
    }
  }
  if (accP > 0) pts.push([accM / accP, accP]);
  return { pts, fail: d.fail };
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}
