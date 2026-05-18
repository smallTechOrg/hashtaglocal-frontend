import analytics from "@react-native-firebase/analytics";

// ─── User Identity ──────────────────────────────────────────────────────────

export const setAnalyticsUser = (userId: string) =>
  analytics().setUserId(userId);

export const clearAnalyticsUser = () =>
  analytics().setUserId(null);

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * `isNewUser` comes directly from the backend `is_new_user` field in the auth callback deep link.
 * The backend sets it to true only when a new account is created in the DB.
 */
export async function trackAuthEvent(method: "google", isNewUser: boolean) {
  await analytics().logEvent(isNewUser ? "sign_up" : "login", { method });
}

export const trackLogout = () =>
  analytics().logEvent("logout");

// ─── Report Funnel ──────────────────────────────────────────────────────────

/** Fired when the user lands on the Report tab (guidelines screen). */
export const trackReportFlowStarted = () =>
  analytics().logEvent("report_flow_started");

/** Fired when the user taps the "Report Issue" CTA button on the guidelines screen. */
export const trackReportCtaTapped = () =>
  analytics().logEvent("report_cta_tapped");

/** Fired when CameraCapture screen mounts. */
export const trackCameraOpened = (mode: "report" | "update") =>
  analytics().logEvent("camera_opened", { mode });

/** Fired when the user successfully captures a photo. */
export const trackPhotoCaptured = (mode: "report" | "update") =>
  analytics().logEvent("photo_captured", { mode });

/** Fired when IssueForm mounts. */
export const trackFormOpened = (mode: "report" | "update") =>
  analytics().logEvent("issue_form_opened", { mode });

/**
 * Fired when IssueForm unmounts without a successful submission.
 * `mode`  — whether it was a new report or an update flow.
 * `step`  — the furthest step the user reached before abandoning.
 */
export const trackFormAbandoned = (mode: "report" | "update", step: "no_type" | "has_type") =>
  analytics().logEvent("report_form_abandoned", { mode, step });

// ─── Issue Actions ───────────────────────────────────────────────────────────

/** Fired when the issue detail screen loads successfully. */
export const trackIssueDetailOpened = (issueId: number) =>
  analytics().logEvent("issue_detail_opened", { issue_id: String(issueId) });

export const trackIssueReported = (issueType: string) =>
  analytics().logEvent("issue_reported", { issue_type: issueType.toLowerCase() });

export const trackIssueVerified = (issueId: number) =>
  analytics().logEvent("issue_verified", { issue_id: String(issueId) });

export const trackIssueResolved = (issueId: number) =>
  analytics().logEvent("issue_resolved", { issue_id: String(issueId) });
