"use server";
// "use server" marks every function in this file as a Server Action: a
// function that runs on the server but can be called from a form or button
// in the browser. Next.js creates the HTTP endpoint for you.

import { updateTag } from "next/cache";

export async function refreshProducts() {
  // Throw away everything cached with the "products" tag. The next request
  // waits for fresh data, so the person who clicked sees the change at once.
  updateTag("products");
}
