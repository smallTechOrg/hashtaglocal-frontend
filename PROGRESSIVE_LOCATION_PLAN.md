# Progressive Location Fetching Plan

## Objective
Implement a progressive location fetching strategy using `watchPositionAsync` to:
- Instantly render the home page with the first available location (regardless of accuracy).
- Continue watching for improved location updates and save the best location (ideally with accuracy < 10 meters).

## Current Scenario
- Using `getFastLocationPermission` to get location via `getLastKnownPositionAsync` and fallback to `getCurrentPositionAsync`.
- Setting `accuracy: LocationAccuracy.Highest` for `getCurrentPositionAsync` but still receiving low-accuracy results (e.g., ~300 meters).

## Desired Scenario
- Use `watchPositionAsync` for continuous location updates.
- Render UI immediately with the first available location.
- Save and use the best location received (with highest accuracy, ideally < 10 meters).

## Implementation Plan

1. **Refactor Location Fetching Logic**
   - Replace or supplement current logic with `watchPositionAsync`.
   - Start watching location as soon as the user lands on the home page.

2. **Immediate Rendering**
   - Use the first location update (regardless of accuracy) to render the home page quickly.

3. **Progressive Accuracy Improvement**
   - Continue listening for location updates.
   - If a new location with better accuracy is received, update the stored location.
   - Stop watching once a location with desired accuracy (e.g., < 10 meters) is obtained, or after a reasonable timeout/number of updates.

4. **State Management**
   - Store both the initial and best location in state/context.
   - Provide a way for components to access the most accurate location available.

5. **Cleanup**
   - Ensure the watcher is properly cleaned up (unsubscribed) when the component unmounts or when the desired accuracy is achieved.

6. **Fallback Handling**
   - If no high-accuracy location is received within a timeout, use the best available location so far.

7. **User Experience**
   - Optionally, show a UI indicator if the app is still trying to improve location accuracy in the background.

## Next Steps
- Ask question and review the plan before final approval.

- Files and functions to change

- `utils/LocationService.ts`:
   - Modify `getFastLocationWithPermission` to initiate a progressive watcher instead of (or in addition to) a single `getCurrentPositionAsync` fallback.
   - Add new functions: `startProgressiveWatch(options?)`, `stopProgressiveWatch()`, and `subscribeToBestLocation(callback)` (or an async iterator) to expose progressive updates.
   - Keep `getLocationWithPermission` and `getCurrentLocation` for one-off use, but ensure they interoperate with the progressive watcher (e.g., return the best-known location when available).
   - Export a small in-memory store or accessor `getBestKnownLocation()` for synchronous reads where appropriate.

- `app/_layout.tsx`:
   - Replace the single call to `getFastLocationWithPermission()` on startup with `startProgressiveWatch()` (or subscribe to the `LocationContext`) so the app renders immediately and improves accuracy in background.

- `app/(tabs)/index.tsx` (home page):
   - Stop calling `getFastLocationWithPermission()` directly; read initial cached location (via `getLastKnownPositionAsync()` or `getBestKnownLocation()`) for immediate render and subscribe for updates.

- `app/auth/callback.tsx`:
   - Update any direct `getFastLocationWithPermission()` usage to use the permission helpers and the progressive fetcher as appropriate.

- `utils/DistanceCheck.ts`:
   - Replace direct one-off `getLocationWithPermission()` usage with the best-known location accessor or a short-lived subscribe to the progressive watcher so distance checks use the most accurate location available.

- Documentation and tests:
   - Update `MAP_IMPLEMENTATION.md` and `PROGRESSIVE_LOCATION_PLAN.md` to describe the new behavior.
   - Update unit tests and mocks under `__mocks__` and `__tests__` to support the watcher APIs (mock `watchPositionAsync` and the subscription API).

- Optional: Context/provider files
   - Consider adding or updating a `LocationContext` (e.g. `utils/ViewerContext.ts` or `utils/LocationContext.tsx`) to centralize subscription and distribution of the best-known location to components.

- Rollout & cleanup
   - Ensure watcher is unsubscribed on unmount or when target accuracy is reached.
   - Use a configurable timeout and target accuracy threshold (e.g., 10m) for stopping the watcher.

- Implementation steps (summary)
   1. Add watcher API to `utils/LocationService.ts` and export subscription helpers.
   2. Wire startup code (`app/_layout.tsx`) to start the watcher and provide context.
   3. Update home tab and other components to read initial cached location and subscribe for updates.
   4. Update tests/mocks and docs.
   5. Test on real devices and adjust thresholds/timeouts.

---

## CORRECTED IMPLEMENTATION PLAN

### Core Concept: Unified `getFastLocationWithProgressiveWatch` Function

Instead of multiple scattered location calls across the app, consolidate into a single smart function that handles all scenarios:

```typescript
function getFastLocationWithProgressiveWatch(options: {
  accuracyLevel?: "low" | "balanced" | "high";      // GPS accuracy preference
  accuracyThresholdMeters?: number;                   // Target accuracy in meters (default: 10)
  instantLoad?: boolean;                               // Return first location immediately or wait
  timeoutMs?: number;                                  // Max time to look for better location (default: 30000)
}): Promise<LocationResult & { improved?: boolean }>
```

### Function Behavior

#### 1. **Check Best-Known Location Cache (Non-blocking)**
   - Look for `_bestLocation` that was captured in the last 30 seconds
   - If accuracy is within `accuracyThresholdMeters`, return it immediately
   - Update `_lastBestLocationTime` to track freshness
   - Return: `{ success: true, location, improved: false }`

#### 2. **If No Suitable Cached Location Found**
   - Start a fresh `watchPositionAsync` with specified `accuracyLevel`

#### 3a. **If `instantLoad === true` (Non-blocking return)**
   - Return first location update immediately (regardless of accuracy)
   - Continue watching in background for `timeoutMs` (e.g., 30 seconds)
   - If a location with better accuracy is found within the timeout:
     - Update `_bestLocation` and notify subscribers
     - Return to the caller a better location (if subscribed or re-called)
   - Stop watching after timeout or when `accuracyThresholdMeters` is reached
   - Return: `{ success: true, location, improved: false }` initially, then notify subscribers of improvements

#### 3b. **If `instantLoad === false` (Blocking wait)**
   - Block and wait for location with accuracy ≤ `accuracyThresholdMeters`
   - Watch for up to `timeoutMs` (e.g., 30 seconds)
   - If location with required accuracy found: return immediately
   - If timeout expires without reaching target accuracy: return error with best available location or explicit error message
   - Return: `{ success: true, location, improved: true }` OR `{ success: false, error: "GPS_PRECISION_TIMEOUT" }`

### Updated Files to Modify

#### `utils/LocationService.ts`
1. Keep existing helpers: `startProgressiveWatch()`, `stopProgressiveWatch()`, `subscribeToBestLocation()`, `getBestKnownLocation()`
2. Add new tracking: `_lastBestLocationTime` (timestamp of when best location was captured)
3. **Add new unified function**: `getFastLocationWithProgressiveWatch(options)`
4. Keep for backward compat: Direct calls to `getFastLocationWithPermission()` but update internal to use new function

#### `app/_layout.tsx`
- Remove early `startProgressiveWatch()` call (not needed; handled by `getFastLocationWithProgressiveWatch`)
- No direct location fetching at startup; let components call when needed

#### `app/(tabs)/index.tsx` (Home/Map Page)
- Single call on mount: `getFastLocationWithProgressiveWatch({ instantLoad: true, accuracyThresholdMeters: 10 })`
- Subscribe to improvements via `subscribeToBestLocation()` to refresh map when accuracy improves
- Render immediately with first result, reload issues if location improves

#### `app/auth/callback.tsx` (Auth Callback)
- Call: `getFastLocationWithProgressiveWatch({ instantLoad: true, accuracyThresholdMeters: 20 })`
- Use returned location for profile API call
- Don't block; proceed with profile fetch even if location is low-accuracy

#### `utils/DistanceCheck.ts` (Distance Verification)
- Call: `getFastLocationWithProgressiveWatch({ instantLoad: false, accuracyThresholdMeters: 10, timeoutMs: 10000 })`
- Block and wait for high accuracy before checking distance
- If cannot get required accuracy in time, alert user and reject the action

### Implementation Steps

1. **Add `_lastBestLocationTime` tracker** to `LocationService.ts`
2. **Implement `getFastLocationWithProgressiveWatch()`** with logic for all three scenarios
3. **Update `startProgressiveWatch()`** to set `_lastBestLocationTime` when best location improves
4. **Simplify component code** in `_layout.tsx`, `index.tsx`, `callback.tsx`, `DistanceCheck.ts`
5. **Update tests/mocks** to support the new unified API
6. **Test on real devices** and tune parameters (timeout, accuracy thresholds, time intervals)

### Benefits of This Approach

- ✅ Single, predictable API for all location needs
- ✅ Eliminates scattered location calls across the app
- ✅ Automatic progressive accuracy improvement in background
- ✅ Flexible: supports both instant-load and wait-for-accuracy patterns
- ✅ Cleaner component code with fewer imports/dependencies
- ✅ Easier to maintain and test

---

## Final Check before test

Check location is correctly fetched in distancecheck.tsx, index.tsx, _layout.tsx, and callback.tsx and also make ure where instant load is true, we are acting on that.