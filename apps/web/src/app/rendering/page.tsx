import Link from "next/link";
import type { Metadata } from "next";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { strategies } from "@/lib/strategies";

export const metadata: Metadata = { title: "Rendering strategies" };

export default function RenderingIndex() {
  return (
    <>
      <PageHeading title="Rendering strategies">
        <p>
          &quot;Rendering&quot; means turning data into HTML. The big questions are{" "}
          <strong>when</strong> that happens (build time, request time, or later in the browser)
          and <strong>where</strong> (server or browser). Each demo below shows the same product
          list, rendered a different way.
        </p>
      </PageHeading>

      <Explainer title="How to use these demos" open>
        <p>
          Each demo shows a yellow badge with the time its HTML was made. Reload the page and
          watch the time. If it stays the same, the HTML was reused from a cache. If it changes,
          it was made fresh for you.
        </p>
        <p>
          Timestamps only behave &quot;for real&quot; in production mode (<code>npm run build</code> then{" "}
          <code>npm start</code>). In development mode (<code>npm run dev</code>) Next.js
          re-renders more often to make editing easier.
        </p>
      </Explainer>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="py-2 pr-4">Strategy</th>
              <th className="py-2 pr-4">HTML is made</th>
              <th className="py-2 pr-4">Good for</th>
              <th className="py-2">Watch out for</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((s) => (
              <tr key={s.slug} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                <td className="py-3 pr-4">
                  <Link href={`/rendering/${s.slug}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    {s.name}
                  </Link>
                  <div className="text-xs text-zinc-500">{s.shortName}</div>
                </td>
                <td className="py-3 pr-4">{s.when}</td>
                <td className="py-3 pr-4">{s.goodFor}</td>
                <td className="py-3">{s.watchOut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
