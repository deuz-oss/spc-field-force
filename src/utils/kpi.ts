import { Attendance, Merchant, Visit } from '../types';
import { C } from '../theme';
import { polylineKm } from './geo';
import { inRange } from './period';

/**
 * Target KPI sesuai dokumen RFP (section KPI and SLA):
 * - Attendance days            : hadir sesuai hari kerja kontrak (bulanan)
 * - Daily working hours        : 8 jam/hari
 * - Daily on-site outreach     : >= 6 jam/hari
 * - Geo-fence compliance       : >= 99% clock event dalam geo-fence
 * - Route check-in completion  : >= 95% titik terencana selesai dgn bukti
 * - Valid visit                : sampai POI + durasi cukup + bukti (foto/dokumen)
 */
export const TARGETS = {
  workHoursDay: 8,
  onsiteHoursDay: 6,
  fencePct: 99,
  routePct: 95,
  validVisitPct: 95,
  minStayMinutes: 10,
} as const;

export interface AgentStat {
  userId: string;
  name: string;
  days: number;
  sessions: number;
  workMs: number;
  onSiteMs: number;
  avgWorkMsDay: number;
  avgOnsiteMsDay: number;
  km: number;
  visits: number;
  distinctMerchants: number;
  /** funnel onboarding (jangkauan kumulatif per tahap) */
  funnel: number[];
  /** % kunjungan selesai memenuhi definisi valid visit RFP */
  validVisits: number;
  validVisitPct: number | null;
  fencePct: number | null;
  /** % merchant ter-assign yang berhasil dikunjungi pada periode */
  assignedTotal: number;
  routeCompletionPct: number | null;
  targetWorkMs: number;
  targetOnsiteMs: number;
}

/** Urutan tahapan funnel BD Field Merchant Onboarding (RFP) */
const RESULT_RANK: Record<Visit['result'], number> = {
  pitch: 1,
  follow_up_wa: 2,
  registered: 3,
  qualification_passed: 4,
  product_uploaded: 5,
  redemption: 6,
  cold_start_complete: 7,
};

export const FUNNEL_STEPS = [
  'Kunjungan',
  'Connect WA',
  'Registered',
  'Qualif. Lolos',
  'Upload Produk',
  'Redemption',
  'Cold Start Selesai',
] as const;

/** Jangkauan kumulatif per tahap funnel dari daftar kunjungan */
export function funnelCounts(vs: Visit[]): number[] {
  const at = (stage: number) => vs.filter((v) => RESULT_RANK[v.result] >= stage).length;
  return [at(1), at(2), at(3), at(4), at(5), at(6), at(7)];
}

export function computeStat(
  userId: string,
  name: string,
  att: Attendance[],
  vst: Visit[],
  mers: Merchant[],
  range: { from: number; to: number },
): AgentStat {
  const a = att.filter((x) => x.userId === userId && inRange(x.clockInAt, range));
  const vs = vst.filter((v) => v.agentId === userId && inRange(v.checkInAt, range));
  const closed = vs.filter((v) => v.checkOutAt);

  const days = new Set(a.map((x) => new Date(x.clockInAt).toDateString())).size;
  const workMs = a.reduce((t, x) => t + ((x.clockOutAt ?? Date.now()) - x.clockInAt), 0);
  const onSiteMs = closed.reduce((t, v) => t + ((v.checkOutAt ?? 0) - v.checkInAt), 0);

  // Valid visit (RFP): capai POI (geoValid) + durasi minimal + bukti foto tersedia
  const minStayMs = TARGETS.minStayMinutes * 60000;
  const validVisits = closed.filter(
    (v) => v.geoValid && v.photos.length > 0 && (v.checkOutAt ?? 0) - v.checkInAt >= minStayMs,
  ).length;

  // Route check-in completion: coverage merchant ter-assign yang dikunjungi
  const assigned = mers.filter((m) => m.assignedTo === userId);
  const distinctMerchants = new Set(vs.map((v) => v.merchantId)).size;

  return {
    userId,
    name,
    days,
    sessions: a.length,
    workMs,
    onSiteMs,
    avgWorkMsDay: days ? Math.round(workMs / days) : 0,
    avgOnsiteMsDay: days ? Math.round(onSiteMs / days) : 0,
    km: a.reduce((t, x) => t + polylineKm(x.route), 0),
    visits: vs.length,
    distinctMerchants,
    funnel: funnelCounts(vs),
    validVisits,
    validVisitPct: closed.length
      ? Math.round((100 * validVisits) / closed.length)
      : null,
    fencePct: a.length
      ? Math.round((100 * a.filter((x) => x.geoFenceOk).length) / a.length)
      : null,
    assignedTotal: assigned.length,
    routeCompletionPct: assigned.length
      ? Math.round((100 * distinctMerchants) / assigned.length)
      : null,
    targetWorkMs: Math.max(1, days) * TARGETS.workHoursDay * 3600000,
    targetOnsiteMs: Math.max(1, days) * TARGETS.onsiteHoursDay * 3600000,
  };
}

export function statusOf(s: AgentStat): { label: string; color: string } {
  if (s.days === 0) return { label: 'Tanpa Absensi', color: C.faint };
  let fails = 0;
  if (s.workMs < s.targetWorkMs * 0.75) fails++;
  if (s.onSiteMs < s.targetOnsiteMs * 0.6) fails++;
  if (s.fencePct != null && s.fencePct < TARGETS.fencePct) fails++;
  if (s.routeCompletionPct != null && s.routeCompletionPct < TARGETS.routePct) fails++;
  if (s.validVisitPct != null && s.validVisitPct < TARGETS.validVisitPct) fails++;
  if (fails === 0) return { label: 'On Track', color: C.ok };
  if (fails <= 2) return { label: 'Perlu Perhatian', color: C.warn };
  return { label: 'Di Bawah Target', color: C.accent };
}

export type SortKey = 'visits' | 'hours' | 'activated';

export function sortVal(s: AgentStat, key: SortKey): number {
  if (key === 'visits') return s.visits;
  if (key === 'hours') return s.workMs;
  return s.funnel[6] + s.funnel[5];
}
