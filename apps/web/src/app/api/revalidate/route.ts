// PUBLISH WEBHOOK. Headless CMSs can call a URL whenever content is
// published. We use it to expire cached content right away, instead of
// waiting for the cache lifetime to run out.
//
// Try it from a terminal while the app is running:
//   curl -X POST "http://localhost:3000/api/revalidate?secret=lab-revalidate-secret&tag=cms"

import { revalidateTag } from "next/cache";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? "lab-revalidate-secret";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== REVALIDATE_SECRET) {
    return Response.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  const tag = searchParams.get("tag");
  if (!tag) {
    return Response.json({ ok: false, error: "Missing ?tag=" }, { status: 400 });
  }

  // "max" = keep serving the old copy while the new one is built in the
  // background (stale-while-revalidate), so no visitor waits.
  revalidateTag(tag, "max");
  return Response.json({ ok: true, revalidated: tag });
}
