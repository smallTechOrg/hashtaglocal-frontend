import { setAnalyticsUser, trackAuthEvent } from "@/utils/analytics";
import { apiGet } from "@/utils/apiClient";
import { getFastLocationWithProgressiveWatch } from "@/utils/LocationService";
import { saveTokens } from "@/utils/tokenStorage";
import { useUser } from "@/utils/UserContext";
import { getCrashlytics, log, recordError as recordCrashError } from "@react-native-firebase/crashlytics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Module-level set: survives component remounts and second deep-link deliveries (common on Android).
// Ensures auth analytics fire at most once per unique token within an app session.
const processedTokens = new Set<string>();

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { setUser, setIsLoading } = useUser();
  
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    access_expiry?: string;
    refresh_expiry?: string;
    user_id?: string;
    email?: string;
    provider_id?: string;
    is_new_user?: string;
  }>();

  useEffect(() => {
    if (!params.access_token || !params.refresh_token) return;

    const tokenKey = params.access_token.substring(0, 20);
    if (processedTokens.has(tokenKey)) return;
    processedTokens.add(tokenKey);

    // Fire analytics here — synchronously after the hasProcessed guard — so it
    // runs at most once per unique token regardless of re-renders or remounts.
    if (params.user_id) setAnalyticsUser(params.user_id);
    trackAuthEvent("google", params.is_new_user === "true");

    async function handleAuthCallback() {
      try {
        const { access_token, refresh_token, access_expiry, refresh_expiry } = params;

        if (!access_token || !refresh_token) {
          setIsLoading(false);
          router.replace("/login");
          return;
        }

        const accessTokenExpiry = parseInt(access_expiry || "0");
        const refreshTokenExpiry = parseInt(refresh_expiry || "0");

        await saveTokens(
          access_token,
          accessTokenExpiry,
          refresh_token,
          refreshTokenExpiry
        );

        let profileUrl = `${API_BASE_URL}/account/profile`;
        try {
          const locationPromise = getFastLocationWithProgressiveWatch({
            instantLoad: true,
            accuracyThresholdMeters: 50,
          });
          const locationTimeout = new Promise<{success: boolean, location?: any}>((resolve) =>
            setTimeout(() => resolve({ success: false }), 5000)
          );
          const location = await Promise.race([locationPromise, locationTimeout]);
          if (location.success && location.location) {
            const { latitude, longitude } = location.location;
            profileUrl = `${API_BASE_URL}/account/profile?lat=${latitude}&lng=${longitude}`;
          }
        } catch (locError) {
          // Location not available, continue without it
        }

        const profileResponse = await apiGet(profileUrl);

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const { username, picture, user_role, hashtag, user_summary } = profileData.data.user;
          setUser({ username, picture, user_role, hashtag, user_summary });
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }

        router.replace("/");
      } catch (error) {
        const crashlytics = getCrashlytics();
        log(crashlytics, "Login failed during auth callback");
        recordCrashError(crashlytics, error instanceof Error ? error : new Error(String(error)));
        setIsLoading(false);
        router.replace("/login");
      }
    }

    handleAuthCallback();
  }, [params]);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator size="large" color="#22c55e" />
      <Text className="mt-4 text-gray-600">Signing you in...</Text>
    </View>
  );
}
