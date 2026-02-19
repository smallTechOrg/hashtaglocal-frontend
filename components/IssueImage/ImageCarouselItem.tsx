import { Image } from 'expo-image';
import React from 'react';
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
            onError={(error: any) => {
              console.error(`[IssueImage] RN Image also failed for ${index}:`, error);
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
            onError={(error) => {
              console.error(`[IssueImage] Error loading image ${index}:`, error);
              onError(index);
            }}
          />
        )}
      </Pressable>

      {children}
    </View>
  );
};

export default ImageCarouselItem;
