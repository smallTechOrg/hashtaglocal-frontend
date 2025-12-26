// app/_layout.tsx
import { HeaderBackButton } from "@react-navigation/elements";
import { useFonts } from "expo-font";
import { Drawer } from "expo-router/drawer";


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
  });

  if (!fontsLoaded) {
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
        name="IssueDetail"
        options={({ navigation }) => ({
          title: "Issue Detail", // Will be dynamically updated by the screen component
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
          headerLeft: (props) => (
            <HeaderBackButton {...props} onPress={() => navigation.goBack()} />
          ),
        })}
      />
    </Drawer>
  );
}
