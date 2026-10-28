// Which customer segment is the visitor in? In step 1 we keep it in a cookie
// that you can switch by hand. In step 3 the journey service decides it from
// what the visitor actually does.
import "server-only";

import { cookies } from "next/headers";
import type { Segment } from "@lab/domain";

export const SEGMENT_COOKIE = "lab-segment";
export const SEGMENTS: Segment[] = ["new-visitor", "weekend-hiker", "alpine-expert"];

export async function getSegment(): Promise<Segment> {
  const value = (await cookies()).get(SEGMENT_COOKIE)?.value;
  return SEGMENTS.includes(value as Segment) ? (value as Segment) : "new-visitor";
}
