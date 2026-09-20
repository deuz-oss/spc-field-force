import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge, Chip, Empty, GeoValidBadge, ListRow } from '../components/ui';
import { PeriodPicker } from '../components/PeriodPicker';
import { RESULT_LABEL } from '../config';
import { C } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { fmtDate, fmtDurShort, fmtTime } from '../utils/format';
import { getRange, inRange, PeriodKey } from '../utils/period';

type F = 'open' | 'done' | 'all';

export default function VisitsScreen() {
  const me = useCurrentUser()!;
  const visitsAll = useStore((s) => s.visits);
  const merchants = useStore((s) => s.merchants);
  const navigation = useNavigation<any>();
  const [f, setF] = useState<F>('all');
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [month, setMonth] = useState(new Date().getMonth());

  const range = useMemo(() => getRange(period, month), [period, month]);

  const mine = useMemo(() => {
    let l = visitsAll.filter((v) => v.agentId === me.id);
    if (f === 'open') l = l.filter((v) => !v.checkOutAt);
    if (f === 'done') l = l.filter((v) => !!v.checkOutAt);
    l = l.filter((v) => inRange(v.checkInAt, range));
    return [...l].sort((a, b) => b.checkInAt - a.checkInAt);
  }, [visitsAll, me, f, range]);

  return (
    <View role="main" style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
        <PeriodPicker period={period} month={month} onPeriod={setPeriod} onMonth={setMonth} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Semua" active={f === 'all'} onPress={() => setF('all')} />
          <Chip label="Berlangsung" active={f === 'open'} onPress={() => setF('open')} />
          <Chip label="Selesai" active={f === 'done'} onPress={() => setF('done')} />
        </View>
      </View>
      <FlatList
        data={mine}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 10 }}
        ListEmptyComponent={<Empty text="Belum ada kunjungan." />}
        renderItem={({ item: v }) => {
          const m = merchants.find((x) => x.id === v.merchantId);
          return (
            <ListRow
              onPress={() => navigation.navigate('VisitFlow', { visitId: v.id })}
              title={m?.name ?? '(merchant terhapus)'}
              subtitle={
                `${fmtDate(v.checkInAt)} · ${fmtTime(v.checkInAt)} → ${v.checkOutAt ? fmtTime(v.checkOutAt) : '...'}` +
                (v.checkOutAt ? ` · ${fmtDurShort(v.checkOutAt - v.checkInAt)}` : '')
              }
              trailing={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge
                    label={v.checkOutAt ? RESULT_LABEL[v.result] ?? v.result : 'Berlangsung'}
                    color={v.checkOutAt ? C.info : C.warn}
                  />
                  <GeoValidBadge
                    ok={v.geoValid}
                    okLabel="Geo valid"
                    badLabel={`${v.merchantDistanceM ?? '?'}m`}
                  />
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
