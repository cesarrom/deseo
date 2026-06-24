import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface HomeScreenProps {
  onLogout: () => void;
  token: string | null;
}

export function HomeScreen({ onLogout, token }: HomeScreenProps) {
  const { expoPushToken, notification, triggerLocalNotification } = usePushNotifications();

  // Access environment variables using expo-constants and process.env
  // Expo SDK 50+ supports process.env.EXPO_PUBLIC_* natively
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.default.com';
  const environment = process.env.EXPO_PUBLIC_ENV || 'development';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Authentication</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Token</Text>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
              {token}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment Variables</Text>
          <View style={styles.row}>
            <Text style={styles.label}>API URL</Text>
            <Text style={styles.value}>{apiUrl}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Environment</Text>
            <Text style={styles.value}>{environment}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Push Notifications</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Expo Push Token</Text>
            <Text style={styles.value} selectable>
              {expoPushToken ? expoPushToken : 'Loading...'}
            </Text>
          </View>
          
          {notification && (
            <View style={styles.notificationBox}>
              <Text style={styles.notificationTitle}>Last Notification Received:</Text>
              <Text style={styles.notificationBody}>
                {notification.request.content.title} - {notification.request.content.body}
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => triggerLocalNotification("In-App Alert", "This was triggered from inside the app!")}
          >
            <Text style={styles.primaryButtonText}>Trigger Local Notification</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            To send remote notifications, use the Expo Push Tool with your Expo Push Token.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: Platform.OS === 'android' ? 24 : 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  logoutButton: {
    backgroundColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#a3a3a3',
    fontSize: 14,
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    color: '#737373',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  notificationBox: {
    backgroundColor: '#1e3a8a20',
    borderWidth: 1,
    borderColor: '#1e3a8a50',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  notificationTitle: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    color: '#bfdbfe',
    fontSize: 14,
  },
});
