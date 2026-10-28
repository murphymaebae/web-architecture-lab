// Cached wrappers around the CMS client. Content changes rarely, so we cache
// it for a day and tag it "cms". When an editor publishes, the CMS calls our
// /api/revalidate webhook, which expires the "cms" tag (see that file).
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { contentSource } from "@lab/content";

export async function getCmsPage(slug: string, preview: boolean) {
  "use cache";
  cacheLife("days");
  cacheTag("cms", `cms:page:${slug}`);
  return contentSource.getPage(slug, { preview });
}

export async function getCmsArticles() {
  "use cache";
  cacheLife("days");
  cacheTag("cms", "cms:articles");
  return contentSource.listArticles();
}

export async function getCmsArticle(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("cms", `cms:article:${slug}`);
  return contentSource.getArticle(slug);
}

/** The only pages the preview link may redirect to (prevents "open redirect"
 * attacks where someone crafts a link that bounces visitors to a bad site). */
export const PREVIEWABLE_PATHS: Record<string, string> = {
  "autumn-campaign": "/content/campaign",
};
