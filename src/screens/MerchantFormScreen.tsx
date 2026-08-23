import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Btn, Card, Chip, Field, H, Input } from '../components/ui';
import { showDialog } from '../components/dialog';
import { TIER_LABEL } from '../config';
import { C } from '../theme';
import { merchantScope, useCurrentUser, useStore } from '../store/useStore';
import { CityTier, Merchant } from '../types';
import { uid } from '../utils/uuid';

export default function MerchantFormScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const me = useCurrentUser()!;
  const editing = useStore((s) => s.merchants.find((m) => m.id === route.params?.merchantId));
  const upsertMerchant = useStore((s) => s.upsertMerchant);
  const merchants = useStore((s) => s.merchants);
  const teams = useStore((s) => s.teams);

  const [name, setName] = useState(editing?.name ?? '');
  const [address, setAddress] = useState(editing?.address ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [ownerName, setOwnerName] = useState(editing?.ownerName ?? '');
  const [category, setCategory] = useState(editing?.category ?? 'F&B');
  const [tier, setTier] = useState<CityTier>(editing?.cityTier ?? 'tier1');
  const [lat, setLat] = useState(editing?.lat != null ? String(editing.lat) : '');
  const [lng, setLng] = useState(editing?.lng != null ? String(editing.lng) : '');
  const [busy, setBusy] = useState(false);

  const grabLocation = async () => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showDialog('Izin lokasi diperlukan');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!name.trim()) {
      showDialog('Nama merchant wajib diisi.');
      return;
    }
    const m: Merchant = {
      id: editing?.id ?? uid('m_'),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      ownerName: ownerName.trim(),
      category: category.trim() || undefined,
      cityTier: tier,
      lat: lat ? parseFloat(lat.replace(',', '.')) : null,
      lng: lng ? parseFloat(lng.replace(',', '.')) : null,
      status: editing?.status ?? 'cold_start',
      coldStartDone: editing?.coldStartDone ?? false,
      assignedTo: editing?.assignedTo ?? (me.role === 'field_agent' ? me.id : null),
      teamId:
        editing?.teamId ??
        (me.teamId ?? teams.find((t) => t.cityTier === tier)?.id ?? null),
      source: editing?.source ?? 'manual',
      createdAt: editing?.createdAt ?? Date.now(),
    };
    upsertMerchant(m);
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <H>{editing ? 'Edit Merchant' : 'Tambah Merchant'}</H>
      <Card style={{ gap: 12 }}>
        <Field label="Nama Merchant *">
          <Input value={name} onChangeText={setName} placeholder="cth. Warung Makan Bu Sri" />
        </Field>
        <Field label="Alamat">
          <Input value={address} onChangeText={setAddress} multiline placeholder="Alamat lengkap" />
        </Field>
        <Field label="Telepon / WA">
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08xx" />
        </Field>
        <Field label="Nama Pemilik">
          <Input value={ownerName} onChangeText={setOwnerName} placeholder="Pemilik / KP" />
        </Field>
        <Field label="Kategori">
          <Input value={category} onChangeText={setCategory} placeholder="F&B" />
        </Field>
        <Field label="City Tier">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['tier1', 'tier2', 'tier3'] as CityTier[]).map((t) => (
              <Chip key={t} label={TIER_LABEL[t]} active={tier === t} onPress={() => setTier(t)} />
            ))}
          </View>
        </Field>
        <Field label="Geo Pin Point (lat, lng)">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input
              value={lat}
              onChangeText={setLat}
              placeholder="-6.260700"
              keyboardType="numbers-and-punctuation"
              style={{ flex: 1 }}
            />
            <Input
              value={lng}
              onChangeText={setLng}
              placeholder="106.781600"
              keyboardType="numbers-and-punctuation"
              style={{ flex: 1 }}
            />
          </View>
          <Btn small variant="outline" title={busy ? 'Mengambil...' : 'Gunakan Lokasi Saat Ini'} onPress={grabLocation} />
        </Field>
      </Card>

      {!editing && merchantScope({ merchants }, me).length === 0 && (
        <Text style={{ color: C.muted, fontSize: 12 }}>
          Tip: untuk banyak merchant sekaligus gunakan fitur Impor CSV.
        </Text>
      )}
      <Btn title="Simpan" onPress={save} />
      <Btn variant="outline" title="Batal" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}
