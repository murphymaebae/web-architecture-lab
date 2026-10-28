import { Suspense } from "react";
import { connection } from "next/server";
import { renderTimestamp } from "@/lib/clock";
import { Explainer } from "@/components/Explainer";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { RenderBadge } from "@/components/RenderBadge";
import { StrategyLayout } from "@/components/StrategyLayout";
import { getProducts } from "@/lib/catalog";

export const metadata = { title: "Dynamic server rendering" };

export default function DynamicPage() {
  return (
    <StrategyLayout slug="dynamic">
      <Explainer>
        <p>
          This is classic <strong>server-side rendering (SSR)</strong>. The call to{" "}
          <code>await connection()</code> tells Next.js &quot;this part needs a real visitor&quot;, so
          it is never cached. Every request runs the code, waits for the (deliberately slow)
          product database, and builds fresh HTML.
        </p>
        <p>
          This is how most traditional enterprise stacks work (Java JSP, ASP.NET, PHP, Ruby on
          Rails, Adobe Experience Manager without a cache). It is always up to date, but every
          visit costs server time.
        </p>
        <p>
          In Next.js 16, request-time parts must sit inside a <code>&lt;Suspense&gt;</code>{" "}
          boundary, so the rest of the page (header, title, this box) can still be prerendered.
          That combination is the &quot;Partial prerendering&quot; demo at the end of this series.
        </p>
      </Explainer>
      <Suspense fallback={<ProductGridSkeleton />}>
        <DynamicProducts />
      </Suspense>
    </StrategyLayout>
  );
}

async function DynamicProducts() {
  await connection(); // opt in to rendering on every request
  const products = await getProducts();
  const renderedAt = renderTimestamp();

  return (
    <section className="flex flex-col gap-4">
      <RenderBadge
        strategy="Dynamic (SSR)"
        where="server"
        renderedAt={renderedAt}
        tryThis="reload. The time changes every time, and you wait about 0.6 seconds for the database each visit."
      />
      <ProductGrid products={products} />
    </section>
  );
}
