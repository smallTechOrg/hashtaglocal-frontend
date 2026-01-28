import { View, Text, Pressable, Image, Linking } from "react-native";
import { startGoogleAuth } from "@/api/auth";

export default function LoginScreen() {
  const handleGoogleSignUp = async () => {
    try {
      const response = await startGoogleAuth();
      await Linking.openURL(response.data.oauth_url);
    } catch (error) {
      console.log("Google Sign Up error:", error);
    }
  };

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Image
        source={require("../assets/logo-green.png")}
        style={{ width: 80, height: 100, marginBottom: 24 }}
        resizeMode="contain"
      />

      <Text className="h1 font-bold  mb-2">#local</Text>
      <Text className=" text-center mb-12">
        Report and track local issues in your community
      </Text>

      <Pressable
        onPress={handleGoogleSignUp}
        className="flex-row items-center bg-white border border-gray-300 rounded-lg px-6 py-3 shadow-sm"
        style={{ elevation: 2 }}
      >
        <Text className="text-gray-700 p font-medium">
          Sign up with Google
        </Text>
      </Pressable>
    </View>
  );
}
