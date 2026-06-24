import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CreateStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';

type Props = {
  navigation: NativeStackNavigationProp<CreateStackParamList, 'PostEditor'>;
  route: RouteProp<CreateStackParamList, 'PostEditor'>;
};

const MOCK_POST = `## Introduction

TypeScript generics are one of the most powerful—and misunderstood—features in the language. If you've been reaching for \`any\` when types get complex, this guide will change how you write TypeScript forever.

## What Are Generics?

Think of generics as **type variables**. Just like how a function parameter lets you pass different values, a type parameter lets you pass different types.

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}

const str = identity<string>("hello");  // type: string
const num = identity<number>(42);       // type: number
\`\`\`

## Why Use Generics?

Without generics, you have two bad options:

1. Use \`any\` — loses all type safety
2. Write duplicate functions for each type

Generics give you the best of both worlds: flexibility *and* type safety.

## Real-World Example: API Response Wrapper

\`\`\`typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

async function fetchUser(): Promise<ApiResponse<User>> {
  const res = await fetch('/api/user');
  return res.json();
}
\`\`\`

## Constraints

Use \`extends\` to restrict what types can be passed:

\`\`\`typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
\`\`\`

## Conclusion

Generics unlock a new level of code reuse and type safety. Start with simple type parameters, then gradually adopt constraints and conditional types as your confidence grows.`;

const CONNECTORS = [
  { id: 'wordpress', name: 'WordPress', icon: '◈', active: true },
  { id: 'github', name: 'GitHub PR', icon: '⬡', active: true },
  { id: 'strapi', name: 'Strapi', icon: '✦', active: false },
];

const TWEAK_SUGGESTIONS = [
  'Make it shorter', 'Add more examples', 'Make tone casual', 'Add a TL;DR', 'Improve SEO',
];

export function PostEditorScreen({ navigation, route }: Props) {
  const { ideaTitle, ideaDescription } = route.params;
  const [isGenerating, setIsGenerating] = useState(true);
  const [content, setContent] = useState('');
  const [tweakPrompt, setTweakPrompt] = useState('');
  const [publishVisible, setPublishVisible] = useState(false);
  const [selectedConnectors, setSelectedConnectors] = useState(['wordpress', 'github']);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: false,
    }).start(() => {
      setContent(MOCK_POST);
      setIsGenerating(false);
    });
  }, []);

  const handleTweak = (suggestion?: string) => {
    const t = suggestion ?? tweakPrompt;
    if (!t.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTweakPrompt('');
    setIsGenerating(true);
    progressAnim.setValue(0);
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }).start(() => {
        setContent(MOCK_POST + `\n\n*— Tweaked: "${t}"*`);
        setIsGenerating(false);
      });
    }, 100);
  };

  const handlePublish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublished(true);
      setPublishVisible(false);
      Animated.spring(successAnim, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Post Editor</Text>
          <TouchableOpacity
            style={[styles.publishBtn, published && styles.publishedBtn]}
            onPress={() => !published && setPublishVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.publishBtnText, published && styles.publishedBtnText]}>
              {published ? 'Published ✓' : 'Publish'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.postTitle} numberOfLines={3}>{ideaTitle}</Text>
          {isGenerating && (
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}
          {isGenerating && (
            <Text style={styles.generatingText}>
              ✦ {content ? 'Regenerating...' : 'Generating post...'}
            </Text>
          )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {content ? (
          <Text style={styles.postContent}>{content}</Text>
        ) : null}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Tweak bar */}
      {!isGenerating && (
        <View style={styles.tweakContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsRow}
          >
            {TWEAK_SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => handleTweak(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.tweakInputRow}>
            <TextInput
              style={styles.tweakInput}
              value={tweakPrompt}
              onChangeText={setTweakPrompt}
              placeholder="Prompt to refine..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => handleTweak()}
            />
            <TouchableOpacity
              style={[styles.tweakSend, !tweakPrompt.trim() && styles.tweakSendDim]}
              onPress={() => handleTweak()}
              disabled={!tweakPrompt.trim()}
            >
              <Text style={styles.tweakSendText}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Publish modal */}
      <Modal visible={publishVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPublishVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.publishSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Publish to</Text>
            <Text style={styles.sheetSubtitle}>Select where to publish "{ideaTitle}"</Text>

            {CONNECTORS.map((c) => {
              const isSelected = selectedConnectors.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.connectorRow, !c.active && styles.connectorRowDisabled]}
                  onPress={() => {
                    if (!c.active) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedConnectors(prev =>
                      isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                    );
                  }}
                  disabled={!c.active}
                >
                  <Text style={styles.connectorIcon}>{c.icon}</Text>
                  <Text style={[styles.connectorName, !c.active && styles.connectorNameDisabled]}>
                    {c.name}
                  </Text>
                  {!c.active && <Badge label="Not connected" variant="muted" />}
                  <View style={[styles.check, isSelected && c.active && styles.checkActive]}>
                    {isSelected && c.active && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.publishConfirmBtn, isPublishing && styles.publishConfirmBtnDim]}
              onPress={handlePublish}
              disabled={isPublishing || selectedConnectors.length === 0}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, colors.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.publishGradient}
              >
                <Text style={styles.publishConfirmText}>
                  {isPublishing ? 'Publishing...' : `Publish to ${selectedConnectors.length} channel${selectedConnectors.length !== 1 ? 's' : ''}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: {
    width: 36, height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: colors.text, fontSize: 18 },
  headerTitle: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  publishBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  publishedBtn: { backgroundColor: colors.accentDim },
  publishBtnText: { ...typography.smallMedium, color: '#000', fontWeight: '700' },
  publishedBtnText: { color: colors.accent },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 10,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  generatingText: { ...typography.small, color: colors.primary },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  postContent: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  tweakContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
  },
  suggestionsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: { ...typography.small, color: colors.textSecondary },
  tweakInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  tweakInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  tweakSend: {
    width: 38, height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  tweakSendDim: { backgroundColor: colors.surfaceRaised },
  tweakSendText: { color: '#000', fontWeight: '700', fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  publishSheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetHandle: {
    width: 36, height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: { ...typography.h3, color: colors.text, marginBottom: 4 },
  sheetSubtitle: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  connectorRowDisabled: { opacity: 0.5 },
  connectorIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  connectorName: { ...typography.bodyMedium, color: colors.text, flex: 1 },
  connectorNameDisabled: { color: colors.textMuted },
  check: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#000', fontSize: 12, fontWeight: '700' },
  publishConfirmBtn: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  publishConfirmBtnDim: { opacity: 0.6 },
  publishGradient: { paddingVertical: 15, alignItems: 'center' },
  publishConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
});
