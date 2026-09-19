import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PeriodPicker } from '../components/PeriodPicker';
import {
  Badge,
  Btn,
  Card,
  Empty,
  FunnelChart,
  H,
  KPICard,
  ListRow,
  Muted,
  MiniBar,
  SectionHeader,
  StatusBadge,
} from '../components/ui';
import { showDialog } from '../components/dialog';
import { C, STATUS_COLOR, T } from '../theme';
import { STATUS_LABEL } from '../config';
import { merchantScope, scopeUsers, useCurrentUser, useStore } from '../store/useStore';
import { Merchant, MerchantStatus, User } from '../types';
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
              onPress: async () => {
                try {
                  await clockInStore(c, false);
                } catch {
                  showDialog('Gagal Clock In', 'Tidak dapat menyimpan absensi ke server. Periksa koneksi internet dan coba lagi.');
                }
              },
            },
          ],
        );
        return;
      }
      await clockInStore(c, ok);
    } catch {
      showDialog('Gagal Clock In', 'Tidak dapat menyimpan absensi ke server. Periksa koneksi internet dan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const doClockOut = async () => {
    setBusy(true);
    try {
      const c = await getCurrentCoords();
      await clockOutStore(
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
          <StatusBadge
            label={active.geoFenceOk ? 'Dalam geo-fence' : 'Pengecualian geo-fence'}
            color={active.geoFenceOk ? C.ok : C.accent}
            icon={active.geoFenceOk ? 'shield-checkmark' : 'warning'}
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
          <Text style={[T.display, { color: C.primary, marginTop: 4 }]}>{fmtDurClock(now - active.clockInAt)}</Text>
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
    () => new Set(scopeUsers({ users }, me).map((u) => u.id)),
    [users, me],
  );

  const periodVisits = visits.filter((v) => scopeIds.has(v.agentId) && inRange(v.checkInAt, range));
  const periodAtt = attendances.filter((a) => scopeIds.has(a.userId) && inRange(a.clockInAt, range));
  const hoursMs = periodAtt.reduce((t, a) => t + ((a.clockOutAt ?? Date.now()) - a.clockInAt), 0);
  const km = periodAtt.reduce((t, a) => t + polylineKm(a.route), 0);
  const activeAgents = new Set(periodAtt.map((a) => a.userId)).size;
  const fenceOk = periodAtt.filter((a) => a.geoFenceOk).length;
  const fencePct = periodAtt.length ? Math.round((fenceOk / periodAtt.length) * 100) : null;

  const closedVisits = periodVisits.filter((v) => v.checkOutAt);
  const minStayMs = TARGETS.minStayMinutes * 60000;
  const validVisitCount = closedVisits.filter(
    (v) => v.geoValid && v.photos.length > 0 && (v.checkOutAt ?? 0) - v.checkInAt >= minStayMs,
  ).length;
  const validVisitPct = closedVisits.length ? Math.round((100 * validVisitCount) / closedVisits.length) : null;

  const merchantScopeList = merchantScope({ merchants }, me);
  const newMerchants = merchantScopeList.filter((m) => inRange(m.createdAt, range));
  const byStatus = (st: MerchantStatus) => newMerchants.filter((m) => m.status === st).length;

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

  const exceptions = useMemo(
    () => kpiStats.filter((s) => s.days > 0 && statusOf(s).label !== 'On Track'),
    [kpiStats],
  );

  // funnel tim (seluruh lingkup) untuk ringkasan onboarding
  const teamFunnel = useMemo(() => funnelCounts(periodVisits), [periodVisits]);
  const funnelData = FUNNEL_STEPS.map((label, i) => ({ label, value: teamFunnel[i] }));

  const teamName =
    me.role === 'field_agent'
      ? teams.find((t) => t.id === me.teamId)?.name
      : me.role === 'team_lead'
      ? `Tim ${teams.find((t) => t.id === me.teamId)?.name}`
      : 'Seluruh Tim';

  const periodLabel =
    period === 'monthly' ? MONTHS_ID[month] : period === 'daily' ? 'Hari ini' : period === 'weekly' ? 'Minggu ini' : 'Semua waktu';

  const headerAndPeriod = (
    <>
      <View>
        <H style={{ fontSize: 18 }}>Dashboard</H>
        <Muted>
          {teamName} · {periodLabel}
        </Muted>
      </View>
      <PeriodPicker period={period} month={month} onPeriod={setPeriod} onMonth={setMonth} />
    </>
  );

  if (me.role === 'field_agent') {
    return (
      <FieldAgentDashboard
        me={me}
        merchantScopeList={merchantScopeList}
        header={headerAndPeriod}
        stat={kpiStats[0]}
        funnelData={funnelData}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 1180, width: '100%', alignSelf: 'center' }}>
      {headerAndPeriod}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <KPICard
          title="Agen Aktif"
          value={`${activeAgents}/${scopeIds.size}`}
          target="dari total agen di lingkup"
          status={scopeIds.size === 0 ? 'neutral' : activeAgents / Math.max(1, scopeIds.size) >= 0.8 ? 'ok' : 'warn'}
        />
        <KPICard
          title="Geo-fence Compliance"
          value={fencePct == null ? '—' : `${fencePct}%`}
          target={`Target ≥${TARGETS.fencePct}%`}
          status={fencePct == null ? 'neutral' : fencePct >= TARGETS.fencePct ? 'ok' : fencePct >= TARGETS.fencePct - 10 ? 'warn' : 'danger'}
          statusLabel={fencePct == null ? 'Belum ada absensi' : undefined}
        />
        <KPICard
          title="Kunjungan"
          value={String(periodVisits.length)}
          target={`${fmtDurShort(hoursMs)} jam kerja tim`}
          status="neutral"
        />
        <KPICard
          title="Valid Visit"
          value={validVisitPct == null ? '—' : `${validVisitPct}%`}
          target={`Target ≥${TARGETS.validVisitPct}%`}
          status={validVisitPct == null ? 'neutral' : validVisitPct >= TARGETS.validVisitPct ? 'ok' : 'warn'}
          statusLabel={validVisitPct == null ? 'Belum ada kunjungan selesai' : undefined}
        />
        <KPICard
          title="Merchant Activated"
          value={String(snap.activated)}
          target={`dari ${merchantScopeList.length} merchant · +${byStatus('activated')} periode ini`}
          status="ok"
        />
      </View>

      {exceptions.length > 0 && (
        <Card>
          <SectionHeader title="Perlu Perhatian" subtitle={`${exceptions.length} agen di bawah target periode ini`} />
          <View style={{ gap: 8, marginTop: 10 }}>
            {exceptions.slice(0, 6).map((s) => {
              const st = statusOf(s);
              return (
                <TouchableOpacity key={s.userId} onPress={() => setOpenAgent(s.userId)} activeOpacity={0.7}>
                  <ListRow
                    title={s.name}
                    subtitle={`${s.visits} kunjungan · ${fmtDurShort(s.workMs)} kerja · ${s.days} hari hadir`}
                    trailing={<StatusBadge label={st.label} color={st.color} icon={st.label === 'Di Bawah Target' ? 'close-circle' : 'alert-circle'} />}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      )}

      <Card>
        <SectionHeader
          title="Funnel Onboarding Merchant"
          subtitle="Alur BD Field Merchant Onboarding sesuai RFP (jangkauan kumulatif periode ini)"
        />
        <View style={{ marginTop: 12 }}>
          <FunnelChart steps={funnelData} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Snapshot Merchant" subtitle="Status terkini (seluruh periode)" />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <KPICard title="Cold Start" value={String(snap.cold_start)} status="warn" statusLabel="Perlu di-visit" />
          <KPICard title="Registered" value={String(snap.registered)} status="neutral" statusLabel="Dalam proses" />
          <KPICard title="Activated" value={String(snap.activated)} status="ok" statusLabel="Selesai" />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Performance KPI"
          subtitle={`Target RFP: kerja 8j/hari · on-site ≥6j/hari · geo-fence ≥${TARGETS.fencePct}% · route ≥${TARGETS.routePct}% · valid visit ≥${TARGETS.validVisitPct}%. Ketuk agen untuk rincian.`}
        />

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
                <View style={{ gap: 8, marginTop: 6 }}>
                  {stats.map((s) => {
                    const st = statusOf(s);
                    const open = openAgent === s.userId;
                    return (
                      <View key={s.userId}>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => setOpenAgent(open ? null : s.userId)}>
                          <ListRow
                            title={s.name}
                            subtitle={`${s.visits} kunjungan · ${fmtDurShort(s.workMs)} kerja · ${fmtKm(s.km)} · ${s.days} hari hadir · ${s.distinctMerchants}/${s.assignedTotal} merchant`}
                            trailing={
                              <StatusBadge
                                label={st.label}
                                color={st.color}
                                icon={st.label === 'On Track' ? 'checkmark-circle' : st.label === 'Perlu Perhatian' ? 'alert-circle' : st.label === 'Tanpa Absensi' ? 'remove-circle-outline' : 'close-circle'}
                              />
                            }
                          />
                        </TouchableOpacity>

                        {open && (
                          <Card style={{ marginTop: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
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
                              color={passFailColor(s.routeCompletionPct != null && s.routeCompletionPct >= TARGETS.routePct)}
                            />
                            <MiniBar
                              label={`Valid visit${s.validVisitPct == null ? ' (belum ada kunjungan)' : ` — ${s.validVisitPct}%`}`}
                              value={s.validVisitPct ?? 0}
                              max={100}
                              suffix="%"
                              color={passFailColor(s.validVisitPct != null && s.validVisitPct >= TARGETS.validVisitPct)}
                            />

                            <Muted style={{ marginTop: 12, fontWeight: '600' }}>Funnel individu:</Muted>
                            <View style={{ marginTop: 8 }}>
                              <FunnelChart steps={FUNNEL_STEPS.map((label, i) => ({ label: shortStep(label), value: s.funnel[i] }))} />
                            </View>
                          </Card>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

/** Dashboard Field Agent — fokus "apa yang harus saya kerjakan hari ini", bukan analitik tim. */
function FieldAgentDashboard({
  me,
  merchantScopeList,
  header,
  stat,
  funnelData,
}: {
  me: User;
  merchantScopeList: Merchant[];
  header: React.ReactNode;
  stat?: AgentStat;
  funnelData: Array<{ label: string; value: number }>;
}) {
  const navigation = useNavigation<any>();

  const priority = useMemo(() => {
    const rank: Record<MerchantStatus, number> = { cold_start: 0, registered: 1, activated: 2 };
    return [...merchantScopeList].sort((a, b) => rank[a.status] - rank[b.status]).slice(0, 5);
  }, [merchantScopeList]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {header}

      <ClockCard me={me} />

      {stat && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <KPICard title="Kunjungan" value={String(stat.visits)} target="periode ini" status="neutral" />
          <KPICard
            title="Valid Visit"
            value={stat.validVisitPct == null ? '—' : `${stat.validVisitPct}%`}
            target={`Target ≥${TARGETS.validVisitPct}%`}
            status={stat.validVisitPct == null ? 'neutral' : stat.validVisitPct >= TARGETS.validVisitPct ? 'ok' : 'warn'}
            statusLabel={stat.validVisitPct == null ? 'Belum ada kunjungan selesai' : undefined}
          />
        </View>
      )}

      <Card>
        <SectionHeader
          title="Merchant Prioritas"
          subtitle="Merchant ter-assign ke Anda, cold start didahulukan"
          action={{ label: 'Lihat semua', onPress: () => navigation.navigate('Merchant') }}
        />
        {priority.length === 0 ? (
          <Empty text="Belum ada merchant yang di-assign ke Anda." />
        ) : (
          <View style={{ gap: 8, marginTop: 10 }}>
            {priority.map((m) => (
              <ListRow
                key={m.id}
                title={m.name}
                subtitle={m.address}
                onPress={() => navigation.navigate('MerchantDetail', { merchantId: m.id })}
                trailing={<Badge label={STATUS_LABEL[m.status]} color={STATUS_COLOR[m.status]} />}
              />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader title="Funnel Onboarding Saya" subtitle="Jangkauan kumulatif periode ini" />
        <View style={{ marginTop: 10 }}>
          <FunnelChart steps={funnelData} />
        </View>
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
