import CustomText from "@/components/CustomText";
import IssueListItem from "@/components/IssueListItem";
import { useIssues } from "@/utils/IssuesContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

const ISSUE_TYPES = [
  "All",
  "Pothole",
  "Waste",
  "Footpath",
  "Pollution",
  "Hygiene",
  "Safety",
  "Other",
];

const DAYS_FILTERS = [
  { label: "All", value: 0 },
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
];

export default function IssuesScreen() {
  const { issues: contextIssues } = useIssues();

  // Filters
  const [selectedTypeFilter, setSelectedTypeFilter] =
    useState<string>("All");
  const [selectedDaysFilter, setSelectedDaysFilter] = useState<number>(0);

  // Apply filters
  const filteredIssues = useMemo(() => {
    let filtered = [...contextIssues];

    // Filter by type
    if (selectedTypeFilter !== "All") {
      filtered = filtered.filter(
        (issue) => issue.type.toLowerCase() === selectedTypeFilter.toLowerCase()
      );
    }

    // Filter by days
    if (selectedDaysFilter > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - selectedDaysFilter);

      filtered = filtered.filter((issue) => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= cutoffDate;
      });
    }

    return filtered;
  }, [contextIssues, selectedTypeFilter, selectedDaysFilter]);

  return (
    <View style={styles.container}>
      {/* Type Filter */}
      <View style={styles.filterSection}>
        <CustomText className="font-bold text-sm mb-2">
          Issue Type
        </CustomText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          {ISSUE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                selectedTypeFilter === type && styles.filterChipActive,
              ]}
              onPress={() => setSelectedTypeFilter(type)}
            >
              <CustomText
                className={
                  selectedTypeFilter === type
                    ? "font-bold text-sm text-white"
                    : "text-sm text-gray-500"
                }
              >
                {type}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Days Filter */}
      <View style={styles.filterSection}>
        <CustomText className="font-bold text-sm mb-2">
          Time Period
        </CustomText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          {DAYS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedDaysFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDaysFilter(filter.value)}
            >
              <CustomText
                className={
                  selectedDaysFilter === filter.value
                    ? "font-bold text-sm text-white"
                    : "text-sm text-gray-500"
                }
              >
                {filter.label}
              </CustomText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={48} color="#d1d5db" />
          <CustomText className="font-bold text-lg mt-4">
            No Issues Found
          </CustomText>
          <CustomText className="text-center mt-2">
            {selectedTypeFilter !== "All" ||
            selectedDaysFilter > 0
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
              description={item.description}
              created_at={item.created_at}
              location={item.location}
              media_urls={item.media_urls}
            />
          )}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          nestedScrollEnabled={true}
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
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterScrollView: {
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginHorizontal: 4,
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  listContent: {
    paddingVertical: 8,
  },
});
