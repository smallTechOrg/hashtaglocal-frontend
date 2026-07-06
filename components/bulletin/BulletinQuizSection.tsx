import {
  BulletinQuiz,
  BulletinQuizAttempt,
  submitQuizAttempt,
} from "@/api/bulletin";
import CustomText from "@/components/CustomText";
import { trackBulletinQuizAttempted, trackBulletinQuizStarted } from "@/utils/analytics";
import { useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

const ACCENT = "#256D1B";
const QUIZ_SECONDS = 15;

type Phase = "idle" | "active" | "submitting" | "done";

// Keyed by quiz ID — survives component unmount so the timer continues if the overlay is closed and reopened.
const quizTimerStore = new Map<number, number>(); // quizId -> Date.now() when started

export function isQuizActive(quizId: number): boolean {
  const startedAt = quizTimerStore.get(quizId);
  if (startedAt == null) return false;
  return Math.floor((Date.now() - startedAt) / 1000) < QUIZ_SECONDS;
}

/**
 * The daily quiz flow: Start Quiz → 15-second timed question → result + explanation. One attempt
 * per user — the timer running out auto-submits a missed attempt. Shared by the bulletin screen
 * and the BULLETIN chat card so both entry points behave identically.
 */
export default function BulletinQuizSection({
  quiz,
  onAttempted,
  onQuizStart,
}: {
  quiz: BulletinQuiz;
  onAttempted?: (attempt: BulletinQuizAttempt) => void;
  onQuizStart?: () => void;
}) {
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>(() => {
    if (quiz.attempt) return "done";
    // If the timer was started (store has entry), resume as active regardless of elapsed time.
    // secondsLeft=0 will fire the auto-submit useEffect, showing "Time's up!" instead of Start Quiz.
    if (quizTimerStore.has(quiz.id)) return "active";
    return "idle";
  });
  const [attempt, setAttempt] = useState<BulletinQuizAttempt | null>(quiz.attempt);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const startedAt = quizTimerStore.get(quiz.id);
    if (startedAt != null) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      return Math.max(0, QUIZ_SECONDS - elapsed);
    }
    return QUIZ_SECONDS;
  });
  const [error, setError] = useState<string | null>(null);
  // Shuffled display order: each element is an original 0-based option index.
  const [shuffledOrder, setShuffledOrder] = useState<number[]>(() =>
    quizTimerStore.has(quiz.id) ? shuffleOptions() : [0, 1, 2, 3],
  );
  // Guards against the timer and a tap submitting simultaneously.
  const submittedRef = useRef(false);

  function shuffleOptions(): number[] {
    const arr = [0, 1, 2, 3];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const submit = useCallback(
    async (selectedOptionIndex: number | null) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setPhase("submitting");
      setError(null);
      try {
        const result = await submitQuizAttempt(quiz.id, selectedOptionIndex);
        const newAttempt: BulletinQuizAttempt = {
          is_correct: result.is_correct,
          selected_option_index: result.selected_option_index,
          answer_option_index: result.answer_option_index,
          explanation: result.explanation,
        };
        quizTimerStore.delete(quiz.id);
        const quizResult = newAttempt.selected_option_index === null ? "timed_out" : newAttempt.is_correct ? "correct" : "wrong";
        trackBulletinQuizAttempted(quiz.id, quizResult);
        setAttempt(newAttempt);
        setPhase("done");
        onAttempted?.(newAttempt);
      } catch (e) {
        submittedRef.current = false;
        setPhase("idle");
        setSecondsLeft(QUIZ_SECONDS);
        setError(e instanceof Error ? e.message : "Couldn't submit. Try again.");
      }
    },
    [quiz.id, onAttempted],
  );

  // Countdown while the quiz is active; hitting zero records a missed attempt.
  useEffect(() => {
    if (phase !== "active") return;
    if (secondsLeft <= 0) {
      submit(null);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, submit]);

  function start() {
    if (!user) {
      router.push("/login");
      return;
    }
    submittedRef.current = false;
    quizTimerStore.set(quiz.id, Date.now());
    trackBulletinQuizStarted(quiz.id);
    setSecondsLeft(QUIZ_SECONDS);
    setShuffledOrder(shuffleOptions());
    setPhase("active");
    onQuizStart?.();
  }

  // ── Result ──
  if (phase === "done" && attempt) {
    const timedOut = attempt.selected_option_index === null;
    return (
      <View style={styles.card}>
        <View style={styles.resultHeader}>
          <MaterialIcons
            name={attempt.is_correct ? "check-circle" : timedOut ? "timer-off" : "cancel"}
            size={20}
            color={attempt.is_correct ? ACCENT : "#dc2626"}
          />
          <CustomText style={[styles.resultTitle, { color: attempt.is_correct ? ACCENT : "#dc2626" }]}>
            {attempt.is_correct ? "Correct!" : timedOut ? "Time's up!" : "Not quite!"}
          </CustomText>
        </View>
        <CustomText style={styles.question}>{quiz.question}</CustomText>
        {shuffledOrder.map((origIdx) => {
          const isAnswer = attempt.answer_option_index === origIdx + 1;
          const isSelected = attempt.selected_option_index === origIdx + 1;
          return (
            <View
              key={origIdx}
              style={[
                styles.option,
                isAnswer && styles.optionCorrect,
                isSelected && !isAnswer && styles.optionWrong,
              ]}
            >
              <CustomText
                style={[styles.optionText, isAnswer && styles.optionTextCorrect]}
                numberOfLines={2}
              >
                {quiz.options[origIdx]}
              </CustomText>
              {isAnswer && <MaterialIcons name="check" size={16} color={ACCENT} />}
              {isSelected && !isAnswer && <MaterialIcons name="close" size={16} color="#dc2626" />}
            </View>
          );
        })}
        {attempt.explanation ? (
          <View style={styles.explanation}>
            <MaterialIcons name="lightbulb" size={15} color="#b45309" />
            <CustomText style={styles.explanationText}>{attempt.explanation}</CustomText>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Active question (15 s) ──
  if (phase === "active" || phase === "submitting") {
    const submitting = phase === "submitting";
    return (
      <View style={styles.card}>
        <View style={styles.timerRow}>
          <MaterialIcons name="timer" size={16} color={secondsLeft <= 5 ? "#dc2626" : "#5b6573"} />
          <CustomText style={[styles.timerText, secondsLeft <= 5 && styles.timerUrgent]}>
            {secondsLeft}s
          </CustomText>
          <View style={styles.timerBarTrack}>
            <View
              style={[
                styles.timerBarFill,
                {
                  width: `${(secondsLeft / QUIZ_SECONDS) * 100}%`,
                  backgroundColor: secondsLeft <= 5 ? "#dc2626" : ACCENT,
                },
              ]}
            />
          </View>
        </View>
        <CustomText style={styles.question}>{quiz.question}</CustomText>
        {shuffledOrder.map((origIdx, displayIdx) => (
          <TouchableOpacity
            key={displayIdx}
            style={styles.option}
            disabled={submitting}
            onPress={() => submit(origIdx + 1)}
          >
            <CustomText style={styles.optionText} numberOfLines={2}>
              {quiz.options[origIdx]}
            </CustomText>
          </TouchableOpacity>
        ))}
        {submitting && (
          <View style={styles.submittingRow}>
            <ActivityIndicator size="small" color={ACCENT} />
            <CustomText style={styles.muted}>Checking…</CustomText>
          </View>
        )}
      </View>
    );
  }

  // ── Idle: Start Quiz ──
  return (
    <View style={styles.card}>
      <View style={styles.idleHeader}>
        <MaterialIcons name="quiz" size={18} color={ACCENT} />
        <CustomText style={styles.idleTitle}>Daily Quiz</CustomText>
      </View>
      <CustomText style={styles.muted}>
        One question about your locality — you get {QUIZ_SECONDS} seconds and a single attempt.
      </CustomText>
      {error && <CustomText style={styles.error}>{error}</CustomText>}
      <TouchableOpacity style={styles.startBtn} onPress={start}>
        <MaterialIcons name="play-arrow" size={18} color="#fff" />
        <CustomText style={styles.startBtnText}>Start Quiz</CustomText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e9ee",
    padding: 14,
    gap: 8,
  },
  idleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  idleTitle: { fontSize: 15, fontWeight: "700", color: "#0c1116" },
  muted: { fontSize: 13, color: "#5b6573", lineHeight: 18 },
  error: { fontSize: 12, color: "#dc2626" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  startBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timerText: { fontSize: 13, color: "#5b6573", fontWeight: "700", minWidth: 28 },
  timerUrgent: { color: "#dc2626" },
  timerBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#eef0f4",
    overflow: "hidden",
  },
  timerBarFill: { height: 6, borderRadius: 3 },
  question: { fontSize: 15, color: "#0c1116", fontWeight: "600", lineHeight: 21 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e7e9ee",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fafbfc",
  },
  optionCorrect: { borderColor: ACCENT, backgroundColor: "#f1f8f0" },
  optionWrong: { borderColor: "#dc2626", backgroundColor: "#fdf2f2" },
  optionText: { fontSize: 14, color: "#0c1116", flex: 1 },
  optionTextCorrect: { fontWeight: "700" },
  submittingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultTitle: { fontSize: 15, fontWeight: "700" },
  explanation: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
  },
  explanationText: { flex: 1, fontSize: 13, color: "#0c1116", lineHeight: 18 },
});
