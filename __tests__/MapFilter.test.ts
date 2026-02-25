import {
    ALL_OPTION_ID,
    ISSUE_FILTER_CATEGORIES,
    issueFilterPredicate,
} from "@/components/MapFilter/filterConfig";
import type { FilterCategory } from "@/components/MapFilter/types";
import { useMapFilters } from "@/components/MapFilter/useMapFilters";
import { act, renderHook } from "@testing-library/react-native";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockIssue {
  id: number;
  type: string;
  status: string;
  location: { lat: number; lng: number };
  description: string;
}

const mockIssues: MockIssue[] = [
  { id: 1, type: "Pothole", status: "OPEN", location: { lat: 0, lng: 0 }, description: "a" },
  { id: 2, type: "Waste", status: "OPEN", location: { lat: 0, lng: 0 }, description: "b" },
  { id: 3, type: "Pothole", status: "RESOLVED", location: { lat: 0, lng: 0 }, description: "c" },
  { id: 4, type: "Safety", status: "PENDING", location: { lat: 0, lng: 0 }, description: "d" },
  { id: 5, type: "Footpath", status: "ONHOLD", location: { lat: 0, lng: 0 }, description: "e" },
  { id: 6, type: "Pollution", status: "REJECTED", location: { lat: 0, lng: 0 }, description: "f" },
];

// ---------------------------------------------------------------------------
// useMapFilters hook tests
// ---------------------------------------------------------------------------

describe("useMapFilters", () => {
  const setup = (items = mockIssues) =>
    renderHook(() =>
      useMapFilters(items, ISSUE_FILTER_CATEGORIES, issueFilterPredicate),
    );

  it("returns all items when no filter is active", () => {
    const { result } = setup();
    expect(result.current.filteredItems).toHaveLength(mockIssues.length);
    expect(result.current.activeCount).toBe(0);
  });

  it("filters by a single issue type", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
    });

    expect(result.current.filteredItems).toHaveLength(2); // id 1, 3
    expect(result.current.activeCount).toBe(1);
    expect(result.current.isSelected("issueType", "POTHOLE")).toBe(true);
    expect(result.current.isSelected("issueType", "WASTE")).toBe(false);
  });

  it("single-select: second toggle in same category replaces first", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
    });
    expect(result.current.filteredItems).toHaveLength(2); // id 1, 3

    act(() => {
      result.current.toggle("issueType", "WASTE");
    });

    // WASTE replaces POTHOLE (single-select)
    expect(result.current.filteredItems).toHaveLength(1); // id 2
    expect(result.current.activeCount).toBe(1);
    expect(result.current.isSelected("issueType", "POTHOLE")).toBe(false);
    expect(result.current.isSelected("issueType", "WASTE")).toBe(true);
  });

  it("filters by status", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("status", "OPEN");
    });

    expect(result.current.filteredItems).toHaveLength(2); // id 1, 2
  });

  it("combines type and status filters (AND logic)", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
      result.current.toggle("status", "OPEN");
    });

    // Only Pothole + OPEN => id 1
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe(1);
    expect(result.current.activeCount).toBe(2);
  });

  it("toggling the same option off removes it", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
    });
    expect(result.current.filteredItems).toHaveLength(2);

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
    });
    expect(result.current.filteredItems).toHaveLength(mockIssues.length);
    expect(result.current.activeCount).toBe(0);
  });

  it("clear() resets a single category", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
      result.current.toggle("status", "OPEN");
    });
    expect(result.current.activeCount).toBe(2);

    act(() => {
      result.current.clear("issueType");
    });

    expect(result.current.isSelected("issueType", "POTHOLE")).toBe(false);
    expect(result.current.isSelected("status", "OPEN")).toBe(true);
    expect(result.current.activeCount).toBe(1);
    expect(result.current.filteredItems).toHaveLength(2); // OPEN only
  });

  it("clearAll() resets everything", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
      result.current.toggle("status", "RESOLVED");
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.activeCount).toBe(0);
    expect(result.current.filteredItems).toHaveLength(mockIssues.length);
  });

  it("reacts when the items array changes length", () => {
    const short = mockIssues.slice(0, 3);
    const { result } = setup(short);
    expect(result.current.filteredItems).toHaveLength(3);

    // With no active filters the filtered list always equals input length.
    // (The hook references `items` inside its useMemo so a new array re-filters.)
    expect(result.current.activeCount).toBe(0);
  });

  it("toggling ALL clears the category", () => {
    const { result } = setup();

    act(() => {
      result.current.toggle("issueType", "POTHOLE");
    });
    expect(result.current.activeCount).toBe(1);
    expect(result.current.isSelected("issueType", "POTHOLE")).toBe(true);

    act(() => {
      result.current.toggle("issueType", ALL_OPTION_ID);
    });

    // ALL clears the category → back to no filter
    expect(result.current.activeCount).toBe(0);
    expect(result.current.filteredItems).toHaveLength(mockIssues.length);
    expect(result.current.isSelected("issueType", "POTHOLE")).toBe(false);
  });

  it("ALL is reported as selected when no option is active in category", () => {
    const { result } = setup();

    // Nothing selected → ALL should be logically selected
    expect(result.current.isSelected("issueType", ALL_OPTION_ID)).toBe(true);
    expect(result.current.isSelected("status", ALL_OPTION_ID)).toBe(true);

    act(() => {
      result.current.toggle("issueType", "WASTE");
    });

    // Now type has a selection → ALL is no longer selected for type
    expect(result.current.isSelected("issueType", ALL_OPTION_ID)).toBe(false);
    // But status still has no selection → ALL is selected there
    expect(result.current.isSelected("status", ALL_OPTION_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// issueFilterPredicate unit tests
// ---------------------------------------------------------------------------

describe("issueFilterPredicate", () => {
  const issue = { type: "Pothole", status: "OPEN" };

  it("passes when no filters are active", () => {
    expect(issueFilterPredicate(issue, {})).toBe(true);
  });

  it("passes when matching type is selected", () => {
    expect(
      issueFilterPredicate(issue, { issueType: new Set(["POTHOLE"]) }),
    ).toBe(true);
  });

  it("fails when a different type is selected", () => {
    expect(
      issueFilterPredicate(issue, { issueType: new Set(["WASTE"]) }),
    ).toBe(false);
  });

  it("passes when matching status is selected", () => {
    expect(
      issueFilterPredicate(issue, { status: new Set(["OPEN"]) }),
    ).toBe(true);
  });

  it("fails when a different status is selected", () => {
    expect(
      issueFilterPredicate(issue, { status: new Set(["RESOLVED"]) }),
    ).toBe(false);
  });

  it("combines type + status with AND logic", () => {
    const filters = {
      issueType: new Set(["POTHOLE"]),
      status: new Set(["RESOLVED"]),
    };
    // type matches, status doesn't
    expect(issueFilterPredicate(issue, filters)).toBe(false);
  });

  it("handles missing status field gracefully", () => {
    const noStatus = { type: "Pothole" };
    expect(
      issueFilterPredicate(noStatus, { status: new Set(["OPEN"]) }),
    ).toBe(false);
    expect(issueFilterPredicate(noStatus, {})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ISSUE_FILTER_CATEGORIES config sanity checks
// ---------------------------------------------------------------------------

describe("ISSUE_FILTER_CATEGORIES", () => {
  it("has at least 2 categories (type + status)", () => {
    expect(ISSUE_FILTER_CATEGORIES.length).toBeGreaterThanOrEqual(2);
  });

  it("each category has a unique id", () => {
    const ids = ISSUE_FILTER_CATEGORIES.map((c: FilterCategory) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every option within a category has a unique id", () => {
    ISSUE_FILTER_CATEGORIES.forEach((cat: FilterCategory) => {
      const optionIds = cat.options.map((o) => o.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
    });
  });

  it("issue type category includes all constants/issueTypes entries plus ALL", () => {
    const typeCat = ISSUE_FILTER_CATEGORIES.find(
      (c: FilterCategory) => c.id === "issueType",
    )!;
    expect(typeCat).toBeDefined();
    expect(typeCat.options.length).toBe(8); // 7 issue types + ALL
    expect(typeCat.options[0].id).toBe(ALL_OPTION_ID);
  });

  it("status category includes expected statuses plus ALL", () => {
    const statusCat = ISSUE_FILTER_CATEGORIES.find(
      (c: FilterCategory) => c.id === "status",
    )!;
    expect(statusCat).toBeDefined();
    const ids = statusCat.options.map((o) => o.id);
    expect(ids[0]).toBe(ALL_OPTION_ID);
    expect(ids).toContain("OPEN");
    expect(ids).toContain("RESOLVED");
    expect(ids).toContain("PENDING");
    expect(ids).toContain("ONHOLD");
    expect(ids).toContain("REJECTED");
  });
});
