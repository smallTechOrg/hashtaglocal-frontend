import { Redirect } from "expo-router";

export default function CreateIssue() {
  // Immediately redirect to camera capture screen
  return <Redirect href="/CameraCapture" />;
}
