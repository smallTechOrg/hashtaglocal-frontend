import { Bulletin, fetchBulletin } from "@/api/bulletin";
import BulletinQuizSection from "@/components/bulletin/BulletinQuizSection";
import CustomText from "@/components/CustomText";
import { useHashtag } from "@/utils/HashtagContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#256D1B";

function deg(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)}°`;
}

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)}%`;
}

export default function BulletinScreen() {
  const { hashtag } = useHashtag();
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setBulletin(await fetchBulletin(hashtag));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load the bulletin.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hashtag],
  );

  useEffect(() => {
    setBulletin(null);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ACCENT} />
        <CustomText style={styles.muted}>Loading bulletin…</CustomText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <CustomText style={styles.muted}>Couldn&apos;t load the bulletin. {error}</CustomText>
        <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
          <CustomText style={styles.retryText}>Retry</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!bulletin) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <MaterialIcons name="wb-twilight" size={42} color="#9aa3b0" />
        <CustomText style={styles.emptyTitle}>No bulletin yet for #{hashtag}</CustomText>
        <CustomText style={styles.muted}>
          Your locality&apos;s daily bulletin starts tomorrow morning — check back then!
        </CustomText>
      </ScrollView>
    );
  }

  const w = bulletin.weather;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {/* ── Weather card ── */}
      <View style={styles.weatherCard}>
        <View style={styles.weatherHeader}>
          <View style={styles.flex1}>
            <CustomText style={styles.localityName}>{bulletin.locality_name}</CustomText>
            <CustomText style={styles.dateText}>
              {new Date(`${bulletin.date}T00:00:00`).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </CustomText>
          </View>
          <MaterialIcons name="wb-sunny" size={34} color="#f59e0b" />
        </View>

        {w ? (
          <>
            <View style={styles.tempRow}>
              <CustomText style={styles.tempBig}>{deg(w.max_temp)}</CustomText>
              <CustomText style={styles.tempMin}> / {deg(w.min_temp)}</CustomText>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialIcons name="water-drop" size={16} color="#3b82f6" />
                <CustomText style={styles.statValue}>{pct(w.humidity)}</CustomText>
                <CustomText style={styles.statLabel}>Humidity</CustomText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <MaterialIcons name="umbrella" size={16} color="#6366f1" />
                <CustomText style={styles.statValue}>{pct(w.rain_probability)}</CustomText>
                <CustomText style={styles.statLabel}>Rain</CustomText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <MaterialIcons name="air" size={16} color="#10b981" />
                <CustomText style={styles.statValue}>
                  {w.avg_aqi === null || w.avg_aqi === undefined ? "—" : Math.round(w.avg_aqi)}
                </CustomText>
                <CustomText style={styles.statLabel}>AQI</CustomText>
              </View>
            </View>
          </>
        ) : (
          <CustomText style={styles.muted}>Weather data isn&apos;t available yet today.</CustomText>
        )}

        {bulletin.summary ? (
          <View style={styles.summaryBox}>
            <MaterialIcons name="auto-awesome" size={15} color={ACCENT} />
            <CustomText style={styles.summaryText}>{bulletin.summary}</CustomText>
          </View>
        ) : null}
      </View>

      {/* ── Quiz ── */}
      {bulletin.quiz ? (
        <BulletinQuizSection quiz={bulletin.quiz} />
      ) : (
        <View style={styles.noQuizCard}>
          <MaterialIcons name="quiz" size={18} color="#9aa3b0" />
          <CustomText style={styles.muted}>Today&apos;s quiz isn&apos;t up yet — check back soon.</CustomText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7f9" },
  content: { padding: 14, gap: 14 },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
    backgroundColor: "#f6f7f9",
  },
  flex1: { flex: 1 },
  muted: { color: "#5b6573", textAlign: "center", fontSize: 13, lineHeight: 18 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0c1116" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  retryText: { color: "#fff" },
  weatherCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e9ee",
    padding: 16,
    gap: 10,
  },
  weatherHeader: { flexDirection: "row", alignItems: "center" },
  localityName: { fontSize: 17, fontWeight: "700", color: "#0c1116" },
  dateText: { fontSize: 12, color: "#9aa3b0", marginTop: 2 },
  tempRow: { flexDirection: "row", alignItems: "flex-end" },
  tempBig: { fontSize: 40, fontWeight: "300", color: "#0c1116", lineHeight: 44 },
  tempMin: { fontSize: 18, color: "#5b6573", marginBottom: 5 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eef0f4",
    paddingTop: 10,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "#eef0f4" },
  statValue: { fontSize: 15, fontWeight: "700", color: "#0c1116" },
  statLabel: { fontSize: 11, color: "#9aa3b0" },
  summaryBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#f1f8f0",
    borderRadius: 10,
    padding: 10,
  },
  summaryText: { flex: 1, fontSize: 13, color: "#0c1116", lineHeight: 19 },
  noQuizCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e9ee",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
