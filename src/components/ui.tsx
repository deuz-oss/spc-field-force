import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { C, F, R, SP } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: C.card,
          borderRadius: R.card,
          padding: SP.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: C.border,
          shadowColor: '#0F172A',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Text style={{ fontSize: 16, lineHeight: 22, fontFamily: F.bold, color: C.text, ...style }}>
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Text style={{ color: C.muted, fontSize: 12.5, lineHeight: 18, fontFamily: F.reg, ...style }}>
      {children}
    </Text>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color + '1A',
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '700', fontFamily: F.semi }}>{label}</Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = C.primary,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? color : C.border,
        backgroundColor: active ? color : C.card,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          fontFamily: F.semi,
          color: active ? '#FFFFFF' : C.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Btn({
  title,
  onPress,
  variant = 'primary',
  disabled,
  small,
  loading,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ok';
  disabled?: boolean;
  small?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? C.primary
      : variant === 'danger'
      ? C.accent
      : variant === 'ok'
      ? C.ok
      : 'transparent';
  const fg = variant === 'outline' ? C.primary : '#FFFFFF';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={{
        backgroundColor: bg,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: C.primary,
        opacity: disabled ? 0.45 : 1,
        borderRadius: R.btn,
        minHeight: small ? 38 : 48,
        paddingHorizontal: SP.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: SP.sm,
      }}
    >
      {loading && <ActivityIndicator size="small" color={fg} />}
      <Text
        style={{
          color: fg,
          fontWeight: '700',
          fontFamily: F.bold,
          fontSize: small ? 13 : 14.5,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={C.faint}
      {...props}
      style={[
        {
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: R.input,
          paddingHorizontal: SP.md,
          paddingVertical: 12,
          fontSize: 14.5,
          color: C.text,
          fontFamily: F.reg,
        },
        props.style,
      ]}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '600', fontFamily: F.semi, color: C.text }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function StatCard({
  title,
  value,
  sub,
  color = C.primary,
}: {
  title: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <Text
        style={{
          color: C.muted,
          fontSize: 10.5,
          fontWeight: '700',
          fontFamily: F.semi,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          fontFamily: F.xbold,
          color,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
      {sub ? <Muted style={{ marginTop: 3 }}>{sub}</Muted> : null}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: C.border,
          marginBottom: 10,
        }}
      />
      <Text style={{ color: C.muted, fontSize: 13, fontFamily: F.reg }}>{text}</Text>
    </View>
  );
}

/** Bar mini utk peringkat / progres KPI */
export function MiniBar({
  label,
  value,
  max,
  suffix,
  color = C.primary,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 4;
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: C.muted, fontFamily: F.reg }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', fontFamily: F.bold, color }}>
          {value}
          {suffix ?? ''}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.divider, marginTop: 5 }}>
        <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
    </View>
  );
}
