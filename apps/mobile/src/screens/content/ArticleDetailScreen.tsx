import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  useArticle,
  useInstallations,
  useUpdateArticleWithPrompt,
  usePublishArticle,
} from '@deseo/api-client';
import { ContentStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

type Props = {
  navigation: NativeStackNavigationProp<ContentStackParamList, 'ArticleDetail'>;
  route: RouteProp<ContentStackParamList, 'ArticleDetail'>;
};

export function ArticleDetailScreen({ navigation, route }: Props) {
  const { articleId, articleTitle } = route.params;
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [publishSheetVisible, setPublishSheetVisible] = useState(false);
  const [tweakPrompt, setTweakPrompt] = useState('');
  const [selectedCms, setSelectedCms] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  const { data: article, isLoading: articleLoading } = useArticle(articleId);
  const { data: installations } = useInstallations();
  const updateWithPrompt = useUpdateArticleWithPrompt();
  const publishArticle = usePublishArticle();

  const cmsInstallations = installations?.filter(
    (i) => i.status === 'active',
  ) ?? [];

  const statusBadgeVariant = (status: string): 'accent' | 'muted' | 'warning' | 'primary' => {
    if (status === 'published') return 'accent';
    if (status === 'draft') return 'muted';
    if (status === 'generating') return 'warning';
    return 'primary';
  };

  const handleTweak = () => {
    if (!tweakPrompt.trim() || !articleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateWithPrompt.mutate(
      { articleId, prompt: tweakPrompt },
      {
        onSuccess: () => {
          setTweakPrompt('');
          setEditSheetVisible(false);
          setSuccessMsg('Article updated successfully');
          setTimeout(() => setSuccessMsg(''), 3000);
        },
      },
    );
  };

  const handlePublish = () => {
    if (selectedCms.length === 0 || !articleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    publishArticle.mutate(
      { articleId, cmsAppSlugs: selectedCms },
      {
        onSuccess: () => {
          setPublishSheetVisible(false);
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

  if (articleLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading article...</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.headerTitle} numberOfLines={1}>Article</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Article title */}
        <Text style={styles.articleTitle}>{article?.title ?? articleTitle}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {article?.status && (
            <Badge label={article.status} variant={statusBadgeVariant(article.status)} />
          )}
          {article?.targetCms && (
            <View style={styles.cmsChip}>
              <Text style={styles.cmsChipText}>{article.targetCms}</Text>
            </View>
          )}
          {article?.createdAt && (
            <Text style={styles.dateText}>
              {new Date(article.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Content area */}
        <Card style={styles.contentCard} variant="raised">
          <Text style={styles.contentNote}>
            Full article content available in the web dashboard.
          </Text>
          <Text style={styles.contentHint}>
            Use "Edit with AI" below to refine and update this article.
          </Text>
        </Card>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setEditSheetVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>✦ Edit with AI</Text>
          </TouchableOpacity>

          {article?.status !== 'published' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.publishActionBtn]}
              onPress={() => setPublishSheetVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.publishActionBtnText}>Publish →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit with AI sheet */}
      <Modal visible={editSheetVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditSheetVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit with AI</Text>
            <Text style={styles.sheetSubtitle}>Describe how you want to improve this article</Text>
            <View style={styles.tweakInputRow}>
              <TextInput
                style={styles.tweakInput}
                value={tweakPrompt}
                onChangeText={setTweakPrompt}
                placeholder="e.g. Make it shorter, add more examples..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!updateWithPrompt.isPending}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sheetBtn,
                (!tweakPrompt.trim() || updateWithPrompt.isPending) && styles.sheetBtnDim,
              ]}
              onPress={handleTweak}
              disabled={!tweakPrompt.trim() || updateWithPrompt.isPending}
              activeOpacity={0.85}
            >
              {updateWithPrompt.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.sheetBtnText}>Apply Changes</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Publish sheet */}
      <Modal visible={publishSheetVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPublishSheetVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Publish to</Text>
            <Text style={styles.sheetSubtitle}>Select where to publish this article</Text>

            {cmsInstallations.length === 0 ? (
              <Card style={styles.noCmsCard} variant="raised">
                <Text style={styles.noCmsText}>
                  No CMS connected. Go to Settings &gt; Marketplace to connect one.
                </Text>
              </Card>
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
                styles.sheetBtn,
                (selectedCms.length === 0 || publishArticle.isPending) && styles.sheetBtnDim,
              ]}
              onPress={handlePublish}
              disabled={selectedCms.length === 0 || publishArticle.isPending}
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
                  <Text style={styles.publishGradientText}>
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
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  successBanner: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  successText: { ...typography.smallMedium, color: colors.accent, textAlign: 'center' },
  articleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  cmsChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.primaryDim,
    borderRadius: radius.full,
  },
  cmsChipText: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
  dateText: { ...typography.small, color: colors.textMuted },
  contentCard: { padding: spacing.md, marginBottom: spacing.lg, alignItems: 'center' },
  contentNote: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  contentHint: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionBtnText: { ...typography.smallMedium, color: colors.primary, fontWeight: '600' },
  publishActionBtn: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  publishActionBtnText: { ...typography.smallMedium, color: colors.primary, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  sheet: {
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
  tweakInputRow: { marginBottom: spacing.md },
  tweakInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
  },
  sheetBtn: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  sheetBtnDim: { opacity: 0.5 },
  sheetBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  noCmsCard: { padding: spacing.md, marginBottom: spacing.md },
  noCmsText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  publishGradient: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  publishGradientText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
