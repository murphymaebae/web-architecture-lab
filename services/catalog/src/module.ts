// CATALOG subgraph: owns products and stock.

import { gql, type ServiceModule } from "@lab/service-kit";
import { catalogRepository } from "./repository";

export const catalogModule: ServiceModule = {
  typeDefs: gql`
    """
    Something we sell. @key(fields: "id") makes Product an ENTITY: other
    services can point at a product by its id, and the gateway knows to ask
    this service for the details.
    """
    type Product @key(fields: "id") {
      id: ID!
      slug: String!
      name: String!
      category: String!
      price: Float!
      description: String!
      emoji: String!
      tags: [String!]!
      "Units available right now. Changes as orders come in."
      stock: Int!
    }

    extend type Query {
      products(tag: String): [Product!]!
      "Look a product up by slug or by id."
      product(slug: String, id: ID): Product
    }

    extend type Mutation {
      "Called by the orders service when someone buys something."
      reserveStock(productId: ID!, quantity: Int!): Product!
    }
  `,
  resolvers: {
    Query: {
      products: (_parent, args: { tag?: string | null }) => catalogRepository.list({ tag: args.tag }),
      product: (_parent, args: { slug?: string | null; id?: string | null }) =>
        args.id ? catalogRepository.byId(args.id) : args.slug ? catalogRepository.bySlug(args.slug) : null,
    },
    Mutation: {
      reserveStock: (_parent, args: { productId: string; quantity: number }) =>
        catalogRepository.reserve(args.productId, args.quantity),
    },
    Product: {
      // The gateway calls this when another service hands back { id } and a
      // client asked for more fields (name, price...).
      __resolveReference: (ref: { id: string }) => catalogRepository.byId(ref.id),
    },
  },
};

/** Used by the monolith to call the catalog in-process. */
export { catalogRepository } from "./repository";
