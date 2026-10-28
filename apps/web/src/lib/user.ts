// "Sign in" for the lab: pick a demo user and we remember their id in a
// cookie. Real sites use an identity provider (Auth0, Okta, Azure AD/Entra,
// Cognito) and a signed session cookie or token instead. The idea is the
// same: every request carries who the user is, and we pass it on to the API.
import "server-only";

import { cookies } from "next/headers";
import { users } from "@lab/domain";

export const USER_COOKIE = "lab-user";

export async function getUserId(): Promise<string | undefined> {
  const id = (await cookies()).get(USER_COOKIE)?.value;
  return users.some((u) => u.id === id) ? id : undefined;
}
