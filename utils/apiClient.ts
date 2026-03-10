import { refreshAuthToken } from "@/api/auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  saveTokens,
} from "@/utils/tokenStorage";
import { router } from "expo-router";
import { Alert } from "react-native";
import { authEvents } from "./authEvents";
import { getCrashlytics, recordError as recordCrashError } from "@react-native-firebase/crashlytics";

const DEFAULT_TIMEOUT = 30000; // 30 seconds
type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean;
};


// Lock to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempts to refresh the access token using the refresh token.
 * Uses a lock to prevent multiple simultaneous refresh attempts.
 * @returns The new access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        console.log("[ApiClient] No refresh token available");
        await clearTokens();
        return null;
      }

      // Check if refresh token itself is expired
      const isRefreshExpired = await isRefreshTokenExpired();
      if (isRefreshExpired) {
        recordCrashError(getCrashlytics(), new Error("[ApiClient] Refresh token expired - user must login again"));
        await clearTokens();
        authEvents.emitSessionExpired(); // Clear user state in UserContext
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [{ text: "OK" }]
        );
        router.replace("/login");
        return null;
      }

      console.log("[ApiClient] Refreshing access token...");
      const refreshResponse = await refreshAuthToken(refreshToken);
      const { access_token, refresh_token } = refreshResponse.data;

      await saveTokens(
        access_token.value,
        access_token.expiry,
        refresh_token.value,
        refresh_token.expiry
      );

      console.log("[ApiClient] Token refreshed successfully");
      return access_token.value;
    } catch (error) {
      recordCrashError(getCrashlytics(), error instanceof Error ? error : new Error(String(error)), "[ApiClient] Failed to refresh token");
      await clearTokens();
      authEvents.emitSessionExpired();
      Alert.alert(
        "Session Expired",
        "Your session has expired. Please log in again.",
        [{ text: "OK" }]
      );
      router.replace("/login");
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Gets a valid access token, refreshing if necessary.
 * @returns A valid access token or null if unavailable
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  const isExpired = await isAccessTokenExpired();
  if (isExpired) {
    console.log("[ApiClient] Access token expired, attempting refresh...");
    return refreshAccessToken();
  }

  return token;
}

/**
 * Makes an authenticated API request with automatic token refresh.
 * - Checks token expiry before each request
 * - Automatically refreshes token if expired
 * - Retries request on 401 with refreshed token
 *
 * @param url - The URL to fetch
 * @param options - Fetch options including optional timeout and skipAuth
 * @returns The fetch Response object
 */
export async function apiRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, skipAuth = false, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    // Add auth header if not skipped
    if (!skipAuth) {
      const token = await getValidAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        // No valid token available - redirect to login
        console.log("[ApiClient] No valid token available, redirecting to login");
        authEvents.emitSessionExpired();
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [{ text: "OK" }]
        );
        router.replace("/login");
        throw new Error("Authentication required. Please log in.");
      }
    }

    let response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    // If 401 and we have auth, try refreshing token and retry once
    if (response.status === 401 && !skipAuth) {
      console.log("[ApiClient] Received 401, attempting token refresh...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Retry with new token
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        // If still 401 after retry, redirect to login
        if (response.status === 401) {
          recordCrashError(getCrashlytics(), new Error("[ApiClient] Still 401 after token refresh, redirecting to login"));
          await clearTokens();
          authEvents.emitSessionExpired();
          Alert.alert(
            "Session Expired",
            "Your session has expired. Please log in again.",
            [{ text: "OK" }]
          );
          router.replace("/login");
        }
      }
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(
  url: string,
  options: Omit<RequestOptions, "method" | "body"> = {}
): Promise<Response> {
  return apiRequest(url, { ...options, method: "GET" });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(
  url: string,
  body?: unknown,
  options: Omit<RequestOptions, "method" | "body"> = {}
): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(
  url: string,
  body?: unknown,
  options: Omit<RequestOptions, "method" | "body"> = {}
): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(
  url: string,
  options: Omit<RequestOptions, "method" | "body"> = {}
): Promise<Response> {
  return apiRequest(url, { ...options, method: "DELETE" });
}


