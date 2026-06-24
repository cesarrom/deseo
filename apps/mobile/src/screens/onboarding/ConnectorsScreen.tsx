import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInstallations } from '@deseo/api-client';
import { OnboardingStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Connectors'>;
  route: RouteProp<OnboardingStackParamList, 'Connectors'>;
};

const CONNECTOR_ICONS: Record<string, string> = {
  gsc: '◎',
  github: '⬡',
  wordpress: '◈',
  strapi: '✦',
  payload: '⬙',
  gitlab: '◆',
};

const CONNECTOR_COLORS: Record<string, string> = {
  gsc: '#ea4335',
  github: '#a78bfa',
  wordpress: '#21759b',
  strapi: '#4945ff',
  payload: '#0ea5e9',
  gitlab: '#fc6d26',
};

export function ConnectorsScreen({ navigation, route }: Props) {
  const { clientId, clientName } = route.params;
  const { data: installations } = useInstallations();

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('active_client_id', clientId);
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
          <Text style={styles.subtitle}>
            Welcome, {clientName}! Here are your currently connected integrations.
          </Text>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              Connect integrations from Settings after onboarding
            </Text>
          </View>

          {installations && installations.length > 0 ? (
            <View style={styles.list}>
              {installations.map((inst) => {
                const slug = inst.app.slug;
                const icon = CONNECTOR_ICONS[slug] ?? '◎';
                const color = CONNECTOR_COLORS[slug] ?? colors.primary;
                const isInstalled = inst.status === 'active';

                return (
                  <View key={inst.id} style={styles.row}>
                    <View style={[styles.icon, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.iconText, { color }]}>{icon}</Text>
                    </View>
                    <View style={styles.info}>
                      <View style={styles.nameRow}>
                        <Text style={styles.connectorName}>{inst.app.name}</Text>
                        {isInstalled && <Badge label="Connected" variant="accent" />}
                      </View>
                      <Text style={styles.connectorDesc}>
                        {(inst.app as { description?: string }).description ?? `${inst.app.name} integration`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyConnectors}>
              <Text style={styles.emptyTitle}>No integrations yet</Text>
              <Text style={styles.emptySubtext}>
                You can connect integrations from Settings after completing onboarding.
              </Text>
            </View>
          )}
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
    lineHeight: 22, marginBottom: spacing.md,
  },
  noteCard: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    padding: 12,
    marginBottom: spacing.xl,
  },
  noteText: { ...typography.small, color: colors.primary, textAlign: 'center' },
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
  emptyConnectors: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { ...typography.bodyMedium, color: colors.text, marginBottom: 8 },
  emptySubtext: { ...typography.small, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
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
