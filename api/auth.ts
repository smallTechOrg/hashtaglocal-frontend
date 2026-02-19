const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export interface AuthTokens {
  access_token: {
    value: string;
    expiry: number;
  };
  refresh_token: {
    value: string;
    expiry: number;
  };
}

export interface RefreshTokenResponse {
  data: AuthTokens;
}

export interface GoogleAuthResponse {
  data: AuthTokens & {
    is_new_user: boolean;
  };
}

export interface AuthError {
  error: {
    errors: {
      type: string;
      message: string;
    }[];
    message: string;
  };
}

const TIME_OUT = 30000; // 30 seconds

// Function to refresh auth tokens using refresh token
export async function refreshAuthToken(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const url = `${API_BASE_URL}/auth/refresh`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
        refresh_token: refreshToken
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData: AuthError = await response.json();
    console.log("Error data:", errorData);
    throw new Error(errorData.error.message);
  }

  return response.json();
}

// Start Google OAuth flow
export async function googleAuth(): Promise<GoogleAuthResponse> {
  const url = `${API_BASE_URL}/auth/google`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIME_OUT);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData: AuthError = await response.json();
    throw new Error(errorData.error.message);
  }

  return response.json();
}
