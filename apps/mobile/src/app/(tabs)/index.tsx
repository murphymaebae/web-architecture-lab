// HOME TAB
//
// Two requests, one after the other:
//   1. Who is this, and what's their next best action? (journey service)
//   2. The campaign page for their segment, mobile blocks only. (content service)
// On the website, the server made these calls before sending HTML. Here the
// phone makes them, and shows a spinner until they're back.

import type { Segment } from '@lab/domain';
import { StyleSheet, View } from 'react-native';

import { CAMPAIGN_QUERY, HOME_QUERY, type MobileBlock, type NextBestAction } from '@/api/queries';
import { useTrackOnFocus } from '@/api/track';
import { MobileBlockRenderer } from '@/components/blocks/mobile-block-renderer';
import { NextBestActionCard } from '@/components/next-best-action-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-query';

type HomeData = { visitor: { segment: Segment } | null; nextBestAction: NextBestAction | null };
type CampaignData = { page: { title: string; blocks: MobileBlock[] } | null };

export default function HomeScreen() {
  const home = useQuery<HomeData>(HOME_QUERY);
  const segment = home.data?.visitor?.segment ?? 'new-visitor';
  const campaign = useQuery<CampaignData>(CAMPAIGN_QUERY, { segment }, { skip: !home.data });

  useTrackOnFocus({ type: 'screen_view', path: 'home' });
  useTrackOnFocus(campaign.data?.page ? { type: 'campaign_view', path: 'autumn-campaign' } : null);

  return (
    <Screen
      loading={home.loading || campaign.loading}
      error={home.error ?? campaign.error}
      onRefresh={() => {
        void home.refetch();
        void campaign.refetch();
      }}>
      {home.data ? (
        <>
          <View style={styles.header}>
            <ThemedText type="subtitle">Trailhead</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Segment: {segment} · channel: mobile
            </ThemedText>
          </View>
          {home.data.nextBestAction ? <NextBestActionCard action={home.data.nextBestAction} /> : null}
          {campaign.data?.page ? <MobileBlockRenderer blocks={campaign.data.page.blocks} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.half },
});
