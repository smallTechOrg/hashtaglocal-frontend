# Notifications — Integration Guide

> Frontend is fully implemented and tested. This document covers what the backend needs to do and how the two sides connect.

---

## What's Already Done (Frontend)

| What | File |
|---|---|
| Background handler registered before React mounts | `index.js` |
| Permission request + token sync (only when changed) | `utils/notificationService.ts` |
| Token registered on every login, skipped if unchanged | `app/_layout.tsx` — `AuthLoader` |
| Foreground message → Alert popup | `utils/notificationService.ts` |
| Background tap → navigate to correct screen | `utils/notificationService.ts` |
| Killed state tap → navigate on app launch | `utils/notificationService.ts` |
| Token cache cleared on logout | `app/_layout.tsx` — `handleLogout` |
| Firebase token rotation handled automatically | `utils/notificationService.ts` — `watchTokenRefresh` |

---

## Firebase — Nothing More Needed for Android

Your `google-services.json` is already in the project and Firebase Cloud Messaging is enabled for the Android app. No changes needed in Firebase Console for Android.

**iOS (when ready):** Upload APNs `.p8` key to Firebase Console → Project Settings → Cloud Messaging → Apple app configuration. That's the only Firebase change needed for iOS.

---

## Backend — What Needs to Be Built

### 1. Store the Device Token

**Endpoint:** `POST /account/device-token`

The app calls this after every login when the token has changed. The user is identified from the JWT in the `Authorization` header.

**Request body:**
```json
{
  "token": "fcm-device-token-string",
  "platform": "android"
}
```

**What to do:**
- Upsert — if a token for this user+platform already exists, update it; otherwise insert
- One user can have multiple tokens (multiple devices) — store all of them
- Index on `token` so you can look up which user owns it if needed

**Suggested DB schema:**
```sql
CREATE TABLE device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL,             -- 'android' | 'ios'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
```

**Response:** `200 OK` — the app ignores the body.

---

### 2. Delete the Token on Logout

The app clears the local token cache on logout but does **not** currently call the backend to delete it. You should do one of:

**Option A (recommended) — App calls DELETE on logout:**

Add this to the frontend logout flow in `handleLogout` in `app/_layout.tsx`:
```ts
await apiPost(`${API_BASE_URL}/account/device-token/remove`, { platform: 'android' });
```

Backend endpoint `POST /account/device-token/remove` (or `DELETE /account/device-token`):
```java
@DeleteMapping("/account/device-token")
public ResponseEntity<Void> removeDeviceToken(
        @RequestBody RemoveTokenRequest request,
        @AuthenticationPrincipal UserDetails currentUser) {

    deviceTokenRepository.deleteByUserIdAndPlatform(
        currentUser.getId(),
        request.getPlatform()
    );
    return ResponseEntity.ok().build();
}
```

**Option B — Ignore stale tokens:**

Firebase returns a `messaging/registration-token-not-registered` error when you try to send to a deleted/expired token. Backend catches this and removes the token from DB automatically.

Either approach works — Option A is cleaner.

---

### 3. Send a Notification

Use the **Firebase Admin SDK** on your backend.

**Add dependency (Maven):**
```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.2.0</version>
</dependency>
```

**Add dependency (Gradle):**
```groovy
implementation 'com.google.firebase:firebase-admin:9.2.0'
```

**Initialize once at startup (e.g. in a `@Configuration` bean):**
```java
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.FileInputStream;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            FileInputStream serviceAccount =
                new FileInputStream("service-account-key.json");

            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            return FirebaseApp.initializeApp(options);
        }
        return FirebaseApp.getInstance();
    }
}
```

> Get `service-account-key.json` from Firebase Console → Project Settings → Service accounts → Generate new private key. **Never commit this file — add it to `.gitignore` and load the path from an env variable.**

**Send to one device:**
```java
import com.google.firebase.messaging.*;

Message message = Message.builder()
    .setToken(deviceToken)
    .setNotification(Notification.builder()
        .setTitle("Your issue was resolved")
        .setBody("The pothole on MG Road has been marked resolved.")
        .build())
    .putData("type", "ISSUE_UPDATE")   // must match NotificationType in the app
    .putData("issueId", "456")         // used by the app to navigate
    .setAndroidConfig(AndroidConfig.builder()
        .setPriority(AndroidConfig.Priority.HIGH)
        .build())
    .build();

String messageId = FirebaseMessaging.getInstance().send(message);
```

**Send to multiple devices at once:**
```java
import com.google.firebase.messaging.*;
import java.util.List;

MulticastMessage message = MulticastMessage.builder()
    .addAllTokens(List.of(token1, token2, token3))  // max 500 per call
    .setNotification(Notification.builder()
        .setTitle("New issue nearby")
        .setBody("A pothole was reported 0.2km from you.")
        .build())
    .putData("type", "NEARBY_ISSUE")
    .putData("issueId", "789")
    .setAndroidConfig(AndroidConfig.builder()
        .setPriority(AndroidConfig.Priority.HIGH)
        .build())
    .build();

BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
```

**Handle send errors (clean up stale tokens):**
```java
List<SendResponse> responses = response.getResponses();

for (int i = 0; i < responses.size(); i++) {
    SendResponse sendResponse = responses.get(i);
    if (!sendResponse.isSuccessful()) {
        MessagingErrorCode errorCode =
            sendResponse.getException().getMessagingErrorCode();

        if (errorCode == MessagingErrorCode.UNREGISTERED ||
            errorCode == MessagingErrorCode.INVALID_ARGUMENT) {
            // Token is no longer valid — delete it from DB
            deviceTokenRepository.deleteByToken(tokens.get(i));
        }
    }
}
```

---

## Notification Data Contract

The `data` object in every notification is what the app reads to decide where to navigate. Both sides must agree on this structure.

| `type` | Required extra fields | App navigates to |
|---|---|---|
| `ISSUE_UPDATE` | `issueId` | Issue detail screen |
| `ISSUE_COMMENT` | `issueId` | Issue detail screen |
| `NEARBY_ISSUE` | `issueId` (optional) | Map tab |
| `KARMA_UPDATE` | — | Map tab (extend later) |

**Rules:**
- All values in `data` must be **strings** (FCM requirement — no numbers or booleans)
- `type` is required — without it the app opens but does not navigate
- `notification.title` and `notification.body` are what the user sees in the tray

---

## When to Trigger Each Notification

| Event | Type | Who gets it |
|---|---|---|
| Issue status changes (open → resolved, etc.) | `ISSUE_UPDATE` | Issue reporter |
| Someone comments on an issue | `ISSUE_COMMENT` | Issue reporter |
| New issue reported within X km of user | `NEARBY_ISSUE` | All users in radius |
| User earns or has karma confirmed | `KARMA_UPDATE` | That user |

---

## End-to-End Flow Summary

```
1. User logs in
       ↓
2. App calls POST /account/device-token  (only if token changed)
       ↓
3. Backend stores token linked to user
       ↓
4. Backend event fires (issue resolved, new nearby report, etc.)
       ↓
5. Backend fetches device tokens for target user(s)
       ↓
6. Backend calls Firebase Admin SDK → messaging().send(...)
       ↓
7. Firebase → Android (FCM) → device
       ↓
8. App state determines behaviour:
   - Foreground  → Alert popup
   - Background  → system tray notification; tap → navigate
   - Killed      → system tray notification; tap → app opens + navigate
```

---

## Testing End-to-End Before Backend is Ready

You can simulate a real backend notification directly from Firebase Console with a custom data payload:

1. Firebase Console → Messaging → New campaign → Firebase Notification messages
2. Fill in title + body
3. **Additional options → Custom data** → add:
   - Key: `type`  Value: `ISSUE_UPDATE`
   - Key: `issueId`  Value: `123`
4. Target → Single device → paste your FCM token
5. Send

This lets you test navigation before the backend endpoint exists.
