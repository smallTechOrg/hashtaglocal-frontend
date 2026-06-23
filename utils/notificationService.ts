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
import { trackNotificationOpened } from '@/utils/analytics';
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
  const granted =
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL;

  return granted;
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

export function resolveNotificationTarget(
  data?: Record<string, string>,
): { pathname: string; params?: Record<string, string> } | null {
  if (!data?.type) return null;

  if (data.type === 'ISSUE_DETAIL' && data.issueId) {
    return { pathname: '/issueDetail', params: { id: data.issueId } };
  }
  if (data.type === 'BROADCAST') {
    return { pathname: '/' };
  }
  if (data.type === 'CHAT') {
    return { pathname: '/chat' };
  }
  return null;
}

export function navigateFromNotification(data?: Record<string, string>): void {
  const target = resolveNotificationTarget(data);
  if (!target) return;

  console.log('[FCM] Navigating from notification:', data?.type, data);
  router.push(target.params ? { pathname: target.pathname as any, params: target.params } : (target.pathname as any));
  console.log('[FCM] Navigated:', target.pathname);
}

// Holds the notification data when the app was opened from a killed state.
// Promise-based (not a plain variable) so that whoever calls consumePendingNotification()
// always gets the eventual result, regardless of whether this promise has resolved yet
// at the moment of the call — there is no synchronous-peek race with the auth-ready check.
let initialNotificationPromise: Promise<Record<string, string> | null> | null = null;
let initialNotificationConsumed = false;

export function consumePendingNotification(): Promise<Record<string, string> | null> {
  if (initialNotificationConsumed || !initialNotificationPromise) {
    return Promise.resolve(null);
  }
  initialNotificationConsumed = true;
  return initialNotificationPromise;
}

export function setupNotificationTapHandlers(): () => void {
  onNotificationOpenedApp(getMsg(), remoteMessage => {
    const data = remoteMessage.data as Record<string, string>;
    console.log('[FCM] Tap (background):', data);
    trackNotificationOpened(data?.notificationLogId ?? 'unknown', data?.type ?? 'unknown');
    navigateFromNotification(data);
  });

  // For the killed-state tap: the router isn't ready yet at this point, so we
  // store the resolved promise and let AuthLoader/useProtectedRoute navigate
  // once the user is confirmed authenticated AND the tabs navigator is mounted.
  initialNotificationPromise = Promise.all([
    getInitialNotification(getMsg()),
    consumeNotifeeInitialNotification(),
  ]).then(([fcmMessage, notifeeData]) => {
    const data = (fcmMessage?.data as Record<string, string> | undefined) ?? notifeeData;
    if (data) {
      console.log('[FCM] Tap (quit state), deferring navigation:', data);
      trackNotificationOpened(data.notificationLogId ?? 'unknown', data.type ?? 'unknown');
    }
    return data ?? null;
  });

  // Handles taps on notifee local notifications when app is in foreground/background.
  return setupNotifeeForegroundHandler(data => {
    console.log('[Notifee] Tap (foreground):', data);
    trackNotificationOpened(data?.notificationLogId ?? 'unknown', data?.type ?? 'unknown');
    navigateFromNotification(data);
  });
}
