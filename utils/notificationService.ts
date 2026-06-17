import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { PermissionsAndroid, Platform } from 'react-native';
import { apiPost, apiRequest } from '@/utils/apiClient';
import { clearCachedFCMToken, getCachedFCMToken, setCachedFCMToken } from '@/utils/fcmCache';
import { showNotificationBanner } from '@/utils/notificationBannerService';
import {
  consumeNotifeeInitialNotification,
  postToSystemTray,
  setupNotifeeForegroundHandler,
} from '@/utils/notificationTray';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

let syncInProgress: Promise<void> | null = null;

export type NotificationType = 'ISSUE_DETAIL' | 'BROADCAST' | 'CHAT';

const getMsg = () => getMessaging(getApp());

export async function requestNotificationPermission(): Promise<boolean> {
  // Android 13+ (API 33+) requires POST_NOTIFICATIONS to be explicitly requested at runtime.
  // Firebase's requestPermission alone does not reliably show the native dialog on Android.
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

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
      if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(getMsg())) {
        await registerDeviceForRemoteMessages(getMsg());
      }
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

    const trayNotificationId = await postToSystemTray(title, body, data);
    showNotificationBanner({ title, body, data, trayNotificationId });
    console.log('[FCM] Notification displayed (banner + tray):', data?.type ?? 'unknown', data?.issueId ?? '');
  });
}

export function navigateFromNotification(data?: Record<string, string>): void {
  if (!data?.type) return;

  console.log('[FCM] Navigating from notification:', data.type, data);

  if (data.type === 'ISSUE_DETAIL' && data.issueId) {
    router.push({ pathname: '/issueDetail', params: { id: data.issueId } });
    console.log('[FCM] Navigated to issueDetail, issueId:', data.issueId);
  } else if (data.type === 'BROADCAST') {
    router.push('/');
    console.log('[FCM] Navigated to map (broadcast notification)');
  } else if (data.type === 'CHAT') {
    router.push('/chat');
    console.log('[FCM] Navigated to chat (chat notification)');
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

export function setupNotificationTapHandlers(): () => void {
  onNotificationOpenedApp(getMsg(), remoteMessage => {
    console.log('[FCM] Tap (background):', remoteMessage.data);
    navigateFromNotification(remoteMessage.data as Record<string, string>);
  });

  // For the killed-state tap: the router isn't ready yet at this point, so we
  // store the data and let AuthLoader navigate after the user is loaded.
  Promise.all([
    getInitialNotification(getMsg()),
    consumeNotifeeInitialNotification(),
  ]).then(([fcmMessage, notifeeData]) => {
    const data = (fcmMessage?.data as Record<string, string> | undefined) ?? notifeeData;
    if (data) {
      console.log('[FCM] Tap (quit state), deferring navigation:', data);
      pendingInitialNotification = data;
    }
  });

  // Handles taps on notifee local notifications when app is in foreground/background.
  return setupNotifeeForegroundHandler(data => {
    console.log('[Notifee] Tap (foreground):', data);
    navigateFromNotification(data);
  });
}
