"use server";

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function exitPreview() {
  (await draftMode()).disable();
  redirect("/content/campaign");
}
