import { IMAGE_SLOW_LOAD_THRESHOLD_MS } from '@/constants/imageConfig';
import { ImageTraceHandle, startImageTrace } from '@/utils/imagePerf';
import { MaterialIcons } from '@expo/vector-icons';
import { getCrashlytics, log, recordError as recordCrashError } from '@react-native-firebase/crashlytics';
import { Image } from 'expo-image';
import React from 'react';
import { ImageSourcePropType, Modal, ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaginationDots from './PaginationDots';

interface FullScreenImageViewerProps {
  visible: boolean;
  onClose: () => void;
  imageSources: (ImageSourcePropType | string)[];
  initialIndex?: number;
}

const FullScreenImageViewer: React.FC<FullScreenImageViewerProps> = ({
  visible,
  onClose,
  imageSources,
  initialIndex = 0
}) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const loadStartTimesRef = React.useRef<Record<number, number>>({});
  const traceHandlesRef = React.useRef<Record<number, ImageTraceHandle>>({});

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  React.useEffect(() => {
    if (visible && scrollViewRef.current) {
      // Scroll to the initial index when modal opens
      scrollViewRef.current.scrollTo({ x: SCREEN_WIDTH * initialIndex, animated: false });
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: top + 12,
            right: 16,
            zIndex: 10,
            padding: 8,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Image Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {imageSources.map((img, index) => {
            const imageUri = typeof img === 'string' ? img : (img as any).uri;
            const cacheKey = imageUri?.split('?')[0];

            return (
              <View
                key={`fullscreen-image-${index}`}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                 <Image
                   source={{ uri: imageUri, cacheKey }}
                   style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                   contentFit="contain"
                   transition={200}
                   cachePolicy="memory-disk"
                   onLoadStart={() => {
                    loadStartTimesRef.current[index] = Date.now();
                    console.log(`[ImageLoad] START  fullscreen  index=${index}`);
                    traceHandlesRef.current[index] = startImageTrace({
                      component: 'fullscreen',
                      imageType: 'mainImage',
                      renderer: 'expo-image',
                      index,
                    });
                  }}
                  onLoad={(event) => {
                    const { width: w, height: h } = event.source;
                    const duration = traceHandlesRef.current[index]?.stop(true, w, h) ?? -1;
                    delete traceHandlesRef.current[index];
                    console.log(`[ImageLoad] DONE   fullscreen  index=${index}  ${duration}ms  ${w}×${h}${duration < 80 ? '  (cache)' : '  (network)'}`);
                    if (duration > IMAGE_SLOW_LOAD_THRESHOLD_MS) {
                      const crashlytics = getCrashlytics();
                      log(crashlytics, `Slow fullscreen image load: index=${index} duration=${duration}ms (${w}×${h})`);
                      recordCrashError(crashlytics, new Error(`[ImagePerf] Fullscreen slow load at index ${index}: ${duration}ms`));
                    }
                    delete loadStartTimesRef.current[index];
                  }}
                  onError={() => {
                    traceHandlesRef.current[index]?.stop(false);
                    delete traceHandlesRef.current[index];
                    delete loadStartTimesRef.current[index];
                    console.log(`[ImageLoad] ERROR  fullscreen  index=${index}`);
                    const crashlytics = getCrashlytics();
                    log(crashlytics, `Fullscreen image failed to load at index ${index}`);
                    recordCrashError(crashlytics, new Error(`[ImagePerf] Fullscreen image error at index ${index}`));
                  }}
                />
              </View>
            );
          })}
        </ScrollView>

        {/* Pagination Dots */}
        {imageSources.length > 1 && (
          <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
            <PaginationDots
              totalImages={imageSources.length}
              currentIndex={currentIndex}
    
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

export default FullScreenImageViewer;
