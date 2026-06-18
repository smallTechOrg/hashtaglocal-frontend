# Notification Analytics — Implementation Plan

> **Status:** DB Design Locked — Ready for Implementation
> **Branch:** `notify-v3`
> **Backend:** Spring Boot 3.5 (Java) + Hibernate JPA + PostgreSQL
> **Last Updated:** 2026-06-17

---

## Table of Contents

1. [Why Analytics on Notifications](#1-why-analytics-on-notifications)
2. [What We Track & Why](#2-what-we-track--why)
3. [Database Tables](#3-database-tables)
4. [Notification Lifecycle](#4-notification-lifecycle)
5. [API Changes](#5-api-changes)
6. [Frontend Changes](#6-frontend-changes)
7. [Key Metrics & Access Patterns](#7-key-metrics--access-patterns)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Open Questions](#9-open-questions)

---

## 1. Why Analytics on Notifications

Notifications are the primary re-engagement channel for #local. Without analytics we are flying blind:

- We don't know if users are actually **receiving** notifications (delivery gap)
- We don't know if they're **opening** them (engagement gap)
- We don't know which **notification types** drive the most value
- We can't tell if notifications are causing **app opens that retain users**

---

## 2. What We Track & Why

| Signal | Where | Why It Matters |
|--------|-------|---------------|
| Notification sent | Server | Denominator for all rates |
| How many users received it | Server (`recipient_count`) | Scale of the send |
| Which user, which platform | Server (`notification_recipient`) | Per-user delivery record |
| FCM accepted the call | Server (`fcm_message_id` not null) | Delivery confirmation from FCM |
| Device confirmed receipt | Client (`received_at`) | Actual delivery to device |
| User opened it | Client (`opened_at`) | Primary engagement signal |
| User dismissed it | Client (`dismissed_at`) | User saw it but wasn't interested |
| Time spent in app after opening | Client (`session_duration_seconds`) | Depth of engagement |

### What We Do NOT Track

- Notification body content — may contain PII (issue location, user names)
- App state at receipt (FOREGROUND/BACKGROUND/KILLED) — not actionable enough to justify the complexity
- Which screen they landed on — routes are fixed per notification type, fully derivable
- Time to navigate — app performance metric, not notification analytics

---

## 3. Database Tables

### SRP Principle

| Table | Single Responsibility |
|-------|----------------------|
| `notification_log` | **What was sent, why, and at what scale** — owned entirely by the backend send flow |
| `notification_recipient` | **Who was targeted and what they did** — written at send time, updated by client reports |

---

### 3.1 `notification_log`

One row per notification trigger. Owned by backend.

```sql
CREATE TABLE notification_log (
    id                BIGSERIAL    PRIMARY KEY,
    source            VARCHAR(10)  NOT NULL,    -- 'ADMIN' | 'SYSTEM'
    source_ref_type   VARCHAR(50),              -- 'ISSUE_ACTION' | null for broadcasts
    source_ref_id     BIGINT,                   -- id of the triggering row | null
    notification_type VARCHAR(20)  NOT NULL,    -- 'ISSUE_DETAIL' | 'BROADCAST' | 'CHAT'
    title             VARCHAR(500) NOT NULL,
    body              TEXT         NOT NULL,
    payload           JSONB        NOT NULL,    -- FCM data map (issueId, status, etc.)
    recipient_count   INT,                      -- null until send completes
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Field notes:**
- `source` — `ADMIN` = triggered from ops dashboard, `SYSTEM` = triggered by a backend event
- `source_ref_type` + `source_ref_id` — polymorphic pointer to the trigger. No FK constraint by design (references different tables depending on type). Example: `source_ref_type = 'ISSUE_ACTION'`, `source_ref_id = 42` → look in `issue_actions WHERE id = 42`
- `recipient_count` — null until all FCM calls finish, then updated to total tokens attempted
- No `sent_at` — per-device send time lives in `notification_recipient.created_at`. A single `sent_at` on the log is misleading for batch sends where each batch goes at a different time. Add `scheduled_at` here when scheduled notifications are built.

---

### 3.2 `notification_recipient`

One row per user per notification. Created at send time, updated by client.

```sql
CREATE TABLE notification_recipient (
    id                       BIGSERIAL    PRIMARY KEY,
    notification_log_id      BIGINT       NOT NULL REFERENCES notification_log(id),
    user_id                  BIGINT       NOT NULL REFERENCES users(id),
    platform                 VARCHAR(10)  NOT NULL,  -- 'ANDROID' | 'IOS'
    fcm_message_id           VARCHAR(255),           -- null if FCM call failed
    received_at              TIMESTAMPTZ,            -- client: device confirmed receipt
    opened_at                TIMESTAMPTZ,            -- client: user tapped and opened
    dismissed_at             TIMESTAMPTZ,            -- client: user dismissed
    session_duration_seconds INT,                    -- client: seconds in app after opening
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Field notes:**
- `user_id NOT NULL` — every FCM token belongs to an active session which always has a user. There is no scenario where we send to an unknown user.
- `fcm_message_id` — null means FCM rejected the call (stale token, quota exceeded). Not null means FCM accepted delivery.
- `received_at`, `opened_at`, `dismissed_at` are mutually exclusive for the end state — a notification ends in one of three states: opened, dismissed, or neither (never interacted with). The application layer enforces this; the DB does not.
- Never interacted = `opened_at IS NULL AND dismissed_at IS NULL` — no separate `expired_at` column needed, it is fully derivable.
- `session_duration_seconds` — best-effort. Measured from `opened_at` to when app goes to background. Null if app was force-killed before the AppState listener fired.
- No `fcm_token` — sensitive data. `fcm_message_id` is sufficient for FCM delivery tracing.
- No `app_state` — not actionable enough for the complexity it adds.

---

### 3.3 Access Patterns

| Question | Query |
|----------|-------|
| All notifications sent | `SELECT * FROM notification_log ORDER BY created_at DESC` |
| Who received notification X | `SELECT user_id, platform FROM notification_recipient WHERE notification_log_id = X` |
| All notifications user Y received | `SELECT nl.* FROM notification_log nl JOIN notification_recipient nr ON nl.id = nr.notification_log_id WHERE nr.user_id = Y` |
| Did user Y open notification X | `SELECT opened_at FROM notification_recipient WHERE notification_log_id = X AND user_id = Y` |
| Open rate for ISSUE_DETAIL | `SELECT COUNT(opened_at)::NUMERIC / COUNT(*) FROM notification_recipient nr JOIN notification_log nl ON nr.notification_log_id = nl.id WHERE nl.notification_type = 'ISSUE_DETAIL'` |
| Average session after opening | `SELECT AVG(session_duration_seconds) FROM notification_recipient WHERE notification_log_id = X AND opened_at IS NOT NULL` |
| FCM delivery check | `SELECT COUNT(*) FILTER (WHERE fcm_message_id IS NOT NULL) AS accepted, COUNT(*) AS attempted FROM notification_recipient WHERE notification_log_id = X` |

---

## 4. Notification Lifecycle

```
1. Trigger fires (admin sends broadcast / issue approved)
         ↓
2. Insert row into notification_log
   (recipient_count = null)
         ↓
3. For each user → call FCM
         ↓
4. Insert row into notification_recipient per user
   (fcm_message_id = FCM response, null if FCM failed)
         ↓
5. Update notification_log
   (recipient_count = total sent, updated_at = now)

         [ client side — PATCH /notifications/{logId}/engagement ]
         ↓
6. Device receives notification
   → PATCH: received_at = now
         ↓
7a. User opens notification
    → PATCH: opened_at = now
         ↓
    User leaves app (AppState → background)
    → PATCH: session_duration_seconds = elapsed seconds
         ↓
7b. User dismisses notification
    → PATCH: dismissed_at = now

         [ if neither 7a nor 7b ever happens ]
         → opened_at IS NULL, dismissed_at IS NULL = never interacted
```

**Key points:**
- Steps 3–4 loop per user. For broadcasts, this is N iterations (one per active token).
- Step 6 requires `notificationLogId` in the FCM data payload so the client knows which row to update.
- `session_duration_seconds` requires `notificationLogId` to be stored on the client (AsyncStorage) from step 6, so it can be reported when the user leaves in step 7a.
- Steps 6–7 are best-effort. Analytics loss on crash is acceptable.

---

## 5. API Changes

### 5.1 New: `PATCH /notifications/{notificationLogId}/engagement`

Client calls this to report delivery and engagement events on a specific notification.

The backend identifies the correct `notification_recipient` row by `(notification_log_id, authenticated_user_id)`.

**Request:**
```json
PATCH /notifications/42/engagement
Authorization: Bearer <access_token>

{
  "received_at": "2026-06-17T10:23:45Z",
  "opened_at": "2026-06-17T10:25:10Z",
  "dismissed_at": null,
  "session_duration_seconds": 87
}
```

All fields are optional — client sends only what it knows at that moment. Multiple calls are allowed (received_at first, then opened_at/dismissed_at later, then session_duration_seconds when user leaves).

**Response:** `204 No Content`

**Error handling:** Always return 2xx if authenticated and structurally valid. Analytics loss is acceptable — no retry needed.

---

### 5.2 Modified: Backend FCM Data Payload

Add `notificationLogId` to every FCM data payload so the client can call the engagement endpoint.

**Current payload (ISSUE_DETAIL):**
```json
{
  "type": "ISSUE_DETAIL",
  "issueId": "123",
  "status": "OPEN",
  "event": "STATUS_CHANGE"
}
```

**Updated payload:**
```json
{
  "type": "ISSUE_DETAIL",
  "issueId": "123",
  "status": "OPEN",
  "event": "STATUS_CHANGE",
  "notificationLogId": "42"
}
```

All FCM data values must be strings — `notificationLogId` is sent as a string, parsed to Long on receipt.

---

### 5.3 Modified: `BroadcastService` token query

Currently fetches only tokens (`List<String>`). Must be changed to fetch `(userId, token, platform)` tuples so `notification_recipient` rows can be populated with `user_id`.

**Current query (`UserAuthSessionRepository`):**
```java
@Query("SELECT DISTINCT s.notificationToken FROM UserAuthSessionEntity s " +
       "WHERE s.isActive = true AND s.notificationToken IS NOT NULL")
List<String> findAllActiveNotificationTokens();
```

**New query needed:**
```java
@Query("SELECT s FROM UserAuthSessionEntity s " +
       "WHERE s.isActive = true AND s.notificationToken IS NOT NULL")
List<UserAuthSessionEntity> findAllActiveSessionsWithTokens();
```

This gives us `session.getUser().getId()`, `session.getNotificationToken()`, and `session.getPlatform()` per device.

---

## 6. Frontend Changes

### 6.1 Store `notificationLogId` on receipt

When any notification arrives (foreground, background, or killed state), extract `notificationLogId` from the FCM data payload and store it in AsyncStorage. This is the key used for all subsequent engagement reports.

```typescript
// In registerForegroundHandler(), background handler (index.js), getInitialNotification()
const logId = message.data?.notificationLogId;
if (logId) {
  await AsyncStorage.setItem('last_notification_log_id', logId);
}
```

---

### 6.2 Report `received_at`

Called immediately on notification receipt in all three app states.

**Foreground** (`registerForegroundHandler()` in `notificationService.ts`):
```typescript
await patchNotificationEngagement(logId, { received_at: new Date().toISOString() });
```

**Background / Killed** (`index.js` background handler — no network calls allowed):
```typescript
// Write to AsyncStorage — drain and report when app foregrounds
await AsyncStorage.setItem('pending_received_at', JSON.stringify({
  notificationLogId: message.data?.notificationLogId,
  received_at: new Date().toISOString(),
}));
```

Drain pending receipt in `_layout.tsx` when `AppState` changes to `active`.

---

### 6.3 Report `opened_at`

Called when user taps the notification.

In `setupNotificationTapHandlers()` → `onNotificationOpenedApp()` and `getInitialNotification()` (`notificationService.ts`):
```typescript
const logId = remoteMessage.data?.notificationLogId;
await patchNotificationEngagement(logId, { opened_at: new Date().toISOString() });
// Store logId for session_duration report when user leaves
await AsyncStorage.setItem('active_notification_log_id', logId);
await AsyncStorage.setItem('notification_opened_at', new Date().toISOString());
```

---

### 6.4 Report `dismissed_at`

Called when user dismisses the in-app banner (swipe or auto-timeout).

In `NotificationBanner.tsx`:
```typescript
// On swipe dismiss or auto-dismiss:
const logId = await AsyncStorage.getItem('last_notification_log_id');
await patchNotificationEngagement(logId, { dismissed_at: new Date().toISOString() });
```

---

### 6.5 Report `session_duration_seconds`

Called when app goes to background after the user opened via a notification.

In `_layout.tsx` AppState listener:
```typescript
AppState.addEventListener('change', async (nextState) => {
  if (nextState === 'background' || nextState === 'inactive') {
    const logId = await AsyncStorage.getItem('active_notification_log_id');
    const openedAt = await AsyncStorage.getItem('notification_opened_at');
    if (logId && openedAt) {
      const duration = Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000);
      await patchNotificationEngagement(logId, { session_duration_seconds: duration });
      await AsyncStorage.removeItem('active_notification_log_id');
      await AsyncStorage.removeItem('notification_opened_at');
    }
  }
});
```

---

### 6.6 `patchNotificationEngagement` helper

New utility function wrapping the PATCH call:

```typescript
// utils/notificationEngagement.ts
export async function patchNotificationEngagement(
  notificationLogId: string,
  data: Partial<{
    received_at: string;
    opened_at: string;
    dismissed_at: string;
    session_duration_seconds: number;
  }>
): Promise<void> {
  try {
    await apiClient.patch(`/notifications/${notificationLogId}/engagement`, data);
  } catch {
    // Best-effort — swallow errors, analytics loss is acceptable
  }
}
```

---

## 7. Key Metrics & Access Patterns

### The Notification Funnel

```
SENT (notification_log created)
  ↓
FCM ACCEPTED (fcm_message_id not null on notification_recipient)
  ↓
RECEIVED (received_at not null)
  ↓
OPENED (opened_at not null)  ←→  DISMISSED (dismissed_at not null)
  ↓
SESSION (session_duration_seconds)
```

### Benchmark Targets

| Metric | Poor | Average | Good |
|--------|------|---------|------|
| FCM acceptance rate | < 85% | 88–94% | > 95% |
| Open rate (opened / received) | < 10% | 15–25% | > 30% |
| Avg session after open | < 15s | 30–90s | > 2min |

### Segmentation

Always break down by:
- `notification_type` — ISSUE_DETAIL typically highest engagement, BROADCAST lowest
- `platform` — iOS vs Android delivery differences
- Day/time — for future send-time optimisation

### Business Correlations (Phase 2)

Join with other tables to answer deeper questions:
- Do users who open notifications report more issues?
- Do CHAT notifications convert to sent messages within 1 hour?
- Do notification opens correlate with 30-day retention?

---

## 8. Implementation Checklist

### Backend (Spring Boot)

- [ ] Create `NotificationLogEntity` + `NotificationLogRepository`
- [ ] Create `NotificationRecipientEntity` + `NotificationRecipientRepository`
- [ ] Create `NotificationType` enum (`ISSUE_DETAIL`, `BROADCAST`, `CHAT`)
- [ ] Wire `NotificationLogEntity` save into `IssueNotificationListener`
- [ ] Wire `NotificationRecipientEntity` save into `IssueNotificationListener`
- [ ] Change `findAllActiveNotificationTokens()` to return sessions (with user + platform)
- [ ] Wire `NotificationLogEntity` save into `BroadcastService`
- [ ] Wire `NotificationRecipientEntity` saves into `BroadcastService`
- [ ] Add `notificationLogId` to FCM data payload in all send paths
- [ ] `PATCH /notifications/{logId}/engagement` endpoint
- [ ] Update `notification_log.recipient_count` + `updated_at` after send completes

### Frontend

- [ ] Create `utils/notificationEngagement.ts` with `patchNotificationEngagement()`
- [ ] Report `received_at` in `registerForegroundHandler()` (`notificationService.ts`)
- [ ] Write pending receipt to AsyncStorage in background handler (`index.js`)
- [ ] Drain pending receipt from AsyncStorage on app foreground (`_layout.tsx`)
- [ ] Report `opened_at` in `onNotificationOpenedApp()` (`notificationService.ts`)
- [ ] Report `opened_at` in `getInitialNotification()` (`notificationService.ts`)
- [ ] Report `dismissed_at` in `NotificationBanner.tsx` (swipe + auto-dismiss)
- [ ] Report `session_duration_seconds` in AppState listener (`_layout.tsx`)
- [ ] Store / clear `active_notification_log_id` in AsyncStorage on open / session end

### QA / Validation

- [ ] Foreground notification: `received_at` populated, banner dismiss sets `dismissed_at`
- [ ] Background tap: `received_at` populated (from AsyncStorage drain), `opened_at` set on tap
- [ ] Killed-state tap: same as background
- [ ] `session_duration_seconds` populated after opening and backgrounding app
- [ ] `notification_log.recipient_count` matches row count in `notification_recipient`
- [ ] `fcm_message_id` present on successful sends, null on failed sends
- [ ] PATCH with unknown `notificationLogId` returns 404

---

## 9. Open Questions

1. **Dev vs prod** — Should `patchNotificationEngagement()` skip in dev builds to keep analytics data clean? Recommended: yes.

2. **Auth token expired on flush** — If the user's access token expires before the background receipt report is sent, the PATCH will 401. Should we queue it and retry after token refresh, or accept the loss?

3. **Data retention** — How long to keep `notification_recipient` rows? Recommendation: 90 days, then archive or delete.

4. **iOS** — APNs key still needs to be uploaded to Firebase Console. Until then, iOS `fcm_message_id` will always be null and `received_at` will never be reported from iOS devices.

5. **Admin dashboard** — Is there an ops portal or Metabase instance where `notification_log` can be queried directly, or do we need a dedicated API endpoint for analytics views?

6. **Notification history screen** — A per-user notification inbox (list of past notifications with read/unread state) is out of scope for this phase. Confirm before implementation.

---

*DB design finalised 2026-06-17. Backend: Spring Boot 3.5 / Hibernate JPA. Frontend: React Native (Expo). All file references relative to `e:\smalltech\local frontend\hashtaglocal-frontend\`.*
