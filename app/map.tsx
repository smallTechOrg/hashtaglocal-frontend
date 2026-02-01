import { getIssuesByLocation } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import {
    getLocationWithPermission,
    LocationError,
    UserLocation,
} from "@/utils/LocationService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

type LoadingState = "loading" | "success" | "error";

interface IssueMarker {
  id: number;
  location: {
    lat: number;
    lng: number;
  };
  type: string;
  description: string;
}

export default function MapScreen() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>("loading");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [issues, setIssues] = useState<IssueMarker[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

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
      setIssues(issuesData);
    } catch (error) {
      console.error("Failed to load nearby issues:", error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleMarkerPress = (issueId: number) => {
    router.push(`/issueDetail?id=${issueId}`);
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
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
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
              title={issue.type}
              description={issue.description}
              onPress={() => handleMarkerPress(issue.id)}
            >
              <View style={styles.issueMarker}>
                <View style={styles.issueMarkerInner} />
              </View>
            </Marker>
          ))}
        </MapView>
        <View style={styles.locationInfo}>
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
              {issues.length} issue{issues.length !== 1 ? 's' : ''} nearby
            </CustomText>
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
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: "#ff6b6b",
    borderWidth: 0,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  }
});
