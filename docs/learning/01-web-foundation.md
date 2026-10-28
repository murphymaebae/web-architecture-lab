# 01 · Web foundation: rendering and content strategies

**Goal:** understand *when* and *where* web pages are built, and how content
flows from editors to screens. Everything here lives in `apps/web`,
`packages/domain` and `packages/content`.

## Part A: Rendering strategies (`/rendering`)

"Rendering" is turning data into HTML. Six demos show the same product list
made six different ways. Each has a yellow badge with the time its HTML was
produced. Reload and watch it.

| Demo | File | The key line | What you should see |
| --- | --- | --- | --- |
| Static (SSG) | `app/rendering/static/page.tsx` | `"use cache"` + `cacheLife("max")` | Time never changes until you rebuild |
| Cached (ISR) | `app/rendering/cached/page.tsx` | `cacheLife({ revalidate: 20 })`, `cacheTag("products")` | Time moves on at most every ~20 s; the button refreshes it instantly |
| Dynamic (SSR) | `app/rendering/dynamic/page.tsx` | `await connection()` | New time on every reload, ~0.6 s wait |
| Streaming | `app/rendering/streaming/page.tsx` | Three `<Suspense>` boundaries | Sections pop in after ~0.6 s, 1.5 s and 3 s |
| Client (CSR) | `app/rendering/client/ClientProducts.tsx` | `"use client"` + `useEffect` + `fetch` | Skeleton first, then data; filter without page reload |
| Partial (PPR) | `app/rendering/partial/page.tsx` | Static + cached + dynamic on one page | Greeting time changes, grid time doesn't |

> Use `npm run build && npm run start` to see real caching. Development mode
> (`npm run dev`) re-renders more often so your edits show up immediately.

### The mental model (Next.js 16 "Cache Components")

Next.js 16 asks you to label each part of a page:

1. **Plain code** with no data or only predictable data: prerendered at build time.
2. **`"use cache"`** on a function or component: the result is cached and can
   be part of the prerendered page. `cacheLife(...)` says for how long,
   `cacheTag(...)` gives it a name so you can expire it on demand.
3. **Request-time code** (reads cookies, headers, the URL's `?query`, or calls
   `connection()`): must sit inside `<Suspense>`. Its fallback goes in the
   prerendered page and the real content streams in per visitor.

That combination is **Partial Prerendering**: a static shell served instantly
(ideally from a CDN), with personal "holes" filled by the server. Older
versions of Next.js, and most other frameworks, make this choice per page
instead of per component.

### How this maps to enterprise stacks

- Traditional server-rendered platforms (Java/JSP, .NET, PHP, AEM, Sitecore)
  are **SSR**, usually with a CDN or a cache like Varnish in front.
- Single-page apps (Angular, older React, Vue) are **CSR** talking to REST or
  GraphQL APIs.
- Jamstack sites (Gatsby, Hugo) are **SSG**.
- Modern React frameworks (Next.js, Remix/React Router, Astro islands) mix all of
  the above per component. The skill is choosing per piece of the page.

## Part B: Content strategies (`/content`)

### The content model (`packages/content/src/model.ts`)

Editors do not write HTML. They fill in **structured blocks**: hero, product
rail, promo banner, feature grid, rich text. Each block is plain data. This is
how every major headless CMS works (Contentful, Sanity, Contentstack, AEM
content fragments, Storyblok).

### The CMS adapter (`packages/content/src/index.ts`)

Apps talk to content through a `ContentSource` interface, not a vendor SDK.
Swapping CMS vendors means writing one new class, not touching every page.
`LocalContentSource` reads from `entries.ts` and adds a small delay to feel
like a network call.

### Page builder + targeting (`/content/campaign`)

- `BlockRenderer.tsx` maps each block type to a React component. The `never`
  check in its `switch` means TypeScript complains if a new block type is
  added to the model but not to the renderer.
- Blocks can be limited to an `audience` (customer segments) and/or
  `channels`. `selectBlocks()` applies those rules. It lives in the shared
  content package, so web and mobile follow exactly the same rules. Use the
  "Pretend to be" buttons to switch segment (stored in a cookie by a Server
  Action in `app/actions/segment.ts`).

### Preview / draft mode

1. A CMS is configured with a preview URL:
   `/api/draft?secret=lab-preview-secret&slug=autumn-campaign`.
2. `app/api/draft/route.ts` checks the secret, turns on Next.js Draft Mode
   (a cookie), and redirects to the page. It only redirects to known paths,
   which prevents "open redirect" abuse.
3. With Draft Mode on, every cache is skipped for that browser only, and the
   page asks the CMS for the draft version (a Black Friday banner appears).
4. "Exit preview" is a Server Action that clears the cookie.

### Publishing: webhooks and on-demand revalidation

Content is cached for a day (`cacheLife("days")`) and tagged `cms`. When an
editor publishes, the CMS calls:

```bash
curl -X POST "http://localhost:3000/api/revalidate?secret=lab-revalidate-secret&tag=cms"
```

`revalidateTag("cms", "max")` marks everything tagged `cms` as stale. The next
visitor still gets the old page instantly while a fresh one builds in the
background. No redeploy needed.

### Articles (`/content/articles`)

`generateStaticParams()` lists every article at build time so each gets its
own prerendered HTML file. Run `npm run build` and look at the route table:
each article is listed as a separate static page.

## Part C: The product catalog (`/products`)

- `/products?tag=alpine`: the filter lives in the URL so it can be shared and
  indexed. Reading the URL query is request-time, so results stream in behind
  a skeleton while the page frame is static. The cached function takes `tag`
  as an argument, so each filter gets its own cache entry.
- `/products/[slug]`: product details are cached and prerendered for every
  product; **live stock** is a dynamic hole. This split (stable product
  information vs volatile price/stock/availability) is one of the most common
  patterns in enterprise commerce.

## Things to try

1. In `app/rendering/cached/page.tsx`, change `revalidate: 20` to `5`, rebuild,
   and watch the badge.
2. Add a new block type (for example `"quote"`) to `packages/content/src/model.ts`.
   Run `npm run typecheck --workspace web` and see TypeScript point at
   `BlockRenderer.tsx`. Then add the component.
3. Remove the `<Suspense>` around `<DynamicProducts />` in the dynamic demo and
   run `npm run build`. Read the error: Next.js refuses to build a page that
   would block on request data without a fallback.
4. Add a fourth segment to `packages/domain/src/types.ts` and give one campaign
   block an `audience` for it.

## Where this goes next

In **step 2**, `apps/web/src/lib/catalog.ts` stops reading sample data
directly and calls a GraphQL API backed by separate services, so you can see
how the website's data layer changes when the backend becomes distributed.
