import { IMAGE_SLOW_LOAD_THRESHOLD_MS } from '@/constants/imageConfig';
import { ImageTraceHandle, startImageTrace } from '@/utils/imagePerf';
import { getCrashlytics, log, recordError as recordCrashError } from "@react-native-firebase/crashlytics";
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
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
  const traceRef = useRef<ImageTraceHandle | null>(null);
  const rnTraceRef = useRef<ImageTraceHandle | null>(null);
  const thumbTraceRef = useRef<ImageTraceHandle | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;
  // Incrementing this key forces expo-image to unmount/remount (retry)
  const [retryKey, setRetryKey] = useState(0);

  const imageUri = typeof imageSource === 'object' && 'uri' in imageSource ? imageSource.uri : String(imageSource);
  useEffect(() => {
    retryCountRef.current = 0;
    setRetryKey(0);
  }, [imageUri]);

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
              console.log(`[ImageLoad] START  carousel-RNfallback  index=${index}`);
              rnTraceRef.current = startImageTrace({
                component: 'carousel',
                imageType: 'mainImage',
                renderer: 'RNImage',
                index,
              });
            }}
            onLoad={() => {
              const duration = rnTraceRef.current?.stop(true) ?? -1;
              rnTraceRef.current = null;
              console.log(`[ImageLoad] DONE   carousel-RNfallback  index=${index}  ${duration}ms${duration < 80 ? '  (cache)' : '  (network)'}`);
              if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
                const crashlytics = getCrashlytics();
                log(crashlytics, `Slow image load: index=${index} renderer=RNImage duration=${duration}ms`);
                recordCrashError(crashlytics, new Error(`[ImagePerf] RNImage slow load at index ${index}: ${duration}ms`));
              }
              rnLoadStartRef.current = null;
            }}
            onError={(error: any) => {
              rnTraceRef.current?.stop(false);
              rnTraceRef.current = null;
              rnLoadStartRef.current = null;
              console.log(`[ImageLoad] ERROR  carousel-RNfallback  index=${index}`);
              console.error(`[IssueImage] RN Image also failed for ${index}:`, error);
              const crashlytics = getCrashlytics();
              log(crashlytics, `Image render failed (both expo-image and RN Image) at index ${index}`);
              recordCrashError(crashlytics, new Error(`Image render fallback also failed at index ${index}`));
            }}
          />
        ) : (
          <Image
            key={retryKey}
            source={imageSource}
            placeholder={thumbnailSource}
            placeholderContentFit="cover"
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            onLoadStart={() => {
              loadStartRef.current = Date.now();
              console.log(`[ImageLoad] START  carousel-main  index=${index}`);
              traceRef.current = startImageTrace({
                component: 'carousel',
                imageType: 'mainImage',
                renderer: 'expo-image',
                index,
              });
            }}
            onLoad={(event) => {
              const { width: w, height: h } = event.source;
              const duration = traceRef.current?.stop(true, w, h) ?? -1;
              traceRef.current = null;
              console.log(`[ImageLoad] DONE   carousel-main  index=${index}  ${duration}ms  ${w}×${h}${duration < 80 ? '  (cache)' : '  (network)'}`);
              if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
                const crashlytics = getCrashlytics();
                log(crashlytics, `Slow image load: index=${index} renderer=expo-image duration=${duration}ms (${w}×${h})`);
                recordCrashError(crashlytics, new Error(`[ImagePerf] expo-image slow load at index ${index}: ${duration}ms`));
              }
              loadStartRef.current = null;
            }}
            onError={(error) => {
              traceRef.current?.stop(false);
              traceRef.current = null;
              loadStartRef.current = null;
              if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current += 1;
                console.log(`[ImageLoad] RETRY  carousel-main  index=${index}  attempt=${retryCountRef.current}`);
                setRetryKey((k) => k + 1);
                return;
              }
              console.log(`[ImageLoad] ERROR  carousel-main  index=${index}`);
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
          style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }}
          cachePolicy="memory-disk"
          onLoadStart={() => {
            thumbLoadStartRef.current = Date.now();
            console.log(`[ImageLoad] START  carousel-thumb  index=${index}`);
            thumbTraceRef.current = startImageTrace({
              component: 'carousel',
              imageType: 'thumbnail',
              renderer: 'expo-image',
              index,
            });
          }}
          onLoad={(event) => {
            const { width: w, height: h } = event.source;
            const duration = thumbTraceRef.current?.stop(true, w, h) ?? -1;
            thumbTraceRef.current = null;
            console.log(`[ImageLoad] DONE   carousel-thumb  index=${index}  ${duration}ms  ${w}×${h}${duration < 80 ? '  (cache)' : '  (network)'}`);
            if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
              const crashlytics = getCrashlytics();
              log(crashlytics, `Slow thumbnail load: index=${index} duration=${duration}ms (${w}×${h})`);
              recordCrashError(crashlytics, new Error(`[ImagePerf] expo-image slow thumbnail load at index ${index}: ${duration}ms`));
            }
            thumbLoadStartRef.current = null;
          }}
          onError={() => {
            thumbTraceRef.current?.stop(false);
            thumbTraceRef.current = null;
            thumbLoadStartRef.current = null;
            console.log(`[ImageLoad] ERROR  carousel-thumb  index=${index}`);
            const crashlytics = getCrashlytics();
            log(crashlytics, `Thumbnail failed to load: index=${index}`);
            recordCrashError(crashlytics, new Error(`[ImagePerf] Thumbnail load error at index ${index}: image area blank`));
          }}
        />
      )}

      {children}
    </View>
  );
};

export default ImageCarouselItem;
