// Used to store data on the device even after the app is closed
import AsyncStorage from "@react-native-async-storage/async-storage";

// Centralized object to store all AsyncStorage keys
const KEYS = {
  ACCESS_TOKEN: "access_token",
  ACCESS_TOKEN_EXPIRY: "access_token_expiry",
  REFRESH_TOKEN: "refresh_token",
  REFRESH_TOKEN_EXPIRY: "refresh_token_expiry",
};

// Retrieve refresh token from AsyncStorage
// Returns the token string or null if not found
export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
}

// Retrieve access token from AsyncStorage
// Returns the token string or null if not found
export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
}

// Get access token expiry timestamp
export async function getAccessTokenExpiry(): Promise<number | null> {
  const expiry = await AsyncStorage.getItem(KEYS.ACCESS_TOKEN_EXPIRY);
  return expiry ? parseInt(expiry, 10) : null;
}

// Check if access token is expired
export async function isAccessTokenExpired(): Promise<boolean> {
  const expiry = await getAccessTokenExpiry();
  if (!expiry) return true;
  return Date.now() > expiry;
}

// Get refresh token expiry timestamp
export async function getRefreshTokenExpiry(): Promise<number | null> {
  const expiry = await AsyncStorage.getItem(KEYS.REFRESH_TOKEN_EXPIRY);
  return expiry ? parseInt(expiry, 10) : null;
}

// Check if refresh token is expired
export async function isRefreshTokenExpired(): Promise<boolean> {
  const expiry = await getRefreshTokenExpiry();
  if (!expiry) return true;
  return Date.now() > expiry;
}

// Save both access and refresh tokens along with their expiry timestamps
export async function saveTokens(
  accessToken: string,
  accessTokenExpiry: number,
  refreshToken: string,
  refreshTokenExpiry: number
): Promise<void> {
    // Store multiple key-value pairs in a single atomic operation
  await AsyncStorage.multiSet([
    [KEYS.ACCESS_TOKEN, accessToken],
    [KEYS.ACCESS_TOKEN_EXPIRY, accessTokenExpiry.toString()],
    [KEYS.REFRESH_TOKEN, refreshToken],
    [KEYS.REFRESH_TOKEN_EXPIRY, refreshTokenExpiry.toString()],
  ]);
}

// Remove all stored auth tokens (used on logout or auth failure)
export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.ACCESS_TOKEN,
    KEYS.ACCESS_TOKEN_EXPIRY,
    KEYS.REFRESH_TOKEN,
    KEYS.REFRESH_TOKEN_EXPIRY,
  ]);
}
