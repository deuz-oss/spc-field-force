import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge, Empty, H, Muted } from '../components/ui';
import { C } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { fmtDate, fmtDurShort, fmtKm, fmtTime } from '../utils/format';
import { polylineKm } from '../utils/geo';

/** Riwayat absensi — clock in/out dikelola dari halaman utama (Dashboard). */
export default function AttendanceScreen() {
  const me = useCurrentUser()!;
  const attendances = useStore((s) => s.attendances);
  const navigation = useNavigation<any>();

  const mine = attendances
    .filter((a) => a.userId === me.id)
    .sort((a, b) => b.clockInAt - a.clockInAt);

  const active = mine.find((a) => !a.clockOutAt);

  return (
    <View style={{ flex: 1 }}>
      {active && (
        <Text style={styles.activeNote}>
          Sesi absensi berlangsung ({fmtTime(active.clockInAt)}) — kelola CLOCK OUT dari tab Dashboard.
        </Text>
      )}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <H>Riwayat Absensi Saya ({mine.length})</H>
      </View>
      <FlatList
        data={mine}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Empty text="Belum ada riwayat. Mulai sesi dari tab Dashboard." />}
        renderItem={({ item: a }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('AttendanceDetail', { id: a.id })}
            style={[styles.item, { borderColor: a.clockOutAt ? C.border : C.warn }]}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{fmtDate(a.clockInAt)}</Text>
              <Badge label={a.geoFenceOk ? 'OK' : 'Exception'} color={a.geoFenceOk ? C.ok : C.accent} />
            </View>
            <Muted>
              {fmtTime(a.clockInAt)} → {a.clockOutAt ? fmtTime(a.clockOutAt) : 'berlangsung...'} ·{' '}
              {fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt)} · {fmtKm(polylineKm(a.route))}
            </Muted>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activeNote: {
    marginTop: 8,
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.warnBg,
    color: C.warn,
    fontSize: 12,
    fontWeight: '600',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  itemTitle: { fontWeight: '700', color: C.text },
});
