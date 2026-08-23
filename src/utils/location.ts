import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/** Minta izin lalu ambil posisi sekarang; null bila izin ditolak/gagal */
export async function getCurrentCoords(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
