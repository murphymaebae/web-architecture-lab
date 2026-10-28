// The public "front door" of the @lab/domain package. Other parts of the repo
// import from "@lab/domain" and get whatever is exported here.

export * from "./types";
export * from "./data";

/** Wait for `ms` milliseconds. Used to simulate slow databases and APIs so the
 * differences between rendering strategies are easy to see. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
