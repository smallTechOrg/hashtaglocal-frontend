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
 * Calculate the great-circle distance between two points on Earth using the Haversine formula
 * @param lat1 - Latitude of point 1 (in degrees)
 * @param lon1 - Longitude of point 1 (in degrees)
 * @param lat2 - Latitude of point 2 (in degrees)
 * @param lon2 - Longitude of point 2 (in degrees)
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters

  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// -----------------------
// Progressive watch API
// -----------------------

let _watcher: Location.LocationSubscription | null = null;
let _bestLocation: UserLocation | null = null;
let _lastBestLocationTime: number = 0;
const _subscribers = new Set<(loc: UserLocation) => void>();
let _watchTimeout: ReturnType<typeof setTimeout> | null = null;

export function getBestKnownLocation(): UserLocation | null {
  return _bestLocation;
}

export function subscribeToBestLocation(
  cb: (loc: UserLocation) => void,
  callImmediately: boolean = true
): () => void {
  _subscribers.add(cb);
  if (callImmediately && _bestLocation) cb(_bestLocation);
  return () => _subscribers.delete(cb);
}

export async function startProgressiveWatch(options?: {
  accuracyTargetMeters?: number;
  timeoutMs?: number;
  timeIntervalMs?: number;
  distanceInterval?: number;
}): Promise<{ started: boolean; error?: string }> {
  const {
    accuracyTargetMeters = 10,
    timeoutMs = 40000,
    timeIntervalMs = 1000,
    distanceInterval = 0,
  } = options || {};

  try {
    const { granted } = await checkLocationPermission();
    if (!granted) {
      const permissionResult = await requestLocationPermission();
      if (!permissionResult.granted) {
        return { started: false, error: "permission_denied" };
      }
    }

    if (_watcher) return { started: true };

    _watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: timeIntervalMs,
        distanceInterval,
      },
      (position) => {
        const loc: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          timestamp: position.timestamp,
        };

        const improved =
          !_bestLocation ||
          (loc.accuracy !== null &&
            (_bestLocation.accuracy === null || loc.accuracy < _bestLocation.accuracy));

        if (improved) {
          _bestLocation = loc;
          _lastBestLocationTime = Date.now();
          for (const s of Array.from(_subscribers)) {
            try {
              s(loc);
            } catch (e) {
              // swallow subscriber errors
            }
          }
          console.log("New best location:", loc);
        }

        if (loc.accuracy !== null && loc.accuracy <= accuracyTargetMeters) {
          // satisfied target; stop watcher
          stopProgressiveWatch();
        }
      }
    );

    if (_watchTimeout) clearTimeout(_watchTimeout);
    _watchTimeout = setTimeout(() => {
      stopProgressiveWatch();
    }, timeoutMs);

    return { started: true };
  } catch (error: any) {
    return { started: false, error: String(error?.message ?? error) };
  }
}

export function stopProgressiveWatch(): void {
  if (_watchTimeout) {
    clearTimeout(_watchTimeout);
    _watchTimeout = null;
  }

  if (_watcher) {
    try {
      _watcher.remove();
    } catch (e) {
      // ignore
    }
    _watcher = null;
  }
}

// -----------------------
// Unified Progressive Location API
// -----------------------

export interface GetLocationOptions {
  accuracyLevel?: "low" | "balanced" | "high" | "highest" | "lowest";
  accuracyThresholdMeters?: number;
  instantLoad?: boolean;
  timeoutMs?: number;
}

export type GetLocationWithProgressiveResult = LocationResult & {
  improved?: boolean;
  source?: "cache" | "gps" | "watch";
};

/**
 * Unified function for location fetching with progressive accuracy improvement
 *
 * Behavior:
 * 1. Checks if cached best location is fresh (<30s) and meets accuracy threshold → returns immediately
 * 2. If no suitable cached location:
 *    - Starts watchPositionAsync with specified accuracy level
 *    - If instantLoad=true: returns first location, continues watching in background
 *    - If instantLoad=false: blocks and waits for target accuracy or timeout
 *
 * @param options Configuration object
 * @returns Promise with location result, source, and improvement flag
 */
export async function getFastLocationWithProgressiveWatch(
  options?: GetLocationOptions
): Promise<GetLocationWithProgressiveResult> {
  const {
    accuracyLevel = "high",
    accuracyThresholdMeters = 10,
    instantLoad = true,
    timeoutMs = 30000,
  } = options || {};

  try {
    // Step 1: Check permissions
    const { granted } = await checkLocationPermission();
    if (!granted) {
      const permissionResult = await requestLocationPermission();
      if (!permissionResult.granted) {
        return {
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "Location permission is required",
          },
        };
      }
    }

    // Step 2: Check if cached best location is fresh and meets threshold
    const now = Date.now();
    const isCacheFresh = now - _lastBestLocationTime < 40000; // 40 seconds

    if (
      _bestLocation &&
      isCacheFresh &&
      (_bestLocation.accuracy === null || _bestLocation.accuracy <= accuracyThresholdMeters)
    ) {
      return {
        success: true,
        location: _bestLocation,
        improved: false,
        source: "cache",
      };
    }

    // Step 3: Determine GPS accuracy based on level
    const accuracyMap: Record<string, number> = {
      lowest: Location.Accuracy.Lowest,
      low: Location.Accuracy.Low,
      balanced: Location.Accuracy.Balanced,
      high: Location.Accuracy.High,
      highest: Location.Accuracy.Highest,
    };

    const gpsAccuracy = accuracyMap[accuracyLevel] || Location.Accuracy.Highest;

    // Step 4a: Instant Load mode
    if (instantLoad) {
      // Get first location quickly
      try {
        const quick = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: gpsAccuracy,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000)
          ),
        ]);

        const firstLoc: UserLocation = {
          latitude: (quick as any).coords.latitude,
          longitude: (quick as any).coords.longitude,
          accuracy: (quick as any).coords.accuracy ?? null,
          timestamp: (quick as any).timestamp,
        };

        // Update best location if this is better
        if (
          !_bestLocation ||
          (firstLoc.accuracy !== null &&
            (_bestLocation.accuracy === null || firstLoc.accuracy < _bestLocation.accuracy))
        ) {
          _bestLocation = firstLoc;
          _lastBestLocationTime = Date.now();
        }

        // Start background watcher for improvements
        if (!_watcher) {
          startProgressiveWatch({
            accuracyTargetMeters: accuracyThresholdMeters,
            timeoutMs,
          }).catch(() => {});
        }

        return {
          success: true,
          location: firstLoc,
          improved: false,
          source: "gps",
        };
      } catch (e) {
        // Fallback to watching
        console.debug("Quick location fetch failed, using watchPosition:", e);
      }
    }

    // Step 4b: Blocking Wait mode OR Instant Load fallback
    return new Promise((resolve) => {
      let resolved = false;
      let bestFoundLocation: UserLocation | null = null;
      let tempWatcher: Location.LocationSubscription | null = null;

      const tempUnwatchLocation = () => {
        if (tempWatcher) {
          try {
            tempWatcher.remove();
          } catch (e) {
            // ignore
          }
        }
      };

      const watchTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (bestFoundLocation) {
            resolve({
              success: true,
              location: bestFoundLocation,
              improved: false,
              source: "watch",
            });
          } else {
            resolve({
              success: false,
              error: {
                code: "TIMEOUT",
                message: `Could not obtain location with accuracy < ${accuracyThresholdMeters}m within ${timeoutMs}ms`,
              },
            });
          }
          tempUnwatchLocation();
        }
      }, timeoutMs);

      (async () => {
        try {
          tempWatcher = await Location.watchPositionAsync(
            {
              accuracy: gpsAccuracy,
              timeInterval: 1000,
              distanceInterval: 0,
            },
            (position) => {
              const loc: UserLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy ?? null,
                timestamp: position.timestamp,
              };

              // Track best location found so far
              if (
                !bestFoundLocation ||
                (loc.accuracy !== null &&
                  (bestFoundLocation.accuracy === null || loc.accuracy < bestFoundLocation.accuracy))
              ) {
                bestFoundLocation = loc;

                // Update global best location
                if (
                  !_bestLocation ||
                  (loc.accuracy !== null &&
                    (_bestLocation.accuracy === null || loc.accuracy < _bestLocation.accuracy))
                ) {
                  _bestLocation = loc;
                  _lastBestLocationTime = Date.now();
                }
              }

              // If target accuracy reached, resolve immediately
              if (instantLoad) {
                if (loc.accuracy === null || loc.accuracy <= accuracyThresholdMeters) {
                  if (!resolved) {
                    resolved = true;
                    tempUnwatchLocation();
                    clearTimeout(watchTimer);
                    resolve({
                      success: true,
                      location: bestFoundLocation!,
                      improved: true,
                      source: "watch",
                    });
                  }
                }
              } else {
                // Blocking mode
                if (loc.accuracy !== null && loc.accuracy <= accuracyThresholdMeters) {
                  if (!resolved) {
                    resolved = true;
                    tempUnwatchLocation();
                    clearTimeout(watchTimer);
                    resolve({
                      success: true,
                      location: bestFoundLocation!,
                      improved: true,
                      source: "watch",
                    });
                  }
                }
              }
            }
          );
        } catch (error: any) {
          if (!resolved) {
            resolved = true;
            clearTimeout(watchTimer);
            resolve({
              success: false,
              error: {
                code: "LOCATION_UNAVAILABLE",
                message: String(error?.message ?? error),
              },
            });
          }
        }
      })();
    });
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: String(error?.message ?? error),
      },
    };
  }
}
