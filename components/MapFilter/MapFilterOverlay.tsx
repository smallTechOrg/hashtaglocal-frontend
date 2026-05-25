import { MaterialIcons } from "@expo/vector-icons";
import { memo, useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { FilterChip } from "./FilterChip";
import { ALL_OPTION_ID } from "./filterConfig";
import type { FilterCategory } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MapFilterOverlayProps {
  /** The filter categories to display (issue filters, event filters, …). */
  categories: FilterCategory[];
  /** Check whether an option is active. */
  isSelected: (categoryId: string, optionId: string) => boolean;
  /** Toggle an option on/off. */
  onToggle: (categoryId: string, optionId: string) => void;
  /** Clear one category. */
  onClear: (categoryId: string) => void;
  /** Clear every category. */
  onClearAll: () => void;
  /** Total number of active selections. */
  activeCount: number;
  /** Snapshot used to derive per-category counts. */
  activeFilters: Record<string, Set<string>>;
  /** Per-category per-option item counts: categoryId → optionId → count. */
  itemCounts?: Record<string, Record<string, number>>;
  /**
   * When true, renders as a normal inline bar (e.g. on the Issues list page)
   * instead of a floating overlay anchored absolutely on top of a map.
   */
  inline?: boolean;
  /** Number of upcoming events in user's hashtag area. */
  eventsCount?: number;
  /** Called when the Events tab is pressed. */
  onEventsPress?: () => void;
  /** Whether events-only mode is currently active. */
  showEventsOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Floating filter bar anchored to the top-right of the map.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────┐
 *  │  [Summary card ···]              [tune btn]  │  ← row 1
 *  │         [Type ▾] [Status ▾] [Pothole ×] …   │  ← row 2 (right-aligned)
 *  │                              ┌────────────┐  │
 *  │                              │  dropdown   │  │  ← below row 2
 *  │                              └────────────┘  │
 *  └─────────────────────────────────────────────┘
 */
function MapFilterOverlayInner({
  categories,
  isSelected,
  onToggle,
  onClear,
  onClearAll,
  activeCount,
  activeFilters,
  itemCounts,
  inline = false,
  eventsCount,
  onEventsPress,
  showEventsOnly = false,
}: MapFilterOverlayProps) {
  // Which category dropdown is currently open (null = all collapsed)
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  // Height of bar content (row1+row2) measured when inline so dropdown can float below it
  const [barHeight, setBarHeight] = useState(96);

  const reporterCat = categories.find((c) => c.id === "reporter");

  // ── Dropdown toggle ───────────────────────────────────────────────────
  const toggleCategory = useCallback((catId: string) => {
    setOpenCategory((prev) => (prev === catId ? null : catId));
  }, []);

  const closeDropdown = useCallback(() => {
    setOpenCategory(null);
  }, []);

  // ── Select an option → collapse dropdown ──────────────────────────────
  const handleSelect = useCallback(
    (categoryId: string, optionId: string) => {
      onToggle(categoryId, optionId);
      setOpenCategory(null);
    },
    [onToggle],
  );

  // ── Currently-open category object ────────────────────────────────────
  const openCat = openCategory
    ? categories.find((c) => c.id === openCategory)
    : null;

  // ── Visible options for the open dropdown ─────────────────────────────
  const visibleOptions = useMemo(() => {
    if (!openCat) return [];
    const counts = itemCounts?.[openCat.id] ?? {};
    const realOptions = openCat.options.filter(
      (o) => o.id !== ALL_OPTION_ID && (counts[o.id] ?? 0) > 0,
    );
    const hideAll = realOptions.length <= 1;
    return openCat.options.filter((o) => {
      if (o.id === ALL_OPTION_ID) return !hideAll;
      return (counts[o.id] ?? 0) > 0;
    });
  }, [openCat, itemCounts]);

  // ── Per-pill: has active (non-All) filter? ────────────────────────────
  const statusHasFilter =
    activeFilters.status && activeFilters.status.size > 0;
  const reporterIsMine =
    activeFilters.reporter && activeFilters.reporter.has("MINE");

  // ── Dismiss overlay dimensions ────────────────────────────────────────
  const { height: screenHeight, width: screenWidth } =
    Dimensions.get("window");

  return (
    <View style={inline ? styles.wrapperInline : styles.wrapper} pointerEvents="box-none">
      {/* Full-screen dismiss overlay */}
      {openCategory != null && (
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View
            style={{
              position: "absolute",
              top: inline ? -barHeight : -(Platform.OS === "ios" ? 54 : 12),
              left: inline ? -screenWidth : -12,
              width: screenWidth * 3,
              height: screenHeight,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Bar content wrapper — measured (inline only) so the dropdown can be placed absolutely below it */}
      <View
        pointerEvents="box-none"
        onLayout={inline ? (e) => setBarHeight(e.nativeEvent.layout.height) : undefined}
      >
      {/* ── Row 1: Tune button (left) + Summary (right, leaves space for map btn) ── */}
      <View style={styles.row1} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            openCategory ? closeDropdown() : toggleCategory("issueType")
          }
          style={[
            styles.tuneBtn,
            openCategory != null && styles.tuneBtnActive,
          ]}
        >
          <MaterialIcons
            name={openCategory != null ? "close" : "tune"}
            size={20}
            color={openCategory != null ? "#fff" : "#374151"}
          />
          {openCategory == null && activeCount > 0 && (
            <View style={styles.activeDot} />
          )}
        </TouchableOpacity>

        <View style={[styles.summaryCard, inline && styles.summaryCardInline]}>
          {/* Issues & Events count tabs */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {/* Issues tab — tapping opens filter dropdown */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                openCategory ? closeDropdown() : toggleCategory("issueType")
              }
              style={[
                styles.countTab,
                activeCount > 0 ? styles.countTabIssuesActive : styles.countTabIssues,
              ]}
            >
              <View style={styles.issueDot} />
              <CustomText
                className="font-semibold"
                style={[styles.summaryTitle, activeCount > 0 && { color: "#256D1B" }]}
              >
                Issues {itemCounts?.issueType?.[ALL_OPTION_ID] ?? 0}
              </CustomText>
              <MaterialIcons
                name={openCategory === "issueType" ? "expand-less" : "expand-more"}
                size={13}
                color={activeCount > 0 ? "#256D1B" : "#9ca3af"}
              />
            </TouchableOpacity>

            {!!eventsCount && eventsCount > 0 && (
              <>
                <View style={styles.tabDivider} />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onEventsPress}
                  style={[
                    styles.countTab,
                    showEventsOnly ? styles.countTabEventsActive : styles.countTabEvents,
                  ]}
                >
                  <View style={[styles.eventDot, showEventsOnly && { backgroundColor: "#fff" }]} />
                  <CustomText
                    className="font-semibold"
                    style={[
                      styles.summaryTitle,
                      showEventsOnly ? { color: "#fff" } : { color: "#6366f1" },
                    ]}
                  >
                    Events {eventsCount}
                  </CustomText>
                  {showEventsOnly && (
                    <MaterialIcons name="close" size={12} color="#fff" />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ── Row 2: Category pills + active filter tags (right-aligned) ── */}
      <View style={styles.row2} pointerEvents="box-none">
        {/* Status pill */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleCategory("status")}
          style={[
            styles.catPill,
            openCategory === "status" && styles.catPillActive,
            openCategory !== "status" &&
              statusHasFilter &&
              styles.catPillFiltered,
          ]}
        >
          <MaterialIcons
            name="flag"
            size={13}
            color={
              openCategory === "status"
                ? "#fff"
                : statusHasFilter
                  ? "#256D1B"
                  : "#374151"
            }
          />
          <CustomText
            className="font-semibold"
            style={{
              fontSize: 11,
              color:
                openCategory === "status"
                  ? "#fff"
                  : statusHasFilter
                    ? "#256D1B"
                    : "#374151",
            }}
          >
            Status
          </CustomText>
          <MaterialIcons
            name={openCategory === "status" ? "expand-less" : "expand-more"}
            size={14}
            color={
              openCategory === "status"
                ? "#fff"
                : statusHasFilter
                  ? "#256D1B"
                  : "#9ca3af"
            }
          />
        </TouchableOpacity>

        {/* Mine toggle pill – direct toggle, no dropdown */}
        {reporterCat && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onToggle("reporter", reporterIsMine ? ALL_OPTION_ID : "MINE")}
            style={[
              styles.catPill,
              reporterIsMine && styles.catPillFiltered,
            ]}
          >
            <MaterialIcons
              name="person"
              size={13}
              color={reporterIsMine ? "#256D1B" : "#374151"}
            />
            <CustomText
              className="font-semibold"
              style={{ fontSize: 11, color: reporterIsMine ? "#256D1B" : "#374151" }}
            >
              Mine
            </CustomText>
          </TouchableOpacity>
        )}
      </View>

      </View>{/* end bar content wrapper */}

      {/* ── Dropdown panel (right-aligned, below row 2) ── */}
      {openCat != null && (
        <View style={[styles.dropdown, inline && { position: "absolute", top: barHeight + 4, left: 12, zIndex: 30 }]}>
          <ScrollView
            contentContainerStyle={styles.dropdownInner}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ maxHeight: 340 }}
          >
            {visibleOptions.map((option) => (
              <FilterChip
                key={option.id}
                label={option.label}
                selected={isSelected(openCat.id, option.id)}
                color={option.color}
                count={itemCounts?.[openCat.id]?.[option.id]}
                onPress={() => handleSelect(openCat.id, option.id)}
              />
            ))}

            {/* Clear all – shown when any filter is active */}
            {activeCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onClearAll();
                  closeDropdown();
                }}
                style={styles.clearAllBtn}
                activeOpacity={0.7}
              >
                <CustomText
                  className="font-semibold"
                  style={styles.clearAllText}
                >
                  Clear all
                </CustomText>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export const MapFilterOverlay = memo(MapFilterOverlayInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const DROPDOWN_WIDTH = 180;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 12,
    right: 0,
    left: 0,
    zIndex: 20,
    paddingHorizontal: 12,
  },
  wrapperInline: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    zIndex: 20,
  },
  // ── Row 1: summary + tune ──
  row1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryCard: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flex: 1,
    marginLeft: 8,
    marginRight: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardInline: {
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 12,
    color: "#374151",
  },
  summaryDetail: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 1,
  },
  countTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countTabIssues: {
    // transparent — no background when idle
  },
  countTabIssuesActive: {
    backgroundColor: "#dcfce7",
  },
  countTabEvents: {
    // transparent — no background when idle
  },
  countTabEventsActive: {
    backgroundColor: "#6366f1",
  },
  tabDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 2,
  },
  issueDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#6366f1",
  },
  tuneBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  tuneBtnActive: {
    backgroundColor: "#256D1B",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  // ── Row 2: pills + tags ──
  row2: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginTop: 8,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  catPillActive: {
    backgroundColor: "#256D1B",
  },
  catPillFiltered: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  // ── Dropdown ──
  dropdown: {
    width: DROPDOWN_WIDTH,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  dropdownInner: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clearAllBtn: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 2,
    marginHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  clearAllText: {
    fontSize: 11,
    color: "#ef4444",
  },
});
