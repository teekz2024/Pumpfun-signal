import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RiskLevel } from '../types';

const COLORS: Record<RiskLevel, string> = {
  LOW: '#1DB954',
  MEDIUM: '#F5A623',
  HIGH: '#E03131',
};

export function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: COLORS[level] }]}>
      <Text style={styles.text}>{level} · {score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    color: '#0B0B0F',
    fontWeight: '700',
    fontSize: 12,
  },
});
