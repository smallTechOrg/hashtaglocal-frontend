import { View, Text, Pressable, Image, Linking } from "react-native";
import { useRouter } from "expo-router";
import { googleAuth } from "@/api/auth";
import { saveTokens } from "@/utils/tokenStorage";

export default function LoginScreen() {
  const router = useRouter();

  const handleGoogleSignUp = async () => {
      Linking.openURL(
    'https://accounts.google.com/v3/signin/accountchooser?client_id=870371939888-dtnniua1oc41pd9mlnluo16mjbfhb83r.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=openid+email+profile&dsh=S-972211433%3A1769585626456970&o2v=2&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMrbJ0whdI8r7ANQkSvZVPk4d-sLZajSGGhEqTLaQX3EO9H5Q2DJXmElAztBV7Bg_Kgad0brgkZEMOmOd-aVCSIVw_UBJfjUDgEQSq4gOOcUh5h3WxffUp8AOJPBTHghXhyGNtz-gss_E1bhKCm4DKhdkS3ftfcyCZBWEcFwv6oZ3xMqDekLtAq4o4XrdY0mvDfmdoTnbpPDLDY30GOo2P7YAN0AFRVYshCAl3gAln98OzR6yIzj2SSXIUWws-NO1C033OUILkNK8zciWkccg47hqaAvTBeNCnjWkouJbwLOCSPxHwdnM2Eb1nXMV3JQTNpchuwB4WgLs_AvQD2UEgNC6bB5N9T0PSwRUaaGVBRUp0XpvZewH1XBQwfkS0W5HWQ5dd6Z7uvBYekbQ85qX6xRiYXvtf_o45ZxwXZXm7qUVHS_RE4Tzfcfjp2MECHUVDZbR-dpkbJTMWJvI2WS_ByDhqgRw%26flowName%3DGeneralOAuthFlow%26as%3DS-972211433%253A1769585626456970%26client_id%3D870371939888-dtnniua1oc41pd9mlnluo16mjbfhb83r.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=http%3A%2F%2Flocalhost%3A8080'
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
