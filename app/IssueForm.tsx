import BottomSheetPicker from "@/components/BottomSheetPicker";
import CustomText from "@/components/CustomText";
import DescriptionInput from "@/components/IssueForm/DescriptionInput";
import SubmitButtons from "@/components/IssueForm/SubmitButtons";
import TopOverlay from "@/components/IssueImage/TopOverlay";
import StatusBanner from "@/components/IssueForm/StatusBanner";
import { ISSUE_TYPES, IssueType } from "@/constants/issueTypes";
import { useIssueForm } from "@/hooks/useIssueForm";
import { formatDate } from "@/utils/FormatDate";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from "react-native";

export default function IssueForm() {
  const {
    imageUri, timestamp, isUpdateMode,
    selectedIssueType, setSelectedIssueType,
    isTypeDropdownOpen, setIsTypeDropdownOpen,
    description, setDescription,
    descriptionInputRef, scrollViewRef,
    isLoadingLocation, latitude, longitude, locationError, locationString,
    isImageUploading, uploadedImagePath, imageUploadError,
    handleSubmit, isSubmitting, selectedAction,
    isSubmitEnabled, selectedIssueTypeLabel,
  } = useIssueForm();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
      className="flex-1 bg-gray-50"
    >
      <ScrollView ref={scrollViewRef} className="flex-1 bg-gray-50" scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        <View className="bg-white shadow-sm">
          <Image source={{ uri: imageUri }} style={{ width: "100%", height: 450 }} contentFit="cover" />
          <TopOverlay location={locationString} timestamp={formatDate(timestamp || "")} index={0} />
        </View>

        {isLoadingLocation && <StatusBanner variant="loading" message="Getting location..." />}
        {locationError && <StatusBanner variant="error" message={locationError} icon="location-off" />}
        {!isLoadingLocation && latitude && longitude && <StatusBanner variant="success" message="Location captured" icon="location-on" />}
        {isImageUploading && <StatusBanner variant="loading" message="Uploading image..." />}
        {imageUploadError && <StatusBanner variant="error" message="Upload failed. Please retry." />}
        {!isImageUploading && uploadedImagePath && <StatusBanner variant="success" message="Image uploaded successfully!" />}

        <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>
          <View className="flex-row items-center mb-4">
            <MaterialIcons name={isUpdateMode ? "verified" : "report-problem"} size={24} color="#256D1B" />
            <CustomText className="ml-2 text-xl font-bold">{isUpdateMode ? "Verify Issue" : "Report Issue"}</CustomText>
          </View>

          {/* Issue Type */}
          <View className="mb-4">
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
            <TouchableOpacity
              onPress={() => !isUpdateMode && setIsTypeDropdownOpen(true)}
              disabled={isUpdateMode}
              className={`flex-row items-center justify-between border-2 border-gray-200 rounded-xl px-4 py-4 ${isUpdateMode ? "bg-gray-100" : "bg-gray-50"}`}
            >
              <View className="flex-row items-center flex-1">
                {selectedIssueType && (
                  <MaterialIcons name={ISSUE_TYPES.find((t) => t.id === selectedIssueType)?.icon as any} size={24} color={isUpdateMode ? "#6b7280" : "#256D1B"} />
                )}
                <CustomText className="ml-3 text-base text-gray-900 font-medium">
                  {selectedIssueTypeLabel || "Select issue type"}
                </CustomText>
              </View>
              {!isUpdateMode && <MaterialIcons name="arrow-drop-down" size={28} color="#256D1B" />}
              {isUpdateMode && <MaterialIcons name="lock" size={20} color="#9ca3af" />}
            </TouchableOpacity>
          </View>

          <DescriptionInput description={description} onChangeText={setDescription} inputRef={descriptionInputRef} />
          <SubmitButtons isUpdateMode={isUpdateMode} isEnabled={isSubmitEnabled} isSubmitting={isSubmitting} isLoadingLocation={isLoadingLocation} isUploading={isImageUploading} selectedAction={selectedAction} onSubmit={handleSubmit} />
        </View>

        <View style={{ height: 300 }} />
        <BottomSheetPicker visible={isTypeDropdownOpen} onClose={() => setIsTypeDropdownOpen(false)} title="Select Issue Type" items={ISSUE_TYPES} selectedId={selectedIssueType} onSelect={(id) => setSelectedIssueType(id as IssueType)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
