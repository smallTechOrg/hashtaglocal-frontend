import * as AuthSession from "expo-auth-session";
import Constants from 'expo-constants';
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

WebBrowser.maybeCompleteAuthSession();

const oauth_endpoint = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
};
const owner = Constants.expoConfig?.owner;
const slug = Constants.expoConfig?.slug;

export function useGoogleAuth() {
    const redirectUri = process.env.EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URI!;

    console.log("Redirect URI:", redirectUri);

    const [request, response, promptAsync] =
        AuthSession.useAuthRequest(
            {
                clientId: "870371939888-o448r3h3bqgvlgehh78q9o3dhqcpocdn.apps.googleusercontent.com",
                scopes: ["openid", "email", "profile"],
                redirectUri,
                responseType: AuthSession.ResponseType.Token,
                usePKCE: false,
            },
            oauth_endpoint
        );


    useEffect(() => {

        if (!response) {
            console.log("no response")
            return;
        } // Exit early if response is null/undefined
        console.log("OAuth response:", response);
        switch (response.type) {
            case "success":
                console.log("Auth code:", response.params.code);
                // Logic to exchange code for a token would go here
                break;

            case "cancel":
                console.warn("User closed the login window.");
                // Logic to show a "Login cancelled" message to the user
                break;

            case "error":
                console.error("Auth Error:", response.error || "Unknown error");
                // Logic to show an error alert
                break;

            default:
                console.log("Unhandled response type:", response.type);
        }
    }, [response]);

    return {
        signIn: promptAsync, // ✅ proxy here
    };
}
