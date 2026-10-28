"use server";

import { cookies } from "next/headers";
import { users } from "@lab/domain";
import { USER_COOKIE } from "@/lib/user";

export async function signIn(formData: FormData) {
  const id = formData.get("userId");
  if (typeof id !== "string" || !users.some((u) => u.id === id)) return;
  (await cookies()).set(USER_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax" });
}

export async function signOut() {
  (await cookies()).delete(USER_COOKIE);
}
