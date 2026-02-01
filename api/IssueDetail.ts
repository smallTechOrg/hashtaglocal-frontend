import { APIResponse } from "@/models/APIResponse";

/**
 * Fetches issue data from the backend API
 * @param issueId - The ID of the issue to fetch
 * @returns Promise resolving to the API response
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_ENDPOINTS = {
  ISSUE: (id: number) => `/api/v1/issue/${id}`,
  REPORT_ISSUE: "/api/v1/issue",
  UPLOAD_URL: "/api/v1/media/upload-url",
  ISSUES_BY_LOCATION: "/api/v2/issues",
} as const;

export interface SignedUrlResponse {
  data: {
    media_url: {
      signed_url: string;
      path: string;
    };
  };
}

export interface LocationMetaData {
  city: string | null;
  district: string | null;
  street_number: string | null;
  street: string | null;
  region: string | null;
  sub_region: string | null;
  country: string | null;
  postal_code: string | null;
  name: string | null;
  iso_country_code: string | null;
  timezone: string | null;
  formatted_address: string | null;
}

export interface ReportIssuePayload {
  issue: {
    type: string;
    location: {
      lat: string;
      lng: string;
      meta_data: LocationMetaData;
    };
    media_urls: {
      location: {
        lat: string;
        lng: string;
        meta_data: LocationMetaData;
      };
      type: string;
      url: string;
    }[];
    description: string;
  };
}

export interface ReportIssueResponse {
  data: {
    issue_id: number;
  };
}

const TIME_OUT = 10000; // 10 second timeout
export async function fetchIssue(issueId: number): Promise<APIResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.ISSUE(issueId)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] HTTP error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data: APIResponse = await response.json();
    console.log(`[API] Successfully fetched issue ${issueId}`);
    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[API] Request timeout after 10 seconds");
      throw new Error(
        "Request timeout. Please check if the backend is running and accessible.",
      );
    }

    if (error.message?.includes("Network request failed")) {
      console.error("[API] Network request failed. Possible causes:");
      console.error("  1. Backend server is not running");
      console.error("  2. Incorrect API URL (check config/api.ts)");
      console.error("  3. CORS issues (if testing on web)");
      console.error("  4. Network connectivity issues");
      console.error(`  Current URL: ${url}`);

      throw new Error(
        `Network request failed. Unable to connect to ${API_BASE_URL}. ` +
          `Please ensure your backend is running and the URL is correct. ` +
          `Check the console for more details.`,
      );
    }

    console.error("[API] Error fetching issue:", error);
    throw error;
  }
}

export async function reportIssue(
  payload: ReportIssuePayload,
): Promise<ReportIssueResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.REPORT_ISSUE}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] HTTP error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();

    if (!responseText) {
      console.error("[API] Empty response body from server");
      throw new Error("Server returned an empty response");
    }

    const data: ReportIssueResponse = JSON.parse(responseText);
    console.log(`[API] Successfully reported issue, ID: ${data.data.issue_id}`);
    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[API] Request timeout after 10 seconds");
      throw new Error(
        "Request timeout. Please check if the backend is running and accessible.",
      );
    }

    if (error.message?.includes("Network request failed")) {
      console.error("[API] Network request failed while creating issue");
      throw new Error(
        `Network request failed. Unable to connect to ${API_BASE_URL}. ` +
          `Please ensure your backend is running and the URL is correct.`,
      );
    }

    console.error("[API] Error creating issue:", error);
    console.log(error.stack, "error stack");
    throw error;
  }
}

/**
 * Gets a signed URL for uploading media to GCP
 * @param contentType - MIME type of the file (e.g., 'image/jpeg', 'image/png')
 * @returns Promise resolving to signed URL and GCS path
 */
export async function getSignedUploadUrl(
  contentType: string,
): Promise<SignedUrlResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_URL}?content_type=${encodeURIComponent(contentType)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] HTTP error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data: SignedUrlResponse = await response.json();
    console.log("[API] Successfully obtained signed URL");
    return data;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[API] Request timeout while getting signed URL");
      throw new Error(
        "Request timeout. Please check if the backend is running and accessible.",
      );
    }

    if (error.message?.includes("Network request failed")) {
      console.error("[API] Network request failed while getting signed URL");
      throw new Error(
        `Network request failed. Unable to connect to ${API_BASE_URL}. ` +
          `Please ensure your backend is running and the URL is correct.`,
      );
    }

    console.error("[API] Error getting signed URL:", error);
    throw error;
  }
}

/**
 * Uploads an image to GCP using a signed URL
 * @param signedUrl - The pre-signed URL from getSignedUploadUrl
 * @param imageUri - Local file URI of the image to upload
 * @param contentType - MIME type of the image
 * @returns Promise resolving when upload is complete
 */
export async function uploadImageToGCP(
  signedUrl: string,
  imageUri: string,
  contentType: string,
): Promise<void> {
  try {
    // Fetch the image as a blob from local URI
    const imageResponse = await fetch(imageUri);
    const blob = await imageResponse.blob();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for uploads

    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: blob,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GCP] Upload error ${response.status}:`, errorText);
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    console.log("[GCP] Image uploaded successfully");
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[GCP] Upload timeout after 60 seconds");
      throw new Error(
        "Upload timeout. Please try again with a stable connection.",
      );
    }

    console.error("[GCP] Error uploading image:", error);
    throw error;
  }
}

/**
 * Complete flow: Get signed URL and upload image to GCP
 * @param imageUri - Local file URI of the image
 * @param contentType - MIME type (defaults to 'image/jpeg')
 * @returns Promise resolving to the GCS path of the uploaded image
 */
export async function uploadImage(
  imageUri: string,
  contentType: string = "image/jpeg",
): Promise<string> {
  // Step 1: Get signed URL from backend
  const { data } = await getSignedUploadUrl(contentType);

  // Step 2: Upload image to GCP using signed URL
  await uploadImageToGCP(data.media_url.signed_url, imageUri, contentType);

  // Step 3: Return the GCS path for storage
  return data.media_url.path;
}

/**
 * Fetch issues near a specific location
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise resolving to list of issues
 */
export async function getIssuesByLocation(lat: number, lng: number) {
  const url = `${API_BASE_URL}${API_ENDPOINTS.ISSUES_BY_LOCATION}?lat=${lat}&lng=${lng}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data.issues;
}
