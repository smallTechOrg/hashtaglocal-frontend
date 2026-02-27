import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const oauth_endpoint = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
};

export function useGoogleAuth() {
    const redirectUri = process.env.EXPO_PUBLIC_API_BASE_URL!+"/auth-handler.html";

    const [request, response, promptAsync] =
        AuthSession.useAuthRequest(
            {
                clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
                scopes: ["openid", "email", "profile"],
                redirectUri,
                responseType: AuthSession.ResponseType.Token,
                usePKCE: false,
            },
            oauth_endpoint
        );

    return {
        signIn: promptAsync,
    };
}
