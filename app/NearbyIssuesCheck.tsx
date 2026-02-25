import CustomText from "@/components/CustomText";
import { ensureUserIsNearIssue } from "@/utils/DistanceCheck";
import { calculateDaysActive } from "@/utils/FormatDate";
import { IssueMarker, useIssues } from "@/utils/IssuesContext";
import {
    getBestKnownLocation,
    getFastLocationWithProgressiveWatch,
    UserLocation,
} from "@/utils/LocationService";
import {
    formatDistance,
    getNearbyIssues,
    IssueWithDistance,
    NEARBY_RADIUS_METERS,
} from "@/utils/NearbyIssues";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const LOCATION_ACCURACY_THRESHOLD = 20; // metres
const LOCATION_CACHE_FRESHNESS_MS = 30_000; // 30 s

const ISSUE_TYPE_COLORS: Record<string, string> = {
  pothole: "#ef4444",
  waste: "#22c55e",
  footpath: "#3b82f6",
  pollution: "#8b5cf6",
  hygiene: "#06b6d4",
  safety: "#f59e0b",
  other: "#6b7280",
};
const getIssueColor = (type: string) =>
  ISSUE_TYPE_COLORS[type.toLowerCase()] ?? ISSUE_TYPE_COLORS.other;

// ─────────────────────────────────────────────────────────────
// NearbyIssueCard
// ─────────────────────────────────────────────────────────────
interface NearbyIssueCardProps {
  issue: IssueWithDistance;
  onUpdate: (issue: IssueMarker) => void;
  onView: (issue: IssueMarker) => void;
  isUpdating: boolean;
}

function NearbyIssueCard({
  issue,
  onUpdate,
  onView,
  isUpdating,
}: NearbyIssueCardProps) {
  const thumbnailUrl =
    (issue.media_urls?.[0] as { url: string; url_thumbnail?: string } | undefined)
      ?.url_thumbnail ?? issue.media_urls?.[0]?.url;
  const color = getIssueColor(issue.type);
  const daysActive = calculateDaysActive(issue.created_at);
  const locationText =
    (issue.location as any).colloquial_name ??
    (issue.location as any).address ??
    issue.location?.locality?.city ??
    issue.location?.locality?.district ??
    "Location unknown";

  return (
    <View style={styles.card}>
      {/* Thumbnail / placeholder */}
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.cardImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: color + "20" }]}>
          <MaterialIcons name="report-problem" size={32} color={color} />
        </View>
      )}

      <View style={styles.cardBody}>
        {/* Description */}
        {issue.description ? (
          <CustomText numberOfLines={2} className="text-gray-700 text-sm mb-2 leading-5">
            {issue.description}
          </CustomText>
        ) : null}

        {/* Type + Status badges */}
        <View className="flex-row flex-wrap gap-2 mb-2">
          <View style={[styles.typeBadge, { backgroundColor: color }]}>
            <CustomText className="text-white text-xs font-bold uppercase">
              {issue.type}
            </CustomText>
          </View>
          {issue.status ? (
            <View style={styles.statusBadge}>
              <CustomText className="text-gray-600 text-xs font-semibold uppercase">
                {issue.status}
              </CustomText>
            </View>
          ) : null}
        </View>

        {/* Location */}
        <View className="flex-row items-center mb-2">
          <MaterialIcons name="location-on" size={13} color="#256D1B" />
          <CustomText numberOfLines={1} className="text-gray-500 text-xs ml-1 flex-1">
            {locationText}
          </CustomText>
        </View>

        {/* Verify count + age + distance row */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center">
              <MaterialIcons name="verified" size={13} color="#256D1B" />
              <CustomText className="text-gray-500 text-xs ml-1">
                {issue.verify_count ?? 0} verifications
              </CustomText>
            </View>
            <View className="flex-row items-center">
              <MaterialIcons name="schedule" size={13} color="#9ca3af" />
              <CustomText className="text-gray-400 text-xs ml-1">{daysActive}</CustomText>
            </View>
          </View>
          {/* Distance chip */}
          <View style={styles.distanceChip}>
            <MaterialIcons name="near-me" size={12} color="#256D1B" />
            <CustomText className="text-[#256D1B] text-xs font-semibold ml-1">
              {formatDistance(issue.distanceMeters)}
            </CustomText>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => onView(issue)}
            activeOpacity={0.75}
          >
            <MaterialIcons name="visibility" size={15} color="#6b7280" />
            <CustomText className="text-gray-600 text-sm font-semibold ml-1">
              View
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.updateBtn, isUpdating && styles.btnDisabled]}
            onPress={() => !isUpdating && onUpdate(issue)}
            activeOpacity={0.8}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="edit" size={15} color="#fff" />
                <CustomText className="text-white text-sm font-bold ml-1">
                  Update Issue
                </CustomText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
type ScreenState = "loading" | "error" | "ready";

export default function NearbyIssuesCheck() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { issues } = useIssues();

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyIssues, setNearbyIssues] = useState<IssueWithDistance[]>([]);
  const [updatingIssueId, setUpdatingIssueId] = useState<number | null>(null);

  // Fade-in animation for content
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Location + filter on mount ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1. Try cached location first (< LOCATION_ACCURACY_THRESHOLD m, fresh < 30 s)
        const cached = getBestKnownLocation();
        let location: UserLocation | null = null;

        if (
          cached &&
          cached.accuracy !== null &&
          cached.accuracy < LOCATION_ACCURACY_THRESHOLD &&
          Date.now() - cached.timestamp < LOCATION_CACHE_FRESHNESS_MS
        ) {
          location = cached;
        } else {
          // 2. Fetch fresh accurate location
          const result = await getFastLocationWithProgressiveWatch({
            instantLoad: false,
            accuracyThresholdMeters: LOCATION_ACCURACY_THRESHOLD,
            timeoutMs: 20_000,
          });

          if (!result.success) {
            setLocationError(
              result.error.message ?? "Unable to get your location."
            );
            setScreenState("error");
            return;
          }
          location = result.location;
        }

        setUserLocation(location);

        // 3. Filter nearby issues from context
        const nearby = getNearbyIssues(
          location.latitude,
          location.longitude,
          issues
        );
        setNearbyIssues(nearby);
        setScreenState("ready");

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (err: any) {
        setLocationError(err?.message ?? "Something went wrong.");
        setScreenState("error");
      }
    })();
  }, []);

  // ── Navigation helpers ─────────────────────────────────────
  const handleReportNew = () => {
    router.push("/CameraCapture");
  };

  const handleUpdateIssue = async (issue: IssueMarker) => {
    if (updatingIssueId !== null) return;
    setUpdatingIssueId(issue.id);
    try {
      const isNear = await ensureUserIsNearIssue(
        issue.location.lat,
        issue.location.lng
      );
      if (!isNear) return; // ensureUserIsNearIssue already shows an alert
      router.push({
        pathname: "/CameraCapture",
        params: {
          mode: "update",
          issueType: issue.type.toUpperCase(),
          issueId: issue.id,
        },
      });
    } catch (e) {
      console.error("Distance check failed", e);
      Alert.alert("Error", "Could not verify your location. Please try again.");
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const handleViewIssue = (issue: IssueMarker) => {
    router.push({
      pathname: "/issueDetail",
      params: { issueId: issue.id },
    });
  };

  // ── Render states ──────────────────────────────────────────
  if (screenState === "loading") {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#256D1B" />
        <CustomText className="mt-3 text-gray-500 text-sm">
          Checking for nearby issues…
        </CustomText>
      </View>
    );
  }

  if (screenState === "error") {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <MaterialIcons name="location-off" size={44} color="#ef4444" />
        <CustomText className="mt-3 text-center text-gray-600 px-6">
          {locationError ?? "Could not get your location."}
        </CustomText>
        <TouchableOpacity
          style={[styles.reportNewBtn, { marginTop: 24 }]}
          onPress={handleReportNew}
          activeOpacity={0.85}
        >
          <MaterialIcons name="camera-alt" size={20} color="#fff" />
          <CustomText className="ml-2 text-white font-bold text-base">
            Continue to Report New Issue
          </CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Ready ──────────────────────────────────────────────────
  const hasNearby = nearbyIssues.length > 0;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={nearbyIssues}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          // ── Top: "Report New" CTA + section header ──────────
          ListHeaderComponent={
            <View>
              {/* Primary CTA — report new issue */}
              <TouchableOpacity
                style={styles.reportNewCard}
                onPress={handleReportNew}
                activeOpacity={0.85}
              >
                <View style={styles.reportNewCardInner}>
                  <View style={styles.reportNewIcon}>
                    <MaterialIcons name="add-circle-outline" size={28} color="#256D1B" />
                  </View>
                  <View style={styles.reportNewText}>
                    <CustomText className="text-[#256D1B] font-bold text-base">
                      Report a New Issue
                    </CustomText>
                    <CustomText className="text-gray-500 text-sm mt-0.5">
                      No duplicate? Tap here to report something new.
                    </CustomText>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#256D1B" />
                </View>
              </TouchableOpacity>

              {/* Section header */}
              {hasNearby ? (
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionDivider} />
                  <CustomText className="text-gray-500 text-xs font-semibold px-3 uppercase tracking-wide">
                    {nearbyIssues.length} nearby issue{nearbyIssues.length !== 1 ? "s" : ""} within {NEARBY_RADIUS_METERS} m
                  </CustomText>
                  <View style={styles.sectionDivider} />
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="check-circle-outline" size={44} color="#22c55e" />
                  <CustomText className="mt-3 text-gray-600 text-center text-sm font-semibold">
                    No existing issues found nearby
                  </CustomText>
                  <CustomText className="mt-1 text-gray-400 text-center text-xs">
                    Nothing within {NEARBY_RADIUS_METERS} m of your location.
                  </CustomText>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <NearbyIssueCard
              issue={item}
              onUpdate={handleUpdateIssue}
              onView={handleViewIssue}
              isUpdating={updatingIssueId === item.id}
            />
          )}
          // ── Bottom: optional second CTA when list is long ────
          ListFooterComponent={
            hasNearby ? (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.reportNewBtn}
                  onPress={handleReportNew}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <CustomText className="ml-2 text-white font-bold text-base">
                    Still Report New Issue
                  </CustomText>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  listContent: {
    paddingBottom: 32,
  },

  // ── Report New card (top) ──────────────────────────────────
  reportNewCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#256D1B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  reportNewCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  reportNewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reportNewText: {
    flex: 1,
  },

  // ── Section divider ────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  // ── Empty state ────────────────────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },

  // ── Issue card ─────────────────────────────────────────────
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#e5e7eb",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: {
    padding: 14,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  distanceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  // ── Action buttons ─────────────────────────────────────────
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#256D1B",
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // ── Footer CTA ─────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  reportNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#256D1B",
    paddingVertical: 14,
    borderRadius: 12,
  },
});
