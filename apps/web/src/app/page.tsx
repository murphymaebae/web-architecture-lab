import { Suspense } from "react";
import Link from "next/link";
import { NextBestAction } from "@/components/NextBestAction";
import { PageHeading } from "@/components/PageHeading";

const experiments = [
  {
    href: "/playground",
    title: "Architecture playground",
    body: "Drag boxes, wire up an architecture, push traffic through it and break things. Watch latency, errors and cost react live.",
  },
  {
    href: "/rendering",
    title: "Rendering strategies",
    body: "The same product list rendered six ways: static, cached (ISR), dynamic (SSR), streaming, client-side (CSR) and partial prerendering.",
  },
  {
    href: "/content",
    title: "Content strategies",
    body: "A headless-CMS-style content model: page-builder blocks, editorial articles, audience targeting and draft previews.",
  },
  {
    href: "/products",
    title: "Product catalog",
    body: "A typical commerce pattern: static product pages generated at build time, with live stock streamed in per request.",
  },
  {
    href: "/architecture",
    title: "Monolith vs microservices",
    body: "The same GraphQL backend running as one process or as several services behind a federation gateway.",
  },
  {
    href: "/account",
    title: "Account",
    body: "Sign in as a demo customer and see one GraphQL query answered by several services.",
  },
  {
    href: "/journey",
    title: "Journey inspector",
    body: "Event tracking, identity resolution, segments and customer journeys that decide what you see next.",
  },
];

export default function Home() {
  return (
    <>
      <PageHeading title="Web Architecture Lab">
        <p>
          A working sandbox for learning how enterprise web platforms are built. Every page
          explains what it is doing, so open the <em>How this works</em> boxes as you go.
        </p>
      </PageHeading>

      {/* Personalised by the journey service (step 3). Empty without the backend. */}
      <Suspense fallback={null}>
        <NextBestAction />
      </Suspense>

      <section className="grid gap-4 sm:grid-cols-3">
        {experiments.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="rounded-xl border border-zinc-200 p-5 transition hover:border-emerald-500 dark:border-zinc-800"
          >
            <h2 className="font-semibold">{e.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{e.body}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
