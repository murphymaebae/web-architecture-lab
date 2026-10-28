import Link from "next/link";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";

export const metadata = { title: "Content strategies" };

const demos = [
  {
    href: "/content/campaign",
    title: "Page builder + targeting",
    body: "A campaign page assembled from CMS blocks. Some blocks only show for certain customer segments or channels. Includes draft preview.",
  },
  {
    href: "/content/articles",
    title: "Editorial articles",
    body: "Guides written in the CMS, statically generated per article and refreshed when an editor publishes.",
  },
];

export default function ContentIndex() {
  return (
    <>
      <PageHeading title="Content strategies">
        <p>
          How content gets from the people who write it to every screen a customer uses.
        </p>
      </PageHeading>

      <Explainer title="Three ways enterprises manage content" open>
        <p>
          <strong>1. Coupled CMS</strong> (WordPress, Drupal, classic Adobe Experience Manager,
          Sitecore): the CMS stores the content <em>and</em> renders the HTML. Simple, but the
          content is stuck in web pages, so the mobile app needs its own copy.
        </p>
        <p>
          <strong>2. Headless CMS</strong> (Contentful, Sanity, Contentstack, Storyblok, Strapi):
          the CMS only stores structured content and serves it over an API. Each channel (this
          Next.js site, a mobile app, in-store screens) renders it its own way. This lab uses this
          approach, with <code>packages/content</code> standing in for the CMS.
        </p>
        <p>
          <strong>3. Composable / &quot;DXP&quot;</strong>: headless content plus separate best-of-breed
          services for search, personalization, commerce and so on, stitched together by an API
          layer (often GraphQL). That is where steps 2 and 3 of this lab go.
        </p>
      </Explainer>

      <section className="grid gap-4 sm:grid-cols-2">
        {demos.map((d) => (
          <Link key={d.href} href={d.href} className="rounded-xl border border-zinc-200 p-5 hover:border-emerald-500 dark:border-zinc-800">
            <h2 className="font-semibold">{d.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{d.body}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
