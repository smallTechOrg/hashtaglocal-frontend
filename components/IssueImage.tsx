import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Dimensions, ImageSourcePropType, Image as RNImage, TouchableOpacity, View, ScrollView } from 'react-native';
import "../global.css";
import CustomText from './CustomText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  return (
    <View className={`w-full relative overflow-hidden rounded-xl ${className ?? ""}`}>
      {/* Images - Carousel */}
      {images.length > 0 ? (
        <View className="w-full">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >

            {images.map((img, index) => {
              const imageSource = typeof img === 'string'
                ? { uri: img }
                : img;


              return (
                <View
                  key={`image-${index}`}
                  className=" relative"
                  style={{ width: SCREEN_WIDTH, height: 256 }}
                >
                  {imageErrors[index] ? (
                    // Fallback to React Native Image if expo-image fails
                    <RNImage
                      source={imageSource}
                      className="w-full h-full"

                      resizeMode="cover"
                      onError={(error: any) => {
                        console.error(`[IssueImage] ❌ RN Image also failed for ${index}:`, error);
                      }}
                      onLoad={() => {
                        console.log(`[IssueImage] ✅ RN Image loaded ${index}`);
                      }}
                    />
                  ) : (
                    <Image
                      source={imageSource}
                      className="w-full h-full"

                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      onError={(error) => {
                        console.error(`[IssueImage] ❌ Error loading image ${index}:`, error);
                        setImageErrors(prev => ({ ...prev, [index]: true }));
                      }}
                      onLoad={() => {
                        console.log(`[IssueImage] ✅ Successfully loaded image ${index}`);
                      }}
                    />
                  )}


                  {/* Top Overlay: Location & Coordinates - Only on first image */}
                  {(location || timestamp) && (
                    <View className="absolute top-0 left-0 right-0 flex-row items-start bg-white/60 px-2 py-1">
                      <MaterialIcons name="location-on" color="black" size={16} style={{ marginTop: 2 }} />
                      <View className="flex-1 ml-1">
                        {location && (
                          <CustomText className="text-[10px] font-regular" numberOfLines={1}>
                            {location}
                          </CustomText>
                        )}
                        {timestamp && (
                          <CustomText className="text-[9px] text-gray-700 mt-0.5">
                            {timestamp}
                          </CustomText>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Bottom overlay container - Only on first image */}
                  {(daysActive || onShare) && (
                    <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between py-2 px-2 bg-black/30">
                      {/* Bottom Left: Time Badge */}
                      {daysActive && (
                        <View className="flex-row items-center rounded-full">
                          <MaterialIcons name="access-time" color="white" size={20} />
                          <CustomText className="ml-1 text-white text-xs font-semibold">
                            {daysActive}
                          </CustomText>
                        </View>
                      )}

                      {/* Bottom Right: Share Button */}
                      {onShare && (
                        <TouchableOpacity
                          onPress={onShare}
                          className=""
                        >
                          <MaterialIcons name="share" color="white" size={20} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          {/* Pagination Dots */}
          {images.length > 1 && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center">
              {images.map((_, index) => (
                <View
                  key={index}
                  className={`mx-1 h-2 w-2 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-white/50'
                    }`}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View className="h-64 w-full bg-gray-300 items-center justify-center">
          <MaterialIcons name="image-not-supported" size={48} color="#999" />
          <CustomText className="mt-2 text-gray-600 text-sm">No images available</CustomText>
        </View>
      )}
    </View>
  );
};

export default IssueImage;