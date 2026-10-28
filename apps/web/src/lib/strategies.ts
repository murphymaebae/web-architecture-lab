// One place that describes every rendering demo, used by the overview page
// and the "next / previous" links.

export type Strategy = {
  slug: string;
  name: string;
  shortName: string;
  when: string; // when is the HTML made?
  where: string; // where is it made?
  goodFor: string;
  watchOut: string;
};

export const strategies: Strategy[] = [
  {
    slug: "static",
    name: "Static generation",
    shortName: "SSG",
    when: "Once, at build time",
    where: "Server (during `next build`)",
    goodFor: "Marketing pages, docs, anything the same for everyone that rarely changes.",
    watchOut: "Content is frozen until the next build or revalidation.",
  },
  {
    slug: "cached",
    name: "Cached with revalidation",
    shortName: "ISR",
    when: "At build, then refreshed in the background on a timer or on demand",
    where: "Server",
    goodFor: "Catalogs, CMS pages, news: mostly static but updated during the day.",
    watchOut: "Someone may see slightly stale data until the refresh finishes.",
  },
  {
    slug: "dynamic",
    name: "Dynamic server rendering",
    shortName: "SSR",
    when: "On every request",
    where: "Server",
    goodFor: "Personal or real-time data: account pages, live prices, search results.",
    watchOut: "Every visit costs server time, and the page waits on the slowest data.",
  },
  {
    slug: "streaming",
    name: "Streaming",
    shortName: "Streaming SSR",
    when: "On every request, sent in pieces as each piece is ready",
    where: "Server",
    goodFor: "Pages that mix fast and slow data. Users see something immediately.",
    watchOut: "Layout can jump as pieces arrive unless skeletons match the final size.",
  },
  {
    slug: "client",
    name: "Client-side rendering",
    shortName: "CSR",
    when: "After the page loads, in the browser",
    where: "Browser",
    goodFor: "Highly interactive widgets, dashboards behind a login, data that changes while you watch.",
    watchOut: "Slower first view, more JavaScript to download, and search engines see less.",
  },
  {
    slug: "partial",
    name: "Partial prerendering",
    shortName: "PPR",
    when: "Static shell at build time, personal holes filled per request",
    where: "Server (shell from the CDN, holes from the server)",
    goodFor: "Most real enterprise pages: product pages, home pages, campaign pages with a personal touch.",
    watchOut: "Needs hosting that supports streaming; you must think about which parts are personal.",
  },
];

export function strategyNeighbours(slug: string) {
  const i = strategies.findIndex((s) => s.slug === slug);
  return { previous: strategies[i - 1], next: strategies[i + 1], current: strategies[i] };
}
