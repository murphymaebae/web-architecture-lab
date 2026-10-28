// ORDERS subgraph: owns orders. It does NOT own products or users; it only
// stores their ids and asks for the rest through `context.refs`.

import { orders as seed, sleep, type Order } from "@lab/domain";
import { businessError, gql, type LabContext, type ServiceModule } from "@lab/service-kit";

/** An order line remembers the price paid at the time. Prices change later,
 * but what the customer paid must not. */
type StoredOrderLine = { productId: string; quantity: number; unitPrice: number };
type StoredOrder = Omit<Order, "lines"> & { lines: StoredOrderLine[] };

// Seed orders with the prices they were bought at.
const seedPrices: Record<string, number> = { p6: 79, p8: 89, p4: 429 };
const orders: StoredOrder[] = seed.map((o) => ({
  ...o,
  lines: o.lines.map((l) => ({ ...l, unitPrice: seedPrices[l.productId] ?? 0 })),
}));

let nextId = orders.length + 1;

export const ordersModule: ServiceModule = {
  typeDefs: gql`
    type Order @key(fields: "id") {
      id: ID!
      status: String!
      createdAt: String!
      lines: [OrderLine!]!
      total: Float!
      "Owned by the accounts service."
      customer: User!
    }

    type OrderLine {
      "Owned by the catalog service."
      product: Product!
      quantity: Int!
      unitPrice: Float!
    }

    # Adds an orders field to the User type that the accounts service owns.
    extend type User {
      orders: [Order!]!
    }

    extend type Query {
      order(id: ID!): Order
    }

    extend type Mutation {
      "Buy something as the signed-in user (x-user-id header)."
      placeOrder(productId: ID!, quantity: Int! = 1): Order!
    }
  `,
  resolvers: {
    Query: {
      order: async (_parent, args: { id: string }) => {
        await sleep(30);
        return orders.find((o) => o.id === args.id);
      },
    },
    Mutation: {
      placeOrder: async (_parent, args: { productId: string; quantity: number }, context: LabContext) => {
        if (!context.userId) throw businessError("UNAUTHENTICATED", "Sign in first (x-user-id header missing)");
        // Step 1: ask the catalog to reserve stock. In microservices mode this
        // is a network call to another service; in the monolith it's a
        // function call. The code here doesn't know or care which.
        const product = await context.inventory.reserve(args.productId, args.quantity);
        // Step 2: record the order.
        const order: StoredOrder = {
          id: `o${nextId++}`,
          userId: context.userId,
          status: "placed",
          createdAt: new Date().toISOString(),
          lines: [{ productId: product.id, quantity: args.quantity, unitPrice: product.price }],
        };
        orders.push(order);
        // Step 3: tell anyone who cares (the journey service) what happened.
        // We don't wait for them; that's the point of events.
        context.events.publish({
          type: "order_placed",
          channel: context.channel,
          userId: context.userId,
          anonymousId: context.anonymousId,
          productId: product.id,
          tags: product.tags,
        });
        return order;
      },
    },
    Order: {
      __resolveReference: (ref: { id: string }) => orders.find((o) => o.id === ref.id),
      total: (order: StoredOrder) => order.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
      customer: (order: StoredOrder, _args, context: LabContext) => context.refs.user(order.userId),
    },
    OrderLine: {
      product: (line: StoredOrderLine, _args, context: LabContext) => context.refs.product(line.productId),
    },
    User: {
      orders: async (user: { id: string }) => {
        await sleep(30);
        return orders
          .filter((o) => o.userId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
    },
  },
};

/** When orders runs as its own service, it must still DECLARE the User and
 * Product types it points at, even though it doesn't own them. In the
 * monolith these stubs are left out because the real types are right there. */
export const ordersFederationStubs: ServiceModule = {
  typeDefs: gql`
    type User @key(fields: "id") {
      id: ID!
    }

    type Product @key(fields: "id", resolvable: false) {
      id: ID!
    }
  `,
  resolvers: {
    User: {
      __resolveReference: (ref: { id: string }) => ref,
    },
  },
};
