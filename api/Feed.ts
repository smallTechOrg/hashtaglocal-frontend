import { CreateFeedPostRequest, FeedListResponse } from "@/models/Feed";
import { apiPost, apiRequest } from "@/utils/apiClient";
import { getAccessToken } from "@/utils/tokenStorage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const API_ENDPOINTS = {
  FEED: "/api/v1/feed",
  LOCALITIES: "/api/localities/polygons",
  LOCALITY_BY_COORDS: "/api/localities/hashtag",
} as const;

/** Resolve the hashtag for a coordinate (point-in-polygon → nearest). Returns null on miss. */
export async function fetchHashtagByCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await apiRequest(
      `${API_BASE_URL}${API_ENDPOINTS.LOCALITY_BY_COORDS}?lat=${lat}&lng=${lng}`,
      { method: "GET", skipAuth: true },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const tag: string | undefined = json?.data?.hashtag;
    return tag ? tag.replace(/^#/, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

export interface LocalityOption {
  hashtag: string; // normalized without leading '#'
  name: string;
  center?: { lat: number; lng: number }; // centroid of the boundary polygon
}

function polygonCentroid(coordinates: number[][][]): { lat: number; lng: number } | undefined {
  const ring = coordinates?.[0];
  if (!ring || ring.length === 0) return undefined;
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

/** Fetch the list of localities for the hashtag switcher. Public; returns [] on failure so the
 * switcher falls back to #india + the user's home tag. */
export async function fetchLocalities(): Promise<LocalityOption[]> {
  try {
    const res = await apiRequest(`${API_BASE_URL}${API_ENDPOINTS.LOCALITIES}`, {
      method: "GET",
      skipAuth: true,
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { hashtag?: string; name?: string; geoBoundary?: { coordinates?: number[][][] } }[];
    return (Array.isArray(rows) ? rows : [])
      .filter((r) => r.hashtag)
      .map((r) => ({
        hashtag: r.hashtag!.replace(/^#/, "").toLowerCase(),
        name: r.name ?? r.hashtag!,
        center: r.geoBoundary?.coordinates ? polygonCentroid(r.geoBoundary.coordinates) : undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch a hashtag's feed timeline (keyset-paginated, newest-first). Reads are PUBLIC, so we never
 * force login here (skipAuth) — but we still attach the token when one exists so the backend fills
 * viewer_context and includes the viewer's own under-review posts.
 */
export async function fetchFeedTimeline(
  hashtag: string,
  opts: { cursor?: string; limit?: number; aggregate?: boolean } = {},
): Promise<FeedListResponse> {
  const params = new URLSearchParams({ hashtag });
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.aggregate) params.set("aggregate", "true");

  const token = await getAccessToken();
  const res = await apiRequest(`${API_BASE_URL}${API_ENDPOINTS.FEED}?${params.toString()}`, {
    method: "GET",
    skipAuth: true, // public read — don't bounce anonymous users to /login
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Feed request failed (${res.status})`);
  }
  return (await res.json()) as FeedListResponse;
}

/**
 * Create a feed post. Requires auth (apiPost forces login if no valid token). Regular users send
 * lat/lng; the backend resolves the locality.
 */
export async function createFeedPost(body: CreateFeedPostRequest): Promise<void> {
  const res = await apiPost(`${API_BASE_URL}${API_ENDPOINTS.FEED}`, body);
  if (!res.ok) {
    let message = `Could not post (${res.status}).`;
    try {
      const err = await res.json();
      message = err?.error?.message ?? message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
}
