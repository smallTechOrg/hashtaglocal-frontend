import { Alert } from "react-native";
import { calculateHaversineDistance, getFastLocationWithProgressiveWatch } from "@/utils/LocationService";

const DISTANCE_THRESHOLD = 100; // meters

export async function ensureUserIsNearIssue(
  issueLat: number,
  issueLng: number
): Promise<boolean> {
  const result = await getFastLocationWithProgressiveWatch({
    instantLoad: false,
    accuracyThresholdMeters: 30,
    timeoutMs: 15000,
  });

  if (!result.success) {
    Alert.alert(
      "Location Error",
      result.error?.message || "Unable to get your location. Please enable location or try again."
    );
    return false;
  }

  console.log("User location:", result.location);
  console.log("Issue location:", { latitude: issueLat, longitude: issueLng });

  const distanceInMeters = calculateHaversineDistance(
    result.location.latitude,
    result.location.longitude,
    issueLat,
    issueLng
  );

  if (distanceInMeters > DISTANCE_THRESHOLD) {
    const distanceInKm = (distanceInMeters / 1000).toFixed(2);
    Alert.alert(
      "Too Far from Issue",
      `You are ${distanceInKm} km away from this issue. Please move closer to update it.`
    );
    return false;
  }

  return true;
}
