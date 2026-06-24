import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProducts, useSuggestions, useArticles } from '@deseo/api-client';
import { useClient } from '../../providers/ClientProvider';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

const TABS = ['Products', 'Suggestions', 'Published'];

export function ContentScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { activeClientId } = useClient();
  const enabled = !!activeClientId;

  const { data: products, isLoading: productsLoading } = useProducts({ enabled });
  const { data: suggestions, isLoading: suggestionsLoading } = useSuggestions({}, { enabled });
  const { data: articles, isLoading: articlesLoading } = useArticles({}, { enabled });

  const published = articles?.filter((a) => a.status === 'published') ?? [];
  const pending = suggestions?.filter((s) => s.status === 'pending') ?? [];

  const isLoading =
    (activeTab === 0 && productsLoading) ||
    (activeTab === 1 && suggestionsLoading) ||
    (activeTab === 2 && articlesLoading);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>CONTENT</Text>
          <Text style={styles.headerTitle}>Overview</Text>
        </View>
        <View style={styles.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === i && styles.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {activeTab === 0 && (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{products?.length ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Tracked</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.accent }]}>
                    {products?.length ?? 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Active</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {pending.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Suggestions</Text>
                </View>
              </View>

              {products?.map((p) => (
                <Card key={p.id} style={styles.productCard} variant="raised">
                  <View style={styles.productTop}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productTitle} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.productUrl}>{p.domain}</Text>
                    </View>
                    <Badge label={p.type} variant="primary" />
                  </View>
                </Card>
              ))}

              {(!products || products.length === 0) && (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No products yet.</Text>
                  <Text style={styles.emptySubText}>Connect your first site from the web dashboard.</Text>
                </Card>
              )}
            </>
          )}

          {activeTab === 1 && (
            <>
              <Text style={styles.sectionNote}>
                {pending.length} improvements identified by AI analysis
              </Text>
              {pending.map((s) => (
                <Card key={s.id} style={styles.suggestionCard} variant="raised">
                  <View style={styles.suggestionHeader}>
                    <Badge label={s.type} variant="warning" />
                  </View>
                  <Text style={styles.suggestionTitle}>{s.title}</Text>
                  <Text style={styles.suggestionDesc}>{s.description}</Text>
                </Card>
              ))}
              {pending.length === 0 && (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No pending suggestions.</Text>
                </Card>
              )}
            </>
          )}

          {activeTab === 2 && (
            <>
              {published.map((a) => (
                <Card key={a.id} style={styles.publishedCard} variant="raised">
                  <Text style={styles.publishedTitle}>{a.title}</Text>
                  <View style={styles.publishedMeta}>
                    <Text style={styles.publishedDate}>
                      {new Date(a.createdAt).toLocaleDateString()}
                    </Text>
                    {a.targetCms && (
                      <View style={styles.channelChip}>
                        <Text style={styles.channelChipText}>{a.targetCms}</Text>
                      </View>
                    )}
                  </View>
                  <Badge label={a.status} variant="accent" />
                </Card>
              ))}
              {published.length === 0 && (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No published articles yet.</Text>
                </Card>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerLabel: { ...typography.tiny, color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.surfaceRaised },
  tabText: { ...typography.smallMedium, color: colors.textMuted },
  tabTextActive: { color: colors.text },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', padding: 16 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  summaryLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 3, textAlign: 'center' },
  productCard: { marginBottom: 10, padding: 14 },
  productTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productInfo: { flex: 1, marginRight: 10 },
  productTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: 3 },
  productUrl: { ...typography.tiny, color: colors.textMuted },
  sectionNote: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
  suggestionCard: { marginBottom: 10, padding: 14 },
  suggestionHeader: { marginBottom: 10 },
  suggestionTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: 6 },
  suggestionDesc: { ...typography.small, color: colors.textSecondary, lineHeight: 20 },
  publishedCard: { marginBottom: 10, padding: 14 },
  publishedTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: 8 },
  publishedMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  publishedDate: { ...typography.small, color: colors.textMuted },
  channelChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.primaryDim,
    borderRadius: radius.full,
  },
  channelChipText: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
  emptyCard: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.bodyMedium, color: colors.text, marginBottom: 8 },
  emptySubText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
