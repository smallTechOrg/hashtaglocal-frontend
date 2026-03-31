import { Event } from "@/api/events";
import { EVENT_TYPE_COLORS } from "@/constants/eventTypes";
import { formatEventDate, formatEventTime } from "@/utils/FormatDate";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import CustomText from "./CustomText";

const PLACEHOLDER = require("../assets/volunteer.jpeg");

const getEventColor = (type: string): string =>
  EVENT_TYPE_COLORS[type] ?? "#6b7280";

const formatEventType = (type: string): string =>
  type.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();


export default function EventCard({ event }: { event: Event }) {
  const color = getEventColor(event.type);
  const hashtag = event.location.locality.hashtags[0] ?? "";
  const time = formatEventTime(event.start_time);
  const endTime = event.end_time ? formatEventTime(event.end_time) : null;
  const [imgSource, setImgSource] = useState<{ uri: string } | number>({ uri: event.image_url });
  const loadStartRef = useRef<number | null>(null);

  return (
    <TouchableOpacity
      className="bg-white rounded-xl mx-4 my-2 overflow-hidden border border-gray-200"
      style={{ elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
      activeOpacity={0.8}
      onPress={() => WebBrowser.openBrowserAsync(event.link)}
    >
      <Image
        source={imgSource}
        onError={() => {
          const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
          console.log(`[ImageTiming] eventCard  eventId=${event.id ?? 'unknown'}  renderer=expo-image  error after ${duration}ms`);
          loadStartRef.current = null;
          setImgSource(PLACEHOLDER);
        }}
        className="w-full bg-gray-200"
        style={{ height: 180 }}
        contentFit="cover"
        onLoadStart={() => {
          loadStartRef.current = Date.now();
          console.log(`[ImageTiming] eventCard  eventId=${event.id ?? 'unknown'}  renderer=expo-image  load started`);
        }}
        onLoad={(e) => {
          const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
          const { width: w, height: h } = e.source;
          console.log(`[ImageTiming] eventCard  eventId=${event.id ?? 'unknown'}  renderer=expo-image  loaded in ${duration}ms  (${w}×${h})`);
          loadStartRef.current = null;
        }}
      />

      {/* Type badge — background is dynamic so kept as inline style */}
      <View
        className="absolute top-3 right-3 px-2.5 py-1 rounded-md"
        style={{ backgroundColor: color }}
      >
        <CustomText className="text-white text-xs uppercase" style={{ fontFamily: "Nunito-Bold" }}>
          {formatEventType(event.type)}
        </CustomText>
      </View>

      <View className="p-3 gap-1.5">
        {/* date + time  |  organisation */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="event" size={13} color="#256D1B" />
            <CustomText className="text-xs text-gray-500">
              {formatEventDate(event.start_time)}
              {time ? `  •  ${time}` : ""}
              {endTime ? ` – ${endTime}` : ""}
            </CustomText>
          </View>
          <CustomText className="text-xs text-gray-400" numberOfLines={1}>
            {event.organisation}
          </CustomText>
        </View>

        {/* event name */}
        <CustomText className="p text-gray-900" numberOfLines={2} style={{ fontFamily: "Nunito-Bold" }}>
          {event.name}
        </CustomText>

        {/* address */}
        <View className="flex-row items-start gap-1">
          <MaterialIcons name="location-on" size={13} color="#256D1B" style={{ marginTop: 1 }} />
          <CustomText className="text-xs text-gray-500 flex-1" numberOfLines={2}>
            {event.location.name}
          </CustomText>
        </View>

        {/* view event — right aligned */}
        <View className="flex-row items-center justify-end gap-1 mt-0.5">
          <CustomText className="text-xs text-blue-500">View</CustomText>
          <MaterialIcons name="open-in-new" size={12} color="#3b82f6" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
