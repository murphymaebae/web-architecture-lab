# 03 · Journey management: events, identity, segments and next best action

**Goal:** understand how enterprise sites decide *what to show whom*, and why
that logic lives in its own service instead of inside the website.

Run `npm run dev` (or `npm run dev:micro`), browse a few products, then open
http://localhost:3000/journey.

## The pieces

```
 browser ──sendBeacon──▶ /api/track ──GraphQL──▶ journey service ◀── order_placed ── orders service
                                                   │
             next best action, segment  ◀──────────┘  (asked by the website, and by the mobile app in step 4)
```

| Piece | Where | Enterprise equivalent |
| --- | --- | --- |
| Anonymous id cookie | `apps/web/src/proxy.ts` | Analytics / CDP first-party cookie |
| Event tracking | `components/Track.tsx`, `app/api/track/route.ts` | Segment, Adobe Web SDK, Google Tag Manager server-side |
| Event from a backend | `services/orders` → `context.events.publish(...)` | Kafka / EventBridge topic consumed by the CDP |
| Profile + identity resolution | `services/journey/src/engine.ts` | Segment Profiles, Adobe Real-Time CDP, mParticle |
| Journey definitions | `services/journey/src/journeys.ts` | Adobe Journey Optimizer, Salesforce Journey Builder, Braze Canvas |
| Next best action slot | `components/NextBestAction.tsx` | Adobe Target / Optimizely / Pega decisioning |

## 1. Collecting events

Pages drop in `<Track event={{ type: "product_view", productId, tags }} />`,
and the root layout records a `page_view` on every navigation. Events go to
our own `/api/track` endpoint, which adds the visitor's ids from cookies and
forwards to the journey service. That is "first-party, server-side" tracking.

The orders service also emits `order_placed`, but differently: it
**publishes an event** and carries on without waiting. In the monolith the
event is a function call into the journey engine; with microservices it's a
fire-and-forget HTTP call (`services/kit` → `httpEventPublisher`). A real
system would put a message broker in the middle so events aren't lost while the
journey service is down. That is **event-driven architecture**: services
announce facts, and anyone interested reacts.

## 2. Identity resolution

1. On first visit, `proxy.ts` sets `lab-anon=<random id>`. All events carry it.
2. When you sign in on the Account page, the site sends a `signed_in` event with
   **both** your anonymous id and your user id.
3. The engine sees both ids and **merges** the anonymous profile into the
   customer profile. Your pre-sign-in browsing now counts towards your journeys.

Later, the mobile app (step 4) has its own anonymous id. Once you sign in there,
it joins the same customer profile, which is how a journey continues across
devices.

## 3. Profiles are built by replaying events

A profile is never edited directly. It's always the result of applying its
events in order (`apply()` in `engine.ts`). This is **event sourcing**, and it
makes hard things easy:

- Merging two profiles = combine the event lists and replay.
- Changing a journey rule = replay history to see who would be where.
- Debugging = the event list *is* the explanation.

Your **segment** (`computeSegment`) and **interests** (tag scores; viewing = 1,
buying = 3) are derived the same way. The segment now drives the targeted CMS
blocks from step 1 automatically. The "Pretend to be" buttons became an
override, with **🤖 Auto** handing control back to the journey service.

## 4. Journeys as state machines

Each journey in `journeys.ts` has:

- an **entry rule** (who joins),
- **states** (Browsing → Interested → Customer → Loyal),
- **transitions** ("views 3 products, or the same product twice"),
- **actions per channel** in each state: a web banner, a mobile card, an email
  or a push notification.

Web and mobile actions are *pulled*: the app asks "what should I show this
person?" (`nextBestAction(channel)`), and the highest-priority action across
all journeys wins. Email and push are *pushed*: they're "sent" once, when
someone enters the state (see the inspector's Messages column).

Every next best action comes with a **reason**. Being able to explain why
someone saw something is valuable for debugging, for marketing teams, and
increasingly for privacy regulation.

## 5. Tests

The engine has no web framework in it, so it's easy to test.
`services/journey/src/engine.test.ts` covers the journey rules, identity
merging and cross-channel continuity. Run `npm test`.

## Things to try

1. Open the site in a private window (a new anonymous visitor). View the same
   product twice and watch the home page banner change.
2. Browse as an anonymous visitor, then sign in on the Account page. Check the
   inspector: the profile id changes to `user:u…` and keeps your events.
3. Add a third journey to `journeys.ts`, e.g. "Content reader": enter after 2
   `article_view` events, show a "subscribe to our newsletter" web action.
   Add a test for it first.
4. Click **Forget me**. What would a real company also need to delete, and
   where? (Hint: every service that copied the data.)
5. In microservices mode, stop the journey service and place an order. The
   order still succeeds (fire-and-forget), but the event is lost. What would
   a message broker change?
