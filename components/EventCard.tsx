import { Event } from "@/api/events";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Linking, TouchableOpacity, View } from "react-native";
import CustomText from "./CustomText";

const EVENT_TYPE_COLORS: Record<string, string> = {
  TREKANDPLOG: "#22c55e",
  BEACH_CLEANUP: "#3b82f6",
  ROAD_CLEANUP: "#f59e0b",
  FOREST_CLEANUP: "#16a34a",
  CLEANLINESS_DRIVE: "#8b5cf6",
};

const getEventColor = (type: string): string =>
  EVENT_TYPE_COLORS[type] ?? "#6b7280";

const formatEventType = (type: string): string =>
  type.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();

const formatEventDate = (dateStr: string): string => {
  const utc = dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
  const date = new Date(utc);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatEventTime = (dateStr: string): string => {
  const utc = dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
  const date = new Date(utc);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  if (hours === 0 && minutes === 0) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

export default function EventCard({ event }: { event: Event }) {
  const color = getEventColor(event.type);
  const hashtag = event.location.locality.hashtags[0] ?? "";
  const time = formatEventTime(event.start_time);

  return (
    <TouchableOpacity
      className="bg-white rounded-xl mx-4 my-2 overflow-hidden border border-gray-200"
      style={{ elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
      activeOpacity={0.8}
      onPress={() => Linking.openURL(event.link)}
    >
      <Image
        source={{ uri: event.image_url }}
        className="w-full bg-gray-200"
        style={{ height: 180 }}
        contentFit="cover"
      />

      {/* Type badge — background is dynamic so kept as inline style */}
      <View
        className="absolute top-3 left-3 px-2.5 py-1 rounded-md"
        style={{ backgroundColor: color }}
      >
        <CustomText className="text-white text-xs uppercase" style={{ fontFamily: "Nunito-Bold" }}>
          {formatEventType(event.type)}
        </CustomText>
      </View>

      <View className="p-3 gap-1.5">
        <CustomText className="text-base text-gray-900" numberOfLines={2} style={{ fontFamily: "Nunito-Bold" }}>
          {event.name}
        </CustomText>

        <CustomText className="text-sm text-gray-500">
          {event.organisation}
        </CustomText>

        <View className="flex-row items-center gap-1">
          <MaterialIcons name="event" size={14} color="#256D1B" />
          <CustomText className="text-sm text-gray-700 flex-1">
            {formatEventDate(event.start_time)}
            {time ? `  •  ${time}` : ""}
          </CustomText>
        </View>

        <View className="flex-row items-center gap-1">
          <MaterialIcons name="location-on" size={14} color="#256D1B" />
          <CustomText className="text-sm text-gray-700 flex-1" numberOfLines={1}>
            {event.location.name}
            {hashtag ? `  ${hashtag}` : ""}
          </CustomText>
        </View>

        <View className="flex-row items-center gap-1 mt-0.5">
          <MaterialIcons name="open-in-new" size={13} color="#3b82f6" />
          <CustomText className="text-sm text-blue-500">View event</CustomText>
        </View>
      </View>
    </TouchableOpacity>
  );
}
