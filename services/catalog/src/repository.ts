// The catalog service's own data store. "Database per service" is a core
// microservices rule: only this service reads or writes product data.
// Everyone else asks it through its API.
//
// Here the "database" is an in-memory copy of the sample data, so it resets
// whenever the service restarts.

import { products as seed, sleep, type Product } from "@lab/domain";
import { businessError } from "@lab/service-kit";

const products: Product[] = seed.map((p) => ({ ...p, tags: [...p.tags] }));

/** Pretend database round trip. */
const DB_MS = 40;

export const catalogRepository = {
  async list(filter: { tag?: string | null } = {}) {
    await sleep(DB_MS);
    return filter.tag ? products.filter((p) => p.tags.includes(filter.tag!)) : products;
  },

  async byId(id: string) {
    await sleep(DB_MS);
    return products.find((p) => p.id === id);
  },

  async bySlug(slug: string) {
    await sleep(DB_MS);
    return products.find((p) => p.slug === slug);
  },

  /** Take `quantity` items out of stock, or fail if there aren't enough. */
  async reserve(productId: string, quantity: number) {
    await sleep(DB_MS);
    const product = products.find((p) => p.id === productId);
    if (!product) throw businessError("NOT_FOUND", `Unknown product ${productId}`);
    if (quantity < 1) throw businessError("BAD_USER_INPUT", "Quantity must be at least 1");
    if (product.stock < quantity) {
      throw businessError("OUT_OF_STOCK", `Only ${product.stock} ${product.name} left`);
    }
    product.stock -= quantity;
    return product;
  },
};
