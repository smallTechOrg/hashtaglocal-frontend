import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'fcm_token';

export async function getCachedFCMToken(): Promise<string | null> {
  return AsyncStorage.getItem(FCM_TOKEN_KEY);
}

export async function setCachedFCMToken(token: string): Promise<void> {
  await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
}

export async function clearCachedFCMToken(): Promise<void> {
  await AsyncStorage.removeItem(FCM_TOKEN_KEY);
}
