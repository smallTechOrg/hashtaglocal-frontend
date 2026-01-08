import { Image } from 'expo-image';
import React from 'react';
import { ImageSourcePropType, Image as RNImage, View } from 'react-native';

interface ImageCarouselItemProps {
  imageSource: ImageSourcePropType | { uri: string };
  index: number;
  width: number;
  height: number;
  hasError: boolean;
  onError: (index: number) => void;
  children?: React.ReactNode;
}

const ImageCarouselItem: React.FC<ImageCarouselItemProps> = ({
  imageSource,
  index,
  width,
  height,
  hasError,
  onError,
  children
}) => {
  return (
    <View
      key={`image-${index}`}
      className="relative"
      style={{ width, height }}
    >
      {hasError ? (
        // Fallback to React Native Image if expo-image fails
        <RNImage
          source={imageSource}
          style={{ width: '100%', height: '100%' }}
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
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={(error) => {
            console.error(`[IssueImage] Error loading image ${index}:`, error);
            onError(index);
          }}
          onLoad={() => {
            console.log(`[IssueImage] Successfully loaded image ${index}`);
          }}
        />
      )}

      {children}
    </View>
  );
};

export default ImageCarouselItem;
