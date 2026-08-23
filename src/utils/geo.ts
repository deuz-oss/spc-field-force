import { RoutePoint } from '../types';

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Jarak antar dua koordinat dalam meter */
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Panjang total polyline rute dalam km */
export function polylineKm(pts: RoutePoint[]): number {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += haversineM(pts[i - 1], pts[i]);
  return m / 1000;
}
