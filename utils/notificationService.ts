import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { apiPost } from '@/utils/apiClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const FCM_TOKEN_STORAGE_KEY = 'fcm_token';

export type NotificationType =
  | 'ISSUE_UPDATE'
  | 'ISSUE_COMMENT'
  | 'NEARBY_ISSUE'
  | 'KARMA_UPDATE';

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
  await apiPost(`${API_BASE_URL}/account/device-token`, {
    token,
    platform: Platform.OS,
  });
  await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  console.log('[FCM] Token synced to backend');
}

/**
 * Gets the FCM token and syncs it to the backend only if it has changed since
 * the last sync. Skips the backend call on every subsequent login when the
 * token is the same (tokens are per device/install, not per user session).
 */
export async function syncFCMToken(): Promise<void> {
  try {
    const token = await getToken(getMsg());
    if (!token) return;

    console.log('[FCM] Device token:', token);

    const cachedToken = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (token === cachedToken) {
      console.log('[FCM] Token unchanged, skipping backend sync');
      return;
    }

    await pushTokenToBackend(token);
  } catch (error) {
    console.warn('[FCM] Failed to sync token:', error);
  }
}

/**
 * Clears the locally cached FCM token on logout so the next login
 * re-syncs with the backend (handles multi-user on the same device).
 */
export async function clearCachedFCMToken(): Promise<void> {
  await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
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
    console.log('[FCM] Foreground message:', title, remoteMessage.data);
    Alert.alert(title, body);
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

export function setupNotificationTapHandlers(): void {
  onNotificationOpenedApp(getMsg(), remoteMessage => {
    console.log('[FCM] Tap (background):', remoteMessage.data);
    navigateFromNotification(remoteMessage.data as Record<string, string>);
  });

  getInitialNotification(getMsg()).then(remoteMessage => {
    if (remoteMessage) {
      console.log('[FCM] Tap (quit state):', remoteMessage.data);
      navigateFromNotification(remoteMessage.data as Record<string, string>);
    }
  });
}
