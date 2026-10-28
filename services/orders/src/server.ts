// Runs the orders subgraph on its own (microservices topology).
//
// To reserve stock it calls the catalog service DIRECTLY over HTTP
// (service-to-service), not through the gateway. That keeps internal
// operations off the public API.

import {
  businessError,
  httpEventPublisher,
  portFromEnv,
  remoteRefs,
  startService,
  type InventoryPort,
} from "@lab/service-kit";
import { ordersFederationStubs, ordersModule } from "./module";

const CATALOG_URL = process.env.CATALOG_URL ?? "http://localhost:4001/";
const JOURNEY_URL = process.env.JOURNEY_URL ?? "http://localhost:4005/";

const httpInventory: InventoryPort = {
  async reserve(productId, quantity) {
    const res = await fetch(CATALOG_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-channel": "web" },
      body: JSON.stringify({
        query: `mutation Reserve($productId: ID!, $quantity: Int!) {
          reserveStock(productId: $productId, quantity: $quantity) { id name price tags }
        }`,
        operationName: "Reserve",
        variables: { productId, quantity },
      }),
    });
    const body = (await res.json()) as {
      data?: { reserveStock: { id: string; name: string; price: number; tags: string[] } };
      errors?: { message: string; extensions?: { code?: string } }[];
    };
    // Pass the catalog's error on to our caller, keeping its code.
    const error = body.errors?.[0];
    if (error) throw businessError(error.extensions?.code ?? "UPSTREAM_ERROR", error.message);
    return body.data!.reserveStock;
  },
};

await startService({
  name: "orders",
  port: portFromEnv("ORDERS_PORT", 4003),
  modules: [ordersFederationStubs, ordersModule],
  topology: "microservices",
  refs: remoteRefs,
  inventory: httpInventory,
  events: httpEventPublisher(JOURNEY_URL),
});
