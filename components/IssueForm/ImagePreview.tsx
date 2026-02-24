import TopOverlay from "@/components/IssueImage/TopOverlay";
import { Image } from "expo-image";
import { View } from "react-native";

/**
 * Displays the captured image with location and timestamp overlay
 */
interface ImagePreviewProps {
  imageUri: string;
  location: string;
  timestamp: string;
}

export default function ImagePreview({ imageUri, location, timestamp }: ImagePreviewProps) {
  return (
    <View className="bg-white shadow-sm">
      <Image source={{ uri: imageUri }} style={{ width: "100%", height: 450 }} contentFit="cover" />
      <TopOverlay location={location} timestamp={timestamp} index={0} />
    </View>
  );
}
