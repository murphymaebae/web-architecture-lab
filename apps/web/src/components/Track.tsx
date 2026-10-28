"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type TrackEvent = { type: string; productId?: string; tags?: string[] };

// In development, React runs effects twice on purpose (to catch bugs), which
// would record every event twice. Ignore an identical event sent within a
// second of the last one.
const recentlySent = new Map<string, number>();

/** Send one event to our collector. sendBeacon is made for analytics: the
 * browser delivers it in the background, even if the user leaves the page. */
function send(event: TrackEvent & { path: string }) {
  const body = JSON.stringify(event);
  const now = Date.now();
  if (now - (recentlySent.get(body) ?? 0) < 1000) return;
  recentlySent.set(body, now);
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
    fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  }
}

/** Drop <Track event={{ type: "product_view", productId }} /> on a page to
 * record that the visitor saw it. Renders nothing. */
export function Track({ event }: { event: TrackEvent }) {
  const path = usePathname();
  const key = JSON.stringify(event);
  useEffect(() => {
    send({ ...(JSON.parse(key) as TrackEvent), path });
  }, [key, path]);
  return null;
}

/** Records a page_view on every navigation. Lives in the root layout. */
export function PageViewTracker() {
  const path = usePathname();
  useEffect(() => {
    send({ type: "page_view", path });
  }, [path]);
  return null;
}
