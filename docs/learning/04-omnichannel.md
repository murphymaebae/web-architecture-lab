# 04 · Omni-channel: one brand, a website and an app

**Goal:** see what a second channel shares with the first, what it can't
share, and where the awkward "glue" lives. By the end you should be able to
look at any company's web and app and guess which parts are one system and
which are two.

Run, in two terminals:

```bash
npm run dev          # API on :4000 + website on :3000
npm run dev:mobile   # Expo; press w for the browser, or scan the QR code with Expo Go
```

The app lives in [`apps/mobile`](../../apps/mobile). Its README has a map of
the files.

## Multi-channel vs omni-channel

- **Multi-channel**: you have a website and an app. Each has its own
  content, its own idea of who the customer is, its own offers.
- **Omni-channel**: the customer is one person to you, wherever they are.
  What they did on the website changes what the app shows, and the other
  way round.

The difference is almost entirely in the **backend**. The two front ends
can look nothing alike and still be omni-channel, as long as they share the
brain behind them.

## The picture

```
          website (Next.js)                         app (Expo / React Native)
   ┌────────────────────────────┐            ┌────────────────────────────┐
   │ Server Components, HTML    │            │ Native views, tabs, stack  │
   │ cookies: lab-anon, lab-user│            │ AsyncStorage: same ids     │
   │ BlockRenderer → <div>s     │            │ MobileBlockRenderer → Views│
   └─────────────┬──────────────┘            └─────────────┬──────────────┘
     server-side │ x-channel: web                on device │ x-channel: mobile
                 ▼                                         ▼
          ┌──────────────────── one GraphQL API (:4000) ─────────────────┐
          │  catalog · accounts · orders · content · journey             │
          │  (monolith or gateway + microservices: the app can't tell)   │
          └──────────────────────────────────────────────────────────────┘
```

## What is shared

| Shared thing | Where | Why it matters |
| --- | --- | --- |
| Business types (`Product`, `Segment`, `Channel`) | `packages/domain` | Both apps import the same TypeScript types, so "segment" means the same thing everywhere |
| The GraphQL API | `services/*` | Same queries (compare `apps/mobile/src/api/queries.ts` with `apps/web/src/lib/*.ts`). Fix a price bug once, both channels get it |
| Content and targeting rules | `packages/content`, `services/content` | One campaign page. Each block says which `channels` and `audience` it's for, and the server filters (`page(channel: "mobile")`) |
| The customer profile and journeys | `services/journey` | Events from both channels land in one profile. A journey can start on the web and continue in the app |
| Orders and stock | `services/orders`, `services/catalog` | Buy in the app, the website's stock count drops |

Try it: sign in as Bo on the website's Account page **and** on the app's Me
tab. View a product on the website. Pull to refresh on the Me tab: the
event list shows 💻 and 📱 events side by side.

## What is not shared, and why

| | Website | App | Why they differ |
| --- | --- | --- | --- |
| **UI components** | HTML + Tailwind (`<div>`, `<a>`) | React Native (`<View>`, `<Text>`, `<Pressable>`) | Browsers draw HTML; phones draw native views. React is shared, the building blocks aren't |
| **Navigation** | URLs and links, header nav | Native tabs + a stack you swipe back through | People expect each platform's own habits. The app's tab bar is drawn by iOS/Android, not by us |
| **Where data is fetched** | On the server (SSR, `"use cache"`, streaming) | On the device (client-side rendering, `useQuery`) | An app has no server of its own. It shows a spinner instead of finished HTML |
| **Caching** | Next.js cache + tags, CDN | In memory, refreshed when a screen comes into focus or you pull down | Different freshness tools: revalidation vs refetch-on-focus |
| **Identity storage** | Cookies (`lab-anon`, `lab-user`) | AsyncStorage on the device | Phones don't have cookies in the same way; tokens are kept in app storage (secure storage in real apps) |
| **Who calls the API** | The website's server (a "backend for frontend") | The phone, directly | The website can hide the API and secrets; the app's API must be safe to call from anywhere |
| **Releases** | Deploy and everyone has the new version | App store review; old versions stay in people's pockets for months | So the app must cope with content it doesn't understand (see below) |
| **Notifications** | None (email at most) | Push (here, an Inbox reading the journey outbox) | Push reaches people when the app is closed. It's the channel journeys love most |

## The glue: problems that only appear with two channels

**1. Links written for the web.** The CMS and journeys say
`/products?tag=alpine`. The app has no URLs like that, so
`apps/mobile/src/api/links.ts` translates web paths into app screens, and
falls back to opening the website. Real companies solve this with
*universal links* (iOS) and *app links* (Android) so a single URL works in
both.

**2. Content the app is too old to understand.** If editors add a new block
type tomorrow, the website shows it after the next deploy. An app installed
in June doesn't know it exists. `MobileBlockRenderer` returns `null` for
unknown block types instead of crashing. Server-side targeting
(`channel: "mobile"`) helps too: the server can hold back blocks the app
can't handle.

**3. Channel-specific content.** The campaign page has a paragraph marked
`channels: ["web"]` (too long for a phone) and a banner marked
`channels: ["mobile"]` ("App exclusive: scan any item in store..."). Compare
http://localhost:3000/content/campaign with the app's Home tab.

**4. Same decision, different presentation.** The journey service returns a
*next best action* per channel. The website shows it as a banner, the app as
a card, and push messages go to the Inbox. The **decision** is shared; the
**rendering** is per channel. Look at the `actions` in
`services/journey/src/journeys.ts`: each state has separate `web`, `mobile`,
`email` and `push` copy.

**5. Identity across devices.** Each install gets its own anonymous id, just
like each browser. Only signing in joins them. Until then, the same person on
two devices is two strangers. That's why companies push so hard for app
sign-in.

## Rendering, one more time

| Strategy | Website example | App equivalent |
| --- | --- | --- |
| Static (SSG) | `/rendering/static` | Content bundled into the app at build time (rare, needs an app update to change) |
| Cached + revalidated (ISR) | `/rendering/cached` | Cached in memory, refetched on focus or pull-to-refresh |
| Dynamic (SSR) | `/rendering/dynamic` | Not possible: there's no server rendering for native views |
| Streaming | `/rendering/streaming` | Each section fetches on its own (the product rails load after the page) |
| Client-side (CSR) | `/rendering/client` | **Everything.** The app is CSR by nature |

(Expo *can* server-render its web version, and React Server Components for
native are being explored. For this lab we keep the app purely client-side,
because that's how almost every production app works today.)

## Things to try

1. **A journey that crosses channels.** As an anonymous app user, view two
   alpine products. The Home tab's card switches to "Winter peaks ahead"
   and the Inbox gets a push. Now sign in as Bo in the app and check the
   website's `/journey` inspector (signed in as Bo there too): it's the same
   journey state.
2. **Switch the backend under the app.** Stop `npm run dev` and start
   `npm run dev:micro`. Pull to refresh in the app. Nothing changes for the
   app: the gateway makes five services look like one API.
3. **Add a mobile-only screen.** Add `src/app/(tabs)/stores.tsx` (a store
   finder, say) and a fifth `NativeTabs.Trigger`. Track a `screen_view`.
4. **Fix a deep link.** Add a CMS block with a link to `/account`. What
   should `appRouteFor()` return for it?
5. **Think about offline.** Turn off the API and open the app. What would you
   need to show the last-known products? (Hint: store the last `useQuery`
   result in AsyncStorage. This is what TanStack Query's persisters do.)
6. **Real push.** Read about Expo Notifications. Where would the journey
   service send to instead of the outbox, and what would the app need to
   register first?

## Recap of the whole lab

1. **Rendering** is a per-page decision on the web, and "client-side" on
   native.
2. **Content** is stored once (headless) and drawn per channel.
3. **GraphQL** gives every channel one API, whatever the backend looks like.
4. **Microservices vs monolith** is a deployment choice; good boundaries
   (ports and adapters) let you switch.
5. **Journeys** keep one customer profile and decide the next best action
   per channel.
6. **Omni-channel** = shared brain (data, content, decisions), separate faces
   (UI, navigation, delivery).
