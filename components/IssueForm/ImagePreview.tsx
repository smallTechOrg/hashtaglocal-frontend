import TopOverlay from "@/components/IssueImage/TopOverlay";
import { Image } from "expo-image";
import { useRef } from "react";
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
  const loadStartRef = useRef<number | null>(null);
  return (
    <View className="bg-white shadow-sm">
      <Image
        source={{ uri: imageUri }}
        style={{ width: "100%", height: 450 }}
        contentFit="cover"
        onLoadStart={() => {
          loadStartRef.current = Date.now();
          console.log(`[ImageTiming] formPreview  renderer=expo-image  load started`);
        }}
        onLoad={(event) => {
          const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
          const { width: w, height: h } = event.source;
          console.log(`[ImageTiming] formPreview  renderer=expo-image  loaded in ${duration}ms  (${w}×${h})`);
          loadStartRef.current = null;
        }}
      />
      <TopOverlay location={location} timestamp={timestamp} index={0} />
    </View>
  );
}
