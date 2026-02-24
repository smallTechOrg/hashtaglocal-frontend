import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { View } from "react-native";

/**
 * Form header showing whether we're reporting or verifying an issue
 */
interface FormHeaderProps {
  isUpdateMode: boolean;
}

export default function FormHeader({ isUpdateMode }: FormHeaderProps) {
  return (
    <View className="flex-row items-center mb-4">
      <MaterialIcons
        name={isUpdateMode ? "verified" : "report-problem"}
        size={24}
        color="#256D1B"
      />
      <CustomText className="ml-2 text-xl font-bold">
        {isUpdateMode ? "Verify Issue" : "Report Issue"}
      </CustomText>
    </View>
  );
}
