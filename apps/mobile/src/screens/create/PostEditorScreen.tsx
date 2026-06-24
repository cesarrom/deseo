import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Animated,
  Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  useCreateJob,
  useJobs,
  useArticles,
  useUpdateArticleWithPrompt,
  usePublishArticle,
  useInstallations,
} from '@deseo/api-client';
import { useClient } from '../../providers/ClientProvider';
import { CreateStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<CreateStackParamList, 'PostEditor'>;
  route: RouteProp<CreateStackParamList, 'PostEditor'>;
};

type GenerationPhase = 'generating' | 'ready' | 'error';

type Job = {
  id: string;
  status: string;
};

type Article = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  targetCms?: string | null;
  productId?: string | null;
};

const TWEAK_SUGGESTIONS = [
  'Make it shorter', 'Add more examples', 'Make tone casual', 'Add a TL;DR', 'Improve SEO',
];

export function PostEditorScreen({ navigation, route }: Props) {
  const { title, description, topic, keywords, productId, suggestionId } = route.params;
  const { activeClientId } = useClient();

  const [jobId, setJobId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('generating');
  const [tweakPrompt, setTweakPrompt] = useState('');
  const [publishVisible, setPublishVisible] = useState(false);
  const [selectedCms, setSelectedCms] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressLoop = useRef<Animated.CompositeAnimation | null>(null);

  const createJob = useCreateJob();
  const updateWithPrompt = useUpdateArticleWithPrompt();
  const publishArticle = usePublishArticle();
  const { data: installations } = useInstallations();

  // Poll jobs while generating
  const { data: jobs } = useJobs(
    { clientId: activeClientId ?? undefined },
    {
      enabled: !!jobId && generationPhase === 'generating' && !!activeClientId,
      refetchInterval: jobId && generationPhase === 'generating' ? 3000 : false,
    },
  );

  // Fetch articles once generation is ready
  const { data: articles } = useArticles(
    { productId: productId ?? undefined },
    { enabled: generationPhase === 'ready' && !!productId },
  );

  const cmsInstallations = installations?.filter((i) => i.status === 'active') ?? [];

  // Start job on mount
  useEffect(() => {
    if (!activeClientId) {
      setGenerationPhase('error');
      return;
    }
    createJob.mutate(
      {
        clientId: activeClientId,
        type: 'article_generation',
        input: {
          topic,
          keywords,
          productId: productId ?? undefined,
          suggestionId: suggestionId ?? undefined,
          payload: topic,
        },
      },
      {
        onSuccess: (job) => {
          setJobId((job as Job).id);
        },
        onError: () => {
          setGenerationPhase('error');
        },
      },
    );
  }, []);

  // Animated indeterminate progress bar
  useEffect(() => {
    if (generationPhase === 'generating') {
      progressAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { toValue: 0.8, duration: 1400, useNativeDriver: false }),
          Animated.timing(progressAnim, { toValue: 0.3, duration: 800, useNativeDriver: false }),
        ]),
      );
      progressLoop.current = loop;
      loop.start();
    } else if (generationPhase === 'ready') {
      progressLoop.current?.stop();
      Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    }
    return () => { progressLoop.current?.stop(); };
  }, [generationPhase]);

  // Watch jobs for completion
  useEffect(() => {
    if (!jobId || !jobs) return;
    const job = jobs.find((j: Job) => j.id === jobId);
    if (job?.status === 'completed') {
      setGenerationPhase('ready');
    } else if (job?.status === 'failed') {
      setGenerationPhase('error');
    }
  }, [jobs, jobId]);

  // Find the newly generated article
  useEffect(() => {
    if (generationPhase !== 'ready' || !articles || articles.length === 0) return;
    // Pick the most recent article
    const sorted = [...(articles as Article[])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const found = sorted[0];
    if (found && !articleId) {
      setArticleId(found.id);
    }
  }, [articles, generationPhase]);

  const handleTweak = (suggestion?: string) => {
    const t = suggestion ?? tweakPrompt;
    if (!t.trim() || !articleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTweakPrompt('');
    updateWithPrompt.mutate(
      { articleId, prompt: t },
      {
        onSuccess: () => {
          setSuccessMsg('Article updated!');
          setTimeout(() => setSuccessMsg(''), 3000);
        },
      },
    );
  };

  const handlePublish = () => {
    if (!articleId || selectedCms.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    publishArticle.mutate(
      { articleId, cmsAppSlugs: selectedCms },
      {
        onSuccess: () => {
          setPublished(true);
          setPublishVisible(false);
          setSuccessMsg('Published successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
        },
      },
    );
  };

  const toggleCms = (slug: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCms((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
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
            disabled={generationPhase !== 'ready' || !articleId}
          >
            <Text style={[styles.publishBtnText, published && styles.publishedBtnText]}>
              {published ? 'Published ✓' : 'Publish'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.postTitle} numberOfLines={3}>{title}</Text>

          {/* Progress bar */}
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

          {generationPhase === 'generating' && (
            <Text style={styles.generatingText}>✦ Generating article...</Text>
          )}
          {generationPhase === 'ready' && (
            <Text style={styles.readyText}>✓ Article generated</Text>
          )}
          {generationPhase === 'error' && (
            <Text style={styles.errorText}>✕ Generation failed</Text>
          )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {generationPhase === 'generating' && (
          <View style={styles.generatingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.generatingStateText}>Generating your article...</Text>
            <Text style={styles.generatingStateSubText}>
              This usually takes 30–60 seconds
            </Text>
          </View>
        )}

        {generationPhase === 'ready' && (
          <View style={styles.readyState}>
            <Text style={styles.readyEmoji}>✦</Text>
            <Text style={styles.readyStateTitle}>Article Generated!</Text>
            <Text style={styles.readyStateSubtext}>
              Your article is ready. Use the controls below to refine it, or publish directly.
            </Text>
            {articleId ? (
              <TouchableOpacity
                style={styles.viewInDashboardBtn}
                onPress={() => {
                  navigation.getParent()?.navigate('ContentTab');
                }}
              >
                <Text style={styles.viewInDashboardText}>View in Content →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.lookingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.lookingText}>Finding your article...</Text>
              </View>
            )}
          </View>
        )}

        {generationPhase === 'error' && (
          <View style={styles.errorState}>
            <Text style={styles.errorStateText}>
              {!activeClientId
                ? 'No client selected. Please select a client first.'
                : 'Failed to generate article. Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Tweak bar */}
      {generationPhase === 'ready' && articleId && (
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
                disabled={updateWithPrompt.isPending}
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
              editable={!updateWithPrompt.isPending}
            />
            <TouchableOpacity
              style={[styles.tweakSend, (!tweakPrompt.trim() || updateWithPrompt.isPending) && styles.tweakSendDim]}
              onPress={() => handleTweak()}
              disabled={!tweakPrompt.trim() || updateWithPrompt.isPending}
            >
              {updateWithPrompt.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.tweakSendText}>↑</Text>
              )}
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
            <Text style={styles.sheetSubtitle}>Select where to publish "{title}"</Text>

            {cmsInstallations.length === 0 ? (
              <View style={styles.noCmsNote}>
                <Text style={styles.noCmsText}>
                  No CMS connected. Go to Settings &gt; Marketplace to connect one.
                </Text>
              </View>
            ) : (
              cmsInstallations.map((inst) => {
                const isSelected = selectedCms.includes(inst.app.slug);
                return (
                  <TouchableOpacity
                    key={inst.id}
                    style={styles.connectorRow}
                    onPress={() => toggleCms(inst.app.slug)}
                  >
                    <Text style={styles.connectorName}>{inst.app.name}</Text>
                    <View style={[styles.check, isSelected && styles.checkActive]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[
                styles.publishConfirmBtn,
                (publishArticle.isPending || selectedCms.length === 0) && styles.publishConfirmBtnDim,
              ]}
              onPress={handlePublish}
              disabled={publishArticle.isPending || selectedCms.length === 0}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.primary, colors.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.publishGradient}
              >
                {publishArticle.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.publishConfirmText}>
                    {`Publish to ${selectedCms.length} channel${selectedCms.length !== 1 ? 's' : ''}`}
                  </Text>
                )}
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 24,
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
  readyText: { ...typography.small, color: colors.accent },
  errorText: { ...typography.small, color: colors.error },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  successBanner: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  successText: { ...typography.smallMedium, color: colors.accent, textAlign: 'center' },
  generatingState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  generatingStateText: { ...typography.h3, color: colors.text },
  generatingStateSubText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  readyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  readyEmoji: { fontSize: 40, color: colors.primary },
  readyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  readyStateSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  viewInDashboardBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  viewInDashboardText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },
  lookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lookingText: { ...typography.small, color: colors.textMuted },
  errorState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
    paddingHorizontal: spacing.md,
  },
  errorStateText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: { ...typography.bodyMedium, color: colors.primary, fontWeight: '600' },
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
  noCmsNote: {
    backgroundColor: colors.surfaceActive,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noCmsText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  connectorName: { ...typography.bodyMedium, color: colors.text, flex: 1 },
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
