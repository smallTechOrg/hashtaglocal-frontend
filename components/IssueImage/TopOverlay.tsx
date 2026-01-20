import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import CustomText from '../CustomText';
import '../../global.css'
interface TopOverlayProps {
  location?: string;
  timestamp?: string;
  index: number;
}

const TopOverlay: React.FC<TopOverlayProps> = ({ location, timestamp, index }) => {
  if (!location && !timestamp) return null;

  return (
    <View
      className="absolute top-0 left-0 right-0 flex-row items-start bg-white/60 px-2 py-1"
      style={{ zIndex: 10 }}
    >
      <MaterialIcons name="location-on" color="black" size={16} style={{ marginTop: 2 }} />
      <View className="flex-1 ml-1">
        {location && (
          <CustomText
            testID={index === 0 ? "issue-location" : undefined}
            className="text-[10px] "
            numberOfLines={2}
          >
            {location}
          </CustomText>
        )}
        {timestamp && (
          <CustomText
            testID={index === 0 ? "issue-timestamp" : undefined}
            className="text-[10px] mt-0.5"
          >
            {timestamp}
          </CustomText>
        )}
      </View>
    </View>
  );
};

export default TopOverlay;
