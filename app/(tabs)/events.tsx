import { Event, fetchEvents } from "@/api/events";
import EventCard from "@/components/EventCard";
import { useUser } from "@/utils/UserContext";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function EventsScreen() {
  const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const userHashtag = user?.hashtag?.toLowerCase();

  const filteredEvents = useMemo(() => {
    if (!userHashtag) return events;
    return events.filter((e) =>
      e.location.locality.hashtags.some(
        (tag) => tag.toLowerCase() === userHashtag
      )
    );
  }, [events, userHashtag]);

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
      data={filteredEvents}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <EventCard event={item} />}
      contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
      className="bg-gray-50"
      ListHeaderComponent={
        <View className="px-4 pb-2">
          <Text className="text-[22px] text-gray-900" style={{ fontFamily: "Nunito-Bold" }}>
            Upcoming Events
          </Text>
          {userHashtag && (
            <Text className="text-sm text-gray-400" style={{ fontFamily: "Nunito-Regular" }}>
              Showing events near {userHashtag}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[15px] text-gray-500 text-center" style={{ fontFamily: "Nunito-Regular" }}>
            {userHashtag
              ? `No events found near ${userHashtag}.`
              : "No events found."}
          </Text>
        </View>
      }
    />
  );
}
