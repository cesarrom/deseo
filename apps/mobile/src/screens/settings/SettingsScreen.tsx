import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useInstallations } from '@deseo/api-client';
import { useClient } from '../../providers/ClientProvider';
import { colors, spacing, radius, typography } from '../../theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface SettingsScreenProps {
  onLogout: () => void;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps) {
  const { activeClient, clients, setActiveClientId, activeClientId } = useClient();
  const { data: installations, isLoading: connLoading } = useInstallations();

  const [notifs, setNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={styles.profileCard} variant="raised">
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {activeClient?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{activeClient?.name ?? 'No client'}</Text>
            {activeClient?.aiModelPreference && (
              <Text style={styles.profileEmail}>{activeClient.aiModelPreference}</Text>
            )}
          </View>
          <Badge label="Active" variant="accent" />
        </Card>

        {/* Clients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clients</Text>
          {clients.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.clientRow, c.id === activeClientId && styles.clientRowActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveClientId(c.id);
              }}
            >
              <View style={[styles.clientDot, { backgroundColor: c.id === activeClientId ? colors.accent : colors.border }]} />
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{c.name}</Text>
                <Text style={styles.clientUrl}>{c.slug}</Text>
              </View>
              {c.id === activeClientId && <Badge label="Active" variant="accent" />}
            </TouchableOpacity>
          ))}
          {clients.length === 0 && (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No clients yet. Create one in the web app.</Text>
            </Card>
          )}
        </View>

        {/* Connectors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connectors</Text>
          {connLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.connectorGrid}>
              {installations?.map((inst) => (
                <View
                  key={inst.id}
                  style={[styles.connectorCard, inst.status === 'active' && styles.connectorCardActive]}
                >
                  <Text style={styles.connectorName}>{inst.app.name}</Text>
                  <View style={[
                    styles.connectorStatus,
                    inst.status === 'active' ? styles.connectorStatusOn : styles.connectorStatusOff,
                  ]}>
                    <Text style={[
                      styles.connectorStatusText,
                      inst.status === 'active' ? styles.connectorStatusTextOn : styles.connectorStatusTextOff,
                    ]}>
                      {inst.status === 'active' ? 'Connected' : inst.status}
                    </Text>
                  </View>
                </View>
              ))}
              {(!installations || installations.length === 0) && (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No connectors installed. Visit Marketplace on the web.</Text>
                </Card>
              )}
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card style={styles.prefCard} variant="raised">
            <View style={styles.prefRow}>
              <View>
                <Text style={styles.prefLabel}>Push notifications</Text>
                <Text style={styles.prefDesc}>New suggestions and publishes</Text>
              </View>
              <Switch
                value={notifs}
                onValueChange={setNotifs}
                trackColor={{ false: colors.border, true: colors.primaryDim }}
                thumbColor={notifs ? colors.primary : colors.textMuted}
              />
            </View>
            <View style={[styles.prefRow, styles.prefRowLast]}>
              <View>
                <Text style={styles.prefLabel}>Weekly report</Text>
                <Text style={styles.prefDesc}>Growth summary every Monday</Text>
              </View>
              <Switch
                value={weeklyReport}
                onValueChange={setWeeklyReport}
                trackColor={{ false: colors.border, true: colors.primaryDim }}
                thumbColor={weeklyReport ? colors.primary : colors.textMuted}
              />
            </View>
          </Card>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Deseo v1.0.0 · Made with ✦</Text>
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
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 16, marginBottom: spacing.lg,
  },
  profileAvatar: {
    width: 48, height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDim,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  profileInfo: { flex: 1 },
  profileName: { ...typography.bodyMedium, color: colors.text, marginBottom: 2 },
  profileEmail: { ...typography.small, color: colors.textMuted },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: 12 },
  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, marginBottom: 8,
  },
  clientRowActive: { borderColor: colors.accent + '50', backgroundColor: colors.accentDim + '20' },
  clientDot: { width: 10, height: 10, borderRadius: 5 },
  clientInfo: { flex: 1 },
  clientName: { ...typography.bodyMedium, color: colors.text, marginBottom: 2 },
  clientUrl: { ...typography.small, color: colors.textMuted },
  connectorGrid: { gap: 8 },
  connectorCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  connectorCardActive: { borderColor: colors.borderActive },
  connectorName: { ...typography.bodyMedium, color: colors.text },
  connectorStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  connectorStatusOn: { backgroundColor: colors.accentDim },
  connectorStatusOff: { backgroundColor: colors.surfaceRaised },
  connectorStatusText: { ...typography.tiny },
  connectorStatusTextOn: { color: colors.accent, fontWeight: '700' },
  connectorStatusTextOff: { color: colors.textMuted },
  prefCard: { overflow: 'hidden' },
  prefRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  prefRowLast: { borderBottomWidth: 0 },
  prefLabel: { ...typography.bodyMedium, color: colors.text, marginBottom: 2 },
  prefDesc: { ...typography.small, color: colors.textMuted },
  logoutBtn: {
    padding: 15, backgroundColor: colors.errorDim,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.error + '40',
    alignItems: 'center',
  },
  logoutText: { ...typography.bodyMedium, color: colors.error },
  emptyCard: { padding: spacing.md },
  emptyText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  version: { ...typography.tiny, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
});
