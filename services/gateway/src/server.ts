// THE GATEWAY (microservices topology).
//
// Clients (the website, the mobile app) only ever talk to this one URL. The
// gateway knows which service owns which field, splits each query into a
// "query plan", calls the services (in parallel where it can), and stitches
// the answers back into one response. This is Apollo Federation.
//
// In production, enterprises usually run the Apollo Router (a fast Rust
// binary) or a similar gateway, with the combined "supergraph" schema built
// in CI. This Node.js gateway composes the schema at startup by asking each
// service for its schema, which is simpler for local learning.

import "./env";
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from "@apollo/gateway";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const services = [
  { name: "catalog", url: process.env.CATALOG_URL ?? "http://localhost:4001/" },
  { name: "accounts", url: process.env.ACCOUNTS_URL ?? "http://localhost:4002/" },
  { name: "orders", url: process.env.ORDERS_URL ?? "http://localhost:4003/" },
  { name: "content", url: process.env.CONTENT_URL ?? "http://localhost:4004/" },
];

type GatewayContext = { headers: Record<string, string> };

/** Headers we pass on from the client to every service. */
const FORWARDED_HEADERS = ["x-user-id", "x-channel", "x-anonymous-id"];

function createServer() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: services,
      // Re-check the services every few seconds, so schema changes show up
      // without restarting the gateway (handy in development).
      pollIntervalInMs: 5000,
    }),
    buildService: ({ url }) =>
      new RemoteGraphQLDataSource<GatewayContext>({
        url,
        // Copy the forwarded headers onto every call to a service.
        willSendRequest({ request, context }) {
          for (const [name, value] of Object.entries(context.headers ?? {})) {
            request.http?.headers.set(name, String(value));
          }
        },
      }),
  });
  return new ApolloServer<GatewayContext>({ gateway });
}

const port = Number(process.env.GATEWAY_PORT ?? 4000);

// The services may still be starting, so keep trying for up to 30 seconds.
// This lets `npm run dev:micro` start everything at once.
for (let attempt = 1; ; attempt++) {
  try {
    const { url } = await startStandaloneServer(createServer(), {
      listen: { port },
      context: async ({ req }) => ({
        headers: Object.fromEntries(
          FORWARDED_HEADERS.flatMap((name) => {
            const value = req.headers[name];
            return typeof value === "string" ? [[name, value] as const] : [];
          }),
        ),
      }),
    });
    console.log(`gateway ready at ${url} combining: ${services.map((s) => s.name).join(", ")}`);
    break;
  } catch (error) {
    if (attempt >= 30) throw error;
    console.log(`waiting for services (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}
