import { getIssuesByLocation } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import {
  getLocationWithPermission,
  LocationError,
  UserLocation,
} from "@/utils/LocationService";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

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
  };
  type: string;
  description: string;
  status?: string;
  voteCount?: number;
  vote_count?: number;
  createdAt?: string;
  media_urls?: Array<{ url: string }>;
}

export default function MapScreen() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [issues, setIssues] = useState<IssueMarker[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueMarker | null>(null);

  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    setLoadingState("loading");
    setError(null);

    const result = await getLocationWithPermission();

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
      if (issuesData.length > 0) {
        console.log("Sample issue:", JSON.stringify(issuesData[0], null, 2));
      }
      setIssues(issuesData);
    } catch (error) {
      console.error("Failed to load nearby issues:", error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleMarkerPress = (issue: IssueMarker) => {
    setSelectedIssue(issue);
  };

  const handleViewDetails = () => {
    if (selectedIssue) {
      router.push({
        pathname: "/issueDetail",
        params: { issueId: selectedIssue.id },
      });
    }
  };

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
    <View style={styles.container}>
      <MapView
        style={styles.map}
        customMapStyle={customMapStyle}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* User Location Marker */}
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          title="Your Location"
          pinColor="#256D1B"
        />

        {/* Issue Markers */}
        {issues.map((issue) => {
          const isSelected = selectedIssue?.id === issue.id;
          return (
            <Marker
              key={issue.id}
              coordinate={{
                latitude: issue.location.lat,
                longitude: issue.location.lng,
              }}
              onPress={() => handleMarkerPress(issue)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.markerCircle, isSelected && styles.markerCircleSelected]}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading Indicator for Issues */}
      {issuesLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#256D1B" />
        </View>
      )}

      {/* Selected Issue Card */}
      {selectedIssue && (
        <View style={styles.issueCard}>
          {/* Close Button */}
          <TouchableOpacity 
            onPress={() => setSelectedIssue(null)}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.issueTypeTag}>
              <CustomText className="text-white text-xs font-bold uppercase">
                {selectedIssue.type}
              </CustomText>
            </View>
          </View>

          {/* Full-width Image */}
          {selectedIssue.media_urls && selectedIssue.media_urls.length > 0 && (
            <Image
              source={{ uri: selectedIssue.media_urls[0].url }}
              style={styles.cardImage}
              contentFit="cover"
              placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
              priority="high"
              cachePolicy="memory-disk"
              transition={200}
            />
          )}

          {/* Description */}
          {selectedIssue.description && (
            <CustomText className="text-sm text-gray-700 mt-3" numberOfLines={2}>
              {selectedIssue.description}
            </CustomText>
          )}

          {/* Footer with View Details Button */}
          <View style={styles.cardFooter}>
            {selectedIssue.status && (
              <View style={styles.statusBadge}>
                <CustomText className="text-xs text-gray-600 uppercase">
                  {selectedIssue.status}
                </CustomText>
              </View>
            )}
            <TouchableOpacity
              onPress={handleViewDetails}
              style={styles.viewDetailsButton}
            >
              <CustomText className="text-white font-semibold text-sm">
                View Details
              </CustomText>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
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
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerCircleSelected: {
    backgroundColor: "#256D1B",
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  loadingOverlay: {
    position: "absolute",
    top: 16,
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
  issueCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: "50%",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  issueTypeTag: {
    backgroundColor: "#256D1B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  voteContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  statusBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: "#256D1B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
