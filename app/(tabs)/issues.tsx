import CustomText from "@/components/CustomText";
import IssueListItem from "@/components/IssueListItem";
import {
  createIssueFilterPredicate,
  ISSUE_FILTER_CATEGORIES,
  MapFilterOverlay,
  useMapFilters,
} from "@/components/MapFilter";
import { useIssues } from "@/utils/IssuesContext";
import { useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";

export default function IssuesScreen() {
  const { issues: contextIssues } = useIssues();
  const { user } = useUser();

  // Build predicate bound to the current user (enables "Mine" filter)
  const issueFilterPredicate = useMemo(
    () => createIssueFilterPredicate(user?.username),
    [user?.username],
  );

  const {
    filteredItems: filteredIssues,
    activeFilters,
    activeCount: filterActiveCount,
    toggle: filterToggle,
    clear: filterClear,
    clearAll: filterClearAll,
    isSelected: filterIsSelected,
  } = useMapFilters(contextIssues, ISSUE_FILTER_CATEGORIES, issueFilterPredicate);

  // Cross-filtered per-option counts (mirrors map page logic exactly)
  const filterItemCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {
      reporter: {},
      issueType: {},
      status: {},
    };

    const activeType = activeFilters.issueType;
    const activeStatus = activeFilters.status;
    const activeReporter = activeFilters.reporter;
    const hasTypeFilter = activeType && activeType.size > 0;
    const hasStatusFilter = activeStatus && activeStatus.size > 0;
    const hasReporterFilter = activeReporter && activeReporter.has("MINE");

    contextIssues.forEach((issue) => {
      const typeKey = issue.type.toUpperCase();
      const statusKey = (issue.status ?? "").toUpperCase();
      const isMine = issue.user?.username === user?.username;

      // Type counts: cross-filtered by active status + reporter
      const passesStatusForType = !hasStatusFilter || activeStatus!.has(statusKey);
      const passesReporterForType = !hasReporterFilter || isMine;
      if (passesStatusForType && passesReporterForType) {
        counts.issueType[typeKey] = (counts.issueType[typeKey] || 0) + 1;
      }

      // Status counts: cross-filtered by active type + reporter
      const passesTypeForStatus = !hasTypeFilter || activeType!.has(typeKey);
      const passesReporterForStatus = !hasReporterFilter || isMine;
      if (statusKey && passesTypeForStatus && passesReporterForStatus) {
        counts.status[statusKey] = (counts.status[statusKey] || 0) + 1;
      }

      // Reporter counts: cross-filtered by active type + status
      const passesTypeForReporter = !hasTypeFilter || activeType!.has(typeKey);
      const passesStatusForReporter = !hasStatusFilter || activeStatus!.has(statusKey);
      if (isMine && passesTypeForReporter && passesStatusForReporter) {
        counts.reporter["MINE"] = (counts.reporter["MINE"] || 0) + 1;
      }
    });

    counts.issueType["ALL"] = Object.values(counts.issueType).reduce((s, n) => s + n, 0);
    counts.status["ALL"] = Object.values(counts.status).reduce((s, n) => s + n, 0);
    counts.reporter["ALL"] = contextIssues.length;

    return counts;
  }, [contextIssues, activeFilters, user?.username]);

  return (
    <View style={styles.container}>
      {/* Filter bar – identical to the map page filter, rendered inline */}
      <MapFilterOverlay
        inline
        categories={ISSUE_FILTER_CATEGORIES}
        isSelected={filterIsSelected}
        onToggle={filterToggle}
        onClear={filterClear}
        onClearAll={filterClearAll}
        activeCount={filterActiveCount}
        activeFilters={activeFilters}
        itemCounts={filterItemCounts}
      />

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={48} color="#d1d5db" />
          <CustomText className="font-bold text-lg mt-4">
            No Issues Found
          </CustomText>
          <CustomText className="text-center mt-2">
            {filterActiveCount > 0
              ? "Try adjusting your filters"
              : "Open the Map tab to load issues near you"}
          </CustomText>
        </View>
      ) : (
        <FlatList
          data={filteredIssues}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <IssueListItem
              id={item.id}
              type={item.type}
              status={item.status}
              description={item.description}
              created_at={item.created_at}
              verify_count={item.verify_count}
              location={item.location}
              media_urls={item.media_urls}
            />
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          windowSize={5}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          removeClippedSubviews={true}
          onEndReachedThreshold={0.3}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  listContent: {
    paddingVertical: 8,
  },
});
