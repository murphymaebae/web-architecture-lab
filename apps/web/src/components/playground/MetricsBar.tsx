"use client";

/**
 * The headline numbers, from the users' point of view, each with a sparkline
 * of the last two simulated minutes.
 */
import { fmtMoney, fmtMs, fmtPct, fmtRps } from "@/lib/playground/format";
import type { Metrics } from "@/lib/playground/types";

type Card = {
  label: string;
  value: string;
  hint: string;
  series?: number[];
  tone?: "good" | "warn" | "bad";
};

export function MetricsBar({ metrics, history }: { metrics: Metrics; history: Metrics[] }) {
  const err = metrics.errorRate;
  const cards: Card[] = [
    {
      label: "Users sending",
      value: `${fmtRps(metrics.offeredRps)}/s`,
      hint: "Requests per second arriving from all the Users boxes.",
      series: history.map((h) => h.offeredRps),
    },
    {
      label: "Succeeding",
      value: `${fmtRps(metrics.okRps)}/s`,
      hint: "Throughput: requests per second that get a good answer in time.",
      series: history.map((h) => h.okRps),
    },
    {
      label: "Errors",
      value: fmtPct(err),
      hint: "Refused, crashed or too slow. Most teams aim for well under 1%.",
      series: history.map((h) => h.errorRate),
      tone: err > 0.05 ? "bad" : err > 0.005 ? "warn" : "good",
    },
    {
      label: "p50",
      value: fmtMs(metrics.p50),
      hint: "Median: half of requests are faster than this. The typical experience.",
      series: history.map((h) => h.p50),
    },
    {
      label: "p95",
      value: fmtMs(metrics.p95),
      hint: "1 in 20 requests is slower than this. Busy users hit it on almost every visit.",
      series: history.map((h) => h.p95),
      tone: metrics.p95 > 1000 ? "bad" : metrics.p95 > 400 ? "warn" : "good",
    },
    {
      label: "p99",
      value: fmtMs(metrics.p99),
      hint: "1 in 100 requests is slower than this: the tail.",
      series: history.map((h) => h.p99),
    },
    {
      label: "Cost",
      value: `${fmtMoney(metrics.costPerMonth)}/mo`,
      hint: "Rough running cost per month at this traffic. Made-up prices, realistic ratios.",
      series: history.map((h) => h.costPerMonth),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {cards.map((c) => (
        <div
          key={c.label}
          title={c.hint}
          className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <div className="text-xs text-zinc-500">{c.label}</div>
          <div
            className={`text-lg font-semibold tabular-nums ${
              c.tone === "bad"
                ? "text-red-600 dark:text-red-400"
                : c.tone === "warn"
                  ? "text-amber-600 dark:text-amber-400"
                  : ""
            }`}
          >
            {c.value}
          </div>
          {c.series && <Sparkline values={c.series} />}
        </div>
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 100;
  const H = 22;
  if (values.length < 2) return <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-full" />;
  const max = Math.max(...values, 1e-9);
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 1 - (v / max) * (H - 2)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-5 w-full" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className="stroke-emerald-500"
      />
    </svg>
  );
}
