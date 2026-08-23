import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { LeafletMap, MapPlaceholder } from '../components/LeafletMap';
import { Badge, Card, H, Muted } from '../components/ui';
import { C } from '../theme';
import { useStore } from '../store/useStore';
import { fmtDateTime, fmtDurShort, fmtKm } from '../utils/format';
import { polylineKm } from '../utils/geo';

export default function AttendanceDetailScreen() {
  const route = useRoute<any>();
  const a = useStore((s) => s.attendances.find((x) => x.id === route.params?.id));
  const users = useStore((s) => s.users);

  if (!a)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Muted>Data absensi tidak ditemukan.</Muted>
      </View>
    );

  const user = users.find((u) => u.id === a.userId);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <H>Absensi {user?.name ?? ''}</H>
          <Badge label={a.geoFenceOk ? 'Geo-fence OK' : 'Pengecualian'} color={a.geoFenceOk ? C.ok : C.accent} />
        </View>
        <Muted style={{ marginTop: 6 }}>Clock in : {fmtDateTime(a.clockInAt)}</Muted>
        <Muted>Clock out: {fmtDateTime(a.clockOutAt)}</Muted>
        <Muted>
          Durasi: {fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt)} · Jarak:{' '}
          {fmtKm(polylineKm(a.route))} · Titik: {a.route.length}
        </Muted>
      </Card>

      <Card>
        <H>Rute Perjalanan</H>
        {a.route.length > 1 ? (
          <>
            <LeafletMap height={320} polyline={a.route} />
            <Muted style={{ marginTop: 8 }}>
              Rute direkam otomatis dari clock-in hingga clock-out.
            </Muted>
          </>
        ) : (
          <MapPlaceholder text="Titik rute belum cukup untuk digambar" />
        )}
      </Card>
    </ScrollView>
  );
}
