import { useKarma } from "@/utils/KarmaContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

export default function KarmaBadge() {
  const { karma, lastDelta, clearDelta } = useKarma();
  const scale = useSharedValue(1);
  const floatOpacity = useSharedValue(0);
  const floatTranslateY = useSharedValue(0);
  const deltaRef = useRef(0);

  const total = karma.earned + karma.pending;

  useEffect(() => {
    if (lastDelta > 0) {
      deltaRef.current = lastDelta;

      // Badge bounce
      scale.value = withSequence(
        withSpring(1.3, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 6, stiffness: 200 })
      );

      // Floating "+N" animation
      floatOpacity.value = 1;
      floatTranslateY.value = 0;
      floatOpacity.value = withTiming(0, { duration: 1200 });
      floatTranslateY.value = withTiming(-32, { duration: 1200 }, () => {
        runOnJS(clearDelta)();
      });
    }
  }, [lastDelta]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const floatAnimatedStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [{ translateY: floatTranslateY.value }],
  }));

  return (
    <View style={{ alignItems: "center", marginRight: 14 }}>
      {/* Floating "+N" text */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: -8,
            zIndex: 10,
          },
          floatAnimatedStyle,
        ]}
        pointerEvents="none"
      >
        <Text
          style={{
            color: "#16a34a",
            fontSize: 13,
            fontFamily: "Nunito_700Bold",
          }}
        >
          +{deltaRef.current || lastDelta}
        </Text>
      </Animated.View>

      {/* Main badge */}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f0fdf4",
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: "#bbf7d0",
          },
          badgeAnimatedStyle,
        ]}
      >
        <MaterialIcons name="stars" size={16} color="#16a34a" />
        <Text
          style={{
            marginLeft: 4,
            fontSize: 14,
            fontFamily: "Nunito_700Bold",
            color: "#15803d",
          }}
        >
          {total}
        </Text>
        {karma.pending > 0 && (
          <Text
            style={{
              marginLeft: 3,
              fontSize: 10,
              fontFamily: "Nunito-Regular",
              color: "#6b7280",
            }}
          >
            (+{karma.pending})
          </Text>
        )}
      </Animated.View>
    </View>
  );
}
