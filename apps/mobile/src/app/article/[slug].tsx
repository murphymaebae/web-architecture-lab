// ARTICLE SCREEN: CMS articles, opened from journey links like
// "/content/articles/boot-care" (see src/api/links.ts).

import { Stack, useLocalSearchParams } from 'expo-router';

import { ARTICLE_QUERY } from '@/api/queries';
import { useTrackOnFocus } from '@/api/track';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useQuery } from '@/hooks/use-query';

type Article = { slug: string; title: string; summary: string; author: string; publishedAt: string; tags: string[]; body: string[] };

export default function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, loading, error, refetch } = useQuery<{ article: Article | null }>(ARTICLE_QUERY, { slug });
  const article = data?.article;
  useTrackOnFocus(article ? { type: 'article_view', tags: article.tags, path: `article/${slug}` } : null);

  return (
    <Screen loading={loading} error={error} onRefresh={refetch} inTabs={false}>
      <Stack.Screen options={{ title: article?.title ?? 'Article' }} />
      {data && !article ? <ThemedText>Article not found.</ThemedText> : null}
      {article ? (
        <>
          <ThemedText type="subtitle">{article.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {article.author} · {new Date(article.publishedAt).toLocaleDateString()}
          </ThemedText>
          {article.body.map((p, i) => (
            <ThemedText key={i}>{p}</ThemedText>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
