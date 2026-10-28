// INBOX TAB: push notifications sent by journeys.
//
// Real push goes: journey service -> Apple (APNs) / Google (FCM) -> phone,
// and needs a real device, developer accounts and permission prompts. To
// keep the lab runnable anywhere, journeys write messages to an OUTBOX and
// this screen reads it. The decision logic (WHEN to send, WHAT to say) is
// the interesting part, and it's identical either way.

import { StyleSheet, View } from 'react-native';

import { INBOX_QUERY, type InboxMessage } from '@/api/queries';
import { useTrackOnFocus } from '@/api/track';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-query';

export default function InboxScreen() {
  const { data, loading, error, refetch } = useQuery<{ visitor: { outbox: InboxMessage[] } | null }>(INBOX_QUERY);
  useTrackOnFocus({ type: 'screen_view', path: 'inbox' });
  const messages = data?.visitor?.outbox ?? [];

  return (
    <Screen loading={loading} error={error} onRefresh={refetch}>
      <ThemedText type="subtitle">Inbox</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Push notifications your journeys have sent. Pull down to check for new ones.
      </ThemedText>
      {data && messages.length === 0 ? (
        <Card>
          <ThemedText type="smallBold">No notifications yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Browse a few alpine products (in the app or on the website, once you’re signed in as the same person) and a journey
            will send you one.
          </ThemedText>
        </Card>
      ) : null}
      <View style={styles.list}>
        {messages.map((m) => (
          <Card key={m.id}>
            <ThemedText type="smallBold">🔔 {m.title}</ThemedText>
            <ThemedText type="small">{m.body}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {new Date(m.sentAt).toLocaleString()} · from journey “{m.journeyId}”
            </ThemedText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
});
