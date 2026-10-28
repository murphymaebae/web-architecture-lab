// SERVICE KIT: the plumbing every backend service shares, so each service's
// own code can focus on its business area.
//
// Vocabulary used throughout the backend:
// - SUBGRAPH: one service's slice of the overall GraphQL API (Apollo Federation term).
// - MODULE: a subgraph's schema (typeDefs) + the functions that fill it in (resolvers).
// - CONTEXT: per-request information every resolver can read (who is calling, from which channel...).

import { ApolloServer, type ApolloServerPlugin } from "@apollo/server";
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema, type GraphQLResolverMap } from "@apollo/subgraph";
import { GraphQLError, type DocumentNode } from "graphql";
import gql from "graphql-tag";
import type { Channel, Product, User } from "@lab/domain";

export { gql };

/** An error the caller can do something about (out of stock, not signed in).
 * The `code` travels to the client in `errors[].extensions.code`, so apps can
 * show a friendly message instead of "something went wrong". */
export function businessError(code: string, message: string) {
  return new GraphQLError(message, { extensions: { code } });
}

export type Topology = "monolith" | "microservices";

/** A pointer to an entity owned by another service. In microservices mode the
 * gateway swaps the pointer for the full object by asking the owning service. */
export type EntityReference<T extends string> = { __typename: T; id: string };

/** How one service gets hold of another service's entities. */
export interface EntityRefs {
  product(id: string): Promise<Product | EntityReference<"Product">>;
  user(id: string): Promise<User | EntityReference<"User">>;
}

/** The orders service needs to reserve stock, which the catalog service owns.
 * This "port" says WHAT it needs; each topology plugs in HOW. */
export interface InventoryPort {
  reserve(productId: string, quantity: number): Promise<{ id: string; name: string; price: number }>;
}

export type LabContext = {
  /** The signed-in demo user, from the `x-user-id` header. */
  userId?: string;
  /** Which channel the request came from, from the `x-channel` header. */
  channel: Channel;
  topology: Topology;
  refs: EntityRefs;
  inventory: InventoryPort;
};

export type ServiceModule = {
  typeDefs: DocumentNode;
  resolvers?: GraphQLResolverMap<LabContext>;
};

/** Opts the schema in to Apollo Federation 2 and imports the directives we use. */
const federationLink: ServiceModule = {
  typeDefs: gql`
    extend schema @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@key", "@shareable"])
  `,
};

export function buildSchema(modules: ServiceModule[]) {
  return buildSubgraphSchema([federationLink, ...modules]);
}

const CHANNELS: Channel[] = ["web", "mobile", "email", "store"];

/** Turn incoming HTTP headers into the parts of the context they control. */
export function contextFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const header = (name: string) => {
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const channel = header("x-channel") as Channel | undefined;
  return {
    userId: header("x-user-id") || undefined,
    channel: channel && CHANNELS.includes(channel) ? channel : ("web" as Channel),
  };
}

/** Logs one line per request, e.g. "[catalog] Products 12ms". Run the
 * microservices topology and watch these to see one page fan out across
 * several services. */
function requestLogger(serviceName: string): ApolloServerPlugin<LabContext> {
  return {
    async requestDidStart({ request, contextValue }) {
      // Skip the gateway's regular "what is your schema?" check-ins.
      if (request.query?.includes("_service")) return;
      const start = performance.now();
      return {
        async willSendResponse() {
          const ms = Math.round(performance.now() - start);
          const op = request.operationName ?? (request.query?.includes("_entities") ? "_entities" : "anonymous");
          console.log(`${op} ${ms}ms (channel=${contextValue.channel}${contextValue.userId ? `, user=${contextValue.userId}` : ""})`);
        },
      };
    },
  };
}

export async function startService(options: {
  name: string;
  port: number;
  modules: ServiceModule[];
  topology: Topology;
  refs: EntityRefs;
  inventory: InventoryPort;
}) {
  const server = new ApolloServer<LabContext>({
    schema: buildSchema(options.modules),
    plugins: [requestLogger(options.name), ApolloServerPluginInlineTraceDisabled()],
  });
  const { url } = await startStandaloneServer(server, {
    listen: { port: options.port },
    context: async ({ req }) => ({
      ...contextFromHeaders(req.headers),
      topology: options.topology,
      refs: options.refs,
      inventory: options.inventory,
    }),
  });
  console.log(`${options.name} ready at ${url} (${options.topology})`);
  return url;
}

/** Entity references used when services run separately: just return a
 * pointer and let the gateway fetch the rest from the owning service. */
export const remoteRefs: EntityRefs = {
  product: async (id) => ({ __typename: "Product", id }),
  user: async (id) => ({ __typename: "User", id }),
};

/** An InventoryPort that does nothing useful. For services that never
 * reserve stock but still need to fill in the context. */
export const noInventory: InventoryPort = {
  reserve: async () => {
    throw new Error("This service cannot reserve stock");
  },
};

/** Read a port number from an environment variable, with a default. */
export function portFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
