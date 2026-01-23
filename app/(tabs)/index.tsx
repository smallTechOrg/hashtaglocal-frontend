import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 bg-white px-6 py-8">
      {/* Guidelines Section */}
      <View className="mb-8">
        <CustomText className="text-xl font-bold mb-4">Guidelines</CustomText>

        <View className="flex-row items-start mb-3">
          <MaterialIcons name="check-circle" size={20} color="#256D1B" />
          <CustomText className="ml-3 flex-1 text-gray-700">
            Please report only valid issues, like potholes, garbage dumps, or broken footpaths.
          </CustomText>
        </View>

        <View className="flex-row items-start mb-3">
          <MaterialIcons name="cancel" size={20} color="#ef4444" />
          <CustomText className="ml-3 flex-1 text-gray-700">
            Any inappropriate content or misuse of the app will lead to a permanent ban.
          </CustomText>
        </View>
      </View>

      {/* Create Issue Button */}
      <TouchableOpacity
        onPress={() => router.push("/CameraCapture")}
        className="bg-[#256D1B] py-4 rounded-xl flex-row items-center justify-center"
      >
        <MaterialIcons name="camera-alt" size={28} color="white" />
        <CustomText className="ml-3 text-white text-lg font-bold">
          Report Issue
        </CustomText>
      </TouchableOpacity>
    </View>
  );
}
