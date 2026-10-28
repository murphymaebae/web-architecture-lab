// EVENT COLLECTOR. The browser sends small JSON events here
// (navigator.sendBeacon) and we forward them to the journey service with the
// visitor's ids from their cookies.
//
// Why not let the browser call the GraphQL API directly? Collecting through
// your own domain ("first-party" tracking) is more reliable (ad blockers,
// browser privacy rules) and lets the server add ids the browser can't read,
// like our httpOnly cookies. Enterprise tag managers offer the same idea as
// "server-side tagging".

import { trackEvent } from "@/lib/journey";

const ALLOWED = new Set(["page_view", "product_view", "campaign_view", "article_view"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    type?: string;
    productId?: string;
    tags?: string[];
    path?: string;
  } | null;

  if (!body?.type || !ALLOWED.has(body.type)) {
    return Response.json({ ok: false, error: "Unknown event type" }, { status: 400 });
  }

  await trackEvent({
    type: body.type,
    productId: typeof body.productId === "string" ? body.productId : undefined,
    tags: Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string").slice(0, 10) : undefined,
    path: typeof body.path === "string" ? body.path.slice(0, 200) : undefined,
  });
  return new Response(null, { status: 204 });
}
