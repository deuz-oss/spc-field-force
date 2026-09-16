import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge, Btn, Chip, Empty, Input, ListRow } from '../components/ui';
import { STATUS_LABEL, TIER_LABEL, MANAGER_ROLES } from '../config';
import { C, STATUS_COLOR } from '../theme';
import { useBreakpoint } from '../utils/responsive';
import { merchantScope, useCurrentUser, useStore } from '../store/useStore';
import { MerchantStatus } from '../types';
import { fmtDate } from '../utils/format';

type Filter = 'all' | 'unassigned' | MerchantStatus;

export default function MerchantsScreen() {
  const me = useCurrentUser()!;
  const teams = useStore((s) => s.teams);
  const users = useStore((s) => s.users);
  const all = useStore((s) => s.merchants);
  const navigation = useNavigation<any>();
  const { isDesktop } = useBreakpoint();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [tick, setTick] = useState(0);

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
    return [...l].sort((a, b) => b.createdAt - a.createdAt);
  }, [all, me, filter, q]);

  const agentName = (id: string | null) =>
    id ? (users.find((u) => u.id === id)?.name ?? '-') : 'Belum di-assign';

  const canManage = MANAGER_ROLES.includes(me.role);
  const numColumns = isDesktop ? 2 : 1;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8, maxWidth: 1180, width: '100%', alignSelf: 'center' }}>
        <Input placeholder="Cari nama / alamat / pemilik..." value={q} onChangeText={setQ} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Semua" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Cold Start" active={filter === 'cold_start'} onPress={() => setFilter('cold_start')} />
          <Chip label="Registered" active={filter === 'registered'} onPress={() => setFilter('registered')} />
          <Chip label="Activated" active={filter === 'activated'} onPress={() => setFilter('activated')} />
          <Chip label="Belum Assign" active={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
        </View>
        {canManage && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Btn title="+ Tambah Merchant" onPress={() => navigation.navigate('MerchantForm', {})} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn variant="outline" title="Impor CSV" onPress={() => navigation.navigate('Import')} />
            </View>
          </View>
        )}
        <Text style={{ color: C.faint, fontSize: 11.5, marginTop: 2 }}>{list.length} merchant ditemukan</Text>
      </View>

      <FlatList
        key={numColumns}
        data={list}
        keyExtractor={(m) => m.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 1180, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => setTick(tick + 1)} />}
        ListEmptyComponent={<Empty text="Tidak ada merchant." />}
        renderItem={({ item }) => (
          <View style={{ flex: numColumns > 1 ? 1 : undefined, marginBottom: numColumns > 1 ? 0 : undefined }}>
            <ListRow
              title={item.name}
              subtitle={item.address}
              onPress={() => navigation.navigate('MerchantDetail', { merchantId: item.id })}
              trailing={<Badge label={STATUS_LABEL[item.status]} color={STATUS_COLOR[item.status]} />}
              meta={`${TIER_LABEL[item.cityTier]} · ${fmtDate(item.createdAt)}`}
              emphasis={{
                color: item.assignedTo ? C.primary : C.faint,
                label: `${agentName(item.assignedTo)}${item.teamId ? ` · ${teams.find((t) => t.id === item.teamId)?.name}` : ''}`,
              }}
            />
          </View>
        )}
      />
    </View>
  );
}
