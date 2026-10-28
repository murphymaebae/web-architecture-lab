// A tiny GraphQL client for Server Components and Server Actions.
//
// GraphQL is just HTTP: you POST a JSON body with a `query` string (and
// optional `variables`) and get back `{ data, errors }`. Big client libraries
// (Apollo Client, urql, Relay) add caching and React hooks on top, which
// browser-heavy apps need. On the server, Next.js already caches for us
// ("use cache"), so a plain fetch is enough.
import "server-only";

import type { Channel } from "@lab/domain";
import { GRAPHQL_URL } from "./data-source";

export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    /** e.g. "OUT_OF_STOCK", "UNAUTHENTICATED". See services/kit businessError(). */
    public code: string,
  ) {
    super(message);
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
};

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: { userId?: string; channel?: Channel } = {},
): Promise<T> {
  // The operation name ("query Products ...") shows up in the service logs.
  const operationName = /^\s*(?:query|mutation)\s+(\w+)/.exec(query)?.[1];

  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-channel": options.channel ?? "web",
        ...(options.userId ? { "x-user-id": options.userId } : {}),
      },
      body: JSON.stringify({ query, variables, operationName }),
    });
  } catch {
    throw new GraphQLRequestError(
      `Could not reach the GraphQL API at ${GRAPHQL_URL}. Is the backend running? Try \`npm run dev\` from the repo root.`,
      "API_UNREACHABLE",
    );
  }

  const body = (await res.json()) as GraphQLResponse<T>;
  const error = body.errors?.[0];
  if (error) throw new GraphQLRequestError(error.message, error.extensions?.code ?? "GRAPHQL_ERROR");
  return body.data as T;
}
