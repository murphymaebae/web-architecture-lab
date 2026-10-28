// DEEP LINKS: turning a website path into an app screen.
//
// The CMS and the journey service only know website paths like
// "/products?tag=alpine". That is common in real companies: content is
// authored once, for the web. Each channel then needs a small translation
// table. This is one of the most typical omni-channel "glue" problems.

import type { Href } from 'expo-router';

export function appRouteFor(webPath: string): Href | null {
  const url = new URL(webPath, 'https://trailhead.example');
  const parts = url.pathname.split('/').filter(Boolean);

  // /products?tag=alpine  ->  Shop tab, filtered
  if (parts[0] === 'products' && parts.length === 1) {
    const tag = url.searchParams.get('tag');
    return (tag ? `/shop?tag=${encodeURIComponent(tag)}` : '/shop') as Href;
  }
  // /products/summit-2-tent  ->  product screen
  if (parts[0] === 'products' && parts[1]) return `/product/${parts[1]}` as Href;
  // /content/articles/boot-care  ->  article screen
  if (parts[0] === 'content' && parts[1] === 'articles' && parts[2]) return `/article/${parts[2]}` as Href;
  // Anything else has no app screen (yet). Callers can open the website instead.
  return null;
}
