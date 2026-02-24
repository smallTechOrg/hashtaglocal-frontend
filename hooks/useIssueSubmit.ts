import {
  reportIssue,
  verifyIssue,
  resolveIssue,
} from "@/api/IssueDetail";
import { IssueSubmitParams } from "@/models/IssueSubmitParams";
import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export function useIssueSubmit({
  selectedType,
  gcsPath,
  latitude,
  longitude,
  description,
  locationMetaData,
  isUpdateMode,
  issueId,
}: IssueSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "VERIFY" | "RESOLVE" | null
  >(null);

  const handleSubmit = async (action?: "VERIFY" | "RESOLVE") => {
    if (!selectedType || !gcsPath) return;

    if (!latitude || !longitude) {
      Alert.alert(
        "Location Required",
        "We're still getting your location. Please wait a moment and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    if (isUpdateMode) {
      setSelectedAction(action || null);
    }
    setIsSubmitting(true);

    try {
      const mediaEntry = {
        location: { lat: latitude, lng: longitude, meta_data: locationMetaData },
        type: "PHOTO" as const,
        url: gcsPath,
        description,
      };

      let response;

      if (isUpdateMode && issueId && action === "VERIFY") {
        response = await verifyIssue(parseInt(issueId, 10), {
          issue_action: { action: "VERIFY", media_urls: [mediaEntry] },
        });
      } else if (isUpdateMode && issueId && action === "RESOLVE") {
        const { description: _, ...mediaWithoutDesc } = mediaEntry;
        response = await resolveIssue(parseInt(issueId, 10), {
          issue_action: { action: "RESOLVE", media_urls: [mediaWithoutDesc] },
        });
      } else {
        response = await reportIssue({
          issue: {
            type: selectedType.toUpperCase(),
            location: {
              lat: latitude,
              lng: longitude,
              meta_data: locationMetaData,
            },
            media_urls: [mediaEntry],
            description,
          },
        });
      }

      const successMessage =
        action === "VERIFY"
          ? "Issue verified successfully!"
          : action === "RESOLVE"
            ? "Thank you for resolving this issue!\n\nOnce our community reviews the status will be updated. Till then, the status will show as Pending and will be visible to others."
            : "Issue reported successfully!\n\nThe issue is currently on hold and will be reviewed by our admin before it is made public.";

      setIsSubmitting(false);
      Alert.alert("Success", successMessage, [
        {
          text: "View Issue",
          onPress: () => {
            router.replace({
              pathname: "/issueDetail",
              params: {
                id: response.data.issue_id.toString(),
                refresh: Date.now().toString(),
              },
            });
          },
        },
        {
          text: "Go Home",
          onPress: () => router.replace("/(tabs)"),
          style: "cancel",
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update issue";
      if (!errorMessage.includes("Authentication required")) {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false);
      setSelectedAction(null);
    }
  };

  return { handleSubmit, isSubmitting, selectedAction };
}
