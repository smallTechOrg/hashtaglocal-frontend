import CustomText from "@/components/CustomText";
import { useHashtag } from "@/utils/HashtagContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import HashtagPicker from "./HashtagPicker";

/** Header title that doubles as the global hashtag selector. Tapping opens the picker; the choice
 * is shared (HashtagContext) so every tab re-scopes to it. */
export default function HashtagHeaderTitle() {
  const { hashtag, setHashtag } = useHashtag();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <View style={styles.dot} />
        <CustomText style={styles.label}>#{hashtag}</CustomText>
        <MaterialIcons name="expand-more" size={20} color="#0c1116" />
      </TouchableOpacity>
      <HashtagPicker
        visible={open}
        selected={hashtag}
        onSelect={setHashtag}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#256d1b" },
  label: { fontSize: 17, color: "#0c1116", fontFamily: "Nunito_700Bold" },
});
