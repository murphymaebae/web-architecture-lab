"use server";

import { cookies } from "next/headers";
import type { Segment } from "@lab/domain";
import { SEGMENT_COOKIE, SEGMENTS } from "@/lib/segment";

/** Called by the segment switcher form. Saves the chosen segment in a cookie,
 * and Next.js re-renders the current page with the new value. Choosing
 * "auto" removes the override so the journey service decides again. */
export async function setSegment(formData: FormData) {
  const value = formData.get("segment");
  const store = await cookies();
  if (value === "auto") {
    store.delete(SEGMENT_COOKIE);
    return;
  }
  if (typeof value !== "string" || !SEGMENTS.includes(value as Segment)) return;
  store.set(SEGMENT_COOKIE, value, { path: "/", maxAge: 60 * 60 * 24 * 30 });
}
