import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";

export interface PickerItem {
  id: string;
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

interface BottomSheetPickerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: readonly PickerItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function BottomSheetPicker({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
}: BottomSheetPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 justify-end bg-black/50"
      >
        <View
          className="bg-white rounded-t-3xl overflow-hidden"
          style={{ maxHeight: "80%" }}
        >
          <View className="p-5 border-b border-gray-200 bg-gray-50">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MaterialIcons name="category" size={24} color="#256D1B" />
                <CustomText className="ml-2 text-xl font-bold">
                  {title}
                </CustomText>
              </View>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {items.map((item, index) => {
              const isSelected = selectedId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  className={`flex-row items-center p-5 ${
                    index !== items.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  } ${isSelected ? "bg-green-50" : "bg-white"}`}
                >
                  {item.icon && (
                    <View
                      className={`w-12 h-12 rounded-full items-center justify-center ${
                        isSelected ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <MaterialIcons
                        name={item.icon}
                        size={28}
                        color={isSelected ? "#256D1B" : "#666"}
                      />
                    </View>
                  )}
                  <CustomText
                    className={`flex-1 ml-4 text-base ${
                      isSelected
                        ? "text-[#256D1B] font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {item.label}
                  </CustomText>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color="#256D1B"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
