import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Connection } from '@solana/web3.js';
import { PumpFunListener } from '../services/pumpFunListener';
import { RiskScorer } from '../services/riskScorer';
import { initNotifications, notifyLaunch } from '../services/notifications';
import { saveFeed, loadFeed, loadRpcEndpoint } from '../services/storage';
import { RiskBadge } from '../components/RiskBadge';
import { TokenLaunch, RiskLevel } from '../types';
import { DEFAULT_RPC_WSS } from '../utils/constants';

type Filter = 'ALL' | RiskLevel;

export default function FeedScreen({ navigation }: any) {
  const [tokens, setTokens] = useState<TokenLaunch[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const recentNamesRef = useRef<string[]>([]);
  const listenerRef = useRef<PumpFunListener | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const cached = await loadFeed();
      if (mounted) setTokens(cached);

      await initNotifications();
      const rpcWss = (await loadRpcEndpoint()) || DEFAULT_RPC_WSS;
      const connection = new Connection(rpcWss.replace('wss', 'https'), { wsEndpoint: rpcWss });
      const scorer = new RiskScorer(connection);

      const listener = new PumpFunListener(rpcWss, async (launch) => {
        const risk = await scorer.assess(launch, recentNamesRef.current);
        const scored: TokenLaunch = { ...launch, risk };

        recentNamesRef.current = [launch.name, ...recentNamesRef.current].slice(0, 200);

        if (!mounted) return;
        setTokens((prev) => {
          const next = [scored, ...prev];
          saveFeed(next); // fire-and-forget persist, not part of the state update itself
          return next;
        });

        await notifyLaunch(scored);
      });

      listener.start();
      listenerRef.current = listener;
      setConnected(true);
    })();

    return () => {
      mounted = false;
      listenerRef.current?.stop();
    };
  }, []);

  const filtered = filter === 'ALL' ? tokens : tokens.filter((t) => t.risk?.level === filter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>pump.fun Signal</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#1DB954' : '#666' }]} />
          <Text style={styles.statusText}>{connected ? 'Live' : 'Connecting...'}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.signature}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('TokenDetail', { token: item })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.tokenName}>{item.name} <Text style={styles.tokenSymbol}>${item.symbol}</Text></Text>
              <Text style={styles.mint}>{item.mint.slice(0, 6)}...{item.mint.slice(-4)}</Text>
            </View>
            {item.risk && <RiskBadge level={item.risk.level} score={item.risk.score} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Waiting for new launches on pump.fun...</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#999', fontSize: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1A1A22' },
  filterChipActive: { backgroundColor: '#fff' },
  filterText: { color: '#999', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#0B0B0F' },
  card: {
    backgroundColor: '#15151C',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tokenSymbol: { color: '#999', fontWeight: '500' },
  mint: { color: '#666', fontSize: 12, marginTop: 2 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60 },
});
