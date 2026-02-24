import { ISSUE_TYPES, IssueType } from "@/constants/issueTypes";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useIssueSubmit } from "@/hooks/useIssueSubmit";
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll";
import { useLocation } from "@/hooks/useLocation";
import type { IssueFormParams as IssueFormParamsType } from "@/models/IssueFormParams";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, TextInput } from "react-native";

export function useIssueForm() {
  const IssueFormParams = useLocalSearchParams() as unknown as IssueFormParamsType;

  const isUpdateMode = IssueFormParams.mode === "update";
  const { imageUri, timestamp } = IssueFormParams;

  const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [description, setDescription] = useState("");
  const descriptionInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isUpdateMode && IssueFormParams.issueType) setSelectedIssueType(IssueFormParams.issueType as IssueType);
  }, [isUpdateMode, IssueFormParams.issueType]);

  useEffect(() => {
    setDescription("");
    if (!isUpdateMode) setSelectedIssueType(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [imageUri, isUpdateMode]);

  const { isLoadingLocation, latitude, longitude, locationError, locationMetaData, locationString } = useLocation(imageUri);
  const { isUploading: isImageUploading, gcsPath: uploadedImagePath, uploadError: imageUploadError } = useImageUpload(imageUri);
  useKeyboardScroll(scrollViewRef, descriptionInputRef);
  const { handleSubmit, isSubmitting, selectedAction } = useIssueSubmit({
    selectedType: selectedIssueType, gcsPath: uploadedImagePath, latitude, longitude, description,
    locationMetaData, isUpdateMode, issueId: IssueFormParams.issueId,
  });

  const isSubmitEnabled = !!selectedIssueType && !isSubmitting && !isImageUploading && !!uploadedImagePath && !isLoadingLocation;
  const selectedIssueTypeLabel = ISSUE_TYPES.find((t) => t.id === selectedIssueType)?.label;

  return {
    imageUri, timestamp, isUpdateMode,
    selectedIssueType, setSelectedIssueType,
    isTypeDropdownOpen, setIsTypeDropdownOpen,
    description, setDescription,
    descriptionInputRef, scrollViewRef,
    isLoadingLocation, latitude, longitude, locationError, locationMetaData, locationString,
    isImageUploading, uploadedImagePath, imageUploadError,
    handleSubmit, isSubmitting, selectedAction,
    isSubmitEnabled, selectedIssueTypeLabel,
  };
}
