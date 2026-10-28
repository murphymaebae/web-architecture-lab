// Talking to the journey service from the website.
import "server-only";

import type { Segment } from "@lab/domain";
import { DATA_SOURCE } from "./data-source";
import { graphqlRequest } from "./graphql";
import { getVisitorIds } from "./visitor";

export type TrackInput = { type: string; productId?: string; tags?: string[]; path?: string };

export type NextBestAction = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  reason: string;
  journeyName: string;
  state: string;
};

export type VisitorProfile = {
  id: string;
  userId: string | null;
  anonymousIds: string[];
  segment: Segment;
  eventCount: number;
  orderCount: number;
  interests: { tag: string; score: number }[];
  journeys: { journeyId: string; journeyName: string; state: string; stateLabel: string; enteredAt: string; history: string[] }[];
  events: { id: string; type: string; channel: string; at: string; productId: string | null; tags: string[]; path: string | null }[];
  outbox: { id: string; channel: string; title: string; body: string; sentAt: string; journeyId: string }[];
};

export type JourneyDefinition = {
  id: string;
  name: string;
  description: string;
  entryRule: string;
  initial: string;
  states: { id: string; label: string; description: string; channels: string[]; transitions: { to: string; when: string }[] }[];
};

/** Journeys only exist when the backend is running. */
export const journeysEnabled = DATA_SOURCE === "graphql";

/** Record an event for the current visitor. Never throws: tracking must
 * never break the page. */
export async function trackEvent(input: TrackInput): Promise<void> {
  if (!journeysEnabled) return;
  const ids = await getVisitorIds();
  if (!ids.userId && !ids.anonymousId) return;
  try {
    await graphqlRequest(
      `mutation Track($input: TrackEventInput!) { trackEvent(input: $input) { id } }`,
      { input: input },
      { ...ids, channel: "web" },
    );
  } catch (error) {
    console.warn("tracking failed:", (error as Error).message);
  }
}

export async function getVisitorProfile(): Promise<VisitorProfile | null> {
  if (!journeysEnabled) return null;
  const ids = await getVisitorIds();
  const data = await graphqlRequest<{ visitor: VisitorProfile | null }>(
    `query Visitor {
      visitor {
        id userId anonymousIds segment eventCount orderCount
        interests { tag score }
        journeys { journeyId journeyName state stateLabel enteredAt history }
        events(limit: 25) { id type channel at productId tags path }
        outbox { id channel title body sentAt journeyId }
      }
    }`,
    {},
    ids,
  );
  return data.visitor;
}

export async function getNextBestAction(): Promise<NextBestAction | null> {
  if (!journeysEnabled) return null;
  const ids = await getVisitorIds();
  try {
    const data = await graphqlRequest<{ nextBestAction: NextBestAction | null }>(
      `query NextBestAction { nextBestAction(channel: "web") { id title body ctaLabel ctaHref reason journeyName state } }`,
      {},
      ids,
    );
    return data.nextBestAction;
  } catch {
    return null; // personalization is a nice-to-have; fail quietly
  }
}

export async function getJourneyDefinitions(): Promise<JourneyDefinition[]> {
  if (!journeysEnabled) return [];
  const data = await graphqlRequest<{ journeyDefinitions: JourneyDefinition[] }>(
    `query JourneyDefinitions {
      journeyDefinitions {
        id name description entryRule initial
        states { id label description channels transitions { to when } }
      }
    }`,
  );
  return data.journeyDefinitions;
}
