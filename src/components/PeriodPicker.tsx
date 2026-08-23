import React from 'react';
import { ScrollView, View } from 'react-native';
import { MONTHS_SHORT, PERIODS, PeriodKey } from '../utils/period';
import { Chip } from './ui';

export function PeriodPicker({
  period,
  month,
  onPeriod,
  onMonth,
}: {
  period: PeriodKey;
  month: number;
  onPeriod: (p: PeriodKey) => void;
  onMonth: (m: number) => void;
}) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
          {PERIODS.map((p) => (
            <Chip key={p.key} label={p.label} active={period === p.key} onPress={() => onPeriod(p.key)} />
          ))}
        </View>
      </ScrollView>
      {period === 'monthly' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingRight: 8 }}>
            {MONTHS_SHORT.map((lbl, i) => (
              <Chip
                key={lbl}
                label={lbl}
                active={month === i}
                onPress={() => onMonth(i)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
