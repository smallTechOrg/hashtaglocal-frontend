import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ImageSourcePropType, ScrollView, View } from 'react-native';
import '../../global.css';
import CustomText from '../CustomText';
import EmptyImagePlaceholder from './EmptyImagePlaceholder';
import FullScreenImageViewer from './FullScreenImageViewer';
import ImageCarouselItem from './ImageCarouselItem';
import PaginationDots from './PaginationDots';

export interface MediaItem {
  url: string;
  description?: string;
  username?: string;
  profile_photo?: string;
  created_at?: string;
  days_active?: string;
}

interface IssueImageProps {
  imageSource?: ImageSourcePropType | string;
  imageSources?: (ImageSourcePropType | string)[];
  mediaItems?: MediaItem[];
  location?: string;
  timestamp?: string;
  className?: string;
}

const IssueImage: React.FC<IssueImageProps> = ({
  imageSource,
  imageSources,
  mediaItems,
  location,
  timestamp,
  className,
}) => {
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Support mediaItems, imageSources, or single imageSource
  const images = mediaItems && mediaItems.length > 0
    ? mediaItems.map(m => m.url)
    : imageSources && imageSources.length > 0
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

  const handleImagePress = () => {
    setIsFullScreenVisible(true);
  };

  const handleCloseFullScreen = () => {
    setIsFullScreenVisible(false);
  };

  // Get current media item for the card section
  const currentMediaItem = mediaItems?.[currentIndex];

  return (
    <>
      <View className={`w-full relative overflow-hidden ${className ?? ""}`}>
        {images.length > 0 ? (
          <View
            className="w-full"
            style={{ height: 450, overflow: 'hidden' }}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {containerWidth > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ width: containerWidth }}
                contentContainerStyle={{ width: containerWidth * images.length }}
              >
                {images.map((img, index) => {
                  const imageSource = typeof img === 'string' ? { uri: img } : img;

                  return (
                    <ImageCarouselItem
                      key={`image-${index}`}
                      imageSource={imageSource}
                      index={index}
                      width={containerWidth}
                      height={450}
                      hasError={imageErrors[index] || false}
                      onError={handleImageError}
                      onPress={handleImagePress}
                    >
                    </ImageCarouselItem>
                  );
                })}
              </ScrollView>
            )}

            <PaginationDots
              totalImages={images.length}
              currentIndex={currentIndex}
            
            />
          </View>
        ) : (
          <EmptyImagePlaceholder />
        )}

        {/* Media Info Card - updates with slideshow */}
        {mediaItems && mediaItems.length > 0 && (currentMediaItem?.description || currentMediaItem?.username) && (
          <View className="p-4 bg-white">
            {/* First Row - Date/Time on left, Username on right */}
            {(currentMediaItem?.days_active || currentMediaItem?.username) && (
              <View className="flex-row items-center justify-between mb-3">
                {/* Left - Date/Time */}
                {currentMediaItem?.days_active && (
                  <View className="flex-row items-center">
                    <MaterialIcons name="access-time" size={16} color="#666" />
                    <CustomText className="ml-1 text-gray-500 text-sm">
                      {currentMediaItem.days_active}
                    </CustomText>
                  </View>
                )}
                
                {/* Right - Username */}
                {currentMediaItem?.username && (
                  <View className="flex-row items-center">
                    {currentMediaItem?.profile_photo && (
                      <Image
                        source={{ uri: currentMediaItem.profile_photo }}
                        style={{ width: 28, height: 28, borderRadius: 14 }}
                      />
                    )}
                    <CustomText className={`text-gray-600 text-sm ${currentMediaItem?.profile_photo ? 'ml-2' : ''}`}>
                      <CustomText className="font-bold">{currentMediaItem.username}</CustomText>
                    </CustomText>
                  </View>
                )}
              </View>
            )}
            
            {/* Second Row - Description full width */}
            {currentMediaItem?.description && (
              <CustomText className="text-gray-700">
                {currentMediaItem.description}
              </CustomText>
            )}
          </View>
        )}
      </View>

      <FullScreenImageViewer
        visible={isFullScreenVisible}
        onClose={handleCloseFullScreen}
        imageSources={images}
        initialIndex={currentIndex}
      />
    </>
  );
};

export default IssueImage;