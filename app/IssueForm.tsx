import { reportIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import TopOverlay from "@/components/IssueImage/TopOverlay";
import { formatDate } from "@/utils/FormatDate";
import { formatLocationString } from "@/utils/ImageProcessing";
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
  { id: "POTHOLE", label: "Potholes", icon: "warning" },
  { id: "HYGIENE", label: "Garbage/Hygiene/Waste", icon: "delete" },
  { id: "FOOTPATH", label: "Footpaths/Walkability", icon: "water-damage" },
  { id: "SAFETY", label: "Safety/Crime", icon: "delete" },
  { id: "POLLUTION", label: "Pollution", icon: "warning" },
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

  const selectedTypeLabel = ISSUE_TYPES.find((t) => t.id === selectedType)?.label;

  //  utility function for formatting
  const locationString = formatLocationString({
    address: address || "",
    lat: latitude || "N/A",
    lng: longitude || "N/A",
  });
  const timestampString = formatDate(timestamp || "");

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
            meta_data: {
              city: null,
              district: null,
              street_number: null,
              street: null,
              region: null,
              sub_region: null,
              country: null,
              postal_code: null,
              name: null,
              iso_country_code: null,
              timezone: null,
              formatted_address: null,
            }
          },
          media_urls: [
            {
              location: {
                lat: latitude || "0",
                lng: longitude || "0",
                meta_data: {
                  city: null,
                  district: null,
                  street_number: null,
                  street: null,
                  region: null,
                  sub_region: null,
                  country: null,
                  postal_code: null,
                  name: null,
                  iso_country_code: null,
                  timezone: null,
                  formatted_address: null,
                }
              },
              type: "PHOTO",
              url: imageUri || "",
            },
          ],
          description: "",
        },
      };

      const response = await reportIssue(payload);

      // Show success message and navigate to issue detail
      Alert.alert("Success", "Successfully reported issue", [
        {
          text: "OK",
          onPress: () => {
            router.push({
              pathname: "/issueDetail",
              params: {
                id: response.data.issue_id.toString(),
              },
            });
          },
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to report issue";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-2">
      {/* Image Preview Section */}
      <View className="relative ">
        <Image
          source={{ uri: imageUri }}
          style={{ width: "100%", height: 300 }}
          contentFit="cover"
        />
        <TopOverlay
          location={locationString}
          timestamp={timestampString}
          index={0}
        />
      </View>

      {/* Form Section */}
      <View>
       

        {/* Issue Type Dropdown */}
        <View className="my-4 flex-row justify-between   ">
          <CustomText className="h3 item-center justify-center py-4">Type of Issue </CustomText>
          <TouchableOpacity
            onPress={() => setDropdownVisible(true)}
            className="flex-row items-center justify-between border border-gray-300 rounded-lg  "
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
            selectedType ? "bg-[#256D1B]" : "bg-gray-300"
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
