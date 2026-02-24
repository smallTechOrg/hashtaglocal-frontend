import BottomSheetPicker from "@/components/BottomSheetPicker";
import DescriptionInput from "@/components/IssueForm/DescriptionInput";
import FormHeader from "@/components/IssueForm/FormHeader";
import ImagePreview from "@/components/IssueForm/ImagePreview";
import IssueTypeSelector from "@/components/IssueForm/IssueTypeSelector";
import StatusBannersGroup from "@/components/IssueForm/StatusBannersGroup";
import SubmitButtons from "@/components/IssueForm/SubmitButtons";
import { ISSUE_TYPES, IssueType } from "@/constants/issueTypes";
import { useIssueForm } from "@/hooks/useIssueForm";
import { formatDate } from "@/utils/FormatDate";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

/**
 * IssueForm - Main form for reporting or verifying issues
 * 
 * Handles the complete workflow:
 * 1. Displays captured image with location overlay
 * 2. Shows location and image upload status
 * 3. Allows selecting issue type and adding description
 * 4. Submits to report new issue or verify/resolve existing one
 */
export default function IssueForm() {
  const {
    // Image & mode
    imageUri,
    timestamp,
    isUpdateMode,

    // Form fields & state
    selectedIssueType,
    setSelectedIssueType,
    selectedIssueTypeLabel,
    isTypeDropdownOpen,
    setIsTypeDropdownOpen,
    description,
    setDescription,

    // Refs
    descriptionInputRef,
    scrollViewRef,

    // Location tracking
    isLoadingLocation,
    latitude,
    longitude,
    locationError,
    locationString,

    // Image upload
    isImageUploading,
    uploadedImagePath,
    imageUploadError,

    // Submission
    handleSubmit,
    isSubmitting,
    selectedAction,
    isSubmitEnabled,
  } = useIssueForm();

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
        {/* Image preview with location and timestamp */}
        <ImagePreview
          imageUri={imageUri}
          location={locationString}
          timestamp={formatDate(timestamp || "")}
        />

        {/* Status indicators for location and upload */}
        <StatusBannersGroup
          isLoadingLocation={isLoadingLocation}
          locationError={locationError}
          latitude={latitude}
          longitude={longitude}
          isImageUploading={isImageUploading}
          imageUploadError={imageUploadError}
          uploadedImagePath={uploadedImagePath}
        />

        {/* Main form card */}
        <View className="bg-white p-5 mt-3 mx-3 rounded-xl shadow-md" style={{ elevation: 3 }}>
          <FormHeader isUpdateMode={isUpdateMode} />

          <IssueTypeSelector
            selectedIssueType={selectedIssueType}
            selectedIssueTypeLabel={selectedIssueTypeLabel}
            isUpdateMode={isUpdateMode}
            onPress={() => !isUpdateMode && setIsTypeDropdownOpen(true)}
          />

          <DescriptionInput
            description={description}
            onChangeText={setDescription}
            inputRef={descriptionInputRef}
          />

          <SubmitButtons
            isUpdateMode={isUpdateMode}
            isEnabled={isSubmitEnabled}
            isSubmitting={isSubmitting}
            isLoadingLocation={isLoadingLocation}
            isUploading={isImageUploading}
            selectedAction={selectedAction}
            onSubmit={handleSubmit}
          />
        </View>

        {/* Bottom spacing for keyboard */}
        <View style={{ height: 300 }} />
      </ScrollView>

      {/* Issue type picker modal */}
      <BottomSheetPicker
        visible={isTypeDropdownOpen}
        onClose={() => setIsTypeDropdownOpen(false)}
        title="Select Issue Type"
        items={ISSUE_TYPES}
        selectedId={selectedIssueType}
        onSelect={(id) => setSelectedIssueType(id as IssueType)}
      />
    </KeyboardAvoidingView>
  );
}
