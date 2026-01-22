// app/_layout.tsx
import "@/global.css";
import { HeaderBackButton } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide splash screen once fonts are loaded (or failed)
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Allow app to proceed even if fonts fail to load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Drawer
      initialRouteName="index"
      screenOptions={{
        drawerActiveTintColor: 'blue',
        drawerLabelStyle: {
          fontFamily: "Nunito-Regular",
        }, 
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Home",
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
        }}
      />
       <Drawer.Screen
        name="(tabs)"
        options={{
         drawerItemStyle: { display: "none" }  
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
