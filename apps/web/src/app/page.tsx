import Link from "next/link";
import { PageHeading } from "@/components/PageHeading";

const experiments = [
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
