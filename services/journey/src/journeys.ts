// JOURNEY DEFINITIONS: what marketers would build in a journey tool such as
// Adobe Journey Optimizer, Salesforce Journey Builder, Braze Canvas or
// Iterable. Each journey is a STATE MACHINE:
//
//   - states: where a customer is ("browsing", "interested", "customer")
//   - transitions: rules that move them on when events arrive
//   - actions: what to show or send in each state, per channel
//
// Defining journeys as data (not scattered if-statements in the website)
// means every channel follows the same rules, and the rules can change
// without redeploying the apps.

import type { Channel } from "@lab/domain";
import type { Profile, TrackedEvent } from "./engine";

export type Action = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Higher wins when several journeys want the same slot. */
  priority: number;
};

export type Transition = {
  to: string;
  /** Plain-English version of the rule, shown in the journey inspector. */
  when: string;
  test: (profile: Profile, event: TrackedEvent) => boolean;
};

export type JourneyState = {
  label: string;
  description: string;
  /** What to show/send on each channel while someone is in this state.
   * Web and mobile actions are shown when the app asks; email and push
   * actions are "sent" once, when someone enters the state. */
  actions: Partial<Record<Channel, Action>>;
  transitions: Transition[];
};

export type Journey = {
  id: string;
  name: string;
  description: string;
  /** Rule for joining the journey at all. */
  entry: { when: string; test: (profile: Profile) => boolean };
  initial: string;
  states: Record<string, JourneyState>;
};

const viewsOf = (p: Profile, productId: string) =>
  p.events.filter((e) => e.type === "product_view" && e.productId === productId).length;

export const journeys: Journey[] = [
  {
    id: "first-purchase",
    name: "First purchase",
    description: "Guide new visitors from looking around to their first order, then keep them coming back.",
    entry: { when: "Every visitor", test: () => true },
    initial: "browsing",
    states: {
      browsing: {
        label: "Browsing",
        description: "Looking around, no strong interest yet.",
        actions: {
          web: {
            title: "New to the trails?",
            body: "Our beginner guide covers everything for your first night out.",
            ctaLabel: "Read the guide",
            ctaHref: "/content/articles/first-overnight",
            priority: 1,
          },
          mobile: {
            title: "Welcome to Trailhead",
            body: "Tap the heart on anything you like and we'll keep it here for you.",
            priority: 1,
          },
        },
        transitions: [
          {
            to: "interested",
            when: "Views 3 products, or the same product twice",
            test: (p, e) =>
              e.type === "product_view" &&
              (p.counts.product_view >= 3 || (!!e.productId && viewsOf(p, e.productId) >= 2)),
          },
          { to: "customer", when: "Places an order", test: (_p, e) => e.type === "order_placed" },
        ],
      },
      interested: {
        label: "Interested",
        description: "Clearly shopping, hasn't bought yet. The moment to help them decide.",
        actions: {
          web: {
            title: "Still deciding?",
            body: "Free shipping on orders over $100, and free returns for 60 days.",
            ctaLabel: "Keep browsing",
            ctaHref: "/products",
            priority: 5,
          },
          mobile: {
            title: "Your picks are waiting",
            body: "Free shipping over $100 this month. Tap to see what you looked at.",
            priority: 5,
          },
          email: {
            title: "Forgot something?",
            body: "You were looking at some great gear. Here's free shipping to help you decide.",
            priority: 5,
          },
        },
        transitions: [{ to: "customer", when: "Places an order", test: (_p, e) => e.type === "order_placed" }],
      },
      customer: {
        label: "Customer",
        description: "Has bought something. Help them enjoy it, then suggest what's next.",
        actions: {
          web: {
            title: "Thanks for your order!",
            body: "Make your new gear last: our care guide takes two minutes to read.",
            ctaLabel: "Care tips",
            ctaHref: "/content/articles/boot-care",
            priority: 4,
          },
          mobile: {
            title: "Your order is on its way",
            body: "We'll notify you here when it ships.",
            priority: 4,
          },
          email: {
            title: "Order confirmed",
            body: "Thanks for shopping with Trailhead. Here's how to get the most out of your gear.",
            priority: 4,
          },
        },
        transitions: [
          {
            to: "loyal",
            when: "Places a second order",
            test: (p, e) => e.type === "order_placed" && p.counts.order_placed >= 2,
          },
        ],
      },
      loyal: {
        label: "Loyal",
        description: "Repeat customer. Reward them.",
        actions: {
          web: {
            title: "You're a Trailhead regular",
            body: "Members get early access to new gear. Here's what's coming this winter.",
            ctaLabel: "See the alpine range",
            ctaHref: "/products?tag=alpine",
            priority: 6,
          },
          mobile: { title: "Member perk unlocked", body: "Early access to the winter range starts today.", priority: 6 },
          email: { title: "Welcome to the club", body: "As a repeat customer you now get early access to new gear.", priority: 6 },
        },
        transitions: [],
      },
    },
  },
  {
    id: "alpine-upsell",
    name: "Alpine upsell",
    description: "Spot people drawn to high-mountain gear and help them kit out properly.",
    entry: { when: "Shows interest in alpine gear (score 2+)", test: (p) => (p.interests.alpine ?? 0) >= 2 },
    initial: "curious",
    states: {
      curious: {
        label: "Alpine-curious",
        description: "Has looked at alpine gear more than once.",
        actions: {
          web: {
            title: "Heading up high?",
            body: "Our mountaineering boots and hardshells are built for winter peaks.",
            ctaLabel: "Shop alpine",
            ctaHref: "/products?tag=alpine",
            priority: 7,
          },
          mobile: { title: "Winter peaks ahead", body: "New alpine gear just landed. Tap to explore.", priority: 7 },
          push: { title: "New alpine gear", body: "The winter mountaineering range is in stock now.", priority: 7 },
        },
        transitions: [
          {
            to: "equipped",
            when: "Buys an alpine product",
            test: (_p, e) => e.type === "order_placed" && (e.tags ?? []).includes("alpine"),
          },
        ],
      },
      equipped: {
        label: "Equipped",
        description: "Owns alpine gear. Stop selling it to them.",
        actions: {},
        transitions: [],
      },
    },
  },
];
