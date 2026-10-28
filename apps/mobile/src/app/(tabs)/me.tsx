// ME TAB: sign in as a demo customer, then see what the backend knows.
//
// Try this omni-channel test: sign in as Bo here AND on the website
// (http://localhost:3000/account). Do things on one, pull to refresh on the
// other. Same customer, same profile, events from both channels.

import { StyleSheet, View } from 'react-native';

import { useIdentity } from '@/api/identity';
import { ME_QUERY, USERS_QUERY, type Me, type Visitor } from '@/api/queries';
import { useTrackOnFocus } from '@/api/track';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { formatPrice } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-query';

const channelIcon: Record<string, string> = { web: '💻', mobile: '📱', email: '✉️', push: '🔔', store: '🏬' };

export default function MeScreen() {
  const { userId, anonymousId, signIn, signOut } = useIdentity();
  const me = useQuery<{ me: Me | null; visitor: Visitor | null }>(ME_QUERY);
  const users = useQuery<{ users: { id: string; name: string; segment: string }[] }>(USERS_QUERY, {}, { skip: !!userId });
  useTrackOnFocus({ type: 'screen_view', path: 'me' });

  const visitor = me.data?.visitor;

  return (
    <Screen loading={me.loading} error={me.error ?? users.error} onRefresh={me.refetch}>
      <ThemedText type="subtitle">Me</ThemedText>

      {userId && me.data?.me ? (
        <Card>
          <ThemedText type="smallBold">Signed in as {me.data.me.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {me.data.me.email}
          </ThemedText>
          <Button label="Sign out" variant="outline" onPress={() => void signOut()} />
        </Card>
      ) : (
        <Card>
          <ThemedText type="smallBold">You’re browsing anonymously</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Device id: {anonymousId}. Sign in to join this device’s history to a customer.
          </ThemedText>
          {users.data?.users.map((u) => (
            <Button key={u.id} label={`Sign in as ${u.name}`} variant="outline" onPress={() => void signIn(u.id)} />
          ))}
        </Card>
      )}

      {visitor ? (
        <Card>
          <ThemedText type="smallBold">What the journey service knows</ThemedText>
          <ThemedText type="small">
            Segment: {visitor.segment} · {visitor.eventCount} events · {visitor.orderCount} orders
          </ThemedText>
          {visitor.interests.length ? (
            <ThemedText type="small">
              Interests: {visitor.interests.slice(0, 5).map((i) => `${i.tag} (${i.score})`).join(', ')}
            </ThemedText>
          ) : null}
          {visitor.journeys.map((j) => (
            <ThemedText key={j.journeyId} type="small">
              🧭 {j.journeyName}: <ThemedText type="smallBold">{j.stateLabel}</ThemedText>
            </ThemedText>
          ))}
          <ThemedText type="smallBold" style={styles.gap}>
            Recent events (all channels)
          </ThemedText>
          {visitor.events.map((e) => (
            <ThemedText key={e.id} type="small" themeColor="textSecondary">
              {channelIcon[e.channel] ?? '•'} {e.type} · {new Date(e.at).toLocaleTimeString()}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {me.data?.me ? (
        <Card>
          <ThemedText type="smallBold">Orders</ThemedText>
          {me.data.me.orders.length === 0 ? <ThemedText type="small">No orders yet.</ThemedText> : null}
          {me.data.me.orders.map((o) => (
            <View key={o.id} style={styles.order}>
              <ThemedText type="small">
                {o.lines.map((l) => `${l.product.emoji} ${l.product.name}`).join(', ')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {o.id} · {formatPrice(o.total)} · {new Date(o.createdAt).toLocaleDateString()}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: Spacing.two },
  order: { gap: Spacing.half },
});
