import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { PeriodPicker } from '../components/PeriodPicker';
import { Chip, GeoValidBadge, Input, ListRow } from '../components/ui';
import { C, F } from '../theme';
import { scopeUsers, useCurrentUser, useStore } from '../store/useStore';
import { Attendance } from '../types';
import { getRange, inRange, PeriodKey } from '../utils/period';
import { fmtDate, fmtDurShort, fmtKm, fmtTime } from '../utils/format';
import { polylineKm } from '../utils/geo';
import { useBreakpoint } from '../utils/responsive';

/**
 * Manager-facing attendance/exceptions grid — closes the gap flagged by the
 * Data Grid UX audit: super_admin/admin/team_lead/client had no in-app way
 * to review attendance across the team, only Live Map (active sessions
 * only), a per-agent aggregate drill-down on the Dashboard, or CSV export.
 * This is a real query surface: date range + exception filter + search,
 * sortable, built on the same DataTable used for Merchant.
 */
export default function AttendanceGridScreen() {
  const me = useCurrentUser()!;
  const attendances = useStore((s) => s.attendances);
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const navigation = useNavigation<any>();
  const { isDesktop } = useBreakpoint();

  const [period, setPeriod] = useState<PeriodKey>('weekly');
  const [month, setMonth] = useState(new Date().getMonth());
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('clockInAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const range = useMemo(() => getRange(period, month), [period, month]);
  const scopeIds = useMemo(() => new Set(scopeUsers({ users }, me).map((u) => u.id)), [users, me]);

  const userInfo = (id: string) => {
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
    let l = attendances.filter((a) => scopeIds.has(a.userId) && inRange(a.clockInAt, range));
    if (exceptionsOnly) l = l.filter((a) => !a.geoFenceOk);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter((a) => userInfo(a.userId).name.toLowerCase().includes(s));
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const durationMs = (a: Attendance) => (a.clockOutAt ?? Date.now()) - a.clockInAt;
    const cmp: Record<string, (a: Attendance, b: Attendance) => number> = {
      clockInAt: (a, b) => a.clockInAt - b.clockInAt,
      agent: (a, b) => userInfo(a.userId).name.localeCompare(userInfo(b.userId).name),
      duration: (a, b) => durationMs(a) - durationMs(b),
      distance: (a, b) => polylineKm(a.route) - polylineKm(b.route),
      geoFenceOk: (a, b) => Number(a.geoFenceOk) - Number(b.geoFenceOk),
    };
    return [...l].sort((a, b) => dir * cmp[sortKey](a, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendances, scopeIds, range, exceptionsOnly, q, sortKey, sortDir, users, teams]);

  const exceptionCount = list.filter((a) => !a.geoFenceOk).length;

  const columns: DataTableColumn<Attendance>[] = [
    {
      key: 'agent',
      label: 'Agen',
      sortable: true,
      flex: 1.6,
      render: (a) => {
        const info = userInfo(a.userId);
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
    { key: 'clockInAt', label: 'Tanggal', sortable: true, width: 120, render: (a) => fmtDate(a.clockInAt) },
    {
      key: 'time',
      label: 'Masuk → Keluar',
      width: 150,
      render: (a) => `${fmtTime(a.clockInAt)} → ${a.clockOutAt ? fmtTime(a.clockOutAt) : '...'}`,
    },
    {
      key: 'duration',
      label: 'Durasi',
      sortable: true,
      width: 90,
      mono: true,
      render: (a) => fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt),
    },
    {
      key: 'distance',
      label: 'Jarak',
      sortable: true,
      width: 90,
      mono: true,
      render: (a) => fmtKm(polylineKm(a.route)),
    },
    {
      key: 'geoFenceOk',
      label: 'Geo-fence',
      sortable: true,
      width: 130,
      render: (a) => <GeoValidBadge ok={a.geoFenceOk} okLabel="OK" badLabel="Exception" />,
    },
  ];

  const filterBar = (
    <View style={{ gap: 8 }}>
      <PeriodPicker period={period} month={month} onPeriod={setPeriod} onMonth={setMonth} />
      <Input placeholder="Cari nama agen..." value={q} onChangeText={setQ} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Chip
          label={`Exception saja${exceptionCount ? ` (${exceptionCount})` : ''}`}
          active={exceptionsOnly}
          onPress={() => setExceptionsOnly((v) => !v)}
          color={C.accent}
        />
        <Text style={{ color: C.muted, fontSize: 11.5 }}>{list.length} sesi ditemukan</Text>
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
          keyExtractor={(a) => a.id}
          onRowPress={(a) => navigation.navigate('AttendanceDetail', { id: a.id })}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          emptyText="Tidak ada data absensi pada periode ini."
        />
      </ScrollView>
    );
  }

  return (
    <View role="main" style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>{filterBar}</View>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        renderItem={({ item: a }) => {
          const info = userInfo(a.userId);
          return (
            <ListRow
              onPress={() => navigation.navigate('AttendanceDetail', { id: a.id })}
              title={info.name}
              subtitle={`${fmtDate(a.clockInAt)} · ${fmtTime(a.clockInAt)} → ${a.clockOutAt ? fmtTime(a.clockOutAt) : '...'} · ${fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt)}`}
              meta={`${info.team} · ${fmtKm(polylineKm(a.route))}`}
              trailing={<GeoValidBadge ok={a.geoFenceOk} okLabel="OK" badLabel="Exception" />}
            />
          );
        }}
      />
    </View>
  );
}
