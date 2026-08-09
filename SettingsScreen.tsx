import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { saveRpcEndpoint, loadRpcEndpoint } from '../services/storage';
import { DEFAULT_RPC_WSS } from '../utils/constants';

export default function SettingsScreen() {
  const [rpc, setRpc] = useState(DEFAULT_RPC_WSS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await loadRpcEndpoint();
      if (stored) setRpc(stored);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>Solana RPC WebSocket URL</Text>
      <Text style={styles.hint}>
        Public RPCs rate-limit heavily. For reliable real-time detection, use a paid provider
        (Helius, QuickNode, Triton) and paste its wss:// URL here.
      </Text>
      <TextInput
        style={styles.input}
        value={rpc}
        onChangeText={setRpc}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="wss://..."
        placeholderTextColor="#555"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          await saveRpcEndpoint(rpc);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
      >
        <Text style={styles.buttonText}>{saved ? 'Saved ✓' : 'Save'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  label: { color: '#fff', fontWeight: '600', marginBottom: 6 },
  hint: { color: '#666', fontSize: 12, marginBottom: 12, lineHeight: 16 },
  input: {
    backgroundColor: '#15151C',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  button: { backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#0B0B0F', fontWeight: '700' },
});
