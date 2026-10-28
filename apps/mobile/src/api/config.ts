// Where is the GraphQL API?
//
// On the website, "localhost" means your computer. On a phone, "localhost"
// means the PHONE, so the app must use your computer's network address
// instead. When you run `npx expo start`, Expo knows that address (it's how
// the phone downloads the app's JavaScript), so we borrow it.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;

function guessApiUrl(): string {
  // 1. An explicit setting always wins: EXPO_PUBLIC_GRAPHQL_URL=http://192.168.1.20:4000/
  const fromEnv = process.env.EXPO_PUBLIC_GRAPHQL_URL;
  if (fromEnv) return fromEnv;

  // 2. In the browser, the API is on the same machine.
  if (Platform.OS === 'web') return `http://localhost:${API_PORT}/`;

  // 3. On a phone or simulator, use the dev server's host, e.g. "192.168.1.20:8081".
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}/`;

  // 4. Android emulators reach the computer at this special address.
  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}/` : `http://localhost:${API_PORT}/`;
}

export const GRAPHQL_URL = guessApiUrl();
