import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { LeafletMap, MapMarker, MapPlaceholder } from '../components/LeafletMap';
import { Card, GeoValidBadge, ListRow, Muted, SectionHeader, StatusBadge } from '../components/ui';
import { C } from '../theme';
import { VISIT_VALID_RADIUS_M, STOP_FLAG_DURATION_MS } from '../config';
import { useStore } from '../store/useStore';
import { Visit } from '../types';
import { fmtDateTime, fmtDurShort, fmtKm, fmtTime } from '../utils/format';
import { detectStops, haversineM, polylineKm, RouteStop } from '../utils/geo';

function matchVisit(stop: RouteStop, visits: Visit[]): Visit | undefined {
  return visits.find((v) => {
    const vEnd = v.checkOutAt ?? Date.now();
    const overlaps = stop.startT <= vEnd && stop.endT >= v.checkInAt;
    return overlaps && haversineM(stop, v) <= VISIT_VALID_RADIUS_M;
  });
}

export default function AttendanceDetailScreen() {
  const route = useRoute<any>();
  const a = useStore((s) => s.attendances.find((x) => x.id === route.params?.id));
  const users = useStore((s) => s.users);
  const visits = useStore((s) => s.visits);
  const merchants = useStore((s) => s.merchants);

  if (!a)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Muted>Data absensi tidak ditemukan.</Muted>
      </View>
    );

  const user = users.find((u) => u.id === a.userId);
  const agentVisits = visits.filter((v) => v.agentId === a.userId);
  const stops = detectStops(a.route);

  return (
    <ScrollView tabIndex={0} role="main" contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
      <Card>
        <SectionHeader title={`Absensi ${user?.name ?? ''}`} />
        <View style={{ marginTop: 8 }}>
          <GeoValidBadge ok={a.geoFenceOk} okLabel="Geo-fence OK" badLabel="Pengecualian" />
        </View>
        <Muted style={{ marginTop: 10 }}>Clock in : {fmtDateTime(a.clockInAt)}</Muted>
        <Muted>Clock out: {fmtDateTime(a.clockOutAt)}</Muted>
        <Muted>
          Durasi: {fmtDurShort((a.clockOutAt ?? Date.now()) - a.clockInAt)} · Jarak:{' '}
          {fmtKm(polylineKm(a.route))} · Titik: {a.route.length}
        </Muted>
      </Card>

      <Card>
        <SectionHeader title="Rute Perjalanan" />
        {a.route.length > 1 ? (
          <>
            <View style={{ marginTop: 10 }}>
              <LeafletMap height={320} polyline={a.route} markers={stopMarkers(stops, agentVisits)} />
            </View>
            <Muted style={{ marginTop: 8 }}>
              Rute direkam otomatis dari clock-in hingga clock-out.
            </Muted>
          </>
        ) : (
          <MapPlaceholder text="Titik rute belum cukup untuk digambar" />
        )}
      </Card>

      <Card>
        <SectionHeader title="Titik Berhenti" />
        {stops.length === 0 ? (
          <Muted style={{ marginTop: 8 }}>
            Tidak ada titik berhenti ≥10 menit yang terdeteksi pada sesi ini.
          </Muted>
        ) : (
          <View style={{ marginTop: 10, gap: 8 }}>
            {stops.map((stop, i) => {
              const visit = matchVisit(stop, agentVisits);
              const merchant = visit ? merchants.find((m) => m.id === visit.merchantId) : undefined;
              const flagged = !visit && stop.durationMs >= STOP_FLAG_DURATION_MS;
              const status = visit
                ? { color: C.ok, icon: 'storefront' as const, label: 'Kunjungan Merchant' }
                : flagged
                  ? { color: C.accent, icon: 'alert-circle' as const, label: 'Perlu Ditinjau' }
                  : { color: C.warn, icon: 'pause-circle' as const, label: 'Berhenti' };
              return (
                <ListRow
                  key={i}
                  title={`${fmtTime(stop.startT)} – ${fmtTime(stop.endT)}`}
                  subtitle={
                    visit
                      ? merchant?.name ?? 'Merchant tidak dikenali'
                      : flagged
                        ? 'Berhenti lama tanpa kunjungan tercatat'
                        : 'Belum melewati ambang batas tinjauan'
                  }
                  meta={fmtDurShort(stop.durationMs)}
                  trailing={<StatusBadge label={status.label} color={status.color} icon={status.icon} />}
                />
              );
            })}
          </View>
        )}
        <Muted style={{ marginTop: 10 }}>
          Berhenti dihitung dari kelompok titik GPS dalam radius {`~40m`} selama ≥10 menit. Berhenti
          di luar radius kunjungan merchant ({fmtKm(VISIT_VALID_RADIUS_M / 1000)}) dan berlangsung
          ≥30 menit ditandai "Perlu Ditinjau".
        </Muted>
      </Card>
    </ScrollView>
  );
}

function stopMarkers(stops: RouteStop[], visits: Visit[]): MapMarker[] {
  return stops.map((stop, i) => {
    const visit = matchVisit(stop, visits);
    const flagged = !visit && stop.durationMs >= STOP_FLAG_DURATION_MS;
    return {
      lat: stop.lat,
      lng: stop.lng,
      color: visit ? C.ok : flagged ? C.accent : C.warn,
      label: `Berhenti ${fmtDurShort(stop.durationMs)}`,
    };
  });
}
