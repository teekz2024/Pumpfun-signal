import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenLaunch } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// AsyncStorage is async by nature, so the app keeps an in-memory mirror
// of the feed and settings, hydrated once on boot, then writes-through
// to disk on every update. Simpler than MMKV to build with Expo/EAS
// since it needs no native linking or config plugin.

export async function saveFeed(tokens: TokenLaunch[]) {
  const trimmed = tokens.slice(0, 300);
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save feed', e);
  }
}

export async function loadFeed(): Promise<TokenLaunch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FEED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveRpcEndpoint(url: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.RPC_ENDPOINT, url);
}

export async function loadRpcEndpoint(): Promise<string | undefined> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.RPC_ENDPOINT);
  return val ?? undefined;
}
