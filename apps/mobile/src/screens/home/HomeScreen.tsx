import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useProducts, useArticles, useJobs, useSuggestions } from '@deseo/api-client';
import { useClient } from '../../providers/ClientProvider';
import { colors, spacing, radius, typography } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const QUICK_TOPICS = [
  'Trending in tech', 'Your top pages', 'Low-hanging fruit', 'Competitor gap',
];

interface HomeScreenProps {
  onNavigateCreate: () => void;
}

export function HomeScreen({ onNavigateCreate }: HomeScreenProps) {
  const { activeClient, activeClientId } = useClient();

  const { data: products, isLoading: productsLoading } = useProducts({ enabled: !!activeClientId });
  const { data: articles } = useArticles({}, { enabled: !!activeClientId });
  const { data: jobs } = useJobs({}, { enabled: !!activeClientId });
  const { data: suggestions } = useSuggestions({}, { enabled: !!activeClientId });

  const publishedArticles = articles?.filter((a) => a.status === 'published') ?? [];
  const runningJobs = jobs?.filter((j) => j.status === 'running') ?? [];
  const pendingSuggestions = suggestions?.filter((s) => s.status === 'pending') ?? [];

  const stats = [
    { label: 'Products', value: String(products?.length ?? '—') },
    { label: 'Published', value: String(publishedArticles.length ?? '—') },
    { label: 'Suggestions', value: String(pendingSuggestions.length ?? '—') },
  ];

  // Build recent activity from jobs + articles + suggestions
  const recentActivity = [
    ...(publishedArticles.slice(0, 2).map((a) => ({
      id: a.id,
      title: a.title,
      time: new Date(a.createdAt).toLocaleDateString(),
      badge: 'accent' as const,
      badgeLabel: 'Published',
    }))),
    ...(pendingSuggestions.slice(0, 2).map((s) => ({
      id: s.id,
      title: s.title,
      time: '',
      badge: 'warning' as const,
      badgeLabel: 'Suggestion',
    }))),
    ...(runningJobs.slice(0, 1).map((j) => ({
      id: j.id,
      title: j.type.replace('_', ' '),
      time: new Date(j.createdAt).toLocaleTimeString(),
      badge: 'primary' as const,
      badgeLabel: 'Running',
    }))),
  ].slice(0, 4);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.clientName}>{activeClient?.name ?? 'No client'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {activeClient?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {productsLoading ? (
            <Card style={styles.loadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
            </Card>
          ) : (
            stats.map((s) => (
              <Card key={s.label} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Card>
            ))
          )}
        </View>

        {/* Create CTA */}
        <TouchableOpacity onPress={onNavigateCreate} activeOpacity={0.85}>
          <LinearGradient
            colors={['#1e1040', '#0d0d0d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createBanner}
          >
            <View style={styles.createBannerContent}>
              <View>
                <Text style={styles.createBannerLabel}>AI CONTENT STUDIO</Text>
                <Text style={styles.createBannerTitle}>What should we{'\n'}write today?</Text>
              </View>
              <View style={styles.createBannerCta}>
                <Text style={styles.createBannerCtaText}>Create →</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickTopics}
            >
              {QUICK_TOPICS.map((t) => (
                <TouchableOpacity key={t} style={styles.quickTopicChip} onPress={onNavigateCreate}>
                  <Text style={styles.quickTopicText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {recentActivity.map((item) => (
                <Card key={item.id} style={styles.activityCard} variant="raised">
                  <View style={styles.activityContent}>
                    <View style={styles.activityMain}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                      {item.time ? <Text style={styles.activityTime}>{item.time}</Text> : null}
                    </View>
                    <Badge label={item.badgeLabel} variant={item.badge} />
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* No client state */}
        {!activeClientId && !productsLoading && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No client selected</Text>
            <Text style={styles.emptySubtitle}>
              Go to Settings to select or create a client to see your dashboard.
            </Text>
          </Card>
        )}

        {/* Weekly Jobs Summary */}
        {jobs && jobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Background Jobs</Text>
            <Card style={styles.weekCard} variant="raised">
              <View style={styles.weekStats}>
                <View style={styles.weekStat}>
                  <Text style={styles.weekStatValue}>{jobs.length}</Text>
                  <Text style={styles.weekStatLabel}>Total jobs</Text>
                </View>
                <View style={styles.weekDivider} />
                <View style={styles.weekStat}>
                  <Text style={styles.weekStatValue}>
                    {jobs.filter((j) => j.status === 'completed').length}
                  </Text>
                  <Text style={styles.weekStatLabel}>Completed</Text>
                </View>
                <View style={styles.weekDivider} />
                <View style={styles.weekStat}>
                  <Text style={[styles.weekStatValue, { color: colors.accent }]}>
                    {jobs.filter((j) => j.status === 'running').length}
                  </Text>
                  <Text style={styles.weekStatLabel}>Running</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safeTop: { backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  greeting: { ...typography.small, color: colors.textMuted },
  clientName: { ...typography.h3, color: colors.text, marginTop: 2 },
  avatar: {
    width: 38, height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  loadingCard: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  statLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 3 },
  createBanner: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primaryDim,
    marginBottom: spacing.lg,
  },
  createBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: 12,
  },
  createBannerLabel: { ...typography.tiny, color: colors.primary, letterSpacing: 1, marginBottom: 6 },
  createBannerTitle: {
    fontSize: 22, fontWeight: '800',
    color: colors.text, letterSpacing: -0.5, lineHeight: 28,
  },
  createBannerCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.full, marginTop: 4,
  },
  createBannerCtaText: { fontSize: 13, fontWeight: '700', color: '#000' },
  quickTopics: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    gap: 8, flexDirection: 'row',
  },
  quickTopicChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    borderWidth: 1, borderColor: colors.borderActive,
  },
  quickTopicText: { ...typography.small, color: colors.textSecondary },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: 12 },
  activityList: { gap: 8 },
  activityCard: { padding: 14 },
  activityContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  activityMain: { flex: 1 },
  activityTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: 2 },
  activityTime: { ...typography.small, color: colors.textMuted },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: 8 },
  emptySubtitle: { ...typography.small, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  weekCard: { padding: spacing.md },
  weekStats: { flexDirection: 'row' },
  weekStat: { flex: 1, alignItems: 'center' },
  weekStatValue: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  weekStatLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  weekDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },
});
