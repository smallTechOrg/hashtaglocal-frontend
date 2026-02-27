import { apiGet } from "@/utils/apiClient";
import { getFastLocationWithProgressiveWatch } from "@/utils/LocationService";
import { saveTokens } from "@/utils/tokenStorage";
import { useUser } from "@/utils/UserContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { setUser, setIsLoading } = useUser();
  
  // Use a string key to track which tokens we've processed
  // This allows detecting when new tokens arrive after logout/login
  const hasProcessed = useRef<string | false>(false);
  
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    access_expiry?: string;
    refresh_expiry?: string;
    user_id?: string;
    email?: string;
    provider_id?: string;
  }>();

  useEffect(() => {
    // Check if we have tokens and if they're different from what we've already processed
    if (params.access_token && params.refresh_token) {
      const currentParamsKey = params.access_token.substring(0, 20);
      
      // Skip if we've already processed these exact tokens
      if (hasProcessed.current === currentParamsKey) {
        return;
      }
      
      // Mark these tokens as processed
      hasProcessed.current = currentParamsKey;
    } else {
      return;
    }

    async function handleAuthCallback() {
      try {
        const { access_token, refresh_token, access_expiry, refresh_expiry } = params;

        if (!access_token || !refresh_token) {
          setIsLoading(false);
          router.replace("/login");
          return;
        }

        // Store tokens using expiry timestamps from callback
        const accessTokenExpiry = parseInt(access_expiry || "0") * 1000;
        const refreshTokenExpiry = parseInt(refresh_expiry || "0") * 1000;

        await saveTokens(
          access_token,
          accessTokenExpiry,
          refresh_token,
          refreshTokenExpiry
        );

        // Fetch user profile with location
        let profileUrl = `${API_BASE_URL}/account/profile`;
        try {
          const locationPromise = getFastLocationWithProgressiveWatch({
            instantLoad: true,
            accuracyThresholdMeters: 50,
          });
          
          // Add timeout for location - max 5 seconds
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
          const { username, picture, hashtag, user_summary } = profileData.data.user;
          setUser({ username, picture, hashtag, user_summary });
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }

        router.replace("/");
      } catch (error) {
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
