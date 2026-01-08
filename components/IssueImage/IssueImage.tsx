import React, { useState } from 'react';
import { Dimensions, ImageSourcePropType, ScrollView, View } from 'react-native';
import '../../global.css';
import BottomOverlay from './BottomOverlay';
import EmptyImagePlaceholder from './EmptyImagePlaceholder';
import ImageCarouselItem from './ImageCarouselItem';
import PaginationDots from './PaginationDots';
import TopOverlay from './TopOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 16;

interface IssueImageProps {
  imageSource?: ImageSourcePropType | string;
  imageSources?: (ImageSourcePropType | string)[];
  location?: string;
  timestamp?: string;
  daysActive?: string;
  className?: string;
  onShare?: () => void;
}

const IssueImage: React.FC<IssueImageProps> = ({
  imageSource,
  imageSources,
  location,
  timestamp,
  daysActive,
  className,
  onShare
}) => {
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Support both single image and multiple images
  const images = imageSources && imageSources.length > 0
    ? imageSources
    : imageSource
      ? [imageSource]
      : [];

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  return (
    <View className={`w-full relative overflow-hidden rounded-xl ${className ?? ""}`}>
      {images.length > 0 ? (
        <View className="w-full" style={{ height: 256 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: '100%' }}
            contentContainerStyle={{ width: SLIDE_WIDTH * images.length }}
          >
            {images.map((img, index) => {
              const imageSource = typeof img === 'string' ? { uri: img } : img;

              return (
                <ImageCarouselItem
                  key={`image-${index}`}
                  imageSource={imageSource}
                  index={index}
                  width={SLIDE_WIDTH}
                  height={256}
                  hasError={imageErrors[index] || false}
                  onError={handleImageError}
                >
                  <TopOverlay
                    location={location}
                    timestamp={timestamp}
                    index={index}
                  />
                  <BottomOverlay
                    daysActive={daysActive}
                    onShare={onShare}
                    index={index}
                  />
                </ImageCarouselItem>
              );
            })}
          </ScrollView>

          <PaginationDots
            totalImages={images.length}
            currentIndex={currentIndex}
            hasBottomOverlay={!!(daysActive || onShare)}
          />
        </View>
      ) : (
        <EmptyImagePlaceholder />
      )}
    </View>
  );
};

export default IssueImage;