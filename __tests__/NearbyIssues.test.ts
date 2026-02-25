import { IssueMarker } from "@/utils/IssuesContext";
import {
    formatDistance,
    getNearbyIssues,
    NEARBY_RADIUS_METERS,
} from "@/utils/NearbyIssues";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Create a minimal IssueMarker at the given coordinates. */
function makeIssue(
  id: number,
  lat: number,
  lng: number,
  overrides: Partial<IssueMarker> = {}
): IssueMarker {
  return {
    id,
    type: "pothole",
    description: `Issue ${id}`,
    created_at: "2025-01-01T00:00:00Z",
    location: { lat, lng },
    ...overrides,
  };
}

/**
 * Latitude offset for a given north-south distance in metres.
 * 1° latitude ≈ 111 320 m  (sufficiently accurate for test offsets).
 */
const metresToLatDeg = (m: number) => m / 111_320;

// Base coordinates (Bangalore, India)
const BASE_LAT = 12.9716;
const BASE_LNG = 77.5946;

// ─────────────────────────────────────────────────────────────
// getNearbyIssues
// ─────────────────────────────────────────────────────────────

describe("getNearbyIssues", () => {
  it("returns empty array when no issues are provided", () => {
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, []);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when all issues are beyond the radius", () => {
    const farIssues = [
      makeIssue(1, BASE_LAT + metresToLatDeg(150), BASE_LNG),
      makeIssue(2, BASE_LAT + metresToLatDeg(500), BASE_LNG),
    ];
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, farIssues);
    expect(result).toHaveLength(0);
  });

  it("includes issues clearly within the default 80 m radius", () => {
    const nearby = [
      makeIssue(1, BASE_LAT + metresToLatDeg(20), BASE_LNG),  // ~20 m
      makeIssue(2, BASE_LAT + metresToLatDeg(60), BASE_LNG),  // ~60 m
    ];
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, nearby);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual([1, 2]); // sorted ascending
  });

  it("excludes issues just beyond the default 80 m radius", () => {
    const farIssues = [
      makeIssue(1, BASE_LAT + metresToLatDeg(90), BASE_LNG),  // ~90 m
      makeIssue(2, BASE_LAT + metresToLatDeg(200), BASE_LNG), // ~200 m
    ];
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, farIssues);
    expect(result).toHaveLength(0);
  });

  it("mixes in-range and out-of-range issues correctly", () => {
    const issues = [
      makeIssue(1, BASE_LAT + metresToLatDeg(10), BASE_LNG),  // ~10 m  ✓
      makeIssue(2, BASE_LAT + metresToLatDeg(50), BASE_LNG),  // ~50 m  ✓
      makeIssue(3, BASE_LAT + metresToLatDeg(100), BASE_LNG), // ~100 m ✗
      makeIssue(4, BASE_LAT + metresToLatDeg(300), BASE_LNG), // ~300 m ✗
    ];
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, issues);
    expect(result).toHaveLength(2);
    const ids = result.map((i) => i.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });

  it("sorts results by ascending distance", () => {
    const issues = [
      makeIssue(10, BASE_LAT + metresToLatDeg(70), BASE_LNG), // ~70 m
      makeIssue(20, BASE_LAT + metresToLatDeg(10), BASE_LNG), // ~10 m
      makeIssue(30, BASE_LAT + metresToLatDeg(40), BASE_LNG), // ~40 m
    ];
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, issues);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(20); // closest
    expect(result[1].id).toBe(30);
    expect(result[2].id).toBe(10); // farthest in range
  });

  it("attaches a numeric distanceMeters property to each result", () => {
    const issues = [makeIssue(1, BASE_LAT + metresToLatDeg(30), BASE_LNG)];
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, issues);
    expect(typeof result[0].distanceMeters).toBe("number");
    expect(result[0].distanceMeters).toBeGreaterThan(0);
    expect(result[0].distanceMeters).toBeLessThanOrEqual(NEARBY_RADIUS_METERS);
  });

  it("respects a custom radius argument", () => {
    const issues = [
      makeIssue(1, BASE_LAT + metresToLatDeg(30), BASE_LNG),  // 30 m
      makeIssue(2, BASE_LAT + metresToLatDeg(60), BASE_LNG),  // 60 m
      makeIssue(3, BASE_LAT + metresToLatDeg(100), BASE_LNG), // 100 m
    ];

    // Only first should fit in 40 m radius
    const result40 = getNearbyIssues(BASE_LAT, BASE_LNG, issues, 40);
    expect(result40).toHaveLength(1);
    expect(result40[0].id).toBe(1);

    // First two should fit in 70 m radius
    const result70 = getNearbyIssues(BASE_LAT, BASE_LNG, issues, 70);
    expect(result70).toHaveLength(2);
  });

  it("preserves all original IssueMarker fields in results", () => {
    const issue = makeIssue(99, BASE_LAT, BASE_LNG, {
      type: "waste",
      status: "OPEN",
      verify_count: 5,
    });
    const [result] = getNearbyIssues(BASE_LAT, BASE_LNG, [issue]);
    expect(result.type).toBe("waste");
    expect(result.status).toBe("OPEN");
    expect(result.verify_count).toBe(5);
    expect(result.id).toBe(99);
  });

  it("includes an issue at the exact same coordinates (0 m distance)", () => {
    const issue = makeIssue(1, BASE_LAT, BASE_LNG);
    const result = getNearbyIssues(BASE_LAT, BASE_LNG, [issue]);
    expect(result).toHaveLength(1);
    expect(result[0].distanceMeters).toBeCloseTo(0, 1);
  });
});

// ─────────────────────────────────────────────────────────────
// formatDistance
// ─────────────────────────────────────────────────────────────

describe("formatDistance", () => {
  it("formats metres for distances below 1 km", () => {
    expect(formatDistance(0)).toBe("~0 m");
    expect(formatDistance(23)).toBe("~23 m");
    expect(formatDistance(79.6)).toBe("~80 m");
    expect(formatDistance(999)).toBe("~999 m");
  });

  it("formats kilometres for distances >= 1 000 m", () => {
    expect(formatDistance(1000)).toBe("~1.0 km");
    expect(formatDistance(1500)).toBe("~1.5 km");
    expect(formatDistance(2340)).toBe("~2.3 km");
  });
});
