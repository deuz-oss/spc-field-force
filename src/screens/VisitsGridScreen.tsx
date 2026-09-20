import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { PeriodPicker } from '../components/PeriodPicker';
import { Badge, Chip, GeoValidBadge, Input, ListRow } from '../components/ui';
import { RESULT_LABEL } from '../config';
import { C, F } from '../theme';
import { scopeUsers, useCurrentUser, useStore } from '../store/useStore';
import { Visit } from '../types';
import { getRange, inRange, PeriodKey } from '../utils/period';
import { fmtDate, fmtDurShort, fmtTime } from '../utils/format';
import { useBreakpoint } from '../utils/responsive';

/**
 * Manager-facing visits grid — mirrors AttendanceGridScreen (roadmap #28)
 * for the same visibility gap on visit data: super_admin/admin/team_lead/
 * client previously only had CSV export (ReportsScreen) for visit history,
 * no in-app query surface. field_agent keeps its own VisitsScreen unchanged.
 */
export default function VisitsGridScreen() {
  const me = useCurrentUser()!;
  const visits = useStore((s) => s.visits);
  const merchants = useStore((s) => s.merchants);
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const navigation = useNavigation<any>();
  const { isDesktop } = useBreakpoint();

  const [period, setPeriod] = useState<PeriodKey>('weekly');
  const [month, setMonth] = useState(new Date().getMonth());
  const [status, setStatus] = useState<'all' | 'open' | 'done'>('all');
  const [invalidOnly, setInvalidOnly] = useState(false);
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('checkInAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const range = useMemo(() => getRange(period, month), [period, month]);
  const scopeIds = useMemo(() => new Set(scopeUsers({ users }, me).map((u) => u.id)), [users, me]);

  const merchantName = (id: string) => merchants.find((m) => m.id === id)?.name ?? '(merchant terhapus)';
  const agentInfo = (id: string) => {
    const u = users.find((x) => x.id === id);
    return { name: u?.name ?? '-', team: teams.find((t) => t.id === u?.teamId)?.name ?? '-' };
  };

  const onSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const list = useMemo(() => {
    let l = visits.filter((v) => scopeIds.has(v.agentId) && inRange(v.checkInAt, range));
    if (status === 'open') l = l.filter((v) => !v.checkOutAt);
    if (status === 'done') l = l.filter((v) => !!v.checkOutAt);
    if (invalidOnly) l = l.filter((v) => !v.geoValid);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter(
        (v) => merchantName(v.merchantId).toLowerCase().includes(s) || agentInfo(v.agentId).name.toLowerCase().includes(s)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const durationMs = (v: Visit) => (v.checkOutAt ?? Date.now()) - v.checkInAt;
    const cmp: Record<string, (a: Visit, b: Visit) => number> = {
      checkInAt: (a, b) => a.checkInAt - b.checkInAt,
      merchant: (a, b) => merchantName(a.merchantId).localeCompare(merchantName(b.merchantId)),
      agent: (a, b) => agentInfo(a.agentId).name.localeCompare(agentInfo(b.agentId).name),
      duration: (a, b) => durationMs(a) - durationMs(b),
      geoValid: (a, b) => Number(a.geoValid) - Number(b.geoValid),
    };
    return [...l].sort((a, b) => dir * cmp[sortKey](a, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, scopeIds, range, status, invalidOnly, q, sortKey, sortDir, merchants, users, teams]);

  const invalidCount = list.filter((v) => !v.geoValid).length;

  const columns: DataTableColumn<Visit>[] = [
    {
      key: 'merchant',
      label: 'Merchant',
      sortable: true,
      flex: 1.4,
      render: (v) => merchantName(v.merchantId),
    },
    {
      key: 'agent',
      label: 'Agen',
      sortable: true,
      flex: 1.2,
      render: (v) => {
        const info = agentInfo(v.agentId);
        return (
          <View>
            <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: C.text }} numberOfLines={1}>
              {info.name}
            </Text>
            <Text style={{ fontSize: 11.5, color: C.muted }} numberOfLines={1}>
              {info.team}
            </Text>
          </View>
        );
      },
    },
    { key: 'checkInAt', label: 'Tanggal', sortable: true, width: 120, render: (v) => fmtDate(v.checkInAt) },
    {
      key: 'time',
      label: 'Masuk → Keluar',
      width: 150,
      render: (v) => `${fmtTime(v.checkInAt)} → ${v.checkOutAt ? fmtTime(v.checkOutAt) : '...'}`,
    },
    {
      key: 'duration',
      label: 'Durasi',
      sortable: true,
      width: 90,
      mono: true,
      render: (v) => fmtDurShort((v.checkOutAt ?? Date.now()) - v.checkInAt),
    },
    {
      key: 'result',
      label: 'Hasil',
      width: 160,
      render: (v) => <Badge label={v.checkOutAt ? RESULT_LABEL[v.result] ?? v.result : 'Berlangsung'} color={v.checkOutAt ? C.info : C.warn} />,
    },
    {
      key: 'geoValid',
      label: 'Geo-fence',
      sortable: true,
      width: 130,
      render: (v) => <GeoValidBadge ok={v.geoValid} okLabel="Geo valid" badLabel={`${v.merchantDistanceM ?? '?'}m`} />,
    },
  ];

  const filterBar = (
    <View style={{ gap: 8 }}>
      <PeriodPicker period={period} month={month} onPeriod={setPeriod} onMonth={setMonth} />
      <Input placeholder="Cari nama merchant/agen..." value={q} onChangeText={setQ} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Chip label="Semua" active={status === 'all'} onPress={() => setStatus('all')} />
        <Chip label="Berlangsung" active={status === 'open'} onPress={() => setStatus('open')} />
        <Chip label="Selesai" active={status === 'done'} onPress={() => setStatus('done')} />
        <Chip
          label={`Geo invalid saja${invalidCount ? ` (${invalidCount})` : ''}`}
          active={invalidOnly}
          onPress={() => setInvalidOnly((v) => !v)}
          color={C.accent}
        />
        <Text style={{ color: C.muted, fontSize: 11.5 }}>{list.length} kunjungan ditemukan</Text>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <ScrollView
        tabIndex={0}
        role="main"
        contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 1180, width: '100%', alignSelf: 'center' }}
      >
        {filterBar}
        <DataTable
          columns={columns}
          data={list}
          keyExtractor={(v) => v.id}
          onRowPress={(v) => navigation.navigate('VisitFlow', { visitId: v.id })}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          emptyText="Tidak ada kunjungan pada periode ini."
        />
      </ScrollView>
    );
  }

  return (
    <View role="main" style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>{filterBar}</View>
      <FlatList
        data={list}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        renderItem={({ item: v }) => {
          const info = agentInfo(v.agentId);
          return (
            <ListRow
              onPress={() => navigation.navigate('VisitFlow', { visitId: v.id })}
              title={merchantName(v.merchantId)}
              subtitle={
                `${fmtDate(v.checkInAt)} · ${fmtTime(v.checkInAt)} → ${v.checkOutAt ? fmtTime(v.checkOutAt) : '...'}` +
                (v.checkOutAt ? ` · ${fmtDurShort(v.checkOutAt - v.checkInAt)}` : '') +
                ` · ${info.name}`
              }
              meta={info.team}
              trailing={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge
                    label={v.checkOutAt ? RESULT_LABEL[v.result] ?? v.result : 'Berlangsung'}
                    color={v.checkOutAt ? C.info : C.warn}
                  />
                  <GeoValidBadge ok={v.geoValid} okLabel="Geo valid" badLabel={`${v.merchantDistanceM ?? '?'}m`} />
                </View>
              }
              emphasis={{ color: v.checkOutAt ? C.muted : C.warn, label: v.checkOutAt ? 'Selesai' : 'Sedang berlangsung' }}
            />
          );
        }}
      />
    </View>
  );
}
