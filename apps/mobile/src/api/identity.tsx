// WHO IS USING THE APP?
//
// Like the website, the app gives each install a random anonymous id, and
// remembers the demo user once someone signs in. Both are saved on the
// device with AsyncStorage (simple key-value storage; localStorage on web).
//
// A React CONTEXT makes these values available to every screen without
// passing them down by hand.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const ANON_KEY = 'lab-anon';
const USER_KEY = 'lab-user';

export type Identity = {
  /** False until the saved ids have been loaded from storage. */
  ready: boolean;
  anonymousId?: string;
  userId?: string;
  signIn(userId: string): Promise<void>;
  signOut(): Promise<void>;
};

const IdentityContext = createContext<Identity | null>(null);

/** A random id like "3f9c0a1e-...". Good enough for a demo. */
function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [anonymousId, setAnonymousId] = useState<string>();
  const [userId, setUserId] = useState<string>();

  // Load (or create) the ids once, when the app starts.
  useEffect(() => {
    (async () => {
      let anon = await AsyncStorage.getItem(ANON_KEY);
      if (!anon) {
        anon = randomId();
        await AsyncStorage.setItem(ANON_KEY, anon);
      }
      setAnonymousId(anon);
      setUserId((await AsyncStorage.getItem(USER_KEY)) ?? undefined);
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (id: string) => {
    await AsyncStorage.setItem(USER_KEY, id);
    setUserId(id);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUserId(undefined);
  }, []);

  const value = useMemo(
    () => ({ ready, anonymousId, userId, signIn, signOut }),
    [ready, anonymousId, userId, signIn, signOut],
  );
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): Identity {
  const value = useContext(IdentityContext);
  if (!value) throw new Error('useIdentity must be used inside <IdentityProvider>');
  return value;
}
