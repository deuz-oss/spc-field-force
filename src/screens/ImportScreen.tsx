import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Badge, Btn, Card, Chip, Empty, H, Muted } from '../components/ui';
import { showDialog } from '../components/dialog';
import { STATUS_LABEL, TIER_LABEL, MANAGER_ROLES } from '../config';
import { C, STATUS_COLOR } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { Merchant } from '../types';
import { parseCsv } from '../utils/csv';
import { exportCsv } from '../utils/export';
import { uid } from '../utils/uuid';

interface Row {
  name: string;
  address: string;
  phone: string;
  ownerName?: string;
  category?: string;
  cityTier: Merchant['cityTier'];
  lat: number | null;
  lng: number | null;
}

const TEMPLATE = `nama,alamat,telepon,pemilik,kategori,lat,lng
Warung Nasi Bu Ani,"Jl. Kebon Sirih No.10, Jakarta Pusat",081298760001,Ani,F&B,-6.183022,106.826771
Kedai Teh Tarik Pak Man,"Jl. Hayam Wuruk No.27, Jakarta Barat",081298760002,Man,F&B,-6.151211,106.813111`;

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    const norm = k.trim().toLowerCase();
    if (keys.includes(norm)) return (row[k] ?? '').trim();
  }
  return '';
}

export default function ImportScreen() {
  const navigation = useNavigation<any>();
  const me = useCurrentUser()!;
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const upsertMerchant = useStore((s) => s.upsertMerchant);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);

  const agents = useMemo(
    () => users.filter((u) => u.role === 'field_agent' && u.active),
    [users],
  );
  // Team lead hanya bisa assign ke agen satu tim
  const assignable =
    me.role === 'team_lead' ? agents.filter((a) => a.teamId === me.teamId) : agents;

  const downloadTemplate = () => exportCsv('template_merchant', TEMPLATE);

  const readFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset: any = res.assets[0];
      let text = '';
      if (asset.file instanceof Blob) text = await asset.file.text();
      else text = await (await fetch(asset.uri)).text();

      const table = parseCsv(text);
      if (table.length < 2) {
        showDialog('File kosong atau tanpa baris data.');
        return;
      }
      const header = table[0].map((h) => h.toLowerCase());
      const out: Row[] = [];
      const errs: string[] = [];
      table.slice(1).forEach((r, i) => {
        const obj: Record<string, string> = {};
        header.forEach((h, j) => (obj[h] = r[j] ?? ''));
        const name = pick(obj, ['nama', 'name', 'merchant', 'merchant_name']);
        if (!name) {
          errs.push(`Baris ${i + 2}: kolom "nama" kosong`);
          return;
        }
        const tierRaw = pick(obj, ['tier', 'city_tier', 'citytier']).toLowerCase();
        const latS = pick(obj, ['lat', 'latitude']).replace(',', '.');
        const lngS = pick(obj, ['lng', 'lon', 'long', 'longitude']).replace(',', '.');
        const lat = latS ? parseFloat(latS) : null;
        const lng = lngS ? parseFloat(lngS) : null;
        out.push({
          name,
          address: pick(obj, ['alamat', 'address']),
          phone: pick(obj, ['telepon', 'phone', 'wa', 'kontak', 'no_hp']),
          ownerName: pick(obj, ['pemilik', 'owner']) || undefined,
          category: pick(obj, ['kategori', 'category']) || undefined,
          cityTier:
            tierRaw === '2' || tierRaw.includes('2')
              ? 'tier2'
              : tierRaw === '3' || tierRaw.includes('3')
              ? 'tier3'
              : 'tier1',
          lat: lat != null && isFinite(lat) ? lat : null,
          lng: lng != null && isFinite(lng) ? lng : null,
        });
      });
      setRows(out);
      setErrors(errs);
    } catch {
      showDialog('Gagal membaca file CSV.');
    }
  };

  const doImport = () => {
    if (!rows?.length) return;
    const agent = agentId ? users.find((u) => u.id === agentId) : null;
    rows.forEach((r) => {
      upsertMerchant({
        id: uid('m_'),
        name: r.name,
        address: r.address,
        phone: r.phone,
        ownerName: r.ownerName,
        category: r.category,
        cityTier: r.cityTier,
        lat: r.lat,
        lng: r.lng,
        status: 'cold_start',
        coldStartDone: false,
        assignedTo: agent?.id ?? null,
        teamId: agent?.teamId ?? me.teamId ?? null,
        source: 'imported',
        createdAt: Date.now(),
      });
    });
    showDialog(
      'Impor berhasil',
      `${rows.length} merchant ditambahkan${agent ? ` dan di-assign ke ${agent.name}` : ' (belum di-assign)'}.`,
      [{ label: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  if (!MANAGER_ROLES.includes(me.role)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Muted>Hanya Team Lead dan Admin yang dapat mengimpor merchant.</Muted>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <H>Impor Daftar Merchant</H>
      <Card>
        <Muted>
          Format kolom CSV:{'\n'}
          <Text style={{ fontWeight: '700', color: C.text }}>
            nama, alamat, telepon, pemilik, kategori, lat, lng
          </Text>
          {'\n'}Kolom wajib: nama. Lat/lng opsional.
        </Muted>
        <View style={{ gap: 8, marginTop: 10 }}>
          <Btn small variant="outline" title="Unduh Template CSV" onPress={downloadTemplate} />
          <Btn small title="Pilih File CSV" onPress={readFile} />
        </View>
      </Card>

      {rows && (
        <>
          <Card>
            <H>{rows.length} merchant terbaca</H>
            {assignable.length > 0 && (
              <>
                <Muted style={{ marginTop: 6 }}>Assign semua ke agen (opsional):</Muted>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <Chip label="Tanpa assign" active={agentId == null} onPress={() => setAgentId(null)} />
                  {assignable.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      active={agentId === a.id}
                      onPress={() => setAgentId(a.id)}
                    />
                  ))}
                </View>
              </>
            )}
            <Btn title={`Impor ${rows.length} Merchant`} onPress={doImport} />
          </Card>

          {errors.length > 0 && (
            <Card>
              <H>{errors.length} baris dilewati</H>
              {errors.slice(0, 5).map((e) => (
                <Muted key={e}>{e}</Muted>
              ))}
            </Card>
          )}

          <Card>
            <H>Preview</H>
            {rows.length === 0 ? (
              <Empty text="Tidak ada data valid." />
            ) : (
              rows.slice(0, 10).map((r, i) => (
                <View
                  key={`${r.name}-${i}`}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: C.divider,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 13, color: C.text }} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
                      {r.address || '-'}
                    </Text>
                  </View>
                  <Badge label={TIER_LABEL[r.cityTier]} color={STATUS_COLOR.cold_start} />
                </View>
              ))
            )}
            {rows.length > 10 && <Muted style={{ marginTop: 6 }}>...dan {rows.length - 10} lainnya</Muted>}
          </Card>
        </>
      )}

      {!rows && (
        <Card>
          <Muted>
            Alur kerja: Team Lead mengimpor daftar merchant dari platform, lalu menetapkan
            (assign) merchant kepada Field Agent untuk di-visit dan di-incubate sampai cold start
            selesai.
          </Muted>
        </Card>
      )}
    </ScrollView>
  );
}
