// The frame every screen sits in: a scrolling page with pull-to-refresh,
// plus friendly loading and error states.

import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children?: ReactNode;
  loading?: boolean;
  error?: Error;
  onRefresh?: () => void;
  /** Tabs leave room for the tab bar; pushed screens (product, article) don't need it. */
  inTabs?: boolean;
};

export function Screen({ children, loading, error, onRefresh, inTabs = true }: Props) {
  const theme = useTheme();
  const showSpinner = loading && !children;
  return (
    <SafeAreaView edges={inTabs ? ['top'] : []} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // In a browser the tab bar floats at the top instead of the bottom.
          { paddingBottom: (inTabs ? BottomTabInset : 0) + Spacing.five, paddingTop: inTabs && Platform.OS === 'web' ? Spacing.six + Spacing.two : Spacing.three },
        ]}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!loading && !showSpinner} onRefresh={onRefresh} /> : undefined}>
        <View style={styles.inner}>
          {error ? (
            <View style={[styles.error, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Something went wrong</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {error.message}
              </ThemedText>
            </View>
          ) : null}
          {showSpinner ? <ActivityIndicator style={styles.spinner} /> : children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  error: { padding: Spacing.three, borderRadius: 12, gap: Spacing.one },
  spinner: { marginTop: Spacing.six },
});
