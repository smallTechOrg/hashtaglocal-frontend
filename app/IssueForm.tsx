import { reportIssue, verifyIssue, uploadImage } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import TopOverlay from "@/components/IssueImage/TopOverlay";
import { formatDate } from "@/utils/FormatDate";
import { formatLocationString } from "@/utils/ImageProcessing";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  TextInput,
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
    timestamp: string;
    mode?: string;
    issueType?: string;
    issueId?: string;
  }>();

  const isVerifyMode = params.mode === "verify";

  const [selectedType, setSelectedType] = useState<IssueType | null>("OTHER");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Sync issue type from verify flow params (params may arrive after first render)
  useEffect(() => {
    if (isVerifyMode && params.issueType) {
      setSelectedType(params.issueType as IssueType);
    }
  }, [isVerifyMode, params.issueType]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(true);
  const [gcsPath, setGcsPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const descriptionInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionContainerRef = useRef<View>(null);

  // Location state - fetched in background
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [latitude, setLatitude] = useState<string | null>(null);
  const [longitude, setLongitude] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [addressDetails, setAddressDetails] = useState<Location.LocationGeocodedAddress | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { imageUri, timestamp } = params;

  // Fetch location in background
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError(null);

        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location permission denied");
          Alert.alert(
            "Location Permission Required",
            "Location access is needed to tag the issue location. Please enable it in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        // Get current position with balanced accuracy (faster than highest)
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        setLatitude(location.coords.latitude.toString());
        setLongitude(location.coords.longitude.toString());

        // Get address from coordinates (non-blocking for UI)
        try {
          const [addressResult] = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addressResult) {
            setAddressDetails(addressResult);
            const addressParts = [
              addressResult.street,
              addressResult.city,
            ].filter(Boolean);
            setAddress(addressParts.join(", "));
          }
        } catch {
          console.log("Reverse geocoding failed - using coordinates only");
        }
      } catch (error) {
        console.error("Location error:", error);
        setLocationError("Failed to get location");
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocation();
  }, []);

  // Handle keyboard showing and scroll input into view
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", () => {
      if (descriptionInputRef.current) {
        descriptionInputRef.current.measure((x, y, width, height, pageX, pageY) => {
          scrollViewRef.current?.scrollTo({
            y: pageY - 150,
            animated: true,
          });
        });
      }
    });

    return () => {
      keyboardShowListener.remove();
    };
  }, []);

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

        // Don't show upload failed alert if it's an auth error - apiClient already handles redirect
        if (errorMessage.includes("Authentication required")) {
          return;
        }

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

  // Build meta_data object from address details
  const locationMetaData = {
    city: addressDetails?.city || null,
    district: addressDetails?.district || addressDetails?.subregion || null,
    street_number: addressDetails?.streetNumber || null,
    street: addressDetails?.street || null,
    region: addressDetails?.region || null,
    sub_region: addressDetails?.subregion || null,
    country: addressDetails?.country || null,
    postal_code: addressDetails?.postalCode || null,
    name: addressDetails?.name || null,
    iso_country_code: addressDetails?.isoCountryCode || null,
    timezone: addressDetails?.timezone || null,
    formatted_address: address || null,
  };

  // Utility function for formatting
  const locationString = isLoadingLocation
    ? "Getting location..."
    : formatLocationString({
        address: address || "",
        lat: latitude || "N/A",
        lng: longitude || "N/A",
      });
  const timestampString = formatDate(timestamp || "");

  const handleSubmit = async () => {
    if (!selectedType || !gcsPath) return;

    // Check if location is available
    if (!latitude || !longitude) {
      Alert.alert(
        "Location Required",
        "We're still getting your location. Please wait a moment and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      if (isVerifyMode && params.issueId) {
        const verifyPayload = {
          issue_action: {
            action: "VERIFY" as const,
            media_urls: [
              {
                location: {
                  lat: latitude,
                  lng: longitude,
                  meta_data: locationMetaData,
                },
                type: "PHOTO",
                url: gcsPath || "",
                description: description,
              },
            ],
          },
        };

        response = await verifyIssue(parseInt(params.issueId, 10), verifyPayload);
      } else {
        const payload = {
          issue: {
            type: selectedType.toUpperCase(),
            location: {
              lat: latitude,
              lng: longitude,
              meta_data: locationMetaData,
            },
            media_urls: [
              {
                location: {
                  lat: latitude,
                  lng: longitude,
                  meta_data: locationMetaData,
                },
                type: "PHOTO",
                url: gcsPath || "",
              },
            ],
            description: description,
          },
        };

        response = await reportIssue(payload);
      }

      setIsSubmitting(false);
      Alert.alert(
        "Success",
        isVerifyMode ? "Issue verified successfully!" : "Issue reported successfully!",
        [
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
              router.replace("/(tabs)");
            },
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to report issue";
      // Don't show error alert if it's an auth error - apiClient already handles redirect
      if (!errorMessage.includes("Authentication required")) {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-gray-50"
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Preview Section */}
        <View className="bg-white shadow-sm">
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 200 }}
            contentFit="cover"
          />
          <TopOverlay
            location={locationString}
            timestamp={timestampString}
            index={0}
          />
        </View>

        {/* Location Status Banner */}
        {isLoadingLocation && (
          <View className="bg-yellow-50 p-4 mx-3 mt-3 rounded-xl border border-yellow-200">
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#CA8A04" />
              <CustomText className="ml-3 text-yellow-700 font-medium">Getting location...</CustomText>
            </View>
          </View>
        )}

        {locationError && (
          <View className="bg-red-50 p-4 mx-3 mt-3 rounded-xl border border-red-200">
            <View className="flex-row items-center">
              <MaterialIcons name="location-off" size={20} color="#DC2626" />
              <CustomText className="ml-3 text-red-700 font-medium">{locationError}</CustomText>
            </View>
          </View>
        )}

        {!isLoadingLocation && latitude && longitude && (
          <View className="bg-green-50 p-4 mx-3 mt-3 rounded-xl border border-green-200">
            <View className="flex-row items-center">
              <MaterialIcons name="location-on" size={20} color="#16A34A" />
              <CustomText className="ml-3 text-green-700 font-medium">Location captured</CustomText>
            </View>
          </View>
        )}

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
            <MaterialIcons name={isVerifyMode ? "verified" : "report-problem"} size={24} color="#256D1B" />
            <CustomText className="ml-2 text-xl font-bold">
              {isVerifyMode ? "Verify Issue" : "Report Issue"}
            </CustomText>
          </View>

          {/* Issue Type Section */}
          <View className="mb-4">
            <View className="flex-row items-center mb-3">
              <MaterialIcons name="category" size={20} color="#256D1B" />
              <CustomText className="ml-2 font-bold text-base">Issue Type</CustomText>
            </View>

            <TouchableOpacity
              onPress={() => !isVerifyMode && setDropdownVisible(true)}
              disabled={isVerifyMode}
              className={`flex-row items-center justify-between border-2 border-gray-200 rounded-xl px-4 py-4 ${isVerifyMode ? "bg-gray-100" : "bg-gray-50"}`}
            >
              <View className="flex-row items-center flex-1">
                {selectedType && (
                  <MaterialIcons
                    name={ISSUE_TYPES.find((t) => t.id === selectedType)?.icon as any}
                    size={24}
                    color={isVerifyMode ? "#6b7280" : "#256D1B"}
                  />
                )}
                <CustomText
                  className={`ml-3 text-base ${selectedType ? "text-gray-900 font-medium" : "text-gray-400"}`}
                >
                  {selectedTypeLabel || "Select issue type"}
                </CustomText>
              </View>
              {!isVerifyMode && <MaterialIcons name="arrow-drop-down" size={28} color="#256D1B" />}
              {isVerifyMode && <MaterialIcons name="lock" size={20} color="#9ca3af" />}
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View className="mb-4" ref={descriptionContainerRef}>
            <View className="flex-row items-center mb-3">
              <MaterialIcons name="description" size={20} color="#256D1B" />
              <CustomText className="ml-2 font-bold text-base">Description (Optional)</CustomText>
            </View>

            <TextInput
              ref={descriptionInputRef}
              placeholder="Add details about the issue..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}

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

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!selectedType || isSubmitting || isUploading || !gcsPath || isLoadingLocation}
            className={`mt-2 py-4 rounded-xl items-center flex-row justify-center ${
              selectedType && !isSubmitting && !isUploading && gcsPath && !isLoadingLocation ? "bg-[#256D1B]" : "bg-gray-300"
            }`}
            style={{ elevation: selectedType && gcsPath && !isLoadingLocation ? 2 : 0 }}
          >
            <MaterialIcons
              name="check-circle"
              size={24}
              color={selectedType && !isSubmitting && !isUploading && gcsPath && !isLoadingLocation ? "white" : "#999"}
            />
            <CustomText
              className={`ml-2 font-bold text-lg ${
                selectedType && !isSubmitting && !isUploading && gcsPath && !isLoadingLocation ? "text-white" : "text-gray-500"
              }`}
            >
              {isLoadingLocation ? "Getting Location..." : isUploading ? "Uploading..." : isSubmitting ? "Submitting..." : isVerifyMode ? "Verify Issue" : "Submit Report"}
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer for keyboard scrolling */}
        <View style={{ height: 300 }} />

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
    </KeyboardAvoidingView>
  );
}
