import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

interface SubmitButtonsProps {
  isUpdateMode: boolean;
  isEnabled: boolean;
  isSubmitting: boolean;
  isLoadingLocation: boolean;
  isUploading: boolean;
  selectedAction: "VERIFY" | "RESOLVE" | null;
  onSubmit: (action?: "VERIFY" | "RESOLVE") => void;
}

function ActionButton({
  onPress,
  enabled,
  icon,
  label,
  color,
}: {
  onPress: () => void;
  enabled: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!enabled}
      className={`flex-1 py-4 rounded-xl items-center flex-row justify-center ${
        enabled ? "" : "bg-gray-300"
      }`}
      style={{
        backgroundColor: enabled ? color : undefined,
        elevation: enabled ? 2 : 0,
      }}
    >
      <MaterialIcons name={icon} size={22} color={enabled ? "white" : "#999"} />
      <CustomText
        className={`ml-2 font-bold text-base ${
          enabled ? "text-white" : "text-gray-500"
        }`}
      >
        {label}
      </CustomText>
    </TouchableOpacity>
  );
}

export default function SubmitButtons({
  isUpdateMode,
  isEnabled,
  isSubmitting,
  isLoadingLocation,
  isUploading,
  selectedAction,
  onSubmit,
}: SubmitButtonsProps) {
  if (isUpdateMode) {
    return (
      <View className="mt-2 flex-row gap-3">
        <ActionButton
          onPress={() => onSubmit("RESOLVE")}
          enabled={isEnabled}
          icon="check-circle"
          label={
            isSubmitting && selectedAction === "RESOLVE"
              ? "Resolving..."
              : "Resolve Issue"
          }
          color="#256D1B"
        />
        <ActionButton
          onPress={() => onSubmit("VERIFY")}
          enabled={isEnabled}
          icon="verified"
          label={
            isSubmitting && selectedAction === "VERIFY"
              ? "Verifying..."
              : "Verify Issue"
          }
          color="#2563EB"
        />
      </View>
    );
  }

  const buttonLabel = isLoadingLocation
    ? "Getting Location..."
    : isUploading
      ? "Uploading..."
      : isSubmitting
        ? "Submitting..."
        : "Submit Report";

  return (
    <TouchableOpacity
      onPress={() => onSubmit()}
      disabled={!isEnabled}
      className={`mt-2 py-4 rounded-xl items-center flex-row justify-center ${
        isEnabled ? "bg-[#256D1B]" : "bg-gray-300"
      }`}
      style={{ elevation: isEnabled ? 2 : 0 }}
    >
      <MaterialIcons
        name="check-circle"
        size={24}
        color={isEnabled ? "white" : "#999"}
      />
      <CustomText
        className={`ml-2 font-bold text-lg ${
          isEnabled ? "text-white" : "text-gray-500"
        }`}
      >
        {buttonLabel}
      </CustomText>
    </TouchableOpacity>
  );
}
