import React, { useEffect } from 'react';
import * as Location from 'expo-location';
import { TRACK_INTERVAL_MS } from '../config';
import { useCurrentUser, useStore } from '../store/useStore';

/**
 * Dipasang sekali di root: merekam rute GPS selama ada sesi absensi aktif,
 * tidak peduli layar mana yang sedang dibuka.
 */
export function TrackingWatcher() {
  const me = useCurrentUser();
  const activeId = useStore((s) => {
    if (!me || me.role === 'client' || me.role === 'super_admin') return null;
    return s.attendances.find((a) => a.userId === me.id && !a.clockOutAt)?.id ?? null;
  });
  const addRoutePoint = useStore((s) => s.addRoutePoint);

  useEffect(() => {
    if (!me || !activeId) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: TRACK_INTERVAL_MS,
          distanceInterval: 10,
        },
        (pos) =>
          addRoutePoint(me.id, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [me && me.id, activeId]);

  return null;
}
