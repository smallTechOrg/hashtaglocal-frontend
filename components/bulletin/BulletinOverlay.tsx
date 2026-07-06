import BulletinQuizSection, { isQuizActive } from "@/components/bulletin/BulletinQuizSection";
import CustomText from "@/components/CustomText";
import { FeedPost } from "@/models/Feed";
import { useKarma } from "@/utils/KarmaContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { BulletinQuizAttempt } from "@/api/bulletin";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const ACCENT = "#256D1B";
const QUIZ_KARMA = 5;

function deg(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v)}°`;
}
function pct(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v)}%`;
}

export default function BulletinOverlay({
  post,
  onClose,
  headerHeight,
  tabBarHeight,
  onAttempted,
}: {
  post: FeedPost;
  onClose: () => void;
  headerHeight: number;
  tabBarHeight: number;
  onAttempted?: (quizId: number, attempt: BulletinQuizAttempt) => void;
}) {
  const { addPendingKarma } = useKarma();
  const bulletin = post.bulletin;
  const w = bulletin?.weather;
  const [quizStarted, setQuizStarted] = useState(
    () => bulletin?.quiz != null && !bulletin.quiz.attempt && isQuizActive(bulletin.quiz.id),
  );

  // Slide-down exit only — no entrance animation
  const translateY = useSharedValue(0);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function close() {
    translateY.value = withTiming(
      600,
      { duration: 240, easing: Easing.in(Easing.cubic) },
      () => runOnJS(onClose)(),
    );
  }

  // Karma burst animation
  const burstOpacity = useSharedValue(0);
  const burstTranslateY = useSharedValue(0);
  const burstDeltaRef = useRef(0);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ translateY: burstTranslateY.value }],
  }));

  function triggerKarmaBurst(points: number) {
    addPendingKarma(points);
    burstDeltaRef.current = points;
    burstTranslateY.value = 0;
    burstOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1400 }),  // hold fully visible
      withTiming(0, { duration: 700 }),   // fade out
    );
    burstTranslateY.value = withTiming(-120, { duration: 2250, easing: Easing.out(Easing.cubic) });
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent={false}
    >
      {/* Full-screen container — transparent at top (header shows through) */}
      <View style={styles.modalRoot}>
        {/* Transparent gap over navigation header — tapping it closes */}
        <TouchableOpacity
          style={{ height: headerHeight }}
          onPress={close}
          activeOpacity={1}
        />

        {/* Animated content panel */}
        <Animated.View style={[styles.panel, slideStyle]}>
          {/* Non-scrolling header row */}
          <View style={styles.panelHeader}>
            <TouchableOpacity onPress={close} hitSlop={16} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#5b6573" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {bulletin ? (
              <>
                {!quizStarted && (
                  <>
                    {w ? (
                      <View style={styles.weatherCard}>
                        <View style={styles.weatherRow}>
                          <MaterialIcons name="wb-sunny" size={26} color="#f59e0b" />
                          <CustomText style={styles.weatherTemp}>
                            {deg(w.max_temp)} / {deg(w.min_temp)}
                          </CustomText>
                          <View style={styles.weatherPill}>
                            <MaterialIcons name="umbrella" size={14} color="#6366f1" />
                            <CustomText style={styles.weatherPillText}>{pct(w.rain_probability)}</CustomText>
                          </View>
                          {w.humidity !== null && w.humidity !== undefined && (
                            <View style={styles.weatherPill}>
                              <MaterialIcons name="water-drop" size={13} color="#0ea5e9" />
                              <CustomText style={styles.weatherPillText}>{pct(w.humidity)}</CustomText>
                            </View>
                          )}
                        </View>
                      </View>
                    ) : null}

                    {bulletin.summary ? (
                      <CustomText style={styles.summary}>{bulletin.summary}</CustomText>
                    ) : null}
                  </>
                )}

                {bulletin.quiz ? (
                  <BulletinQuizSection
                    quiz={bulletin.quiz}
                    onQuizStart={() => setQuizStarted(true)}
                    onAttempted={(attempt) => {
                      setQuizStarted(false);
                      if (attempt.is_correct) triggerKarmaBurst(QUIZ_KARMA);
                      onAttempted?.(bulletin.quiz!.id, attempt);
                    }}
                  />
                ) : (
                  !quizStarted && (
                    <CustomText style={styles.noQuiz}>No quiz scheduled for today.</CustomText>
                  )
                )}
              </>
            ) : (
              post.text ? <CustomText style={styles.summary}>{post.text}</CustomText> : null
            )}
          </ScrollView>
        </Animated.View>

        {/* Transparent strip at bottom so tab bar shows through */}
        <View style={{ height: tabBarHeight }} />
      </View>

      {/* Karma burst */}
      <Animated.View style={[styles.karmaBurst, burstStyle]} pointerEvents="none">
        <View style={styles.karmaBurstInner}>
          <MaterialIcons name="stars" size={28} color="#16a34a" />
          <CustomText style={styles.karmaBurstText}>+{QUIZ_KARMA}</CustomText>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  panel: {
    flex: 1,
    backgroundColor: "#fff",
  },
  panelHeader: {
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  weatherCard: {
    backgroundColor: "#f7fbf6",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dcebd9",
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  weatherTemp: { fontSize: 26, fontWeight: "700", color: "#0c1116" },
  weatherPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e7e9ee",
  },
  weatherPillText: { fontSize: 13, color: "#5b6573" },
  summary: { fontSize: 15, color: "#0c1116", lineHeight: 23 },
  noQuiz: { fontSize: 13, color: "#5b6573", textAlign: "center", paddingVertical: 20 },
  karmaBurst: {
    position: "absolute",
    alignSelf: "center",
    bottom: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  karmaBurstInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#86efac",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  karmaBurstText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#15803d",
    fontFamily: "Nunito_700Bold",
  },
});
