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

- Implement the logic in the location service and update relevant components.
- Test on real devices for accuracy and performance.
