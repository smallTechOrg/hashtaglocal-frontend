import { useGoogleAuth } from "@/api/GoogleAuth";
import CustomText from "@/components/CustomText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, Pressable, View } from "react-native";

const { width, height } = Dimensions.get("window");
const SCALE = 1.25; // enough headroom for larger pan distances

export default function LoginScreen() {
  const { signIn } = useGoogleAuth();
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

        <Pressable
          onPress={() => {
            signIn();
          }}
          className="flex-row items-center bg-white border border-gray-300 rounded-lg px-6 py-3 shadow-sm"
          style={{ elevation: 2 }}
        >
          <Image
            source={require("../assets/google.png")}
            style={{ width: 24, height: 24, marginRight: 12 }}
            resizeMode="contain"
          />
          <CustomText className="text-gray-700 h3">
            Sign In with Google
          </CustomText>
        </Pressable>
      </View>
    </View>
  );
}
