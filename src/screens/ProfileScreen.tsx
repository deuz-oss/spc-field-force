import React, { useMemo } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { Badge, Btn, Card, H, KPICard, Muted, SectionHeader } from '../components/ui';
import { showDialog } from '../components/dialog';
import { APP_NAME, ROLE_LABEL } from '../config';
import { C, F } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { fmtDurShort, fmtKm, MONTHS_ID } from '../utils/format';
import { polylineKm } from '../utils/geo';

const FIELD_ROLES = ['field_agent', 'team_lead'];

export default function ProfileScreen() {
  const me = useCurrentUser()!;
  const logout = useStore((s) => s.logout);
  const resetDemo = useStore((s) => s.resetDemo);
  const teams = useStore((s) => s.teams);
  const users = useStore((s) => s.users);
  const merchants = useStore((s) => s.merchants);
  const visits = useStore((s) => s.visits);
  const attendances = useStore((s) => s.attendances);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const myVisits = visits.filter((v) => v.agentId === me.id && v.checkInAt >= monthStart);
  const myAtt = attendances.filter((a) => a.userId === me.id && a.clockInAt >= monthStart);
  const hours = myAtt.reduce((t, a) => t + ((a.clockOutAt ?? Date.now()) - a.clockInAt), 0);
  const km = myAtt.reduce((t, a) => t + polylineKm(a.route), 0);
  const myMerchants = merchants.filter((m) => m.assignedTo === me.id);

  const team = teams.find((t) => t.id === me.teamId);
  const isFieldRole = FIELD_ROLES.includes(me.role);

  return (
    <ScrollView tabIndex={0} role="main" contentContainerStyle={{ padding: 16, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: C.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.onPrimary, fontSize: 22, fontFamily: F.xbold }}>
              {me.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 17, fontFamily: F.xbold, color: C.text }}>{me.name}</Text>
            <Muted>@{me.username}</Muted>
            {team ? <Muted>Tim {team.name}</Muted> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge label={ROLE_LABEL[me.role]} color={C.primaryText} />
        </View>
      </Card>

      {isFieldRole ? (
        <Card>
          <SectionHeader title="Aktivitas Saya — Bulan Ini" subtitle={MONTHS_ID[new Date().getMonth()]} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <KPICard title="Kunjungan" value={String(myVisits.length)} status="neutral" />
            <KPICard title="Jam Kerja" value={fmtDurShort(hours)} status="neutral" />
            <KPICard title="Jarak" value={fmtKm(km)} status="neutral" />
            <KPICard title="Merchant Saya" value={String(myMerchants.length)} status="neutral" />
          </View>
        </Card>
      ) : (
        <Card>
          <SectionHeader title="Ringkasan Akses" subtitle="Lingkup pemantauan sesuai posisi Anda" />
          <View style={{ gap: 8, marginTop: 10 }}>
            <InfoLine label="Total Tim" value={String(teams.length)} />
            <InfoLine label="Total Pengguna" value={String(users.filter((u) => u.active).length)} />
            <InfoLine label="Total Merchant" value={String(merchants.length)} />
          </View>
          <Muted style={{ marginTop: 10 }}>
            {ROLE_LABEL[me.role]} memantau data operasional secara agregat — bukan mencatat aktivitas lapangan pribadi.
          </Muted>
        </Card>
      )}

      {Platform.OS === 'android' && me.role === 'field_agent' && (
        <Card>
          <SectionHeader title="Optimasi Baterai" subtitle="Supaya rute tetap terekam saat HP terkunci" />
          <Muted style={{ marginTop: 6 }}>
            Sebagian HP (terutama Samsung/Xiaomi) mematikan aplikasi latar belakang otomatis untuk
            hemat baterai — ini bisa menghentikan pelacakan rute walau sesi absensi masih berjalan.
            Matikan optimasi baterai untuk aplikasi ini agar rute tetap terekam sampai Anda clock-out.
          </Muted>
          <View style={{ marginTop: 10 }}>
            <Btn
              variant="outline"
              title="Buka Pengaturan Baterai"
              onPress={() =>
                IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
              }
            />
          </View>
        </Card>
      )}

      <Btn
        title="Keluar (Logout)"
        variant="danger"
        onPress={() =>
          showDialog('Logout', 'Yakin ingin keluar?', [
            { label: 'Batal' },
            { label: 'Logout', destructive: true, onPress: logout },
          ])
        }
      />

      <Btn
        variant="outline"
        title="Muat Ulang Data"
        onPress={() => resetDemo()}
      />

      <Muted style={{ textAlign: 'center' }}>
        {APP_NAME} v1.0.0{'\n'}Field Sales & Incubation Force Management
      </Muted>
    </ScrollView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Muted>{label}</Muted>
      <Text style={{ color: C.text, fontFamily: F.bold, fontSize: 13 }}>{value}</Text>
    </View>
  );
}
