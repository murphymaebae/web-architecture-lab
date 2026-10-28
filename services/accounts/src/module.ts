// ACCOUNTS subgraph: owns customers (users) and their segment.

import { sleep, users as seed, type User } from "@lab/domain";
import { gql, type LabContext, type ServiceModule } from "@lab/service-kit";

const users: User[] = seed.map((u) => ({ ...u }));

async function findUser(id: string) {
  await sleep(30); // pretend database round trip
  return users.find((u) => u.id === id);
}

export const accountsModule: ServiceModule = {
  typeDefs: gql`
    type User @key(fields: "id") {
      id: ID!
      name: String!
      email: String!
      "Which customer group we put this person in (new-visitor, weekend-hiker, alpine-expert)."
      segment: String!
    }

    extend type Query {
      "The signed-in user, taken from the x-user-id header."
      me: User
      user(id: ID!): User
      users: [User!]!
    }
  `,
  resolvers: {
    Query: {
      me: (_parent, _args, context: LabContext) => (context.userId ? findUser(context.userId) : null),
      user: (_parent, args: { id: string }) => findUser(args.id),
      users: async () => {
        await sleep(30);
        return users;
      },
    },
    User: {
      __resolveReference: (ref: { id: string }) => findUser(ref.id),
    },
  },
};

/** Used by the monolith to look users up in-process. */
export const accountsRepository = { byId: findUser };
