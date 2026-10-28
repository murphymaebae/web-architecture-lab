import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { products } from "@lab/domain";
import { Explainer } from "@/components/Explainer";
import { getProduct, getStock } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/** Prerender every product page at build time. */
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);
  return { title: product?.name ?? "Product not found", description: product?.description };
}

async function getCachedProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${slug}`);
  return getProduct(slug);
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);
  if (!product) notFound();

  return (
    <>
      <Link href="/products" className="text-sm text-zinc-500">
        ← All products
      </Link>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-zinc-100 text-9xl dark:bg-zinc-900">
          {product.emoji}
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <p className="text-2xl">{formatPrice(product.price)}</p>
          <p className="text-zinc-600 dark:text-zinc-400">{product.description}</p>
          <Suspense fallback={<p className="h-6 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />}>
            <LiveStock productId={product.id} />
          </Suspense>
          <p className="text-xs text-zinc-500">Tags: {product.tags.join(", ")}</p>
        </div>
      </div>
      <Explainer title="How this product page is built">
        <p>
          A very common commerce pattern. Name, price, picture and description change rarely, so
          they are cached and prerendered for every product (<code>generateStaticParams</code>).
          Stock changes constantly, so <code>LiveStock</code> is a dynamic hole that streams in
          fresh on every request.
        </p>
      </Explainer>
    </>
  );
}

async function LiveStock({ productId }: { productId: string }) {
  const stock = await getStock(productId);
  return (
    <p className={stock < 5 ? "font-medium text-rose-600" : "text-emerald-700 dark:text-emerald-400"}>
      {stock === 0 ? "Out of stock" : stock < 5 ? `Only ${stock} left` : `${stock} in stock`} (live)
    </p>
  );
}
