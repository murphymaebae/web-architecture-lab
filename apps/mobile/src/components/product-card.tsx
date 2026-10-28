import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ProductSummary } from '@/api/queries';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const formatPrice = (n: number) => `$${n.toFixed(2)}`;

/** One product in a list. Tapping it opens the product screen. */
export function ProductCard({ product, compact }: { product: ProductSummary; compact?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/product/${product.slug}`)}
      style={[styles.card, compact && styles.compact, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.emoji}>{product.emoji}</ThemedText>
        <View style={styles.text}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {product.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatPrice(product.price)} · {product.stock > 0 ? `${product.stock} in stock` : 'sold out'}
          </ThemedText>
        </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 16 },
  compact: { width: 240 },
  emoji: { fontSize: 36, lineHeight: 44 },
  text: { flex: 1, gap: Spacing.half },
});
