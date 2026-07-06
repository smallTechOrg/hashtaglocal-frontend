import CustomText from "@/components/CustomText";
import { FeedPost } from "@/models/Feed";
import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const ACCENT = "#256D1B";

function deg(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v)}°`;
}
function pct(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v)}%`;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const suffix = [11,12,13].includes(day) ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  return `${day}${suffix} ${MONTHS[month - 1]} ${year}`;
}

export default function ChatBulletinCard({
  post,
  onOpen,
  quizAttempted,
  quizCorrect,
  quizTimedOut,
}: {
  post: FeedPost;
  onOpen: (post: FeedPost) => void;
  quizAttempted?: boolean;
  quizCorrect?: boolean | null;
  quizTimedOut?: boolean | null;
}) {
  const bulletin = post.bulletin;
  const w = bulletin?.weather;
  const dateLabel = formatDate(bulletin?.date);
  const hasQuiz = !!(bulletin?.quiz);
  const quizDone = quizAttempted || !!(bulletin?.quiz?.attempt);
  const isCorrect = quizCorrect ?? bulletin?.quiz?.attempt?.is_correct ?? null;
  const isTimedOut = quizTimedOut ?? (bulletin?.quiz?.attempt?.selected_option_index === null && bulletin?.quiz?.attempt !== undefined) ?? false;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onOpen(post)} activeOpacity={0.75}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="article" size={16} color={ACCENT} />
        </View>
        <View style={styles.text}>
          <CustomText style={styles.title}>
            Daily Bulletin{dateLabel ? ` — ${dateLabel}` : ""}
          </CustomText>
          {w ? (
            <View style={styles.meta}>
              <MaterialIcons name="wb-sunny" size={12} color="#f59e0b" />
              <CustomText style={styles.metaText}>
                {deg(w.max_temp)} / {deg(w.min_temp)}
              </CustomText>
              <MaterialIcons name="umbrella" size={11} color="#6366f1" />
              <CustomText style={styles.metaText}>{pct(w.rain_probability)} rain</CustomText>
            </View>
          ) : post.text ? (
            <CustomText style={styles.metaText} numberOfLines={1}>{post.text}</CustomText>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {quizDone ? (
          isTimedOut ? (
            <View style={[styles.doneBadge, styles.timedOutBadge]}>
              <MaterialIcons name="timer-off" size={12} color="#1c1c1e" />
              <CustomText style={[styles.doneText, styles.timedOutText]}>Timed out</CustomText>
            </View>
          ) : isCorrect === true ? (
            <View style={[styles.doneBadge, styles.correctBadge]}>
              <MaterialIcons name="check-circle" size={12} color="#16a34a" />
              <CustomText style={[styles.doneText, styles.correctText]}>Correct</CustomText>
            </View>
          ) : isCorrect === false ? (
            <View style={[styles.doneBadge, styles.wrongBadge]}>
              <MaterialIcons name="cancel" size={12} color="#dc2626" />
              <CustomText style={[styles.doneText, styles.wrongText]}>Incorrect</CustomText>
            </View>
          ) : (
            <View style={styles.doneBadge}>
              <MaterialIcons name="check-circle" size={12} color="#16a34a" />
              <CustomText style={styles.doneText}>Quiz done</CustomText>
            </View>
          )
        ) : hasQuiz ? (
          <View style={[styles.doneBadge, styles.notAttemptedBadge]}>
            <MaterialIcons name="radio-button-unchecked" size={12} color="#b45309" />
            <CustomText style={[styles.doneText, styles.notAttemptedText]}>Not attempted</CustomText>
          </View>
        ) : (
          <>
            <CustomText style={styles.tapHint}>Tap to open</CustomText>
            <MaterialIcons name="chevron-right" size={18} color={ACCENT} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dcebd9",
    backgroundColor: "#f7fbf6",
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
    gap: 8,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#e6f4e3",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  title: { fontSize: 13, color: ACCENT },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: "#5b6573" },
  right: { flexDirection: "row", alignItems: "center", gap: 4 },
  tapHint: { fontSize: 11, color: "#93a89f" },
  doneBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#f0fdf4", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "#bbf7d0" },
  correctBadge: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  wrongBadge: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  doneText: { fontSize: 11, color: "#16a34a" },
  correctText: { color: "#16a34a" },
  wrongText: { color: "#dc2626" },
  timedOutBadge: { backgroundColor: "#f5f5f5", borderColor: "#d1d5db" },
  timedOutText: { color: "#1c1c1e" },
  notAttemptedBadge: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  notAttemptedText: { color: "#b45309" },
});
