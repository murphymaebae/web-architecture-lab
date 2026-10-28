# 00 · Orientation: the tools and how to find your way around

This lab assumes no previous JavaScript or TypeScript experience. This page
explains the pieces you will meet, in the order you will meet them.

## The building blocks

| Thing | What it is | Rough equivalent elsewhere |
| --- | --- | --- |
| **JavaScript (JS)** | The language browsers run. Also runs on servers. | - |
| **TypeScript (TS)** | JavaScript plus *types*: labels that describe the shape of data, checked before the code runs. Files end in `.ts` / `.tsx`. | Java/C# type checking |
| **Node.js** | A program that runs JavaScript outside the browser (servers, tools). | The JVM / .NET runtime |
| **npm** | Node's package manager. Downloads libraries listed in `package.json` into `node_modules/`. | Maven, NuGet, pip |
| **React** | A library for building user interfaces out of *components*: functions that return what should appear on screen. | - |
| **JSX / TSX** | The HTML-like syntax inside components, e.g. `<h1>{title}</h1>`. | Templates (JSP, Razor) |
| **Next.js** | A framework around React that adds routing, server rendering, caching, APIs and a build system. | Spring Boot / ASP.NET for React |
| **Tailwind CSS** | Styling with small utility class names, e.g. `className="p-4 text-sm"`. | Bootstrap utilities |

## How this repo is organised

This is a **monorepo**: several apps and libraries in one Git repository,
managed together with npm *workspaces* (see the root `package.json`).

```
apps/
  web/                Next.js website (step 1)
packages/
  domain/             Shared business types + sample data (products, users, orders)
  content/            A stand-in for a headless CMS: content model, entries, client
docs/learning/        These guides
```

Step 2 adds `services/` (the GraphQL backend). Step 4 adds `apps/mobile`.

Inside `apps/web/src`:

```
app/                  Every folder here is a URL. app/products/page.tsx -> /products
  layout.tsx          The frame around every page (header, footer)
  page.tsx            The home page
  rendering/          The rendering-strategy demos
  content/            The content-strategy demos
  products/           The product catalog
  api/                HTTP endpoints that return JSON (route.ts files)
components/           Reusable pieces of UI
lib/                  Non-UI code: data access, helpers
```

## Running it

You need Node.js 20 or newer (`node -v` to check). Then, from the repo root:

```bash
npm install          # download all libraries (first time only)
npm run dev          # start the API and the website in development mode
```

Open http://localhost:3000. Edit any file under `apps/web/src` and the browser
updates by itself.

To see caching behave as it would in production:

```bash
npm run build        # build an optimised production version
npm run start        # serve it
```

## Reading the code

- Start at a page file, e.g. `apps/web/src/app/rendering/static/page.tsx`, and
  follow the imports.
- Comments explain *why*, not just *what*. Most files open with a comment
  describing their role.
- Hover over anything in VS Code to see its type. Cmd/Ctrl-click to jump to
  where it is defined. This is the single most useful habit for learning TS.

## A 60-second TypeScript primer

```ts
// A type describes the shape of an object
type Product = { id: string; name: string; price: number };

// A function with typed inputs and output
function total(items: Product[]): number {
  return items.reduce((sum, p) => sum + p.price, 0);
}

// `async` functions return a Promise; `await` waits for it
async function load(): Promise<Product[]> {
  const res = await fetch("/api/products");
  return res.json();
}

// A union type: one of a fixed set of values
type Channel = "web" | "mobile";
```

## A 60-second React primer

```tsx
// A component is a function that returns JSX
function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}!</p>;
}

// Use it like an HTML tag
<Greeting name="Murphy" />
```

In Next.js, components are **Server Components** by default: they run on the
server and send HTML, with no JavaScript shipped for them. Add
`"use client"` at the top of a file to make a **Client Component** that runs in
the browser and can respond to clicks and typing. The rendering demos show both.
