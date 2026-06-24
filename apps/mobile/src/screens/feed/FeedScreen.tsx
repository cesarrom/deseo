import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useArticles, useProducts } from '@deseo/api-client';
import { useClient } from '../../providers/ClientProvider';
import { ContentStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

type FeedNavProp = NativeStackNavigationProp<ContentStackParamList>;

const FILTER_OPTIONS = ['All', 'Published', 'Drafts'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

export function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const { activeClientId } = useClient();
  const navigation = useNavigation<FeedNavProp>();

  const enabled = !!activeClientId;
  const { data: articles, isLoading, refetch, isFetching } = useArticles({}, { enabled });
  const { data: products } = useProducts({ enabled });

  const productMap = Object.fromEntries(
    (products ?? []).map((p) => [p.id, p]),
  );

  const filteredArticles = (articles ?? []).filter((a) => {
    if (activeFilter === 'Published') return a.status === 'published';
    if (activeFilter === 'Drafts') return a.status === 'draft';
    return true;
  });

  const statusVariant = (status: string): 'accent' | 'muted' | 'warning' | 'primary' => {
    if (status === 'published') return 'accent';
    if (status === 'draft') return 'muted';
    if (status === 'generating') return 'warning';
    return 'primary';
  };

  const handleArticlePress = (id: string, title: string) => {
    navigation.navigate('ArticleDetail', { articleId: id, articleTitle: title });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>FEED</Text>
            <Text style={styles.headerTitle}>Feed</Text>
            <Text style={styles.headerSubtitle}>Your published content</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>FEED</Text>
          <Text style={styles.headerTitle}>Feed</Text>
          <Text style={styles.headerSubtitle}>Your published content</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredArticles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="raised">
            <Text style={styles.emptyText}>No articles yet.</Text>
            <Text style={styles.emptySubText}>
              Create your first in the Create tab.
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const product = item.productId ? productMap[item.productId] : undefined;
          return (
            <TouchableOpacity
              style={styles.articleCard}
              onPress={() => handleArticlePress(item.id, item.title)}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.arrowIcon}>›</Text>
              </View>

              <View style={styles.cardMeta}>
                <Badge label={item.status} variant={statusVariant(item.status)} />
                {item.targetCms && (
                  <View style={styles.cmsChip}>
                    <Text style={styles.cmsChipText}>{item.targetCms}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {product && (
                  <Text style={styles.domainText}>{product.domain}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLabel: { ...typography.tiny, color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerSubtitle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
  },
  filterChipActive: { backgroundColor: colors.surfaceRaised },
  filterText: { ...typography.smallMedium, color: colors.textMuted },
  filterTextActive: { color: colors.text },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  articleCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  articleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 21,
    marginRight: 8,
  },
  arrowIcon: { fontSize: 22, color: colors.textMuted, lineHeight: 24 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  cmsChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.primaryDim,
    borderRadius: radius.full,
  },
  cmsChipText: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { ...typography.small, color: colors.textMuted },
  domainText: { ...typography.tiny, color: colors.textMuted },
  emptyCard: { padding: spacing.xl, alignItems: 'center', marginTop: spacing.lg },
  emptyText: { ...typography.bodyMedium, color: colors.text, marginBottom: 8 },
  emptySubText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
