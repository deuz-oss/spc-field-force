import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LeafletMap, MapPlaceholder } from '../components/LeafletMap';
import { Badge, Btn, Card, Chip, Empty, Field, H, Input, Muted } from '../components/ui';
import { STATUS_LABEL, TIER_LABEL, VISIT_VALID_RADIUS_M, MANAGER_ROLES } from '../config';
import { showDialog } from '../components/dialog';
import { C, STATUS_COLOR } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { MerchantStatus } from '../types';
import { fmtDateTime, fmtDurShort } from '../utils/format';
import { haversineM } from '../utils/geo';

export default function MerchantDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const me = useCurrentUser()!;
  const merchant = useStore((s) => s.merchants.find((m) => m.id === route.params.merchantId));
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const visits = useStore((s) => s.visits);
  const upsertMerchant = useStore((s) => s.upsertMerchant);
  const startVisit = useStore((s) => s.startVisit);

  const [assigning, setAssigning] = useState(false);

  const mVisits = useMemo(
    () =>
      visits
        .filter((v) => v.merchantId === route.params.merchantId)
        .sort((a, b) => b.checkInAt - a.checkInAt),
    [visits, route.params.merchantId],
  );

  if (!merchant)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Muted>Merchant tidak ditemukan.</Muted>
      </View>
    );

  const openVisit = mVisits.find((v) => !v.checkOutAt && v.agentId === me.id);
  const team = teams.find((t) => t.id === merchant.teamId);
  const agent = users.find((u) => u.id === merchant.assignedTo);
  const isManager = MANAGER_ROLES.includes(me.role);
  const agents = users.filter((u) => u.role === 'field_agent' && u.active);

  const beginVisit = async () => {
    if (openVisit) {
      navigation.navigate('VisitFlow', { visitId: openVisit.id });
      return;
    }
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showDialog('Izin lokasi diperlukan', 'Aktifkan izin lokasi untuk check-in di merchant.');
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
      navigation.navigate('VisitFlow', { visitId: id });
    } catch {
      showDialog('Gagal', 'Tidak dapat mengambil lokasi. Coba lagi.');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H style={{ fontSize: 17, flexShrink: 1 }}>{merchant.name}</H>
          <Badge label={STATUS_LABEL[merchant.status]} color={STATUS_COLOR[merchant.status]} />
        </View>
        <Muted style={{ marginTop: 4 }}>
          {merchant.address}
          {'\n'}
          {team ? `Tim ${team.name} · ${TIER_LABEL[merchant.cityTier]}` : TIER_LABEL[merchant.cityTier]}
        </Muted>
        <Muted style={{ marginTop: 6 }}>Pemilik: {merchant.ownerName || '-'}</Muted>
        <Muted>Kontak: {merchant.phone || '-'}</Muted>
        <Muted>Agen: {agent?.name ?? 'Belum di-assign'}</Muted>
        <Muted>Dibuat: {fmtDateTime(merchant.createdAt)}</Muted>
      </Card>

      {(merchant.lat == null || merchant.lng == null) ? (
        <MapPlaceholder text="Pin lokasi belum tersedia" />
      ) : (
        <LeafletMap
          height={180}
          markers={[{ lat: merchant.lat!, lng: merchant.lng!, label: merchant.name, color: C.accent }]}
        />
      )}

      {/* Aksi kunjungan utk field agent */}
      {me.role === 'field_agent' && (
        <Btn title={openVisit ? 'Lanjutkan Kunjungan (check-in aktif)' : `CHECK IN di ${merchant.name}`} onPress={beginVisit} />
      )}

      {/* Manajemen status & assignment utk TL/Admin */}
      {isManager && (
        <>
          <Card>
            <H>Ubah Status</H>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['cold_start', 'registered', 'activated'] as MerchantStatus[]).map((st) => (
                <Chip
                  key={st}
                  label={STATUS_LABEL[st]}
                  active={merchant.status === st}
                  onPress={() => upsertMerchant({ ...merchant, status: st })}
                />
              ))}
            </View>
            {merchant.status === 'activated' && !merchant.coldStartDone && (
              <TouchableOpacity
                style={{ marginTop: 10 }}
                onPress={() => upsertMerchant({ ...merchant, coldStartDone: true })}
              >
                <Text style={{ color: C.ok, fontWeight: '700', fontSize: 13 }}>Tandai Cold Start Complete</Text>
              </TouchableOpacity>
            )}
          </Card>

          <Card>
            <H>Assign ke Field Agent</H>
            <Muted style={{ marginTop: 2 }}>Agen saat ini: {agent?.name ?? 'Belum di-assign'}</Muted>
            {assigning ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                {agents.map((a) => (
                  <Chip
                    key={a.id}
                    label={`${a.name} (${teams.find((t) => t.id === a.teamId)?.name ?? '-'})`}
                    active={merchant.assignedTo === a.id}
                    onPress={() => {
                      upsertMerchant({
                        ...merchant,
                        assignedTo: a.id,
                        teamId: a.teamId,
                      });
                      setAssigning(false);
                    }}
                  />
                ))}
                <Chip
                  label="Batalkan assign"
                  active={false}
                  onPress={() => {
                    upsertMerchant({ ...merchant, assignedTo: null });
                    setAssigning(false);
                  }}
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn small title="Pilih Agen" variant="outline" onPress={() => setAssigning(true)} />
                <Btn small title="Edit Data" variant="outline" onPress={() => navigation.navigate('MerchantForm', { merchantId: merchant.id })} />
              </View>
            )}
          </Card>
        </>
      )}

      <Card>
        <H>Riwayat Kunjungan ({mVisits.length})</H>
        {mVisits.length === 0 ? (
          <Empty text="Belum ada kunjungan." />
        ) : (
          mVisits.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => navigation.navigate('VisitFlow', { visitId: v.id })}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: C.divider }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                  {users.find((u) => u.id === v.agentId)?.name ?? v.agentId}
                </Text>
                <Text style={{ fontSize: 12, color: C.muted }}>{fmtDateTime(v.checkInAt)}</Text>
              </View>
              <Muted style={{ marginTop: 2 }}>
                {v.checkOutAt
                  ? `Selesai · durasi ${fmtDurShort(v.checkOutAt - v.checkInAt)}`
                  : 'Berlangsung (belum check-out)'}
                {' · '}
                {v.geoValid ? 'geo valid' : `di luar radius ${v.merchantDistanceM ?? '?'}m`}
              </Muted>
            </TouchableOpacity>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
