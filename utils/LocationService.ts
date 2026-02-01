import * as Location from "expo-location";

/**
 * LocationService - Clean, testable utility for location tracking
 * 
 * Design principles:
 * - Single responsibility: Location fetching and permission handling
 * - Testable: Pure functions with clear inputs/outputs
 * - Error handling: Explicit error states
 * - Type safety: Full TypeScript support
 */

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface LocationError {
  code: "PERMISSION_DENIED" | "LOCATION_UNAVAILABLE" | "TIMEOUT" | "UNKNOWN";
  message: string;
}

export type LocationResult =
  | { success: true; location: UserLocation }
  | { success: false; error: LocationError };

/**
 * Request location permissions from the user
 * @returns Permission status result
 */
export async function requestLocationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();
    return {
      granted: status === "granted",
      canAskAgain,
    };
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return {
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Check current location permission status without requesting
 * @returns Current permission status
 */
export async function checkLocationPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const { status, canAskAgain } =
      await Location.getForegroundPermissionsAsync();
    return {
      granted: status === "granted",
      canAskAgain,
    };
  } catch (error) {
    console.error("Error checking location permission:", error);
    return {
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Get the user's current location (one-time fetch)
 * @param timeoutMs - Maximum time to wait for location (default: 10000ms)
 * @returns LocationResult with location data or error
 */
export async function getCurrentLocation(
  timeoutMs: number = 10000
): Promise<LocationResult> {
  try {
    // Check permission first
    const { granted } = await checkLocationPermission();
    if (!granted) {
      return {
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "Location permission not granted",
        },
      };
    }

    // Get current position with timeout
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Location request timed out")),
        timeoutMs
      )
    );

    const position = await Promise.race([locationPromise, timeoutPromise]);

    return {
      success: true,
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      },
    };
  } catch (error: any) {
    console.error("Error getting current location:", error);

    // Determine error type
    if (error.message?.includes("timeout")) {
      return {
        success: false,
        error: {
          code: "TIMEOUT",
          message: "Location request timed out. Please try again.",
        },
      };
    }

    return {
      success: false,
      error: {
        code: "LOCATION_UNAVAILABLE",
        message:
          "Unable to get your location. Please ensure GPS is enabled.",
      },
    };
  }
}

/**
 * Get location with permission request if needed
 * Convenience function that handles the full flow
 * @returns LocationResult with location data or error
 */
export async function getLocationWithPermission(): Promise<LocationResult> {
  const { granted } = await checkLocationPermission();

  if (!granted) {
    const permissionResult = await requestLocationPermission();
    if (!permissionResult.granted) {
      return {
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "Location permission is required to show your position on the map",
        },
      };
    }
  }

  return getCurrentLocation();
}
