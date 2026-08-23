import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { PeriodPicker } from '../components/PeriodPicker';
import { showDialog } from '../components/dialog';
import { Btn, Card, Chip, H, Muted } from '../components/ui';
import { INCENTIVE_CAP_PCT, OPTION3, RESULT_LABEL, STATUS_LABEL, TIER_LABEL, MONITOR_ROLES } from '../config';
import { C } from '../theme';
import { scopeUsers, useCurrentUser, useStore } from '../store/useStore';
import {
  fmtDate,
  fmtDurShort,
  fmtIDR,
  fmtNum,
  fmtTime,
} from '../utils/format';
import { polylineKm } from '../utils/geo';
import { getRange, inRange, MONTHS_SHORT, PeriodKey } from '../utils/period';
import { toCsv } from '../utils/csv';
import { exportCsv } from '../utils/export';

function Line({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: bold ? C.primary : C.text,
          fontSize: 13,
          fontWeight: bold ? '800' : muted ? '400' : '600',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const me = useCurrentUser()!;
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const merchants = useStore((s) => s.merchants);
  const visits = useStore((s) => s.visits);
  const attendances = useStore((s) => s.attendances);

  const [period, setPeriod] = useState<PeriodKey>('monthly');
  const [month, setMonth] = useState(new Date().getMonth());
  const [teamId, setTeamId] = useState<string | 'all'>(
    me.role === 'team_lead' ? me.teamId ?? 'all' : 'all',
  );

  const range = useMemo(() => getRange(period, month), [period, month]);

  const scopedUserIds = useMemo(
    () =>
      new Set(
        (me.role === 'admin'
          ? teamId === 'all'
            ? users
            : users.filter((u) => u.teamId === teamId)
          : scopeUsers({ users }, me)
        ).map((u) => u.id),
      ),
    [users, me, teamId],
  );

  const stamp = fmtDate(Date.now()).replace(/ /g, '-');
  const periodLabel =
    period === 'all'
      ? 'semua'
      : period === 'daily'
      ? 'harian'
      : period === 'weekly'
      ? 'mingguan'
      : `bulan-${MONTHS_SHORT[month]}`;

  const guardExport = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      showDialog('Gagal mengekspor file.');
    }
  };

  const exportAttendance = () =>
    guardExport(async () => {
      const rows: Array<Array<string | number>> = [
        ['Nama', 'Role', 'Tim', 'Tanggal', 'Clock In', 'Clock Out', 'Durasi', 'Jarak (km)', 'Geo-fence OK', 'Titik Rute'],
      ];
      attendances
        .filter((a) => scopedUserIds.has(a.userId) && inRange(a.clockInAt, range))
        .sort((a, b) => a.clockInAt - b.clockInAt)
        .forEach((a) => {
          const u = users.find((x) => x.id === a.userId);
          rows.push([
            u?.name ?? a.userId,
            u?.role ?? '',
            teams.find((t) => t.id === u?.teamId)?.name ?? '',
            fmtDate(a.clockInAt),
            fmtTime(a.clockInAt),
            a.clockOutAt ? fmtTime(a.clockOutAt) : 'berlangsung',
            fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt),
            polylineKm(a.route).toFixed(2),
            a.geoFenceOk ? 'Ya' : 'Tidak',
            a.route.length,
          ]);
        });
      await exportCsv(`absensi_${periodLabel}_${stamp}`, toCsv(rows));
    });

  const exportVisits = () =>
    guardExport(async () => {
      const rows: Array<Array<string | number>> = [
        ['Tanggal', 'Agen', 'Merchant', 'Hasil', 'Check In', 'Check Out', 'Durasi', 'Jarak ke Merchant (m)', 'Geo Valid', 'Pemilik', 'Kontak', 'Foto (n)', 'Dokumen (n)'],
      ];
      visits
        .filter((v) => scopedUserIds.has(v.agentId) && inRange(v.checkInAt, range))
        .sort((a, b) => a.checkInAt - b.checkInAt)
        .forEach((v) => {
          const m = merchants.find((x) => x.id === v.merchantId);
          rows.push([
            fmtDate(v.checkInAt),
            users.find((u) => u.id === v.agentId)?.name ?? v.agentId,
            m?.name ?? v.merchantId,
            RESULT_LABEL[v.result] ?? v.result,
            fmtTime(v.checkInAt),
            v.checkOutAt ? fmtTime(v.checkOutAt) : '',
            v.checkOutAt ? fmtDurShort(v.checkOutAt - v.checkInAt) : 'berlangsung',
            v.merchantDistanceM ?? '',
            v.geoValid ? 'Ya' : 'Tidak',
            v.ownerName,
            v.contactPhone,
            v.photos.length,
            v.docs.length,
          ]);
        });
      await exportCsv(`kunjungan_${periodLabel}_${stamp}`, toCsv(rows));
    });

  /** Ekspor merchant berdasar status terkini (snapshot seluruh data tim) */
  const exportMerchantsByStatus = (statuses: string[], name: string) => () =>
    guardExport(async () => {
      const rows: Array<Array<string | number>> = [
        ['Nama Merchant', 'Status', 'Alamat', 'Telepon', 'Pemilik', 'Tier', 'Tim', 'Agen', 'Cold Start Complete', 'Tanggal Dibuat'],
      ];
      merchants
        .filter((m) => statuses.includes(m.status))
        .filter((m) => (MONITOR_ROLES.includes(me.role) ? true : m.teamId === me.teamId))
        .sort((a, b) => b.createdAt - a.createdAt)
        .forEach((m) => {
          rows.push([
            m.name,
            STATUS_LABEL[m.status],
            m.address,
            m.phone,
            m.ownerName ?? '',
            TIER_LABEL[m.cityTier],
            teams.find((t) => t.id === m.teamId)?.name ?? '',
            users.find((u) => u.id === m.assignedTo)?.name ?? 'Belum di-assign',
            m.coldStartDone ? 'Ya' : 'Belum',
            fmtDate(m.createdAt),
          ]);
        });
      await exportCsv(`${name}_${stamp}`, toCsv(rows));
    });

  // ---- Estimasi fee Option 3 untuk periode terpilih ----
  const billing = useMemo(() => {
    const doneVisits = visits.filter(
      (v) => scopedUserIds.has(v.agentId) && !!v.checkOutAt && inRange(v.checkOutAt, range),
    );
    let coldStartCount = 0;
    let activationCount = 0;
    doneVisits.forEach((v) => {
      if (v.result === 'cold_start_complete') coldStartCount++;
      else if (v.result === 'redemption') activationCount++;
    });
    const agents = [...scopedUserIds].filter((id) =>
      ['field_agent', 'team_lead'].includes(users.find((x) => x.id === id)?.role ?? ''),
    ).length;
    const tier =
      teamId !== 'all' ? (teams.find((t) => t.id === teamId)?.cityTier ?? 'tier1') : 'tier1';
    const rates = OPTION3[tier];
    const base = rates.baseMonthly * Math.max(1, agents);
    const caseFees =
      coldStartCount * rates.coldStartFee + activationCount * rates.activationFee;
    return {
      coldStartCount,
      activationCount,
      agents,
      base,
      caseFees,
      incentiveCap: base * INCENTIVE_CAP_PCT,
      rates,
    };
  }, [visits, scopedUserIds, users, range, teams, teamId]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <H>Laporan</H>
      <PeriodPicker period={period} month={month} onPeriod={setPeriod} onMonth={setMonth} />

      {MONITOR_ROLES.includes(me.role) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Semua Tim" active={teamId === 'all'} onPress={() => setTeamId('all')} />
          {teams.map((t) => (
            <Chip key={t.id} label={t.name} active={teamId === t.id} onPress={() => setTeamId(t.id)} />
          ))}
        </View>
      )}

      <Card>
        <H>Ekspor Absensi</H>
        <Muted style={{ marginTop: 2 }}>
          Rekap clock in/out, durasi kerja, jarak rute, dan kepatuhan geo-fence.
        </Muted>
        <View style={{ marginTop: 8 }}>
          <Btn small title="Unduh CSV Absensi" onPress={exportAttendance} />
        </View>
      </Card>

      <Card>
        <H>Ekspor Kunjungan</H>
        <Muted style={{ marginTop: 2 }}>
          Detail semua visit termasuk bukti foto/dokumen dan validitas geo.
        </Muted>
        <View style={{ marginTop: 8 }}>
          <Btn small title="Unduh CSV Kunjungan" onPress={exportVisits} />
        </View>
      </Card>

      <Card>
        <H>Ekspor Merchant</H>
        <Muted style={{ marginTop: 2 }}>
          Daftar merchant sesuai status terkini ({fmtNum(
            merchants.filter((m) => (MONITOR_ROLES.includes(me.role) ? true : m.teamId === me.teamId)).length,
          )} total di lingkup Anda).
        </Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Btn small variant="outline" title="Registered" onPress={exportMerchantsByStatus(['registered'], 'merchant_registered')} />
          <Btn small variant="outline" title="Activated" onPress={exportMerchantsByStatus(['activated'], 'merchant_activated')} />
          <Btn small variant="outline" title="Cold Start" onPress={exportMerchantsByStatus(['cold_start'], 'merchant_cold_start')} />
          <Btn small variant="outline" title="Semua Status" onPress={exportMerchantsByStatus(['cold_start', 'registered', 'activated'], 'merchant_semua')} />
        </View>
      </Card>

      {me.role === 'super_admin' && (
        <Card>
          <H>Estimasi Fee — Quotation Option 3</H>
          <Muted style={{ marginTop: 2 }}>
            Integrated Merchant Acquisition {'&'} Incubation · {billing.agents} agen aktif ·{' '}
            {teamId === 'all' ? 'semua tim (rate Tier 1)' : TIER_LABEL[teams.find((t) => t.id === teamId)?.cityTier ?? 'tier1']}
          </Muted>
          <View style={{ marginTop: 10, gap: 4 }}>
            <Line label={`Base fee (${billing.agents} agen)`} value={fmtIDR(billing.base)} />
            <Line
              label={`Success fee cold start × ${billing.coldStartCount}`}
              value={fmtIDR(billing.coldStartCount * billing.rates.coldStartFee)}
            />
            <Line
              label={`Success fee aktivasi × ${billing.activationCount}`}
              value={fmtIDR(billing.activationCount * billing.rates.activationFee)}
            />
            <Line label="Insentif (cap 50% base)" value={`max ${fmtIDR(billing.incentiveCap)}`} muted />
            <View style={{ height: 1, backgroundColor: C.border }} />
            <Line
              label="Total (belum termasuk insentif)"
              value={fmtIDR(billing.base + billing.caseFees)}
              bold
            />
          </View>
          <Muted style={{ marginTop: 6 }}>
            Estimasi memakai angka contoh quotation Option 3; angka final mengikuti kesepakatan komersial per tier kota.
          </Muted>
        </Card>
      )}
    </ScrollView>
  );
}
