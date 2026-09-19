import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LeafletMap, MapMarker } from '../components/LeafletMap';
import { Card, Empty, ListRow, SectionHeader, StatusBadge } from '../components/ui';
import { C } from '../theme';
import { TRACK_INTERVAL_MS } from '../config';
import { useStore } from '../store/useStore';
import { fmtDurClock, fmtTime } from '../utils/format';

const STALE_WARN_MS = 10 * 60 * 1000;

function staleness(lastT: number, now: number): { color: string; label: string; icon: 'checkmark-circle' | 'time-outline' | 'alert-circle' } {
  const age = now - lastT;
  if (age < TRACK_INTERVAL_MS * 2) return { color: C.ok, label: 'Live', icon: 'checkmark-circle' };
  if (age < STALE_WARN_MS) return { color: C.warn, label: 'Delay', icon: 'time-outline' };
  return { color: C.accent, label: 'Sinyal terputus', icon: 'alert-circle' };
}

/**
 * Live monitoring untuk TL/Ops Manager/Client/Super Admin: posisi terakhir tiap
 * agen yang sedang clock-in. Update GPS hanya berjalan selagi app agen di
 * foreground (lihat TrackingWatcher) — badge staleness di sini adalah sinyal
 * satu-satunya saat itu berhenti (app di-background / sesi lupa checkout).
 */
export default function LiveMapScreen() {
  const navigation = useNavigation<any>();
  const attendances = useStore((s) => s.attendances);
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const active = useMemo(
    () => attendances.filter((a) => !a.clockOutAt).sort((a, b) => b.clockInAt - a.clockInAt),
    [attendances],
  );

  const markers: MapMarker[] = active.map((a) => {
    const last = a.route[a.route.length - 1];
    const u = users.find((x) => x.id === a.userId);
    const st = staleness(last?.t ?? a.clockInAt, now);
    return {
      lat: last?.lat ?? a.clockInLat,
      lng: last?.lng ?? a.clockInLng,
      color: st.color,
      label: u?.name ?? 'Agen',
    };
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
        <SectionHeader title="Peta Live" subtitle={`${active.length} agen sedang bekerja sekarang`} />

        {active.length > 0 ? (
          <Card>
            <LeafletMap height={360} markers={markers} />
          </Card>
        ) : (
          <Empty text="Tidak ada agen yang sedang clock-in saat ini." />
        )}

        <View style={{ gap: 8 }}>
          {active.map((a) => {
            const u = users.find((x) => x.id === a.userId);
            const team = teams.find((t) => t.id === u?.teamId);
            const last = a.route[a.route.length - 1];
            const lastT = last?.t ?? a.clockInAt;
            const st = staleness(lastT, now);
            return (
              <ListRow
                key={a.id}
                onPress={() => navigation.navigate('AttendanceDetail', { id: a.id })}
                title={u?.name ?? 'Agen'}
                subtitle={`${team?.name ?? '-'} · Masuk ${fmtTime(a.clockInAt)} · berjalan ${fmtDurClock(now - a.clockInAt)}`}
                meta={`Update ${fmtTime(lastT)}`}
                trailing={<StatusBadge label={st.label} color={st.color} icon={st.icon} />}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
