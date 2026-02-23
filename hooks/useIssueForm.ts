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

  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [description, setDescription] = useState("");
  const descriptionInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isUpdateMode && IssueFormParams.issueType) setSelectedType(IssueFormParams.issueType as IssueType);
  }, [isUpdateMode, IssueFormParams.issueType]);

  useEffect(() => {
    setDescription("");
    if (!isUpdateMode) setSelectedType(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [imageUri, isUpdateMode]);

  const { isLoadingLocation, latitude, longitude, locationError, locationMetaData, locationString } = useLocation(imageUri);
  const { isUploading, gcsPath, uploadError } = useImageUpload(imageUri);
  useKeyboardScroll(scrollViewRef, descriptionInputRef);
  const { handleSubmit, isSubmitting, selectedAction } = useIssueSubmit({
    selectedType, gcsPath, latitude, longitude, description,
    locationMetaData, isUpdateMode, issueId: IssueFormParams.issueId,
  });

  const isEnabled = !!selectedType && !isSubmitting && !isUploading && !!gcsPath && !isLoadingLocation;
  const selectedTypeLabel = ISSUE_TYPES.find((t) => t.id === selectedType)?.label;

  return {
    imageUri, timestamp, isUpdateMode,
    selectedType, setSelectedType,
    dropdownVisible, setDropdownVisible,
    description, setDescription,
    descriptionInputRef, scrollViewRef,
    isLoadingLocation, latitude, longitude, locationError, locationMetaData, locationString,
    isUploading, gcsPath, uploadError,
    handleSubmit, isSubmitting, selectedAction,
    isEnabled, selectedTypeLabel,
  };
}
