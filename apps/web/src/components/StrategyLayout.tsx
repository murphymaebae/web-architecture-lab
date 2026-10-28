import Link from "next/link";
import type { ReactNode } from "react";
import { strategyNeighbours } from "@/lib/strategies";
import { PageHeading } from "./PageHeading";

/** Shared frame for every rendering demo: title, summary, the demo itself,
 * and links to the previous and next demo. */
export function StrategyLayout({ slug, children }: { slug: string; children: ReactNode }) {
  const { current, previous, next } = strategyNeighbours(slug);
  return (
    <>
      <PageHeading title={`${current.name} (${current.shortName})`}>
        <p>
          <strong>HTML is made:</strong> {current.when}. <strong>Where:</strong> {current.where}.
        </p>
      </PageHeading>
      {children}
      <nav className="flex justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        {previous ? <Link href={`/rendering/${previous.slug}`}>← {previous.name}</Link> : <span />}
        {next ? <Link href={`/rendering/${next.slug}`}>{next.name} →</Link> : <Link href="/rendering">Back to overview</Link>}
      </nav>
    </>
  );
}
