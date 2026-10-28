"use client";

/**
 * The right-hand panel. Shows the knobs and live numbers for whatever you have
 * selected: a box, an arrow, or (with nothing selected) the current scenario.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { KINDS, type ParamSpec } from "@/lib/playground/catalog";
import { fmtMoney, fmtMs, fmtPct, fmtRps } from "@/lib/playground/format";
import type { Scenario } from "@/lib/playground/scenarios";
import type { EdgeStats, Graph, NodeParams, NodeStats, PlayNode } from "@/lib/playground/types";
import type { Selection } from "./Canvas";

type Props = {
  graph: Graph;
  selection: Selection;
  scenario: Scenario;
  nodeStats: Record<string, NodeStats>;
  edgeStats: Record<string, EdgeStats>;
  onChangeParams: (id: string, patch: Partial<NodeParams>) => void;
  onRename: (id: string, label: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
};

export function Inspector(props: Props) {
  const { graph, selection } = props;
  if (selection?.type === "node") {
    const node = graph.nodes.find((n) => n.id === selection.id);
    if (node) return <NodePanel {...props} node={node} />;
  }
  if (selection?.type === "edge") {
    const edge = graph.edges.find((e) => e.id === selection.id);
    if (edge) {
      const from = graph.nodes.find((n) => n.id === edge.from);
      const to = graph.nodes.find((n) => n.id === edge.to);
      const s = props.edgeStats[edge.id];
      return (
        <Panel>
          <h2 className="font-semibold">
            {from?.label} → {to?.label}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Every request {from?.label} handles that needs {to?.label} travels along this arrow.
          </p>
          <Stats
            rows={[
              ["Traffic", `${fmtRps(s?.rps ?? 0)} req/s`],
              ["Fails at or after the target", fmtPct(s?.errorRate ?? 0)],
            ]}
          />
          <DangerButton onClick={() => props.onDeleteEdge(edge.id)}>Delete connection</DangerButton>
        </Panel>
      );
    }
  }

  const { scenario } = props;
  return (
    <Panel>
      <h2 className="font-semibold">{scenario.title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{scenario.summary}</p>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Try this</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
          {scenario.tryThis.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </div>
      {scenario.related && (
        <p className="text-sm">
          See the real thing:{" "}
          <Link href={scenario.related.href} className="text-emerald-600 underline">
            {scenario.related.label}
          </Link>
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Click a box to change its settings. Drag boxes to move them, and drag from the blue dot on a
        box&apos;s right edge to connect it to another box. Press Delete to remove the selected
        item.
      </p>
    </Panel>
  );
}

function NodePanel({
  node,
  nodeStats,
  onChangeParams,
  onRename,
  onDeleteNode,
}: Props & { node: PlayNode }) {
  const info = KINDS[node.kind];
  const s = nodeStats[node.id];
  const scalable = node.kind === "app" || node.kind === "gateway" || node.kind === "worker";

  // Hide the manual replica slider while the autoscaler is in charge, and the
  // autoscaler's own settings while it's off.
  const visible = info.params.filter((spec) => {
    if (spec.key === "replicas") return !node.params.autoscale;
    if (spec.key === "maxReplicas" || spec.key === "bootSeconds") return node.params.autoscale;
    return true;
  });

  const rows: [string, string][] = [];
  if (s) {
    rows.push(["Arriving", `${fmtRps(s.inRps)} req/s`]);
    if (node.kind !== "client") rows.push(["Handled", `${fmtRps(s.servedRps)} req/s`]);
    if (info.limited) rows.push(["Busy", fmtPct(s.utilization)]);
    if (node.kind === "cdn" || node.kind === "cache")
      rows.push(["Hit rate now", fmtPct(s.hitRate)]);
    if (node.kind === "queue") rows.push(["Waiting jobs", fmtRps(s.backlog)]);
    if (scalable)
      rows.push([
        "Replicas running",
        `${s.replicas}${s.booting ? ` (+${s.booting} booting)` : ""}`,
      ]);
    if (node.kind !== "client") rows.push(["Time in this box", fmtMs(s.ownLatencyMs)]);
    rows.push([
      node.kind === "client" ? "Average response" : "Time incl. everything behind it",
      fmtMs(s.totalLatencyMs),
    ]);
    rows.push(["Refused here", fmtPct(s.errorRate)]);
    rows.push(["Failing here or behind", fmtPct(s.pathErrorRate)]);
    if (s.costPerMonth > 0) rows.push(["Cost", `${fmtMoney(s.costPerMonth)}/month`]);
  }

  return (
    <Panel>
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {info.icon}
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={node.label}
            onChange={(e) => onRename(node.id, e.target.value)}
            aria-label="Name"
            className="w-full rounded border border-transparent bg-transparent px-1 font-semibold hover:border-zinc-300 focus:border-sky-500 focus:outline-none dark:hover:border-zinc-700"
          />
          <p className="px-1 text-xs text-zinc-500">{info.name}</p>
        </div>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{info.about}</p>

      <div className="flex flex-col gap-4">
        {visible.map((spec) => (
          <Control
            key={spec.key}
            spec={spec}
            value={node.params[spec.key]}
            onChange={(v) => onChangeParams(node.id, { [spec.key]: v } as Partial<NodeParams>)}
          />
        ))}
      </div>

      {rows.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Live</h3>
          <Stats rows={rows} />
        </div>
      )}

      <DangerButton onClick={() => onDeleteNode(node.id)}>Delete box</DangerButton>
    </Panel>
  );
}

/** One knob: a slider, an on/off switch or a drop-down. */
function Control({
  spec,
  value,
  onChange,
}: {
  spec: ParamSpec;
  value: NodeParams[keyof NodeParams];
  onChange: (v: number | boolean | string) => void;
}) {
  if (spec.type === "toggle") {
    return (
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-emerald-600"
        />
        <span>
          <span className="font-medium">{spec.label}</span>
          <span className="block text-xs text-zinc-500">{spec.help}</span>
        </span>
      </label>
    );
  }
  if (spec.type === "select") {
    return (
      <label className="block text-sm">
        <span className="font-medium">{spec.label}</span>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-zinc-500">{spec.help}</span>
      </label>
    );
  }

  // Sliders. Big ranges (1 to 50,000) use a log scale, so each bit of the
  // slider multiplies the value instead of adding to it.
  const num = Number(value);
  const RES = 1000;
  const toPos = (v: number) =>
    spec.log ? (Math.log(v / spec.min) / Math.log(spec.max / spec.min)) * RES : v;
  const fromPos = (pos: number) => {
    if (!spec.log) return pos;
    const raw = spec.min * Math.pow(spec.max / spec.min, pos / RES);
    return Math.max(
      spec.min,
      Math.round(raw / niceStep(raw, spec.step)) * niceStep(raw, spec.step),
    );
  };
  return (
    <label className="block text-sm">
      <span className="flex justify-between">
        <span className="font-medium">{spec.label}</span>
        <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
          {num.toLocaleString("en-US")}
          {spec.unit ? ` ${spec.unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={spec.log ? 0 : spec.min}
        max={spec.log ? RES : spec.max}
        step={spec.log ? 1 : spec.step}
        value={toPos(num)}
        onChange={(e) => onChange(fromPos(Number(e.target.value)))}
        className="mt-1 w-full accent-emerald-600"
      />
      <span className="block text-xs text-zinc-500">{spec.help}</span>
    </label>
  );
}

/** Round to sensible numbers on log sliders: 1, 2, 3... 10, 20... 100, 200... */
function niceStep(v: number, min: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))) - 1);
  return Math.max(min, mag);
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      {children}
    </aside>
  );
}

function Stats({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-500">{k}</dt>
          <dd className="text-right tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function DangerButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
    >
      {children}
    </button>
  );
}
