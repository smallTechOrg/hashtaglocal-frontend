import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { apiPost, apiRequest } from '@/utils/apiClient';
import { clearCachedFCMToken, getCachedFCMToken, setCachedFCMToken } from '@/utils/fcmCache';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

let syncInProgress: Promise<void> | null = null;

export type NotificationType = 'ISSUE_UPDATE';

const getMsg = () => getMessaging(getApp());

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false; // remove this line to enable iOS

  const status = await requestPermission(getMsg());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

async function pushTokenToBackend(token: string): Promise<void> {
  const requestBody = { data: { notification_token: token, platform: Platform.OS.toUpperCase() } };
  console.log('[FCM] POST /account/device-token request:', JSON.stringify(requestBody));
  const response = await apiPost(`${API_BASE_URL}/account/device-token`, requestBody);
  const responseText = await response.text();
  console.log('[FCM] POST /account/device-token response:', response.status, responseText);
  if (!response.ok) {
    throw new Error(`Device token sync failed: ${response.status} ${responseText}`);
  }
  await setCachedFCMToken(token);
  console.log('[FCM] Token synced to backend');
}

/**
 * Gets the FCM token and syncs it to the backend only if it has changed since
 * the last sync. Skips the backend call on every subsequent login when the
 * token is the same (tokens are per device/install, not per user session).
 * A module-level lock prevents concurrent calls from both seeing an empty cache
 * and racing to POST the same token twice.
 */
export function syncFCMToken(): Promise<void> {
  if (syncInProgress) return syncInProgress;

  syncInProgress = (async () => {
    try {
      const token = await getToken(getMsg());
      if (!token) return;

      console.log('[FCM] Device token:', token);

      const cachedToken = await getCachedFCMToken();
      if (token === cachedToken) {
        console.log('[FCM] Token unchanged, skipping backend sync');
        return;
      }

      await pushTokenToBackend(token);
    } catch (error) {
      console.warn('[FCM] Failed to sync token:', error);
    } finally {
      syncInProgress = null;
    }
  })();

  return syncInProgress;
}

export { clearCachedFCMToken };

/**
 * Calls DELETE /account/device-token to remove the token from the backend.
 * Must be called before clearing JWT tokens so the request is authenticated.
 */
export async function removeDeviceToken(): Promise<void> {
  try {
    const requestBody = { data: { platform: Platform.OS.toUpperCase() } };
    console.log('[FCM] DELETE /account/device-token request:', JSON.stringify(requestBody));
    const response = await apiRequest(`${API_BASE_URL}/account/device-token`, {
      method: 'DELETE',
      body: JSON.stringify(requestBody),
    });
    const responseText = await response.text();
    console.log('[FCM] DELETE /account/device-token response:', response.status, responseText);
    console.log('[FCM] Device token removed from backend');
  } catch (error) {
    console.warn('[FCM] Failed to remove device token:', error);
  }
}

/**
 * Watches for Firebase-initiated token rotation (rare but can happen when
 * Firebase invalidates the token). Returns an unsubscribe function.
 */
export function watchTokenRefresh(): () => void {
  return onTokenRefresh(getMsg(), async newToken => {
    console.log('[FCM] Token rotated by Firebase, syncing...');
    try {
      await pushTokenToBackend(newToken);
    } catch (error) {
      console.warn('[FCM] Failed to sync rotated token:', error);
    }
  });
}

export function registerForegroundHandler(): () => void {
  return onMessage(getMsg(), async remoteMessage => {
    const title = remoteMessage.notification?.title ?? 'New notification';
    const body = remoteMessage.notification?.body ?? '';
    const data = remoteMessage.data as Record<string, string> | undefined;
    console.log('[FCM] Foreground message:', title, data);

    if (data?.type === 'ISSUE_UPDATE' && data.issueId) {
      Alert.alert(title, body, [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'View Issue', onPress: () => navigateFromNotification(data) },
      ]);
      console.log('[FCM] Notification displayed (foreground alert):', data.type, 'issueId:', data.issueId);
    } else {
      Alert.alert(title, body);
      console.log('[FCM] Notification displayed (foreground alert):', data?.type ?? 'unknown');
    }
  });
}

export function navigateFromNotification(data?: Record<string, string>): void {
  if (!data?.type) return;

  console.log('[FCM] Navigating from notification:', data.type, data);

  if (data.type === 'ISSUE_UPDATE' && data.issueId) {
    router.push({ pathname: '/issueDetail', params: { id: data.issueId } });
    console.log('[FCM] Navigated to issueDetail, issueId:', data.issueId);
  }
}

// Holds the notification data when the app was opened from a killed state.
// Consumed by AuthLoader once the user is confirmed authenticated.
let pendingInitialNotification: Record<string, string> | null = null;

export function consumePendingNotification(): Record<string, string> | null {
  const data = pendingInitialNotification;
  pendingInitialNotification = null;
  return data;
}

export function setupNotificationTapHandlers(): void {
  onNotificationOpenedApp(getMsg(), remoteMessage => {
    console.log('[FCM] Tap (background):', remoteMessage.data);
    navigateFromNotification(remoteMessage.data as Record<string, string>);
  });

  // For the killed-state tap: the router isn't ready yet at this point, so we
  // store the data and let AuthLoader navigate after the user is loaded.
  getInitialNotification(getMsg()).then(remoteMessage => {
    if (remoteMessage) {
      console.log('[FCM] Tap (quit state), deferring navigation:', remoteMessage.data);
      pendingInitialNotification = remoteMessage.data as Record<string, string>;
    }
  });
}
