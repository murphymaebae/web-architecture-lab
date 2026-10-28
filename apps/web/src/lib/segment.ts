// Which customer segment is the visitor in?
//
// Step 1: you picked it by hand (a cookie).
// Step 3: the journey service works it out from what the visitor actually
// does. The hand-picked cookie still wins if set, so you can override it
// while experimenting ("Pretend to be...").
import "server-only";

import { cookies } from "next/headers";
import type { Segment } from "@lab/domain";
import { getVisitorProfile, journeysEnabled } from "./journey";

export const SEGMENT_COOKIE = "lab-segment";
export const SEGMENTS: Segment[] = ["new-visitor", "weekend-hiker", "alpine-expert"];

export type SegmentSource = "override" | "journey" | "default";

export async function getSegmentWithSource(): Promise<{ segment: Segment; source: SegmentSource }> {
  const value = (await cookies()).get(SEGMENT_COOKIE)?.value;
  if (SEGMENTS.includes(value as Segment)) return { segment: value as Segment, source: "override" };

  if (journeysEnabled) {
    try {
      const profile = await getVisitorProfile();
      if (profile) return { segment: profile.segment, source: "journey" };
    } catch {
      // backend down: fall through to the default
    }
  }
  return { segment: "new-visitor", source: "default" };
}

export async function getSegment(): Promise<Segment> {
  return (await getSegmentWithSource()).segment;
}
