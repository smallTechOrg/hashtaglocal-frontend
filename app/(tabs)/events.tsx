import EventCard from "@/components/EventCard";
import { useEvents } from "@/utils/EventsContext";
import { calculateHaversineDistance } from "@/utils/LocationService";
import { useUser } from "@/utils/UserContext";
import { useMemo, useState, useEffect } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import * as Location from "expo-location";

export default function EventsScreen() {
  const { user } = useUser();
  const { events, loading } = useEvents();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    Location.getLastKnownPositionAsync().then((loc) => {
      if (loc) setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    }).catch(() => {});
  }, []);

  const userHashtag = user?.hashtag?.toLowerCase();

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      const startTime = new Date(e.start_time).getTime();
      if (isNaN(startTime) || startTime < now) return false;
      if (!userHashtag) return true;
      return e.location.locality.hashtags.some(
        (tag) => tag.toLowerCase() === userHashtag
      );
    });
  }, [events, userHashtag]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#256D1B" />
      </View>
    );
  }

  return (
    <FlatList
      data={filteredEvents}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <EventCard
          event={item}
          distanceMeters={
            userCoords
              ? calculateHaversineDistance(userCoords.lat, userCoords.lng, item.location.lat, item.location.lng)
              : undefined
          }
        />
      )}
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
