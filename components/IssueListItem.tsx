import { IMAGE_SLOW_LOAD_THRESHOLD_MS } from '@/constants/imageConfig';
import { calculateDaysActive } from "@/utils/FormatDate";
import { MaterialIcons } from "@expo/vector-icons";
import { getCrashlytics, log, recordError as recordCrashError } from '@react-native-firebase/crashlytics';
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "./CustomText";

interface IssueListItemProps {
  id: number;
  type: string;
  status?: string;
  description: string;
  created_at: string;
  verify_count?: number;
  location: {
    colloquial_name?: string;
    address?: string;
    locality?: {
      city?: string;
      district?: string;
    };
  };
  media_urls?: { url: string; url_thumbnail?: string }[];
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  pothole: "#ef4444",
  waste: "#22c55e",
  footpath: "#3b82f6",
  pollution: "#8b5cf6",
  hygiene: "#06b6d4",
  safety: "#f59e0b",
  other: "#6b7280",
};

const getIssueColor = (type: string): string => {
  return ISSUE_TYPE_COLORS[type.toLowerCase()] || ISSUE_TYPE_COLORS.other;
};

export default function IssueListItem({
  id,
  type,
  status,
  description,
  created_at,
  verify_count,
  location,
  media_urls,
}: IssueListItemProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/issueDetail",
      params: { issueId: id },
    });
  };

  const locationText =
    location?.colloquial_name ||
    location?.address ||
    location?.locality?.city ||
    location?.locality?.district ||
    "Location unknown";

  const daysActive = calculateDaysActive(created_at);
  const thumbnailUrl = media_urls?.[0]?.url_thumbnail || media_urls?.[0]?.url;
  const isThumbnail = !!media_urls?.[0]?.url_thumbnail;
  const loadStartRef = useRef<number | null>(null);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Image */}
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.image}
          contentFit="cover"
          onLoadStart={() => {
            loadStartRef.current = Date.now();
            console.log(`[ImageTiming] listItem  issueId=${id}  renderer=expo-image  type=${isThumbnail ? 'thumbnail' : 'mainImage'}  load started`);
          }}
          onLoad={(event) => {
            const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
            const { width: w, height: h } = event.source;
            console.log(`[ImageTiming] listItem  issueId=${id}  renderer=expo-image  type=${isThumbnail ? 'thumbnail' : 'mainImage'}  loaded in ${duration}ms  (${w}×${h})`);
            if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
              const crashlytics = getCrashlytics();
              log(crashlytics, `Slow list thumbnail load: issueId=${id} type=${isThumbnail ? 'thumbnail' : 'mainImage'} duration=${duration}ms — list item blank during load`);
              recordCrashError(crashlytics, new Error(`[ImagePerf] IssueListItem slow load issueId=${id}: ${duration}ms`));
            }
            loadStartRef.current = null;
          }}
          onError={() => {
            const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
            console.log(`[ImageTiming] listItem  issueId=${id}  renderer=expo-image  type=${isThumbnail ? 'thumbnail' : 'mainImage'}  error after ${duration}ms`);
            loadStartRef.current = null;
            const crashlytics = getCrashlytics();
            log(crashlytics, `List item image failed to load: issueId=${id} type=${isThumbnail ? 'thumbnail' : 'mainImage'} — image area blank`);
            recordCrashError(crashlytics, new Error(`[ImagePerf] IssueListItem image error issueId=${id} after ${duration}ms`));
          }}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: getIssueColor(type) + "20" }]}>
          <MaterialIcons name="report-problem" size={40} color={getIssueColor(type)} />
        </View>
      )}

      <View className="p-3">
        {/* Description */}
        {description ? (
          <CustomText numberOfLines={2} className="text-gray-700 text-sm mb-3 leading-5">
            {description}
          </CustomText>
        ) : null}

        {/* Type + Status */}
        <View className="flex-row items-center gap-2 mb-3">
          <View style={[styles.typeBadge, { backgroundColor: getIssueColor(type) }]}>
            <CustomText className="text-white text-xs font-bold uppercase">
              {type}
            </CustomText>
          </View>
          {status && (
            <View style={styles.statusBadge}>
              <CustomText className="text-gray-600 text-xs font-semibold uppercase">
                {status}
              </CustomText>
            </View>
          )}
        </View>

        {/* Location */}
        <View className="flex-row items-center mb-3">
          <MaterialIcons name="location-on" size={14} color="#256D1B" />
          <CustomText numberOfLines={1} className="text-gray-600 text-sm ml-1 flex-1">
            {locationText}
          </CustomText>
        </View>

        {/* Verifications + Days active */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <MaterialIcons name="verified" size={15} color="#256D1B" />
            <CustomText className="text-gray-600 text-xs ml-1">
              {verify_count ?? 0} {(verify_count ?? 0) === 1 ? "verification" : "verifications"}
            </CustomText>
          </View>
          <View className="flex-row items-center">
            <MaterialIcons name="schedule" size={14} color="#9ca3af" />
            <CustomText className="text-gray-400 text-xs ml-1">
              {daysActive}
            </CustomText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: {
    width: "100%",
    height: 200,
    backgroundColor: "#e5e7eb",
  },
  imagePlaceholder: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});
