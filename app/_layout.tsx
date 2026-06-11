import { requestAccountDeletion } from "@/api/account";
import KarmaBadge from "@/components/KarmaBadge";
import "@/global.css";
import { clearAnalyticsUser, trackLogout } from "@/utils/analytics";
import { apiGet } from "@/utils/apiClient";
import { EventsProvider } from "@/utils/EventsContext";
import { HashtagProvider } from "@/utils/HashtagContext";
import { IssuesProvider } from "@/utils/IssuesContext";
import { KarmaProvider, useKarma } from "@/utils/KarmaContext";
import { getFastLocationWithProgressiveWatch } from "@/utils/LocationService";
import { clearTokens, getAccessToken } from "@/utils/tokenStorage";
import { UserProvider, UserSummary, useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import { getCrashlytics, recordError as recordCrashError } from "@react-native-firebase/crashlytics";
import {
  clearCachedFCMToken,
  consumePendingNotification,
  navigateFromNotification,
  registerForegroundHandler,
  removeDeviceToken,
  requestNotificationPermission,
  setupNotificationTapHandlers,
  syncFCMToken,
  watchTokenRefresh,
} from "@/utils/notificationService";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { HeaderBackButton } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router, useRouter, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { user, setUser, setIsLoading } = useUser();
  const { setKarma } = useKarma();

  // Runs whenever user goes from null → logged-in, covers both stored token and fresh OAuth login
  useEffect(() => {
    if (!user) return;
    async function onUserLoaded() {
      // Navigate to any notification that opened the app from a killed state
      const pending = consumePendingNotification();
      if (pending) navigateFromNotification(pending);

      const permitted = await requestNotificationPermission();
      if (permitted) await syncFCMToken();
    }
    onUserLoaded();
  }, [user]);

  useEffect(() => {
    async function loadUserProfile() {
      console.log("=== AuthLoader: Starting loadUserProfile ===");

      try {
        // First check if we have any tokens - if not, user is not logged in
        const token = await getAccessToken();
        if (!token) {
          console.log("No token available, user not logged in");
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Get user location for profile API
        let profileUrl = `${API_BASE_URL}/account/profile`;
        try {
          const location = await getFastLocationWithProgressiveWatch({
            instantLoad: true,
            accuracyThresholdMeters: 400,
          });
          if (location.success) {
            const { latitude, longitude } = location.location;
            profileUrl = `${API_BASE_URL}/account/profile?lat=${latitude}&lng=${longitude}`;
          }
        } catch (locError) {
          console.log("Location not available for profile API, using without location");
        }

        // apiGet handles token validation, refresh, and 401 retry automatically
        const response = await apiGet(profileUrl);

        if (response.ok) {
          const data = await response.json();
          const { username, picture, user_role, hashtag, user_summary } = data.data.user;
          console.log("Profile loaded:", username, "hashtag:", hashtag);
          setUser({ username, picture, user_role, hashtag, user_summary });
          setKarma(user_summary?.karma_earned ?? 0, user_summary?.karma_pending ?? 0);
        } else {
          console.log("Profile fetch failed with status:", response.status);
          await clearTokens();
          setUser(null);
        }
      } catch (error: any) {
        // apiGet throws "Authentication required" if no valid token
        if (error.message?.includes("Authentication required")) {
          console.log("No valid token available");
        } else {
          recordCrashError(getCrashlytics(), error instanceof Error ? error : new Error(String(error)));
          await clearTokens();
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, [setUser, setIsLoading, setKarma]);

  return <>{children}</>;
}

function useProtectedRoute() {
  const { user, isLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const inLoginScreen = segments[0] === "login";
    const inTabsGroup = segments[0] === "(tabs)";
    const isRootRoute = (segments as string[]).length === 0;

    // console.log("Navigation check:", { user: !!user, segments, inAuthGroup, inLoginScreen, inTabsGroup });

    // Only protect routes, don't interfere with normal navigation
    if (!user && !inAuthGroup && !inLoginScreen) {
      // User is not authenticated and trying to access protected route
      console.log("Redirecting to login - user not authenticated");
      router.replace("/login");
    } else if (user && inLoginScreen) {
      // User is authenticated and on login screen, redirect to tabs
      console.log("Redirecting to tabs - user authenticated on login");
      router.replace("/(tabs)");
    } else if (user && isRootRoute) {
      // User is authenticated at root with no segments, ensure tabs are loaded
      console.log("Loading tabs for authenticated user at root");
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading, router]);
}

function NavigationContainer({ children }: { children: React.ReactNode }) {
  useProtectedRoute();
  const { isLoading } = useUser();

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#256D1B" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function UserSummarySection({ summary }: { summary?: UserSummary }) {
  const router = useRouter();

  const issue_count = summary?.issue_count;

  const stats = issue_count ? [
    { key: "total",           label: "Reported", value: issue_count.total,           color: "#16a34a", bg: "#dcfce7" },
    { key: "open",            label: "Open",     value: issue_count.open,            color: "#2563eb", bg: "#dbeafe" },
    { key: "onhold",          label: "On Hold",  value: issue_count.onhold,          color: "#d97706", bg: "#fef3c7" },
    { key: "resolved",        label: "Resolved", value: issue_count.resolved,        color: "#059669", bg: "#d1fae5" },
    { key: "verify",          label: "Verified", value: issue_count.verify,          color: "#7c3aed", bg: "#ede9fe" },
    { key: "resolved_others", label: "Helped",   value: issue_count.resolved_others, color: "#0891b2", bg: "#cffafe" },
  ].filter((s) => s.value && s.value > 0) : [];

  const hasActivity = stats.length > 0;

  return (
    <View style={{ marginHorizontal: 12, marginVertical: 10, padding: 12, backgroundColor: "#f9fafb", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb" }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <MaterialIcons name="bar-chart" size={14} color="#6b7280" />
        <Text style={{ marginLeft: 4, fontSize: 10, color: "#6b7280", fontFamily: "Nunito-Regular", letterSpacing: 0.8, textTransform: "uppercase" }}>Your Activity</Text>
      </View>

      {hasActivity ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {stats.map((stat) => (
            <View
              key={stat.key}
              style={{
                backgroundColor: stat.bg,
                borderColor: stat.color + "55",
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignItems: "center",
                minWidth: 56,
              }}
            >
              <Text style={{ color: stat.color, fontSize: 18, fontFamily: "Nunito_700Bold", lineHeight: 22 }}>{stat.value}</Text>
              <Text style={{ color: stat.color, fontSize: 10, fontFamily: "Nunito-Regular", opacity: 0.85 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 8, gap: 6 }}>
          <Text style={{ fontSize: 22 }}>😔</Text>
          <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "Nunito-Regular", textAlign: "center" }}>No activity yet</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/report")}
            style={{ marginTop: 4, backgroundColor: "#256D1B", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" }}>Report an Issue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, setUser } = useUser();
  const { karma } = useKarma();
  const router = useRouter();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleLogout = async () => {
    await removeDeviceToken(); // must run before clearTokens so the request is authenticated
    trackLogout();
    clearAnalyticsUser();
    await clearTokens();
    await clearCachedFCMToken();
    setUser(null);
    router.replace("/login");
  };

  const handleDeleteAccount = () => {
    // Confirmation step prevents accidental deletion requests while keeping the flow in-app.
    Alert.alert(
      "Delete Account?",
      "This will permanently delete your account, including all your reported issues and activity.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete My Account",
          style: "destructive",
          onPress: submitDeleteAccountRequest,
        },
      ]
    );
  };

  const submitDeleteAccountRequest = async () => {
    if (isDeletingAccount) return;

    setIsDeletingAccount(true);
    try {
      await requestAccountDeletion();
      // Backend revokes sessions too; clearing local tokens makes the UI return to login immediately.
      await clearTokens();
      setUser(null);
      Alert.alert(
        "Deletion Requested",
        "You've been logged out. Your account and all associated data will be permanently deleted within 24 hours.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit account deletion request. Please try again.";
      Alert.alert("Request Failed", message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
      <View className="flex-row items-center p-1 border-b border-gray-200 pb-2 ">
        <Image
          source={
            user?.picture
              ? { uri: user.picture }
              : require("../assets/user.png")
          }
          style={{ width: 35, height: 35, borderRadius: 24 }}
          resizeMode="cover"
        />
        <Text className="ml-3 font-nunito p">
          {user?.username || "Guest"}
        </Text>
      </View>
      {/* Karma Summary */}
      <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginTop: 8, padding: 10, backgroundColor: "#f0fdf4", borderRadius: 12, borderWidth: 1, borderColor: "#bbf7d0" }}>
        <MaterialIcons name="stars" size={20} color="#16a34a" />
        <Text style={{ marginLeft: 6, fontSize: 16, fontFamily: "Nunito_700Bold", color: "#15803d" }}>
          {karma.earned + karma.pending}
        </Text>
        <Text style={{ marginLeft: 4, fontSize: 11, fontFamily: "Nunito-Regular", color: "#6b7280" }}>
          Karma
        </Text>
        {karma.pending > 0 && (
          <Text style={{ marginLeft: "auto", fontSize: 10, fontFamily: "Nunito-Regular", color: "#d97706" }}>
            {karma.pending} pending
          </Text>
        )}
      </View>
      <UserSummarySection summary={user?.user_summary} />
      <DrawerItemList {...props} />
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/report")}
        className="flex-row items-center px-4 py-3 mt-2 border-t border-gray-200"
      >
        <MaterialIcons name="camera-alt" size={24} color="#256D1B" />
        <Text className="ml-8 font-nunito" style={{ color: "#256D1B" }}>Report an Issue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const subject = encodeURIComponent("Enquiry / Account Request");
          const body = encodeURIComponent(
            `Hi SmallTech Support,\n\nUsername: ${user?.username ?? "N/A"}\n`
          );
          const url = `mailto:contact@smalltech.in?subject=${subject}&body=${body}`;
          try {
            await Linking.openURL(url);
          } catch {
            Alert.alert("No email app found", "Please reach us at contact@smalltech.in");
          }
        }}
        className="flex-row items-center px-4 py-3 mt-2 border-t border-gray-200"
      >
        <MaterialIcons name="mail-outline" size={24} color="#6b7280" />
        <Text className="ml-8 text-gray-600 font-nunito">Contact Us</Text>
      </TouchableOpacity>
      {user && (
        <>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="flex-row items-center px-4 py-3 border-t border-gray-200"
            style={{ opacity: isDeletingAccount ? 0.6 : 1 }}
          >
            <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
            <Text className="ml-8 text-red-500 font-nunito">
              {isDeletingAccount ? "Submitting..." : "Delete Account"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center px-4 py-3 border-t border-gray-200"
          >
            <MaterialIcons name="logout" size={24} color="#ef4444" />
            <Text className="ml-8 text-red-500 font-nunito">Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </DrawerContentScrollView>
      <View style={{ alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
        <Text style={{ fontSize: 11, color: "#9ca3af", fontFamily: "Nunito-Regular" }}>v{Constants.expoConfig?.version}</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
    "Nunito_200ExtraLight": require("@expo-google-fonts/nunito/200ExtraLight/Nunito_200ExtraLight.ttf"),
    "Nunito_300Light": require("@expo-google-fonts/nunito/300Light/Nunito_300Light.ttf"),
    "Nunito_400Regular": require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    "Nunito_500Medium": require("@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf"),
    "Nunito_600SemiBold": require("@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf"),
    "Nunito_700Bold": require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    "Nunito_800ExtraBold": require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    setupNotificationTapHandlers();
    const unsubForeground = registerForegroundHandler();
    const unsubTokenRefresh = watchTokenRefresh();
    return () => {
      unsubForeground();
      unsubTokenRefresh();
    };
  }, []);


  // Handle all incoming deep links – including auth callbacks
  useEffect(() => {
    function handleUrl(url: string) {
      console.log("Deep link received:", url);

      // If this is an auth-callback URL, route to the callback screen explicitly.
      // This is a safety net for cases where expo-router's automatic routing
      // doesn't fire in time (e.g. after Google's cross-device verification flow).
      if (url.includes("auth/callback") && url.includes("access_token")) {
        const queryString = url.split("?")[1];
        if (queryString) {
          const params = Object.fromEntries(new URLSearchParams(queryString).entries());
          console.log("[Linking] Auth callback detected – routing explicitly to /auth/callback");
          router.replace({ pathname: "/auth/callback", params });
        }
      }
    }

    const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    // Handle the case where the app was opened cold via an auth deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("App opened with URL:", url);
        handleUrl(url);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <UserProvider>
      <HashtagProvider>
      <KarmaProvider>
      <EventsProvider>
      <IssuesProvider>
        <AuthLoader>
          <NavigationContainer>
            <StatusBar style="dark" />
            <Drawer
            initialRouteName="(tabs)"
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
              drawerActiveTintColor: "blue",
              drawerLabelStyle: {
                fontFamily: "Nunito-Regular",
              },
            }}
          >
        <Drawer.Screen
          name="login"
          options={{
            headerShown: false,
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="index"
          options={{
            title: "#local",
            headerTitleStyle: {
              fontFamily: "Nunito-Regular",
            },
            drawerItemStyle: { display: "none" },
            headerRight: () => <KarmaBadge />,
          }}
        />
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false,
          }}
        />

        <Drawer.Screen
          name="ReportIssue"
          options={({ navigation }) => ({
            title: "Report Issue",
            drawerItemStyle: { display: "none" },
            headerTitleStyle: {
              fontFamily: "Nunito-Regular",
            },
            headerLeft: (props) => (
              <HeaderBackButton {...props} onPress={() => navigation.goBack()} />
            ),
          })}
        />
        <Drawer.Screen
          name="issueDetail"
          options={({ navigation }) => ({
            title: "Issue Detail",
            headerTitleStyle: {
              fontFamily: "Nunito-Regular",
            },
            headerLeft: (props) => (
              <HeaderBackButton {...props} onPress={() => navigation.goBack()} />
            ),
            drawerItemStyle: { display: "none" },
          })}
        />
        <Drawer.Screen
          name="CameraCapture"
          options={{
            title: "Capture Issue",
            headerShown: false,
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="IssueForm"
          options={({ navigation }) => ({
            title: "Report Issue",
            headerTitleStyle: {
              fontFamily: "Nunito-Regular",
            },
            headerLeft: (props) => (
              <HeaderBackButton {...props} onPress={() => navigation.goBack()} />
            ),
            drawerItemStyle: { display: "none" },
          })}
        />
        <Drawer.Screen
          name="NearbyIssuesCheck"
          options={({ navigation }) => ({
            title: "Nearby Issues",
            headerTitleStyle: {
              fontFamily: "Nunito-Regular",
            },
            headerLeft: (props) => (
              <HeaderBackButton {...props} onPress={() => navigation.goBack()} />
            ),
            drawerItemStyle: { display: "none" },
          })}
        />
        <Drawer.Screen
          name="auth"
          options={{
            headerShown: false,
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
        </NavigationContainer>
      </AuthLoader>
      </IssuesProvider>
      </EventsProvider>
      </KarmaProvider>
      </HashtagProvider>
    </UserProvider>
  );
}
