import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { CreateStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';

type Props = {
  navigation: NativeStackNavigationProp<CreateStackParamList, 'Ideas'>;
  route: RouteProp<CreateStackParamList, 'Ideas'>;
};

type Idea = {
  id: string;
  title: string;
  description: string;
  type: string;
  typeVariant: 'primary' | 'accent' | 'violet' | 'warning';
  readTime: string;
  seoScore: number;
};

const IDEAS: Idea[] = [
  {
    id: '1',
    title: "The Complete Beginner's Guide to TypeScript Generics",
    description: "A structured walkthrough from basic type parameters to advanced constraints, with real-world examples from popular libraries.",
    type: 'Guide',
    typeVariant: 'primary',
    readTime: '12 min read',
    seoScore: 94,
  },
  {
    id: '2',
    title: '10 TypeScript Generic Patterns Every Dev Should Know',
    description: "Practical patterns including conditional types, mapped types, and utility types — with copy-paste examples you'll use daily.",
    type: 'Listicle',
    typeVariant: 'accent',
    readTime: '8 min read',
    seoScore: 88,
  },
  {
    id: '3',
    title: 'TypeScript Generics vs. Any: When to Use Which',
    description: "A direct comparison with benchmarks, type safety scores, and migration examples from real codebases.",
    type: 'Comparison',
    typeVariant: 'violet',
    readTime: '7 min read',
    seoScore: 82,
  },
  {
    id: '4',
    title: 'How I Reduced Bug Rate by 40% Using TypeScript Generics',
    description: "A case study exploring how adopting strict generics transformed our team's codebase and reduced runtime errors.",
    type: 'Case Study',
    typeVariant: 'warning',
    readTime: '10 min read',
    seoScore: 79,
  },
];

export function IdeasScreen({ navigation, route }: Props) {
  const { prompt } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const fadeAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    fadeAnims.current = IDEAS.map(() => new Animated.Value(0));
    const timer = setTimeout(() => {
      setIdeas(IDEAS);
      setIsLoading(false);
      IDEAS.forEach((_, i) => {
        setTimeout(() => {
          Animated.spring(fadeAnims.current[i], {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }, i * 80);
      });
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectIdea = (idea: Idea) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('PostEditor', {
      ideaTitle: idea.title,
      ideaDescription: idea.description,
      prompt,
    });
  };

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
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating ideas...</Text>
            <Text style={styles.loadingSubText}>Analyzing top-ranking content for your topic</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsLabel}>{ideas.length} ideas generated — tap to create</Text>
            {ideas.map((idea, index) => (
              <Animated.View
                key={idea.id}
                style={{
                  opacity: fadeAnims.current[index] ?? 1,
                  transform: [
                    {
                      translateY: fadeAnims.current[index]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }) ?? 0,
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={styles.ideaCard}
                  onPress={() => handleSelectIdea(idea)}
                  activeOpacity={0.75}
                >
                  <View style={styles.ideaHeader}>
                    <Badge label={idea.type} variant={idea.typeVariant} />
                    <View style={styles.seoScore}>
                      <Text style={styles.seoScoreValue}>{idea.seoScore}</Text>
                      <Text style={styles.seoScoreLabel}>SEO</Text>
                    </View>
                  </View>
                  <Text style={styles.ideaTitle}>{idea.title}</Text>
                  <Text style={styles.ideaDesc}>{idea.description}</Text>
                  <View style={styles.ideaFooter}>
                    <Text style={styles.readTime}>◎ {idea.readTime}</Text>
                    <View style={styles.selectHint}>
                      <Text style={styles.selectHintText}>Generate post →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
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
    marginBottom: 14,
  },
  ideaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  readTime: { ...typography.small, color: colors.textMuted },
  selectHint: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  selectHintText: { ...typography.small, color: colors.primary, fontWeight: '600' },
});
