import { IssueMarker } from "./IssuesContext";
import { calculateHaversineDistance } from "./LocationService";

/** Radius used for the "nearby issues" pre-check before reporting. */
export const NEARBY_RADIUS_METERS = 100;

export interface IssueWithDistance extends IssueMarker {
  distanceMeters: number;
}

/**
 * Filter `issues` to those within `radiusMeters` of the given point,
 * sorted by ascending distance.
 *
 * Uses the Haversine formula via `calculateHaversineDistance`.
 */
export function getNearbyIssues(
  userLat: number,
  userLng: number,
  issues: IssueMarker[],
  radiusMeters: number = NEARBY_RADIUS_METERS
): IssueWithDistance[] {
  return issues
    .map((issue) => ({
      ...issue,
      distanceMeters: calculateHaversineDistance(
        userLat,
        userLng,
        issue.location.lat,
        issue.location.lng
      ),
    }))
    .filter((issue) => issue.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/** Human-readable distance string, e.g. "~23 m" or "~1.1 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `~${Math.round(meters)} m`;
  }
  return `~${(meters / 1000).toFixed(1)} km`;
}
