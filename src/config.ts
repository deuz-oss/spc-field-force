import { CityTier, Role } from './types';

export const APP_NAME = 'SPC Field Force';

/** Jarak maksimum titik check-in ke pin merchant agar kunjungan dianggap valid */
export const VISIT_VALID_RADIUS_M = 300;

/** Abaikan titik rute jika bergerak kurang dari jarak ini (m) untuk hemat storage */
export const TRACK_MIN_STEP_M = 8;

/** Interval minimum update GPS saat tracking (ms) */
export const TRACK_INTERVAL_MS = 15000;

/**
 * Rate Quotation Option 3 - Integrated Merchant Acquisition & Incubation
 * (contoh angka sesuai quotation; dapat disesuaikan)
 * base = base salary bulanan per agen; case fee = per cold start / aktivasi.
 */
export const OPTION3: Record<
  CityTier,
  { baseMonthly: number; coldStartFee: number; activationFee: number }
> = {
  tier1: { baseMonthly: 10380000, coldStartFee: 178000, activationFee: 214000 },
  tier2: { baseMonthly: 9169000, coldStartFee: 178000, activationFee: 214000 },
  tier3: { baseMonthly: 9169000, coldStartFee: 178000, activationFee: 214000 },
};

/** Insentif maksimal = persentase dari base fee */
export const INCENTIVE_CAP_PCT = 0.5;

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Ops Manager',
  team_lead: 'Team Lead',
  field_agent: 'Field Agent (merangkap Incubation Agent)',
  client: 'Client (Monitoring)',
};

/** Posisi yang boleh memantau seluruh tim */
export const MONITOR_ROLES: Role[] = ['super_admin', 'admin', 'client'];
/** Posisi yang boleh mengelola merchant (tambah/impor/assign/status) */
export const MANAGER_ROLES: Role[] = ['super_admin', 'admin', 'team_lead'];

export const STATUS_LABEL = {
  cold_start: 'Cold Start',
  registered: 'Registered',
  activated: 'Activated',
} as const;

export const RESULT_LABEL: Record<string, string> = {
  pitch: 'Pitching / Kunjungan',
  follow_up_wa: 'Follow-up WA',
  registered: 'Merchant Registered',
  qualification_passed: 'Kualifikasi Lolos',
  product_uploaded: 'Produk Di-upload',
  redemption: 'Redemption Pertama',
  cold_start_complete: 'Cold Start Complete',
};

export const RESULT_ORDER: Array<keyof typeof RESULT_LABEL> = [
  'pitch',
  'follow_up_wa',
  'registered',
  'qualification_passed',
  'product_uploaded',
  'redemption',
  'cold_start_complete',
];

export const TIER_LABEL = {
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
} as const;
