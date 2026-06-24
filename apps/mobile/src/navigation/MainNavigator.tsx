import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateScreen } from '../screens/create/CreateScreen';
import { IdeasScreen } from '../screens/create/IdeasScreen';
import { PostEditorScreen } from '../screens/create/PostEditorScreen';
import { ContentScreen } from '../screens/content/ContentScreen';
import { MetricsScreen } from '../screens/metrics/MetricsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

import { MainTabParamList, CreateStackParamList } from './types';
import { colors, radius } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();
const CreateStack = createNativeStackNavigator<CreateStackParamList>();

function CreateStackNavigator() {
  return (
    <CreateStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateStack.Screen name="Create" component={CreateScreen} />
      <CreateStack.Screen name="Ideas" component={IdeasScreen} />
      <CreateStack.Screen name="PostEditor" component={PostEditorScreen} />
    </CreateStack.Navigator>
  );
}

const TAB_ICONS: Record<string, string> = {
  HomeTab: '⊟',
  CreateTab: '✦',
  ContentTab: '◈',
  MetricsTab: '◎',
  SettingsTab: '◉',
};

const TAB_LABELS: Record<string, string> = {
  HomeTab: 'Home',
  CreateTab: 'Create',
  ContentTab: 'Content',
  MetricsTab: 'Metrics',
  SettingsTab: 'Settings',
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCreate = route.name === 'CreateTab';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name);
          }
        };

        if (isCreate) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.createTabBtn}>
              <LinearGradient
                colors={[colors.primary, colors.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createTabGradient}
              >
                <Text style={styles.createTabIcon}>{TAB_ICONS[route.name]}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
              {TAB_ICONS[route.name]}
            </Text>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {TAB_LABELS[route.name]}
            </Text>
            {isFocused && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface MainNavigatorProps {
  onLogout: () => void;
}

export function MainNavigator({ onLogout }: MainNavigatorProps) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab">
        {({ navigation }) => (
          <HomeScreen
            onNavigateCreate={() => navigation.navigate('CreateTab')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="CreateTab" component={CreateStackNavigator} />
      <Tab.Screen name="ContentTab" component={ContentScreen} />
      <Tab.Screen name="MetricsTab" component={MetricsScreen} />
      <Tab.Screen name="SettingsTab">
        {() => <SettingsScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
  },
  tabIcon: { fontSize: 18, color: colors.textMuted },
  tabIconActive: { color: colors.primary },
  tabLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '500', letterSpacing: 0.2 },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    top: -10,
    width: 20,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  createTabBtn: {
    flex: 1,
    alignItems: 'center',
    marginTop: -18,
  },
  createTabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  createTabIcon: { fontSize: 20, color: '#fff' },
});
