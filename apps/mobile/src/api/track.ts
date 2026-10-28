// Tracking: tell the journey service what the customer did in the app.
// Exactly the same mutation as the website; the `x-channel: mobile` header
// (added in client.ts) is what makes these show up as mobile events.

import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { graphqlRequest, type RequestIdentity } from './client';
import { useIdentity } from './identity';
import { TRACK } from './queries';

export type TrackInput = { type: string; productId?: string; tags?: string[]; path?: string };

/** Fire and forget. Tracking must never break the app. */
export async function track(input: TrackInput, identity: RequestIdentity): Promise<void> {
  if (!identity.userId && !identity.anonymousId) return;
  try {
    await graphqlRequest(TRACK, { input }, identity);
  } catch (error) {
    console.warn('tracking failed:', (error as Error).message);
  }
}

/** Send an event each time a screen comes into view. This is the mobile
 * version of a "page view": `screen_view`. Pass `null` to skip (for example
 * while the data the event needs is still loading). */
export function useTrackOnFocus(input: TrackInput | null) {
  const { ready, userId, anonymousId } = useIdentity();
  // A string, so a new-but-identical object doesn't re-send the event.
  const key = input ? JSON.stringify(input) : null;

  useFocusEffect(
    useCallback(() => {
      if (!ready || !key) return;
      void track(JSON.parse(key) as TrackInput, { userId, anonymousId });
    }, [ready, key, userId, anonymousId]),
  );
}
