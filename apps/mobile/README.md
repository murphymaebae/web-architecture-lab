# Trailhead mobile app

The omni-channel half of the lab: a React Native app, built with
[Expo](https://expo.dev), that talks to the **same GraphQL API** as the
website. Read [04 · Omni-channel](../../docs/learning/04-omnichannel.md) for
the ideas behind it.

## Run it

From the repo root, in two terminals:

```bash
npm run dev          # the API on :4000 (and the website on :3000)
npm run dev:mobile   # the Expo dev server
```

Then either:

- press **`w`** to open the app in your browser (quickest), or
- install **Expo Go** on your phone and scan the QR code. Your phone must be
  on the same Wi-Fi as your computer. The app finds the API using your
  computer's address automatically (see `src/api/config.ts`). If it can't,
  set it yourself: `EXPO_PUBLIC_GRAPHQL_URL=http://192.168.1.20:4000/ npm run dev:mobile`.

The app needs the backend: unlike the website, it has no "sample data" mode.

## Where things are

```
src/app/                 Screens. Every file is a route, like Next.js's app/ folder.
  _layout.tsx            Root: theme, identity, and a Stack navigator
  (tabs)/_layout.tsx     The four native tabs
  (tabs)/index.tsx       Home: next best action + campaign blocks
  (tabs)/shop.tsx        Products with tag filters (/shop?tag=alpine)
  (tabs)/inbox.tsx       "Push notifications" from journeys
  (tabs)/me.tsx          Sign in, profile, cross-channel event history, orders
  product/[slug].tsx     Product detail + Buy now
  article/[slug].tsx     CMS article
src/api/                 Talking to the backend
  config.ts              Where is the API? (localhost means the phone, on a phone!)
  client.ts              GraphQL over fetch, sends x-channel: mobile
  identity.tsx           Anonymous device id + signed-in user, saved on the device
  queries.ts             Every query and mutation the app sends
  track.ts               screen_view / product_view events
  links.ts               Turns website paths into app screens (deep links)
src/hooks/use-query.ts   Small data-fetching hook (loading, error, refetch on focus)
src/components/          Cards, buttons and the mobile CMS block renderer
```

## Checks

```bash
npm run typecheck -w mobile
```
