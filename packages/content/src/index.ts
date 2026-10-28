// The CMS CLIENT. Apps never read `entries.ts` directly; they go through the
// `ContentSource` interface below. That is a common enterprise pattern
// called an "adapter": if the company later moves from one CMS vendor to
// another, only the adapter changes, not every page in every app.

import type { Channel, Segment } from "@lab/domain";
import { sleep } from "@lab/domain";
import { articles, draftPages, publishedPages } from "./entries";
import type { Article, Block, Page } from "./model";

export * from "./model";

export type GetPageOptions = {
  /** true = return the draft version if there is one (CMS "preview mode"). */
  preview?: boolean;
};

/** Anything that can supply content. A real implementation would call the
 * CMS vendor's API over HTTP. */
export interface ContentSource {
  getPage(slug: string, options?: GetPageOptions): Promise<Page | undefined>;
  listArticles(): Promise<Article[]>;
  getArticle(slug: string): Promise<Article | undefined>;
}

/** Reads the sample content that lives in this repo. The small delay mimics
 * the network round trip to a hosted CMS. */
export class LocalContentSource implements ContentSource {
  constructor(private latencyMs = 300) {}

  async getPage(slug: string, options: GetPageOptions = {}) {
    await sleep(this.latencyMs);
    if (options.preview) {
      const draft = draftPages.find((p) => p.slug === slug);
      if (draft) return draft;
    }
    return publishedPages.find((p) => p.slug === slug);
  }

  async listArticles() {
    await sleep(this.latencyMs);
    // Newest first
    return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  async getArticle(slug: string) {
    await sleep(this.latencyMs);
    return articles.find((a) => a.slug === slug);
  }
}

/** The one shared instance apps should use. */
export const contentSource: ContentSource = new LocalContentSource();

/** Keep only the blocks meant for this channel and this customer segment.
 * This is "content targeting": one page, many experiences. */
export function selectBlocks(
  blocks: Block[],
  context: { channel: Channel; segment?: Segment },
): Block[] {
  return blocks.filter((block) => {
    if (block.channels && !block.channels.includes(context.channel)) return false;
    if (block.audience) {
      if (!context.segment) return false;
      if (!block.audience.includes(context.segment)) return false;
    }
    return true;
  });
}
