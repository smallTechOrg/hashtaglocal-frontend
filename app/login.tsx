import { View, Text, Pressable, Image, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import { googleAuth } from "@/api/auth";
import { saveTokens } from "@/utils/tokenStorage";
import { useGoogleAuth } from "@/api/GoogleAuth";

export default function LoginScreen() {
  const router = useRouter();
const { signIn } = useGoogleAuth();
  

  return (
    <ImageBackground
      source={require("../assets/logo-green.png")}
      resizeMode="contain"
      imageStyle={{ opacity: 0.1 }}
      className="flex-1"
    >
      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("../assets/logo-green.png")}
          style={{ width: 80, height: 100, marginBottom: 24 }}
          resizeMode="contain"
        />

        <Text className="h1 font-bold mb-2">#local</Text>
        <Text className="text-center mb-12">
          Report and track local issues in your community
        </Text>

        <Pressable
          onPress={() => {
            signIn();
          }}
          className="flex-row items-center bg-white border border-gray-300 rounded-lg px-6 py-3 shadow-sm"
          style={{ elevation: 2 }}
        >
          <Text className="text-gray-700 p font-medium">
            Sign up with Google
          </Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
