// THE JOURNEY ENGINE: a tiny Customer Data Platform (CDP) + journey
// orchestrator.
//
// 1. COLLECT events from every channel (web, mobile, orders service...).
// 2. RESOLVE IDENTITY: join anonymous browsing to a known customer when they
//    sign in, so the journey continues across devices.
// 3. BUILD A PROFILE: counts, interests and a segment, all derived from events.
// 4. ORCHESTRATE JOURNEYS: move people through each journey's states and
//    decide the "next best action" for whichever channel asks.
//
// A key design choice: a profile is never edited directly. It is always the
// result of replaying its events in order ("event sourcing"). That makes
// merging two profiles trivial: put both event lists together and replay.
//
// This file has no GraphQL or HTTP in it, which keeps it easy to unit test
// (see engine.test.ts).

import type { Channel, Segment } from "@lab/domain";
import { journeys as defaultJourneys, type Action, type Journey } from "./journeys";

export type EventType = "page_view" | "product_view" | "campaign_view" | "article_view" | "order_placed" | (string & {});

export type TrackedEvent = {
  id: string;
  type: EventType;
  channel: Channel;
  at: string; // ISO timestamp
  productId?: string;
  tags?: string[];
  path?: string;
};

export type JourneyProgress = {
  state: string;
  enteredAt: string;
  /** Every state visited, in order. */
  history: string[];
};

export type Message = {
  id: string;
  channel: "email" | "push";
  title: string;
  body: string;
  sentAt: string;
  journeyId: string;
  state: string;
};

export type Profile = {
  id: string;
  userId?: string;
  anonymousIds: string[];
  events: TrackedEvent[];
  counts: Record<string, number>;
  /** Tag -> score. Viewing counts 1, buying counts 3. */
  interests: Record<string, number>;
  journeys: Record<string, JourneyProgress>;
  /** Emails and push notifications "sent" by journeys. */
  outbox: Message[];
  segment: Segment;
};

export type NextBestAction = Action & {
  id: string;
  journeyId: string;
  journeyName: string;
  state: string;
  reason: string;
};

export type TrackInput = {
  type: EventType;
  channel: Channel;
  userId?: string;
  anonymousId?: string;
  productId?: string;
  tags?: string[];
  path?: string;
  at?: string;
};

function emptyProfile(id: string): Profile {
  return {
    id,
    anonymousIds: [],
    events: [],
    counts: {},
    interests: {},
    journeys: {},
    outbox: [],
    segment: "new-visitor",
  };
}

/** Which marketing segment someone falls into, from their behaviour. */
export function computeSegment(p: Profile): Segment {
  const boughtAlpine = p.events.some((e) => e.type === "order_placed" && e.tags?.includes("alpine"));
  if (boughtAlpine || (p.interests.alpine ?? 0) >= 3) return "alpine-expert";
  if ((p.counts.order_placed ?? 0) >= 1 || (p.counts.product_view ?? 0) >= 3) return "weekend-hiker";
  return "new-visitor";
}

export class JourneyEngine {
  private profiles = new Map<string, Profile>();
  /** anonymous id -> profile id, once we know who the anonymous visitor is. */
  private aliases = new Map<string, string>();
  private nextEventId = 1;

  constructor(public readonly journeys: Journey[] = defaultJourneys) {}

  /** Record an event and return the updated profile. */
  track(input: TrackInput): Profile {
    const profile = this.resolve(input.userId, input.anonymousId);
    const event: TrackedEvent = {
      id: `e${this.nextEventId++}`,
      type: input.type,
      channel: input.channel,
      at: input.at ?? new Date().toISOString(),
      productId: input.productId,
      tags: input.tags,
      path: input.path,
    };
    this.apply(profile, event);
    return profile;
  }

  /** Find a profile without creating one. */
  find(userId?: string, anonymousId?: string): Profile | undefined {
    if (userId) {
      const p = this.profiles.get(`user:${userId}`);
      if (p) return p;
    }
    if (anonymousId) {
      const id = this.aliases.get(anonymousId) ?? `anon:${anonymousId}`;
      return this.profiles.get(id);
    }
    return undefined;
  }

  /** Forget a visitor completely (GDPR "right to be forgotten", in miniature). */
  forget(userId?: string, anonymousId?: string): boolean {
    const profile = this.find(userId, anonymousId);
    if (!profile) return false;
    this.profiles.delete(profile.id);
    for (const anon of profile.anonymousIds) this.aliases.delete(anon);
    return true;
  }

  /** The single most relevant thing to show this person on this channel. */
  nextBestAction(profile: Profile, channel: Channel): NextBestAction | null {
    let best: NextBestAction | null = null;
    for (const journey of this.journeys) {
      const progress = profile.journeys[journey.id];
      if (!progress) continue;
      const state = journey.states[progress.state];
      const action = state.actions[channel];
      if (!action || (best && best.priority >= action.priority)) continue;
      best = {
        ...action,
        id: `${journey.id}:${progress.state}:${channel}`,
        journeyId: journey.id,
        journeyName: journey.name,
        state: progress.state,
        reason: `You're in the "${state.label}" stage of the "${journey.name}" journey. ${state.description}`,
      };
    }
    return best;
  }

  // ---------------------------------------------------------------------------

  /** IDENTITY RESOLUTION. Returns the profile for these ids, creating or
   * merging profiles as needed. */
  private resolve(userId?: string, anonymousId?: string): Profile {
    const anonProfileId = anonymousId ? (this.aliases.get(anonymousId) ?? `anon:${anonymousId}`) : undefined;

    if (!userId) {
      if (!anonProfileId) throw new Error("An event needs a userId or an anonymousId");
      return this.getOrCreate(anonProfileId, (p) => p.anonymousIds.push(anonymousId!));
    }

    const userProfile = this.getOrCreate(`user:${userId}`, (p) => (p.userId = userId));
    if (anonymousId && !userProfile.anonymousIds.includes(anonymousId)) {
      userProfile.anonymousIds.push(anonymousId);
      // The visitor browsed anonymously, then signed in: merge that history
      // into their customer profile so the journey carries on.
      // (Only merge truly anonymous profiles: if this browser was used by a
      // different signed-in customer before, keep their profiles apart.)
      const anonProfile = anonProfileId ? this.profiles.get(anonProfileId) : undefined;
      if (anonProfile && anonProfile !== userProfile && !anonProfile.userId) {
        this.profiles.delete(anonProfile.id);
        this.replay(userProfile, [...userProfile.events, ...anonProfile.events]);
      }
      this.aliases.set(anonymousId, userProfile.id);
    }
    return userProfile;
  }

  private getOrCreate(id: string, init: (p: Profile) => void): Profile {
    let profile = this.profiles.get(id);
    if (!profile) {
      profile = emptyProfile(id);
      init(profile);
      this.profiles.set(id, profile);
    }
    return profile;
  }

  /** Rebuild a profile's derived data from scratch from a list of events. */
  private replay(profile: Profile, events: TrackedEvent[]) {
    const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
    Object.assign(profile, {
      events: [],
      counts: {},
      interests: {},
      journeys: {},
      outbox: [],
      segment: "new-visitor",
    });
    for (const event of sorted) this.apply(profile, event);
  }

  /** Apply one event: update counts and interests, then move journeys on. */
  private apply(profile: Profile, event: TrackedEvent) {
    profile.events.push(event);
    profile.counts[event.type] = (profile.counts[event.type] ?? 0) + 1;
    const weight = event.type === "order_placed" ? 3 : 1;
    for (const tag of event.tags ?? []) {
      profile.interests[tag] = (profile.interests[tag] ?? 0) + weight;
    }

    for (const journey of this.journeys) {
      const progress = profile.journeys[journey.id];
      if (!progress) {
        if (journey.entry.test(profile)) this.enter(profile, journey, journey.initial, event.at);
        // A visitor who just joined can still move on with the same event
        // (e.g. their first event is an order).
      }
      const current = profile.journeys[journey.id];
      if (!current) continue;
      const transition = journey.states[current.state].transitions.find((t) => t.test(profile, event));
      if (transition) this.enter(profile, journey, transition.to, event.at);
    }

    profile.segment = computeSegment(profile);
  }

  /** Move into a state. Email and push actions are "sent" on arrival. */
  private enter(profile: Profile, journey: Journey, stateId: string, at: string) {
    const previous = profile.journeys[journey.id];
    profile.journeys[journey.id] = {
      state: stateId,
      enteredAt: at,
      history: [...(previous?.history ?? []), stateId],
    };
    const state = journey.states[stateId];
    for (const channel of ["email", "push"] as const) {
      const action = state.actions[channel];
      if (!action) continue;
      profile.outbox.push({
        id: `${journey.id}:${stateId}:${channel}:${profile.outbox.length + 1}`,
        channel,
        title: action.title,
        body: action.body,
        sentAt: at,
        journeyId: journey.id,
        state: stateId,
      });
    }
  }
}
