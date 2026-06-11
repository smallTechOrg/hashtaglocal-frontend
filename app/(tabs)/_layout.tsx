// app/(tabs)/_layout.tsx
import HashtagHeaderTitle from '@/components/chat/HashtagHeaderTitle';
import KarmaBadge from '@/components/KarmaBadge';
import { useEvents } from '@/utils/EventsContext';
import { useHashtag } from '@/utils/HashtagContext';
import { useUser } from '@/utils/UserContext';
import { MaterialIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';

export default function TabsLayout() {
  const { user } = useUser();
  const { events, loading: eventsLoading } = useEvents();
  const { hashtag, isRoot } = useHashtag();

  const hasEvents = useMemo(() => {
    if (eventsLoading) return true; // keep tab visible while loading
    const now = Date.now();
    return events.some((e) => {
      const endStr = e.end_time ?? e.start_time;
      const utc = endStr.endsWith("Z") ? endStr : `${endStr}Z`;
      if (new Date(utc).getTime() < now) return false;
      if (isRoot) return true; // #india = all localities
      return e.location.locality.hashtags.some(
        (tag) => tag.toLowerCase().replace(/^#/, "") === hashtag
      );
    });
  }, [events, eventsLoading, hashtag, isRoot]);

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
        // Global hashtag selector lives in the header title — shared across all tabs.
        headerTitle: () => <HashtagHeaderTitle />,
        headerTitleAlign: 'left',
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
        name="chat"
        options={{
          title: 'Chat',
          headerTitleStyle: {
            fontFamily: "Nunito-Regular",
          },
          headerLeft: () => <DrawerToggleButton />,
          headerRight: () => <KarmaBadge />,
          tabBarLabel: 'Chat',
          tabBarLabelStyle: {
            fontFamily: "Nunito-Regular",
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'chat' : 'chat-bubble-outline'}
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
