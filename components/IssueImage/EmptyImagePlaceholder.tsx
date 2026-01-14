import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import CustomText from '../CustomText';

const EmptyImagePlaceholder: React.FC = () => {
  return (
    <View className="h-64 w-full bg-gray-300 items-center justify-center">
      <MaterialIcons name="image-not-supported" size={48} color="#999" />
      <CustomText className="mt-2 text-gray-600 text-sm">No images available</CustomText>
    </View>
  );
};

export default EmptyImagePlaceholder;
