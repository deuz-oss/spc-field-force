import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { uid } from './uuid';

const BUCKET = 'visit-media';

/**
 * Uploads a locally-picked photo/document to Supabase Storage and returns its
 * public URL. Web uses a real fetch() Blob; native reads base64 via
 * expo-file-system since React Native's fetch().blob() is unreliable for
 * binary uploads from file:// URIs (same platform split ImportScreen.tsx
 * already uses for reading CSV content).
 */
export async function uploadVisitMedia(
  visitId: string,
  uri: string,
  ext: string,
  contentType?: string,
): Promise<string> {
  const path = `${visitId}/${uid()}.${ext}`;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType });
    if (error) throw error;
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const { error } = await supabase.storage.from(BUCKET).upload(path, decode(base64), {
      contentType: contentType ?? 'application/octet-stream',
    });
    if (error) throw error;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort cleanup when a photo/doc is removed from a visit; failures are non-fatal. */
export function deleteVisitMedia(publicUrl: string): void {
  const marker = `/object/public/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return;
  const path = publicUrl.slice(i + marker.length);
  supabase.storage
    .from(BUCKET)
    .remove([path])
    .then(({ error }) => {
      if (error) console.warn('deleteVisitMedia failed:', error.message);
    });
}

/** Best-effort file extension from a local URI, falling back to a default. */
export function extFromUri(uri: string, fallback = 'jpg'): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : fallback;
}
