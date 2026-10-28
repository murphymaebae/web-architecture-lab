/** Small helpers to turn raw numbers into friendly labels. */

export function fmtRps(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 10) return `${Math.round(n)}`;
  return n.toFixed(n < 1 && n > 0 ? 1 : 0);
}

export function fmtMs(ms: number): string {
  if (ms >= 10000) return `${Math.round(ms / 1000)} s`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms)} ms`;
}

export function fmtPct(x: number): string {
  if (x > 0 && x < 0.01) return "<1%";
  return `${Math.round(x * 100)}%`;
}

export function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Green, amber or red, depending on how busy something is (0..1). */
export function healthColor(utilization: number, errorRate: number): string {
  if (errorRate > 0.02 || utilization >= 0.98) return "#ef4444";
  if (utilization > 0.8 || errorRate > 0.002) return "#f59e0b";
  return "#10b981";
}
