import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'device_id';

// In-process cache so we only hit AsyncStorage once per launch.
let cached: string | null = null;

function generate(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Returns a stable identifier for this app install.
 * Generated once on first launch, then persisted in AsyncStorage.
 * Resets on uninstall/reinstall, which is correct — a reinstall is a new device for session purposes.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }

  const newId = generate();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  cached = newId;
  return newId;
}
