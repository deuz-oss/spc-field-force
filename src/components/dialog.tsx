import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../theme';

export interface DialogButton {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

interface DialogState {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

let listener: ((s: DialogState | null) => void) | null = null;

/**
 * Pengganti Alert.alert yang bekerja di Android, iOS, dan Web
 * (Alert.alert tidak melakukan apa-apa di web).
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]) {
  const btns = buttons && buttons.length ? buttons : [{ label: 'OK' }];
  listener?.({ title, message, buttons: btns });
}

export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    listener = setState;
    return () => {
      listener = null;
    };
  }, []);

  const close = (fn?: () => void) => {
    setState(null);
    fn?.();
  };

  return (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => close()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{state?.title}</Text>
          {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}
          <View style={styles.buttonsRow}>
            {(state?.buttons ?? []).map((b) => (
              <TouchableOpacity
                key={b.label}
                activeOpacity={0.8}
                onPress={() => close(b.onPress)}
                style={[styles.btn, { backgroundColor: b.destructive ? C.accent : C.primary }]}
              >
                <Text style={styles.btnLabel}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  message: { marginTop: 8, color: C.muted, fontSize: 13, lineHeight: 19 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9 },
  btnLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
