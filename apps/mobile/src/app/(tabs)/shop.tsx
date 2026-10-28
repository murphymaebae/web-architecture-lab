// SHOP TAB: the product list, with tag filters.
// The filter lives in the route (/shop?tag=alpine), like the website's
// /products?tag=alpine, so links from journeys and the CMS can open it
// already filtered.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PRODUCTS_QUERY, type ProductSummary } from '@/api/queries';
import { useTrackOnFocus } from '@/api/track';
import { Accent } from '@/components/button';
import { ProductCard } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';

const TAGS = ['backpacking', 'day-hike', 'lightweight', 'alpine', 'winter'];

export default function ShopScreen() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data, loading, error, refetch } = useQuery<{ products: ProductSummary[] }>(PRODUCTS_QUERY, { tag: tag ?? null });

  useTrackOnFocus({ type: 'screen_view', path: tag ? `shop?tag=${tag}` : 'shop', tags: tag ? [tag] : undefined });

  return (
    <Screen loading={loading} error={error} onRefresh={refetch}>
      <ThemedText type="subtitle">Shop</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[undefined, ...TAGS].map((t) => {
          const active = t === tag;
          return (
            <Pressable
              key={t ?? 'all'}
              onPress={() => router.setParams({ tag: t })}
              style={[styles.chip, { backgroundColor: active ? Accent : theme.backgroundElement }]}>
              <ThemedText type="small" style={active && styles.chipActive}>
                {t ?? 'All'}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.list}>
        {data?.products.map((p) => <ProductCard key={p.id} product={p} />)}
        {data && data.products.length === 0 ? <ThemedText themeColor="textSecondary">Nothing with that tag.</ThemedText> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: Spacing.two },
  chip: { borderRadius: 999, paddingVertical: Spacing.one + 2, paddingHorizontal: Spacing.three },
  chipActive: { color: 'white' },
  list: { gap: Spacing.two },
});
