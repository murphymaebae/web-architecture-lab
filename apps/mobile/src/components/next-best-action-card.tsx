// The journey service decides what this person should see next, and the
// app decides how it looks. Same decision as the website's banner, different
// presentation: that's "shared brain, separate face".

import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { appRouteFor } from '@/api/links';
import type { NextBestAction } from '@/api/queries';
import { Accent, Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function NextBestActionCard({ action }: { action: NextBestAction }) {
  const router = useRouter();

  const open = () => {
    if (!action.ctaHref) return;
    const route = appRouteFor(action.ctaHref);
    // No app screen for this link? Fall back to the website.
    if (route) router.push(route);
    else void WebBrowser.openBrowserAsync(new URL(action.ctaHref, 'http://localhost:3000').toString());
  };

  return (
    <View style={styles.card}>
      <ThemedText type="small" style={styles.kicker}>
        {action.journeyName.toUpperCase()}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.title}>
        {action.title}
      </ThemedText>
      <ThemedText style={styles.body}>{action.body}</ThemedText>
      {action.ctaLabel && action.ctaHref ? (
        <View style={styles.cta}>
          <Button label={action.ctaLabel} onPress={open} variant="outline" />
        </View>
      ) : null}
      <ThemedText type="small" style={styles.reason}>
        Why you see this: {action.reason}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: Spacing.four, gap: Spacing.two, borderWidth: 2, borderColor: Accent },
  kicker: { color: Accent, letterSpacing: 1 },
  title: { fontSize: 24, lineHeight: 30 },
  body: {},
  cta: { alignSelf: 'flex-start', marginTop: Spacing.one },
  reason: { opacity: 0.6, fontStyle: 'italic' },
});
