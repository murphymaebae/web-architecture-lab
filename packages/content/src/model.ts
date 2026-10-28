// The CONTENT MODEL: the shapes that editors fill in inside a CMS.
//
// Enterprise headless CMSs (Contentful, Sanity, Adobe Experience Manager,
// Contentstack, Storyblok...) all work this way: instead of editing HTML,
// editors fill in structured "blocks" (also called components, slices or
// modules). Developers decide how each block looks on each channel.
//
// Because the content is just data (not HTML), the same page can be rendered
// by the website, the mobile app, a smart screen in a store, or an email.
// That is the foundation of omni-channel content.

import type { Channel, Segment } from "@lab/domain";

/** Fields every block can have, whatever its type. */
type BlockBase = {
  id: string;
  /** Only show this block on these channels. Missing = every channel. */
  channels?: Channel[];
  /** Only show this block to these customer segments. Missing = everyone. */
  audience?: Segment[];
};

export type HeroBlock = BlockBase & {
  type: "hero";
  heading: string;
  subheading: string;
  cta?: { label: string; href: string };
};

export type RichTextBlock = BlockBase & {
  type: "richText";
  paragraphs: string[];
};

export type FeatureGridBlock = BlockBase & {
  type: "featureGrid";
  heading: string;
  items: { icon: string; title: string; body: string }[];
};

/** Shows products. Editors pick a tag instead of hard-coding products, so the
 * rail stays up to date as the catalog changes. */
export type ProductRailBlock = BlockBase & {
  type: "productRail";
  heading: string;
  tag: string;
};

export type PromoBannerBlock = BlockBase & {
  type: "promoBanner";
  text: string;
  tone: "info" | "sale";
};

/** A "discriminated union": a Block is exactly one of these shapes, and the
 * `type` field tells you which. TypeScript uses it to know which other fields
 * exist (e.g. only a hero has `heading` + `subheading` + `cta`). */
export type Block =
  | HeroBlock
  | RichTextBlock
  | FeatureGridBlock
  | ProductRailBlock
  | PromoBannerBlock;

export type Page = {
  slug: string;
  title: string;
  description: string;
  status: "published" | "draft";
  updatedAt: string;
  blocks: Block[];
};

export type Article = {
  slug: string;
  title: string;
  summary: string;
  author: string;
  publishedAt: string;
  tags: string[];
  body: string[];
};
