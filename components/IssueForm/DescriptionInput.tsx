import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { RefObject } from "react";
import { TextInput, View } from "react-native";

interface DescriptionInputProps {
  description: string;
  onChangeText: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
}

export default function DescriptionInput({
  description,
  onChangeText,
  inputRef,
}: DescriptionInputProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-3">
        <MaterialIcons name="description" size={20} color="#256D1B" />
        <CustomText className="ml-2 font-bold text-base">
          Description (Optional)
        </CustomText>
      </View>

      <TextInput
        ref={inputRef}
        placeholder="Add details about the issue..."
        placeholderTextColor="#999"
        value={description}
        onChangeText={onChangeText}
        multiline
        numberOfLines={3}
        maxLength={500}
        className="border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 min-h-24"
        style={{
          textAlignVertical: "top",
          fontFamily: "System",
          borderColor: "#E5E7EB",
        }}
      />
      <CustomText className="mt-1 text-xs text-gray-500">
        {description.length}/500
      </CustomText>
    </View>
  );
}
