// app/_layout.tsx
import "@/global.css";
import { HeaderBackButton } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Image, View, Text } from "react-native";
import { UserProvider, useUser } from "@/utils/UserContext";
import {
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  saveTokens,
  clearTokens,
} from "@/utils/tokenStorage";
import { refreshAuthToken } from "@/api/auth";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { setUser } = useUser();

  useEffect(() => {
    async function loadUserProfile() {
      console.log("=== AuthLoader: Starting loadUserProfile ===");

      let token = await getAccessToken();
      console.log("Access token exists:", !!token);
      if (!token) return;

      // Check if access token is expired
      const isExpired = await isAccessTokenExpired();
      console.log("Access token expired:", isExpired);
      if (isExpired) {
        console.log("Access token expired, checking refresh token...");
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          console.log("No refresh token available");
          await clearTokens();
          setUser(null);
          return;
        }

        // Check if refresh token is also expired
        const isRefreshExpired = await isRefreshTokenExpired();
        console.log("Refresh token expired:", isRefreshExpired);

        if (isRefreshExpired) {
          console.log("Refresh token also expired - user must login again");
          await clearTokens();
          setUser(null);
          return;
        }

        console.log("Refresh token valid, attempting to refresh access token...");
        try {
          const refreshResponse = await refreshAuthToken(refreshToken);
          const { access_token, refresh_token } = refreshResponse.data;

          await saveTokens(
            access_token.value,
            access_token.expiry,
            refresh_token.value,
            refresh_token.expiry
          );

          token = access_token.value;
          console.log("Token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh token:", error);
          await clearTokens();
          setUser(null);
          return;
        }
      }

      // Fetch user profile with valid token
      try {
        const response = await fetch(`${API_BASE_URL}/account/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const { username, picture } = data.data.user;
          console.log("Profile loaded:", username);
          setUser({ username, picture });
        } else {
          console.log("Profile fetch failed with status:", response.status);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    }

    loadUserProfile();
  }, [setUser]);

  return <>{children}</>;
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user } = useUser();

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
        <StatusBar style="dark" />
        <Drawer
        initialRouteName="index"
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
        options={({ navigation }) => ({
          title: "Login",
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
          // drawerItemStyle: { display: "none" },
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => navigation.navigate("index")} />
          ),
        })}
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
      </AuthLoader>
    </UserProvider>
  );
}
