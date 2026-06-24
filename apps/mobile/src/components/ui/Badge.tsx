import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography } from '../../theme';

type BadgeVariant = 'primary' | 'accent' | 'violet' | 'warning' | 'error' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primaryDim, text: colors.primary },
  accent: { bg: colors.accentDim, text: colors.accent },
  violet: { bg: colors.violetDim, text: colors.violet },
  warning: { bg: colors.warningDim, text: colors.warning },
  error: { bg: colors.errorDim, text: colors.error },
  muted: { bg: colors.surfaceRaised, text: colors.textMuted },
};

export function Badge({ label, variant = 'muted', style }: BadgeProps) {
  const vs = variantStyles[variant];
  return (
    <View style={[styles.base, { backgroundColor: vs.bg }, style]}>
      <Text style={[styles.text, { color: vs.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  text: {
    ...typography.tiny,
    textTransform: 'uppercase',
  },
});
