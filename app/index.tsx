import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the tabs layout
    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 0);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#256D1B" />
    </View>
  );
}
