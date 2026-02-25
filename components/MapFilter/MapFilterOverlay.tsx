import { MaterialIcons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import CustomText from "@/components/CustomText";
import { FilterCategorySection } from "./FilterCategorySection";
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
 * Floating filter panel anchored to the top-right of the map.
 *
 * **Collapsed** – Rich summary card + tune button.
 * **Expanded** – Accordion sections for Type and Status. Picking a type
 * collapses its section and reveals a collapsed Status section. Picking a
 * status collapses the entire panel.  Tapping outside dismisses the panel.
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
  const [expanded, setExpanded] = useState(false);

  // Per-section accordion state
  const [typeExpanded, setTypeExpanded] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);

  // Animated values
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expanded, expandAnim]);

  // ── Open / close helpers ──────────────────────────────────────────────
  const openPanel = useCallback(() => {
    const hasActiveType =
      activeFilters.issueType && activeFilters.issueType.size > 0;
    const hasActiveStatus =
      activeFilters.status && activeFilters.status.size > 0;

    if (hasActiveType || hasActiveStatus) {
      // Filters active → both sections collapsed so user sees the overview
      setTypeExpanded(false);
      setStatusVisible(true);
      setStatusExpanded(false);
    } else {
      // No filters → start with type expanded
      setTypeExpanded(true);
      setStatusVisible(false);
      setStatusExpanded(false);
    }
    setExpanded(true);
  }, [activeFilters]);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    if (expanded) collapse();
    else openPanel();
  }, [expanded, collapse, openPanel]);

  // ── Section header press (accordion) ──────────────────────────────────
  const handleTypeHeaderPress = useCallback(() => {
    setTypeExpanded((prev) => {
      if (!prev) setStatusExpanded(false); // opening type → close status
      return !prev;
    });
  }, []);

  const handleStatusHeaderPress = useCallback(() => {
    setStatusExpanded((prev) => {
      if (!prev) setTypeExpanded(false); // opening status → close type
      return !prev;
    });
  }, []);

  // ── Toggle handler ────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (categoryId: string, optionId: string) => {
      onToggle(categoryId, optionId);

      if (categoryId === "issueType") {
        // Collapse type section, reveal status section (collapsed)
        setTypeExpanded(false);
        setStatusVisible(true);
        setStatusExpanded(false);
      } else {
        // Picked a status → collapse entire panel
        collapse();
      }
    },
    [onToggle, collapse],
  );

  // ── Categories ────────────────────────────────────────────────────────
  const typeCat = categories.find((c) => c.id === "issueType");
  const statusCat = categories.find((c) => c.id === "status");

  // ── Selected labels (shown inline when section is collapsed) ─────────
  const typeSelectedLabel = useMemo(() => {
    const active = activeFilters.issueType;
    if (!active || active.size === 0) return "All";
    const optId = [...active][0];
    return typeCat?.options.find((o) => o.id === optId)?.label ?? "All";
  }, [activeFilters, typeCat]);

  const statusSelectedLabel = useMemo(() => {
    const active = activeFilters.status;
    if (!active || active.size === 0) return "All";
    const optId = [...active][0];
    return statusCat?.options.find((o) => o.id === optId)?.label ?? "All";
  }, [activeFilters, statusCat]);

  // ── Hide "All" option in status when ≤1 real option visible ──────────
  const hideStatusAll = useMemo(() => {
    if (!statusCat || !itemCounts?.status) return false;
    const nonAllVisible = statusCat.options.filter(
      (o) => o.id !== ALL_OPTION_ID && (itemCounts.status[o.id] ?? 0) > 0,
    );
    return nonAllVisible.length <= 1;
  }, [statusCat, itemCounts]);

  // ── Rich summary content ─────────────────────────────────────────────
  const summaryLines = useMemo(() => {
    const hasTypeFilter =
      activeFilters.issueType && activeFilters.issueType.size > 0;
    const hasStatusFilter =
      activeFilters.status && activeFilters.status.size > 0;

    if (!hasTypeFilter && !hasStatusFilter) {
      // Default: generous breakdown
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

    // Active filter labels
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

    const filteredTotal = Object.entries(itemCounts?.issueType ?? {})
      .filter(([k]) => k !== ALL_OPTION_ID)
      .reduce((s, [, n]) => s + n, 0);

    return {
      title: parts.join(" · "),
      detail: `${filteredTotal} matching`,
    };
  }, [activeFilters, itemCounts, typeCat, statusCat]);

  // ── Animated interpolations ──────────────────────────────────────────
  const panelMaxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 420],
  });

  const panelOpacity = expandAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.7, 1],
  });

  const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Full-screen dismiss overlay */}
      {expanded && (
        <TouchableWithoutFeedback onPress={collapse}>
          <View
            style={{
              position: "absolute",
              top: -(Platform.OS === "ios" ? 54 : 12),
              right: -12,
              width: screenWidth,
              height: screenHeight,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.container} pointerEvents="box-none">
        {/* ──── Summary card + tune button ──── */}
        <View style={styles.triggerRow}>
          {!expanded && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openPanel}
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
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleExpanded}
            style={[
              styles.triggerBtn,
              expanded && styles.triggerBtnExpanded,
            ]}
          >
            <MaterialIcons
              name={expanded ? "close" : "tune"}
              size={20}
              color={expanded ? "#fff" : "#374151"}
            />
            {!expanded && activeCount > 0 && (
              <View style={styles.activeDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* ──── Expandable panel ──── */}
        <Animated.View
          style={[
            styles.panel,
            { maxHeight: panelMaxHeight, opacity: panelOpacity },
          ]}
          pointerEvents={expanded ? "auto" : "none"}
        >
          <ScrollView
            contentContainerStyle={styles.panelInner}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ maxHeight: 400 }}
          >
            {/* Type section – always visible when panel open */}
            {typeCat && (
              <FilterCategorySection
                category={typeCat}
                isSelected={isSelected}
                onToggle={handleToggle}
                itemCounts={itemCounts?.[typeCat.id]}
                expanded={typeExpanded}
                onHeaderPress={handleTypeHeaderPress}
                selectedLabel={typeSelectedLabel}
              />
            )}

            {/* Status section – appears after user picks a type */}
            {statusVisible && statusCat && (
              <FilterCategorySection
                category={statusCat}
                isSelected={isSelected}
                onToggle={handleToggle}
                itemCounts={itemCounts?.[statusCat.id]}
                expanded={statusExpanded}
                onHeaderPress={handleStatusHeaderPress}
                hideAllOption={hideStatusAll}
                selectedLabel={statusSelectedLabel}
              />
            )}

            {/* Clear all */}
            {activeCount > 0 && (
              <TouchableOpacity
                onPress={() => { onClearAll(); collapse(); }}
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
        </Animated.View>
      </View>
    </View>
  );
}

export const MapFilterOverlay = memo(MapFilterOverlayInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 190;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 12,
    right: 0,
    zIndex: 20,
    alignItems: "flex-end",
    paddingRight: 12,
  },
  container: {
    alignItems: "flex-end",
    width: PANEL_WIDTH + 48,
  },
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  // ── Summary card ──
  summaryCard: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: PANEL_WIDTH,
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
  // ── Trigger button ──
  triggerBtn: {
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
  triggerBtnExpanded: {
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
  // ── Panel ──
  panel: {
    overflow: "hidden",
    width: PANEL_WIDTH,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  panelInner: {
    paddingVertical: 8,
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
