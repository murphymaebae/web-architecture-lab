// DATA ACCESS LAYER for products.
//
// Every page gets product data through these functions, never by reading the
// data directly. Since step 2 there are two sources (see data-source.ts):
// the in-repo sample data, or the catalog service through GraphQL. Pages
// don't know or care which one is in use.
//
// `import "server-only"` makes the build fail if a Client Component (code
// that runs in the browser) ever imports this file. It protects secrets such
// as database passwords or API keys from leaking to the browser.
import "server-only";

import { connection } from "next/server";
import { products, sleep, type Product } from "@lab/domain";
import { DATA_SOURCE } from "./data-source";
import { graphqlRequest } from "./graphql";

/** In local mode, pretend the product database takes this long to answer. */
const DB_LATENCY_MS = 600;

const PRODUCT_FIELDS = `id slug name category price description emoji stock tags`;

export async function getProducts(filter?: { tag?: string }): Promise<Product[]> {
  if (DATA_SOURCE === "graphql") {
    const data = await graphqlRequest<{ products: Product[] }>(
      `query Products($tag: String) { products(tag: $tag) { ${PRODUCT_FIELDS} } }`,
      { tag: filter?.tag ?? null },
    );
    return data.products;
  }
  await sleep(DB_LATENCY_MS);
  if (filter?.tag) return products.filter((p) => p.tags.includes(filter.tag!));
  return products;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  if (DATA_SOURCE === "graphql") {
    const data = await graphqlRequest<{ product: Product | null }>(
      `query Product($slug: String!) { product(slug: $slug) { ${PRODUCT_FIELDS} } }`,
      { slug },
    );
    return data.product ?? undefined;
  }
  await sleep(DB_LATENCY_MS);
  return products.find((p) => p.slug === slug);
}

/** Stock changes often, so pages usually fetch it separately and fresh. */
export async function getStock(productId: string): Promise<number> {
  // Stock must never come from a cache, so tell Next.js this needs a request.
  await connection();
  if (DATA_SOURCE === "graphql") {
    const data = await graphqlRequest<{ product: { stock: number } | null }>(
      `query Stock($id: ID!) { product(id: $id) { stock } }`,
      { id: productId },
    );
    return data.product?.stock ?? 0;
  }
  await sleep(DB_LATENCY_MS);
  const product = products.find((p) => p.id === productId);
  // Wobble the number a little so you can see it change between requests.
  return Math.max(0, (product?.stock ?? 0) - Math.floor(Math.random() * 3));
}
