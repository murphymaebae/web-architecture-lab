"use server";

import { cookies } from "next/headers";
import { users } from "@lab/domain";
import { DATA_SOURCE } from "@/lib/data-source";
import { graphqlRequest } from "@/lib/graphql";
import { USER_COOKIE } from "@/lib/user";

export async function signIn(formData: FormData) {
  const id = formData.get("userId");
  if (typeof id !== "string" || !users.some((u) => u.id === id)) return;
  const store = await cookies();
  store.set(USER_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax" });

  // Tell the journey service who this anonymous visitor really is, so it can
  // merge their browsing history into the customer profile (step 3).
  if (DATA_SOURCE === "graphql") {
    const anonymousId = store.get("lab-anon")?.value;
    await graphqlRequest(
      `mutation SignedIn { trackEvent(input: { type: "signed_in" }) { id } }`,
      {},
      { userId: id, anonymousId },
    ).catch((error: Error) => console.warn("could not record sign-in:", error.message));
  }
}

export async function signOut() {
  (await cookies()).delete(USER_COOKIE);
}
