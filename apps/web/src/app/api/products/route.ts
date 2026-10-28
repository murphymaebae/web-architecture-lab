// A ROUTE HANDLER: a plain HTTP endpoint (GET /api/products) that returns JSON
// instead of HTML. The client-side rendering demo calls it from the browser.
// This is the "Backend for Frontend" (BFF) pattern: the website has its own
// small API that shapes data exactly the way its pages need.

import { connection } from "next/server";
import { getProducts } from "@/lib/catalog";

export async function GET(request: Request) {
  await connection(); // always answer with fresh data, never a cached copy
  const tag = new URL(request.url).searchParams.get("tag") ?? undefined;
  const products = await getProducts({ tag });
  return Response.json({ products, generatedAt: Date.now() });
}
