import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, ImageSourcePropType, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import PaginationDots from './PaginationDots';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const loadStartTimesRef = React.useRef<Record<number, number>>({});

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
            top: 5,
            right: 5,
            zIndex: 10,
            padding: 5,
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
            const imageSource = typeof img === 'string' ? { uri: img } : img;

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
                  source={imageSource}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  contentFit="contain"
                  transition={200}
                  onLoadStart={() => {
                    loadStartTimesRef.current[index] = Date.now();
                    console.log(`[ImageTiming] fullscreen  index=${index}  renderer=expo-image  mainImage load started`);
                  }}
                  onLoad={(event) => {
                    const start = loadStartTimesRef.current[index];
                    const duration = start != null ? Date.now() - start : -1;
                    const { width: w, height: h } = event.source;
                    console.log(`[ImageTiming] fullscreen  index=${index}  renderer=expo-image  mainImage loaded in ${duration}ms  (${w}×${h})`);
                    delete loadStartTimesRef.current[index];
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
