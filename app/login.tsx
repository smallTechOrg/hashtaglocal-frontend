import { useGoogleAuth } from "@/api/GoogleAuth";
import CustomText from "@/components/CustomText";
import { useRouter } from "expo-router";
import { Image, ImageBackground, Pressable, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
const { signIn } = useGoogleAuth();
  

  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      resizeMode="fill"
      imageStyle={{ opacity: 0.3 }}
      className="flex-1"
    >
      <View className="items-center justify-center px-6 pt-40">
        <Image
          source={require("../assets/logo-green.png")}
          style={{height: 130, marginBottom: 70 }}
          resizeMode="contain"
        />

        <CustomText className="h1 font-[500] mb-2 mt-20">#local</CustomText>
        <CustomText className="h3 font-[300] text-center mb-12">
          a location based community platform
        </CustomText>

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
    </ImageBackground>
  );
}
