import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, F, R, SP, T } from '../theme';
import { Empty } from './ui';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  /** relative width weight (flexGrow) — columns share available width proportionally */
  flex?: number;
  /** fixed width in px instead of a flex share, for narrow columns like status badges */
  width?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  /** semibold weight for numeric/metric columns, visually distinct from prose cells */
  mono?: boolean;
  render: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowPress?: (item: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  emptyText?: string;
}

const ROW_HEIGHT = 52;
const CHECKBOX_COL_WIDTH = 40;

/**
 * A real, semantic (role="table"/"row"/"columnheader"/"cell" on web via
 * react-native-web's role passthrough) data grid — desktop-only. Mobile keeps
 * the existing card-list screens; a dense multi-column table doesn't work on
 * a phone, and the Data Grid audit's own target model agreed cards are fine
 * there. This exists specifically for the admin/desktop context where a real
 * table was the single most-cited "not enterprise-grade" gap.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  sortKey,
  sortDir,
  onSort,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  emptyText = 'Tidak ada data.',
}: DataTableProps<T>) {
  const allSelected = selectable && data.length > 0 && data.every((d) => selectedIds?.has(keyExtractor(d)));
  const someSelected = selectable && data.some((d) => selectedIds?.has(keyExtractor(d)));

  const colStyle = (col: DataTableColumn<T>) =>
    col.width ? { width: col.width, flexGrow: 0, flexShrink: 0 } : { flex: col.flex ?? 1 };

  return (
    <View role="table" aria-label="Tabel data" style={styles.table}>
      <View role="row" style={styles.headerRow}>
        {selectable && (
          <View style={[styles.cell, { width: CHECKBOX_COL_WIDTH, flexGrow: 0 }]}>
            <Pressable
              onPress={onToggleSelectAll}
              accessibilityRole="checkbox"
              aria-label="Pilih semua baris"
              hitSlop={8}
            >
              <Ionicons
                name={allSelected ? 'checkbox' : someSelected ? 'remove-circle' : 'square-outline'}
                size={20}
                color={allSelected || someSelected ? C.primaryDark : C.faint}
              />
            </Pressable>
          </View>
        )}
        {columns.map((col) => (
          <View role="columnheader" key={col.key} style={[styles.cell, colStyle(col)]}>
            <Pressable
              disabled={!col.sortable}
              onPress={() => col.sortable && onSort?.(col.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
              aria-label={col.sortable ? `Urutkan berdasarkan ${col.label}` : undefined}
            >
              <Text style={[T.caption, { textAlign: col.align }]}>{col.label}</Text>
              {col.sortable && sortKey === col.key && (
                <Ionicons name={sortDir === 'asc' ? 'caret-up' : 'caret-down'} size={11} color={C.primaryDark} />
              )}
            </Pressable>
          </View>
        ))}
      </View>

      {data.length === 0 ? (
        <Empty text={emptyText} />
      ) : (
        data.map((item) => {
          const id = keyExtractor(item);
          const selected = selectedIds?.has(id);
          const Row = onRowPress || selectable ? Pressable : View;
          return (
            <Row
              key={id}
              role="row"
              aria-selected={selectable ? !!selected : undefined}
              onPress={
                onRowPress || (selectable && onToggleSelect)
                  ? () => (selectable ? onToggleSelect?.(id) : onRowPress?.(item))
                  : undefined
              }
              style={[styles.row, selected && { backgroundColor: C.surfaceAlt }]}
            >
              {selectable && (
                <View style={[styles.cell, { width: CHECKBOX_COL_WIDTH, flexGrow: 0 }]}>
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={selected ? C.primaryDark : C.faint}
                  />
                </View>
              )}
              {columns.map((col) => {
                const rendered = col.render(item);
                const isPrimitive = typeof rendered === 'string' || typeof rendered === 'number';
                return (
                  <View role="cell" key={col.key} style={[styles.cell, colStyle(col)]}>
                    {isPrimitive ? (
                      <Text
                        style={[
                          col.mono ? { fontFamily: F.semi, fontSize: 13, color: C.text } : { fontFamily: F.reg, fontSize: 13.5, color: C.text },
                          { textAlign: col.align },
                        ]}
                        numberOfLines={1}
                      >
                        {rendered}
                      </Text>
                    ) : (
                      rendered
                    )}
                  </View>
                );
              })}
            </Row>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: C.card,
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: C.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    minHeight: 40,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
  },
  cell: {
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm,
    justifyContent: 'center',
  },
});
