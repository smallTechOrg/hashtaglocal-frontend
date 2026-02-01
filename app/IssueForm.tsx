import { reportIssue, uploadImage } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import TopOverlay from "@/components/IssueImage/TopOverlay";
import { formatDate } from "@/utils/FormatDate";
import { formatLocationString } from "@/utils/ImageProcessing";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

const ISSUE_TYPES = [
  { id: "POTHOLE", label: "Road Damage & Potholes", icon: "construction" },
  { id: "WASTE", label: "Waste & Garbage Disposal", icon: "delete-outline" },
  { id: "FOOTPATH", label: "Footpath & Walkability Issues", icon: "directions-walk" },
  { id: "POLLUTION", label: "Air & Noise Pollution", icon: "air" },
  { id: "HYGIENE", label: "Hygiene & Sanitation", icon: "cleaning-services" },
  { id: "SAFETY", label: "Safety & Street Lighting", icon: "lightbulb-outline" },
  { id: "OTHER", label: "Other Community Issues", icon: "help-outline" },
] as const;

type IssueType = (typeof ISSUE_TYPES)[number]["id"];

export default function IssueForm() {
  const params = useLocalSearchParams<{
    imageUri: string;
    latitude: string;
    longitude: string;
    address: string;
    timestamp: string;
    addressDetails?: string;
  }>();

  const [selectedType, setSelectedType] = useState<IssueType | null>("OTHER");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(true);
  const [gcsPath, setGcsPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { imageUri, latitude, longitude, address, timestamp, addressDetails } = params;
  // Upload image on component mount
  useEffect(() => {
    const uploadImageToGCS = async () => {
      try {
        setIsUploading(true);
        setUploadError(null);
        const uploadedPath = await uploadImage(imageUri, "image/jpeg");
        console.log("Image uploaded to GCP:", uploadedPath);
        setGcsPath(uploadedPath);
      } catch (error) {
        console.error("Error uploading image:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
        setUploadError(errorMessage);
        Alert.alert(
          "Upload Failed",
          "Failed to upload the image. Please try again.",
          [
            {
              text: "Retry",
              onPress: () => uploadImageToGCS(),
            },
            {
              text: "Cancel",
              onPress: () => router.back(),
              style: "cancel",
            },
          ]
        );
      } finally {
        setIsUploading(false);
      }
    };

    uploadImageToGCS();
  }, [imageUri]);
  const selectedTypeLabel = ISSUE_TYPES.find((t) => t.id === selectedType)?.label;

  // Parse address details
  const parsedAddressDetails = addressDetails ? JSON.parse(addressDetails) : null;
  
  // Build meta_data object from parsed address details
  const locationMetaData = {
    city: parsedAddressDetails?.city || null,
    district: parsedAddressDetails?.district || parsedAddressDetails?.subregion || null,
    street_number: parsedAddressDetails?.streetNumber || null,
    street: parsedAddressDetails?.street || null,
    region: parsedAddressDetails?.region || null,
    sub_region: parsedAddressDetails?.subregion || null,
    country: parsedAddressDetails?.country || null,
    postal_code: parsedAddressDetails?.postalCode || null,
    name: parsedAddressDetails?.name || null,
    iso_country_code: parsedAddressDetails?.isoCountryCode || null,
    timezone: parsedAddressDetails?.timezone || null,
    formatted_address: address || null,
  };

  //  utility function for formatting
  const locationString = formatLocationString({
    address: address || "",
    lat: latitude || "N/A",
    lng: longitude || "N/A",
  });
  const timestampString = formatDate(timestamp || "");

  const handleSubmit = async () => {
    if (!selectedType || !gcsPath) return;

    setIsSubmitting(true);

    try {
      const payload = {
        issue: {
          type: selectedType.toUpperCase(),
          location: {
            lat: latitude || "0",
            lng: longitude || "0",
            meta_data: locationMetaData,
          },
          media_urls: [
            {
              location: {
                lat: latitude || "0",
                lng: longitude || "0",
                meta_data: locationMetaData,
              },
              type: "PHOTO",
              url: gcsPath || "",
            },
          ],
          description: "",
        },
      };

      const response = await reportIssue(payload);

      setIsSubmitting(false);
      Alert.alert("Success", "Issue reported successfully!", [
        {
          text: "View Issue",
          onPress: () => {
            router.push({
              pathname: "/issueDetail",
              params: {
                id: response.data.issue_id.toString(),
              },
            });
          },
        },
        {
          text: "Go Home",
          onPress: () => {
            // Clean navigation stack and go to home
            router.dismissAll();
            router.replace("/(tabs)");
          },
          style: "cancel",
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
    <ScrollView className="flex-1 bg-gray-50">
      {/* Image Preview Section */}
      <View className="bg-white shadow-sm">
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

      {/* Upload Status Banner */}
      {isUploading && (
        <View className="bg-blue-50 p-4 mx-3 mt-3 rounded-xl border border-blue-200">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#2563EB" />
            <CustomText className="ml-3 text-blue-700 font-medium">Uploading image...</CustomText>
          </View>
        </View>
      )}

      {uploadError && (
        <View className="bg-red-50 p-4 mx-3 mt-3 rounded-xl border border-red-200">
          <View className="flex-row items-center">
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <CustomText className="ml-3 text-red-700 font-medium">Upload failed. Please retry.</CustomText>
          </View>
        </View>
      )}

      {!isUploading && gcsPath && (
        <View className="bg-green-50 p-4 mx-3 mt-3 rounded-xl border border-green-200">
          <View className="flex-row items-center">
            <MaterialIcons name="check-circle" size={20} color="#16A34A" />
            <CustomText className="ml-3 text-green-700 font-medium">Image uploaded successfully!</CustomText>
          </View>
        </View>
      )}

      {/* Form Section - Card Layout */}
      <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <MaterialIcons name="report-problem" size={24} color="#256D1B" />
          <CustomText className="ml-2 text-xl font-bold">Report Issue</CustomText>
        </View>

        {/* Issue Type Section */}
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <MaterialIcons name="category" size={20} color="#256D1B" />
            <CustomText className="ml-2 font-bold text-base">Issue Type</CustomText>
          </View>
          
          <TouchableOpacity
            onPress={() => setDropdownVisible(true)}
            className="flex-row items-center justify-between border-2 border-gray-200 rounded-xl px-4 py-4 bg-gray-50"
          >
            <View className="flex-row items-center flex-1">
              {selectedType && (
                <MaterialIcons
                  name={ISSUE_TYPES.find((t) => t.id === selectedType)?.icon as any}
                  size={24}
                  color="#256D1B"
                />
              )}
              <CustomText
                className={`ml-3 text-base ${selectedType ? "text-gray-900 font-medium" : "text-gray-400"}`}
              >
                {selectedTypeLabel || "Select issue type"}
              </CustomText>
            </View>
            <MaterialIcons name="arrow-drop-down" size={28} color="#256D1B" />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!selectedType || isSubmitting || isUploading || !gcsPath}
          className={`mt-2 py-4 rounded-xl items-center flex-row justify-center ${
            selectedType && !isSubmitting && !isUploading && gcsPath ? "bg-[#256D1B]" : "bg-gray-300"
          }`}
          style={{ elevation: selectedType && gcsPath ? 2 : 0 }}
        >
          <MaterialIcons
            name="check-circle"
            size={24}
            color={selectedType && !isSubmitting && !isUploading && gcsPath ? "white" : "#999"}
          />
          <CustomText
            className={`ml-2 font-bold text-lg ${
              selectedType && !isSubmitting && !isUploading && gcsPath ? "text-white" : "text-gray-500"
            }`}
          >
            {isUploading ? "Uploading..." : isSubmitting ? "Submitting..." : "Submit Report"}
          </CustomText>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: '80%' }}>
            <View className="p-5 border-b border-gray-200 bg-gray-50">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <MaterialIcons name="category" size={24} color="#256D1B" />
                  <CustomText className="ml-2 text-xl font-bold">Select Issue Type</CustomText>
                </View>
                <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView>
              {ISSUE_TYPES.map((type, index) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setSelectedType(type.id);
                    setDropdownVisible(false);
                  }}
                  className={`flex-row items-center p-5 ${
                    index !== ISSUE_TYPES.length - 1 ? 'border-b border-gray-100' : ''
                  } ${
                    selectedType === type.id ? "bg-green-50" : "bg-white"
                  }`}
                >
                  <View className={`w-12 h-12 rounded-full items-center justify-center ${
                    selectedType === type.id ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <MaterialIcons
                      name={type.icon as any}
                      size={28}
                      color={selectedType === type.id ? "#256D1B" : "#666"}
                    />
                  </View>
                  <CustomText
                    className={`flex-1 ml-4 text-base ${
                      selectedType === type.id
                        ? "text-[#256D1B] font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {type.label}
                  </CustomText>
                  {selectedType === type.id && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color="#256D1B"
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
