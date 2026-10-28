// The app's GraphQL client. Same idea as apps/web/src/lib/graphql.ts, with
// two differences that are typical for mobile:
//
// 1. It runs ON THE DEVICE, so it talks to the API directly over the
//    network (the website's server-side code did that for the browser).
// 2. Every request says `x-channel: mobile`, so the backend (especially the
//    journey service) knows which channel the customer is using.

import { GRAPHQL_URL } from './config';

export type RequestIdentity = { userId?: string; anonymousId?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  identity: RequestIdentity = {},
): Promise<T> {
  const operationName = /^\s*(?:query|mutation)\s+(\w+)/.exec(query)?.[1];
  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-channel': 'mobile',
        ...(identity.userId ? { 'x-user-id': identity.userId } : {}),
        ...(identity.anonymousId ? { 'x-anonymous-id': identity.anonymousId } : {}),
      },
      body: JSON.stringify({ query, variables, operationName }),
    });
  } catch {
    throw new ApiError(
      `Can't reach the API at ${GRAPHQL_URL}. Start the backend with "npm run dev" from the repo root, and make sure your phone is on the same Wi-Fi as your computer.`,
      'API_UNREACHABLE',
    );
  }
  const body = (await res.json()) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
  const error = body.errors?.[0];
  if (error) throw new ApiError(error.message, error.extensions?.code ?? 'GRAPHQL_ERROR');
  return body.data as T;
}
