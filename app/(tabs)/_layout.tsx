// app/(tabs)/_layout.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Tabs } from 'expo-router';
import { Image } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarLabelStyle: {
          fontFamily: "Nunito-Regular",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
          headerLeft: () => <DrawerToggleButton />,
          tabBarLabel: 'Map',
          tabBarLabelStyle: {
            fontFamily: "Nunito-Regular",
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name={focused ? 'map' : 'map'} 
              color={color} 
              size={24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report Issue',
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
          headerLeft: () => <DrawerToggleButton />,
          headerRight: () => (
            <Image
              source={require("../../assets/logo-green.png")}
              style={{ width: 32, height: 40, marginRight: 16 }}
              resizeMode="contain"
            />
          ),
          tabBarLabel: 'Report Issue',
          tabBarLabelStyle: {
            fontFamily: "Nunito-Regular",
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name={focused ? 'add-circle' : 'add-circle-outline'} 
              color={color} 
              size={24} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
