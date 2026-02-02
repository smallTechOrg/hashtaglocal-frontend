import "@/global.css";
import { getValidAccessToken } from "@/utils/apiClient";
import { clearTokens } from "@/utils/tokenStorage";
import { UserProvider, useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { HeaderBackButton } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useRouter, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { setUser, setIsLoading } = useUser();

  useEffect(() => {
    async function loadUserProfile() {
      console.log("=== AuthLoader: Starting loadUserProfile ===");

      // getValidAccessToken handles expiry check and auto-refresh
      const token = await getValidAccessToken();
      console.log("Valid access token exists:", !!token);

      if (!token) {
        console.log("No valid access token available");
        setIsLoading(false);
        return;
      }

      // Fetch user profile with valid token
      try {
        // Get user location for profile API
        let profileUrl = `${API_BASE_URL}/account/profile`;
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const { latitude, longitude } = location.coords;
          profileUrl = `${API_BASE_URL}/account/profile?lat=${latitude}&lng=${longitude}`;
        } catch (locError) {
          console.log("Location not available for profile API, using without location");
        }

        const response = await fetch(profileUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const { username, picture, hashtag } = data.data.user;
          console.log("Profile loaded:", username, "hashtag:", hashtag);
          setUser({ username, picture, hashtag });
        } else {
          console.log("Profile fetch failed with status:", response.status);
          await clearTokens();
          setUser(null);
          if (response.status === 401) {
            Alert.alert(
              "Session Expired",
              "Your session has expired. Please log in again.",
              [{ text: "OK" }]
            );
          }
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
        await clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserProfile();
  }, [setUser, setIsLoading]);

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
    } else if (user && segments.length === 0) {
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

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await clearTokens();
    setUser(null);
    router.replace("/login");
  };

  return (
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
      <DrawerItemList {...props} />
      {user && (
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center px-4 py-3 mt-4 border-t border-gray-200"
        >
          <MaterialIcons name="logout" size={24} color="#ef4444" />
          <Text className="ml-8 text-red-500 font-nunito">Logout</Text>
        </TouchableOpacity>
      )}
    </DrawerContentScrollView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Debug: Log all incoming deep links
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("Deep link received:", url);
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("App opened with URL:", url);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <UserProvider>
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
            headerRight: () => (
              <Image
                source={require("../assets/logo-green.png")}
                style={{ width: 32, height: 40, marginRight: 16 }}
                resizeMode="contain"
              />
            ),
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
          name="about"
          options={({ navigation }) => ({
            title: "About Page",
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
          name="ReportIssue"
          options={({ navigation }) => ({
            title: "Report Issue",
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
          name="auth"
          options={{
            headerShown: false,
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
        </NavigationContainer>
      </AuthLoader>
    </UserProvider>
  );
}
