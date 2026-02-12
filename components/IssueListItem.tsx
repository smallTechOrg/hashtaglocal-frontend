import { calculateDaysActive } from "@/utils/FormatDate";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "./CustomText";

interface IssueListItemProps {
  id: number;
  type: string;
  description: string;
  created_at: string;
  location: {
    locality?: {
      city?: string;
      district?: string;
    };
    address?: string;
  };
  media_urls?: Array<{ url: string }>;
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
  description,
  created_at,
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

  const getLocationText = (): string => {
    if (location?.address) {
      return location.address;
    }
    if (location?.locality?.city) {
      return location.locality.city;
    }
    return "Location unknown";
  };

  const daysActive = calculateDaysActive(created_at);
  const thumbnailUrl = media_urls?.[0]?.url;
  const locationName = getLocationText();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Image - Full width, bigger */}
      {thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.imageContainer}
          contentFit="cover"
        />
      )}

      {/* Content below image */}
      <View style={styles.contentContainer}>
        {/* Type badge */}
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: getIssueColor(type) },
          ]}
        >
          <CustomText className="text-white text-xs font-bold">
            {type.toUpperCase()}
          </CustomText>
        </View>

        {/* Location as title */}
        <CustomText
          numberOfLines={1}
          className="font-bold text-lg text-gray-900 mb-2"
        >
          {locationName}
        </CustomText>

        {/* Description as secondary */}
        {description && (
          <CustomText
            numberOfLines={2}
            className="text-gray-600 text-sm mb-2"
          >
            {description}
          </CustomText>
        )}

        {/* Time info */}
        <CustomText className="text-gray-400 text-xs">
          {daysActive}
        </CustomText>
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
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#e5e7eb",
  },
  contentContainer: {
    padding: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
});
