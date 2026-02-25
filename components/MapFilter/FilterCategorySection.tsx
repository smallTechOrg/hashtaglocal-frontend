import { MaterialIcons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { FilterChip } from "./FilterChip";
import { ALL_OPTION_ID } from "./filterConfig";
import type { FilterCategory } from "./types";

interface FilterCategorySectionProps {
  category: FilterCategory;
  isSelected: (categoryId: string, optionId: string) => boolean;
  onToggle: (categoryId: string, optionId: string) => void;
  /** Per-option item counts (optionId → count). */
  itemCounts?: Record<string, number>;
  /** Whether the section is expanded to show chips. */
  expanded: boolean;
  /** Called when the header row is tapped. */
  onHeaderPress: () => void;
  /** When true, the "All" option is hidden (e.g. only 1 visible option). */
  hideAllOption?: boolean;
  /** Label shown inline when collapsed (e.g. the selected option name). */
  selectedLabel?: string;
}

/**
 * Collapsible section inside the filter panel.
 *
 * **Collapsed** – tappable header with an inline selected-label and chevron.
 * **Expanded** – header + filter chips.  Zero-count options are hidden.
 */
function FilterCategorySectionInner({
  category,
  isSelected,
  onToggle,
  itemCounts,
  expanded,
  onHeaderPress,
  hideAllOption,
  selectedLabel,
}: FilterCategorySectionProps) {
  // Only show options that have items (or the ALL option when allowed)
  const visibleOptions = useMemo(
    () =>
      category.options.filter((o) => {
        if (o.id === ALL_OPTION_ID) return !hideAllOption;
        return (itemCounts?.[o.id] ?? 0) > 0;
      }),
    [category.options, itemCounts, hideAllOption],
  );

  return (
    <View style={styles.section}>
      {/* Tappable header */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onHeaderPress}
        style={styles.header}
      >
        <MaterialIcons
          name={category.icon as keyof typeof MaterialIcons.glyphMap}
          size={13}
          color="#9ca3af"
        />
        <CustomText
          className="font-semibold"
          style={[
            styles.headerLabel,
            (expanded || !selectedLabel) && { flex: 1 },
          ]}
        >
          {category.label}
        </CustomText>

        {/* Inline selected label (collapsed only) */}
        {!expanded && selectedLabel != null && (
          <CustomText style={styles.selectedLabel} numberOfLines={1}>
            {selectedLabel}
          </CustomText>
        )}

        <MaterialIcons
          name={expanded ? "expand-less" : "chevron-right"}
          size={16}
          color="#9ca3af"
        />
      </TouchableOpacity>

      {/* Chips – visible only when expanded */}
      {expanded &&
        visibleOptions.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            selected={isSelected(category.id, option.id)}
            color={option.color}
            count={itemCounts?.[option.id]}
            onPress={() => onToggle(category.id, option.id)}
          />
        ))}
    </View>
  );
}

export const FilterCategorySection = memo(FilterCategorySectionInner);

const styles = StyleSheet.create({
  section: {
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 1,
  },
  headerLabel: {
    fontSize: 10,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectedLabel: {
    fontSize: 11,
    color: "#374151",
    flex: 1,
    marginLeft: 2,
  },
});
