import { createIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

const ISSUE_TYPES = [
  { id: "pothole", label: "Pothole", icon: "warning" },
  { id: "garbage", label: "Garbage", icon: "delete" },
  { id: "sewer", label: "Sewer/Drainage", icon: "water-damage" },
  { id: "streetlight", label: "Street Light", icon: "lightbulb" },
  { id: "road_damage", label: "Road Damage", icon: "trending-down" },
  { id: "water_leak", label: "Water Leak", icon: "opacity" },
  { id: "other", label: "Other", icon: "more-horiz" },
] as const;

type IssueType = (typeof ISSUE_TYPES)[number]["id"];

export default function IssueForm() {
  const params = useLocalSearchParams<{
    imageUri: string;
    latitude: string;
    longitude: string;
    address: string;
    timestamp: string;
  }>();

  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { imageUri, latitude, longitude, address, timestamp } = params;

  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const selectedTypeLabel = ISSUE_TYPES.find((t) => t.id === selectedType)?.label;

  const handleSubmit = async () => {
    if (!selectedType) return;

    setIsSubmitting(true);

    try {
      const payload = {
        issue: {
          type: selectedType.toUpperCase(),
          location: {
            lat: latitude || "0",
            lng: longitude || "0",
          },
          media_urls: [
            {
              location: {},
              type: "photo",
              url: imageUri || "",
            },
          ],
        },
      };

      const response = await createIssue(payload);

      // Navigate to issue detail with the returned issue_id
      router.push({
        pathname: "/issueDetail",
        params: {
          id: response.data.issue_id.toString(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to report issue";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Image Preview Section */}
      <View className="relative">
        <Image
          source={{ uri: imageUri }}
          style={{ width: "100%", height: 300 }}
          contentFit="cover"
        />

        {/* Location & Time Overlay */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-black/60">
          <View className="flex-row items-center mb-2">
            <MaterialIcons name="location-on" size={18} color="white" />
            <CustomText className="text-white ml-2 flex-1" numberOfLines={2}>
              {address || "Location not available"}
            </CustomText>
          </View>
          <View className="flex-row items-center">
            <MaterialIcons name="access-time" size={18} color="white" />
            <CustomText className="text-white ml-2">
              {formattedDate} at {formattedTime}
            </CustomText>
          </View>
        </View>
      </View>

      {/* Coordinates Display */}
      <View className="px-4 py-3 bg-gray-100 flex-row items-center">
        <MaterialIcons name="gps-fixed" size={18} color="#666" />
        <CustomText className="text-gray-600 ml-2 text-sm">
          {latitude ? `${parseFloat(latitude).toFixed(6)}` : "N/A"},{" "}
          {longitude ? `${parseFloat(longitude).toFixed(6)}` : "N/A"}
        </CustomText>
      </View>

      {/* Form Section */}
      <View className="p-4">
        <CustomText className="h2 font-bold mb-4">Issue Details</CustomText>

        {/* Issue Type Dropdown */}
        <View className="mb-6">
          <CustomText className="h3 mb-2 text-gray-700">Type of Issue *</CustomText>
          <TouchableOpacity
            onPress={() => setDropdownVisible(true)}
            className="flex-row items-center justify-between border border-gray-300 rounded-lg p-4 bg-white"
          >
            <View className="flex-row items-center">
              {selectedType && (
                <MaterialIcons
                  name={ISSUE_TYPES.find((t) => t.id === selectedType)?.icon as any}
                  size={24}
                  color="#6200EE"
                />
              )}
              <CustomText
                className={`ml-2 ${selectedType ? "text-black" : "text-gray-400"}`}
              >
                {selectedTypeLabel || "Select issue type"}
              </CustomText>
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!selectedType || isSubmitting}
          className={`py-4 rounded-lg items-center ${
            selectedType ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <View className="flex-row items-center">
            <MaterialIcons
              name="report"
              size={24}
              color={selectedType ? "white" : "#999"}
            />
            <CustomText
              className={`ml-2 font-bold text-lg ${
                selectedType ? "text-white" : "text-gray-500"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Report Issue"}
            </CustomText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
          className="flex-1 justify-center items-center bg-black/50"
        >
          <View className="bg-white rounded-lg w-4/5 max-h-96 overflow-hidden">
            <View className="p-4 border-b border-gray-200">
              <CustomText className="h2 font-bold">Select Issue Type</CustomText>
            </View>
            <ScrollView>
              {ISSUE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setSelectedType(type.id);
                    setDropdownVisible(false);
                  }}
                  className={`flex-row items-center p-4 border-b border-gray-100 ${
                    selectedType === type.id ? "bg-purple-50" : ""
                  }`}
                >
                  <MaterialIcons
                    name={type.icon as any}
                    size={24}
                    color={selectedType === type.id ? "#6200EE" : "#666"}
                  />
                  <CustomText
                    className={`ml-3 ${
                      selectedType === type.id
                        ? "text-primary font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {type.label}
                  </CustomText>
                  {selectedType === type.id && (
                    <MaterialIcons
                      name="check"
                      size={24}
                      color="#6200EE"
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
