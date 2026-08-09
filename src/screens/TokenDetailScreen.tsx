import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { RiskBadge } from '../components/RiskBadge';
import { TokenLaunch } from '../types';

export default function TokenDetailScreen({ route }: any) {
  const token: TokenLaunch = route.params.token;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.name}>{token.name} <Text style={styles.symbol}>${token.symbol}</Text></Text>
      <Text style={styles.mint}>{token.mint}</Text>

      {token.risk && (
        <View style={styles.riskHeader}>
          <RiskBadge level={token.risk.level} score={token.risk.score} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Risk factors</Text>
      {token.risk?.factors.length ? (
        token.risk.factors.map((f, i) => (
          <View key={i} style={styles.factorRow}>
            <Text style={styles.factorLabel}>⚠️ {f.label} (+{f.points})</Text>
            <Text style={styles.factorDetail}>{f.detail}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.factorDetail}>No red flags detected — still verify manually before trading.</Text>
      )}

      <TouchableOpacity
        style={styles.link}
        onPress={() => Linking.openURL(`https://pump.fun/${token.mint}`)}
      >
        <Text style={styles.linkText}>View on pump.fun →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.link}
        onPress={() => Linking.openURL(`https://solscan.io/token/${token.mint}`)}
      >
        <Text style={styles.linkText}>View on Solscan →</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        This score is a heuristic based on public on-chain data. It is not financial advice and does not
        guarantee a token is safe. Memecoins are extremely high-risk — only ever risk what you can afford to lose.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  name: { color: '#fff', fontSize: 24, fontWeight: '800' },
  symbol: { color: '#999', fontWeight: '500' },
  mint: { color: '#666', fontSize: 12, marginTop: 4, marginBottom: 16 },
  riskHeader: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  factorRow: { backgroundColor: '#15151C', borderRadius: 12, padding: 12, marginBottom: 8 },
  factorLabel: { color: '#F5A623', fontWeight: '700', marginBottom: 4 },
  factorDetail: { color: '#999', fontSize: 13 },
  link: { marginTop: 12 },
  linkText: { color: '#4DA6FF', fontWeight: '600' },
  disclaimer: { color: '#555', fontSize: 11, marginTop: 28, lineHeight: 16 },
});
