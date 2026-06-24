import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCreateClient } from '@deseo/api-client';
import { OnboardingStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Button } from '../../components/ui/Button';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'CreateClient'>;
};

const BUSINESS_TYPES = [
  { id: 'saas', label: 'SaaS', icon: '⚡' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛍️' },
  { id: 'agency', label: 'Agency', icon: '◈' },
  { id: 'blog', label: 'Blog / Media', icon: '✦' },
  { id: 'local', label: 'Local Business', icon: '◎' },
  { id: 'other', label: 'Other', icon: '·' },
];

export function CreateClientScreen({ navigation }: Props) {
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const createClient = useCreateClient();

  const canContinue = businessName.trim().length > 1 && selectedType;

  const handleContinue = () => {
    setErrorMsg('');
    createClient.mutate(
      {
        name: businessName.trim(),
        slug: businessName.trim().toLowerCase().replace(/\s+/g, '-'),
      },
      {
        onSuccess: (result) => {
          navigation.navigate('Connectors', {
            clientId: result.id,
            clientName: result.name,
          });
        },
        onError: (err) => {
          setErrorMsg(err.message ?? 'Failed to create client. Please try again.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.progress}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </View>

          <Text style={styles.title}>Tell us about{'\n'}your business</Text>
          <Text style={styles.subtitle}>We'll tailor content strategies to your specific industry and goals.</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Business name</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Acme Corp"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Website URL <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://yoursite.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Business type</Text>
            <View style={styles.typeGrid}>
              {BUSINESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeCard, selectedType === type.id && styles.typeCardActive]}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[styles.typeLabel, selectedType === type.id && styles.typeLabelActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Continue"
            onPress={handleContinue}
            disabled={!canContinue}
            loading={createClient.isPending}
            size="lg"
            style={styles.ctaButton}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: colors.text, fontSize: 18 },
  progress: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
  label: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: { color: colors.textMuted, textTransform: 'none' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  typeIcon: { fontSize: 18 },
  typeLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  typeLabelActive: { color: colors.primary },
  errorBanner: {
    backgroundColor: colors.errorDim,
    borderRadius: radius.md,
    padding: 12,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  errorText: { ...typography.small, color: colors.error },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaButton: { borderRadius: radius.lg },
});
