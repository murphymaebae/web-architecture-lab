import Link from "next/link";
import type { Product } from "@lab/domain";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 transition hover:border-emerald-500 hover:shadow-sm dark:border-zinc-800"
    >
      <span className="text-4xl" aria-hidden>
        {product.emoji}
      </span>
      <span className="font-medium">{product.name}</span>
      <span className="text-sm text-zinc-500">{formatPrice(product.price)}</span>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

/** Grey placeholder boxes shown while products are loading. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
