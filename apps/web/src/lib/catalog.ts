// DATA ACCESS LAYER for products.
//
// Every page gets product data through these functions, never by reading the
// data directly. That way, when the data moves behind a GraphQL API in step 2,
// only this file changes.
//
// `import "server-only"` makes the build fail if a Client Component (code
// that runs in the browser) ever imports this file. It protects secrets such
// as database passwords or API keys from leaking to the browser.
import "server-only";

import { connection } from "next/server";
import { products, sleep, type Product } from "@lab/domain";

/** Pretend the product database takes this long to answer. */
const DB_LATENCY_MS = 600;

export async function getProducts(filter?: { tag?: string }): Promise<Product[]> {
  await sleep(DB_LATENCY_MS);
  if (filter?.tag) return products.filter((p) => p.tags.includes(filter.tag!));
  return products;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  await sleep(DB_LATENCY_MS);
  return products.find((p) => p.slug === slug);
}

/** Stock changes often, so pages usually fetch it separately and fresh. */
export async function getStock(productId: string): Promise<number> {
  // Stock must never come from a cache, so tell Next.js this needs a request.
  await connection();
  await sleep(DB_LATENCY_MS);
  const product = products.find((p) => p.id === productId);
  // Wobble the number a little so you can see it change between requests.
  return Math.max(0, (product?.stock ?? 0) - Math.floor(Math.random() * 3));
}
