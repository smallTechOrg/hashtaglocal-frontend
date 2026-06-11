import { fetchHashtagByCoords, fetchLocalities, LocalityOption } from "@/api/Feed";
import CustomText from "@/components/CustomText";
import { useHashtag } from "@/utils/HashtagContext";
import { getBestKnownLocation, getFastLocationWithProgressiveWatch } from "@/utils/LocationService";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#256d1b";

type Row =
  | { kind: "section"; key: string; label: string }
  | { kind: "item"; key: string; hashtag: string; name?: string; icon?: keyof typeof MaterialIcons.glyphMap };

/** Sectioned hashtag switcher: Near you · #india · Recent · All (searchable). */
export default function HashtagPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string; // normalized, no '#'
  onSelect: (hashtag: string) => void;
  onClose: () => void;
}) {
  const { recent } = useHashtag();
  const [localities, setLocalities] = useState<LocalityOption[]>([]);
  const [nearby, setNearby] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Load the full locality list once (for All + to resolve names of recents/nearby).
  useEffect(() => {
    if (!visible || localities.length > 0) return;
    fetchLocalities().then(setLocalities);
  }, [visible, localities.length]);

  // Resolve "near you" from the best-known / fresh location when opened.
  useEffect(() => {
    if (!visible || nearby) return;
    let cancelled = false;
    (async () => {
      let loc = getBestKnownLocation();
      if (!loc) {
        const res = await getFastLocationWithProgressiveWatch({ instantLoad: true });
        if (res.success) loc = res.location;
      }
      if (!loc || cancelled) return;
      const tag = await fetchHashtagByCoords(loc.latitude, loc.longitude);
      if (tag && !cancelled) setNearby(tag);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, nearby]);

  const nameFor = (h: string) =>
    localities.find((l) => l.hashtag === h)?.name;

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();

    // Searching → flat filtered list of all localities (+ india), no sections.
    if (q) {
      const all = [{ hashtag: "india", name: "India" }, ...localities];
      return all
        .filter((l) => l.hashtag.includes(q) || (l.name ?? "").toLowerCase().includes(q))
        .map((l) => ({ kind: "item", key: `s-${l.hashtag}`, hashtag: l.hashtag, name: l.name }));
    }

    const out: Row[] = [];

    if (nearby) {
      out.push({ kind: "section", key: "sec-near", label: "Near you" });
      out.push({
        kind: "item",
        key: `near-${nearby}`,
        hashtag: nearby,
        name: nameFor(nearby),
        icon: "my-location",
      });
    }

    out.push({ kind: "section", key: "sec-india", label: "" });
    out.push({ kind: "item", key: "india", hashtag: "india", name: "All localities", icon: "public" });

    const recentRows = recent.filter((h) => h !== nearby);
    if (recentRows.length) {
      out.push({ kind: "section", key: "sec-recent", label: "Recent" });
      recentRows.forEach((h) =>
        out.push({ kind: "item", key: `recent-${h}`, hashtag: h, name: nameFor(h), icon: "history" }),
      );
    }

    out.push({ kind: "section", key: "sec-all", label: "All localities" });
    [...localities]
      .filter((l) => l.hashtag !== "india")
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((l) => out.push({ kind: "item", key: `all-${l.hashtag}`, hashtag: l.hashtag, name: l.name }));

    return out;
  }, [query, localities, nearby, recent]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <CustomText style={styles.title}>Choose a hashtag</CustomText>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <MaterialIcons name="close" size={22} color="#5b6573" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={18} color="#9aa3b0" />
          <TextInput
            style={styles.search}
            placeholder="Search localities…"
            placeholderTextColor="#9aa3b0"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          renderItem={({ item }) => {
            if (item.kind === "section") {
              if (!item.label) return <View style={styles.sectionSpacer} />;
              return <CustomText style={styles.sectionLabel}>{item.label}</CustomText>;
            }
            const isActive = item.hashtag === selected;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  onSelect(item.hashtag);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  {item.icon ? (
                    <MaterialIcons name={item.icon} size={18} color="#5b6573" style={styles.rowIcon} />
                  ) : (
                    <View style={styles.rowIconSpacer} />
                  )}
                  <View>
                    <CustomText style={[styles.rowTag, isActive && styles.rowTagActive]}>
                      #{item.hashtag}
                    </CustomText>
                    {item.name && item.name.toLowerCase() !== item.hashtag ? (
                      <CustomText style={styles.rowSub}>{item.name}</CustomText>
                    ) : null}
                  </View>
                </View>
                {isActive && <MaterialIcons name="check" size={20} color={ACCENT} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<CustomText style={styles.empty}>No localities found.</CustomText>}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "78%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: { fontSize: 16, color: "#0c1116" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f6f7f9",
  },
  search: { flex: 1, fontFamily: "Nunito_400Regular", fontSize: 14, color: "#0c1116" },
  list: { flexGrow: 0 },
  sectionLabel: {
    fontSize: 11,
    color: "#9aa3b0",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionSpacer: { height: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rowIcon: { width: 20, textAlign: "center" },
  rowIconSpacer: { width: 20 },
  rowTag: { fontSize: 15, color: "#0c1116" },
  rowTagActive: { color: ACCENT },
  rowSub: { fontSize: 12, color: "#9aa3b0" },
  empty: { textAlign: "center", color: "#9aa3b0", padding: 24 },
});
