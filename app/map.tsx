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
      router.push(`/issueDetail?id=${selectedIssue.id}`);
    }
  };

  const handleCloseIssue = () => {
    setSelectedIssue(null);
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  // Loading state
  if (loadingState === "loading") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#256D1B" />
        <CustomText style={styles.loadingText}>
          Getting your location...
        </CustomText>
      </View>
    );
  }

  // Error state - Permission denied
  if (loadingState === "error" && error?.code === "PERMISSION_DENIED") {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="location-off" size={64} color="#999" />
        <CustomText style={styles.errorTitle}>
          Location Permission Required
        </CustomText>
        <CustomText style={styles.errorMessage}>{error.message}</CustomText>
        <View style={styles.permissionActions}>
          <TouchableOpacity style={styles.button} onPress={loadUserLocation}>
            <MaterialIcons name="refresh" size={20} color="white" style={styles.buttonIcon} />
            <CustomText style={styles.buttonText}>Try Again</CustomText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={openSettings}>
            <MaterialIcons name="settings" size={20} color="#256D1B" style={styles.buttonIcon} />
            <CustomText style={[styles.buttonText, styles.buttonTextSecondary]}>
              Open Settings
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Error state - Other errors
  if (loadingState === "error" && error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
        <CustomText style={styles.errorTitle}>Unable to Load Map</CustomText>
        <CustomText style={styles.errorMessage}>{error.message}</CustomText>
        <TouchableOpacity style={styles.button} onPress={loadUserLocation}>
          <MaterialIcons name="refresh" size={20} color="white" style={styles.buttonIcon} />
          <CustomText style={styles.buttonText}>Try Again</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  // Success state - Show map
  if (loadingState === "success" && userLocation) {
    return (
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_GOOGLE}
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
          showsCompass={true}
          showsScale={true}
        >
          {/* User location marker */}
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            description={`Accuracy: ${userLocation.accuracy?.toFixed(0)}m`}
            pinColor="#256D1B"
          />
          
          {/* Issue markers */}
          {issues.map((issue) => (
            <Marker
              key={issue.id}
              coordinate={{
                latitude: issue.location.lat,
                longitude: issue.location.lng,
              }}
              onPress={() => handleMarkerPress(issue)}
            >
              <View style={[
                styles.issueMarker,
                selectedIssue?.id === issue.id && styles.issueMarkerSelected
              ]} />
            </Marker>
          ))}
        </MapView>
        
        {/* Bottom info card */}
        <View style={styles.locationInfo}>
          {selectedIssue ? (
            // Show selected issue details
            <>
              <View style={styles.issueInfoHeader}>
                <View style={styles.issueTypeContainer}>
                  <CustomText style={styles.issueTypeText}>
                    {selectedIssue.type}
                  </CustomText>
                  {selectedIssue.status && (
                    <View style={styles.statusBadge}>
                      <CustomText style={styles.statusText}>
                        {selectedIssue.status}
                      </CustomText>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={handleCloseIssue} style={styles.closeButton}>
                  <MaterialIcons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>
              
              {selectedIssue.media_urls && selectedIssue.media_urls.length > 0 ? (
                <Image
                  source={{ uri: selectedIssue.media_urls[0].url }}
                  style={styles.issueImage}
                  contentFit="cover"
                  placeholder={require("@/assets/images/partial-react-logo.png")}
                  transition={300}
                />
              ) : (
                <View style={[styles.issueImage, styles.placeholderImage]}>
                  <MaterialIcons name="image" size={48} color="#ccc" />
                </View>
              )}
              
              <CustomText style={styles.issueDescription} numberOfLines={2}>
                {selectedIssue.description}
              </CustomText>
              
              <View style={styles.issueFooter}>
                {(selectedIssue.voteCount !== undefined || selectedIssue.vote_count !== undefined) && (
                  <View style={styles.voteContainer}>
                    <MaterialIcons name="arrow-upward" size={16} color="#256D1B" />
                    <CustomText style={styles.voteText}>
                      {selectedIssue.voteCount || selectedIssue.vote_count || 0} votes
                    </CustomText>
                  </View>
                )}
                <TouchableOpacity style={styles.viewDetailsButton} onPress={handleViewDetails}>
                  <CustomText style={styles.viewDetailsText}>
                    View Details
                  </CustomText>
                  <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Show location info
            <>
              <CustomText style={styles.locationText}>
                📍 {userLocation.latitude.toFixed(6)}°, {userLocation.longitude.toFixed(6)}°
              </CustomText>
              {userLocation.accuracy && (
                <CustomText style={styles.accuracyText}>
                  Accuracy: ±{userLocation.accuracy.toFixed(0)}m
                </CustomText>
              )}
              {issuesLoading && (
                <CustomText style={styles.accuracyText}>
                  Loading nearby issues...
                </CustomText>
              )}
              {!issuesLoading && issues.length > 0 && (
                <CustomText style={styles.accuracyText}>
                  {issues.length} issue{issues.length !== 1 ? 's' : ''} nearby • Tap a marker to view
                </CustomText>
              )}
            </>
          )}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  permissionActions: {
    marginTop: 24,
    gap: 12,
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#256D1B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#256D1B",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#256D1B",
  },
  locationInfo: {
    position: "absolute",
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: "50%",
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  accuracyText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  issueMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ff4444",
    borderWidth: 3,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  issueMarkerSelected: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#256D1B",
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  issueInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  issueTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  issueTypeText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  statusBadge: {
    backgroundColor: "#256D1B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  closeButton: {
    padding: 2,
  },
  issueContent: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  issueImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginVertical: 10,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  descriptionContainer: {
    flex: 1,
  },
  issueDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 10,
  },
  issueFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  voteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  voteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#256D1B",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#256D1B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
});
