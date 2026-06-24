export const colors = {
  bg: '#080808',
  surface: '#0F0F0F',
  surfaceRaised: '#161616',
  surfaceActive: '#1C1C1C',
  border: '#222222',
  borderActive: '#333333',

  primary: '#818cf8',
  primaryDim: '#818cf820',
  primaryDark: '#4f46e5',

  accent: '#34d399',
  accentDim: '#34d39920',

  violet: '#a78bfa',
  violetDim: '#a78bfa20',

  warning: '#fbbf24',
  warningDim: '#fbbf2420',

  error: '#f87171',
  errorDim: '#f8717120',

  success: '#34d399',

  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#52525B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  smallMedium: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3 },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
};
