import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { APIResponse } from '@/models/APIResponse';
import { Platform } from 'react-native';

/**
 * Fetches issue data from the backend API
 * @param issueId - The ID of the issue to fetch
 * @returns Promise resolving to the API response
 */
export async function fetchIssue(issueId: number): Promise<APIResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.ISSUE(issueId)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
      
      // Provide platform-specific guidance
      if (Platform.OS === 'android') {
        console.error('  Android: Try using http://10.0.2.2:8080 for emulator');
        console.error('  Android: Use your computer IP for physical device');
      } else if (Platform.OS === 'ios') {
        console.error('  iOS: Use http://localhost:8080 for simulator');
        console.error('  iOS: Use your computer IP for physical device');
      }
      
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

