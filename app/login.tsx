import { View, Text, Pressable, Image, Linking } from "react-native";
import { useRouter } from "expo-router";
import { googleAuth } from "@/api/auth";
import { saveTokens } from "@/utils/tokenStorage";

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogleSignUp = async () => {
      Linking.openURL(
    'https://accounts.google.com/o/oauth2/v2/auth?client_id=870371939888-g2iuioplthius8qs7c82uc8o652qb8es.apps.googleusercontent.com&redirect_uri=com.googleusercontent.apps.870371939888-g2iuioplthius8qs7c82uc8o652qb8es:/oauth2redirect&response_type=code&scope=openid%20email%20profile'
  );
    // try {
    //   const response = await googleAuth();
    //   const { access_token, refresh_token } = response.data;

    //   await saveTokens(
    //     access_token.value,
    //     access_token.expiry,
    //     refresh_token.value,
    //     refresh_token.expiry
    //   );

    //   router.replace("/");
    // } catch (error) {
    //   console.log("Google Sign Up error:", error);
    // }
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
