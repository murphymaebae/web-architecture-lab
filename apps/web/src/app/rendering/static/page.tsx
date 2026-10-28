import { cacheLife } from "next/cache";
import { renderTimestamp } from "@/lib/clock";
import { Explainer } from "@/components/Explainer";
import { ProductGrid } from "@/components/ProductCard";
import { RenderBadge } from "@/components/RenderBadge";
import { StrategyLayout } from "@/components/StrategyLayout";
import { getProducts } from "@/lib/catalog";

export const metadata = { title: "Static generation" };

export default function StaticPage() {
  return (
    <StrategyLayout slug="static">
      <Explainer>
        <p>
          The product list below is wrapped in <code>&quot;use cache&quot;</code> with the{" "}
          <code>max</code> lifetime. During <code>next build</code>, Next.js runs it once, saves the
          HTML, and serves that same file to every visitor. Nothing runs on the server when you
          visit, which is why static pages are the fastest and cheapest kind.
        </p>
        <p>
          Classic static site generators (Gatsby, Hugo, Jekyll) and older Next.js
          (<code>getStaticProps</code>) work the same way. Big sites often put these files on a CDN:
          a network of servers around the world that keeps copies close to users.
        </p>
      </Explainer>
      <StaticProducts />
    </StrategyLayout>
  );
}

async function StaticProducts() {
  "use cache";
  cacheLife("max"); // effectively "never refresh unless we redeploy"

  const products = await getProducts();
  const renderedAt = renderTimestamp();

  return (
    <section className="flex flex-col gap-4">
      <RenderBadge
        strategy="Static (SSG)"
        where="server"
        renderedAt={renderedAt}
        tryThis="reload the page a few times. The time never changes, because the HTML was made at build time."
      />
      <ProductGrid products={products} />
    </section>
  );
}
