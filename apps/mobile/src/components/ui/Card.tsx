import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'raised' | 'active';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.surface,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
  },
  active: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.primary,
  },
});
