import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { TRPCProvider } from './src/providers/TRPCProvider';
import { ClientProvider } from './src/providers/ClientProvider';
import { colors } from './src/theme';

export default function App() {
  const { token, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {token ? (
        <TRPCProvider>
          <ClientProvider>
            <NavigationContainer>
              <AppNavigator onLogout={logout} />
            </NavigationContainer>
          </ClientProvider>
        </TRPCProvider>
      ) : (
        <LoginScreen onLogin={login} />
      )}
    </SafeAreaProvider>
  );
}
