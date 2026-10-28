// A second implementation of the CMS adapter (ContentSource) that reads
// content from the content service through GraphQL instead of from the repo.
// Because it fulfils the same interface, nothing else in the site changes.
import "server-only";

import type { Article, Block, ContentSource, Page } from "@lab/content";
import type { Channel, Segment } from "@lab/domain";
import { graphqlRequest } from "./graphql";

/** GraphQL fragments: "for each kind of block, also fetch these fields". */
const PAGE_QUERY = `
  query CmsPage($slug: String!, $preview: Boolean) {
    page(slug: $slug, preview: $preview) {
      slug title description status updatedAt
      blocks {
        __typename id channels audience
        ... on HeroBlock { heading subheading cta { label href } }
        ... on RichTextBlock { paragraphs }
        ... on FeatureGridBlock { heading items { icon title body } }
        ... on ProductRailBlock { heading tag }
        ... on PromoBannerBlock { text tone }
      }
    }
  }
`;

const ARTICLE_FIELDS = `slug title summary author publishedAt tags body`;

const blockTypes: Record<string, Block["type"]> = {
  HeroBlock: "hero",
  RichTextBlock: "richText",
  FeatureGridBlock: "featureGrid",
  ProductRailBlock: "productRail",
  PromoBannerBlock: "promoBanner",
};

type GraphQLBlock = Record<string, unknown> & {
  __typename: string;
  channels: string[];
  audience: string[];
};

/** Turn a GraphQL block back into our content model's shape. */
function toBlock({ __typename, channels, audience, ...fields }: GraphQLBlock): Block {
  return {
    ...fields,
    type: blockTypes[__typename],
    channels: channels.length ? (channels as Channel[]) : undefined,
    audience: audience.length ? (audience as Segment[]) : undefined,
  } as Block;
}

export class GraphQLContentSource implements ContentSource {
  async getPage(slug: string, options: { preview?: boolean } = {}) {
    const data = await graphqlRequest<{ page: (Omit<Page, "blocks"> & { blocks: GraphQLBlock[] }) | null }>(
      PAGE_QUERY,
      { slug, preview: options.preview ?? false },
    );
    if (!data.page) return undefined;
    return { ...data.page, status: data.page.status as Page["status"], blocks: data.page.blocks.map(toBlock) };
  }

  async listArticles() {
    const data = await graphqlRequest<{ articles: Article[] }>(`query Articles { articles { ${ARTICLE_FIELDS} } }`);
    return data.articles;
  }

  async getArticle(slug: string) {
    const data = await graphqlRequest<{ article: Article | null }>(
      `query Article($slug: String!) { article(slug: $slug) { ${ARTICLE_FIELDS} } }`,
      { slug },
    );
    return data.article ?? undefined;
  }
}
