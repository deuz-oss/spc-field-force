import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { C, ELEV, F, R, SP, T } from '../theme';

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

export function Muted({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: object;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={{ color: C.muted, fontSize: 12.5, lineHeight: 18, fontFamily: F.reg, ...style }}
    >
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

/** Header halaman: judul + subjudul + aksi opsional (dipakai di dalam ScrollView, bukan header navigasi) */
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View style={{ flexShrink: 1 }}>
        <Text style={T.h1}>{title}</Text>
        {subtitle ? <Muted style={{ marginTop: 2 }}>{subtitle}</Muted> : null}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Baris list generik: judul + subjudul + meta kanan-atas + trailing (badge/elemen bebas) */
export function ListRow({
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  emphasis,
  numberOfLines = 1,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** garis kiri berwarna — utk menandai status tanpa hanya mengandalkan warna latar */
  emphasis?: { color: string; label: string };
  numberOfLines?: number;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        backgroundColor: C.card,
        borderRadius: R.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: C.border,
        overflow: 'hidden',
      }}
    >
      {emphasis && <View style={{ width: 4, backgroundColor: emphasis.color }} />}
      <View style={{ flex: 1, padding: SP.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text style={[T.h3, { flexShrink: 1 }]} numberOfLines={numberOfLines}>
            {title}
          </Text>
          {trailing}
        </View>
        {subtitle ? (
          <Muted style={{ marginTop: 2 }} numberOfLines={numberOfLines}>
            {subtitle}
          </Muted>
        ) : null}
        {(meta || emphasis) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {emphasis ? (
              <Text style={{ fontSize: 11, color: emphasis.color, fontFamily: F.semi }}>{emphasis.label}</Text>
            ) : (
              <View />
            )}
            {meta ? <Text style={{ fontSize: 11, color: C.faint, fontFamily: F.reg }}>{meta}</Text> : null}
          </View>
        )}
      </View>
    </Wrapper>
  );
}

/** Badge dgn ikon — status TIDAK hanya diwakili warna (brief §18) */
export function StatusBadge({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: color + '1A',
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Ionicons name={icon} size={11} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '700', fontFamily: F.semi }}>{label}</Text>
    </View>
  );
}

/** Funnel horizontal proporsional — tiap tahap melebar sesuai nilainya vs tahap pertama */
export function FunnelChart({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <View style={{ gap: 8 }}>
      {steps.map((s, i) => {
        const pct = Math.max(6, Math.round((s.value / max) * 100));
        const color = i === 0 ? C.muted : i === steps.length - 1 ? C.ok : C.info;
        return (
          <View key={s.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 11.5, color: C.text, fontFamily: F.semi }}>{s.label}</Text>
              <Text style={{ fontSize: 11.5, color, fontFamily: F.bold }}>{s.value}</Text>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: C.divider }}>
              <View style={{ width: `${pct}%`, height: 10, borderRadius: 5, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export type KPIStatus = 'ok' | 'warn' | 'danger' | 'neutral';

const KPI_STATUS: Record<KPIStatus, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  ok: { color: C.ok, icon: 'checkmark-circle', label: 'On Track' },
  warn: { color: C.warn, icon: 'alert-circle', label: 'Perlu Perhatian' },
  danger: { color: C.accent, icon: 'close-circle', label: 'Di Bawah Target' },
  neutral: { color: C.faint, icon: 'ellipse-outline', label: 'Belum Ada Data' },
};

/**
 * Kartu KPI enterprise: metric + target + variance + status + trend (brief §8).
 * Status TIDAK hanya diwakili warna — selalu disertai ikon + label teks.
 */
export function KPICard({
  title,
  value,
  target,
  status = 'neutral',
  statusLabel,
  trend,
}: {
  title: string;
  value: string;
  /** cth. "Target 95%" */
  target?: string;
  status?: KPIStatus;
  /** override label default status (mis. "Butuh 3 kunjungan lagi") */
  statusLabel?: string;
  /** cth. { direction:'down', label:'1.1% vs kemarin' } */
  trend?: { direction: 'up' | 'down' | 'flat'; label: string; good?: boolean };
}) {
  const st = KPI_STATUS[status];
  const trendIcon = trend?.direction === 'up' ? 'trending-up' : trend?.direction === 'down' ? 'trending-down' : 'remove';
  const trendColor = trend ? (trend.good === false ? C.accent : trend.good ? C.ok : C.muted) : C.muted;
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        backgroundColor: C.card,
        borderRadius: R.card,
        padding: SP.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: C.border,
        ...ELEV[1],
      }}
    >
      <Text style={T.caption}>{title}</Text>
      <Text style={[T.metric, { color: C.text, marginTop: 4 }]}>{value}</Text>
      {target ? <Muted style={{ marginTop: 2 }}>{target}</Muted> : null}
      {trend && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
          <Ionicons name={trendIcon} size={13} color={trendColor} />
          <Text style={{ fontSize: 11, color: trendColor, fontFamily: F.semi }}>{trend.label}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <Ionicons name={st.icon} size={13} color={st.color} />
        <Text style={{ fontSize: 11, color: st.color, fontFamily: F.semi }}>{statusLabel ?? st.label}</Text>
      </View>
    </View>
  );
}

/** Placeholder loading statis (tanpa animasi) utk skeleton kartu/list */
export function SkeletonBlock({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: object }) {
  return (
    <View
      style={[{ height, width: width as any, borderRadius: 6, backgroundColor: C.divider }, style]}
    />
  );
}

export function LoadingCard() {
  return (
    <Card style={{ gap: 8 }}>
      <SkeletonBlock width="40%" height={11} />
      <SkeletonBlock width="60%" height={22} style={{ marginTop: 4 }} />
      <SkeletonBlock width="80%" height={12} style={{ marginTop: 4 }} />
    </Card>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
      <Ionicons name="warning-outline" size={22} color={C.accent} />
      <Text style={{ color: C.text, fontSize: 13, fontFamily: F.semi, textAlign: 'center' }}>{text}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={{ color: C.primary, fontFamily: F.bold, fontSize: 13 }}>Coba lagi</Text>
        </TouchableOpacity>
      )}
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
