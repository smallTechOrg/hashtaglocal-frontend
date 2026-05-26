import messaging from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { apiPost } from '@/utils/apiClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Extend this enum as your backend adds more notification types
export type NotificationType =
  | 'ISSUE_UPDATE'
  | 'ISSUE_COMMENT'
  | 'NEARBY_ISSUE'
  | 'KARMA_UPDATE';

/**
 * Requests notification permission from the OS.
 * On Android 12 and below this is a no-op (always granted).
 * On Android 13+ it shows the system permission dialog.
 * iOS is gated off — remove the Platform.OS guard when ready to enable iOS.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false; // remove this line to enable iOS

  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Returns the FCM device token for this install, or null if unavailable.
 * Log it during development to test manually from Firebase Console.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    console.log('[FCM] Device token:', token);
    return token;
  } catch (error) {
    console.warn('[FCM] Failed to get token:', error);
    return null;
  }
}

/**
 * Sends the FCM token to the backend so the server can target this device.
 * Called after login. Safe to call again if the token refreshes.
 */
export async function saveFCMToken(token: string): Promise<void> {
  try {
    await apiPost(`${API_BASE_URL}/account/device-token`, {
      token,
      platform: Platform.OS,
    });
    console.log('[FCM] Token saved to backend');
  } catch (error) {
    console.warn('[FCM] Failed to save token to backend:', error);
  }
}

/**
 * Subscribes to messages while the app is in the foreground.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 * Extend the handler body to show an in-app banner if needed.
 */
export function registerForegroundHandler(): () => void {
  return messaging().onMessage(async remoteMessage => {
    console.log(
      '[FCM] Foreground message:',
      remoteMessage.notification?.title,
      remoteMessage.data,
    );
  });
}

function navigateFromNotification(data?: Record<string, string>): void {
  if (!data?.type) return;

  switch (data.type as NotificationType) {
    case 'ISSUE_UPDATE':
    case 'ISSUE_COMMENT':
      if (data.issueId) {
        router.push({ pathname: '/issueDetail', params: { id: data.issueId } });
      }
      break;
    case 'NEARBY_ISSUE':
      router.push('/(tabs)');
      break;
    case 'KARMA_UPDATE':
      router.push('/(tabs)');
      break;
  }
}

/**
 * Wires up tap handlers for both app states:
 * - onNotificationOpenedApp: app was backgrounded, user tapped notification
 * - getInitialNotification: app was killed, notification tap launched the app
 *
 * Call this once from the root layout after navigation is ready.
 */
export function setupNotificationTapHandlers(): void {
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[FCM] Tap (background):', remoteMessage.data);
    navigateFromNotification(remoteMessage.data as Record<string, string>);
  });

  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('[FCM] Tap (quit state):', remoteMessage.data);
        navigateFromNotification(remoteMessage.data as Record<string, string>);
      }
    });
}
