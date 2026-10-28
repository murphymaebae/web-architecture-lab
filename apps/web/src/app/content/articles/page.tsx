import Link from "next/link";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { getCmsArticles } from "@/lib/cms";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Articles" };

export default async function ArticlesPage() {
  // getCmsArticles is cached ("use cache" inside it), so this await finishes
  // during the build and the list is part of the static page.
  const articles = await getCmsArticles();

  return (
    <>
      <PageHeading title="Editorial articles">
        <p>Guides written by editors in the CMS.</p>
      </PageHeading>
      <Explainer>
        <p>
          The list and each article are statically generated: <code>generateStaticParams</code> in{" "}
          <code>[slug]/page.tsx</code> tells Next.js which article URLs exist, and it builds an
          HTML file for each one at build time.
        </p>
        <p>
          The content is cached with the tag <code>cms</code>. When an editor publishes, the CMS
          calls <code>POST /api/revalidate?tag=cms</code> and the pages rebuild in the background,
          with no redeploy. This is the standard pattern for content-heavy enterprise sites.
        </p>
      </Explainer>
      <ul className="flex flex-col gap-4">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/content/articles/${a.slug}`} className="block rounded-xl border border-zinc-200 p-4 hover:border-emerald-500 dark:border-zinc-800">
              <h2 className="font-semibold">{a.title}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.summary}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {a.author} · {formatDate(a.publishedAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
