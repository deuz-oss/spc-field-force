import React, { useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Badge, Btn, Card, Chip, Field, H, Input, Muted } from '../components/ui';
import { showDialog } from '../components/dialog';
import { ROLE_LABEL } from '../config';
import { C } from '../theme';
import { useCurrentUser, useStore } from '../store/useStore';
import { Role } from '../types';

const ALL_ROLES: Role[] = ['super_admin', 'admin', 'team_lead', 'field_agent', 'client'];
const TEAMLESS_ROLES: Role[] = ['super_admin', 'admin', 'client'];

const ROLE_COLOR: Record<Role, string> = {
  super_admin: C.purple,
  admin: C.teal,
  team_lead: C.info,
  field_agent: C.ok,
  client: C.warn,
};

export default function UsersScreen() {
  const me = useCurrentUser()!;
  const users = useStore((s) => s.users);
  const teams = useStore((s) => s.teams);
  const addUser = useStore((s) => s.addUser);
  const updateUser = useStore((s) => s.updateUser);
  const toggleUserActive = useStore((s) => s.toggleUserActive);
  const addTeam = useStore((s) => s.addTeam);

  // form tambah pengguna
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('field_agent');
  const [teamId, setTeamId] = useState<string | null>(teams[0]?.id ?? null);

  // form edit akun
  const [editId, setEditId] = useState<string | null>(null);
  const [eRole, setERole] = useState<Role>('field_agent');
  const [eTeamId, setETeamId] = useState<string | null>(null);
  const [ePassword, setEPassword] = useState('');

  // form tim baru
  const [showTeam, setShowTeam] = useState(false);
  const [tName, setTName] = useState('');
  const [tCity, setTCity] = useState('');

  if (me.role !== 'super_admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Muted>Hanya Super Admin yang dapat mengatur akun akses.</Muted>
      </View>
    );
  }

  const submitUser = () => {
    const err = addUser({ name, username, password, role, teamId, phone });
    if (err) {
      showDialog('Tidak bisa menyimpan', err);
      return;
    }
    setName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setShowForm(false);
    showDialog('Berhasil', 'Pengguna baru ditambahkan.');
  };

  const startEdit = (id: string, r: Role, t: string | null) => {
    setEditId(id);
    setERole(r);
    setETeamId(t);
    setEPassword('');
  };

  const saveEdit = () => {
    if (!editId) return;
    const err = updateUser(editId, {
      role: eRole,
      teamId: TEAMLESS_ROLES.includes(eRole) ? null : eTeamId,
      password: ePassword,
    });
    if (err) {
      showDialog('Tidak bisa menyimpan', err);
      return;
    }
    setEditId(null);
    showDialog('Berhasil', 'Pengaturan akun diperbarui.');
  };

  const resetPassword = (uname: string) => {
    showDialog('Reset Password', `Set password akun "${uname}" menjadi "spc12345"?`, [
      { label: 'Batal' },
      {
        label: 'Reset',
        destructive: true,
        onPress: () => {
          const err = updateUser(
            users.find((u) => u.username === uname)!.id,
            { password: 'spc12345' },
          );
          showDialog(
            err ? 'Gagal' : 'Berhasil',
            err ?? `Password "${uname}" sekarang: spc12345`,
          );
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>Pengguna ({users.length})</H>
        <Btn small variant="outline" title={showForm ? 'Tutup' : '+ Pengguna'} onPress={() => setShowForm(!showForm)} />
      </View>

      {showForm && (
        <Card style={{ gap: 10 }}>
          <Field label="Nama">
            <Input value={name} onChangeText={setName} placeholder="Nama lengkap" />
          </Field>
          <Field label="Username">
            <Input value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" />
          </Field>
          <Field label="Password">
            <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="min. 4 karakter" />
          </Field>
          <Field label="Telepon">
            <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="08xx" />
          </Field>
          <Field label="Posisi / Hak Akses">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ALL_ROLES.map((r) => (
                <Chip key={r} label={ROLE_LABEL[r]} active={role === r} onPress={() => setRole(r)} />
              ))}
            </View>
          </Field>
          {!TEAMLESS_ROLES.includes(role) && (
            <Field label="Tim">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {teams.map((t) => (
                  <Chip key={t.id} label={t.name} active={teamId === t.id} onPress={() => setTeamId(t.id)} />
                ))}
              </View>
            </Field>
          )}
          <Btn title="Simpan Pengguna" onPress={submitUser} />
        </Card>
      )}

      {users.map((u) => {
        const editing = editId === u.id;
        return (
          <Card key={u.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{u.name}</Text>
                <Muted>@{u.username}</Muted>
              </View>
              <Switch value={u.active} onValueChange={() => toggleUserActive(u.id)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge label={ROLE_LABEL[u.role]} color={ROLE_COLOR[u.role]} />
              {u.teamId && <Badge label={teams.find((t) => t.id === u.teamId)?.name ?? '-'} color={C.muted} />}
              {!u.active && <Badge label="Nonaktif" color={C.accent} />}
            </View>

            {editing ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <Field label="Ubah Posisi">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ALL_ROLES.map((r) => (
                      <Chip key={r} label={ROLE_LABEL[r]} active={eRole === r} onPress={() => setERole(r)} />
                    ))}
                  </View>
                </Field>
                {!TEAMLESS_ROLES.includes(eRole) && (
                  <Field label="Tim">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {teams.map((t) => (
                        <Chip key={t.id} label={t.name} active={eTeamId === t.id} onPress={() => setETeamId(t.id)} />
                      ))}
                    </View>
                  </Field>
                )}
                <Field label="Password Baru (kosongkan bila tidak diubah)">
                  <Input value={ePassword} onChangeText={setEPassword} secureTextEntry placeholder="min. 4 karakter" />
                </Field>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Btn small title="Simpan" onPress={saveEdit} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn small variant="outline" title="Batal" onPress={() => setEditId(null)} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
                <TouchableOpacity onPress={() => startEdit(u.id, u.role, u.teamId)}>
                  <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Atur Akses</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => resetPassword(u.username)}>
                  <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>Reset Password</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        );
      })}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <H>Tim ({teams.length})</H>
        <Btn small variant="outline" title={showTeam ? 'Tutup' : '+ Tim'} onPress={() => setShowTeam(!showTeam)} />
      </View>

      {showTeam && (
        <Card style={{ gap: 10 }}>
          <Field label="Nama Tim">
            <Input value={tName} onChangeText={setTName} placeholder="cth. Jakarta Timur" />
          </Field>
          <Field label="Kota / Area">
            <Input value={tCity} onChangeText={setTCity} placeholder="cth. DKI Jakarta" />
          </Field>
          <Btn
            title="Simpan Tim"
            onPress={() => {
              if (!tCity.trim()) {
                showDialog('Kota wajib diisi.');
                return;
              }
              addTeam({ name: tName || tCity, city: tCity, cityTier: 'tier1', lat: -6.2, lng: 106.816666 });
              setTName('');
              setTCity('');
              setShowTeam(false);
            }}
          />
          <TouchableOpacity onPress={() => undefined}>
            <Muted>Pusat geo-fence default Jakarta; koordinat dapat disesuaikan nanti.</Muted>
          </TouchableOpacity>
        </Card>
      )}

      {teams.map((t) => (
        <Card key={t.id}>
          <Text style={{ fontWeight: '700', color: C.text }}>{t.name}</Text>
          <Muted>
            {t.city} · radius geo-fence {t.radiusKm} km · {users.filter((u) => u.teamId === t.id).length} anggota
          </Muted>
        </Card>
      ))}
    </ScrollView>
  );
}
