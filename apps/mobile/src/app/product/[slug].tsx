// PRODUCT SCREEN: pushed on top of the tabs when you tap a product.
// Shows live stock and lets a signed-in customer buy. The purchase goes
// through the same placeOrder mutation as the website, so the order,
// stock change and journey update are identical; only `channel` differs.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, graphqlRequest } from '@/api/client';
import { useIdentity } from '@/api/identity';
import { PLACE_ORDER, PRODUCT_QUERY, type ProductDetail } from '@/api/queries';
import { useTrackOnFocus } from '@/api/track';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { formatPrice } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-query';

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const identity = useIdentity();
  const { data, loading, error, refetch } = useQuery<{ product: ProductDetail | null }>(PRODUCT_QUERY, { slug });
  const product = data?.product;
  const [buying, setBuying] = useState(false);
  const [result, setResult] = useState<string>();

  useTrackOnFocus(product ? { type: 'product_view', productId: product.id, tags: product.tags, path: `product/${slug}` } : null);

  const buy = async () => {
    if (!product) return;
    if (!identity.userId) {
      router.push('/me');
      return;
    }
    setBuying(true);
    setResult(undefined);
    try {
      const { placeOrder } = await graphqlRequest<{ placeOrder: { id: string; total: number } }>(
        PLACE_ORDER,
        { productId: product.id },
        identity,
      );
      setResult(`Order ${placeOrder.id} placed (${formatPrice(placeOrder.total)}).`);
      await refetch(); // stock just went down
    } catch (e) {
      setResult(e instanceof ApiError && e.code === 'OUT_OF_STOCK' ? 'Sorry, that just sold out.' : (e as Error).message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <Screen loading={loading} error={error} onRefresh={refetch} inTabs={false}>
      <Stack.Screen options={{ title: product?.name ?? 'Product' }} />
      {data && !product ? <ThemedText>Product not found.</ThemedText> : null}
      {product ? (
        <>
          <ThemedText style={styles.emoji}>{product.emoji}</ThemedText>
          <ThemedText type="subtitle">{product.name}</ThemedText>
          <ThemedText type="smallBold">
            {formatPrice(product.price)} · {product.stock > 0 ? `${product.stock} in stock` : 'sold out'}
          </ThemedText>
          <ThemedText>{product.description}</ThemedText>
          <View style={styles.tags}>
            {product.tags.map((t) => (
              <ThemedText key={t} type="small" themeColor="textSecondary">
                #{t}
              </ThemedText>
            ))}
          </View>
          <Button
            label={identity.userId ? 'Buy now' : 'Sign in to buy'}
            onPress={() => void buy()}
            busy={buying}
            disabled={product.stock === 0}
          />
          {result ? (
            <Card>
              <ThemedText type="small">{result}</ThemedText>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 96, lineHeight: 112, textAlign: 'center' },
  tags: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
