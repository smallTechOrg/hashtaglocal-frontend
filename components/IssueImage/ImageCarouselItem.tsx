import { getCrashlytics, log, recordError as recordCrashError } from "@react-native-firebase/crashlytics";
import { Image } from 'expo-image';
import React, { useRef } from 'react';
import { ImageSourcePropType, Pressable, Image as RNImage, View } from 'react-native';

interface ImageCarouselItemProps {
  imageSource: ImageSourcePropType | { uri: string };
  thumbnailSource?: { uri: string };
  index: number;
  width: number;
  height: number;
  hasError: boolean;
  onError: (index: number) => void;
  onPress?: () => void;
  children?: React.ReactNode;
}

const ImageCarouselItem: React.FC<ImageCarouselItemProps> = ({
  imageSource,
  thumbnailSource,
  index,
  width,
  height,
  hasError,
  onError,
  onPress,
  children
}) => {
  const loadStartRef = useRef<number | null>(null);
  const rnLoadStartRef = useRef<number | null>(null);
  const thumbLoadStartRef = useRef<number | null>(null);

  return (
    <View
      key={`image-${index}`}
      className="relative"
      style={{ width, height }}
    >
      <Pressable onPress={onPress} style={{ width: '100%', height: '100%' }}>
        {hasError ? (
          // Fallback to React Native Image if expo-image fails
          <RNImage
            source={imageSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onLoadStart={() => {
              rnLoadStartRef.current = Date.now();
              console.log(`[ImageTiming] carousel  index=${index}  renderer=RNImage  mainImage load started (fallback)`);
            }}
            onLoad={() => {
              const duration = rnLoadStartRef.current != null ? Date.now() - rnLoadStartRef.current : -1;
              console.log(`[ImageTiming] carousel  index=${index}  renderer=RNImage  mainImage loaded in ${duration}ms`);
              rnLoadStartRef.current = null;
            }}
            onError={(error: any) => {
              const duration = rnLoadStartRef.current != null ? Date.now() - rnLoadStartRef.current : -1;
              console.log(`[ImageTiming] carousel  index=${index}  renderer=RNImage  mainImage error after ${duration}ms`);
              rnLoadStartRef.current = null;
              console.error(`[IssueImage] RN Image also failed for ${index}:`, error);
              const crashlytics = getCrashlytics();
              log(crashlytics, `Image render failed (both expo-image and RN Image) at index ${index}`);
              recordCrashError(crashlytics, new Error(`Image render fallback also failed at index ${index}`));
            }}
          />
        ) : (
          <Image
            source={imageSource}
            placeholder={thumbnailSource}
            placeholderContentFit="cover"
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            onLoadStart={() => {
              loadStartRef.current = Date.now();
              console.log(`[ImageTiming] carousel  index=${index}  renderer=expo-image  hasThumbnail=${!!thumbnailSource}  mainImage load started`);
            }}
            onLoad={(event) => {
              const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
              const { width: w, height: h } = event.source;
              console.log(`[ImageTiming] carousel  index=${index}  renderer=expo-image  mainImage loaded in ${duration}ms  (${w}×${h})`);
              loadStartRef.current = null;
            }}
            onError={(error) => {
              const duration = loadStartRef.current != null ? Date.now() - loadStartRef.current : -1;
              console.log(`[ImageTiming] carousel  index=${index}  renderer=expo-image  mainImage error after ${duration}ms`);
              loadStartRef.current = null;
              console.error(`[IssueImage] Error loading image ${index}:`, error);
              const crashlytics = getCrashlytics();
              log(crashlytics, `expo-image failed to load at index ${index}, falling back to RN Image`);
              recordCrashError(crashlytics, new Error(`Image load error at index ${index}: ${JSON.stringify(error)}`));
              onError(index);
            }}
          />
        )}
      </Pressable>

      {/* Hidden 0×0 image purely for thumbnail load timing.
          expo-image only fires onLoad* for `source`, not for `placeholder`,
          so we need a separate render to measure thumbnail load time. */}
      {thumbnailSource && (
        <Image
          source={thumbnailSource}
          style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
          cachePolicy="memory-disk"
          onLoadStart={() => {
            thumbLoadStartRef.current = Date.now();
            console.log(`[ImageTiming] carousel  index=${index}  renderer=expo-image  thumbnail load started`);
          }}
          onLoad={(event) => {
            const duration = thumbLoadStartRef.current != null ? Date.now() - thumbLoadStartRef.current : -1;
            const { width: w, height: h } = event.source;
            console.log(`[ImageTiming] carousel  index=${index}  renderer=expo-image  thumbnail loaded in ${duration}ms  (${w}×${h})`);
            thumbLoadStartRef.current = null;
          }}
          onError={() => {
            const duration = thumbLoadStartRef.current != null ? Date.now() - thumbLoadStartRef.current : -1;
            console.log(`[ImageTiming] carousel  index=${index}  renderer=expo-image  thumbnail error after ${duration}ms`);
            thumbLoadStartRef.current = null;
          }}
        />
      )}

      {children}
    </View>
  );
};

export default ImageCarouselItem;
