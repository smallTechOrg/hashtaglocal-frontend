import analytics from "@react-native-firebase/analytics";

// Analytics is disabled in development builds to keep dashboard data clean.
// Only preview and production builds send events to Firebase.
const isEnabled = !__DEV__;

function track(event: string, params?: Record<string, string>): Promise<void> {
  if (!isEnabled) return Promise.resolve();
  return analytics().logEvent(event, params);
}

// ─── User Identity ──────────────────────────────────────────────────────────

export const setAnalyticsUser = (userId: string) =>
  isEnabled ? analytics().setUserId(userId) : Promise.resolve();

export const clearAnalyticsUser = () =>
  isEnabled ? analytics().setUserId(null) : Promise.resolve();

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * `isNewUser` comes directly from the backend `is_new_user` field in the auth callback deep link.
 * The backend sets it to true only when a new account is created in the DB.
 */
export async function trackAuthEvent(method: "google", isNewUser: boolean) {
  await track(isNewUser ? "sign_up" : "login", { method });
}

export const trackLogout = () =>
  track("logout");

export const trackAuthFailed = (resultType: string, redirectUri: string) =>
  track("google_auth_failed", { result_type: resultType, redirect_uri: redirectUri });

// ─── Report Funnel ──────────────────────────────────────────────────────────

/** Fired when the user lands on the Report tab (guidelines screen). */
export const trackReportScreen = () =>
  track("report_screen");

/** Fired when the user leaves the Report screen without tapping the CTA. */
export const trackReportScreenAbandoned = () =>
  track("report_screen_abandoned");

/** Fired when the user taps the "Report Issue" CTA button on the guidelines screen. */
export const trackReportCtaTapped = () =>
  track("report_cta_tapped");

/** Fired when CameraCapture screen mounts. */
export const trackCameraOpened = (mode: "report" | "update") =>
  track("camera_opened", { mode });

/** Fired when the user successfully captures a photo. */
export const trackPhotoCaptured = (mode: "report" | "update") =>
  track("photo_captured", { mode });

/**
 * Fired when the user exits CameraCapture before taking any photo.
 */
export const trackCameraAbandoned = (mode: "report" | "update") =>
  track("camera_abandoned", { mode });

/**
 * Fired when the user took a photo but exited CameraCapture without using it (went back from preview).
 */
export const trackPhotoAbandoned = (mode: "report" | "update") =>
  track("photo_abandoned", { mode });

/** Fired when IssueForm mounts. */
export const trackFormOpened = (mode: "report" | "update") =>
  track("issue_form_opened", { mode });

/**
 * Fired when IssueForm unmounts without a successful submission.
 * `mode`  — whether it was a new report or an update flow.
 * `step`  — the furthest step the user reached before abandoning.
 */
export const trackFormAbandoned = (mode: "report" | "update", step: "no_type" | "has_type") =>
  track("issue_form_abandoned", { mode, step });

// ─── Issue Actions ───────────────────────────────────────────────────────────

/** Fired when the issue detail screen loads successfully. */
export const trackIssueDetailOpened = (issueId: number) =>
  track("issue_detail_opened", { issue_id: String(issueId) });

export const trackIssueReported = (issueType: string) =>
  track("issue_reported", { issue_type: issueType.toLowerCase() });

export const trackIssueVerified = (issueId: number) =>
  track("issue_verified", { issue_id: String(issueId) });

export const trackIssueResolved = (issueId: number) =>
  track("issue_resolved", { issue_id: String(issueId) });

// ─── Notifications ───────────────────────────────────────────────────────────

export const trackNotificationOpened = (notificationLogId: string, type: string) =>
  track("notification_opened", { notification_log_id: notificationLogId, type });
