// API configuration


export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_BASE_URL;
  // Default: Use your computer's IP for physical device testing
  // Change to 'http://localhost:8080' for web/iOS simulator
  // Change to 'http://10.0.2.2:8080' for Android emulator

export const API_ENDPOINTS = {
  ISSUE: (id: number) => `/api/v1/issue/${id}`,
} as const;

// Helper to log current configuration
if (__DEV__) {
  console.log('[API Config] Base URL:', API_BASE_URL);
  console.log('[API Config] Environment variable:', process.env.EXPO_PUBLIC_API_BASE_URL || 'not set');
}

