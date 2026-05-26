import CustomText from "@/components/CustomText";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface CityPickerModalProps {
  visible: boolean;
  onClose: () => void;
  cities: string[];
  selectedCity: string;
  onSelect: (city: string) => void;
}

export default function CityPickerModal({
  visible,
  onClose,
  cities,
  selectedCity,
  onSelect,
}: CityPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = cities.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="location-city" size={20} color="#256D1B" />
          <CustomText style={styles.title}>Select City</CustomText>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={22} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={18} color="#9ca3af" />
          <TextInput
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder="Search city…"
            style={styles.searchInput}
            placeholderTextColor="#9ca3af"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialIcons name="cancel" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item === selectedCity;
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => {
                  onSelect(item);
                  setSearch("");
                  onClose();
                }}
              >
                <CustomText
                  style={[styles.itemText, isSelected && styles.itemTextSelected]}
                >
                  {item}
                </CustomText>
                {isSelected && (
                  <MaterialIcons name="check-circle" size={18} color="#256D1B" />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <CustomText style={styles.empty}>No city found</CustomText>
          }
          ListFooterComponent={
            <CustomText style={styles.footer}>
              Can't find your city? Report an issue so it appears here!
            </CustomText>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: {
    flex: 1,
    fontFamily: "Nunito-Bold",
    fontSize: 16,
    color: "#111827",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Nunito-Regular",
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemSelected: {
    backgroundColor: "#f0fdf4",
  },
  itemText: {
    fontFamily: "Nunito-Regular",
    fontSize: 15,
    color: "#374151",
  },
  itemTextSelected: {
    fontFamily: "Nunito-Bold",
    color: "#256D1B",
  },
  empty: {
    textAlign: "center",
    color: "#9ca3af",
    padding: 24,
    fontFamily: "Nunito-Regular",
  },
  footer: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 12,
    padding: 16,
    fontFamily: "Nunito-Regular",
  },
});
