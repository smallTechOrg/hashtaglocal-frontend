import { getCrashlytics, log, recordError } from "@react-native-firebase/crashlytics";
import { trackAuthFailed } from "@/utils/analytics";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { getDeviceId } from "@/utils/deviceId";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export function useGoogleAuth() {
    const signIn = async () => {
        const crashlytics = getCrashlytics();
        const redirectUri = process.env.EXPO_PUBLIC_API_BASE_URL! + "/auth-handler.html";
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
        const deviceId = await getDeviceId();

        // Encode platform + device_id in the OAuth state parameter.
        // Google echoes state back unchanged in the fragment alongside access_token,
        // so auth-handler.html can extract and forward them to the backend.
        const state = new URLSearchParams({ platform: Platform.OS, device_id: deviceId }).toString();

        const authUrl =
            GOOGLE_AUTH_ENDPOINT +
            "?" +
            new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: "token",
                scope: "openid email profile",
                state,
            }).toString();

        log(crashlytics, `[GoogleAuth] clientId=${clientId}`);
        log(crashlytics, `[GoogleAuth] redirectUri=${redirectUri}`);
        log(crashlytics, `[GoogleAuth] authUrl=${authUrl}`);

        try {
            // Pass hashtaglocal://auth/callback as the second arg so that
            // ASWebAuthenticationSession (iOS) uses "hashtaglocal" as its
            // callbackURLScheme and intercepts the deep-link redirect from
            // auth-handler.html instead of silently blocking it.
            const result = await WebBrowser.openAuthSessionAsync(authUrl, "hashtaglocal://auth/callback");
            log(crashlytics, `[GoogleAuth] browser result type=${result.type}`);
            if (result.type !== "success") {
                // type=cancel usually means redirect_uri_mismatch (Google error page shown, user dismissed)
                // or user manually closed the browser. Analytics event is sent in near real-time unlike Crashlytics.
                trackAuthFailed(result.type, redirectUri);
                recordError(
                    crashlytics,
                    new Error(
                        `[GoogleAuth] browser closed with type=${result.type} | redirectUri=${redirectUri} | clientId=${clientId}`
                    )
                );
            }
            return result;
        } catch (e) {
            recordError(crashlytics, e instanceof Error ? e : new Error(String(e)));
            throw e;
        }
    };

    return { signIn };
}
