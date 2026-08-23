import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Badge, Btn, Card, H, Muted } from '../components/ui';
import { showDialog } from '../components/dialog';
import { APP_NAME, ROLE_LABEL } from '../config';
import { C } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { fmtDurShort, fmtKm, MONTHS_ID } from '../utils/format';
import { polylineKm } from '../utils/geo';

export default function ProfileScreen() {
  const me = useCurrentUser()!;
  const logout = useStore((s) => s.logout);
  const resetDemo = useStore((s) => s.resetDemo);
  const teams = useStore((s) => s.teams);
  const visits = useStore((s) => s.visits);
  const attendances = useStore((s) => s.attendances);
  const merchants = useStore((s) => s.merchants);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);

  const myVisits = visits.filter(
    (v) => v.agentId === me.id && v.checkInAt >= monthStart,
  );
  const myAtt = attendances.filter((a) => a.userId === me.id && a.clockInAt >= monthStart);
  const hours = myAtt.reduce((t, a) => t + ((a.clockOutAt ?? Date.now()) - a.clockInAt), 0);
  const km = myAtt.reduce((t, a) => t + polylineKm(a.route), 0);
  const myMerchants = merchants.filter((m) => m.assignedTo === me.id);

  const team = teams.find((t) => t.id === me.teamId);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
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
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>
              {me.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{me.name}</Text>
            <Muted>@{me.username}</Muted>
            {team ? <Muted>Tim {team.name}</Muted> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge label={ROLE_LABEL[me.role]} color={C.primary} />
          {me.role === 'field_agent' && (
            <Badge label="Option 3 · Acquisition + Incubation" color={C.purple} />
          )}
        </View>
      </Card>

      <Card>
        <H>Aktivitas Saya — Bulan Ini</H>
        <Text style={{ color: C.muted, marginTop: 2, fontSize: 11 }}>
          {MONTHS_ID[new Date().getMonth()]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Card style={{ flex: 1 }}>
            <Muted>Kunjungan</Muted>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.primary }}>{myVisits.length}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Mutable>Jam Kerja</Mutable>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.info }}>{fmtDurShort(hours)}</Text>
          </Card>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Card style={{ flex: 1 }}>
            <Muted>Jarak</Muted>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.ok }}>{fmtKm(km)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Muted>Merchant Saya</Muted>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.warn }}>{myMerchants.length}</Text>
          </Card>
        </View>
      </Card>

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
        title="Reset Data Demo"
        onPress={() =>
          showDialog('Reset Demo', 'Semua data akan dikembalikan ke kondisi awal.', [
            { label: 'Batal' },
            { label: 'Reset', destructive: true, onPress: resetDemo },
          ])
        }
      />

      <Muted style={{ textAlign: 'center' }}>
        {APP_NAME} v1.0.0{'\n'}Field Sales & Incubation Force Management
      </Muted>
    </ScrollView>
  );
}

function Mutable({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: C.muted, fontSize: 12 }}>{children}</Text>;
}
