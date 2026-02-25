/**
 * Generic, extensible filter system types for map overlays.
 *
 * The system is designed around two concepts:
 *   1. **FilterCategory** – a named group of options (e.g. "Issue Type", "Status").
 *   2. **FilterOption**   – one selectable value inside a category.
 *
 * Any domain object displayed on the map (issues today, events/places tomorrow)
 * can expose its own array of FilterCategory definitions without touching the
 * core filter components.
 */

/** A single selectable value inside a filter category. */
export interface FilterOption {
  /** Unique id within the category (e.g. "POTHOLE", "OPEN"). */
  id: string;
  /** Human-readable label displayed on the chip. */
  label: string;
  /** Optional colour used for the chip accent. */
  color?: string;
  /** Optional MaterialIcons icon name. */
  icon?: string;
}

/** A group of related filter options. */
export interface FilterCategory {
  /** Unique id for this category (e.g. "issueType", "status"). */
  id: string;
  /** Display label (e.g. "Type", "Status"). */
  label: string;
  /** MaterialIcons icon name shown next to the category label. */
  icon: string;
  /** Whether multiple options can be active at once. */
  multiSelect: boolean;
  /** The list of available options. */
  options: FilterOption[];
}

/**
 * A map from category id → set of selected option ids.
 *
 * An empty set (or missing key) means "all" – i.e. no restriction for that
 * category.  This keeps the default state allocation-free and lets the filter
 * logic stay simple.
 */
export type ActiveFilters = Record<string, Set<string>>;

/**
 * Predicate that decides whether a single map item passes the current filters.
 *
 * Each domain (issues, events, …) provides its own implementation that knows
 * how to read the relevant fields from its data model.
 */
export type FilterPredicate<T> = (item: T, activeFilters: ActiveFilters) => boolean;
