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
  text: '#1E293B',
  muted: '#475569',
  faint: '#94A3B8',
  border: '#E2E8F0',
  divider: '#EDF2F7',
  overlay: 'rgba(15,23,42,.45)',

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

/** Skala tipografi */
export const T = {
  h1: { fontSize: 22, lineHeight: 28, fontFamily: F.xbold, color: C.text } as const,
  h2: { fontSize: 16, lineHeight: 22, fontFamily: F.bold, color: C.text } as const,
  body: { fontSize: 14, lineHeight: 20, fontFamily: F.reg, color: C.text } as const,
  small: { fontSize: 12.5, lineHeight: 18, fontFamily: F.reg, color: C.muted } as const,
  caption: { fontSize: 11, lineHeight: 14, fontFamily: F.semi, letterSpacing: 0.5 } as const,
};

/** Skala spacing (density dashboard) */
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Radius */
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
