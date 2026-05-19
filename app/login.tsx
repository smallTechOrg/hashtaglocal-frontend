import { signInWithApple } from "@/api/AppleAuth";
import { useGoogleAuth } from "@/api/GoogleAuth";
import CustomText from "@/components/CustomText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, Platform, Pressable, View } from "react-native";

const { width, height } = Dimensions.get("window");
const SCALE = 1.25; // enough headroom for larger pan distances

export default function LoginScreen() {
  const { signIn } = useGoogleAuth();
  const router = useRouter();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pan, { toValue: { x: -38, y: -28 }, duration: 6000, useNativeDriver: true }),
        Animated.timing(pan, { toValue: { x: 30, y: 24 },   duration: 6000, useNativeDriver: true }),
        Animated.timing(pan, { toValue: { x: -22, y: 32 },  duration: 6000, useNativeDriver: true }),
        Animated.timing(pan, { toValue: { x: 28, y: -20 },  duration: 6000, useNativeDriver: true }),
        Animated.timing(pan, { toValue: { x: 0, y: 0 },     duration: 6000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleAppleSignIn = async () => {
    const result = await signInWithApple();
    if (result.type === "success") {
      router.replace({ pathname: "/auth/callback", params: result.params });
    }
    // cancelled and error: stay on login screen (error already logged inside signInWithApple)
  };

  const handleSignIn = async () => {
    const result = await signIn();
    console.log("[Auth] openAuthSessionAsync result type:", result.type);

    if (result.type === "success" && result.url) {
      console.log("[Auth] iOS auth session succeeded, parsing callback URL");
      const queryString = result.url.split("?")[1];
      if (queryString) {
        const params = Object.fromEntries(new URLSearchParams(queryString).entries());
        if (params.access_token) {
          router.replace({ pathname: "/auth/callback", params });
          return;
        }
      }
      console.log("[Auth] callback URL missing access_token:", result.url);
    }
    // On Android, the deep link fires via Linking and is handled by _layout.tsx
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.Image
        source={require("../assets/bg.jpg")}
        style={{
          position: "absolute",
          width: width * SCALE,
          height: height * SCALE,
          top: -(height * (SCALE - 1)) / 2,
          left: -(width * (SCALE - 1)) / 2,
          opacity: 0.4,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        }}
        resizeMode="cover"
      />
      <View className="items-center justify-center px-6 pt-40">
        <Image
          source={require("../assets/logo-green.png")}
          style={{height: 140, marginBottom: 70 }}
          resizeMode="contain"
        />

        <CustomText className="h1 font-[700] mb-2 mt-18">#local</CustomText>
        <CustomText className="h3 font-[600] text-center mb-8">
          a location based community platform
        </CustomText>

        <View className="mb-12 gap-4">
          {[
            { icon: "alert-circle-outline", label: "report and track issues" },
            { icon: "calendar-month-outline", label: "find events" },
            { icon: "account-group-outline", label: "join local groups" },
          ].map(({ icon, label }) => (
            <View key={label} className="flex-row items-center gap-3">
              <MaterialCommunityIcons
                name={icon as any}
                size={22}
                color="#4B5563"
              />
              <CustomText className="h3 font-[400]">{label}</CustomText>
            </View>
          ))}
        </View>

        <View className="flex-row gap-3 w-full">
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={{ flex: 1, height: 48 }}
              onPress={handleAppleSignIn}
            />
          )}

          <Pressable
            onPress={handleSignIn}
            className="flex-row items-center justify-center bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm"
            style={{ elevation: 2, flex: 1, height: 48 }}
          >
            <Image
              source={require("../assets/google.png")}
              style={{ width: 24, height: 24, marginRight: 8 }}
              resizeMode="contain"
            />
            <CustomText className="text-gray-700 h3">
              Sign in with Google
            </CustomText>
          </Pressable>
        </View>
      </View>

      <View className="absolute bottom-8 w-full items-center">
        <Pressable onPress={() => WebBrowser.openBrowserAsync("https://local.smalltech.in/privacy")}>
          <CustomText className="text-gray-500 text-xs">
            By signing in, you agree to our{" "}
            <CustomText className="text-green-700 text-xs underline">Privacy Policy</CustomText>
          </CustomText>
        </Pressable>
      </View>
    </View>
  );
}
