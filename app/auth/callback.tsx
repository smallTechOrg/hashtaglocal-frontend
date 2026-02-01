import { saveTokens } from "@/utils/tokenStorage";
import { useUser } from "@/utils/UserContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const hasProcessed = useRef(false);
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
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    async function handleAuthCallback() {
      const {
        access_token,
        refresh_token,
        access_expiry,
        refresh_expiry,
      } = params;

      if (!access_token || !refresh_token) {
        console.error("Missing tokens in callback URL");
        router.replace("/login");
        return;
      }

      try {
        // Store tokens using expiry timestamps from callback
        const accessTokenExpiry = parseInt(access_expiry || "0") * 1000;
        const refreshTokenExpiry = parseInt(refresh_expiry || "0") * 1000;

        await saveTokens(
          access_token,
          accessTokenExpiry,
          refresh_token,
          refreshTokenExpiry
        );

        console.log("Tokens saved successfully");

        // Fetch user profile
        const profileResponse = await fetch(
          `${API_BASE_URL}/account/profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const { username, picture } = profileData.data.user;
          console.log("User profile:", username, picture);
          setUser({ username, picture });
        } else {
          console.error("Failed to fetch profile:", profileResponse.status);
        }

        router.replace("/");
      } catch (error) {
        console.error("Failed to save tokens:", error);
        router.replace("/login");
      }
    }

    handleAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator size="large" color="#22c55e" />
      <Text className="mt-4 text-gray-600">Signing you in...</Text>
    </View>
  );
}
