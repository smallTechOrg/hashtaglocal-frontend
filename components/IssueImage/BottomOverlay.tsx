import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import CustomText from '../CustomText';

interface BottomOverlayProps {
  daysActive?: string;
  onShare?: () => void;
  index: number;
}

const BottomOverlay: React.FC<BottomOverlayProps> = ({ daysActive, onShare, index }) => {
  if (!daysActive && !onShare) return null;

  return (
    <View
      className="absolute left-0 right-0 flex-row items-center justify-between px-2 py-2"
      style={{
        bottom: 0,
        backgroundColor: 'rgba(35, 28, 28, 0.35)',
      }}
    >
      {/* Bottom Left: Time Badge */}
      {daysActive && (
        <View className="flex-row">
          <MaterialIcons name="access-time" color="white" size={20} />
          <CustomText
            testID={index === 0 ? "issue-days" : undefined}
            className="ml-1 text-white p"
          >
            {daysActive}
          </CustomText>
        </View>
      )}

      {/* Bottom Right: Share Button */}
      {onShare && (
        <TouchableOpacity onPress={onShare}>
          <MaterialIcons name="share" color="white" size={20} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default BottomOverlay;
