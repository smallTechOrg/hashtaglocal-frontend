// app/_layout.tsx
import "@/global.css";
import { HeaderBackButton } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Image } from "react-native";

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Drawer
      initialRouteName="index"
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
    </Drawer>
  );
}
