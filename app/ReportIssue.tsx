import { Redirect } from "expo-router";

export default function ReportIssue() {
  // Immediately redirect to camera capture screen
  return <Redirect href="/CameraCapture" />;
}
