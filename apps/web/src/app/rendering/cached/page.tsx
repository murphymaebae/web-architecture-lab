import { cacheLife, cacheTag } from "next/cache";
import { renderTimestamp } from "@/lib/clock";
import { Explainer } from "@/components/Explainer";
import { ProductGrid } from "@/components/ProductCard";
import { RenderBadge } from "@/components/RenderBadge";
import { StrategyLayout } from "@/components/StrategyLayout";
import { getProducts } from "@/lib/catalog";
import { refreshProducts } from "./actions";

export const metadata = { title: "Cached with revalidation" };

export default function CachedPage() {
  return (
    <StrategyLayout slug="cached">
      <Explainer>
        <p>
          This is <strong>Incremental Static Regeneration (ISR)</strong>. The product list is
          cached like a static page, but with a lifetime: <code>revalidate: 20</code> seconds.
          After 20 seconds, the next visitor still gets the cached copy instantly, and Next.js
          rebuilds a fresh copy in the background for the visitor after them. This is called{" "}
          <em>stale-while-revalidate</em>.
        </p>
        <p>
          The list is also tagged <code>products</code>. The button below calls a{" "}
          <strong>Server Action</strong> that runs <code>updateTag(&quot;products&quot;)</code>. That
          is <em>on-demand revalidation</em>: in a real shop, the product system or CMS calls this
          the moment an editor hits &quot;Publish&quot;, so the site updates within seconds instead of
          waiting for a timer.
        </p>
      </Explainer>

      <form action={refreshProducts}>
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Simulate &quot;Publish&quot; in the product system (refresh now)
        </button>
      </form>

      <CachedProducts />
    </StrategyLayout>
  );
}

async function CachedProducts() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 20, expire: 3600 });
  cacheTag("products");

  const products = await getProducts();
  const renderedAt = renderTimestamp();

  return (
    <section className="flex flex-col gap-4">
      <RenderBadge
        strategy="Cached + revalidate (ISR)"
        where="server"
        renderedAt={renderedAt}
        tryThis="reload now (same time), wait 20+ seconds and reload twice (the time moves on), or press the button."
      />
      <ProductGrid products={products} />
    </section>
  );
}
