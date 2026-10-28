// The ROOT LAYOUT wraps every screen in the app, like apps/web/src/app/layout.tsx
// does for the website. Expo Router uses the same idea as Next.js: files in
// src/app become screens, and _layout files wrap the screens beside them.
//
// Structure:
//   Stack (screens slide in from the side)
//   ├── (tabs)            the four bottom tabs
//   ├── product/[slug]    pushed on top of the tabs
//   └── article/[slug]

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { IdentityProvider } from '@/api/identity';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <IdentityProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Trailhead' }} />
          <Stack.Screen name="product/[slug]" options={{ title: 'Product', headerBackTitle: 'Back' }} />
          <Stack.Screen name="article/[slug]" options={{ title: 'Article', headerBackTitle: 'Back' }} />
        </Stack>
      </IdentityProvider>
    </ThemeProvider>
  );
}
