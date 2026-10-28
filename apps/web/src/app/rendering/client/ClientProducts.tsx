"use client";
// "use client" makes this a CLIENT COMPONENT. Its JavaScript is sent to the
// browser, so it can use state, effects and event handlers (clicks, typing).
// Everything without "use client" is a Server Component and sends no JS.

import { useEffect, useState } from "react";
import type { Product } from "@lab/domain";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { RenderBadge } from "@/components/RenderBadge";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; products: Product[]; renderedAt: number };

export function ClientProducts() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [tag, setTag] = useState<string>("");

  // useEffect runs AFTER the page appears in the browser. This is where
  // classic single-page apps (Create React App, Angular, Vue) load their data.
  useEffect(() => {
    let cancelled = false;
    const url = tag ? `/api/products?tag=${encodeURIComponent(tag)}` : "/api/products";
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ products: Product[] }>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", products: data.products, renderedAt: Date.now() });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true; // ignore a slow answer if the filter changed meanwhile
    };
  }, [tag]);

  return (
    <section className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        Filter (runs entirely in the browser):
        <select
          className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          value={tag}
          onChange={(e) => {
            setState({ status: "loading" });
            setTag(e.target.value);
          }}
        >
          <option value="">All</option>
          <option value="backpacking">Backpacking</option>
          <option value="day-hike">Day hike</option>
          <option value="alpine">Alpine</option>
        </select>
      </label>

      {state.status === "loading" && <ProductGridSkeleton />}
      {state.status === "error" && <p className="text-red-600">Could not load products: {state.message}</p>}
      {state.status === "ready" && (
        <>
          <RenderBadge
            strategy="Client-side (CSR)"
            where="browser"
            renderedAt={state.renderedAt}
            tryThis="open your browser's developer tools, Network tab, and change the filter. You'll see a call to /api/products each time."
          />
          <ProductGrid products={state.products} />
        </>
      )}
    </section>
  );
}
