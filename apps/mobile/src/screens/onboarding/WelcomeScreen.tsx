import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { colors, spacing, radius, typography } from '../../theme';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;
};

const FEATURES = [
  { icon: '✦', title: 'AI-Powered Content', desc: 'Generate SEO-optimized posts in seconds with a single prompt' },
  { icon: '◈', title: 'Multi-Channel Publish', desc: 'Push to WordPress, Strapi, Payload and GitHub at once' },
  { icon: '◎', title: 'Growth Metrics', desc: 'Track impressions, clicks, and organic traffic in real-time' },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a0533', '#080808']}
        locations={[0, 0.6]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.logoRow}>
          <LinearGradient
            colors={[colors.primary, colors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          />
          <Text style={styles.logoText}>deseo</Text>
        </View>

        <View style={styles.heroArea}>
          <Text style={styles.headline}>Your content,{'\n'}on autopilot.</Text>
          <Text style={styles.sub}>
            One platform to generate, refine, and publish SEO content — faster than ever.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{f.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('CreateClient')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.terms}>By continuing, you agree to our Terms & Privacy Policy</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: spacing.lg },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoText: {
    ...typography.h3,
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroArea: {
    marginTop: spacing.xxl + 8,
    marginBottom: spacing.xl,
  },
  headline: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: 16,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  features: {
    gap: 20,
    flex: 1,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureIconText: {
    color: colors.primary,
    fontSize: 16,
  },
  featureText: { flex: 1 },
  featureTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: 3,
  },
  featureDesc: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 18,
  },
  bottom: {
    paddingBottom: spacing.md,
    gap: 14,
  },
  cta: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  terms: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
