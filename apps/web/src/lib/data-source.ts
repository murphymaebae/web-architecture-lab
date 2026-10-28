// Where does the website get its data?
//
//   "local"   - straight from the sample data in packages/ (no backend needed).
//               Used by `npm run dev:web` and production builds.
//   "graphql" - from the GraphQL API on port 4000 (the monolith or the
//               gateway in front of the microservices). Used by `npm run dev`
//               and `npm run dev:micro`.
//
// The rest of the site doesn't know which one is active: pages call
// lib/catalog.ts and lib/cms.ts, which pick the right source. Swapping a data
// source without touching the pages is the "adapter" idea again.

export type DataSource = "local" | "graphql";
export type Topology = "none" | "monolith" | "microservices";

export const DATA_SOURCE: DataSource = process.env.LAB_DATA_SOURCE === "graphql" ? "graphql" : "local";

export const TOPOLOGY: Topology =
  DATA_SOURCE === "local"
    ? "none"
    : process.env.LAB_TOPOLOGY === "microservices"
      ? "microservices"
      : "monolith";

export const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:4000/";
