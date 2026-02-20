import { getIssuesByLocation } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import { ensureUserIsNearIssue } from "@/utils/DistanceCheck";
import { useIssues } from "@/utils/IssuesContext";
import {
  getFastLocationWithProgressiveWatch,
  LocationError,
  UserLocation,
  subscribeToBestLocation,
} from "@/utils/LocationService";
import { useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Region } from "react-native-maps";

type LoadingState = "loading" | "success" | "error";

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
    meta_data?: {
      city?: string;
      district?: string;
      street?: string;
      name?: string;
      formatted_address?: string;
    };
  };
  type: string;
  description: string;
  status?: string;
  voteCount?: number;
  vote_count?: number;
  createdAt?: string;
  media_urls?: { url: string; url_thumbnail?: string }[];
}

const ISSUE_TYPES = ["All", "Pothole", "Waste", "Footpath", "Pollution", "Hygiene", "Safety", "Other"];

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
  const { user } = useUser();
  const { setIssues: setContextIssues } = useIssues();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [issues, setIssues] = useState<IssueMarker[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueMarker | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [checkingDistance, setCheckingDistance] = useState(false);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['45%', '50%', '90%'], []);

  useEffect(() => {
    if (user) {
      loadUserLocation();
    }
  }, [user]);

  useEffect(() => {
    // Subscribe to progressive updates and update map when accuracy improves
    const unsub = subscribeToBestLocation((loc) => {
      setUserLocation(loc);
      loadNearbyIssues(loc.latitude, loc.longitude);
    });

    return () => unsub();
  }, []);

  // Reload issues when screen comes back into focus (after delete, report, verify, etc.)
  useFocusEffect(
    useCallback(() => {
      if (userLocation) {
        loadNearbyIssues(userLocation.latitude, userLocation.longitude);
      }
    }, [userLocation])
  );

  // Open/close bottom sheet when issue is selected/deselected
  useEffect(() => {
    if (selectedIssue) {
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
      accuracyLevel:  "lowest",
      instantLoad: true,
      accuracyThresholdMeters: 50,
    });

    if (result.success) {
      setUserLocation(result.location);
      setLoadingState("success");
      // Load issues for this location
      loadNearbyIssues(result.location.latitude, result.location.longitude);
    } else {
      setError(result.error);
      setLoadingState("error");
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
      // Prefetch thumbnails so they're cached before a marker is tapped
      issuesData.forEach((issue: IssueMarker) => {
        const thumb = issue.media_urls?.[0]?.url_thumbnail;
        if (thumb) Image.prefetch(thumb);
      });
    } catch (error) {
      console.error("Failed to load nearby issues:", error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleMarkerPress = useCallback((issue: IssueMarker) => {
    setSelectedIssue(issue);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setSelectedIssue(null);
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
      console.error("Distance check failed", e);      
    } finally {
      setCheckingDistance(false);
    }
  }, [selectedIssue, router, checkingDistance]);

  // Filter issues based on selected filter
  const filteredIssues = useMemo(() => {
    if (selectedFilter === "All") return issues;
    return issues.filter(issue => 
      issue.type.toLowerCase() === selectedFilter.toLowerCase()
    );
  }, [issues, selectedFilter]);

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

  // Only render markers that are in the current viewport
  const visibleMarkers = useMemo(() => {
    return filteredIssues.filter(issue => 
      isMarkerInViewport(issue.location.lat, issue.location.lng)
    );
  }, [filteredIssues, isMarkerInViewport]);

  const handleMapRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  // Handle filter change and adjust map zoom
  const handleFilterChange = useCallback((filter: string) => {
    setSelectedFilter(filter);
    setSelectedIssue(null); // Close any open issue card

    if (mapRef.current && filteredIssues.length > 0) {
      const issuesToShow = filter === "All" ? issues : issues.filter(issue => 
        issue.type.toLowerCase() === filter.toLowerCase()
      );

      if (issuesToShow.length === 0) return;

      // Calculate bounds for all filtered markers
      let minLat = issuesToShow[0].location.lat;
      let maxLat = issuesToShow[0].location.lat;
      let minLng = issuesToShow[0].location.lng;
      let maxLng = issuesToShow[0].location.lng;

      issuesToShow.forEach(issue => {
        minLat = Math.min(minLat, issue.location.lat);
        maxLat = Math.max(maxLat, issue.location.lat);
        minLng = Math.min(minLng, issue.location.lng);
        maxLng = Math.max(maxLng, issue.location.lng);
      });

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const latDelta = Math.max((maxLat - minLat) * 1.5, 0.005);
      const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.005);

      const region: Region = {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };

      mapRef.current.animateToRegion(region, 500);
    }
  }, [issues, filteredIssues]);

  // Memoize initial region to prevent re-renders
  const initialRegion = useMemo(() => ({
    latitude: userLocation?.latitude || 0,
    longitude: userLocation?.longitude || 0,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  }), [userLocation?.latitude, userLocation?.longitude]);

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

  if (!userLocation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#256D1B" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {ISSUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                selectedFilter === type && styles.filterChipActive
              ]}
              onPress={() => handleFilterChange(type)}
            >
              <CustomText 
                className={selectedFilter === type ? "text-white font-semibold" : "text-gray-700"}
              >
                {type}
              </CustomText>
              {type !== "All" && (
                <View style={styles.filterBadge}>
                  <CustomText className="text-xs text-white font-bold">
                    {issues.filter(i => i.type.toLowerCase() === type.toLowerCase()).length}
                  </CustomText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
        {/* Viewport-based Issue Markers */}
        {visibleMarkers.map((issue) => (
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
      </MapView>

      {/* Loading Indicator for Issues */}
      {issuesLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#256D1B" />
        </View>
      )}

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
        {selectedIssue && (
          <BottomSheetScrollView 
            contentContainerStyle={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
                {(selectedIssue.location.meta_data?.city || selectedIssue.location.meta_data?.district) && (
                  <View style={styles.locationName}>
                    <MaterialIcons name="place" size={14} color="#6b7280" />
                    <CustomText className="text-xs text-gray-600 ml-1">
                      {selectedIssue.location.meta_data?.city || selectedIssue.location.meta_data?.district}
                    </CustomText>
                  </View>
                )}
              </View>

              {/* Created Date Row */}
              {selectedIssue.createdAt && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="schedule" size={16} color="#6b7280" />
                  <CustomText className="text-xs text-gray-600 ml-2">
                    Reported {new Date(selectedIssue.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </CustomText>
                </View>
              )}
            </View>

            {/* Image Section */}
            {selectedIssue.media_urls && selectedIssue.media_urls.length > 0 ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: selectedIssue.media_urls[0].url }}
                  placeholder={selectedIssue.media_urls[0].url_thumbnail ? { uri: selectedIssue.media_urls[0].url_thumbnail } : undefined}
                  placeholderContentFit="cover"
                  style={styles.previewImage}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                />
              </View>
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: getIssueColor(selectedIssue.type) + '20' }]}>
                <MaterialIcons
                  name={selectedIssue.type.toLowerCase() === 'pothole' ? 'construction' :
                        selectedIssue.type.toLowerCase() === 'waste' ? 'delete' :
                        selectedIssue.type.toLowerCase() === 'footpath' ? 'directions-walk' :
                        selectedIssue.type.toLowerCase() === 'pollution' ? 'cloud' :
                        selectedIssue.type.toLowerCase() === 'hygiene' ? 'sanitizer' :
                        selectedIssue.type.toLowerCase() === 'safety' ? 'warning' : 'report-problem'} 
                  size={64} 
                  color={getIssueColor(selectedIssue.type)} 
                />
                <CustomText className="text-gray-500 mt-2">No image available</CustomText>
              </View>
            )}

            {/* Description Section */}
            {selectedIssue.description && (
              <View style={styles.descriptionSection}>
                <CustomText className="text-xs text-gray-500 font-semibold mb-1">DESCRIPTION</CustomText>
                <CustomText className="text-sm text-gray-700 leading-5">
                  {selectedIssue.description}
                </CustomText>
              </View>
            )}

            {/* Location Info with Coordinates */}
            <View style={styles.locationSection}>
              <CustomText className="text-xs text-gray-500 font-semibold mb-1">LOCATION</CustomText>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="location-on" size={16} color="#6b7280" />
                <CustomText className="text-sm text-gray-700 ml-2 flex-1">
                  {selectedIssue.location.lat.toFixed(6)}, {selectedIssue.location.lng.toFixed(6)}
                </CustomText>
              </View>
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
                <CustomText className="text-white font-semibold p">
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
  filterContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "white",
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#256D1B",
  },
  filterBadge: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  map: {
    width: "100%",
    height: "100%",
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
    gap: 2,
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
});
