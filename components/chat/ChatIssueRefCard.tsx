import { fetchIssue } from "@/api/IssueDetail";
import CustomText from "@/components/CustomText";
import { Issue } from "@/models/Issue";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

const ISSUE_TYPE_COLORS: Record<string, string> = {
  pothole: "#ef4444",
  waste: "#22c55e",
  footpath: "#3b82f6",
  pollution: "#8b5cf6",
  hygiene: "#06b6d4",
  safety: "#f59e0b",
  other: "#6b7280",
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Open", color: "#b91c1c", bg: "#fee2e2" },
  RESOLVED: { label: "Resolved", color: "#15803d", bg: "#dcfce7" },
  ONHOLD: { label: "On hold", color: "#b45309", bg: "#fef3c7" },
  REJECTED: { label: "Rejected", color: "#6b7280", bg: "#f3f4f6" },
};

function prettyType(type?: string) {
  return (type || "Other").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateString);
  const mins = Math.floor((Date.now() - new Date(hasZone ? dateString : `${dateString}Z`).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// Module-level cache so the same issue isn't re-fetched per render across the stream.
const issueCache = new Map<number, Issue>();

/** Rich card for an ISSUE_REF chat message: photo, type + status, description, place, counts,
 * tappable to the full issue. Compact fallback line while loading / on failure. */
export default function ChatIssueRefCard({
  issueId,
  fallbackText,
}: {
  issueId?: number;
  fallbackText?: string;
}) {
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(
    issueId != null ? issueCache.get(issueId) ?? null : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (issueId == null || issueCache.has(issueId)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchIssue(issueId);
        const loaded: Issue | undefined =
          (res as any)?.data?.issue ?? (res as any)?.issue;
        if (loaded && !cancelled) {
          issueCache.set(issueId, loaded);
          setIssue(loaded);
        } else if (!cancelled) {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueId]);

  const openIssue = () => {
    if (issueId != null) router.push({ pathname: "/issueDetail", params: { issueId } });
  };

  if (!issue) {
    return (
      <TouchableOpacity
        style={styles.mini}
        onPress={failed ? openIssue : undefined}
        disabled={!failed}
        activeOpacity={0.7}
      >
        <MaterialIcons name="report-problem" size={15} color="#b45309" />
        <CustomText style={styles.miniText}>
          {fallbackText ?? (failed ? "Issue reported nearby" : "Loading issue…")}
        </CustomText>
        {!failed && <ActivityIndicator size="small" color="#9aa3b0" style={{ marginLeft: 4 }} />}
      </TouchableOpacity>
    );
  }

  const status = STATUS_STYLE[(issue.status ?? "").toUpperCase()] ?? STATUS_STYLE.OPEN;
  const typeColor = ISSUE_TYPE_COLORS[(issue.type ?? "other").toLowerCase()] ?? ISSUE_TYPE_COLORS.other;
  const thumb = issue.media_urls?.find((m) => m.url_thumbnail || m.url);
  const place =
    issue.location?.colloquial_name ||
    issue.location?.address ||
    issue.location?.locality?.hashtags?.[0];

  return (
    <TouchableOpacity style={styles.card} onPress={openIssue} activeOpacity={0.85}>
      {thumb ? (
        <Image
          source={{ uri: thumb.url || thumb.url_thumbnail }}
          style={styles.hero}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <MaterialIcons name="report-problem" size={40} color={typeColor} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.typeWrap}>
            <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
            <CustomText style={styles.type}>{prettyType(issue.type)}</CustomText>
          </View>
          <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
            <CustomText style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </CustomText>
          </View>
        </View>

        {issue.description ? (
          <CustomText style={styles.desc} numberOfLines={3}>
            {issue.description}
          </CustomText>
        ) : null}

        <View style={styles.metaRow}>
          {place ? (
            <View style={styles.metaItem}>
              <MaterialIcons name="place" size={13} color="#9aa3b0" />
              <CustomText style={styles.metaText} numberOfLines={1}>
                {place}
              </CustomText>
            </View>
          ) : null}
          {issue.verify_count > 0 ? (
            <View style={styles.metaItem}>
              <MaterialIcons name="verified" size={13} color="#9aa3b0" />
              <CustomText style={styles.metaText}>{issue.verify_count}</CustomText>
            </View>
          ) : null}
          <CustomText style={styles.time}>{timeAgo(issue.created_at)}</CustomText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f6f7f9",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  miniText: { fontSize: 13, color: "#5b6573" },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e7e9ee",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
    maxWidth: 320,
  },
  hero: { width: "100%", height: 175, backgroundColor: "#f1f3f5" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  body: { padding: 10, gap: 4 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  type: { fontSize: 14, color: "#0c1116" },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 11 },
  desc: { fontSize: 14, color: "#3a424d", lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1 },
  metaText: { fontSize: 12, color: "#9aa3b0", maxWidth: 160 },
  time: { fontSize: 12, color: "#9aa3b0", marginLeft: "auto" },
});
