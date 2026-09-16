import { StyleSheet } from 'react-native';

/**
 * Design tokens — SPC Field Force
 * Sumber: ui-ux-pro-max design-system (enterprise workforce SaaS)
 * Style: Flat/clean SaaS, density dashboard (8/10), motion subtle (3/10)
 * Palet: Trust Blue #2563EB + slate netral + aksen semantik AA (kontras ≥4.5:1 di atas putih)
 */

export const C = {
  // Brand
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  onPrimary: '#FFFFFF',

  // Netral (slate)
  bg: '#F8FAFC',
  card: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  railBg: '#0F172A', // side-rail nav (web/tablet) — dark, tetap dalam keluarga slate
  text: '#1E293B',
  muted: '#475569',
  faint: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#EDF2F7',
  overlay: 'rgba(15,23,42,.45)',
  focus: '#2563EB',

  // Semantik (teks & fill lolos kontras di atas putih)
  ok: '#15803D',
  warn: '#B45309',
  info: '#0369A1',
  accent: '#DC2626', // destruktif / error
  purple: '#6D28D9',
  teal: '#0E7490',

  // Latar lembut untuk badge/tint
  okBg: '#DCFCE7',
  warnBg: '#FEF3C7',
  infoBg: '#DBEAFE',
  dangerBg: '#FEE2E2',
  surfaceAlt: '#EFF6FF', // kartu terpilih / highlight biru muda
};

/** Alias semantik generik (brief: background/surface/textPrimary/...) di atas palet C di atas */
export const SEMANTIC = {
  background: C.bg,
  surface: C.card,
  surfaceElevated: C.surfaceElevated,
  textPrimary: C.text,
  textSecondary: C.muted,
  textMuted: C.faint,
  border: C.border,
  brand: C.primary,
  brandStrong: C.primaryDark,
  success: C.ok,
  warning: C.warn,
  danger: C.accent,
  info: C.info,
} as const;

/** Warna status merchant — dipakai Badge (teks berwarna di atas tint 10%) */
export const STATUS_COLOR = {
  cold_start: C.warn,
  registered: C.info,
  activated: C.ok,
} as const;

/** Font Plus Jakarta Sans (@expo-google-fonts) */
export const F = {
  reg: 'PlusJakartaSans_400Regular',
  semi: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  xbold: 'PlusJakartaSans_800ExtraBold',
};

/** Skala tipografi — Display → H1-H3 → Body → Small → Caption → Label → Metric */
export const T = {
  display: { fontSize: 30, lineHeight: 36, fontFamily: F.xbold, color: C.text, letterSpacing: -0.3 } as const,
  h1: { fontSize: 22, lineHeight: 28, fontFamily: F.xbold, color: C.text } as const,
  h2: { fontSize: 16, lineHeight: 22, fontFamily: F.bold, color: C.text } as const,
  h3: { fontSize: 14, lineHeight: 20, fontFamily: F.bold, color: C.text } as const,
  body: { fontSize: 14, lineHeight: 20, fontFamily: F.reg, color: C.text } as const,
  small: { fontSize: 12.5, lineHeight: 18, fontFamily: F.reg, color: C.muted } as const,
  caption: {
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: F.semi,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as const,
  label: { fontSize: 12.5, lineHeight: 16, fontFamily: F.semi, color: C.text } as const,
  /** angka besar di KPI/metric card — tabular agar sejajar saat berubah */
  metric: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: F.xbold,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'] as any,
  },
};

/** Skala spacing (density dashboard) */
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Radius — sengaja dibatasi 3 nilai agar konsisten */
export const R = {
  card: 16,
  input: 12,
  btn: 12,
} as const;

const shadowCard = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
};

/** Elevasi — dipakai sadar, hindari shadow berlebihan (brief §13) */
export const ELEV = {
  0: {},
  1: shadowCard,
  2: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: SP.lg, paddingBottom: 40, gap: SP.md },
  card: {
    backgroundColor: C.card,
    borderRadius: R.card,
    padding: SP.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    ...shadowCard,
  },
  h1: { fontSize: 22, fontWeight: '800', color: C.text },
  h2: { fontSize: 15, fontWeight: '700', color: C.text },
  muted: { color: C.muted, fontSize: 12.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  wrap: { flexWrap: 'wrap', gap: SP.sm },
});

export const inputStyle = {
  backgroundColor: C.card,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: R.input,
  paddingHorizontal: SP.md,
  paddingVertical: 12,
  fontSize: 14.5,
  color: C.text,
} as const;
