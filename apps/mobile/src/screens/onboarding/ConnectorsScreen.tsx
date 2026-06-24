import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Connectors'>;
  route: RouteProp<OnboardingStackParamList, 'Connectors'>;
};

const CONNECTORS = [
  {
    id: 'gsc',
    name: 'Google Search Console',
    desc: 'Import keyword data and track organic performance',
    icon: '◎',
    color: '#ea4335',
    badge: 'Recommended' as const,
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Auto-create PRs with SEO improvements for your codebase',
    icon: '⬡',
    color: '#a78bfa',
    badge: null,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    desc: 'Publish posts directly to your WordPress blog',
    icon: '◈',
    color: '#21759b',
    badge: null,
  },
  {
    id: 'strapi',
    name: 'Strapi',
    desc: 'Push content to any Strapi CMS instance',
    icon: '✦',
    color: '#4945ff',
    badge: null,
  },
  {
    id: 'payload',
    name: 'Payload CMS',
    desc: 'Manage dedicated Payload instances per client',
    icon: '⬙',
    color: '#0ea5e9',
    badge: null,
  },
];

export function ConnectorsScreen({ navigation, route }: Props) {
  const { clientName } = route.params;
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ gsc: true });

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('current_client', JSON.stringify({
      id: 'client_1',
      name: clientName,
      connectors: Object.keys(enabled).filter(k => enabled[k]),
    }));
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' as never }] });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.progress}>
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotActive]} />
            </View>
          </View>

          <Text style={styles.title}>Connect your{'\n'}channels</Text>
          <Text style={styles.subtitle}>Enable the platforms you use. You can always add more later.</Text>

          <View style={styles.list}>
            {CONNECTORS.map((c) => (
              <View key={c.id} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: c.color + '20' }]}>
                  <Text style={[styles.iconText, { color: c.color }]}>{c.icon}</Text>
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.connectorName}>{c.name}</Text>
                    {c.badge && <Badge label={c.badge} variant="accent" />}
                  </View>
                  <Text style={styles.connectorDesc}>{c.desc}</Text>
                </View>
                <Switch
                  value={!!enabled[c.id]}
                  onValueChange={(val) => setEnabled(prev => ({ ...prev, [c.id]: val }))}
                  trackColor={{ false: colors.border, true: colors.primaryDim }}
                  thumbColor={enabled[c.id] ? colors.primary : colors.textMuted}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Launch Dashboard →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFinish}>
            <Text style={styles.skip}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  back: {
    width: 36, height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: colors.text, fontSize: 18 },
  progress: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  dotDone: { backgroundColor: colors.accent },
  title: {
    fontSize: 32, fontWeight: '800',
    color: colors.text, letterSpacing: -1,
    lineHeight: 38, marginBottom: 10,
  },
  subtitle: {
    ...typography.body, color: colors.textSecondary,
    lineHeight: 22, marginBottom: spacing.xl,
  },
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 8,
  },
  icon: {
    width: 44, height: 44,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  connectorName: { ...typography.bodyMedium, color: colors.text },
  connectorDesc: { ...typography.small, color: colors.textMuted, lineHeight: 17 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#000', letterSpacing: -0.3 },
  skip: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
