import { calculateHaversineDistance, getBestKnownLocation, getLocationWithPermission } from "@/utils/LocationService";
import { Alert } from "react-native";

const DISTANCE_THRESHOLD = 50; // meters

export async function ensureUserIsNearIssue(
  issueLat: number,
  issueLng: number
): Promise<boolean> {
  const best = getBestKnownLocation();
  let lat: number | null = null;
  let lng: number | null = null;

  if (best) {
    lat = best.latitude;
    lng = best.longitude;
  } else {
    const result = await getLocationWithPermission();
    if (!result.success) {
      Alert.alert(
        "Location Error",
        result.error?.message || "Unable to get your location. Please enable location or try again."
      );
      return false;
    }
    lat = result.location.latitude;
    lng = result.location.longitude;
  }

  const distanceInMeters = calculateHaversineDistance(
    lat as number,
    lng as number,
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
