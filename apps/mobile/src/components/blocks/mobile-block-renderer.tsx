// Turns CMS blocks into native views.
//
// The website has its own renderer (apps/web/src/components/BlockRenderer)
// that turns the SAME blocks into HTML. This is "headless CMS" in practice:
// the CMS stores structured content, and each channel draws it its own way.
// Some differences on purpose:
//   - a product rail scrolls sideways (a phone habit) instead of a grid;
//   - links go through appRouteFor() so they open app screens.

import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { appRouteFor } from '@/api/links';
import { PRODUCTS_QUERY, type MobileBlock, type ProductSummary } from '@/api/queries';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-query';

export function MobileBlockRenderer({ blocks }: { blocks: MobileBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </>
  );
}

function BlockView({ block }: { block: MobileBlock }) {
  const router = useRouter();
  switch (block.__typename) {
    case 'HeroBlock': {
      const route = block.cta ? appRouteFor(block.cta.href) : null;
      return (
        <Card style={styles.hero}>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            {block.heading}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{block.subheading}</ThemedText>
          {block.cta && route ? (
            <View style={styles.cta}>
              <Button label={block.cta.label} onPress={() => router.push(route)} />
            </View>
          ) : null}
        </Card>
      );
    }
    case 'RichTextBlock':
      return (
        <View style={styles.stack}>
          {block.paragraphs.map((p, i) => (
            <ThemedText key={i}>{p}</ThemedText>
          ))}
        </View>
      );
    case 'FeatureGridBlock':
      return (
        <View style={styles.stack}>
          <ThemedText type="smallBold">{block.heading}</ThemedText>
          {block.items.map((item) => (
            <Card key={item.title} style={styles.feature}>
              <ThemedText style={styles.featureIcon}>{item.icon}</ThemedText>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.body}
                </ThemedText>
              </View>
            </Card>
          ))}
        </View>
      );
    case 'ProductRailBlock':
      return <ProductRail heading={block.heading} tag={block.tag} />;
    case 'PromoBannerBlock':
      return (
        <View style={[styles.banner, { backgroundColor: block.tone === 'sale' ? '#B42318' : '#2F7D4F' }]}>
          <ThemedText type="smallBold" style={styles.bannerText}>
            {block.text}
          </ThemedText>
        </View>
      );
    default:
      // A block type this app version doesn't know yet. On the web you'd
      // just deploy; apps in people's pockets can be months old, so they
      // must skip unknown content gracefully.
      return null;
  }
}

function ProductRail({ heading, tag }: { heading: string; tag: string }) {
  const { data } = useQuery<{ products: ProductSummary[] }>(PRODUCTS_QUERY, { tag });
  return (
    <View style={styles.stack}>
      <ThemedText type="smallBold">{heading}</ThemedText>
      <FlatList
        horizontal
        data={data?.products ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProductCard product={item} compact />}
        ItemSeparatorComponent={() => <View style={{ width: Spacing.two }} />}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: Spacing.four },
  heroTitle: { fontSize: 28, lineHeight: 34 },
  cta: { alignSelf: 'flex-start', marginTop: Spacing.two },
  stack: { gap: Spacing.two },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  featureIcon: { fontSize: 28, lineHeight: 34 },
  flex: { flex: 1 },
  banner: { borderRadius: 12, padding: Spacing.three },
  bannerText: { color: 'white', textAlign: 'center' },
});
