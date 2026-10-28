// JOURNEY subgraph: event collection, visitor profiles, journeys and
// next-best-action decisions, exposed through GraphQL so every channel uses
// the same brain.

import type { Channel } from "@lab/domain";
import { businessError, gql, type LabContext, type ServiceModule } from "@lab/service-kit";
import { JourneyEngine, type Profile } from "./engine";

/** One engine (and its in-memory profiles) per running process. */
export const journeyEngine = new JourneyEngine();

type TrackEventInput = { type: string; productId?: string | null; tags?: string[] | null; path?: string | null };

function visitorIds(context: LabContext) {
  if (!context.userId && !context.anonymousId) {
    throw businessError("BAD_REQUEST", "Send an x-anonymous-id or x-user-id header to identify the visitor");
  }
  return [context.userId, context.anonymousId] as const;
}

export const journeyModule: ServiceModule = {
  typeDefs: gql`
    """
    Everything we know about one visitor, built from their events on every
    channel. Anonymous at first; joined to a customer when they sign in.
    """
    type VisitorProfile {
      id: ID!
      userId: ID
      anonymousIds: [String!]!
      segment: String!
      eventCount: Int!
      orderCount: Int!
      interests: [Interest!]!
      journeys: [JourneyProgress!]!
      events(limit: Int = 20): [TrackedEvent!]!
      "Emails and push notifications journeys have sent this visitor."
      outbox(channel: String): [Message!]!
    }

    type Interest {
      tag: String!
      score: Int!
    }

    type JourneyProgress {
      journeyId: ID!
      journeyName: String!
      state: String!
      stateLabel: String!
      enteredAt: String!
      history: [String!]!
    }

    type TrackedEvent {
      id: ID!
      type: String!
      channel: String!
      at: String!
      productId: ID
      tags: [String!]!
      path: String
    }

    type Message {
      id: ID!
      channel: String!
      title: String!
      body: String!
      sentAt: String!
      journeyId: ID!
      state: String!
    }

    type NextBestAction {
      id: ID!
      title: String!
      body: String!
      ctaLabel: String
      ctaHref: String
      "Why this person is seeing this. Great for debugging (and for trust)."
      reason: String!
      journeyId: ID!
      journeyName: String!
      state: String!
    }

    "A journey's design, for drawing it in the journey inspector."
    type JourneyDefinition {
      id: ID!
      name: String!
      description: String!
      entryRule: String!
      initial: String!
      states: [JourneyStateDefinition!]!
    }

    type JourneyStateDefinition {
      id: ID!
      label: String!
      description: String!
      channels: [String!]!
      transitions: [JourneyTransition!]!
    }

    type JourneyTransition {
      to: String!
      when: String!
    }

    input TrackEventInput {
      "page_view, product_view, campaign_view, article_view, order_placed..."
      type: String!
      productId: ID
      tags: [String!]
      path: String
    }

    # Every signed-in customer has a visitor profile.
    extend type User {
      profile: VisitorProfile
    }

    extend type Query {
      "The current visitor (from the x-user-id / x-anonymous-id headers)."
      visitor: VisitorProfile
      "What to show the current visitor on this channel right now."
      nextBestAction(channel: String!): NextBestAction
      journeyDefinitions: [JourneyDefinition!]!
    }

    extend type Mutation {
      "Record something the current visitor did. The channel comes from the x-channel header."
      trackEvent(input: TrackEventInput!): VisitorProfile!
      "Delete everything we know about the current visitor."
      forgetVisitor: Boolean!
    }
  `,
  resolvers: {
    Query: {
      visitor: (_parent, _args, context: LabContext) => {
        const [userId, anonymousId] = visitorIds(context);
        return journeyEngine.find(userId, anonymousId) ?? null;
      },
      nextBestAction: (_parent, args: { channel: string }, context: LabContext) => {
        const [userId, anonymousId] = visitorIds(context);
        const profile = journeyEngine.find(userId, anonymousId);
        return profile ? journeyEngine.nextBestAction(profile, args.channel as Channel) : null;
      },
      journeyDefinitions: () =>
        journeyEngine.journeys.map((j) => ({
          id: j.id,
          name: j.name,
          description: j.description,
          entryRule: j.entry.when,
          initial: j.initial,
          states: Object.entries(j.states).map(([id, s]) => ({
            id,
            label: s.label,
            description: s.description,
            channels: Object.keys(s.actions),
            transitions: s.transitions.map((t) => ({ to: t.to, when: t.when })),
          })),
        })),
    },
    Mutation: {
      trackEvent: (_parent, args: { input: TrackEventInput }, context: LabContext) => {
        const [userId, anonymousId] = visitorIds(context);
        return journeyEngine.track({
          type: args.input.type,
          channel: context.channel,
          userId,
          anonymousId,
          productId: args.input.productId ?? undefined,
          tags: args.input.tags ?? undefined,
          path: args.input.path ?? undefined,
        });
      },
      forgetVisitor: (_parent, _args, context: LabContext) => {
        const [userId, anonymousId] = visitorIds(context);
        return journeyEngine.forget(userId, anonymousId);
      },
    },
    User: {
      profile: (user: { id: string }) => journeyEngine.find(user.id) ?? null,
    },
    VisitorProfile: {
      eventCount: (p: Profile) => p.events.length,
      orderCount: (p: Profile) => p.counts.order_placed ?? 0,
      interests: (p: Profile) =>
        Object.entries(p.interests)
          .map(([tag, score]) => ({ tag, score }))
          .sort((a, b) => b.score - a.score),
      journeys: (p: Profile) =>
        journeyEngine.journeys
          .filter((j) => p.journeys[j.id])
          .map((j) => {
            const progress = p.journeys[j.id];
            return {
              journeyId: j.id,
              journeyName: j.name,
              stateLabel: j.states[progress.state].label,
              ...progress,
            };
          }),
      events: (p: Profile, args: { limit: number }) => p.events.slice(-args.limit).reverse(),
      outbox: (p: Profile, args: { channel?: string | null }) =>
        p.outbox.filter((m) => !args.channel || m.channel === args.channel).reverse(),
    },
    TrackedEvent: {
      tags: (e: { tags?: string[] }) => e.tags ?? [],
    },
  },
};

/** Declares the User entity when journey runs as its own service (see the
 * same idea in the orders service). */
export const journeyFederationStubs: ServiceModule = {
  typeDefs: gql`
    type User @key(fields: "id") {
      id: ID!
    }
  `,
  resolvers: {
    User: {
      __resolveReference: (ref: { id: string }) => ref,
    },
  },
};
