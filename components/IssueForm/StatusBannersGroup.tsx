import StatusBanner from "./StatusBanner";

/**
 * Displays all status banners for location and image upload states
 */
interface StatusBannersGroupProps {
  // Location states
  isLoadingLocation: boolean;
  locationError: string | null;
  latitude: string | null;
  longitude: string | null;
  
  // Image upload states
  isImageUploading: boolean;
  imageUploadError: string | null;
  uploadedImagePath: string | null;
}

export default function StatusBannersGroup({
  isLoadingLocation,
  locationError,
  latitude,
  longitude,
  isImageUploading,
  imageUploadError,
  uploadedImagePath,
}: StatusBannersGroupProps) {
  return (
    <>
      {/* Location status banners */}
      {isLoadingLocation && <StatusBanner variant="loading" message="Getting location..." />}
      {locationError && <StatusBanner variant="error" message={locationError} icon="location-off" />}
      {!isLoadingLocation && latitude && longitude && <StatusBanner variant="success" message="Location captured" icon="location-on" />}

      {/* Image upload status banners */}
      {isImageUploading && <StatusBanner variant="loading" message="Uploading image..." />}
      {imageUploadError && <StatusBanner variant="error" message="Upload failed. Please retry." />}
      {!isImageUploading && uploadedImagePath && <StatusBanner variant="success" message="Image uploaded successfully!" />}
    </>
  );
}
