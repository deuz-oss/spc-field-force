import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Badge, Btn, Card, Chip, Field, H, Input, Muted } from '../components/ui';
import { showDialog } from '../components/dialog';
import { RESULT_LABEL, RESULT_ORDER, VISIT_VALID_RADIUS_M } from '../config';
import { C } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { VisitDoc, VisitResult } from '../types';
import { fmtDurClock, fmtDateTime } from '../utils/format';
import { haversineM } from '../utils/geo';

export default function VisitFlowScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const me = useCurrentUser()!;
  const visitId: string | undefined = route.params?.visitId;
  const visit = useStore((s) => s.visits.find((v) => v.id === visitId));
  const merchants = useStore((s) => s.merchants);
  const startVisit = useStore((s) => s.startVisit);
  const updateVisit = useStore((s) => s.updateVisit);
  const finishVisit = useStore((s) => s.finishVisit);

  const merchant = merchants.find((m) => m.id === visit?.merchantId);
  const [now, setNow] = useState(Date.now());
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    if (!visit || visit.checkOutAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visit && visit.id, visit && visit.checkOutAt]);

  /** mulai kunjungan baru utk merchant di params */
  const beginVisit = async () => {
    if (!merchant) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showDialog('Izin lokasi diperlukan', 'Aktifkan izin lokasi untuk check-in.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let dist: number | null = null;
      let geoValid = true;
      if (merchant.lat != null && merchant.lng != null) {
        dist = Math.round(
          haversineM(
            { lat: merchant.lat, lng: merchant.lng },
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
          ),
        );
        geoValid = dist <= VISIT_VALID_RADIUS_M;
      }
      const id = startVisit(merchant.id, me.id, { lat: pos.coords.latitude, lng: pos.coords.longitude }, dist, geoValid);
      // ganti layar agar langsung masuk mode isi data kunjungan
      navigation.replace('VisitFlow', { visitId: id });
    } catch {
      showDialog('Gagal', 'Tidak dapat mengambil lokasi. Coba lagi.');
    }
  };

  const refreshPin = async () => {
    if (!visit || !merchant || savingLoc) return;
    setSavingLoc(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let dist: number | null = null;
      let geoValid = true;
      if (merchant.lat != null && merchant.lng != null) {
        dist = Math.round(
          haversineM(
            { lat: merchant.lat, lng: merchant.lng },
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
          ),
        );
        geoValid = dist <= VISIT_VALID_RADIUS_M;
      }
      updateVisit(visit.id, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        merchantDistanceM: dist,
        geoValid,
      });
    } catch {
      /* abaikan */
    } finally {
      setSavingLoc(false);
    }
  };

  const pickPhotos = async () => {
    if (!visit) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.4,
    });
    if (!res.canceled && res.assets.length) {
      updateVisit(visit.id, {
        photos: [...visit.photos, ...res.assets.map((a) => a.uri)].slice(0, 10),
      });
    }
  };

  const takePhoto = async () => {
    if (!visit) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showDialog('Izin kamera diperlukan');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.4 });
    if (!res.canceled && res.assets[0]) {
      updateVisit(visit.id, { photos: [...visit.photos, res.assets[0].uri].slice(0, 10) });
    }
  };

  const pickDocs = async () => {
    if (!visit) return;
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const docs: VisitDoc[] = res.assets.map((a) => ({ name: a.name ?? 'dokumen', uri: a.uri }));
    updateVisit(visit.id, { docs: [...visit.docs, ...docs].slice(0, 8) });
  };

  const checkOut = () => {
    if (!visit) return;
    if (!visit.ownerName.trim()) {
      showDialog(
        'Data belum lengkap',
        'Nama pemilik merchant wajib diisi sebelum check-out.',
      );
      return;
    }
    const doFinish = () => {
      finishVisit(visit.id);
      navigation.goBack();
    };
    if (!visit.geoValid) {
      showDialog(
        'Kunjungan di luar radius',
        `Posisi Anda ${visit.merchantDistanceM ?? '?'}m dari pin merchant (batas ${VISIT_VALID_RADIUS_M}m). Kunjungan tetap disimpan dengan flag geo tidak valid.`,
        [
          { label: 'Batal' },
          { label: 'Tetap Check-out', destructive: true, onPress: doFinish },
        ],
      );
      return;
    }
    doFinish();
  };

  // --- tampilan ketika belum ada kunjungan: mulai dari merchant ---
  if (!visitId) {
    const m = merchants.find((x) => x.id === route.params?.merchantId);
    if (me.role !== 'field_agent') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Muted>Hanya Field Agent yang dapat memulai kunjungan.</Muted>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card>
            <H>{m ? m.name : 'Merchant'}</H>
            <Muted style={{ marginTop: 6 }}>
              Mulai kunjungan dengan menekan tombol CHECK IN di bawah. Lokasi Anda akan dicatat
              sebagai geo pin point dan durasi di lokasi mulai dihitung.
            </Muted>
          </Card>
          <Btn title="CHECK IN" onPress={beginVisit} />
        </ScrollView>
      </View>
    );
  }

  if (!visit)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Muted>Kunjungan tidak ditemukan.</Muted>
      </View>
    );

  const done = !!visit.checkOutAt;
  // hanya agen pemilik kunjungan yang boleh mengedit; manager/client lihat saja
  const editable = !done && me.role === 'field_agent' && visit.agentId === me.id;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H style={{ flexShrink: 1 }}>{merchant?.name ?? '-'}</H>
          <Badge label={done ? 'Selesai' : 'Berlangsung'} color={done ? C.ok : C.warn} />
        </View>
        <Muted style={{ marginTop: 4 }}>Check-in: {fmtDateTime(visit.checkInAt)}</Muted>
        <Muted>Check-out: {fmtDateTime(visit.checkOutAt)}</Muted>
        {!done && (
          <Text style={{ fontSize: 28, fontWeight: '900', color: C.primary, marginTop: 4 }}>
            {fmtDurClock(now - visit.checkInAt)}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Badge
            label={visit.geoValid ? `Geo valid (${visit.merchantDistanceM ?? '-'} m)` : `Di luar radius (${visit.merchantDistanceM ?? '?'} m)`}
            color={visit.geoValid ? C.ok : C.accent}
          />
        </View>
        {!editable && (
          <View style={{ marginTop: 8 }}>
            <Btn
              small
              variant="outline"
              title={savingLoc ? 'Memperbarui pin...' : 'Perbarui Geo Pin Point'}
              onPress={refreshPin}
            />
          </View>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <Field label="Nama Pemilik Merchant *">
          <Input
            editable={editable}
            value={visit.ownerName}
            onChangeText={(t) => editable && updateVisit(visit.id, { ownerName: t })}
            placeholder="Nama pemilik / key person"
          />
        </Field>
        <Field label="Kontak Merchant (HP/WA)">
          <Input
            editable={editable}
            value={visit.contactPhone}
            onChangeText={(t) => editable && updateVisit(visit.id, { contactPhone: t })}
            keyboardType="phone-pad"
            placeholder="08xxxxxxxxxx"
          />
        </Field>
        <Field label="Hasil Kunjungan (milestone)">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {RESULT_ORDER.map((r) => (
              <Chip
                key={r}
                label={RESULT_LABEL[r]}
                active={visit.result === r}
                onPress={() => editable && updateVisit(visit.id, { result: r as VisitResult })}
              />
            ))}
          </View>
          <Muted style={{ marginTop: 4 }}>
            Status merchant otomatis diperbarui saat check-out (Registered / Activated / Cold Start).
          </Muted>
        </Field>
        <Field label="Catatan">
          <Input
            editable={editable}
            value={visit.notes}
            onChangeText={(t) => editable && updateVisit(visit.id, { notes: t })}
            multiline
            placeholder="Hasil pembicaraan, kendala, rencana follow-up..."
          />
        </Field>
      </Card>

      <Card>
        <H>Foto Lokasi ({visit.photos.length})</H>
        <Muted style={{ marginTop: 2 }}>Bukti kunjungan di lokasi merchant.</Muted>
        {visit.photos.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {visit.photos.map((p, i) => (
              <TouchableOpacity
                key={`${p}-${i}`}
                onLongPress={() =>
                  editable &&
                  updateVisit(visit.id, { photos: visit.photos.filter((_, j) => j !== i) })
                }
              >
                <Image source={{ uri: p }} style={{ width: 72, height: 72, borderRadius: 8 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {editable && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Btn small variant="outline" title="Kamera" onPress={takePhoto} />
            <Btn small variant="outline" title="Galeri" onPress={pickPhotos} />
          </View>
        )}
      </Card>

      <Card>
        <H>Dokumen ({visit.docs.length})</H>
        <Muted style={{ marginTop: 2 }}>Upload dokumen pendukung (NPWP, NIB, menu, dll).</Muted>
        {visit.docs.map((d, i) => (
          <View
            key={`${d.uri}-${i}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 12, color: C.text, flexShrink: 1 }} numberOfLines={1}>
              {d.name}
            </Text>
            {!editable && (
              <TouchableOpacity
                onPress={() =>
                  updateVisit(visit.id, { docs: visit.docs.filter((_, j) => j !== i) })
                }
              >
                <Text style={{ color: C.accent, fontWeight: '700' }}>Hapus</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {editable && (
          <View style={{ marginTop: 8 }}>
            <Btn small variant="outline" title="Upload Dokumen" onPress={pickDocs} />
          </View>
        )}
      </Card>

      {editable ? (
        <>
          <Btn title="CHECK OUT & Simpan" variant="ok" onPress={checkOut} />
          <Btn variant="outline" title="Simpan Draf (kembali nanti)" onPress={() => navigation.goBack()} />
        </>
      ) : done ? (
        <Card>
          <Muted>
            Kunjungan selesai. Durasi di lokasi:{' '}
            {Math.round(((visit.checkOutAt ?? 0) - visit.checkInAt) / 60000)} menit.
          </Muted>
        </Card>
      ) : (
        <Card>
          <Muted>Kunjungan masih berlangsung — menunggu agen melakukan check-out.</Muted>
        </Card>
      )}
    </ScrollView>
  );
}
