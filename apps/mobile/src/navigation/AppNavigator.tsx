import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { CreateClientScreen } from '../screens/onboarding/CreateClientScreen';
import { ConnectorsScreen } from '../screens/onboarding/ConnectorsScreen';
import { MainNavigator } from './MainNavigator';
import { OnboardingStackParamList } from './types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

type RootParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootParamList>();

interface AppNavigatorProps {
  onLogout: () => void;
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="CreateClient" component={CreateClientScreen} />
      <OnboardingStack.Screen name="Connectors" component={ConnectorsScreen} />
    </OnboardingStack.Navigator>
  );
}

export function AppNavigator({ onLogout }: AppNavigatorProps) {
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'Main' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setInitialRoute(val === 'true' ? 'Main' : 'Onboarding');
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <RootStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
      <RootStack.Screen name="Main">
        {() => <MainNavigator onLogout={onLogout} />}
      </RootStack.Screen>
    </RootStack.Navigator>
  );
}
