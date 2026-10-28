"use client";

/**
 * The drawing board. Boxes and arrows are plain SVG, so they scale to any
 * screen size. You can drag boxes around, and drag from a box's right-hand dot
 * to another box to connect them.
 *
 * The moving dots (one dot ≈ a bunch of requests) are drawn separately by
 * <Particles>, which updates the SVG directly 60 times a second instead of
 * asking React to re-render the whole canvas each frame.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { KINDS } from "@/lib/playground/catalog";
import { fmtPct, fmtRps, healthColor } from "@/lib/playground/format";
import type { EdgeStats, Graph, NodeStats, PlayNode } from "@/lib/playground/types";

export const VIEW_W = 1000;
export const VIEW_H = 480;
const NODE_W = 136;
const NODE_H = 66;

export type Selection = { type: "node" | "edge"; id: string } | null;

type Props = {
  graph: Graph;
  nodeStats: Record<string, NodeStats>;
  edgeStats: Record<string, EdgeStats>;
  selection: Selection;
  running: boolean;
  speed: number;
  onSelect: (s: Selection) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (from: string, to: string) => void;
};

type Drag =
  | { type: "move"; id: string; dx: number; dy: number }
  | { type: "connect"; from: string; x: number; y: number }
  | null;

/** The curve an arrow follows: out of the right side of one box, into the left side of the next. */
function edgeCurve(a: PlayNode, b: PlayNode) {
  const x1 = a.x + NODE_W / 2;
  const y1 = a.y;
  const x2 = b.x - NODE_W / 2;
  const y2 = b.y;
  const bend = Math.max(40, Math.abs(x2 - x1) / 2);
  return { x1, y1, c1x: x1 + bend, c1y: y1, c2x: x2 - bend, c2y: y2, x2, y2 };
}
type Curve = ReturnType<typeof edgeCurve>;

function pointOn(c: Curve, t: number) {
  const u = 1 - t;
  return {
    x: u * u * u * c.x1 + 3 * u * u * t * c.c1x + 3 * u * t * t * c.c2x + t * t * t * c.x2,
    y: u * u * u * c.y1 + 3 * u * u * t * c.c1y + 3 * u * t * t * c.c2y + t * t * t * c.y2,
  };
}

export function Canvas(props: Props) {
  const { graph, nodeStats, edgeStats, selection, onSelect, onMove, onConnect } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  /** Convert a mouse/touch position on screen into canvas coordinates. */
  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : pt;
    return { x: p.x, y: p.y };
  };

  const nodeAt = (x: number, y: number) =>
    graph.nodes.find((n) => Math.abs(n.x - x) <= NODE_W / 2 && Math.abs(n.y - y) <= NODE_H / 2);

  const startMove = (e: ReactPointerEvent, node: PlayNode) => {
    e.stopPropagation();
    const p = toCanvas(e);
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ type: "move", id: node.id, dx: p.x - node.x, dy: p.y - node.y });
    onSelect({ type: "node", id: node.id });
  };

  const startConnect = (e: ReactPointerEvent, node: PlayNode) => {
    e.stopPropagation();
    const p = toCanvas(e);
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({ type: "connect", from: node.id, x: p.x, y: p.y });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    const p = toCanvas(e);
    if (drag.type === "move") {
      const x = Math.min(VIEW_W - NODE_W / 2 - 4, Math.max(NODE_W / 2 + 4, p.x - drag.dx));
      const y = Math.min(VIEW_H - NODE_H / 2 - 4, Math.max(NODE_H / 2 + 4, p.y - drag.dy));
      onMove(drag.id, x, y);
    } else {
      setDrag({ ...drag, x: p.x, y: p.y });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (drag?.type === "connect") {
      const p = toCanvas(e);
      const target = nodeAt(p.x, p.y);
      if (target && target.id !== drag.from) onConnect(drag.from, target.id);
    }
    setDrag(null);
  };

  const connectFrom = drag?.type === "connect" ? byId.get(drag.from) : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-auto w-full touch-none select-none rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={() => onSelect(null)}
      role="application"
      aria-label="Architecture canvas"
    >
      <defs>
        <pattern id="pg-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-zinc-300 dark:fill-zinc-800" />
        </pattern>
        <marker
          id="pg-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-zinc-400 dark:fill-zinc-600" />
        </marker>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#pg-grid)" />

      {/* Arrows */}
      {graph.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const c = edgeCurve(a, b);
        const d = `M ${c.x1} ${c.y1} C ${c.c1x} ${c.c1y}, ${c.c2x} ${c.c2y}, ${c.x2} ${c.y2}`;
        const s = edgeStats[edge.id];
        const rps = s?.rps ?? 0;
        const width = rps > 0 ? Math.min(7, 1.5 + Math.log10(rps + 1) * 1.3) : 1.5;
        const broken = (s?.errorRate ?? 0) > 0.05;
        const selected = selection?.type === "edge" && selection.id === edge.id;
        const mid = pointOn(c, 0.5);
        return (
          <g key={edge.id}>
            {/* A wide invisible line makes thin arrows easy to click. */}
            <path
              d={d}
              stroke="transparent"
              strokeWidth={16}
              fill="none"
              className="cursor-pointer"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ type: "edge", id: edge.id });
              }}
            />
            <path
              d={d}
              fill="none"
              markerEnd="url(#pg-arrow)"
              strokeWidth={width}
              strokeLinecap="round"
              stroke={selected ? "#0ea5e9" : broken ? "#f87171" : undefined}
              strokeDasharray={rps <= 0.01 ? "4 6" : undefined}
              className={
                selected || broken
                  ? "pointer-events-none"
                  : "pointer-events-none stroke-zinc-300 dark:stroke-zinc-700"
              }
            />
            {rps > 0.01 && (
              <text
                x={mid.x}
                y={mid.y - 8}
                textAnchor="middle"
                className="pointer-events-none fill-zinc-500 text-[11px] font-medium"
              >
                {fmtRps(rps)}/s
              </text>
            )}
          </g>
        );
      })}

      <Particles graph={graph} edgeStats={edgeStats} running={props.running} speed={props.speed} />

      {/* The arrow you're drawing while connecting two boxes */}
      {connectFrom && drag?.type === "connect" && (
        <line
          x1={connectFrom.x + NODE_W / 2}
          y1={connectFrom.y}
          x2={drag.x}
          y2={drag.y}
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeDasharray="6 4"
          className="pointer-events-none"
        />
      )}

      {/* Boxes */}
      {graph.nodes.map((node) => (
        <NodeBox
          key={node.id}
          node={node}
          stats={nodeStats[node.id]}
          selected={selection?.type === "node" && selection.id === node.id}
          onPointerDown={(e) => startMove(e, node)}
          onHandleDown={(e) => startConnect(e, node)}
        />
      ))}
    </svg>
  );
}

function NodeBox({
  node,
  stats,
  selected,
  onPointerDown,
  onHandleDown,
}: {
  node: PlayNode;
  stats?: NodeStats;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onHandleDown: (e: ReactPointerEvent) => void;
}) {
  const info = KINDS[node.kind];
  const down = node.params.down;
  const util = stats?.utilization ?? 0;
  const err = stats?.errorRate ?? 0;
  const status = down
    ? "#a1a1aa"
    : healthColor(info.limited || node.kind === "queue" ? util : 0, err);
  const x = node.x - NODE_W / 2;
  const y = node.y - NODE_H / 2;

  return (
    <g
      className="cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      opacity={down ? 0.6 : 1}
    >
      {selected && (
        <rect
          x={x - 5}
          y={y - 5}
          width={NODE_W + 10}
          height={NODE_H + 10}
          rx={14}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
        />
      )}
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={10}
        strokeWidth={2}
        stroke={status}
        strokeDasharray={down ? "5 4" : undefined}
        className="fill-white dark:fill-zinc-900"
      />
      <rect x={x} y={y} width={6} height={NODE_H} rx={3} fill={info.color} />
      <text x={x + 14} y={y + 22} className="text-[15px]">
        {down ? "💥" : info.icon}
      </text>
      <text
        x={x + 36}
        y={y + 21}
        className="fill-zinc-900 text-[12px] font-semibold dark:fill-zinc-100"
      >
        {truncate(node.label, 15)}
      </text>
      <text x={x + 14} y={y + 41} className="fill-zinc-500 text-[11px]">
        {summary(node, stats)}
      </text>
      {/* Busy bar */}
      {(info.limited || node.kind === "queue") && !down && (
        <>
          <rect
            x={x + 14}
            y={y + 50}
            width={NODE_W - 28}
            height={5}
            rx={2.5}
            className="fill-zinc-200 dark:fill-zinc-800"
          />
          <rect
            x={x + 14}
            y={y + 50}
            width={(NODE_W - 28) * Math.min(1, util)}
            height={5}
            rx={2.5}
            fill={status}
          />
        </>
      )}
      {/* Replica badge */}
      {stats && (node.kind === "app" || node.kind === "gateway" || node.kind === "worker") && (
        <g>
          <rect x={x + NODE_W - 40} y={y - 9} width={46} height={18} rx={9} fill={info.color} />
          <text
            x={x + NODE_W - 17}
            y={y + 4}
            textAnchor="middle"
            className="fill-white text-[11px] font-semibold"
          >
            ×{stats.replicas}
            {stats.booting > 0 ? ` +${stats.booting}` : ""}
          </text>
        </g>
      )}
      {/* Connection handle */}
      {info.hasOutput && (
        <circle
          cx={x + NODE_W}
          cy={node.y}
          r={7}
          className="cursor-crosshair fill-sky-500 stroke-white dark:stroke-zinc-900"
          strokeWidth={2}
          onPointerDown={onHandleDown}
        >
          <title>Drag to another box to connect</title>
        </circle>
      )}
    </g>
  );
}

/** The one-line status shown under a box's name. */
function summary(node: PlayNode, s?: NodeStats): string {
  if (!s) return "";
  if (node.params.down) return "crashed";
  const rps = `${fmtRps(s.inRps)}/s`;
  switch (node.kind) {
    case "client":
      return `${rps} sent`;
    case "cdn":
    case "cache":
      return `${rps} · hit ${fmtPct(s.hitRate)}`;
    case "queue":
      return s.backlog > 1 ? `${rps} · ${fmtRps(s.backlog)} waiting` : `${rps} · empty`;
    case "lb":
      return `${rps} in`;
    default:
      return `${rps} · ${fmtPct(s.utilization)} busy`;
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

type Dot = { edgeId: string; t: number; red: boolean; el: SVGCircleElement };

/**
 * Animated dots travelling along the arrows. More traffic = more dots (on a
 * log scale, so 10x the traffic is a few more dots, not 10x the dots). Red dots
 * are requests that will fail somewhere downstream.
 */
function Particles({
  graph,
  edgeStats,
  running,
  speed,
}: {
  graph: Graph;
  edgeStats: Record<string, EdgeStats>;
  running: boolean;
  speed: number;
}) {
  const groupRef = useRef<SVGGElement>(null);
  // The animation loop reads the latest props through this ref.
  const live = useRef({ graph, edgeStats, running, speed });
  useEffect(() => {
    live.current = { graph, edgeStats, running, speed };
  });

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const dots: Dot[] = [];
    const credit = new Map<string, number>();
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dtReal = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { graph, edgeStats, running, speed } = live.current;
      const byId = new Map(graph.nodes.map((n) => [n.id, n]));
      const curves = new Map<string, Curve>();
      for (const e of graph.edges) {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (a && b) curves.set(e.id, edgeCurve(a, b));
      }

      if (running) {
        const dt = dtReal * Math.min(speed, 3);
        // Spawn new dots in proportion to (the log of) each arrow's traffic.
        for (const e of graph.edges) {
          const s = edgeStats[e.id];
          if (!s || s.rps < 0.05) continue;
          const perSecond = Math.min(14, 0.8 + Math.log10(s.rps + 1) * 3);
          const c = (credit.get(e.id) ?? Math.random()) + perSecond * dt;
          const spawn = Math.floor(c);
          credit.set(e.id, c - spawn);
          for (let i = 0; i < spawn && dots.length < 400; i++) {
            const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const red = Math.random() < s.errorRate;
            el.setAttribute("r", red ? "3.5" : "3");
            el.setAttribute("fill", red ? "#ef4444" : "#0ea5e9");
            group.appendChild(el);
            dots.push({ edgeId: e.id, t: 0, red, el });
          }
        }
        // Move every dot along its arrow. ~1 second per arrow at 1x speed.
        for (const d of dots) d.t += dt * 1.1;
      }

      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i];
        const c = curves.get(d.edgeId);
        // Failing requests bounce back part-way, like an error response.
        const limit = d.red ? 0.85 : 1;
        if (!c || d.t >= limit) {
          d.el.remove();
          dots.splice(i, 1);
          continue;
        }
        const p = pointOn(c, d.t);
        d.el.setAttribute("cx", p.x.toFixed(1));
        d.el.setAttribute("cy", p.y.toFixed(1));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      for (const d of dots) d.el.remove();
    };
  }, []);

  return <g ref={groupRef} className="pointer-events-none" opacity={0.85} />;
}
