import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge, Chip, Empty, Input } from '../components/ui';
import { STATUS_LABEL, TIER_LABEL, MANAGER_ROLES } from '../config';
import { C, STATUS_COLOR } from '../theme';
import { merchantScope, useCurrentUser, useStore } from '../store/useStore';
import { Merchant, MerchantStatus } from '../types';
import { fmtDate } from '../utils/format';

type Filter = 'all' | 'unassigned' | MerchantStatus;

export default function MerchantsScreen() {
  const me = useCurrentUser()!;
  const teams = useStore((s) => s.teams);
  const users = useStore((s) => s.users);
  const all = useStore((s) => s.merchants);
  const navigation = useNavigation<any>();

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

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
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
            <TouchableOpacity
              onPress={() => navigation.navigate('MerchantForm', {})}
              style={{ flex: 1, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>+ Tambah Merchant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Import')}
              style={{ flex: 1, borderWidth: 1, borderColor: C.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: C.primary, fontWeight: '700' }}>Impor CSV</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={list}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => setTick(tick + 1)} />}
        ListEmptyComponent={<Empty text="Tidak ada merchant." />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('MerchantDetail', { merchantId: item.id })}
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              padding: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: C.text, flexShrink: 1 }} numberOfLines={1}>
                {item.name}
              </Text>
              <Badge label={STATUS_LABEL[item.status]} color={STATUS_COLOR[item.status]} />
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {item.address}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 11, color: C.primary, fontWeight: '600' }}>
                {agentName(item.assignedTo)}
                {item.teamId ? ` · ${teams.find((t) => t.id === item.teamId)?.name}` : ''}
              </Text>
              <Text style={{ fontSize: 11, color: C.muted }}>
                {TIER_LABEL[item.cityTier]} · {fmtDate(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
