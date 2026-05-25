// app/(tabs)/_layout.tsx
import KarmaBadge from '@/components/KarmaBadge';
import { useEvents } from '@/utils/EventsContext';
import { useUser } from '@/utils/UserContext';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';

export default function TabsLayout() {
  const { user } = useUser();
  const { events, loading: eventsLoading } = useEvents();

  const hasEvents = useMemo(() => {
    if (eventsLoading) return true; // keep tab visible while loading
    const now = Date.now();
    const userHashtag = user?.hashtag?.toLowerCase();
    return events.some((e) => {
      const endStr = e.end_time ?? e.start_time;
      const utc = endStr.endsWith("Z") ? endStr : `${endStr}Z`;
      if (new Date(utc).getTime() < now) return false;
      if (!userHashtag) return true;
      return e.location.locality.hashtags.some(
        (tag) => tag.toLowerCase() === userHashtag
      );
    });
  }, [events, eventsLoading, user?.hashtag]);

  // Memoize options to prevent unnecessary re-renders
  const indexOptions = useMemo(() => ({
    title: user?.hashtag || 'Map',
    headerTitleStyle: {
      fontFamily: "Nunito-Regular",
    },
    headerLeft: () => <DrawerToggleButton />,
    headerRight: () => <KarmaBadge />,
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
          headerRight: () => <KarmaBadge />,
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
          href: hasEvents ? undefined : null,
          title: 'Events',
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
          headerLeft: () => <DrawerToggleButton />,
          headerRight: () => <KarmaBadge />,
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
          href: null,
          title: "Report",
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
        }}
      />
    </Tabs>
  );
}
