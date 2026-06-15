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

export default function ChatBulletinCard({
  post,
  onOpen,
}: {
  post: FeedPost;
  onOpen: (post: FeedPost) => void;
}) {
  const bulletin = post.bulletin;
  const w = bulletin?.weather;
  const localityName = bulletin?.locality_name ?? null;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onOpen(post)} activeOpacity={0.75}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="article" size={16} color={ACCENT} />
        </View>
        <View style={styles.text}>
          <CustomText style={styles.title}>
            Daily Bulletin{localityName ? ` — ${localityName}` : ""}
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
        <CustomText style={styles.tapHint}>Tap to open</CustomText>
        <MaterialIcons name="chevron-right" size={18} color={ACCENT} />
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
  title: { fontSize: 13, fontWeight: "700", color: ACCENT },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: "#5b6573" },
  right: { flexDirection: "row", alignItems: "center", gap: 4 },
  tapHint: { fontSize: 11, color: "#93a89f" },
});
