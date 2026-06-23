# Auth & Notification Bug Tracker

> Working document for the full auth/notification production audit.  
> Backend: `e:\smalltech\#local`  
> Frontend: `e:\smalltech\local frontend\hashtaglocal-frontend`

---

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked / needs decision

---

## Bug #1 — FCM token lost when session expires (not manual logout)  
**Severity: Critical | Side: Frontend**

### What happens
- Manual logout clears FCM cache (`clearCachedFCMToken()`) ✓
- Session expiry (refresh token expired) only clears auth tokens — FCM cache is NOT cleared
- User is forced to re-login → new session row created with no `notification_token`
- `syncFCMToken()` runs → `token === cachedToken` → **skips** backend sync
- New session permanently has no notification token → push notifications silently stop

### Code locations
| File | Line | Note |
|------|------|------|
| `utils/apiClient.ts` | ~53–60 | First session-expired path: clears tokens, emits event, redirects to login — missing `clearCachedFCMToken()` |
| `utils/apiClient.ts` | ~75–83 | Second session-expired path (catch block) — same missing call |
| `utils/_layout.tsx` | ~236–242 | `handleLogout()` correctly calls `clearCachedFCMToken()` |
| `utils/notificationService.ts` | ~91–93 | `clearCachedFCMToken()` is exported but never called on session expiry |

### Fix
In `utils/apiClient.ts`, import `clearCachedFCMToken` from `notificationService` and call it in BOTH
session-expired paths (alongside `clearTokens()`).

**Watch for circular import**: `notificationService` already imports from `apiClient`.  
Solution: move `clearCachedFCMToken` to a thin module (e.g. `utils/fcmCache.ts`) that neither
`apiClient` nor `notificationService` imports, breaking the cycle.

### Steps
- [x] Create `utils/fcmCache.ts` — only reads/writes `FCM_TOKEN_STORAGE_KEY` in AsyncStorage
- [x] Update `notificationService.ts` to import cache helpers from `utils/fcmCache.ts`
- [x] Update `apiClient.ts` to call `clearCachedFCMToken()` in both session-expired paths
- [ ] Verify: session expiry → forced re-login → FCM token correctly re-registered

---

## Bug #2 — FCM registration deactivates auth sessions (not just tokens)  
**Severity: Critical | Side: Backend**

### What happens
`DeviceTokenService.register()` calls `deactivateByUserIdAndPlatformWithToken()` which sets
`isActive = false` on ALL other android/ios sessions that have a notification token.

This means: logging in on a new device **permanently revokes the auth session** of the previous
device. The old device gets silent 401s and can never refresh. This is semantically wrong —
the goal is to prevent duplicate push notifications, not to log the user out.

### Code locations
| File | Method | Note |
|------|--------|------|
| `service/DeviceTokenService.java` | `register()` | Calls wrong query |
| `repository/UserAuthSessionRepository.java` | `deactivateByUserIdAndPlatformWithToken` | Sets `isActive = false` |
| `repository/UserAuthSessionRepository.java` | `clearNotificationTokenByUserIdAndPlatform` | Correct query — should use this instead |

### Fix
In `DeviceTokenService.register()`, replace:
```java
userAuthSessionRepository.deactivateByUserIdAndPlatformWithToken(userId, platform);
```
with:
```java
userAuthSessionRepository.clearNotificationTokenByUserIdAndPlatform(userId, platform);
```
This clears the FCM token from old sessions (preventing duplicate pushes) while keeping the auth
sessions alive (user stays logged in on old devices).

### Steps
- [x] Edit `DeviceTokenService.java` — swap the query call
- [x] Remove dead `deactivateByUserIdAndPlatformWithToken` query from repository
- [ ] Verify: registering FCM on device B does NOT invalidate device A's auth session
- [ ] Verify: push notifications are sent only to the most recently registered device token

---

## Bug #3 — Token expiry unit inconsistency (login stores ms, refresh stores seconds)  
**Severity: High | Side: Frontend**

### What happens
Two different code paths save token expiry in different units:

| Path | Code | Unit saved |
|------|------|-----------|
| `app/auth/callback.tsx:56` | `parseInt(access_expiry) * 1000` | **Milliseconds** |
| `utils/apiClient.ts:69` | `access_token.expiry` (raw from backend) | **Seconds** |

Backend always returns epoch seconds. The `* 1000` in `callback.tsx` is wrong.

`isAccessTokenExpired()` has a heuristic (`expiry < 4102444800000 ? expiry * 1000 : expiry`)
that works for seconds but **fails for milliseconds**: a ms value like `1749382400000` is still
less than `4102444800000`, so it gets multiplied by 1000 again → year ~57,000 → token never
considered expired on frontend after login.

**Actual impact**: frontend always sends the expired access token, gets a 401, then triggers
refresh. Works, but adds an extra round-trip on every request after access token expiry until
the first refresh cycle.

### Code locations
| File | Line | Note |
|------|------|------|
| `app/auth/callback.tsx` | 56–57 | `parseInt(access_expiry || "0") * 1000` — remove `* 1000` |
| `api/AppleAuth.ts` | 49–50 | `String(authData.access_token.expiry)` — already correct (raw seconds) |
| `utils/apiClient.ts` | 68–73 | `access_token.expiry` — correct, no conversion |
| `utils/tokenStorage.ts` | 35 | Heuristic — simplify once unit is consistent |

### Fix
Remove `* 1000` from `callback.tsx`. Backend returns epoch seconds; store seconds everywhere.
Simplify `isAccessTokenExpired()` to drop the heuristic: just do `expiry * 1000` always.

### Steps
- [x] Remove `* 1000` from `callback.tsx` lines 56–57 (access_expiry and refresh_expiry)
- [x] Simplify `isAccessTokenExpired()` and `isRefreshTokenExpired()` in `tokenStorage.ts`
- [ ] Test: access token expiry detected proactively (no extra 401 round-trip after login)

---

## Bug #4 — Missing database indexes (full table scan on every API request)  
**Severity: Critical | Side: Backend DB**

### What happens
No indexes on frequently-queried columns in `user_auth_sessions`:
- Every request: `SELECT ... WHERE access_token = ?` → full table scan
- Every refresh: `SELECT ... WHERE refresh_token = ?` → full table scan
- Every push notification: `SELECT notification_token WHERE user_id = ?` → full scan

With many users this becomes the primary bottleneck and latency killer.

### Fix — SQL migration
```sql
-- Unique indexes also protect against (astronomically unlikely) token collisions
CREATE UNIQUE INDEX idx_uas_access_token   ON user_auth_sessions(access_token);
CREATE UNIQUE INDEX idx_uas_refresh_token  ON user_auth_sessions(refresh_token);
CREATE INDEX        idx_uas_user_id        ON user_auth_sessions(user_id);
CREATE INDEX        idx_uas_user_platform  ON user_auth_sessions(user_id, platform);
CREATE INDEX        idx_uas_is_active      ON user_auth_sessions(is_active)
    WHERE is_active = true;  -- partial index if DB supports it (Postgres does)
```

### Steps
- [x] Indexes merged into `scripts/migrate-notification-token-consolidation.sql` (Step 3)
- [x] Removed standalone `scripts/migrate-add-session-indexes.sql`
- [ ] Apply migration to dev DB and verify with EXPLAIN ANALYZE
- [ ] Apply to staging/prod

---

## Bug #5 — Session rows accumulate forever; no cleanup  
**Severity: High | Side: Backend**

### What happens
Every login creates a new row. Rows where:
- `isActive = false`
- Both tokens are expired
- Created months/years ago

…are never deleted. Over time:
- `findActiveNotificationTokensByUserId` returns stale FCM tokens → wasted FCM calls + noise
- Table grows unboundedly → makes index scans slower
- No cap on concurrent sessions per user

### Fix
1. **Scheduled cleanup job** (Spring `@Scheduled`):
```java
// Delete rows inactive for >30 days OR both tokens expired for >7 days
DELETE FROM user_auth_sessions
WHERE (is_active = false AND updated_at < NOW() - INTERVAL '30 days')
   OR (refresh_token_expiry_ts < EXTRACT(EPOCH FROM NOW()) - 604800);
```

2. **Session cap**: On new login, if user has >10 active sessions, deactivate the oldest N.

### Steps
- [x] Create `job/SessionCleanupJob.java` with `@Scheduled` (3am daily, override via `AUTH_SESSION_CLEANUP_CRON`)
- [x] Add `deleteByRefreshTokenExpiredBefore` + `deleteInactiveSessionsOlderThan` to repository
- [x] Add `findActiveSessionIdsByUserIdOrderByCreatedAsc` + `deactivateByIds` to repository
- [x] Add session cap (max 10) in `GoogleAuthService.createSession()`
- [x] Add session cap (max 10) in `AppleAuthService.createSession()`
- [x] Wire `auth.session.cleanup-cron` into `application.yaml`
- [ ] Verify: table size stays bounded after 30 days of test logins

---

## Bug #6 — `notification_token` update skipped in refresh early-return path  
**Severity: Medium | Side: Backend**

### What happens
`AuthRefreshService` has an optimisation: if the access token is still valid, return existing
tokens without a DB write. But if the client includes `notification_token` in the refresh body,
the update is silently skipped:

```java
if (session.getAccessTokenExpiryTs() > currentEpochSeconds) {
    return existingTokens; // notification_token update never applied
}
```

### Code locations
| File | Method | Note |
|------|--------|------|
| `service/AuthRefreshService.java` | `refreshTokens()` | Early return ignores notification_token param |

### Fix
Apply `notification_token` (and `platform`) update unconditionally before the early-return check:
```java
if (notificationToken != null) {
    session.setNotificationToken(notificationToken);
    session.setPlatform(platform);
    userAuthSessionRepository.save(session);
}
if (session.getAccessTokenExpiryTs() > currentEpochSeconds) {
    return existingTokens; // safe now
}
```

### Steps
- [x] `AuthRefreshService.refreshTokens()` — add `notificationToken` param, apply before early-return
- [x] `AuthController` — pass `request.getNotificationToken()` to the service
- [ ] Verify: calling refresh with notification_token always updates the session row

---

## Bug #7 — `device_id` never sent from frontend  
**Severity: Medium | Side: Frontend**

### What happens
Backend stores `device_id` in session rows and auth endpoints accept it, but the frontend
never sends it. Without `device_id`, the backend cannot:
- Distinguish two physical devices of the same platform for the same user
- Detect token theft (same token used from different device)
- Implement "manage sessions" UI showing "iPhone 14", "Samsung Galaxy", etc.

### Code locations
| File | Note |
|------|------|
| `api/GoogleAuth.ts` | No device_id passed (goes through web redirect, harder) |
| `api/AppleAuth.ts` | No device_id in POST body |
| `utils/apiClient.ts` | `refreshAuthToken()` called without device_id |

### Fix
Use `expo-application`:
- Android: `Application.androidId` (stable per install, per signing key)
- iOS: `Application.getIosIdForVendorAsync()` (stable per vendor per device)

Create `utils/deviceId.ts` with a cached getter, then include in:
- Apple auth POST body: `device_id`
- Token refresh POST body: `device_id`
- Google auth: pass as `state` parameter in OAuth URL and parse in `auth-handler.html`

### Steps
- [x] Create `utils/deviceId.ts` — generates UUID on first launch, persists in AsyncStorage
- [x] Add `device_id` to `AppleAuth.ts` POST body
- [x] Add `device_id` to `refreshAuthToken()` in `auth.ts`
- [x] Add `device_id` to `apiClient.ts` call to `refreshAuthToken()`
- [x] Add `device_id` to `AuthRefreshRequest.java`
- [x] `AuthRefreshService` — accept `deviceId`, backfill on session row if previously null
- [x] `AuthController` — pass `request.getDeviceId()` through to service
- [ ] Google auth: pass `device_id` via OAuth state param (see Bug #9)

---

## Bug #8 — `refreshTokenExpiryTs` not null-safe in `AuthRefreshService`  
**Severity: Medium | Side: Backend**

### What happens
```java
if (session.getRefreshTokenExpiryTs() < currentEpochSeconds) { // NPE if null
```
If `refreshTokenExpiryTs` is null (migration bug, manual DB edit, etc.) this throws NPE and
the user can never refresh — permanently stuck, must contact support.

### Fix
```java
Long expiryTs = session.getRefreshTokenExpiryTs();
if (expiryTs == null || expiryTs < currentEpochSeconds) {
    throw new RuntimeException("Refresh token has expired");
}
```
Also add `NOT NULL` constraint on both expiry columns in DB.

### Steps
- [x] `AuthRefreshService.java` — null guard on `refreshTokenExpiryTs` (prevents NPE)
- [x] `AuthRefreshService.java` — null guard on `accessTokenExpiryTs` in early-return check
- [x] `AccessTokenAuthFilter.java` — null expiry now rejects session (was incorrectly allowing it)
- [x] `scripts/migrate-session-expiry-not-null.sql` — backfills nulls to 0, adds NOT NULL constraints

---

## Bug #9 — Platform `null` for all Google OAuth sessions  
**Severity: Low | Side: Frontend + Backend**

### What happens
Google OAuth goes through: browser → Google → `auth-handler.html` → deep link → app.
There is no mechanism today to pass `platform` or `device_id` through this redirect.
All Google-auth session rows have `platform = null`.

`deactivateByUserIdAndPlatformWithToken` (even if fixed to only clear tokens) won't match
Google-auth sessions because `WHERE platform = 'android'` doesn't match `NULL`.

### Fix options
**Option A (recommended)**: After the auth callback, the frontend already calls `syncFCMToken()`
which hits `POST /account/device-token` with `platform`. This correctly sets `platform` on the
session row after login. No change needed if we rely on this two-step approach.

**Option B**: Encode `platform` in the OAuth `state` parameter. `auth-handler.html` reads it
and appends it to the backend `/auth/google/token` call. More robust but requires backend change.

### Steps
- [x] Chose Option B (state parameter) — works with any registered redirect URI, no Google Console changes
- [x] `GoogleAuth.ts` — encode `platform` + `device_id` into the OAuth `state` param
- [x] `auth-handler.html` — decode `state` from fragment, forward `platform` + `device_id` to backend; legacy query-param fallback retained

---

## Bug #11 — Killed-state notification navigation silently dropped (race condition)
**Severity: Medium | Side: Frontend**

### What happens
Tapping a push notification while the app is fully killed cold-starts the app but lands on
the home/tabs screen instead of the notification's target (most visible with `CHAT`, but
affects any type). Two independent races in the killed-state path:

1. **Data race**: `notificationService.ts` captured the launching notification's payload via
   `Promise.all([getInitialNotification(...), consumeNotifeeInitialNotification()])` and stored
   the result in a plain module variable (`pendingInitialNotification`). `app/_layout.tsx`
   peeked that variable synchronously, exactly once, when the user became authenticated. If the
   native promise hadn't resolved yet at that instant, the payload was silently dropped — nothing
   re-checked it later.
2. **Navigator race**: a prior fix (commit `6826e0d`, "Notification UI for the mobile (#90)")
   addressed `router.replace("/(tabs)")` colliding with a deferred `router.push(target)` by adding
   a flat `setTimeout(..., 300)`. That guessed delay was apparently enough for `/issueDetail` (a
   top-level Drawer.Screen) but not reliably enough for `/chat`, which is nested two navigator
   levels deeper (Drawer → Tabs → chat tab) and contends with `EventsProvider`/`HashtagProvider`
   initial fetches on a cold start.

### Fix
- `utils/notificationService.ts`: `pendingInitialNotification` replaced with a Promise-based
  `initialNotificationPromise` + `consumePendingNotification(): Promise<...>` — whoever awaits it
  gets the correct value regardless of which async chain resolves first. Destination mapping
  extracted into `resolveNotificationTarget()`, reused by `navigateFromNotification()`.
- `app/_layout.tsx`: `useProtectedRoute()` split into two effects. The first stashes the pending
  notification promise in a `useRef` when redirecting to `/(tabs)`. The second watches `segments`
  (a real post-commit signal from the navigation container's `state` listener — not a guess) and
  only drains/pushes the deferred target once `segments[0] === "(tabs)"` proves the replace has
  actually committed. No `setTimeout` anywhere.

### Steps
- [x] `utils/notificationService.ts` — Promise-based pending-notification state; `resolveNotificationTarget()` helper
- [x] `app/_layout.tsx` — split `useProtectedRoute()` into stash/drain effects keyed on `segments`
- [ ] Verify on a real device: killed-state taps for `CHAT`, `ISSUE_DETAIL`, `BROADCAST` (repeat
  `CHAT` 5-10x back-to-back since the bug was intermittent); foreground/background taps unchanged;
  normal cold start has no added delay; logged-out cold start via notification tap still navigates
  after sign-in

---

## Tracking: what's already been fixed

| Bug | Fix applied | Commit |
|-----|-------------|--------|
| `notification_token` field name (`token` → `notification_token`) in POST /account/device-token | ✅ Done | current branch |
| Apple auth missing `platform` in POST body | ✅ Done | current branch |
| `refreshAuthToken()` missing optional `notificationToken` param | ✅ Done | current branch |
| Bug #1 — FCM cache not cleared on session expiry | ✅ Done | current branch |
| Bug #2 — FCM registration deactivates auth sessions | ✅ Done | current branch |
| Bug #3 — Token expiry unit inconsistency (ms vs seconds) | ✅ Done | current branch |
| Bug #4 — Missing DB indexes (full table scan on every request) | ✅ Script created — needs DB apply | current branch |
| Bug #5 — Session rows accumulate forever | ✅ Done | current branch |
| Bug #6 — notification_token skipped in refresh early-return | ✅ Done | current branch |
| Bug #7 — device_id never sent from frontend | ✅ Done | current branch |
| Bug #8 — NPE on null expiry timestamps | ✅ Done | current branch |
| Bug #9 — Google OAuth sessions have platform=null | ✅ Done | current branch |
| Bug #10 — `getIssuesByHashtag` sends expired token, skips 401 retry | ✅ Done | notification-ui branch |
| Bug #11 — Killed-state notification navigation silently dropped (race condition) | ✅ Code done, ⏳ device verify pending | notification-routing branch |

---

## Implementation Order (recommended)

1. **Bug #4** — DB indexes (pure SQL, zero risk, biggest performance gain)
2. **Bug #1** — FCM cache on session expiry (frontend, small change, high user impact)
3. **Bug #2** — Backend: swap deactivate → clear-token (prevents auth session revocation)
4. **Bug #3** — Expiry unit consistency (frontend, careful testing needed)
5. **Bug #8** — Null guard on expiry (backend, defensive fix)
6. **Bug #6** — notification_token update in early-return path (backend)
7. **Bug #5** — Session cleanup job (backend, new component)
8. **Bug #7** — device_id from expo-application (frontend + backend wiring)
9. **Bug #9** — Google platform (decision needed first)

---

## Key File Reference

### Backend (`e:\smalltech\#local`)
```
src/main/java/org/smalltech/hashtaglocal_backend/
  entity/UserAuthSessionEntity.java
  entity/UserAuthProviderEntity.java
  repository/UserAuthSessionRepository.java
  service/DeviceTokenService.java          ← Bug #2
  service/AuthRefreshService.java          ← Bug #6, Bug #8
  security/AccessTokenAuthFilter.java      ← Bug #8 (null guard)
  controller/AuthController.java
  controller/DeviceTokenController.java
src/main/resources/application.yaml
scripts/
  migrate-notification-token-consolidation.sql
  add-session-indexes.sql                  ← to create (Bug #4)
```

### Frontend (`e:\smalltech\local frontend\hashtaglocal-frontend`)
```
api/
  auth.ts                 ← Bug #7 (device_id in refresh)
  AppleAuth.ts            ← Bug #7 (device_id in apple auth)
  GoogleAuth.ts           ← Bug #9 (platform in state)
utils/
  apiClient.ts            ← Bug #1 (clear FCM cache on session expiry), Bug #7
  tokenStorage.ts         ← Bug #3 (simplify expiry heuristic)
  notificationService.ts  ← Bug #1 (FCM cache extraction)
  fcmCache.ts             ← to create (Bug #1, breaks circular import)
  deviceId.ts             ← to create (Bug #7)
app/
  auth/callback.tsx       ← Bug #3 (remove * 1000)
```

---

## Session Table Design Notes (for reference)

```
user_auth_sessions
├── id                      PK auto-increment
├── user_id                 FK → users
├── user_auth_provider_id   FK → user_auth_providers
├── access_token            TEXT  — 32 random bytes, base64url ~43 chars
├── access_token_expiry_ts  BIGINT epoch seconds
├── refresh_token           TEXT
├── refresh_token_expiry_ts BIGINT epoch seconds
├── notification_token      TEXT nullable — FCM or APNs token
├── platform                VARCHAR(15) — android | ios | WEB_ANDROID | WEB_IOS
├── device_id               VARCHAR(2000) nullable
├── is_active               BOOLEAN default true
├── created_at              TIMESTAMP immutable
└── updated_at              TIMESTAMP auto-updated
```

**Key invariant**: one session row per login event. Refresh rotates the tokens IN-PLACE on the
same row. notification_token is attached to the session (not the user) — a user may have
multiple active sessions across devices, each with its own FCM token.
