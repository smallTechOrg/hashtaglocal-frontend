import { Event } from "@/api/events";
import { getAllIssues, getIssuesByLocality, getIssuesByLocation } from "@/api/IssueDetail";
import CityPickerModal from "@/components/CityPickerModal";
import CustomText from "@/components/CustomText";
import {
  createIssueFilterPredicate,
  ISSUE_FILTER_CATEGORIES,
  MapFilterOverlay,
  useMapFilters,
} from "@/components/MapFilter";
import { apiGet } from "@/utils/apiClient";
import { ensureUserIsNearIssue } from "@/utils/DistanceCheck";
import { useEvents } from "@/utils/EventsContext";
import { calculateDaysActive, formatEventDate, formatEventTime } from "@/utils/FormatDate";
import { ImageTraceHandle, startImageTrace } from "@/utils/imagePerf";
import { useIssues } from "@/utils/IssuesContext";
import { useKarma } from "@/utils/KarmaContext";
import {
  calculateHaversineDistance,
  getFastLocationWithProgressiveWatch,
  LocationError,
  subscribeToBestLocation,
  UserLocation,
} from "@/utils/LocationService";
import { formatDistance } from "@/utils/NearbyIssues";
import { useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Region } from "react-native-maps";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

type LoadingState = "loading" | "success" | "error";

// India-wide view used when location permission is denied
const INDIA_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

// Custom map style to hide POIs and business markers
const customMapStyle = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

interface IssueMarker {
  id: number;
  location: {
    lat: number;
    lng: number;
    colloquial_name?: string;
    address?: string;
  };
  type: string;
  description: string;
  status?: string;
  user?: { username?: string };
  verify_count?: number;
  created_at?: string;
  media_urls?: { url: string; url_thumbnail?: string }[];
}

// Color mapping for issue types
const ISSUE_TYPE_COLORS: Record<string, string> = {
  pothole: "#ef4444",    // Red
  waste: "#22c55e",      // Green
  footpath: "#3b82f6",   // Blue
  pollution: "#8b5cf6",  // Purple
  hygiene: "#06b6d4",    // Cyan
  safety: "#f59e0b",     // Orange
  other: "#fce916",      // Gray
};

const getIssueColor = (type: string): string => {
  return ISSUE_TYPE_COLORS[type.toLowerCase()] || ISSUE_TYPE_COLORS.other;
};

export default function MapScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, setUser } = useUser();
  const { setKarma } = useKarma();
  const { setIssues: setContextIssues } = useIssues();
  const { events } = useEvents();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isIndiaMode, setIsIndiaMode] = useState(false);
  const [selectedCity, setSelectedCity] = useState("#india");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [issues, setIssues] = useState<IssueMarker[]>([]);
  // Full city list — fetched once on mount so the picker always shows all cities
  // regardless of whether the user is in local or India mode.
  const [allCities, setAllCities] = useState<string[]>(["#india"]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueMarker | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [checkingDistance, setCheckingDistance] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [showEventsOnly, setShowEventsOnly] = useState(false);
  const bottomSheetTraceRef = useRef<ImageTraceHandle | null>(null);
  const eventSheetTraceRef = useRef<ImageTraceHandle | null>(null);

  // ── Map filters (extensible: swap categories/predicate for other domains) ──
  const issueFilterPredicate = useMemo(
    () => createIssueFilterPredicate(user?.username),
    [user?.username],
  );

  const {
    filteredItems: filteredIssues,
    activeFilters,
    activeCount: filterActiveCount,
    toggle: filterToggle,
    clear: filterClear,
    clearAll: filterClearAll,
    isSelected: filterIsSelected,
  } = useMapFilters(issues, ISSUE_FILTER_CATEGORIES, issueFilterPredicate);

  // Compute per-option counts.
  // Counts are *dynamic*: when a type filter is active the status counts
  // reflect only issues of that type (and vice-versa), giving users instant
  // feedback about what the second filter will further narrow to.
  const filterItemCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {
      reporter: {},
      issueType: {},
      status: {},
    };

    // Determine which filters are active per category
    const activeType = activeFilters.issueType;
    const activeStatus = activeFilters.status;
    const activeReporter = activeFilters.reporter;
    const hasTypeFilter = activeType && activeType.size > 0;
    const hasStatusFilter = activeStatus && activeStatus.size > 0;
    const hasReporterFilter = activeReporter && activeReporter.has("MINE");

    issues.forEach((issue) => {
      const typeKey = issue.type.toUpperCase();
      const statusKey = (issue.status ?? "").toUpperCase();
      const isMine = issue.user?.username === user?.username;

      // Type counts: cross-filtered by active status + reporter
      const passesStatusForType = !hasStatusFilter || activeStatus!.has(statusKey);
      const passesReporterForType = !hasReporterFilter || isMine;
      if (passesStatusForType && passesReporterForType) {
        counts.issueType[typeKey] = (counts.issueType[typeKey] || 0) + 1;
      }

      // Status counts: cross-filtered by active type + reporter
      const passesTypeForStatus = !hasTypeFilter || activeType!.has(typeKey);
      const passesReporterForStatus = !hasReporterFilter || isMine;
      if (statusKey && passesTypeForStatus && passesReporterForStatus) {
        counts.status[statusKey] = (counts.status[statusKey] || 0) + 1;
      }

      // Reporter counts: cross-filtered by active type + status
      const passesTypeForReporter = !hasTypeFilter || activeType!.has(typeKey);
      const passesStatusForReporter = !hasStatusFilter || activeStatus!.has(statusKey);
      if (isMine && passesTypeForReporter && passesStatusForReporter) {
        counts.reporter["MINE"] = (counts.reporter["MINE"] || 0) + 1;
      }
    });

    // "All" = total passing the *other* categories' filters
    counts.issueType["ALL"] = Object.values(counts.issueType).reduce((s, n) => s + n, 0);
    counts.status["ALL"] = Object.values(counts.status).reduce((s, n) => s + n, 0);
    counts.reporter["ALL"] = issues.length;

    return counts;
  }, [issues, activeFilters, user?.username]);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['45%', '50%', '90%'], []);

  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const userRef = useRef(user);
  // Tracks the active city so async callbacks (location watcher) can read
  // the current value without stale-closure issues.
  const selectedCityRef = useRef(selectedCity);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    selectedCityRef.current = selectedCity;
  }, [selectedCity]);

  // Build allCities once on mount from the full issue list so the picker
  // always shows every city regardless of the current view mode.
  useEffect(() => {
    getAllIssues()
      .then((data) => {
        const tags = new Set<string>(["#india"]);
        data.forEach((issue: any) => {
          issue.location?.locality?.hashtags?.forEach((tag: string) => {
            const normalized = tag.startsWith("#") ? tag.toLowerCase() : "#" + tag.toLowerCase();
            tags.add(normalized);
          });
        });
        setAllCities(
          Array.from(tags).sort((a, b) =>
            a === "#india" ? -1 : b === "#india" ? 1 : a.localeCompare(b)
          )
        );
      })
      .catch(console.error);
  }, []);

  // Keep selectedCity in sync with the current mode:
  // - India mode → always "#india"
  // - local mode → user's own hashtag
  useEffect(() => {
    if (isIndiaMode) {
      setSelectedCity("#india");
    } else if (user?.hashtag) {
      setSelectedCity(user.hashtag);
    }
  }, [user?.hashtag, isIndiaMode]);

  // Render the header title as a tappable dropdown opener
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          onPress={() => setCityPickerVisible(true)}
          activeOpacity={0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <CustomText style={{ fontSize: 20, fontFamily: "Nunito-Bold", color: "#111827" }}>
            {selectedCity}
          </CustomText>
          <MaterialIcons name="expand-more" size={22} color="#374151" />
        </TouchableOpacity>
      ),
    });
  }, [selectedCity, setCityPickerVisible, navigation]);

  useEffect(() => {
    if (user && !isIndiaMode) {
      loadUserLocation();
    }
  }, [user?.username]);

  useEffect(() => {
    // Subscribe to progressive updates and update map when accuracy improves.
    // Guard with userRef so that after logout/account-deletion the callback
    // does not keep firing authenticated API calls and causing a session-expired loop.
    const unsub = subscribeToBestLocation((loc) => {
      setUserLocation(loc);
      // Only reload nearby issues when the user is viewing their home city.
      // If they've picked a different city via the city picker, don't override it.
      if (userRef.current && selectedCityRef.current === userRef.current?.hashtag) {
        loadNearbyIssues(loc.latitude, loc.longitude);
      }
    });

    return () => unsub();
  }, []);

  // Reload issues + refresh user summary when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (userLocation) {
        const { latitude, longitude } = userLocation;
        // Always refresh the user's karma/profile on focus.
        refreshUserProfile(latitude, longitude);

        // Only reload nearby issues when the user is viewing their home city.
        // If they've picked a different city (e.g. #india, #bengaluru), keep
        // the city-selected issues so the view doesn't reset on tab switch.
        const isViewingHomeCity =
          selectedCityRef.current === userRef.current?.hashtag;
        if (isViewingHomeCity) {
          loadNearbyIssues(latitude, longitude);
        } else if (selectedCityRef.current === "#india") {
          loadAllIssues();
        } else {
          // Re-fetch the chosen city's issues (in case they became stale)
          getIssuesByLocality(selectedCityRef.current)
            .then((data) => {
              setIssues(data);
              setContextIssues(data);
            })
            .catch(console.error);
        }
      } else if (isIndiaMode) {
        loadAllIssues();
      }
    }, [userLocation, isIndiaMode])
  );

  // Open/close bottom sheet when issue is selected/deselected
  useEffect(() => {
    if (selectedIssue) {
      setImageVisible(false);

      // Use setTimeout to ensure the bottom sheet is ready for interaction
      const timer = setTimeout(() => {
        try {
          bottomSheetRef.current?.snapToIndex(0);
        } catch (error) {
          console.error("Error opening bottom sheet:", error);
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      try {
        bottomSheetRef.current?.close();
      } catch (error) {
        console.error("Error closing bottom sheet:", error);
      }
    }
  }, [selectedIssue]);

  const loadUserLocation = async () => {
    setLoadingState("loading");
    setError(null);

    const result = await getFastLocationWithProgressiveWatch({
      instantLoad: true,
      accuracyThresholdMeters: 400,
    });

    if (result.success) {
      setUserLocation(result.location);
      setIsIndiaMode(false);
      setLoadingState("success");
      // Load issues for this location
      loadNearbyIssues(result.location.latitude, result.location.longitude);
    } else {
      // Any location failure (permission denied, GPS off, timeout, etc.)
      // → fall back to India mode: show all issues, center map on India
      setIsIndiaMode(true);
      setLoadingState("success");
      loadAllIssues();
    }
  };

  const loadAllIssues = async () => {
    try {
      setIssuesLoading(true);
      const issuesData = await getAllIssues();
      setIssues(issuesData);
      setContextIssues(issuesData);
      // Also refresh allCities so the picker is populated immediately
      // when India mode is entered (avoids the race with the mount-time fetch).
      const tags = new Set<string>(["#india"]);
      issuesData.forEach((issue: any) => {
        issue.location?.locality?.hashtags?.forEach((tag: string) => {
          const normalized = tag.startsWith("#") ? tag.toLowerCase() : "#" + tag.toLowerCase();
          tags.add(normalized);
        });
      });
      setAllCities(
        Array.from(tags).sort((a, b) =>
          a === "#india" ? -1 : b === "#india" ? 1 : a.localeCompare(b)
        )
      );
    } catch (error) {
      console.error("Failed to load all issues:", error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleCitySelect = async (city: string) => {
    setSelectedCity(city);
    setIssuesLoading(true);
    try {
      const data = city === "#india"
        ? await getAllIssues()
        : await getIssuesByLocality(city);
      setIssues(data);
      setContextIssues(data);

      // Pan the map: always zoom to India overview for #india;
      // otherwise fit to the selected city's issue pins.
      if (city === "#india" && mapRef.current) {
        mapRef.current.animateToRegion(INDIA_REGION, 500);
      } else {
        const geo = data.filter((i: any) => i.location?.lat && i.location?.lng);
        if (geo.length > 0 && mapRef.current) {
          mapRef.current.fitToCoordinates(
            geo.map((i: any) => ({ latitude: i.location.lat, longitude: i.location.lng })),
            { edgePadding: { top: 80, right: 40, bottom: 120, left: 40 }, animated: true }
          );
        }
      }
    } catch (error) {
      console.error("Failed to load city issues:", error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const refreshUserProfile = async (lat?: number, lng?: number) => {
    try {
      let profileUrl = `${API_BASE_URL}/account/profile`;
      if (lat !== undefined && lng !== undefined) {
        profileUrl = `${API_BASE_URL}/account/profile?lat=${lat}&lng=${lng}`;
      }
      const response = await apiGet(profileUrl);
      if (response.ok) {
        const data = await response.json();
        const { username, picture, user_role, hashtag, user_summary } = data.data.user;
        setUser({ username, picture, user_role, hashtag, user_summary });
        setKarma(user_summary?.karma_earned ?? 0, user_summary?.karma_pending ?? 0);
      }
    } catch (error) {
      console.log("[MapScreen] Silent profile refresh failed:", error);
    }
  };

  const loadNearbyIssues = async (lat: number, lng: number) => {
    try {
      setIssuesLoading(true);
      const issuesData = await getIssuesByLocation(lat, lng);
      console.log("Issues loaded:", issuesData.length);
      setIssues(issuesData);
      // Also save to context for other tabs to use
      setContextIssues(issuesData);
    } catch (error) {
      console.error("Failed to load nearby issues:", error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleEventMarkerPress = useCallback((event: Event) => {
    setSelectedIssue(null);
    setSelectedEvent(event);
    setTimeout(() => {
      try { bottomSheetRef.current?.snapToIndex(0); } catch {}
    }, 50);
  }, []);

  const handleMarkerPress = useCallback((issue: IssueMarker) => {
    setSelectedEvent(null);
    setSelectedIssue(issue);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setSelectedIssue(null);
    setSelectedEvent(null);
  }, []);

  const handleViewDetails = useCallback(() => {
    if (selectedIssue) {
      bottomSheetRef.current?.close();
      router.push({
        pathname: "/issueDetail",
        params: { issueId: selectedIssue.id },
      });
    }
  }, [selectedIssue, router]);

  const handleUpdateIssue = useCallback(async() => {
    if (!selectedIssue || checkingDistance) return;

    try {
      setCheckingDistance(true);
      const isNear = await ensureUserIsNearIssue(selectedIssue.location.lat, selectedIssue.location.lng);
      if (!isFocusedRef.current) return;
      if (!isNear) return;

      bottomSheetRef.current?.close();
      router.push({
        pathname: "/CameraCapture",
        params: {
          mode: "update",
          issueType: selectedIssue.type.toUpperCase(),
          issueId: selectedIssue.id,
        },
      });
    } catch (e) {
      if (isFocusedRef.current) {
        console.error("Distance check failed", e);
        Alert.alert("Error", "Unable to check your distance from the issue. Please try again.");
      }
    } finally {
      setCheckingDistance(false);
    }
  }, [selectedIssue, router, checkingDistance]);

  // Check if marker is within viewport bounds
  const isMarkerInViewport = useCallback((markerLat: number, markerLng: number): boolean => {
    if (!mapRegion) return true; // Show all if no region set yet
    
    const { latitude, longitude, latitudeDelta, longitudeDelta } = mapRegion;
    
    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;
    
    return (
      markerLat >= minLat &&
      markerLat <= maxLat &&
      markerLng >= minLng &&
      markerLng <= maxLng
    );
  }, [mapRegion]);

  // Only render markers that are in the current viewport.
  // In India mode skip the viewport filter — the map is zoomed out to show
  // the whole country so we want every geo-tagged issue to appear as a pin.
  const visibleMarkers = useMemo(() => {
    const geoTagged = filteredIssues.filter(
      (issue) => issue.location.lat && issue.location.lng,
    );
    if (isIndiaMode) return geoTagged;
    return geoTagged.filter((issue) =>
      isMarkerInViewport(issue.location.lat, issue.location.lng),
    );
  }, [filteredIssues, isMarkerInViewport, isIndiaMode]);

  // All future events filtered to user's hashtag
  const futureEvents = useMemo(() => {
    const now = Date.now();
    const userHashtag = user?.hashtag?.toLowerCase();
    return events.filter((event) => {
      const startTime = new Date(event.start_time).getTime();
      if (isNaN(startTime) || startTime < now) return false;
      if (!userHashtag) return true;
      return event.location.locality.hashtags.some(
        (tag) => tag.toLowerCase() === userHashtag
      );
    });
  }, [events, user?.hashtag]);

  // Future events visible in the current viewport
  const visibleEventMarkers = useMemo(() => {
    return futureEvents.filter((event) =>
      isMarkerInViewport(event.location.lat, event.location.lng)
    );
  }, [futureEvents, isMarkerInViewport]);

  const handleMapRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  // Toggle events-only mode + zoom to fit event markers
  const handleToggleEvents = useCallback(() => {
    setShowEventsOnly((prev) => {
      const next = !prev;
      if (next && futureEvents.length > 0 && mapRef.current) {
        let minLat = futureEvents[0].location.lat;
        let maxLat = futureEvents[0].location.lat;
        let minLng = futureEvents[0].location.lng;
        let maxLng = futureEvents[0].location.lng;
        futureEvents.forEach((e) => {
          minLat = Math.min(minLat, e.location.lat);
          maxLat = Math.max(maxLat, e.location.lat);
          minLng = Math.min(minLng, e.location.lng);
          maxLng = Math.max(maxLng, e.location.lng);
        });
        // Include user location in the bounding box
        if (userLocation) {
          minLat = Math.min(minLat, userLocation.latitude);
          maxLat = Math.max(maxLat, userLocation.latitude);
          minLng = Math.min(minLng, userLocation.longitude);
          maxLng = Math.max(maxLng, userLocation.longitude);
        }
        mapRef.current.animateToRegion(
          {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
            longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
          },
          500,
        );
      } else if (!next && mapRef.current && userLocation) {
        mapRef.current.animateToRegion(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500,
        );
      }
      setSelectedIssue(null);
      setSelectedEvent(null);
      return next;
    });
  }, [futureEvents, userLocation]);

  // Track previous filterActiveCount so we only zoom to home when a filter
  // is explicitly cleared, not when the issues dataset changes (city selection).
  const prevFilterActiveCountRef = useRef(filterActiveCount);

  // Auto-zoom map to fit filtered markers when a filter is active
  useEffect(() => {
    const prevCount = prevFilterActiveCountRef.current;
    prevFilterActiveCountRef.current = filterActiveCount;

    if (filterActiveCount === 0) {
      // Only zoom back to home when a filter was just cleared (count dropped to 0).
      // Skip if count was already 0 — that means issues changed for another reason
      // (e.g. city selection) and we should NOT snap back to user location.
      if (prevCount === 0) return;
      if (mapRef.current && userLocation) {
        mapRef.current.animateToRegion(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500,
        );
      } else if (mapRef.current && isIndiaMode) {
        mapRef.current.animateToRegion(INDIA_REGION, 500);
      }
      return;
    }

    if (!mapRef.current || filteredIssues.length === 0) return;

    let minLat = filteredIssues[0].location.lat;
    let maxLat = filteredIssues[0].location.lat;
    let minLng = filteredIssues[0].location.lng;
    let maxLng = filteredIssues[0].location.lng;

    filteredIssues.forEach((issue) => {
      minLat = Math.min(minLat, issue.location.lat);
      maxLat = Math.max(maxLat, issue.location.lat);
      minLng = Math.min(minLng, issue.location.lng);
      maxLng = Math.max(maxLng, issue.location.lng);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.005);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.005);

    mapRef.current.animateToRegion(
      {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      },
      500,
    );

    // Close any open issue card
    setSelectedIssue(null);
  }, [filterActiveCount, filteredIssues, userLocation]);

  // Memoize initial region to prevent re-renders
  const initialRegion = useMemo(() => {
    if (isIndiaMode && !userLocation) return INDIA_REGION;
    return {
      latitude: userLocation?.latitude || 0,
      longitude: userLocation?.longitude || 0,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  }, [isIndiaMode, userLocation?.latitude, userLocation?.longitude]);

  if (loadingState === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#256D1B" />
        <CustomText>Loading map...</CustomText>
      </View>
    );
  }

  if (loadingState === "error") {
    return (
      <View style={styles.container}>
        <MaterialIcons name="location-off" size={48} color="#ef4444" />
        <CustomText className="mt-4 text-center px-4">
          {error?.message || "Unable to load location"}
        </CustomText>
        {error?.code === "PERMISSION_DENIED" && (
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            className="mt-4 bg-blue-500 px-6 py-2 rounded"
          >
            <CustomText className="text-white">Open Settings</CustomText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!userLocation && !isIndiaMode) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#256D1B" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
      {/* Floating filter overlay */}
      <MapFilterOverlay
        categories={ISSUE_FILTER_CATEGORIES}
        isSelected={filterIsSelected}
        onToggle={filterToggle}
        onClear={filterClear}
        onClearAll={filterClearAll}
        activeCount={filterActiveCount}
        activeFilters={activeFilters}
        itemCounts={filterItemCounts}
        eventsCount={futureEvents.length}
        onEventsPress={handleToggleEvents}
        showEventsOnly={showEventsOnly}
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={customMapStyle}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        toolbarEnabled={false}
        showsCompass={true}
        mapPadding={{ top: 0, right: 0, bottom: 100, left: 0 }}
        onRegionChange={handleMapRegionChange}
        onRegionChangeComplete={handleMapRegionChange}
      >
        {/* Viewport-based Issue Markers (hidden in events-only mode) */}
        {!showEventsOnly && visibleMarkers.map((issue) => (
          <Marker
            key={`marker-${issue.id}`}
            coordinate={{
              latitude: issue.location.lat,
              longitude: issue.location.lng,
            }}
            pinColor={getIssueColor(issue.type)}
            onPress={() => handleMarkerPress(issue)}
            tracksViewChanges={false}
          />
        ))}

        {/* Event Markers */}
        {visibleEventMarkers.map((event) => (
          <Marker
            key={`event-${event.id}`}
            coordinate={{
              latitude: event.location.lat,
              longitude: event.location.lng,
            }}
            pinColor="#4f8ef7"
            onPress={() => handleEventMarkerPress(event)}
            tracksViewChanges={false}
          />
        ))}
      </MapView>

      {/* City picker modal — opened from the header title */}
      <CityPickerModal
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        cities={allCities}
        selectedCity={selectedCity}
        onSelect={handleCitySelect}
      />

      {/* Loading Indicator for Issues */}
      {issuesLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#256D1B" />
        </View>
      )}

      {/* Bottom centre overlay: FAB */}
      <View style={styles.bottomOverlay} pointerEvents="box-none">
        <View style={styles.reportFabContainer}>
          <TouchableOpacity
            style={styles.reportFab}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/report")}
          >
            <MaterialIcons name="camera-alt" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.reportFabLabelPill}>
            <CustomText style={styles.reportFabLabel}>Report an Issue</CustomText>
          </View>
        </View>
      </View>

      {/* Bottom Sheet for Issue Preview */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={handleCloseBottomSheet}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        {selectedEvent && (
          <BottomSheetScrollView
            contentContainerStyle={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Event Image */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: selectedEvent.image_url }}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                onLoadStart={() => {
                  console.log(`[ImageLoad] START  bottomSheet-event  id=${selectedEvent.id} `);
                  eventSheetTraceRef.current = startImageTrace({
                    component: 'mapBottomSheet',
                    imageType: 'mainImage',
                    renderer: 'expo-image',
                    id: String(selectedEvent.id),
                  });
                }}
                onLoad={(event) => {
                  const { width: w, height: h } = event.source;
                  const duration = eventSheetTraceRef.current?.stop(true, w, h) ?? -1;
                  eventSheetTraceRef.current = null;
                  console.log(`[ImageLoad] DONE   bottomSheet-event  id=${selectedEvent.id}  ${duration}ms  ${w}×${h}${duration < 80 ? '  (cache)' : '  (network)'}`);
                }}
                onError={() => {
                  const duration = eventSheetTraceRef.current?.stop(false) ?? -1;
                  eventSheetTraceRef.current = null;
                  console.log(`[ImageLoad] ERROR  bottomSheet-event  id=${selectedEvent.id}  after ${duration}ms`);
                }}
              />
            </View>

            {/* Event type badge */}
            <View className="flex-row items-center mb-2">
              <View className="px-3 py-1 rounded-md" style={{ backgroundColor: "#6366f1" }}>
                <CustomText className="text-white text-xs font-bold uppercase">
                  {selectedEvent.type.replace(/_/g, " ")}
                </CustomText>
              </View>
            </View>

            {/* Event name */}
            <CustomText className="text-lg text-gray-900 mb-3" style={{ fontFamily: "Nunito-Bold" }}>
              {selectedEvent.name}
            </CustomText>

            {/* Organisation */}
            <View className="flex-row items-center mb-2">
              <MaterialIcons name="business" size={15} color="#6b7280" />
              <CustomText className="text-sm text-gray-600 ml-2">{selectedEvent.organisation}</CustomText>
            </View>

            {/* Date & time */}
            <View className="flex-row items-center mb-2">
              <MaterialIcons name="event" size={15} color="#256D1B" />
              <CustomText className="text-sm text-gray-600 ml-2">
                {formatEventDate(selectedEvent.start_time)}
                {formatEventTime(selectedEvent.start_time) ? `  •  ${formatEventTime(selectedEvent.start_time)}` : ""}
                {selectedEvent.end_time ? ` – ${formatEventTime(selectedEvent.end_time)}` : ""}
              </CustomText>
            </View>

            {/* Location */}
            <View className="flex-row items-start mb-2">
              <MaterialIcons name="location-on" size={15} color="#256D1B" style={{ marginTop: 1 }} />
              <CustomText className="text-sm text-gray-600 ml-2 flex-1">
                {selectedEvent.location.name}
              </CustomText>
            </View>

            {/* Distance from user */}
            {userLocation && (
              <View className="flex-row items-center mb-4">
                <MaterialIcons name="directions-walk" size={15} color="#6b7280" />
                <CustomText className="text-sm text-gray-500 ml-2">
                  {formatDistance(calculateHaversineDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    selectedEvent.location.lat,
                    selectedEvent.location.lng,
                  ))} away
                </CustomText>
              </View>
            )}

            {/* Open link button */}
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => Linking.openURL(selectedEvent.link)}
            >
              <CustomText className="text-white font-semibold text-base">View Event</CustomText>
              <MaterialIcons name="open-in-new" size={18} color="#fff" />
            </TouchableOpacity>
          </BottomSheetScrollView>
        )}
        {selectedIssue && (
          <BottomSheetScrollView
            contentContainerStyle={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image */}
            {selectedIssue.media_urls && selectedIssue.media_urls.length > 0 ? (
              <View style={styles.imageContainer}>
                 <Image
                   key={selectedIssue.id}
                   source={{
                     uri: selectedIssue.media_urls[0].url_thumbnail,
                     cacheKey: selectedIssue.media_urls[0].url_thumbnail?.split('?')[0],
                   }}
                   style={styles.previewImage}
                   contentFit="cover"
                   transition={0}
                   cachePolicy="memory-disk"
                   onLoadStart={() => {
                    console.log(`[ImageLoad] START  bottomSheet-issue  id=${selectedIssue.id}`);
                    bottomSheetTraceRef.current = startImageTrace({
                      component: 'mapBottomSheet',
                      imageType: 'thumbnail',
                      renderer: 'expo-image',
                      id: String(selectedIssue.id),
                    });
                  }}
                  onLoad={(event) => {
                    const { width: w, height: h } = event.source;
                    const duration = bottomSheetTraceRef.current?.stop(true, w, h) ?? -1;
                    bottomSheetTraceRef.current = null;
                    console.log(`[ImageLoad] DONE   bottomSheet-issue  id=${selectedIssue.id}  ${duration}ms  ${w}×${h}${duration < 80 ? '  (cache)' : '  (network)'}`);
                    setImageVisible(true);
                  }}
                  onError={() => {
                    const duration = bottomSheetTraceRef.current?.stop(false) ?? -1;
                    bottomSheetTraceRef.current = null;
                    console.log(`[ImageLoad] ERROR  bottomSheet-issue  id=${selectedIssue.id}  after ${duration}ms`);
                  }}
                />
              </View>
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: getIssueColor(selectedIssue.type) + "20" }]}>
                <MaterialIcons name="report-problem" size={64} color={getIssueColor(selectedIssue.type)} />
                <CustomText className="text-gray-500 mt-2">No image available</CustomText>
              </View>
            )}
{/* Description */}
            {selectedIssue.description && (
              <View style={styles.descriptionSection}>
                <CustomText className="text-md text-gray-700 leading-5">
                  {selectedIssue.description}
                </CustomText>
              </View>
            )}
            {/* Type + Status */}
            <View className="flex-row items-center gap-2 mb-3">
              <View style={[styles.issueTypeTag, { backgroundColor: getIssueColor(selectedIssue.type) }]}>
                <CustomText className="text-white text-xs font-bold uppercase">
                  {selectedIssue.type}
                </CustomText>
              </View>
              {selectedIssue.status && (
                <View style={styles.statusBadge}>
                  <CustomText className="text-xs text-gray-600 uppercase font-semibold">
                    {selectedIssue.status}
                  </CustomText>
                </View>
              )}
            </View>

            {/* Location name */}
            {(selectedIssue.location.colloquial_name || selectedIssue.location.address) && (
              <View className="flex-row items-center mb-3">
                <MaterialIcons name="location-on" size={16} color="#256D1B" />
                <CustomText className="text-sm text-gray-700 ml-2 flex-1">
                  {selectedIssue.location.colloquial_name || selectedIssue.location.address}
                </CustomText>
              </View>
            )}

            

            {/* Verifications + Time */}
            <View style={styles.metaRow}>
              <View className="flex-row items-center">
                <MaterialIcons name="verified" size={18} color="#256D1B" />
                <CustomText className="text-sm text-gray-700 ml-1">
                  {selectedIssue.verify_count ?? 0}{" "}
                  {(selectedIssue.verify_count ?? 0) === 1 ? "verification" : "verifications"}
                </CustomText>
              </View>
              {selectedIssue.created_at && (
                <View className="flex-row items-center">
                  <MaterialIcons name="schedule" size={15} color="#6b7280" />
                  <CustomText className="text-xs text-gray-500 ml-1">
                    {calculateDaysActive(selectedIssue.created_at)}
                  </CustomText>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={handleUpdateIssue}
                disabled={checkingDistance}
                style={styles.verifyButton}
              >
                {checkingDistance ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialIcons name="camera-alt" size={20} color="#fff" />
                )}
                <CustomText className="text-white font-semibold ml-1">
                  Update Issue
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleViewDetails}
                style={styles.viewDetailsButton}
              >
                <CustomText className="text-white font-semibold text-base">
                  View Full Details
                </CustomText>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </BottomSheetScrollView>
        )}
      </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  indiaBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 148 : 108,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 30,
    borderWidth: 1,
    borderColor: "#256D1B30",
    gap: 5,
  },
  indiaBadgeText: {
    fontFamily: "Nunito-Bold",
    fontSize: 13,
    color: "#256D1B",
  },
  loadingOverlay: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  // Bottom Sheet Styles
  bottomSheetBackground: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetIndicator: {
    backgroundColor: "#d1d5db",
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    padding: 20,
    paddingTop: 10,
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  locationName: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  issueTypeTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voteContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  imageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#f3f4f6",
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  descriptionSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  locationSection: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#256D1B",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 1,
    marginVertical:16,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: "#256D1B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    shadowColor: "#256D1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  verifyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  reportFabContainer: {
    alignItems: "center",
  },
  reportFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#256D1B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reportFabLabelPill: {
    marginTop: 6,
    backgroundColor: "rgba(144, 191, 144, 0.92)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  reportFabLabel: {
    fontSize: 11,
    color: "#1a1a1a",
    fontFamily: "Nunito-Bold",
  },
});
