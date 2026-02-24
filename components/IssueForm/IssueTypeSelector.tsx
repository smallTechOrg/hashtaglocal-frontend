import CustomText from "@/components/CustomText";
import { ISSUE_TYPES, IssueType } from "@/constants/issueTypes";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

/**
 * Issue type selection UI with dropdown trigger
 */
interface IssueTypeSelectorProps {
  selectedIssueType: IssueType | null;
  selectedIssueTypeLabel: string | undefined;
  isUpdateMode: boolean;
  onPress: () => void;
}

export default function IssueTypeSelector({
  selectedIssueType,
  selectedIssueTypeLabel,
  isUpdateMode,
  onPress,
}: IssueTypeSelectorProps) {
  return (
    <View className="mb-4">
      {/* Section header with required indicator */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <MaterialIcons name="category" size={20} color="#256D1B" />
          <CustomText className="ml-2 font-bold text-base">Issue Type</CustomText>
          {!isUpdateMode && <CustomText className="ml-1 text-red-500 font-bold text-base">*</CustomText>}
        </View>
        {!isUpdateMode && !selectedIssueType && (
          <CustomText className="text-xs text-red-500 font-medium">Required</CustomText>
        )}
      </View>

      {/* Dropdown button */}
      <TouchableOpacity
        onPress={onPress}
        disabled={isUpdateMode}
        className={`flex-row items-center justify-between border-2 border-gray-200 rounded-xl px-4 py-4 ${
          isUpdateMode ? "bg-gray-100" : "bg-gray-50"
        }`}
      >
        <View className="flex-row items-center flex-1">
          {selectedIssueType && (
            <MaterialIcons
              name={ISSUE_TYPES.find((t) => t.id === selectedIssueType)?.icon as any}
              size={24}
              color={isUpdateMode ? "#6b7280" : "#256D1B"}
            />
          )}
          <CustomText className="ml-3 text-base text-gray-900 font-medium">
            {selectedIssueTypeLabel || "Select issue type"}
          </CustomText>
        </View>
        {!isUpdateMode && <MaterialIcons name="arrow-drop-down" size={28} color="#256D1B" />}
        {isUpdateMode && <MaterialIcons name="lock" size={20} color="#9ca3af" />}
      </TouchableOpacity>
    </View>
  );
}
