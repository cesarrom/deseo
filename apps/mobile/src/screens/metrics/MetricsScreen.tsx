import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useInstallations, useAnalyticsDashboard, useProducts } from '@deseo/api-client';
import { useClient } from '../../providers/ClientProvider';
import { colors, spacing, radius, typography } from '../../theme';
import { Card } from '../../components/ui/Card';

const RANGES = ['7d', '30d', '90d'];

export function MetricsScreen() {
  const [range, setRange] = useState('7d');
  const { activeClientId } = useClient();
  const enabled = !!activeClientId;

  const { data: installations } = useInstallations({ enabled });
  const { data: products } = useProducts({ enabled });

  // Use the first product's siteUrl if available for GSC analytics
  const gscInstall = installations?.find((i) => i.app.slug === 'gsc' && i.status === 'active');
  const firstProductConfig = products?.[0]?.config as { siteUrl?: string } | null | undefined;
  const siteUrl = firstProductConfig?.siteUrl;

  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsDashboard(
    { appSlug: 'gsc', siteUrl: siteUrl ?? '' },
    { enabled: !!gscInstall && !!siteUrl },
  );

  const hasAnalytics = !!analytics && !analyticsLoading;
  const gscConnected = !!gscInstall;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>ANALYTICS</Text>
          <Text style={styles.headerTitle}>Metrics</Text>
        </View>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeChip, range === r && styles.rangeChipActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!gscConnected ? (
          /* GSC not connected */
          <Card style={styles.emptyCard} variant="raised">
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyTitle}>Connect Google Search Console</Text>
            <Text style={styles.emptySubtitle}>
              Install the GSC connector from the Marketplace on the web app to see your organic performance here.
            </Text>
          </Card>
        ) : analyticsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching analytics...</Text>
          </View>
        ) : hasAnalytics ? (
          /* Real analytics data */
          <>
            <View style={styles.metricsGrid}>
              {[
                { label: 'Impressions', value: (analytics as any)?.impressions ?? '—' },
                { label: 'Clicks', value: (analytics as any)?.clicks ?? '—' },
                { label: 'Avg. CTR', value: (analytics as any)?.ctr ? `${((analytics as any).ctr * 100).toFixed(1)}%` : '—' },
                { label: 'Avg. Position', value: (analytics as any)?.position?.toFixed(1) ?? '—' },
              ].map((m) => (
                <Card key={m.label} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{String(m.value)}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </Card>
              ))}
            </View>

            <LinearGradient
              colors={['#0d2818', '#080808']}
              style={styles.growthBanner}
            >
              <Text style={styles.growthEmoji}>✦</Text>
              <View>
                <Text style={styles.growthLabel}>GSC CONNECTED</Text>
                <Text style={styles.growthText}>
                  Showing data for {siteUrl}
                </Text>
              </View>
            </LinearGradient>
          </>
        ) : (
          /* GSC connected but no data yet */
          <Card style={styles.emptyCard} variant="raised">
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyTitle}>No analytics data yet</Text>
            <Text style={styles.emptySubtitle}>
              Google Search Console is connected but no site URL is configured on your products yet.
            </Text>
          </Card>
        )}

        {/* Products summary */}
        {products && products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracked Products</Text>
            {products.map((p) => (
              <Card key={p.id} style={styles.productRow} variant="raised">
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productDomain}>{p.domain}</Text>
                </View>
                <Text style={styles.productType}>{p.type}</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerLabel: { ...typography.tiny, color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  rangeRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 8, marginBottom: spacing.sm },
  rangeChip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  rangeChipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  rangeText: { ...typography.smallMedium, color: colors.textMuted },
  rangeTextActive: { color: colors.primary, fontWeight: '700' },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  loadingState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  emptyCard: { padding: spacing.xl, alignItems: 'center', gap: 10, marginBottom: spacing.md },
  emptyIcon: { fontSize: 36, color: colors.primary },
  emptyTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  emptySubtitle: { ...typography.small, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  metricCard: { width: '47.5%', padding: 14 },
  metricValue: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  metricLabel: { ...typography.tiny, color: colors.textMuted },
  growthBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.accent + '30',
    marginBottom: spacing.lg,
  },
  growthEmoji: { fontSize: 24, color: colors.accent },
  growthLabel: { ...typography.tiny, color: colors.accent, letterSpacing: 0.5, marginBottom: 3 },
  growthText: { ...typography.small, color: colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: 12 },
  productRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14, marginBottom: 8,
  },
  productInfo: { flex: 1 },
  productName: { ...typography.bodyMedium, color: colors.text, marginBottom: 2 },
  productDomain: { ...typography.small, color: colors.textMuted },
  productType: { ...typography.tiny, color: colors.primary, fontWeight: '600', textTransform: 'uppercase' },
});
