// CONTENT subgraph: puts the headless-CMS content behind the same GraphQL API
// as everything else. This is what lets the website AND the mobile app read
// one source of content, which is the heart of omni-channel content.

import { contentSource, selectBlocks, type Block } from "@lab/content";
import type { Channel, Segment } from "@lab/domain";
import { gql, type LabContext, type ServiceModule } from "@lab/service-kit";

// Map our content model's `type` field to GraphQL type names.
const typeNames: Record<Block["type"], string> = {
  hero: "HeroBlock",
  richText: "RichTextBlock",
  featureGrid: "FeatureGridBlock",
  productRail: "ProductRailBlock",
  promoBanner: "PromoBannerBlock",
};

export const contentModule: ServiceModule = {
  typeDefs: gql`
    """
    Every CMS block has these fields. An INTERFACE lets clients ask for the
    shared fields on any block, plus type-specific fields with
    "... on HeroBlock { heading }".
    """
    interface Block {
      id: ID!
      "Channels this block is limited to. Empty = all channels."
      channels: [String!]!
      "Customer segments this block is limited to. Empty = everyone."
      audience: [String!]!
    }

    type Cta {
      label: String!
      href: String!
    }

    type HeroBlock implements Block {
      id: ID!
      channels: [String!]!
      audience: [String!]!
      heading: String!
      subheading: String!
      cta: Cta
    }

    type RichTextBlock implements Block {
      id: ID!
      channels: [String!]!
      audience: [String!]!
      paragraphs: [String!]!
    }

    type FeatureItem {
      icon: String!
      title: String!
      body: String!
    }

    type FeatureGridBlock implements Block {
      id: ID!
      channels: [String!]!
      audience: [String!]!
      heading: String!
      items: [FeatureItem!]!
    }

    type ProductRailBlock implements Block {
      id: ID!
      channels: [String!]!
      audience: [String!]!
      heading: String!
      "Clients fetch products with this tag from the catalog."
      tag: String!
    }

    type PromoBannerBlock implements Block {
      id: ID!
      channels: [String!]!
      audience: [String!]!
      text: String!
      tone: String!
    }

    type Page {
      slug: String!
      title: String!
      description: String!
      status: String!
      updatedAt: String!
      blocks: [Block!]!
    }

    type Article {
      slug: String!
      title: String!
      summary: String!
      author: String!
      publishedAt: String!
      tags: [String!]!
      body: [String!]!
    }

    extend type Query {
      """
      A CMS page. Pass a channel and/or segment to get only the blocks meant
      for them (server-side targeting). Leave both out to get every block and
      filter in the client.
      """
      page(slug: String!, channel: String, segment: String, preview: Boolean = false): Page
      articles: [Article!]!
      article(slug: String!): Article
    }
  `,
  resolvers: {
    Query: {
      page: async (
        _parent,
        args: { slug: string; channel?: string | null; segment?: string | null; preview?: boolean },
        _context: LabContext,
      ) => {
        const page = await contentSource.getPage(args.slug, { preview: args.preview ?? false });
        if (!page) return null;
        if (!args.channel && !args.segment) return page;
        return {
          ...page,
          blocks: selectBlocks(page.blocks, {
            channel: (args.channel ?? "web") as Channel,
            segment: (args.segment ?? undefined) as Segment | undefined,
          }),
        };
      },
      articles: () => contentSource.listArticles(),
      article: (_parent, args: { slug: string }) => contentSource.getArticle(args.slug),
    },
    Block: {
      // Tells GraphQL which concrete type a block is.
      __resolveType: (block: Block) => typeNames[block.type],
    },
    // Each block type turns "missing" channels/audience into empty lists.
    ...Object.fromEntries(
      Object.values(typeNames).map((typeName) => [
        typeName,
        {
          channels: (block: Block) => block.channels ?? [],
          audience: (block: Block) => block.audience ?? [],
        },
      ]),
    ),
  },
};
