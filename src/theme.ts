/**
 * Design tokens — SPC Field Force
 * Per user-provided design.md (2026-09-20): Trust Blue primary on a cool
 * slate neutral scale, deep-slate chrome, Plus Jakarta Sans everywhere
 * (no separate mono numeral font — tabular alignment via fontVariant),
 * 16/12/12 card/input/button radius, and the doc's Level 1/3 shadow specs.
 * Spacing scale already matched the doc's space-* tokens exactly, unchanged.
 * Contrast: semantic colors kept AA (≥4.5:1) against their expected background.
 */

export const C = {
  // Brand — Trust Blue, paired with white text/icons on top (unlike the
  // previous gold, #2563EB passes AA as text-on-white directly at ~5.17:1,
  // so `primaryText` doesn't need a separately darkened shade here).
  primary: '#2563EB',
  primaryDark: '#1D4ED8', // pressed state
  primaryText: '#2563EB',
  onPrimary: '#FFFFFF', // text/icon color to place ON a primary-colored surface

  // Neutral — cool slate
  bg: '#F8FAFC',
  card: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  railBg: '#0F172A', // side-rail nav (web/tablet) — deep slate
  text: '#1E293B',
  muted: '#475569',
  faint: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.45)',
  focus: '#2563EB',

  // Semantik — status warna tetap konvensional (hijau/oranye/biru/merah)
  // supaya tidak bentrok dengan brand; hanya brand yang pindah, bukan makna status.
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
  surfaceAlt: '#EFF6FF', // kartu terpilih / baris aktif
};

/** Warna status merchant — dipakai Badge (teks berwarna di atas tint ~3%, lihat ui.tsx) */
export const STATUS_COLOR = {
  cold_start: C.warn,
  registered: C.info,
  activated: C.ok,
} as const;

/** Font: Plus Jakarta Sans di semua tier (per design.md) — angka tabular pakai fontVariant, bukan font terpisah. */
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
    color: C.muted,
  } as const,
  label: { fontSize: 12.5, lineHeight: 16, fontFamily: F.semi, color: C.text } as const,
  /** angka besar di KPI/metric card — mono tabular agar sejajar saat berubah */
  metric: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: F.xbold,
    color: C.text,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'] as any,
  },
  /** timer absensi/kunjungan aktif — angka besar, dipisah dari `display` (dipakai brand title Login) */
  timer: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: F.xbold,
    color: C.primaryDark,
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

/** Radius — per design.md Shapes (card 16 / input & tombol 12); rail nav tetap 10 (hardcoded di App.tsx, sudah sesuai) */
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

/** Elevasi — Level 1 (card) & Level 3 (modal) per design.md Elevation & Depth */
export const ELEV = {
  0: {},
  1: shadowCard,
  2: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
