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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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
        provider={PROVIDER_GOOGLE}
        customMapStyle={customMapStyle}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
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
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            coordinate={{
              latitude: issue.location.lat,
              longitude: issue.location.lng,
            }}
            title={issue.type}
            description={issue.description}
            onPress={() => handleMarkerPress(issue)}
            pinColor="#ef4444"
          />
        ))}
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
          <View style={styles.issueHeader}>
            <View style={styles.issueTypeTag}>
              <CustomText className="text-white text-xs font-bold">
                {selectedIssue.type}
              </CustomText>
            </View>
            <TouchableOpacity onPress={() => setSelectedIssue(null)}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <CustomText className="font-bold mt-2">
            {selectedIssue.description}
          </CustomText>

          {selectedIssue.media_urls && selectedIssue.media_urls.length > 0 && (
            <Image
              source={{ uri: selectedIssue.media_urls[0].url }}
              style={styles.issueImage}
              contentFit="cover"
            />
          )}

          <View style={styles.issueDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="thumb-up" size={16} color="#256D1B" />
              <CustomText className="ml-2 text-sm">
                {selectedIssue.voteCount || selectedIssue.vote_count || 0} votes
              </CustomText>
            </View>

            {selectedIssue.status && (
              <View style={styles.detailRow}>
                <MaterialIcons name="info" size={16} color="#256D1B" />
                <CustomText className="ml-2 text-sm capitalize">
                  Status: {selectedIssue.status}
                </CustomText>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleViewDetails}
            style={styles.detailsButton}
          >
            <CustomText className="text-white font-bold">
              View Details
            </CustomText>
          </TouchableOpacity>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  issueTypeTag: {
    backgroundColor: "#256D1B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  issueImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginVertical: 12,
  },
  issueDetails: {
    marginVertical: 8,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsButton: {
    backgroundColor: "#256D1B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
});
