import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useGenerateCustomSuggestions } from '@deseo/api-client';
import { CreateStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';

type Props = {
  navigation: NativeStackNavigationProp<CreateStackParamList, 'Ideas'>;
  route: RouteProp<CreateStackParamList, 'Ideas'>;
};

type SuggestionContext = {
  topic?: string;
  keywords?: string[];
  angle?: string;
  hook?: string;
  targetAudience?: string;
  keySubheadings?: string[];
  whyNow?: string;
};

type Suggestion = {
  id: string;
  title: string;
  description: string;
  context?: SuggestionContext;
};

const SEO_SCORE_MAP: Record<string, number> = {
  low: 90,
  medium: 72,
  high: 45,
};

const TYPE_VARIANTS: Array<'primary' | 'accent' | 'violet' | 'warning'> = [
  'primary', 'accent', 'violet', 'warning',
];

export function IdeasScreen({ navigation, route }: Props) {
  const { prompt, productId } = route.params;
  const generateMutation = useGenerateCustomSuggestions();
  const fadeAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    if (!productId) return;
    generateMutation.mutate({ productId, prompt });
  }, []);

  const suggestions: Suggestion[] = (generateMutation.data as Suggestion[] | undefined) ?? [];

  useEffect(() => {
    if (suggestions.length > 0) {
      fadeAnims.current = suggestions.map(() => new Animated.Value(0));
      suggestions.forEach((_, i) => {
        setTimeout(() => {
          Animated.spring(fadeAnims.current[i]!, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }, i * 80);
      });
    }
  }, [suggestions.length]);

  const handleSelectSuggestion = (s: Suggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('PostEditor', {
      suggestionId: s.id,
      title: s.title,
      description: s.description,
      topic: s.context?.topic ?? s.title,
      keywords: s.context?.keywords ?? [],
      productId,
    });
  };

  const getSeoScore = (index: number): number => {
    return 94 - index * 6;
  };

  if (!productId) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ideas</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Please connect a product first from the Content tab</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ideas</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.promptPreview}>
          <Text style={styles.promptLabel}>YOUR PROMPT</Text>
          <Text style={styles.promptText} numberOfLines={2}>{prompt}</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {generateMutation.isPending ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating ideas...</Text>
            <Text style={styles.loadingSubText}>Analyzing top-ranking content for your topic</Text>
          </View>
        ) : generateMutation.isError ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>Failed to generate ideas. Please try again.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => generateMutation.mutate({ productId: productId ?? '', prompt })}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.resultsLabel}>{suggestions.length} ideas generated — tap to create</Text>
            {suggestions.map((s, index) => {
              const fadeAnim = fadeAnims.current[index];
              const seoScore = getSeoScore(index);

              return (
                <Animated.View
                  key={s.id}
                  style={{
                    opacity: fadeAnim ?? 1,
                    transform: [
                      {
                        translateY: fadeAnim?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }) ?? 0,
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={styles.ideaCard}
                    onPress={() => handleSelectSuggestion(s)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.ideaHeader}>
                      <Badge
                        label={s.context?.angle ?? 'Article'}
                        variant={TYPE_VARIANTS[index % TYPE_VARIANTS.length]!}
                      />
                      <View style={styles.seoScore}>
                        <Text style={styles.seoScoreValue}>{seoScore}</Text>
                        <Text style={styles.seoScoreLabel}>SEO</Text>
                      </View>
                    </View>
                    <Text style={styles.ideaTitle}>{s.title}</Text>
                    <Text style={styles.ideaDesc}>{s.description}</Text>
                    {s.context?.keywords && s.context.keywords.length > 0 && (
                      <View style={styles.keywordsRow}>
                        {s.context.keywords.slice(0, 3).map((kw) => (
                          <View key={kw} style={styles.keywordChip}>
                            <Text style={styles.keywordText}>{kw}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.ideaFooter}>
                      <Text style={styles.readTime}>◎ {s.context?.targetAudience ?? 'General audience'}</Text>
                      <View style={styles.selectHint}>
                        <Text style={styles.selectHintText}>Generate post →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  headerTitle: { ...typography.h3, color: colors.text },
  promptPreview: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptLabel: { ...typography.tiny, color: colors.primary, letterSpacing: 1, marginBottom: 5 },
  promptText: { ...typography.bodyMedium, color: colors.text, lineHeight: 22 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  loadingState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 14,
  },
  loadingText: { ...typography.h3, color: colors.text },
  loadingSubText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: 16,
  },
  errorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },
  resultsLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  ideaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
  },
  ideaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seoScore: {
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  seoScoreValue: { fontSize: 14, fontWeight: '800', color: colors.accent, lineHeight: 16 },
  seoScoreLabel: { ...typography.tiny, color: colors.accent, lineHeight: 12 },
  ideaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 23,
    marginBottom: 8,
  },
  ideaDesc: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  keywordChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keywordText: { ...typography.tiny, color: colors.textMuted },
  ideaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  readTime: { ...typography.small, color: colors.textMuted, flex: 1 },
  selectHint: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  selectHintText: { ...typography.small, color: colors.primary, fontWeight: '600' },
});
