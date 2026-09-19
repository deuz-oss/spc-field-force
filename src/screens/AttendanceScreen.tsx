import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Btn, Card, Empty, H, ListRow, Muted, StatusBadge } from '../components/ui';
import { showDialog } from '../components/dialog';
import { C, T } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { fmtDate, fmtDurClock, fmtDurShort, fmtKm, fmtTime } from '../utils/format';
import { polylineKm } from '../utils/geo';

/** Mirror ringkas dari sesi aktif — sebelumnya tab ini jadi jalan buntu bila sesi berlangsung
 * dan pengguna harus balik ke Dashboard hanya utk clock-out. */
function LiveSessionCard({ me }: { me: ReturnType<typeof useCurrentUser> }) {
  const attendances = useStore((s) => s.attendances);
  const clockOutStore = useStore((s) => s.clockOut);
  const active = attendances.find((a) => a.userId === me!.id && !a.clockOutAt);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active && active.id]);

  if (!active) return null;

  const doClockOut = async () => {
    setBusy(true);
    try {
      const last = active.route[active.route.length - 1] ?? { lat: active.clockInLat, lng: active.clockInLng };
      await clockOutStore(last);
      showDialog('Clock Out berhasil');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>Sesi Berlangsung</H>
        <StatusBadge
          label={active.geoFenceOk ? 'Dalam geo-fence' : 'Pengecualian'}
          color={active.geoFenceOk ? C.ok : C.accent}
          icon={active.geoFenceOk ? 'shield-checkmark' : 'warning'}
        />
      </View>
      <Text style={[T.display, { color: C.primary, marginTop: 4 }]}>{fmtDurClock(now - active.clockInAt)}</Text>
      <Muted style={{ marginBottom: 8 }}>
        Masuk {fmtTime(active.clockInAt)} · {fmtKm(polylineKm(active.route))} · {active.route.length} titik rute
      </Muted>
      <Btn title="CLOCK OUT" variant="danger" onPress={doClockOut} disabled={busy} />
    </Card>
  );
}

/** Riwayat absensi — clock in dikelola dari tab Dashboard; clock out juga tersedia di sini. */
export default function AttendanceScreen() {
  const me = useCurrentUser();
  const attendances = useStore((s) => s.attendances);
  const navigation = useNavigation<any>();

  const mine = attendances
    .filter((a) => a.userId === me!.id)
    .sort((a, b) => b.clockInAt - a.clockInAt);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
        <LiveSessionCard me={me} />
        <H>Riwayat Absensi Saya ({mine.length})</H>
      </View>
      <FlatList
        data={mine}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Empty text="Belum ada riwayat. Mulai sesi dari tab Dashboard." />}
        renderItem={({ item: a }) => (
          <ListRow
            onPress={() => navigation.navigate('AttendanceDetail', { id: a.id })}
            title={fmtDate(a.clockInAt)}
            subtitle={`${fmtTime(a.clockInAt)} → ${a.clockOutAt ? fmtTime(a.clockOutAt) : 'berlangsung...'} · ${fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt)} · ${fmtKm(polylineKm(a.route))}`}
            trailing={<StatusBadge label={a.geoFenceOk ? 'OK' : 'Exception'} color={a.geoFenceOk ? C.ok : C.accent} icon={a.geoFenceOk ? 'checkmark-circle' : 'warning'} />}
            emphasis={a.clockOutAt ? undefined : { color: C.warn, label: 'Berlangsung' }}
          />
        )}
      />
    </View>
  );
}
