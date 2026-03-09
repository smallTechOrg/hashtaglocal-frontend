import { Event, fetchEvents } from "@/api/events";
// --- MOCK: remove this import (and the if-block below) when backend is ready ---
// import { MOCK_EVENTS, USE_MOCK_EVENTS } from "@/api/events.mock";
// ------------------------------------------------------------------------------
import EventCard from "@/components/EventCard";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#256D1B" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-sm text-red-500 text-center px-6" style={{ fontFamily: "Nunito-Regular" }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <EventCard event={item} />}
      contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
      className="bg-gray-50"
      ListHeaderComponent={
        <Text className="text-[22px] text-gray-900 px-4 pb-2" style={{ fontFamily: "Nunito-Bold" }}>
          Upcoming Events
        </Text>
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center">
          <Text className="text-[15px] text-gray-500" style={{ fontFamily: "Nunito-Regular" }}>
            No events found.
          </Text>
        </View>
      }
    />
  );
}
