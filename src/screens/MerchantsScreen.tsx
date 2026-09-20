import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge, Btn, Chip, Empty, Input, ListRow, IconButton } from '../components/ui';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { showDialog } from '../components/dialog';
import { STATUS_LABEL, TIER_LABEL, MANAGER_ROLES } from '../config';
import { C, F, STATUS_COLOR } from '../theme';
import { useBreakpoint } from '../utils/responsive';
import { merchantScope, useCurrentUser, useStore } from '../store/useStore';
import { Merchant, MerchantStatus } from '../types';
import { fmtDate } from '../utils/format';

type Filter = 'all' | 'unassigned' | MerchantStatus;
type SortKey = 'name' | 'status' | 'tier' | 'agent' | 'createdAt';

export default function MerchantsScreen() {
  const me = useCurrentUser()!;
  const teams = useStore((s) => s.teams);
  const users = useStore((s) => s.users);
  const all = useStore((s) => s.merchants);
  const navigation = useNavigation<any>();
  const { isDesktop } = useBreakpoint();

  const resetDemo = useStore((s) => s.resetDemo);
  const upsertMerchant = useStore((s) => s.upsertMerchant);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const onSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key as SortKey);
      setSortDir('asc');
    }
  };

  // seleksi & bulk assign
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickingAgent, setPickingAgent] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await resetDemo();
    } finally {
      setRefreshing(false);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setPickingAgent(false);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkAssign = async (agentId: string, agentTeamId: string | null) => {
    setAssigning(true);
    try {
      const targets = all.filter((m) => selectedIds.has(m.id));
      for (const m of targets) {
        await upsertMerchant({ ...m, assignedTo: agentId, teamId: agentTeamId });
      }
      const agentName = users.find((u) => u.id === agentId)?.name ?? '';
      showDialog('Berhasil', `${targets.length} merchant di-assign ke ${agentName}.`);
      exitSelectMode();
    } catch {
      showDialog('Gagal', 'Tidak dapat menyimpan sebagian atau semua assignment. Coba lagi.');
    } finally {
      setAssigning(false);
    }
  };

  const agentName = (id: string | null) =>
    id ? (users.find((u) => u.id === id)?.name ?? '-') : 'Belum di-assign';

  const list = useMemo(() => {
    let l = merchantScope({ merchants: all }, me);
    if (filter === 'unassigned') l = l.filter((m) => !m.assignedTo);
    else if (filter !== 'all') l = l.filter((m) => m.status === filter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter(
        (m) =>
          m.name.toLowerCase().includes(s) ||
          m.address.toLowerCase().includes(s) ||
          (m.ownerName ?? '').toLowerCase().includes(s),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp: Record<SortKey, (a: Merchant, b: Merchant) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      status: (a, b) => a.status.localeCompare(b.status),
      tier: (a, b) => a.cityTier.localeCompare(b.cityTier),
      agent: (a, b) => agentName(a.assignedTo).localeCompare(agentName(b.assignedTo)),
      createdAt: (a, b) => a.createdAt - b.createdAt,
    };
    return [...l].sort((a, b) => dir * cmp[sortKey](a, b));
  }, [all, me, filter, q, sortKey, sortDir]);

  const canManage = MANAGER_ROLES.includes(me.role);
  const numColumns = isDesktop ? 2 : 1;

  const columns: DataTableColumn<Merchant>[] = [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      flex: 2.5,
      render: (m) => (
        <View>
          <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: C.text }} numberOfLines={1}>
            {m.name}
          </Text>
          <Text style={{ fontFamily: F.reg, fontSize: 11.5, color: C.muted }} numberOfLines={1}>
            {m.address}
          </Text>
        </View>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: 120,
      render: (m) => <Badge label={STATUS_LABEL[m.status]} color={STATUS_COLOR[m.status]} />,
    },
    { key: 'tier', label: 'Tier', sortable: true, width: 70, render: (m) => TIER_LABEL[m.cityTier] },
    {
      key: 'agent',
      label: 'Agen',
      sortable: true,
      flex: 1.6,
      render: (m) => (
        <Text
          style={{ fontFamily: F.reg, fontSize: 13, color: m.assignedTo ? C.primaryText : C.muted }}
          numberOfLines={1}
        >
          {agentName(m.assignedTo)}
          {m.teamId ? ` · ${teams.find((t) => t.id === m.teamId)?.name}` : ''}
        </Text>
      ),
    },
    { key: 'createdAt', label: 'Dibuat', sortable: true, width: 110, mono: true, render: (m) => fmtDate(m.createdAt) },
  ];

  const assignableAgents = useMemo(() => {
    const agents = users.filter((u) => u.role === 'field_agent' && u.active);
    return me.role === 'team_lead' ? agents.filter((a) => a.teamId === me.teamId) : agents;
  }, [users, me]);

  return (
    <View role="main" style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8, maxWidth: 1180, width: '100%', alignSelf: 'center' }}>
        <Input placeholder="Cari nama / alamat / pemilik..." value={q} onChangeText={setQ} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Semua" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Cold Start" active={filter === 'cold_start'} onPress={() => setFilter('cold_start')} />
          <Chip label="Registered" active={filter === 'registered'} onPress={() => setFilter('registered')} />
          <Chip label="Activated" active={filter === 'activated'} onPress={() => setFilter('activated')} />
          <Chip label="Belum Assign" active={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
        </View>

        {canManage && !selectMode && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Btn title="+ Tambah Merchant" onPress={() => navigation.navigate('MerchantForm', {})} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn variant="outline" title="Impor CSV" onPress={() => navigation.navigate('Import')} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn variant="outline" title="Pilih" onPress={() => setSelectMode(true)} />
            </View>
          </View>
        )}

        {selectMode && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: F.bold, color: C.text }}>
                {selectedIds.size} dipilih
              </Text>
              <Btn
                small
                title="Assign ke Agen"
                disabled={selectedIds.size === 0 || assigning}
                onPress={() => setPickingAgent((v) => !v)}
              />
              <Btn small variant="outline" title="Batal" onPress={exitSelectMode} disabled={assigning} />
            </View>
            {pickingAgent && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {assignableAgents.length === 0 ? (
                  <Text style={{ color: C.muted, fontSize: 12.5 }}>Tidak ada agen aktif untuk di-assign.</Text>
                ) : (
                  assignableAgents.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      active={false}
                      onPress={() => bulkAssign(a.id, a.teamId)}
                    />
                  ))
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text style={{ flex: 1, color: C.muted, fontSize: 11.5 }}>{list.length} merchant ditemukan</Text>
          {isDesktop && <IconButton name="refresh" size={16} color={C.muted} onPress={onRefresh} />}
        </View>
      </View>

      {isDesktop ? (
        <ScrollView tabIndex={0} contentContainerStyle={{ padding: 16, maxWidth: 1180, width: '100%', alignSelf: 'center' }}>
          <DataTable
            columns={columns}
            data={list}
            keyExtractor={(m) => m.id}
            onRowPress={(m) => navigation.navigate('MerchantDetail', { merchantId: m.id })}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            selectable={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            onToggleSelectAll={() =>
              setSelectedIds((prev) => (prev.size === list.length ? new Set() : new Set(list.map((m) => m.id))))
            }
            emptyText="Tidak ada merchant."
          />
        </ScrollView>
      ) : (
        <FlatList
          key={numColumns}
          data={list}
          keyExtractor={(m) => m.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 10 } : undefined}
          contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 1180, width: '100%', alignSelf: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Empty text="Tidak ada merchant." />}
          renderItem={({ item }) => (
            <View style={{ flex: numColumns > 1 ? 1 : undefined, marginBottom: numColumns > 1 ? 0 : undefined }}>
              <ListRow
                title={item.name}
                subtitle={item.address}
                onPress={() =>
                  selectMode
                    ? toggleSelected(item.id)
                    : navigation.navigate('MerchantDetail', { merchantId: item.id })
                }
                selected={selectMode ? selectedIds.has(item.id) : undefined}
                trailing={<Badge label={STATUS_LABEL[item.status]} color={STATUS_COLOR[item.status]} />}
                meta={`${TIER_LABEL[item.cityTier]} · ${fmtDate(item.createdAt)}`}
                emphasis={{
                  color: item.assignedTo ? C.primaryText : C.muted,
                  label: `${agentName(item.assignedTo)}${item.teamId ? ` · ${teams.find((t) => t.id === item.teamId)?.name}` : ''}`,
                }}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
