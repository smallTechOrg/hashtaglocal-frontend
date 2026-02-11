import { Alert } from "react-native";
import { calculateHaversineDistance, getLocationWithPermission } from "@/utils/LocationService";

const DISTANCE_THRESHOLD = 50; // meters

export async function ensureUserIsNearIssue(
  issueLat: number,
  issueLng: number
): Promise<boolean> {
  const result = await getLocationWithPermission();

  if (!result.success) {
    Alert.alert(
      "Location Error",
      result.error?.message || "Unable to get your location. Please enable location services."
    );
    return false;
  }

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
