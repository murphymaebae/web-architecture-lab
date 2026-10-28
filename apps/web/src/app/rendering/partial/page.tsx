import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { products as allProducts } from "@lab/domain";
import { renderTimestamp } from "@/lib/clock";
import { Explainer } from "@/components/Explainer";
import { ProductGrid } from "@/components/ProductCard";
import { RenderBadge } from "@/components/RenderBadge";
import { SegmentSwitcher, SegmentSwitcherSkeleton } from "@/components/SegmentSwitcher";
import { StrategyLayout } from "@/components/StrategyLayout";
import { getProducts, getStock } from "@/lib/catalog";
import { getSegment } from "@/lib/segment";

export const metadata = { title: "Partial prerendering" };

const greetings = {
  "new-visitor": "Welcome! New to hiking? Start with our beginner guides.",
  "weekend-hiker": "Welcome back! Your next weekend trip is sorted.",
  "alpine-expert": "Welcome back! The winter alpine range is in.",
};

export default function PartialPage() {
  // Everything in this function that is not inside <Suspense> is part of the
  // STATIC SHELL: made once at build time, served instantly from a CDN.
  return (
    <StrategyLayout slug="partial">
      <Explainer>
        <p>
          <strong>Partial prerendering (PPR)</strong> is the default in Next.js 16. One page mixes
          three kinds of content, and you can see all three below:
        </p>
        <ul className="ml-5 mt-2 list-disc">
          <li>
            <strong>Static</strong>: this text, the heading and the header. Made at build time.
          </li>
          <li>
            <strong>Cached</strong>: the product grid (<code>&quot;use cache&quot;</code> for an hour). Also
            in the static shell, refreshed in the background.
          </li>
          <li>
            <strong>Dynamic</strong>: the greeting (reads your segment cookie) and the live stock
            count (changes every request). These are &quot;holes&quot; in the shell that the server fills
            in and streams down per visitor.
          </li>
        </ul>
        <p className="mt-2">
          This is the answer to an old enterprise problem: &quot;the page is 95% the same for
          everyone, but we need a personal greeting and a live price, so we can&apos;t cache it.&quot;
          Older stacks solved it with edge-side includes (ESI) or by loading the personal parts
          with JavaScript after the page loads.
        </p>
      </Explainer>

      <Suspense fallback={<SegmentSwitcherSkeleton />}>
        <SegmentSwitcher />
      </Suspense>

      <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
        <PersonalGreeting />
      </Suspense>

      <CachedGrid />
    </StrategyLayout>
  );
}

async function PersonalGreeting() {
  const segment = await getSegment(); // reading a cookie = needs the real visitor
  const featured = allProducts.find((p) => p.stock < 5)!;
  const stock = await getStock(featured.id);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
      <p className="font-medium">{greetings[segment]}</p>
      <p className="text-sm">
        Hurry: only <strong>{stock}</strong> {featured.name} left in stock right now.
      </p>
      <RenderBadge strategy="Dynamic hole" where="server" renderedAt={renderTimestamp()} />
    </div>
  );
}

async function CachedGrid() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const products = await getProducts();
  return (
    <section className="flex flex-col gap-4">
      <RenderBadge
        strategy="Cached part of the static shell"
        where="server"
        renderedAt={renderTimestamp()}
        tryThis="switch segments above. The greeting and its time change; this grid's time does not."
      />
      <ProductGrid products={products} />
    </section>
  );
}
