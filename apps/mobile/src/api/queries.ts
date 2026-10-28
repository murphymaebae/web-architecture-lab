// Every GraphQL operation the app uses, in one place.
//
// Notice these are the SAME queries the website sends (see
// apps/web/src/lib/*.ts). One API, many channels: that is the core of an
// omni-channel architecture. The only difference is the channel we pass.

import type { Product, Segment } from '@lab/domain';

// ---- Types for what each query returns -------------------------------------

export type ProductSummary = Pick<Product, 'id' | 'slug' | 'name' | 'price' | 'emoji' | 'tags' | 'stock'>;
export type ProductDetail = ProductSummary & Pick<Product, 'description' | 'category'>;

export type Cta = { label: string; href: string };

/** CMS blocks, as GraphQL returns them. `__typename` tells us which kind. */
export type MobileBlock =
  | { __typename: 'HeroBlock'; id: string; heading: string; subheading: string; cta: Cta | null }
  | { __typename: 'RichTextBlock'; id: string; paragraphs: string[] }
  | { __typename: 'FeatureGridBlock'; id: string; heading: string; items: { icon: string; title: string; body: string }[] }
  | { __typename: 'ProductRailBlock'; id: string; heading: string; tag: string }
  | { __typename: 'PromoBannerBlock'; id: string; text: string; tone: string };

export type NextBestAction = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  reason: string;
  journeyName: string;
  state: string;
};

export type InboxMessage = { id: string; channel: string; title: string; body: string; sentAt: string; journeyId: string };

export type Visitor = {
  id: string;
  userId: string | null;
  segment: Segment;
  eventCount: number;
  orderCount: number;
  interests: { tag: string; score: number }[];
  journeys: { journeyId: string; journeyName: string; stateLabel: string }[];
  events: { id: string; type: string; channel: string; at: string }[];
};

export type Me = {
  id: string;
  name: string;
  email: string;
  orders: { id: string; createdAt: string; total: number; lines: { quantity: number; product: { name: string; emoji: string } }[] }[];
};

// ---- Operations ------------------------------------------------------------

const PRODUCT_SUMMARY = 'id slug name price emoji tags stock';

/** Home tab: who is this person, what should we show them, and the campaign
 * page's blocks, all in one round trip. */
export const HOME_QUERY = `
  query MobileHome {
    visitor { segment }
    nextBestAction(channel: "mobile") { id title body ctaLabel ctaHref reason journeyName state }
  }
`;

/** Asked separately because it needs the segment from HOME_QUERY. The server
 * filters blocks for us (channel: "mobile"), so blocks marked web-only never
 * reach the phone. */
export const CAMPAIGN_QUERY = `
  query MobileCampaign($segment: String) {
    page(slug: "autumn-campaign", channel: "mobile", segment: $segment) {
      title
      blocks {
        __typename id
        ... on HeroBlock { heading subheading cta { label href } }
        ... on RichTextBlock { paragraphs }
        ... on FeatureGridBlock { heading items { icon title body } }
        ... on ProductRailBlock { heading tag }
        ... on PromoBannerBlock { text tone }
      }
    }
  }
`;

export const PRODUCTS_QUERY = `
  query MobileProducts($tag: String) {
    products(tag: $tag) { ${PRODUCT_SUMMARY} }
  }
`;

export const PRODUCT_QUERY = `
  query MobileProduct($slug: String!) {
    product(slug: $slug) { ${PRODUCT_SUMMARY} description category }
  }
`;

export const ARTICLE_QUERY = `
  query MobileArticle($slug: String!) {
    article(slug: $slug) { slug title summary author publishedAt tags body }
  }
`;

export const PLACE_ORDER = `
  mutation MobilePlaceOrder($productId: ID!) {
    placeOrder(productId: $productId, quantity: 1) { id total }
  }
`;

export const TRACK = `
  mutation MobileTrack($input: TrackEventInput!) {
    trackEvent(input: $input) { id }
  }
`;

/** The "push notifications" journeys have sent. A real app would receive
 * these from Apple/Google push services; we read the journey outbox. */
export const INBOX_QUERY = `
  query MobileInbox {
    visitor { outbox(channel: "push") { id channel title body sentAt journeyId } }
  }
`;

export const ME_QUERY = `
  query MobileMe {
    me {
      id name email
      orders { id createdAt total lines { quantity product { name emoji } } }
    }
    visitor {
      id userId segment eventCount orderCount
      interests { tag score }
      journeys { journeyId journeyName stateLabel }
      events(limit: 8) { id type channel at }
    }
  }
`;

export const USERS_QUERY = `
  query MobileUsers { users { id name segment } }
`;
