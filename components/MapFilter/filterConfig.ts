/**
 * Filter configuration for map items.
 *
 * Each domain (Issues, Events, …) exposes an array of FilterCategory
 * definitions and a predicate that applies the active selections to its
 * items.  Adding a new domain is as simple as creating a new config
 * object – no changes to the filter UI components are required.
 */

import { ISSUE_TYPES } from "@/constants/issueTypes";
import type { FilterCategory, FilterPredicate } from "./types";

// ---------------------------------------------------------------------------
// Issue-specific configuration
// ---------------------------------------------------------------------------

/** Colour mapping for issue-type chips. */
const ISSUE_TYPE_COLORS: Record<string, string> = {
  POTHOLE: "#ef4444",
  WASTE: "#22c55e",
  FOOTPATH: "#3b82f6",
  POLLUTION: "#8b5cf6",
  HYGIENE: "#06b6d4",
  SAFETY: "#f59e0b",
  OTHER: "#6b7280",
};

/** Colour mapping for status chips. */
const STATUS_COLORS: Record<string, string> = {
  OPEN: "#22c55e",
  PENDING: "#f59e0b",
  ONHOLD: "#8b5cf6",
  RESOLVED: "#3b82f6",
  REJECTED: "#ef4444",
};

/** Special option id that means "show everything" (clears category). */
export const ALL_OPTION_ID = "ALL";

/** Filter categories available for issues. */
export const ISSUE_FILTER_CATEGORIES: FilterCategory[] = [
  {
    id: "reporter",
    label: "Reporter",
    icon: "person",
    multiSelect: false,
    options: [
      { id: ALL_OPTION_ID, label: "All", color: "#256D1B" },
      { id: "MINE", label: "Mine", color: "#256D1B" },
    ],
  },
  {
    id: "issueType",
    label: "Type",
    icon: "category",
    multiSelect: false,
    options: [
      { id: ALL_OPTION_ID, label: "All", color: "#256D1B" },
      ...ISSUE_TYPES.map((t) => ({
        id: t.id,
        label: t.label.split(" ")[0], // short label: "Potholes", "Waste", …
        color: ISSUE_TYPE_COLORS[t.id],
        icon: t.icon,
      })),
    ],
  },
  {
    id: "status",
    label: "Status",
    icon: "flag",
    multiSelect: false,
    options: [
      { id: ALL_OPTION_ID, label: "All", color: "#256D1B" },
      { id: "OPEN", label: "Open", color: STATUS_COLORS.OPEN },
      { id: "PENDING", label: "Pending", color: STATUS_COLORS.PENDING },
      { id: "ONHOLD", label: "On Hold", color: STATUS_COLORS.ONHOLD },
      { id: "RESOLVED", label: "Resolved", color: STATUS_COLORS.RESOLVED },
      { id: "REJECTED", label: "Rejected", color: STATUS_COLORS.REJECTED },
    ],
  },
];

/**
 * Generic interface for any item displayed on the map that can be filtered.
 * Issues, events, etc. should satisfy (at minimum) these fields when using
 * the built-in issue predicate.  For other domains, supply a custom predicate.
 */
interface FilterableIssue {
  type: string;
  status?: string;
  user?: { username?: string };
}

/**
 * Factory that returns a predicate bound to the current user's username.
 * Pass `currentUsername` to enable the "Mine" reporter filter.
 */
export function createIssueFilterPredicate(
  currentUsername?: string,
): FilterPredicate<FilterableIssue> {
  return (issue, activeFilters) => {
    // Issue type filter
    const typeFilter = activeFilters.issueType;
    if (typeFilter && typeFilter.size > 0) {
      if (!typeFilter.has(issue.type.toUpperCase())) return false;
    }

    // Status filter
    const statusFilter = activeFilters.status;
    if (statusFilter && statusFilter.size > 0) {
      const issueStatus = (issue.status ?? "").toUpperCase();
      if (!statusFilter.has(issueStatus)) return false;
    }

    // Reporter filter
    const reporterFilter = activeFilters.reporter;
    if (reporterFilter && reporterFilter.has("MINE")) {
      if (!currentUsername || issue.user?.username !== currentUsername) return false;
    }

    return true;
  };
}

/** Default predicate with no reporter restriction (backwards compat). */
export const issueFilterPredicate: FilterPredicate<FilterableIssue> =
  createIssueFilterPredicate();
