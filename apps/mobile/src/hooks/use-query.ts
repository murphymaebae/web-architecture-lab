// A tiny data-fetching hook.
//
// On the website, Server Components fetched data on the server and sent
// finished HTML. A native app has no server of its own, so it fetches on the
// device and shows a spinner meanwhile: that's CLIENT-SIDE RENDERING, which
// you first met on the website's /rendering/client page.
//
// Libraries like TanStack Query or Apollo Client do this (and much more:
// caching, retries, offline). Writing a small one shows what they do for you.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { graphqlRequest } from '@/api/client';
import { useIdentity } from '@/api/identity';

export type QueryState<T> = {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** Fetch again (pull-to-refresh, after a purchase...). */
  refetch(): Promise<void>;
};

type Result<T> = { key: string; data?: T; error?: Error };

export function useQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: { skip?: boolean } = {},
): QueryState<T> {
  const { ready, userId, anonymousId } = useIdentity();
  const skip = !!options.skip || !ready;

  // Everything that should trigger a new request, as one string.
  const key = JSON.stringify([query, variables, userId, anonymousId]);
  const [result, setResult] = useState<Result<T>>();
  const [refreshing, setRefreshing] = useState(false);

  // Ignore answers to old requests (e.g. you switched filters quickly).
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (skip) return;
    const id = ++requestId.current;
    const [q, vars, user, anon] = JSON.parse(key) as [string, Record<string, unknown>, string?, string?];
    try {
      const data = await graphqlRequest<T>(q, vars, { userId: user ?? undefined, anonymousId: anon ?? undefined });
      if (id === requestId.current) setResult({ key, data });
    } catch (e) {
      // Keep showing the old data (if any) next to the error.
      if (id === requestId.current) setResult((prev) => ({ key, data: prev?.data, error: e as Error }));
    }
  }, [key, skip]);

  // Fetch when the inputs change...
  useEffect(() => {
    void load();
  }, [load]);

  // ...and again, quietly, whenever you come back to this screen, because
  // things may have changed elsewhere (another tab, or the website!).
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void load();
    }, [load]),
  );

  const refetch = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return {
    data: result?.data,
    error: result?.error,
    // Loading = we haven't got an answer for the current inputs yet.
    loading: !options.skip && (result?.key !== key || refreshing),
    refetch,
  };
}
