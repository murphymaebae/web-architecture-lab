import Link from "next/link";
import { notFound } from "next/navigation";
import { getCmsArticle, getCmsArticles } from "@/lib/cms";
import { formatDate } from "@/lib/format";

// Folders in [square brackets] are DYNAMIC ROUTES: [slug] matches any value,
// e.g. /content/articles/layering-101 gives { slug: "layering-101" }.

/** Runs at build time: "these are the articles that exist, prerender them". */
export async function generateStaticParams() {
  const articles = await getCmsArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/content/articles/[slug]">) {
  const { slug } = await params;
  const article = await getCmsArticle(slug);
  return { title: article?.title ?? "Article not found", description: article?.summary };
}

export default async function ArticlePage({ params }: PageProps<"/content/articles/[slug]">) {
  const { slug } = await params;
  const article = await getCmsArticle(slug);
  if (!article) notFound();

  return (
    <article className="flex max-w-2xl flex-col gap-4">
      <Link href="/content/articles" className="text-sm text-zinc-500">
        ← All articles
      </Link>
      <h1 className="text-3xl font-semibold">{article.title}</h1>
      <p className="text-sm text-zinc-500">
        {article.author} · {formatDate(article.publishedAt)} · {article.tags.join(", ")}
      </p>
      {article.body.map((paragraph, i) => (
        <p key={i} className="leading-7">
          {paragraph}
        </p>
      ))}
    </article>
  );
}
