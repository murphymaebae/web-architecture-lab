"use client";

/**
 * The playground's "brain" on the browser side. It owns:
 *
 *  - the graph (which boxes exist, their settings, and how they're connected),
 *  - the simulation state (what the engine worked out at the latest tick),
 *  - the UI state (what's selected, whether it's running, how fast).
 *
 * Ten times a second it asks the engine to move time forward and re-renders.
 * Everything runs in your browser: there is no server involved, which is why
 * this file starts with "use client".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KINDS, PALETTE } from "@/lib/playground/catalog";
import { initialState, startSpike, step, wouldCreateCycle } from "@/lib/playground/engine";
import { insights } from "@/lib/playground/insights";
import { SCENARIOS, makeNode, newId, type Scenario } from "@/lib/playground/scenarios";
import type { Graph, NodeKind, NodeParams, SimState } from "@/lib/playground/types";
import { Canvas, VIEW_H, VIEW_W, type Selection } from "./Canvas";
import { Inspector } from "./Inspector";
import { MetricsBar } from "./MetricsBar";

const STORAGE_KEY = "lab-playground-v1";
/** Simulated seconds per tick. */
const TICK = 0.1;
const SPEEDS = [1, 2, 5];

type Saved = { scenarioId: string; graph: Graph };

function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (!Array.isArray(saved.graph?.nodes) || !Array.isArray(saved.graph?.edges)) return null;
    // Fill in any settings added since this graph was saved.
    for (const n of saved.graph.nodes) {
      if (!KINDS[n.kind]) return null;
      n.params = { ...makeNode(n.kind, 0, 0).params, ...n.params };
    }
    return saved;
  } catch {
    return null;
  }
}

function save(saved: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Private browsing or storage full: the playground still works, it just won't remember.
  }
}

export function Playground() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [sim, setSim] = useState<SimState | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  // The timer reads the latest values through refs, so it doesn't need restarting on every change.
  const graphRef = useRef<Graph | null>(null);
  const simRef = useRef<SimState | null>(null);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const scenario: Scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  const loadScenario = useCallback((s: Scenario) => {
    const g = s.build();
    const st = initialState(g);
    graphRef.current = g;
    simRef.current = st;
    setScenarioId(s.id);
    setGraph(g);
    setSim(st);
    setSelection(null);
  }, []);

  // On first load (in the browser only), restore your last canvas or start scenario 1.
  useEffect(() => {
    const saved = loadSaved();
    const s = SCENARIOS.find((x) => x.id === saved?.scenarioId);
    if (saved && s) {
      const st = initialState(saved.graph);
      graphRef.current = saved.graph;
      simRef.current = st;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off restore from localStorage
      setScenarioId(s.id);
      setGraph(saved.graph);
      setSim(st);
    } else {
      loadScenario(SCENARIOS[0]);
    }
  }, [loadScenario]);

  useEffect(() => {
    if (graph) save({ scenarioId, graph });
  }, [graph, scenarioId]);

  // The clock: move simulated time forward ten times a second.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const g = graphRef.current;
      let s = simRef.current;
      if (!g || !s) return;
      for (let i = 0; i < speed; i++) s = step(g, s, TICK);
      simRef.current = s;
      setSim(s);
    }, TICK * 1000);
    return () => window.clearInterval(timer);
  }, [running, speed]);

  // Clear the notice after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const updateGraph = useCallback((fn: (g: Graph) => Graph) => {
    setGraph((g) => {
      if (!g) return g;
      const next = fn(g);
      graphRef.current = next;
      return next;
    });
  }, []);

  const onMove = useCallback(
    (id: string, x: number, y: number) =>
      updateGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })),
    [updateGraph],
  );

  const onChangeParams = useCallback(
    (id: string, patch: Partial<NodeParams>) =>
      updateGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, ...patch } } : n)),
      })),
    [updateGraph],
  );

  const onRename = useCallback(
    (id: string, label: string) =>
      updateGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
      })),
    [updateGraph],
  );

  const onDeleteNode = useCallback(
    (id: string) => {
      updateGraph((g) => ({
        nodes: g.nodes.filter((n) => n.id !== id),
        edges: g.edges.filter((e) => e.from !== id && e.to !== id),
      }));
      setSelection(null);
    },
    [updateGraph],
  );

  const onDeleteEdge = useCallback(
    (id: string) => {
      updateGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
      setSelection(null);
    },
    [updateGraph],
  );

  const onConnect = useCallback(
    (from: string, to: string) => {
      const g = graphRef.current;
      if (!g) return;
      const a = g.nodes.find((n) => n.id === from)!;
      const b = g.nodes.find((n) => n.id === to)!;
      if (!KINDS[b.kind].acceptsInput) {
        setNotice(`${b.label} only sends traffic; it can't receive it.`);
      } else if (g.edges.some((e) => e.from === from && e.to === to)) {
        setNotice(`${a.label} is already connected to ${b.label}.`);
      } else if (wouldCreateCycle(g, from, to)) {
        setNotice("That would make a loop, and requests would go round forever.");
      } else {
        const edge = { id: newId("edge"), from, to };
        updateGraph((g) => ({ ...g, edges: [...g.edges, edge] }));
        setSelection({ type: "edge", id: edge.id });
      }
    },
    [updateGraph],
  );

  const addNode = (kind: NodeKind) => {
    const g = graphRef.current;
    if (!g) return;
    const spot = freeSpot(g);
    const node = makeNode(kind, spot.x, spot.y);
    updateGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
    setSelection({ type: "node", id: node.id });
  };

  // Delete / Backspace removes the selected box or arrow (unless you're typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        if (selection.type === "node") onDeleteNode(selection.id);
        else onDeleteEdge(selection.id);
      }
      if (e.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onDeleteNode, onDeleteEdge]);

  const tips = useMemo(() => (graph && sim ? insights(graph, sim) : []), [graph, sim]);

  if (!graph || !sim) {
    return <div className="h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const spikeLeft = Math.max(0, sim.spikeUntil - sim.time);

  return (
    <div className="flex flex-col gap-4">
      {/* Scenario picker */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scenarios">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === scenarioId}
            onClick={() => loadScenario(s)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              s.id === scenarioId
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 hover:border-emerald-500 dark:border-zinc-700"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="w-24 rounded border border-zinc-300 px-3 py-1 font-medium dark:border-zinc-700"
        >
          {running ? "⏸ Pause" : "▶ Play"}
        </button>
        <div
          className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-700"
          role="group"
          aria-label="Speed"
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`px-3 py-1 ${speed === s ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""}`}
            >
              {s}×
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!simRef.current) return;
            simRef.current = startSpike(simRef.current);
            setSim(simRef.current);
          }}
          className="rounded border border-amber-400 bg-amber-50 px-3 py-1 font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          {spikeLeft > 0 ? `🔥 Spike: ${Math.ceil(spikeLeft)}s` : "🔥 Traffic spike (5×)"}
        </button>
        <button
          type="button"
          onClick={() => loadScenario(scenario)}
          className="rounded border border-zinc-300 px-3 py-1 dark:border-zinc-700"
        >
          ↺ Reset scenario
        </button>
        <span className="ml-auto tabular-nums text-zinc-500">
          Simulated time {formatClock(sim.time)}
        </span>
      </div>

      <MetricsBar metrics={sim.metrics} history={sim.history} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* Parts bin */}
          <div className="flex flex-wrap gap-1.5" aria-label="Parts bin">
            {PALETTE.map((kind) => {
              const info = KINDS[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addNode(kind)}
                  title={`${info.short}. Click to add.`}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:border-emerald-500 dark:border-zinc-800"
                >
                  <span aria-hidden>{info.icon}</span> {info.name}
                </button>
              );
            })}
          </div>

          {/* On narrow screens the canvas keeps a usable size and scrolls sideways. */}
          <div className="relative overflow-x-auto">
            <div className="min-w-[720px]">
              <Canvas
                graph={graph}
                nodeStats={sim.nodeStats}
                edgeStats={sim.edgeStats}
                selection={selection}
                running={running}
                speed={speed}
                onSelect={setSelection}
                onMove={onMove}
                onConnect={onConnect}
              />
            </div>
            {notice && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white shadow dark:bg-zinc-100 dark:text-zinc-900">
                {notice}
              </div>
            )}
          </div>

          {/* What's going on right now, in words */}
          <ul className="flex flex-col gap-1.5 text-sm" aria-live="polite">
            {tips.map((tip, i) => (
              <li
                key={`${tip.text}-${i}`}
                onClick={() => tip.nodeId && setSelection({ type: "node", id: tip.nodeId })}
                className={`rounded-md px-3 py-1.5 ${tip.nodeId ? "cursor-pointer" : ""} ${TONE[tip.level]}`}
              >
                {ICON[tip.level]} {tip.text}
              </li>
            ))}
          </ul>
        </div>

        <Inspector
          graph={graph}
          selection={selection}
          scenario={scenario}
          nodeStats={sim.nodeStats}
          edgeStats={sim.edgeStats}
          onChangeParams={onChangeParams}
          onRename={onRename}
          onDeleteNode={onDeleteNode}
          onDeleteEdge={onDeleteEdge}
        />
      </div>
    </div>
  );
}

const TONE = {
  good: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  info: "bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  warn: "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
  bad: "bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100",
};
const ICON = { good: "✅", info: "ℹ️", warn: "⚠️", bad: "🔴" };

/** The first empty spot on a grid, scanning left to right, so new boxes don't land on old ones. */
function freeSpot(g: Graph) {
  for (let y = 80; y <= VIEW_H - 60; y += 100) {
    for (let x = 100; x <= VIEW_W - 100; x += 170) {
      if (g.nodes.every((n) => Math.abs(n.x - x) > 150 || Math.abs(n.y - y) > 80)) return { x, y };
    }
  }
  return { x: VIEW_W / 2, y: VIEW_H / 2 };
}

function formatClock(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
