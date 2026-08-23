import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Field, Input, Muted } from '../components/ui';
import { APP_NAME } from '../config';
import { C, F } from '../theme';
import { useStore } from '../store/useStore';

export default function LoginScreen() {
  const login = useStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = () => setErr(login(username, password));

  const quick = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErr(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: SP24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand hero */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={styles.brandMark}>
            <Ionicons name="footsteps" size={38} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>{APP_NAME}</Text>
          <Text style={styles.brandSub}>
            Integrated Merchant Acquisition {'&'} Incubation{'\n'}Quotation Option 3
          </Text>
        </View>

        <Card>
          <Field label="Username">
            <Input value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" />
          </Field>
          <Field label="Password">
            <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
          </Field>
          {err ? (
            <Text style={{ color: C.accent, fontSize: 12.5, fontWeight: '600' }}>{err}</Text>
          ) : null}
          <Btn title="Masuk" onPress={submit} loading={false} />
        </Card>

        <Card style={{ marginTop: 14 }}>
          <Muted>Akun demo — ketuk untuk isi otomatis:</Muted>
          <View style={{ gap: 8, marginTop: 10 }}>
            <Btn small variant="outline" title="Super Admin · superadmin / super123" onPress={() => quick('superadmin', 'super123')} />
            <Btn small variant="outline" title="Client Monitoring · client / client123" onPress={() => quick('client', 'client123')} />
            <Btn small variant="outline" title="Ops Manager · admin / admin123" onPress={() => quick('admin', 'admin123')} />
            <Btn small variant="outline" title="Team Lead · lead.jaksel / lead123" onPress={() => quick('lead.jaksel', 'lead123')} />
            <Btn small variant="outline" title="Field Agent · agent.budi / agent123" onPress={() => quick('agent.budi', 'agent123')} />
          </View>
        </Card>

        <Text style={styles.footer}>© 2026 SPC Group · Field Sales & Incubation Force</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const SP24 = 24;

const styles = StyleSheet.create({
  brandMark: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: F.xbold,
    color: '#FFFFFF',
    marginTop: 14,
    letterSpacing: 0.3,
  },
  brandSub: {
    marginTop: 6,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: F.reg,
  },
  footer: {
    textAlign: 'center',
    color: C.faint,
    fontSize: 11,
    marginTop: 18,
    fontFamily: F.reg,
  },
});
