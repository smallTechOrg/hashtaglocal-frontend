import TopOverlay from "@/components/IssueImage/TopOverlay";
import { IMAGE_SLOW_LOAD_THRESHOLD_MS } from '@/constants/imageConfig';
import { getCrashlytics, log, recordError as recordCrashError } from '@react-native-firebase/crashlytics';
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
          if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
            const crashlytics = getCrashlytics();
            log(crashlytics, `Slow form preview image load: duration=${duration}ms (${w}×${h}) — preview stays blank during load`);
            recordCrashError(crashlytics, new Error(`[ImagePerf] ImagePreview slow load: ${duration}ms`));
          }
          loadStartRef.current = null;
        }}
        onError={(error) => {
          const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
          console.log(`[ImageTiming] formPreview  renderer=expo-image  error after ${duration}ms`);
          loadStartRef.current = null;
          const crashlytics = getCrashlytics();
          log(crashlytics, `Form preview image failed to load after ${duration}ms — preview area blank`);
          recordCrashError(crashlytics, new Error(`[ImagePerf] ImagePreview error after ${duration}ms: ${JSON.stringify(error)}`));
        }}
      />
      <TopOverlay location={location} timestamp={timestamp} index={0} />
    </View>
  );
}
