// The content itself, as an editor would have entered it in a CMS.
// Each page has a published version and (optionally) a draft version, which
// is how CMS "preview" works: editors see the draft, everyone else sees the
// published version.

import type { Article, Page } from "./model";

export const publishedPages: Page[] = [
  {
    slug: "autumn-campaign",
    title: "Autumn on the trail",
    description: "Our seasonal campaign page, built entirely from CMS blocks.",
    status: "published",
    updatedAt: "2026-10-01T09:00:00Z",
    blocks: [
      {
        id: "b1",
        type: "promoBanner",
        tone: "sale",
        text: "Free shipping on orders over $100 this month.",
      },
      {
        id: "b2",
        type: "hero",
        heading: "Autumn is for the hills",
        subheading: "Shorter days, cooler air, quieter trails. Here is what we are packing.",
        cta: { label: "Shop backpacking gear", href: "/products?tag=backpacking" },
      },
      {
        id: "b3",
        type: "promoBanner",
        tone: "info",
        audience: ["new-visitor"],
        text: "New here? Take 10% off your first order with code HELLO10.",
      },
      {
        id: "b4",
        type: "promoBanner",
        tone: "info",
        audience: ["alpine-expert"],
        text: "Winter mountaineering kit has landed. Early access for members.",
      },
      {
        id: "b5",
        type: "productRail",
        heading: "Lightweight picks",
        tag: "lightweight",
      },
      {
        id: "b6",
        type: "productRail",
        heading: "Ready for the high peaks",
        tag: "alpine",
        audience: ["alpine-expert"],
      },
      {
        id: "b7",
        type: "featureGrid",
        heading: "Why Trailhead",
        items: [
          { icon: "🔧", title: "Lifetime repairs", body: "Bring it back and we will fix it." },
          { icon: "🚚", title: "Fast delivery", body: "Two-day shipping across the country." },
          { icon: "🌲", title: "1% for trails", body: "We fund local trail maintenance crews." },
        ],
      },
      {
        id: "b8",
        type: "richText",
        channels: ["web"],
        paragraphs: [
          "This paragraph only appears on the website. On the mobile app the same page leaves it out, because long text works poorly on small screens.",
        ],
      },
      {
        id: "b9",
        type: "promoBanner",
        tone: "info",
        channels: ["mobile"],
        text: "App exclusive: scan any item in store to see reviews and stock.",
      },
    ],
  },
];

export const draftPages: Page[] = [
  {
    ...publishedPages[0],
    status: "draft",
    updatedAt: "2026-10-27T18:00:00Z",
    blocks: [
      {
        id: "b0",
        type: "promoBanner",
        tone: "sale",
        text: "DRAFT: Black Friday preview. 25% off everything, starting 27 November.",
      },
      ...publishedPages[0].blocks,
    ],
  },
];

export const articles: Article[] = [
  {
    slug: "layering-101",
    title: "Layering 101",
    summary: "How base, mid and shell layers work together to keep you comfortable.",
    author: "Trailhead Staff",
    publishedAt: "2026-09-02T08:00:00Z",
    tags: ["apparel", "guides"],
    body: [
      "Layering is the simplest way to stay comfortable outdoors. Instead of one thick jacket, you wear thin layers that each do one job.",
      "The base layer moves sweat away from your skin. The mid layer traps warm air. The shell keeps wind and rain out.",
      "Add and remove layers as you climb and stop, and you will rarely be too hot or too cold.",
    ],
  },
  {
    slug: "first-overnight",
    title: "Planning your first overnight trip",
    summary: "A checklist for your first night under the stars.",
    author: "Trailhead Staff",
    publishedAt: "2026-09-20T08:00:00Z",
    tags: ["backpacking", "guides"],
    body: [
      "Pick a short route with a known campsite, and check the forecast twice.",
      "Pack the ten essentials: navigation, light, sun protection, first aid, knife, fire, shelter, extra food, extra water and extra clothes.",
      "Tell someone where you are going and when you will be back.",
    ],
  },
  {
    slug: "boot-care",
    title: "Making your boots last",
    summary: "Clean, dry and re-proof: three habits that double the life of your boots.",
    author: "Trailhead Staff",
    publishedAt: "2026-10-10T08:00:00Z",
    tags: ["footwear", "care"],
    body: [
      "Brush off mud after every trip. Dried mud pulls moisture out of leather and makes it crack.",
      "Dry boots slowly at room temperature, never next to a fire or radiator.",
      "Re-apply a waterproofing treatment a few times a season.",
    ],
  },
];
