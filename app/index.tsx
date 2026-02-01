import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the tabs layout
    router.replace("/(tabs)");
  }, [router]);

  return <View style={{ flex: 1 }} />;
}
