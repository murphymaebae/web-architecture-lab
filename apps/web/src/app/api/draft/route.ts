// PREVIEW ENTRY POINT. A headless CMS is configured with a "preview URL" like
//   /api/draft?secret=...&slug=autumn-campaign
// When an editor clicks "Preview", the CMS opens that URL. We check the
// shared secret, switch on Draft Mode (a cookie), and send them to the page.

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { PREVIEWABLE_PATHS } from "@/lib/cms";

// In a real project the secret lives in an environment variable that only the
// server and the CMS know. The fallback keeps the lab working with no setup.
const PREVIEW_SECRET = process.env.PREVIEW_SECRET ?? "lab-preview-secret";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") ?? "";

  if (secret !== PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  const path = PREVIEWABLE_PATHS[slug];
  if (!path) {
    return new Response("Unknown content slug", { status: 404 });
  }

  (await draftMode()).enable();
  redirect(path);
}
