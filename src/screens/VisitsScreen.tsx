import React, { useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge, Chip, Empty } from '../components/ui';
import { RESULT_LABEL } from '../config';
import { C } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { fmtDate, fmtDurShort, fmtTime } from '../utils/format';

type F = 'open' | 'done' | 'all';

export default function VisitsScreen() {
  const me = useCurrentUser()!;
  const visitsAll = useStore((s) => s.visits);
  const merchants = useStore((s) => s.merchants);
  const users = useStore((s) => s.users);
  const navigation = useNavigation<any>();
  const [f, setF] = useState<F>('all');

  const mine = useMemo(() => {
    let l =
      me.role === 'field_agent'
        ? visitsAll.filter((v) => v.agentId === me.id)
        : visitsAll;
    if (f === 'open') l = l.filter((v) => !v.checkOutAt);
    if (f === 'done') l = l.filter((v) => !!v.checkOutAt);
    return [...l].sort((a, b) => b.checkInAt - a.checkInAt);
  }, [visitsAll, me, f]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 }}>
        <Chip label="Semua" active={f === 'all'} onPress={() => setF('all')} />
        <Chip label="Berlangsung" active={f === 'open'} onPress={() => setF('open')} />
        <Chip label="Selesai" active={f === 'done'} onPress={() => setF('done')} />
      </View>
      <FlatList
        data={mine}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        ListEmptyComponent={<Empty text="Belum ada kunjungan." />}
        renderItem={({ item: v }) => {
          const m = merchants.find((x) => x.id === v.merchantId);
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('VisitFlow', { visitId: v.id })}
              style={{
                backgroundColor: C.card,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: v.checkOutAt ? C.border : C.warn,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: C.text, flexShrink: 1 }} numberOfLines={1}>
                  {m?.name ?? '(merchant terhapus)'}
                </Text>
                <Badge
                  label={v.checkOutAt ? RESULT_LABEL[v.result] ?? v.result : 'Berlangsung'}
                  color={v.checkOutAt ? (v.geoValid ? C.info : C.accent) : C.warn}
                />
              </View>
              <Muted>
                {fmtDate(v.checkInAt)} · {fmtTime(v.checkInAt)}
                {' → '}
                {v.checkOutAt ? fmtTime(v.checkOutAt) : '...'}
                {v.checkOutAt ? ` · ${fmtDurShort(v.checkOutAt - v.checkInAt)}` : ''}
              </Muted>
              {me.role !== 'field_agent' && (
                <Text style={{ fontSize: 11, color: C.primary, fontWeight: '600', marginTop: 2 }}>
                  {users.find((u) => u.id === v.agentId)?.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[{ color: '#475569', fontSize: 12.5, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 2 }, style]}>{children}</Text>;
}
