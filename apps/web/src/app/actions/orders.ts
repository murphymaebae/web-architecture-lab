"use server";

import { updateTag } from "next/cache";
import { DATA_SOURCE } from "@/lib/data-source";
import { GraphQLRequestError, graphqlRequest } from "@/lib/graphql";
import { getUserId } from "@/lib/user";

export type BuyState =
  | { status: "idle" }
  | { status: "ok"; orderId: string; total: number }
  | { status: "error"; message: string };

/** Server Action behind the "Buy now" button.
 *
 * The browser calls this function; it runs here on the web server, which
 * calls the GraphQL API, which (in microservices mode) calls the orders
 * service, which calls the catalog service to reserve stock. Watch the
 * terminal logs while you click to see the whole chain. */
export async function buyProduct(_previous: BuyState, formData: FormData): Promise<BuyState> {
  if (DATA_SOURCE !== "graphql") {
    return { status: "error", message: "Ordering needs the backend. Run `npm run dev` from the repo root." };
  }
  const userId = await getUserId();
  if (!userId) return { status: "error", message: "Pick a demo user on the Account page first." };

  const productId = String(formData.get("productId"));
  try {
    const data = await graphqlRequest<{ placeOrder: { id: string; total: number } }>(
      `mutation PlaceOrder($productId: ID!) { placeOrder(productId: $productId, quantity: 1) { id total } }`,
      { productId },
      { userId },
    );
    // Product data (stock) changed, so throw away cached copies.
    updateTag("products");
    return { status: "ok", orderId: data.placeOrder.id, total: data.placeOrder.total };
  } catch (error) {
    const message = error instanceof GraphQLRequestError ? error.message : "Something went wrong";
    return { status: "error", message };
  }
}
