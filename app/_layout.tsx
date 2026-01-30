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
  DrawerContentScrollView,
  DrawerItemList,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

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
    </UserProvider>
  );
}
