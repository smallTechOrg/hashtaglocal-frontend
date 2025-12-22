import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';
import "../global.css";
import CustomText from './CustomText';

interface IssueCardProps {
  imageSource: ImageSourcePropType;
  location: string;
  timestamp: string;
  daysActive: string;
  className?:string
  onShare?: () => void;
}

const IssueCard: React.FC<IssueCardProps> = ({
  imageSource,
  location,
  timestamp,
  daysActive,
   className,
  onShare
}) => {
  return (
    <View className={` h-80 w-80 ${className ?? ""}`}>
      {/* Background Image */}
      <Image
        source={imageSource}
        className="h-full w-full"
        resizeMode="cover"
      />

      {/* Top Overlay: Location & Coordinates */}
      <View className="absolute flex-row items-start bg-white opacity-60">
        <MaterialIcons name="location-on" color="black" size={20} />
        <View className=" flex-1">
          <CustomText className="text-[7px] font-regular" numberOfLines={1}>
            {location}
          </CustomText>
          <CustomText className="text-[7px] shadow-sm opacity-90">
            {timestamp}
          </CustomText>
        </View>
      </View>

      {/* Bottom overlay container */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between py-2 px-2 bg-black/30">

        {/* Bottom Left: Time Badge */}
        <View className="flex-row items-center rounded-full">
          <MaterialIcons name="access-time" color="white" size={20} />
          <CustomText className="ml-1 text-white text-xs font-semibold">
            {daysActive}
          </CustomText>
        </View>

        {/* Bottom Right: Share Button */}
        <TouchableOpacity
          onPress={onShare}
          className=""
        >
          <MaterialIcons name="share" color="white" size={20} />
        </TouchableOpacity>

      </View>

    </View>
  );
};

export default IssueCard;