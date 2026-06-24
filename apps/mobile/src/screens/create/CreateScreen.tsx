import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreateStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  navigation: NativeStackNavigationProp<CreateStackParamList, 'Create'>;
};

const HOT_TOPICS = [
  { id: '1', label: 'AI tools for developers', trend: '↑ 84%' },
  { id: '2', label: 'TypeScript best practices', trend: '↑ 52%' },
  { id: '3', label: 'React performance tips', trend: '↑ 41%' },
  { id: '4', label: 'Next.js 15 features', trend: '↑ 67%' },
  { id: '5', label: 'Tailwind CSS tricks', trend: '↑ 38%' },
  { id: '6', label: 'Node.js vs Bun', trend: '↑ 29%' },
  { id: '7', label: 'PostgreSQL optimization', trend: '↑ 22%' },
  { id: '8', label: 'Docker for beginners', trend: '↑ 19%' },
];

const CONTENT_TYPES = [
  { id: 'article', label: 'Article', icon: '◎' },
  { id: 'listicle', label: 'List', icon: '≡' },
  { id: 'guide', label: 'Guide', icon: '◈' },
  { id: 'comparison', label: 'Comparison', icon: '≠' },
];

export function CreateScreen({ navigation }: Props) {
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('article');
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleTopicPress = (topic: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompt(`Write about ${topic}`);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!prompt.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Ideas', { prompt: prompt.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>CONTENT STUDIO</Text>
            <Text style={styles.headerTitle}>Create</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Prompt area */}
          <Animated.View style={[styles.promptCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.promptLabel}>What do you want to write about?</Text>
            <TextInput
              ref={inputRef}
              style={styles.promptInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. Write a comprehensive guide on TypeScript generics for beginners..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
            />
            <View style={styles.promptFooter}>
              {prompt.length > 0 && (
                <TouchableOpacity onPress={() => setPrompt('')} style={styles.clearBtn}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.charCount}>{prompt.length} chars</Text>
            </View>
          </Animated.View>

          {/* Content type selector */}
          <View style={styles.typeSection}>
            <Text style={styles.sectionLabel}>Content type</Text>
            <View style={styles.typeRow}>
              {CONTENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, contentType === t.id && styles.typeChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setContentType(t.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeChipIcon, contentType === t.id && styles.typeChipIconActive]}>
                    {t.icon}
                  </Text>
                  <Text style={[styles.typeChipLabel, contentType === t.id && styles.typeChipLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hot topics */}
          <View style={styles.topicsSection}>
            <View style={styles.topicsHeader}>
              <View style={styles.trendingDot} />
              <Text style={styles.sectionLabel}>Hot topics this week</Text>
            </View>
            <Text style={styles.topicsHint}>Tap to populate prompt</Text>
            <View style={styles.topicsGrid}>
              {HOT_TOPICS.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.topicChip}
                  onPress={() => handleTopicPress(topic.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.topicLabel}>{topic.label}</Text>
                  <Text style={styles.topicTrend}>{topic.trend}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Fixed generate button */}
        <View style={styles.generateBar}>
          <TouchableOpacity
            style={[styles.generateBtn, !prompt.trim() && styles.generateBtnDim]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={prompt.trim() ? [colors.primary, colors.violet] : [colors.border, colors.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateGradient}
            >
              <Text style={[styles.generateText, !prompt.trim() && styles.generateTextDim]}>
                {prompt.trim() ? 'Generate Ideas ✦' : 'Enter a prompt above'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLabel: {
    ...typography.tiny,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  promptCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  promptLabel: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  promptInput: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    fontWeight: '400',
  },
  promptFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
  },
  clearText: { ...typography.small, color: colors.textMuted },
  charCount: { ...typography.tiny, color: colors.textMuted },
  typeSection: { marginBottom: spacing.lg },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  typeChipIcon: { fontSize: 14, color: colors.textMuted },
  typeChipIconActive: { color: colors.primary },
  typeChipLabel: { ...typography.small, color: colors.textMuted },
  typeChipLabelActive: { color: colors.primary, fontWeight: '600' },
  topicsSection: { marginBottom: spacing.md },
  topicsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  trendingDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  topicsHint: { ...typography.tiny, color: colors.textMuted, marginBottom: 12 },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicLabel: { ...typography.small, color: colors.text },
  topicTrend: { ...typography.tiny, color: colors.accent, fontWeight: '700' },
  generateBar: {
    position: 'absolute',
    bottom: 0,
    left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  generateBtn: { borderRadius: radius.lg, overflow: 'hidden' },
  generateBtnDim: { opacity: 0.5 },
  generateGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  generateTextDim: { color: colors.textMuted },
});
