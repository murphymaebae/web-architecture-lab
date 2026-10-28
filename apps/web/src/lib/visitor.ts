// Who is visiting? An anonymous id (always, set by proxy.ts) and a user id
// (only after "signing in" on the Account page).
import "server-only";

import { cookies } from "next/headers";
import { getUserId } from "./user";

export type VisitorIds = { userId?: string; anonymousId?: string };

export async function getVisitorIds(): Promise<VisitorIds> {
  const [userId, store] = await Promise.all([getUserId(), cookies()]);
  return { userId, anonymousId: store.get("lab-anon")?.value };
}
