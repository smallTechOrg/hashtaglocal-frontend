import { useGoogleAuth } from "@/api/GoogleAuth";
import CustomText from "@/components/CustomText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, ImageBackground, Pressable, View } from "react-native";

export default function LoginScreen() {
  const { signIn } = useGoogleAuth();
  

  return (
    <ImageBackground
      source={require("../assets/bg.jpg")}
      resizeMode="fill"
      imageStyle={{ opacity: 0.4 }}
      className="flex-1"
    >
      <View className="items-center justify-center px-6 pt-40">
        <Image
          source={require("../assets/logo-green.png")}
          style={{height: 130, marginBottom: 70 }}
          resizeMode="contain"
        />

        <CustomText className="h1 font-[600] mb-2 mt-18">#local</CustomText>
        <CustomText className="h3 font-[500] text-center mb-8">
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
    </ImageBackground>
  );
}
