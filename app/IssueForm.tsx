import BottomSheetPicker from "@/components/BottomSheetPicker";
import CustomText from "@/components/CustomText";
import DescriptionInput from "@/components/IssueForm/DescriptionInput";
import SubmitButtons from "@/components/IssueForm/SubmitButtons";
import TopOverlay from "@/components/IssueImage/TopOverlay";
import StatusBanner from "@/components/StatusBanner";
import { ISSUE_TYPES, IssueType } from "@/constants/issueTypes";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useIssueSubmit } from "@/hooks/useIssueSubmit";
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll";
import { useLocation } from "@/hooks/useLocation";
import { formatDate } from "@/utils/FormatDate";
import { formatLocationString } from "@/utils/ImageProcessing";
import { getFastLocationWithProgressiveWatch } from "@/utils/LocationService";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";

export default function IssueForm() {
  const params = useLocalSearchParams<{
    imageUri: string;
    timestamp: string;
    mode?: string;
    issueType?: string;
    issueId?: string;
  }>();

  const isUpdateMode = params.mode === "update";
  const { imageUri, timestamp } = params;

  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [selectedAction, setSelectedAction] = useState<"VERIFY" | "RESOLVE" | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [description, setDescription] = useState("");
  const descriptionInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isUpdateMode && params.issueType) setSelectedType(params.issueType as IssueType);
  }, [isUpdateMode, params.issueType]);

  useEffect(() => {
    setDescription("");
    setGcsPath(null);
    setUploadError(null);
    if (!isUpdateMode) {
      setSelectedType(null);
    }
    setLatitude(null);
    setLongitude(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [imageUri, isUpdateMode]);

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
        const result = await getFastLocationWithProgressiveWatch({
            instantLoad: false,
            accuracyThresholdMeters: 15,
            timeoutMs: 20000,
          });

        console.log("Location fetch result:", result);

        setLatitude(result.location.latitude.toString());
        setLongitude(result.location.longitude.toString());

        // Get address from coordinates (non-blocking for UI)
        try {
          const [addressResult] = await Location.reverseGeocodeAsync({
            latitude: result.location.latitude,
            longitude: result.location.longitude,
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
  }, [imageUri]);

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

  const isEnabled = !!selectedType && !isSubmitting && !isUploading && !!gcsPath && !isLoadingLocation;
  const selectedTypeLabel = ISSUE_TYPES.find((t) => t.id === selectedType)?.label;
  const timestampString = formatDate(timestamp || "");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
      className="flex-1 bg-gray-50"
    >
      <ScrollView ref={scrollViewRef} className="flex-1 bg-gray-50" scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        <View className="bg-white shadow-sm">
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 450 }}
            contentFit="cover"
          />
          <TopOverlay
            location={locationString}
            timestamp={timestampString}
            index={0}
          />
        </View>

        {isLoadingLocation && <StatusBanner variant="loading" message="Getting location..." />}
        {locationError && <StatusBanner variant="error" message={locationError} icon="location-off" />}
        {!isLoadingLocation && latitude && longitude && <StatusBanner variant="success" message="Location captured" icon="location-on" />}
        {isUploading && <StatusBanner variant="loading" message="Uploading image..." />}
        {uploadError && <StatusBanner variant="error" message="Upload failed. Please retry." />}
        {!isUploading && gcsPath && <StatusBanner variant="success" message="Image uploaded successfully!" />}

        <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>
          <View className="flex-row items-center mb-4">
            <MaterialIcons name={isUpdateMode ? "verified" : "report-problem"} size={24} color="#256D1B" />
            <CustomText className="ml-2 text-xl font-bold">{isUpdateMode ? "Verify Issue" : "Report Issue"}</CustomText>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <MaterialIcons name="category" size={20} color="#256D1B" />
                <CustomText className="ml-2 font-bold text-base">Issue Type</CustomText>
                {!isUpdateMode && <CustomText className="ml-1 text-red-500 font-bold text-base">*</CustomText>}
              </View>
              {!isUpdateMode && !selectedType && (
                <CustomText className="text-xs text-red-500 font-medium">Required</CustomText>
              )}
            </View>
            <TouchableOpacity
              onPress={() => !isUpdateMode && setDropdownVisible(true)}
              disabled={isUpdateMode}
              className={`flex-row items-center justify-between border-2 rounded-xl px-4 py-4 ${isUpdateMode ? "bg-gray-100 border-gray-200"  : "bg-gray-50 border-gray-200"}`}
            >
              <View className="flex-row items-center flex-1">
                {selectedType && (
                  <MaterialIcons name={ISSUE_TYPES.find((t) => t.id === selectedType)?.icon as any} size={24} color={isUpdateMode ? "#6b7280" : "#256D1B"} />
                )}
                <CustomText
                  className={`ml-3 text-base ${ "text-gray-900 font-medium" }`}
                >
                  {selectedTypeLabel || "Select issue type"}
                </CustomText>
              </View>
              {!isUpdateMode && <MaterialIcons name="arrow-drop-down" size={28} color="#256D1B" />}
              {isUpdateMode && <MaterialIcons name="lock" size={20} color="#9ca3af" />}
            </TouchableOpacity>
          </View>

          <DescriptionInput description={description} onChangeText={setDescription} inputRef={descriptionInputRef} />
          <SubmitButtons isUpdateMode={isUpdateMode} isEnabled={isEnabled} isSubmitting={isSubmitting} isLoadingLocation={isLoadingLocation} isUploading={isUploading} selectedAction={selectedAction} onSubmit={handleSubmit} />
        </View>

        <View style={{ height: 300 }} />
        <BottomSheetPicker visible={dropdownVisible} onClose={() => setDropdownVisible(false)} title="Select Issue Type" items={ISSUE_TYPES} selectedId={selectedType} onSelect={(id) => setSelectedType(id as IssueType)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
