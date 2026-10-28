import { Suspense } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { PageHeading } from "@/components/PageHeading";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { getProducts } from "@/lib/catalog";

export const metadata = { title: "Products" };

const tags = ["backpacking", "lightweight", "day-hike", "alpine"];

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <PageHeading title="Products">
        <p>
          The filter lives in the URL (<code>?tag=alpine</code>), so filtered views can be shared,
          bookmarked and indexed by search engines.
        </p>
      </PageHeading>
      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href="/products" className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
          All
        </Link>
        {tags.map((tag) => (
          <Link key={tag} href={`/products?tag=${tag}`} className="rounded-full border border-zinc-300 px-3 py-1 dark:border-zinc-700">
            {tag}
          </Link>
        ))}
      </nav>
      {/* The URL's query string is only known per request, so the results
          stream in behind a skeleton while the rest of the page is static. */}
      <Suspense fallback={<ProductGridSkeleton />}>
        {searchParams.then(({ tag }) => (
          <FilteredProducts tag={typeof tag === "string" ? tag : undefined} />
        ))}
      </Suspense>
    </>
  );
}

async function FilteredProducts({ tag }: { tag?: string }) {
  "use cache"; // the tag becomes part of the cache key: one cache entry per filter
  cacheLife("hours");
  cacheTag("products");
  const products = await getProducts({ tag });
  return <ProductGrid products={products} />;
}
