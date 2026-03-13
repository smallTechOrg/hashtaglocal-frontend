import { uploadImage } from "@/api/IssueDetail";
import { getCrashlytics, log, recordError as recordCrashError } from "@react-native-firebase/crashlytics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export function useImageUpload(imageUri: string) {
  const [isUploading, setIsUploading] = useState(true);
  const [gcsPath, setGcsPath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setGcsPath(null);
    setUploadError(null);
  }, [imageUri]);

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
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload image";

        if (errorMessage.includes("Authentication required")) {
          return;
        }

        const crashlytics = getCrashlytics();
        log(crashlytics, `Image upload failed: ${errorMessage}`);
        recordCrashError(crashlytics, error instanceof Error ? error : new Error(errorMessage));

        setUploadError(errorMessage);
        Alert.alert(
          "Upload Failed",
          "Failed to upload the image. Please try again.",
          [
            { text: "Retry", onPress: () => uploadImageToGCS() },
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

  return { isUploading, gcsPath, uploadError };
}
