import React from 'react';
import { View } from 'react-native';

interface PaginationDotsProps {
  totalImages: number;
  currentIndex: number;

}

const PaginationDots: React.FC<PaginationDotsProps> = ({
  totalImages,
  currentIndex,

}) => {
  if (totalImages <= 1) return null;

  return (
    <View
      className="absolute left-0 right-0 flex-row justify-center"
      style={{
        bottom: 12,
        zIndex: 20
      }}
    >
      {Array.from({ length: totalImages }).map((_, index) => (
        <View
          key={index}
          className={`mx-1 h-2 w-2 rounded-full ${
            currentIndex === index ? 'bg-white' : 'bg-white/50'
          }`}
        />
      ))}
    </View>
  );
};

export default PaginationDots;
