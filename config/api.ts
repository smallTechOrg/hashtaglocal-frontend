// API configuration
// Update this with your backend URL

// Platform-specific default URLs
// For Android Emulator: use http://10.0.2.2:8080
// For iOS Simulator: use http://localhost:8080
// For Physical Device: use http://YOUR_COMPUTER_IP:8080
// For Web: use http://localhost:8080 (may need CORS configuration)

export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  // Default: Use your computer's IP for physical device testing
  // Change to 'http://localhost:8080' for web/iOS simulator
  // Change to 'http://10.0.2.2:8080' for Android emulator
  'http://192.168.0.6:8080';

export const API_ENDPOINTS = {
  ISSUE: (id: number) => `/api/v1/issue/${id}`,
} as const;

// Helper to log current configuration
if (__DEV__) {
  console.log('[API Config] Base URL:', API_BASE_URL);
  console.log('[API Config] Environment variable:', process.env.EXPO_PUBLIC_API_BASE_URL || 'not set');
}

