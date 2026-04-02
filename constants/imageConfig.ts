/**
 * Time in ms before an image load is considered slow and reported to Crashlytics.
 * Slow thumbnail loads are especially impactful — the image area stays blank until
 * the thumbnail (placeholder) resolves.
 */
export const IMAGE_SLOW_LOAD_THRESHOLD_MS = 30_000;
