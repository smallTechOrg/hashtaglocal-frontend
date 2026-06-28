import { ActivityIndicator, View } from "react-native";

// useProtectedRoute (app/_layout.tsx) redirects away from this root route once
// auth resolves. A second redirect here used to race it with a setTimeout and
// could fire after a notification-driven push, resetting the tabs navigator
// back to its default tab.
export default function RootIndex() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#256D1B" />
    </View>
  );
}
