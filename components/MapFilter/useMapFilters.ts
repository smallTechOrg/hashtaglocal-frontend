import { useCallback, useMemo, useRef, useState } from "react";

import { ALL_OPTION_ID } from "./filterConfig";
import type { ActiveFilters, FilterCategory, FilterPredicate } from "./types";

/**
 * Lightweight hook that manages filter state for any set of FilterCategories.
 *
 * It is completely domain-agnostic: the caller passes in the categories and
 * a predicate, and the hook exposes the filtered result plus helpers to
 * toggle / clear selections.
 *
 * Usage:
 * ```ts
 * const { filteredItems, activeFilters, toggle, clear, clearAll, activeCount }
 *   = useMapFilters(issues, ISSUE_FILTER_CATEGORIES, issueFilterPredicate);
 * ```
 */
export function useMapFilters<T>(
  items: T[],
  categories: FilterCategory[],
  predicate: FilterPredicate<T>,
) {
  // Instead of nested state we keep a simple version counter to force
  // re-renders after mutating the ref.  This avoids creating new Set objects
  // on every toggle.
  const filtersRef = useRef<ActiveFilters>({});
  const [version, setVersion] = useState(0);

  /** Toggle a single option inside a category. */
  const toggle = useCallback(
    (categoryId: string, optionId: string) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;

      // "All" means "clear category" — no restriction.
      if (optionId === ALL_OPTION_ID) {
        filtersRef.current = { ...filtersRef.current, [categoryId]: new Set() };
        setVersion((v) => v + 1);
        return;
      }

      const current = filtersRef.current[categoryId];
      const next = new Set(current);

      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        if (!category.multiSelect) {
          // Single-select: clear previous
          next.clear();
        }
        next.add(optionId);
      }

      filtersRef.current = { ...filtersRef.current, [categoryId]: next };
      setVersion((v) => v + 1);
    },
    [categories],
  );

  /** Clear all selections for one category. */
  const clear = useCallback((categoryId: string) => {
    filtersRef.current = { ...filtersRef.current, [categoryId]: new Set() };
    setVersion((v) => v + 1);
  }, []);

  /** Reset every category. */
  const clearAll = useCallback(() => {
    filtersRef.current = {};
    setVersion((v) => v + 1);
  }, []);

  /** Check if a specific option is selected. */
  const isSelected = useCallback(
    (categoryId: string, optionId: string) => {
      // Access version to subscribe to changes (the value itself is unused).
      void version;
      const selectedSet = filtersRef.current[categoryId];
      // "All" is logically selected when nothing else in the category is.
      if (optionId === ALL_OPTION_ID) {
        return !selectedSet || selectedSet.size === 0;
      }
      return selectedSet?.has(optionId) ?? false;
    },
    [version],
  );

  /** Total number of active individual selections across all categories. */
  const activeCount = useMemo(() => {
    void version;
    return Object.values(filtersRef.current).reduce(
      (sum, s) => sum + s.size,
      0,
    );
  }, [version]);

  /** Items that pass all active filters. */
  const filteredItems = useMemo(() => {
    void version;
    const af = filtersRef.current;
    // Fast path: nothing selected → everything passes.
    if (activeCount === 0) return items;
    return items.filter((item) => predicate(item, af));
  }, [items, predicate, activeCount, version]);

  return {
    /** The current active filters snapshot (read-only). */
    activeFilters: filtersRef.current,
    /** Items that pass the active filters. */
    filteredItems,
    /** Total number of selected filter options. */
    activeCount,
    /** Toggle one option on/off. */
    toggle,
    /** Clear one category. */
    clear,
    /** Clear all categories. */
    clearAll,
    /** Check if a specific option is currently selected. */
    isSelected,
  } as const;
}
