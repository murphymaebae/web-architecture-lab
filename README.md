# Web Architecture Lab

A hands-on sandbox for learning how modern enterprise web platforms are put
together: rendering strategies, content strategies, GraphQL, microservices vs
monoliths, customer journey management and omni-channel experiences.

Everything is built around one small, made-up outdoor-gear store,
**Trailhead Outfitters**, so you can compare approaches side by side.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # GraphQL monolith on :4000 + website on :3000
```

Then open http://localhost:3000.

| Command | What runs |
| --- | --- |
| `npm run dev` | Monolith API + website |
| `npm run dev:micro` | Four microservices + GraphQL gateway + website |
| `npm run dev:web` | Website only, using in-repo sample data |
| `docker compose up --build` | Microservices + gateway in containers (then `npm run dev:micro -w web`) |
| `npm run build && npm run start` | Production build of the website (sample data) |

## The plan

The work is split into four steps. Each step comes with a learning guide in
[`docs/learning`](docs/learning). New to JavaScript or TypeScript? Start with
[00 · Orientation](docs/learning/00-orientation.md).

1. **Web foundation** - Next.js + React, rendering strategies and content strategies.
   [Guide](docs/learning/01-web-foundation.md)
2. **Backend and GraphQL** - small services behind a GraphQL gateway, plus a monolith mode.
   [Guide](docs/learning/02-backend-graphql.md)
3. **Journey management** - event tracking and "next best action" personalization
4. **Omni-channel** - a React Native (Expo) app on the same backend, and a comparison write-up

## Repository layout

```
apps/web            Next.js website
packages/domain     Shared business types and sample data
packages/content    Headless-CMS stand-in: content model, entries and client
services/kit        Shared backend plumbing (context, logging, server start-up)
services/catalog    Products and stock         (GraphQL subgraph, :4001)
services/accounts   Customers and segments     (GraphQL subgraph, :4002)
services/orders     Orders                     (GraphQL subgraph, :4003)
services/content    CMS content over GraphQL   (GraphQL subgraph, :4004)
services/gateway    Apollo Federation gateway  (:4000, microservices mode)
services/monolith   All modules in one process (:4000, monolith mode)
docs/learning       Step-by-step learning guides
```
