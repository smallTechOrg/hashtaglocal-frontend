import * as AppleAuthentication from "expo-apple-authentication";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type AppleSignInResult =
  | { type: "success"; params: Record<string, string> }
  | { type: "cancelled" }
  | { type: "error"; error: Error };

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken, fullName } = credential;
    if (!identityToken) {
      return { type: "error", error: new Error("Apple sign-in returned no identity token") };
    }


    // Combine given + family name (only available on first sign-in)
    const displayName =
      [fullName?.givenName, fullName?.familyName].filter(Boolean).join(" ").trim() || undefined;

    const response = await fetch(`${API_BASE_URL}/auth/apple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity_token: identityToken,
        full_name: displayName ?? null,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { type: "error", error: new Error(`Apple auth backend error ${response.status}: ${text}`) };
    }

    const json = await response.json();
    const authData = json.data;

    const params: Record<string, string> = {
      access_token: authData.access_token.value,
      refresh_token: authData.refresh_token.value,
      access_expiry: String(authData.access_token.expiry),
      refresh_expiry: String(authData.refresh_token.expiry),
    };

    return { type: "success", params };
  } catch (e: unknown) {
    if (
      e != null &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "ERR_REQUEST_CANCELED"
    ) {
      return { type: "cancelled" };
    }
    return { type: "error", error: e instanceof Error ? e : new Error(String(e)) };
  }
}
