import { Image } from 'expo-image';
import React, { useState } from 'react';
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
  const [fullImageLoaded, setFullImageLoaded] = useState(false);

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
          <View style={{ width: '100%', height: '100%' }}>
            {/* Thumbnail layer - shown until full image loads */}
            {thumbnailSource && !fullImageLoaded && (
              <Image
                source={thumbnailSource}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            )}
            {/* Full resolution image layer */}
            <Image
              source={imageSource}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={thumbnailSource ? 300 : 200}
              cachePolicy="memory-disk"
              onError={(error) => {
                console.error(`[IssueImage] Error loading image ${index}:`, error);
                onError(index);
              }}
              onLoad={() => {
                setFullImageLoaded(true);
              }}
            />
          </View>
        )}
      </Pressable>

      {children}
    </View>
  );
};

export default ImageCarouselItem;
