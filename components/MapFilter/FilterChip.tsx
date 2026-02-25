import { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";

interface FilterChipProps {
  label: string;
  selected: boolean;
  color?: string;
  /** Optional count shown inline. */
  count?: number;
  onPress: () => void;
}

/**
 * A compact filter row used inside the vertical filter panel.
 *
 * - Shows a coloured dot + label + optional count.
 * - When **selected**: accent-coloured background tint, bold text.
 * - When **unselected**: transparent background, muted text.
 */
function FilterChipInner({ label, selected, color, count, onPress }: FilterChipProps) {
  const accentColor = color ?? "#256D1B";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.row,
        selected && { backgroundColor: accentColor + "18" },
      ]}
    >
      {/* Colour dot */}
      <View style={[styles.dot, { backgroundColor: accentColor }]} />

      <CustomText
        className={selected ? "font-semibold" : ""}
        style={[styles.label, { color: selected ? accentColor : "#374151" }]}
        numberOfLines={1}
      >
        {label}
      </CustomText>

      {count != null && count > 0 && (
        <CustomText
          className="font-semibold"
          style={[styles.count, { color: selected ? accentColor : "#9ca3af" }]}
        >
          {count}
        </CustomText>
      )}
    </TouchableOpacity>
  );
}

export const FilterChip = memo(FilterChipInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    flex: 1,
  },
  count: {
    fontSize: 11,
    minWidth: 14,
    textAlign: "right",
  },
});
