import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TokenLaunch } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Notification permission not granted');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pumpfun-launches', {
      name: 'New Token Launches',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function notifyLaunch(launch: TokenLaunch) {
  if (!launch.risk) return;

  const emoji = launch.risk.level === 'LOW' ? '🟢' : launch.risk.level === 'MEDIUM' ? '🟡' : '🔴';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} New launch: ${launch.name} (${launch.symbol})`,
      body: `Risk: ${launch.risk.level} (${launch.risk.score}/100) — ${launch.risk.factors[0]?.label ?? 'No major flags'}`,
      data: { mint: launch.mint },
    },
    trigger: null, // fire immediately
  });
}
