import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PeriodPicker } from '../components/PeriodPicker';
import { Badge, Btn, Card, Empty, H, Muted, MiniBar, StatCard } from '../components/ui';
import { showDialog } from '../components/dialog';
import { C, STATUS_COLOR } from '../theme';
import { MONITOR_ROLES } from '../config';
import { useCurrentUser, useStore } from '../store/useStore';
import { MerchantStatus, User } from '../types';
import { fmtDurClock, fmtDurShort, fmtKm, MONTHS_ID } from '../utils/format';
import { getCurrentCoords } from '../utils/location';
import { haversineM, polylineKm } from '../utils/geo';
import { getRange, inRange, PeriodKey } from '../utils/period';
import {
  AgentStat,
  computeStat,
  FUNNEL_STEPS,
  funnelCounts,
  SortKey,
  sortVal,
  statusOf,
  TARGETS,
} from '../utils/kpi';

/** Kartu absensi di halaman utama (selain client & super admin) */
function ClockCard({ me }: { me: User }) {
  const attendances = useStore((s) => s.attendances);
  const teams = useStore((s) => s.teams);
  const clockInStore = useStore((s) => s.clockIn);
  const clockOutStore = useStore((s) => s.clockOut);

  const active = attendances.find((a) => a.userId === me.id && !a.clockOutAt);
  const team = teams.find((t) => t.id === me.teamId);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active && active.id]);

  const doClockIn = async () => {
    setBusy(true);
    try {
      const c = await getCurrentCoords();
      if (!c) {
        showDialog('Izin lokasi diperlukan', 'Absensi membutuhkan izin lokasi.');
        return;
      }
      let ok = true;
      let distM: number | null = null;
      if (team) {
        distM = Math.round(haversineM(team, c));
        ok = distM <= team.radiusKm * 1000;
      }
      if (!ok && team && distM != null) {
        showDialog(
          'Di luar Geo-fence',
          `Anda ${(distM / 1000).toFixed(1)} km dari pusat tim ${team.name} (radius ${team.radiusKm} km).`,
          [
            { label: 'Batal' },
            {
              label: 'Clock In sebagai pengecualian',
              destructive: true,
              onPress: () => clockInStore(c, false),
            },
          ],
        );
        return;
      }
      clockInStore(c, ok);
    } finally {
      setBusy(false);
    }
  };

  const doClockOut = async () => {
    setBusy(true);
    try {
      const c = await getCurrentCoords();
      clockOutStore(
        c ??
          (active
            ? active.route[active.route.length - 1] ?? {
                lat: active.clockInLat,
                lng: active.clockInLng,
              }
            : { lat: 0, lng: 0 }),
      );
      showDialog('Clock Out berhasil');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>Absensi</H>
        {active && (
          <Badge
            label={active.geoFenceOk ? 'Dalam geo-fence' : 'Pengecualian geo-fence'}
            color={active.geoFenceOk ? C.ok : C.accent}
          />
        )}
      </View>
      {!active ? (
        <>
          <Muted style={{ marginTop: 4 }}>
            Tekan CLOCK IN untuk memulai sesi. Rute pergerakan direkam otomatis sampai CLOCK OUT.
          </Muted>
          <View style={{ marginTop: 10 }}>
            <Btn title="CLOCK IN" onPress={doClockIn} disabled={busy} />
          </View>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.primary, marginTop: 4 }}>
            {fmtDurClock(now - active.clockInAt)}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
            Masuk pukul{' '}
            {new Date(active.clockInAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            · {fmtKm(polylineKm(active.route))} · {active.route.length} titik rute
          </Text>
          <Btn title="CLOCK OUT" variant="danger" onPress={doClockOut} disabled={busy} />
        </>
      )}
    </Card>
  );
}

export default function DashboardScreen() {
  const me = useCurrentUser()!;
  const users = useStore((s) => s.users);
  const merchants = useStore((s) => s.merchants);
  const visits = useStore((s) => s.visits);
  const attendances = useStore((s) => s.attendances);
  const teams = useStore((s) => s.teams);

  const [period, setPeriod] = useState<PeriodKey>('daily');
  const [month, setMonth] = useState(new Date().getMonth());
  const [sortKey, setSortKey] = useState<SortKey>('visits');
  const [openAgent, setOpenAgent] = useState<string | null>(null);

  const range = useMemo(() => getRange(period, month), [period, month]);
  const scopeIds = useMemo(
    () =>
      new Set(
        (me.role === 'team_lead'
          ? users.filter((u) => u.active && u.teamId === me.teamId)
          : me.role === 'field_agent'
          ? users.filter((u) => u.id === me.id)
          : users.filter((u) => u.active) // super_admin, admin, client
        ).map((u) => u.id),
      ),
    [users, me],
  );

  const periodVisits = visits.filter((v) => scopeIds.has(v.agentId) && inRange(v.checkInAt, range));
  const periodAtt = attendances.filter((a) => scopeIds.has(a.userId) && inRange(a.clockInAt, range));
  const hoursMs = periodAtt.reduce((t, a) => t + ((a.clockOutAt ?? Date.now()) - a.clockInAt), 0);
  const km = periodAtt.reduce((t, a) => t + polylineKm(a.route), 0);
  const activeAgents = new Set(periodAtt.map((a) => a.userId)).size;
  const fenceOk = periodAtt.filter((a) => a.geoFenceOk).length;
  const fencePct = periodAtt.length ? Math.round((fenceOk / periodAtt.length) * 100) : null;

  const merchantScopeList = MONITOR_ROLES.includes(me.role)
    ? merchants
    : me.role === 'team_lead'
    ? merchants.filter((m) => m.teamId === me.teamId)
    : merchants.filter((m) => m.assignedTo === me.id);
  const newMerchants = merchantScopeList.filter((m) => inRange(m.createdAt, range));
  const byStatus = (st: MerchantStatus) =>
    newMerchants.filter((m) => m.status === st).length;

  // snapshot seluruh periode
  const snap = {
    cold_start: merchantScopeList.filter((m) => m.status === 'cold_start').length,
    registered: merchantScopeList.filter((m) => m.status === 'registered').length,
    activated: merchantScopeList.filter((m) => m.status === 'activated').length,
  };

  // kelompok performa: agen → individu, TL → timnya, admin/super_admin/client → per tim & TL
  const kpiGroups = useMemo(() => {
    if (me.role === 'field_agent') {
      return [{ title: 'Performa Saya', agents: users.filter((u) => u.id === me.id) }];
    }
    if (me.role === 'team_lead') {
      return [
        {
          title: `Tim ${teams.find((t) => t.id === me.teamId)?.name ?? '-'} · Team Lead: ${me.name}`,
          agents: users.filter(
            (u) => u.active && u.role === 'field_agent' && u.teamId === me.teamId,
          ),
        },
      ];
    }
    return teams
      .map((t) => {
        const agents = users.filter(
          (u) => u.active && u.role === 'field_agent' && u.teamId === t.id,
        );
        const tlName =
          users.find((u) => u.role === 'team_lead' && u.active && u.teamId === t.id)?.name ??
          'Belum ada TL';
        return { title: `${t.name} · TL: ${tlName}`, agents };
      })
      .filter((g) => g.agents.length > 0);
  }, [me, users, teams]);

  const kpiStats = useMemo<AgentStat[]>(
    () =>
      kpiGroups.flatMap((g) =>
        g.agents.map((u) => computeStat(u.id, u.name, attendances, visits, merchants, range)),
      ),
    [kpiGroups, attendances, visits, merchants, range],
  );

  // funnel tim (seluruh lingkup) untuk ringkasan onboarding
  const teamFunnel = useMemo(
    () => funnelCounts(periodVisits),
    [periodVisits],
  );

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const teamName =
    me.role === 'field_agent'
      ? teams.find((t) => t.id === me.teamId)?.name
      : me.role === 'team_lead'
      ? `Tim ${teams.find((t) => t.id === me.teamId)?.name}`
      : 'Seluruh Tim';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View>
        <H style={{ fontSize: 18 }}>Dashboard</H>
        <Muted>
          {teamName} ·{' '}
          {period === 'monthly'
            ? MONTHS_ID[month]
            : period === 'daily'
            ? 'Hari ini'
            : period === 'weekly'
            ? 'Minggu ini'
            : 'Semua waktu'}
        </Muted>
      </View>

      {me.role !== 'client' && me.role !== 'super_admin' && <ClockCard me={me} />}

      <PeriodPicker period={period} month={month} onPeriod={setPeriod} onMonth={setMonth} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatCard title="Kunjungan" value={String(periodVisits.length)} sub="check-in merchant" />
        <StatCard
          title="Jam Kerja"
          value={fmtDurShort(hoursMs)}
          sub={`${activeAgents} orang on-duty`}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatCard title="Jarak Tempuh" value={fmtKm(km)} sub="dari tracking rute" color={C.info} />
        <StatCard
          title="Merchant Baru"
          value={String(newMerchants.length)}
          sub={`CS ${byStatus('cold_start')} · Reg ${byStatus('registered')} · Act ${byStatus('activated')}`}
          color={C.ok}
        />
      </View>

      <Card>
        <H>Kepatuhan Geo-fence Absensi</H>
        <Muted style={{ marginTop: 4 }}>
          {fencePct == null ? 'Belum ada absensi pada periode ini.' : `${fencePct}% clock-in dalam geo-fence tim (${fenceOk}/${periodAtt.length}).`}
        </Muted>
      </Card>

      <Card>
        <H>Snapshot Merchant</H>
        <Muted style={{ marginTop: 2 }}>Status terkini (seluruh periode)</Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <StatCard title="Cold Start" value={String(snap.cold_start)} color={C.warn} />
          <StatCard title="Registered" value={String(snap.registered)} color={C.info} />
          <StatCard title="Activated" value={String(snap.activated)} color={C.ok} />
        </View>
      </Card>

      <Card>
        <H>Funnel Onboarding Merchant</H>
        <Muted style={{ marginTop: 2 }}>
          Alur BD Field Merchant Onboarding sesuai RFP (jangkauan kumulatif periode ini)
        </Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {FUNNEL_STEPS.map((step, i) => (
            <Badge
              key={step}
              label={`${step} ${teamFunnel[i]}`}
              color={i === 0 ? C.muted : i >= 5 ? C.ok : C.info}
            />
          ))}
        </View>
      </Card>

      <Card>
        <H>Performance KPI</H>
        <Muted style={{ marginTop: 2 }}>
          Target RFP: kerja 8 jam/hari · on-site ≥6 jam/hari · geo-fence ≥{TARGETS.fencePct}% · route check-in ≥
          {TARGETS.routePct}% · valid visit ≥{TARGETS.validVisitPct}% (geofence + durasi ≥
          {TARGETS.minStayMinutes} mnt + bukti foto). Ketuk agen untuk rincian.
        </Muted>

        {kpiStats.length > 1 && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            <SortChip label="Urut Kunjungan" active={sortKey === 'visits'} onPress={() => setSortKey('visits')} />
            <SortChip label="Jam Kerja" active={sortKey === 'hours'} onPress={() => setSortKey('hours')} />
            <SortChip label="Aktivasi" active={sortKey === 'activated'} onPress={() => setSortKey('activated')} />
          </View>
        )}

        {kpiGroups.map((g) => {
          const stats = g.agents
            .map((u) => kpiStats.find((s) => s.userId === u.id))
            .filter((s): s is AgentStat => !!s)
            .sort((a, b) => sortVal(b, sortKey) - sortVal(a, sortKey));
          return (
            <View key={g.title} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted }}>{g.title}</Text>
              {stats.length === 0 ? (
                <Empty text="Belum ada anggota." />
              ) : (
                stats.map((s) => {
                  const st = statusOf(s);
                  const open = openAgent === s.userId;
                  return (
                    <TouchableOpacity
                      key={s.userId}
                      activeOpacity={0.7}
                      onPress={() => setOpenAgent(open ? null : s.userId)}
                      style={{
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: open ? C.primary : C.divider,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: open ? C.surfaceAlt : C.card,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '700', color: C.text, flexShrink: 1 }} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Badge label={st.label} color={st.color} />
                      </View>
                      <Muted style={{ marginTop: 4 }}>
                        {s.visits} kunjungan · {fmtDurShort(s.workMs)} kerja · {fmtKm(s.km)} · {s.days} hari hadir ·{' '}
                        {s.distinctMerchants}/{s.assignedTotal} merchant ter-assign
                      </Muted>

                      {open && (
                        <View style={{ marginTop: 10 }}>
                          <MiniBar
                            label={`Working hours/hari — ${fmtDurShort(s.avgWorkMsDay)} (target ${TARGETS.workHoursDay} j)`}
                            value={Math.min(100, Math.round((100 * s.avgWorkMsDay) / (TARGETS.workHoursDay * 3600000)))}
                            max={100}
                            suffix="%"
                            color={passFailColor(s.workMs >= s.targetWorkMs * 0.75)}
                          />
                          <MiniBar
                            label={`On-site outreach/hari — ${fmtDurShort(s.avgOnsiteMsDay)} (target ≥${TARGETS.onsiteHoursDay} j)`}
                            value={Math.min(100, Math.round((100 * s.avgOnsiteMsDay) / (TARGETS.onsiteHoursDay * 3600000)))}
                            max={100}
                            suffix="%"
                            color={passFailColor(s.onSiteMs >= s.targetOnsiteMs * 0.6)}
                          />
                          <MiniBar
                            label={`Geo-fence compliance${s.fencePct == null ? ' (tanpa absensi)' : ` — ${s.fencePct}%`}`}
                            value={s.fencePct ?? 0}
                            max={100}
                            suffix="%"
                            color={passFailColor(s.fencePct != null && s.fencePct >= TARGETS.fencePct)}
                          />
                          <MiniBar
                            label={`Route check-in completion${s.routeCompletionPct == null ? ' (belum ada assign)' : ` — ${s.routeCompletionPct}%`}`}
                            value={s.routeCompletionPct ?? 0}
                            max={100}
                            suffix="%"
                            color={passFailColor(
                              s.routeCompletionPct != null && s.routeCompletionPct >= TARGETS.routePct,
                            )}
                          />
                          <MiniBar
                            label={`Valid visit${s.validVisitPct == null ? ' (belum ada kunjungan)' : ` — ${s.validVisitPct}%`}`}
                            value={s.validVisitPct ?? 0}
                            max={100}
                            suffix="%"
                            color={passFailColor(
                              s.validVisitPct != null && s.validVisitPct >= TARGETS.validVisitPct,
                            )}
                          />

                          <Muted style={{ marginTop: 12, fontWeight: '600' }}>Funnel individu:</Muted>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {FUNNEL_STEPS.map((step, i) => (
                              <Badge
                                key={step}
                                label={`${shortStep(step)} ${s.funnel[i]}`}
                                color={i === 0 ? C.muted : i >= 5 ? C.ok : C.info}
                              />
                            ))}
                          </View>

                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                            <Badge label={`${s.days} hari hadir`} color={C.teal} />
                            <Badge label={`${s.km.toLocaleString('id-ID')} km rute`} color={C.purple} />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

function passFailColor(ok: boolean): string {
  return ok ? C.ok : C.accent;
}

function shortStep(step: string): string {
  const map: Record<string, string> = {
    Kunjungan: 'Visit',
    'Connect WA': 'WA',
    Registered: 'Reg',
    'Qualif. Lolos': 'Qual',
    'Upload Produk': 'Produk',
    Redemption: 'Redeem',
    'Cold Start Selesai': 'CS',
  };
  return map[step] ?? step;
}

function SortChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? C.primary : C.card,
        borderWidth: 1,
        borderColor: active ? C.primary : C.border,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : C.text }}>{label}</Text>
    </TouchableOpacity>
  );
}
