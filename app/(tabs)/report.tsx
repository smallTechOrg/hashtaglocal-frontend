import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 bg-white px-6 py-8">
      {/* Guidelines Section */}
      <View className="mb-8">
        <CustomText className="text-xl font-bold mb-4">Guidelines for Reporting Issues</CustomText>

        <View className="flex-row items-start mb-3">
          <MaterialIcons name="check-circle" size={20} color="#256D1B" />
          <CustomText className="ml-3 flex-1 text-gray-700">
            What is an Issue? Anything that negatively impacts the community's well-being, safety, or environment.
          </CustomText>
        </View>

        <View className="flex-row items-start mb-3">
          <MaterialIcons name="info" size={20} color="#256D1B" />
          <View className="ml-3 flex-1">
            <CustomText className="text-gray-700 font-semibold mb-2">
              Types of Issues You Can Report:
            </CustomText>
            <View className="space-y-1">
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="construction" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Road Damage & Potholes</CustomText>
              </View>
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="delete-outline" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Waste & Garbage Disposal</CustomText>
              </View>
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="directions-walk" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Footpath & Walkability Issues</CustomText>
              </View>
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="air" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Air & Noise Pollution</CustomText>
              </View>
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="cleaning-services" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Hygiene & Sanitation</CustomText>
              </View>
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="lightbulb-outline" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Safety & Street Lighting</CustomText>
              </View>
              <View className="flex-row items-center mb-1">
                <MaterialIcons name="help-outline" size={16} color="#666" />
                <CustomText className="text-gray-600 ml-2">Other Community Issues</CustomText>
              </View>
            </View>
          </View>
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
