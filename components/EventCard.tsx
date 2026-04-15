import { Event } from "@/api/events";
import { EVENT_TYPE_COLORS } from "@/constants/eventTypes";
import { IMAGE_SLOW_LOAD_THRESHOLD_MS } from '@/constants/imageConfig';
import { formatEventDate, formatEventTime } from "@/utils/FormatDate";
import { ImageTraceHandle, startImageTrace } from '@/utils/imagePerf';
import { formatDistance } from "@/utils/NearbyIssues";
import { MaterialIcons } from "@expo/vector-icons";
import { getCrashlytics, log, recordError as recordCrashError } from '@react-native-firebase/crashlytics';
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


export default function EventCard({ event, distanceMeters }: { event: Event; distanceMeters?: number }) {
  const color = getEventColor(event.type);
  const hashtag = event.location.locality.hashtags[0] ?? "";
  const time = formatEventTime(event.start_time);
  const endTime = event.end_time ? formatEventTime(event.end_time) : null;
  const [imgSource, setImgSource] = useState<{ uri: string } | number>({ uri: event.image_url });
  const loadStartRef = useRef<number | null>(null);
  const traceRef = useRef<ImageTraceHandle | null>(null);

  return (
    <TouchableOpacity
      className="bg-white rounded-xl mx-4 my-2 overflow-hidden border border-gray-200"
      style={{ elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
      activeOpacity={0.8}
      onPress={() => WebBrowser.openBrowserAsync(event.link)}
    >
      <Image
        source={imgSource}
        cachePolicy="memory-disk"
        onError={() => {
          const duration = traceRef.current?.stop(false) ?? -1;
          traceRef.current = null;
          loadStartRef.current = null;
          console.log(`[ImageLoad] ERROR  eventCard  id=${event.id ?? 'unknown'}  after ${duration}ms `);
          const crashlytics = getCrashlytics();
          log(crashlytics, `EventCard image failed to load: eventId=${event.id ?? 'unknown'} after ${duration}ms`);
          recordCrashError(crashlytics, new Error(`[ImagePerf] EventCard image error eventId=${event.id ?? 'unknown'} after ${duration}ms`));
          setImgSource(PLACEHOLDER);
        }}
        className="w-full bg-gray-200"
        style={{ height: 180 }}
        contentFit="cover"
        onLoadStart={() => {
          loadStartRef.current = Date.now();
          console.log(`[ImageLoad] START  eventCard  id=${event.id ?? 'unknown'}`);
          traceRef.current = startImageTrace({
            component: 'eventCard',
            imageType: 'mainImage',
            renderer: 'expo-image',
            id: String(event.id ?? 'unknown'),
          });
        }}
        onLoad={(e) => {
          const { width: w, height: h } = e.source;
          const duration = traceRef.current?.stop(true, w, h) ?? -1;
          traceRef.current = null;
          console.log(`[ImageLoad] DONE   eventCard  id=${event.id ?? 'unknown'}  ${duration}ms  ${w}×${h}${duration < 80 ? '  (cache)' : '  (network)'}`);
          if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
            const crashlytics = getCrashlytics();
            log(crashlytics, `Slow EventCard image load: eventId=${event.id ?? 'unknown'} duration=${duration}ms (${w}×${h})`);
            recordCrashError(crashlytics, new Error(`[ImagePerf] EventCard slow load eventId=${event.id ?? 'unknown'}: ${duration}ms`));
          }
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

      <View className="p-3 gap-2">
        {/* event name */}
        <CustomText className="text-base text-gray-900" numberOfLines={2} style={{ fontFamily: "Nunito-Bold" }}>
          {event.name}
        </CustomText>

        {/* organisation */}
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="business" size={13} color="#6b7280" />
          <CustomText className="text-xs text-gray-500 flex-1" numberOfLines={1}>
            {event.organisation}
          </CustomText>
        </View>

        {/* date */}
        <View className="flex-row items-center gap-1">
          <MaterialIcons name="event" size={13} color="#256D1B" />
          <CustomText className="text-xs text-gray-500 flex-1">
            {formatEventDate(event.start_time)}
          </CustomText>
        </View>

        {/* time */}
        {time && (
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="schedule" size={13} color="#256D1B" />
            <CustomText className="text-xs text-gray-500">
              {time}{endTime ? ` – ${endTime}` : ""}
            </CustomText>
          </View>
        )}

        {/* address */}
        <View className="flex-row items-start gap-1">
          <MaterialIcons name="location-on" size={13} color="#256D1B" style={{ marginTop: 1 }} />
          <CustomText className="text-xs text-gray-500 flex-1" numberOfLines={2}>
            {event.location.name}
          </CustomText>
        </View>

        {/* distance */}
        {distanceMeters != null && (
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="directions-walk" size={13} color="#6b7280" />
            <CustomText className="text-xs text-gray-500">
              {formatDistance(distanceMeters)} away
            </CustomText>
          </View>
        )}

        {/* view event — right aligned */}
        <View className="flex-row items-center justify-end gap-1 mt-0.5">
          <CustomText className="text-xs text-blue-500">View</CustomText>
          <MaterialIcons name="open-in-new" size={12} color="#3b82f6" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
