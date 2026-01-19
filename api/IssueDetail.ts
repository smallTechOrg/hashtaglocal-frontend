import { APIResponse } from '@/models/APIResponse';


/**
 * Fetches issue data from the backend API
 * @param issueId - The ID of the issue to fetch
 * @returns Promise resolving to the API response
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
const API_ENDPOINTS = {
  ISSUE: (id: number) => `/api/v1/issue/${id}`,
  CREATE_ISSUE: '/issue',
  SIGNED_URL: '/api/v1/media/signed-url',
} as const;

export interface SignedUrlResponse {
  data: {
    signedUrl: string;
    path: string;
  };
}

export interface CreateIssuePayload {
  issue: {
    type: string;
    location: {
      lat: string;
      lng: string;
    };
    media_urls: Array<{
      location: Record<string, unknown>;
      type: string;
      url: string;
    }>;
  };
}

export interface CreateIssueResponse {
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
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    if (error.name === 'AbortError') {
      console.error('[API] Request timeout after 10 seconds');
      throw new Error('Request timeout. Please check if the backend is running and accessible.');
    }
    
    if (error.message?.includes('Network request failed')) {
      console.error('[API] Network request failed. Possible causes:');
      console.error('  1. Backend server is not running');
      console.error('  2. Incorrect API URL (check config/api.ts)');
      console.error('  3. CORS issues (if testing on web)');
      console.error('  4. Network connectivity issues');
      console.error(`  Current URL: ${url}`);
    
      throw new Error(
        `Network request failed. Unable to connect to ${API_BASE_URL}. ` +
        `Please ensure your backend is running and the URL is correct. ` +
        `Check the console for more details.`
      );
    }
    
    console.error('[API] Error fetching issue:', error);
    throw error;
  }
}

export async function createIssue(payload: CreateIssuePayload): Promise<CreateIssueResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.CREATE_ISSUE}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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

    const data: CreateIssueResponse = await response.json();
    console.log(`[API] Successfully created issue, ID: ${data.data.issue_id}`);
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[API] Request timeout after 10 seconds');
      throw new Error('Request timeout. Please check if the backend is running and accessible.');
    }

    if (error.message?.includes('Network request failed')) {
      console.error('[API] Network request failed while creating issue');
      throw new Error(
        `Network request failed. Unable to connect to ${API_BASE_URL}. ` +
        `Please ensure your backend is running and the URL is correct.`
      );
    }

    console.error('[API] Error creating issue:', error);
    throw error;
  }
}

/**
 * Gets a signed URL for uploading media to GCP
 * @param contentType - MIME type of the file (e.g., 'image/jpeg', 'image/png')
 * @returns Promise resolving to signed URL and GCS path
 */
export async function getSignedUploadUrl(contentType: string): Promise<SignedUrlResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.SIGNED_URL}?content_type=${encodeURIComponent(contentType)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
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
    console.log('[API] Successfully obtained signed URL');
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[API] Request timeout while getting signed URL');
      throw new Error('Request timeout. Please check if the backend is running and accessible.');
    }

    if (error.message?.includes('Network request failed')) {
      console.error('[API] Network request failed while getting signed URL');
      throw new Error(
        `Network request failed. Unable to connect to ${API_BASE_URL}. ` +
        `Please ensure your backend is running and the URL is correct.`
      );
    }

    console.error('[API] Error getting signed URL:', error);
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
  contentType: string
): Promise<void> {
  try {
    // Fetch the image as a blob from local URI
    const imageResponse = await fetch(imageUri);
    const blob = await imageResponse.blob();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for uploads

    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
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

    console.log('[GCP] Image uploaded successfully');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[GCP] Upload timeout after 60 seconds');
      throw new Error('Upload timeout. Please try again with a stable connection.');
    }

    console.error('[GCP] Error uploading image:', error);
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
  contentType: string = 'image/jpeg'
): Promise<string> {
  // Step 1: Get signed URL from backend
  const { data } = await getSignedUploadUrl(contentType);

  // Step 2: Upload image to GCP using signed URL
  await uploadImageToGCP(data.signedUrl, imageUri, contentType);

  // Step 3: Return the GCS path for storage
  return data.path;
}
