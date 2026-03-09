// app/(tabs)/_layout.tsx
import { useUser } from '@/utils/UserContext';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Image } from 'react-native';

const EVENTS_ENABLED = process.env.EXPO_PUBLIC_FEATURE_EVENTS === "true";

export default function TabsLayout() {
  const { user } = useUser();
  
  // Memoize options to prevent unnecessary re-renders
  const indexOptions = useMemo(() => ({
    title: user?.hashtag || 'Map',
    headerTitleStyle: {
      fontFamily: "Nunito-Regular",
    },
    headerLeft: () => <DrawerToggleButton />,
    tabBarLabel: 'Map',
    tabBarLabelStyle: {
      fontFamily: "Nunito-Regular",
    },
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <MaterialIcons 
        name={focused ? 'map' : 'map'} 
        color={color} 
        size={24} 
      />
    ),
  }), [user?.hashtag]);

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
        options={indexOptions}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: 'Issues',
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
          tabBarLabel: 'Issues',
          tabBarLabelStyle: {
            fontFamily: "Nunito-Regular",
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name={focused ? 'format-list-bulleted' : 'format-list-bulleted'} 
              color={color} 
              size={24} 
            />
          ),
        }}
      />
       <Tabs.Screen
        name="issues2"
        options={{
          title: 'Issues',
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
          tabBarLabel: 'Issues',
          tabBarLabelStyle: {
            fontFamily: "Nunito-Regular",
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name={focused ? 'format-list-bulleted' : 'format-list-bulleted'} 
              color={color} 
              size={24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          href: EVENTS_ENABLED ? undefined : null,
          title: 'Events',
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
          tabBarLabel: 'Events',
          tabBarLabelStyle: {
            fontFamily: "Nunito-Regular",
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'event' : 'event'}
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
