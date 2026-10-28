"use server";

import { graphqlRequest } from "@/lib/graphql";
import { getVisitorIds } from "@/lib/visitor";

/** Delete everything the journey service knows about this visitor. */
export async function forgetMe() {
  const ids = await getVisitorIds();
  await graphqlRequest(`mutation Forget { forgetVisitor }`, {}, ids);
}
