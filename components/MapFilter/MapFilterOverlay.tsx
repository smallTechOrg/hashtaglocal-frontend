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
}: MapFilterOverlayProps) {
  // Which category dropdown is currently open (null = all collapsed)
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const typeCat = categories.find((c) => c.id === "issueType");
  const statusCat = categories.find((c) => c.id === "status");

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
  const typeHasFilter =
    activeFilters.issueType && activeFilters.issueType.size > 0;
  const statusHasFilter =
    activeFilters.status && activeFilters.status.size > 0;

  // ── Rich summary ──────────────────────────────────────────────────────
  const summaryLines = useMemo(() => {
    const hasTypeFilter =
      activeFilters.issueType && activeFilters.issueType.size > 0;
    const hasStatusFilter =
      activeFilters.status && activeFilters.status.size > 0;

    if (!hasTypeFilter && !hasStatusFilter) {
      const typeCounts = itemCounts?.issueType ?? {};
      const total = typeCounts[ALL_OPTION_ID] ?? 0;
      const breakdown = Object.entries(typeCounts)
        .filter(([k, v]) => k !== ALL_OPTION_ID && v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k]) => {
          const opt = typeCat?.options.find((o) => o.id === k);
          return opt ? `${opt.label} ${typeCounts[k]}` : null;
        })
        .filter(Boolean) as string[];

      return {
        title: `${total} issues nearby`,
        detail: breakdown.length > 0 ? breakdown.join(" · ") : null,
      };
    }

    // Active filters → show names + count
    const parts: string[] = [];
    if (hasTypeFilter) {
      const optId = [...activeFilters.issueType][0];
      const opt = typeCat?.options.find((o) => o.id === optId);
      if (opt) parts.push(opt.label);
    }
    if (hasStatusFilter) {
      const optId = [...activeFilters.status][0];
      const opt = statusCat?.options.find((o) => o.id === optId);
      if (opt) parts.push(opt.label);
    }

    // Use the ALL count from issueType which already reflects cross-category filtering
    const filteredTotal = itemCounts?.issueType?.[ALL_OPTION_ID] ?? 0;

    return {
      title: parts.join(" · "),
      detail: `${filteredTotal} matching`,
    };
  }, [activeFilters, itemCounts, typeCat, statusCat]);

  // ── Dismiss overlay dimensions ────────────────────────────────────────
  const { height: screenHeight, width: screenWidth } =
    Dimensions.get("window");

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Full-screen dismiss overlay */}
      {openCategory != null && (
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View
            style={{
              position: "absolute",
              top: -(Platform.OS === "ios" ? 54 : 12),
              left: -12,
              width: screenWidth,
              height: screenHeight,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* ── Row 1: Summary (left) + Tune button (right) ── */}
      <View style={styles.row1} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            openCategory ? closeDropdown() : toggleCategory("issueType")
          }
          style={styles.summaryCard}
        >
          <CustomText
            className="font-semibold"
            style={[
              styles.summaryTitle,
              activeCount > 0 && { color: "#256D1B" },
            ]}
          >
            {summaryLines.title}
          </CustomText>
          {summaryLines.detail && (
            <CustomText
              style={[
                styles.summaryDetail,
                activeCount > 0 && { color: "#256D1B90" },
              ]}
              numberOfLines={1}
            >
              {summaryLines.detail}
            </CustomText>
          )}
        </TouchableOpacity>

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
      </View>

      {/* ── Row 2: Category pills + active filter tags (right-aligned) ── */}
      <View style={styles.row2} pointerEvents="box-none">
        {/* Type pill */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleCategory("issueType")}
          style={[
            styles.catPill,
            openCategory === "issueType" && styles.catPillActive,
            openCategory !== "issueType" &&
              typeHasFilter &&
              styles.catPillFiltered,
          ]}
        >
          <MaterialIcons
            name="category"
            size={13}
            color={
              openCategory === "issueType"
                ? "#fff"
                : typeHasFilter
                  ? "#256D1B"
                  : "#374151"
            }
          />
          <CustomText
            className="font-semibold"
            style={{
              fontSize: 11,
              color:
                openCategory === "issueType"
                  ? "#fff"
                  : typeHasFilter
                    ? "#256D1B"
                    : "#374151",
            }}
          >
            Type
          </CustomText>
          <MaterialIcons
            name={
              openCategory === "issueType" ? "expand-less" : "expand-more"
            }
            size={14}
            color={
              openCategory === "issueType"
                ? "#fff"
                : typeHasFilter
                  ? "#256D1B"
                  : "#9ca3af"
            }
          />
        </TouchableOpacity>

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
      </View>

      {/* ── Dropdown panel (right-aligned, below row 2) ── */}
      {openCat != null && (
        <View style={styles.dropdown}>
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
  // ── Row 1: summary + tune ──
  row1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryCard: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flex: 1,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
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
    justifyContent: "flex-end",
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
    borderWidth: 1,
    borderColor: "#86efac",
  },
  // ── Dropdown ──
  dropdown: {
    width: DROPDOWN_WIDTH,
    marginTop: 6,
    alignSelf: "flex-end",
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
