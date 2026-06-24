import React, { useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { colors, spacing, radius, typography } from '../theme';

WebBrowser.maybeCompleteAuthSession();

// expo-auth-session v7 dropped the Expo auth proxy and `useProxy`.
// Google OAuth only works in a native build (expo run:ios) where the iOS
// client's reversed-scheme redirect URI is registered. In Expo Go the
// redirect becomes exp:// which Google permanently rejects.
const isExpoGo = Constants.appOwnership === 'expo';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.51:3001';

interface LoginScreenProps {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      if (idToken ?? accessToken) {
        exchangeWithBackend(idToken ?? accessToken!);
      }
    } else if (response?.type === 'error') {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    } else if (response?.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  const exchangeWithBackend = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as { token?: string };
      onLogin(data.token ?? token);
    } catch {
      onLogin(token);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    await promptAsync();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0533', '#080808']}
        locations={[0, 0.5]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={[colors.primary, colors.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            />
            <Text style={styles.logoText}>deseo</Text>
            <Text style={styles.title}>SEO on autopilot</Text>
            <Text style={styles.subtitle}>
              Generate, refine, and publish content that ranks.{'\n'}
              Your growth engine, always on.
            </Text>
          </View>

          <View style={styles.actions}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {isExpoGo ? (
              /* Google OAuth doesn't work in Expo Go — show why */
              <View style={styles.expoGoNotice}>
                <Text style={styles.expoGoTitle}>Google sign-in unavailable in Expo Go</Text>
                <Text style={styles.expoGoBody}>
                  Run{' '}
                  <Text style={styles.expoGoCode}>expo run:ios</Text>
                  {' '}to test real Google auth. Use the demo button below for now.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.googleButton, (!request || loading) && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={!request || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => onLogin('demo_token_' + Math.random().toString(36).substring(7))}
              activeOpacity={0.75}
            >
              <Text style={styles.demoButtonText}>
                {isExpoGo ? 'Continue with demo →' : 'Try demo →'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  content: {
    flex: 1, paddingHorizontal: spacing.lg,
    justifyContent: 'space-between', paddingVertical: spacing.xl,
  },
  brandContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  logoBox: { width: 72, height: 72, borderRadius: 20, marginBottom: 8 },
  logoText: { fontSize: 36, fontWeight: '900', color: colors.text, letterSpacing: -1.5 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textSecondary, letterSpacing: -0.3 },
  subtitle: {
    ...typography.body, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22, marginTop: 4,
  },
  actions: { gap: 14 },
  errorBox: {
    backgroundColor: colors.errorDim, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.error + '50', padding: 12,
  },
  errorText: { ...typography.small, color: colors.error, textAlign: 'center' },
  expoGoNotice: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  expoGoTitle: { ...typography.smallMedium, color: colors.textSecondary },
  expoGoBody: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  expoGoCode: {
    fontFamily: 'monospace',
    color: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#fff', paddingVertical: 15, borderRadius: radius.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  googleButtonText: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.3 },
  demoButton: {
    paddingVertical: 14, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  demoButtonText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  termsText: { ...typography.tiny, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
});
