import { Suspense } from "react";
import { connection } from "next/server";
import { sleep } from "@lab/domain";
import { renderTimestamp } from "@/lib/clock";
import { Explainer } from "@/components/Explainer";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { RenderBadge } from "@/components/RenderBadge";
import { StrategyLayout } from "@/components/StrategyLayout";
import { getProducts } from "@/lib/catalog";

export const metadata = { title: "Streaming" };

export default function StreamingPage() {
  return (
    <StrategyLayout slug="streaming">
      <Explainer>
        <p>
          This page has three sections that each take a different time to load (about 0.6, 1.5
          and 3 seconds). Without streaming, the server would wait for the slowest one before
          sending anything. With streaming, the server sends the page straight away with
          placeholders, then sends each section down the <em>same</em> HTTP response as soon as
          it is ready.
        </p>
        <p>
          Each <code>&lt;Suspense fallback=&#123;...&#125;&gt;</code> is a &quot;cut line&quot;: React
          shows the fallback until the part inside it finishes. You decide where the cut lines
          go based on what users need to see first.
        </p>
      </Explainer>

      <div className="grid gap-6">
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <Section title="Lightweight gear (fast database)" delay={0} tag="lightweight" />
        </Suspense>
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <Section title="Recommended for you (slower recommendation engine)" delay={1500} tag="day-hike" />
        </Suspense>
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <Section title="Alpine range (very slow legacy system)" delay={3000} tag="alpine" />
        </Suspense>
      </div>
    </StrategyLayout>
  );
}

async function Section({ title, delay, tag }: { title: string; delay: number; tag: string }) {
  await connection();
  const start = renderTimestamp();
  const [products] = await Promise.all([getProducts({ tag }), sleep(delay)]);
  const renderedAt = renderTimestamp();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{title}</h2>
      <RenderBadge
        strategy={`Streamed after ${renderedAt - start} ms`}
        where="server"
        renderedAt={renderedAt}
      />
      <ProductGrid products={products} />
    </section>
  );
}
