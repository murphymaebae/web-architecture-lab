// The BLOCK RENDERER turns CMS blocks into React components.
//
// Each block type from the content model maps to one component. The CMS
// decides WHAT to show and in which order; this file decides HOW it looks on
// the website. The mobile app (step 4) has its own renderer for the same
// blocks, which is what lets one piece of content serve many channels.

import { Suspense } from "react";
import Link from "next/link";
import type { Block, FeatureGridBlock, HeroBlock, ProductRailBlock, PromoBannerBlock, RichTextBlock } from "@lab/content";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { getProducts } from "@/lib/catalog";

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function RenderBlock({ block }: { block: Block }) {
  // `switch` on the `type` field. Because Block is a discriminated union,
  // TypeScript knows the exact shape inside each case.
  switch (block.type) {
    case "hero":
      return <Hero block={block} />;
    case "richText":
      return <RichText block={block} />;
    case "featureGrid":
      return <FeatureGrid block={block} />;
    case "productRail":
      return (
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <ProductRail block={block} />
        </Suspense>
      );
    case "promoBanner":
      return <PromoBanner block={block} />;
    default: {
      // If someone adds a new block type to the CMS and forgets to add it
      // here, this line becomes a TypeScript error. Handy safety net.
      const unknown: never = block;
      return unknown;
    }
  }
}

function Hero({ block }: { block: HeroBlock }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-10 text-white">
      <h2 className="text-3xl font-semibold">{block.heading}</h2>
      <p className="mt-2 max-w-xl text-emerald-50">{block.subheading}</p>
      {block.cta && (
        <Link href={block.cta.href} className="mt-6 inline-block rounded-lg bg-white px-4 py-2 font-medium text-emerald-900">
          {block.cta.label}
        </Link>
      )}
    </section>
  );
}

function RichText({ block }: { block: RichTextBlock }) {
  return (
    <section className="flex max-w-2xl flex-col gap-3 text-zinc-700 dark:text-zinc-300">
      {block.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </section>
  );
}

function FeatureGrid({ block }: { block: FeatureGridBlock }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{block.heading}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {block.items.map((item) => (
          <div key={item.title} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-2xl">{item.icon}</div>
            <h3 className="mt-2 font-medium">{item.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function ProductRail({ block }: { block: ProductRailBlock }) {
  const products = await getProducts({ tag: block.tag });
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{block.heading}</h2>
      <ProductGrid products={products.slice(0, 4)} />
    </section>
  );
}

function PromoBanner({ block }: { block: PromoBannerBlock }) {
  const tone =
    block.tone === "sale"
      ? "bg-rose-600 text-white"
      : "bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100";
  return <p className={`rounded-lg px-4 py-3 text-sm font-medium ${tone}`}>{block.text}</p>;
}
