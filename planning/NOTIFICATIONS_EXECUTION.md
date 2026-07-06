# Notifications — Execution Plan

> Stack: Expo + React Native, `@react-native-firebase` already installed, EAS builds, expo-router
> Scope: Android now. iOS is unlocked by 2 steps at the end — no code restructuring needed.
> Last updated: 2026-05-24

---

## Who Does What

| Task | You | Claude |
|---|---|---|
| `npm install` command | Yes | |
| Rebuild with EAS | Yes | |
| Firebase Console test send | Yes | |
| Backend endpoint creation | You / backend team | |
| All code changes | | Yes (just ask) |

---

## Overview of Files That Will Change or Be Created

```
index.js                            ← NEW — custom entry point (background handler must live here)
package.json                        ← EDIT — change "main" to "./index.js"
app.config.js                       ← EDIT — add messaging plugin + Android 13 permission
utils/notificationService.ts        ← NEW — all FCM logic in one place
app/_layout.tsx                     ← EDIT — wire token registration after login
```

---

## Step 1 — Install the Package

**You run this in terminal:**
```bash
npx expo install @react-native-firebase/messaging
```

That's it. Do not `npm install` directly — `expo install` picks the version that matches your Expo SDK.

---

## Step 2 — Edit `app.config.js`

**Ask Claude:** "Add `@react-native-firebase/messaging` plugin and Android 13 POST_NOTIFICATIONS permission to app.config.js"

What Claude will do:
- Add `"@react-native-firebase/messaging"` to the `plugins` array (alongside the existing firebase plugins)
- Add `POST_NOTIFICATIONS` to `android.permissions` — required for Android 13+ (API 33+) to show notifications

The resulting plugins section will look like:
```js
plugins: [
  "@react-native-firebase/app",
  "@react-native-firebase/crashlytics",
  "@react-native-firebase/perf",
  "@react-native-firebase/messaging",   // ← added
  // ...rest unchanged
]
```

And android section:
```js
android: {
  permissions: ["android.permission.POST_NOTIFICATIONS"],  // ← added
  // ...rest unchanged
}
```

---

## Step 3 — Create a Custom Entry File

**Ask Claude:** "Create `index.js` at the project root and update `package.json` main field for Firebase background message handling"

**Why this step exists:** Firebase's background message handler (`setBackgroundMessageHandler`) must be registered before React mounts. With expo-router, `main` in package.json points to `expo-router/entry` and you have no `index.js`. You need one so you can register the handler first, then hand off to expo-router.

What Claude will create — `index.js`:
```js
import messaging from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Must be outside React — handles notifications when app is killed
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background message:', remoteMessage.messageId);
  // No UI here — system already showed the notification
  // Use remoteMessage.data for silent processing if needed
});

registerRootComponent(ExpoRoot);
```

What Claude will edit — `package.json`:
```json
"main": "./index.js"
```

---

## Step 4 — Create `utils/notificationService.ts`

**Ask Claude:** "Create `utils/notificationService.ts` with FCM token retrieval, permission request, and notification tap handlers for Android"

This file will export:
- `requestNotificationPermission()` — asks Android 13+ for permission; on Android 12 and below this is a no-op. **iOS is guarded off for now but the function accepts a platform check — enabling iOS later is one line.**
- `getFCMToken()` — returns the FCM device token string (or null if permission denied)
- `saveFCMToken(token)` — calls your backend `POST /account/device-token` using the existing `apiPost` from `utils/apiClient.ts`
- `registerForegroundHandler()` — returns an unsubscribe function; logs the message (you can extend to show an in-app banner later)
- `setupNotificationTapHandlers(router)` — handles both cases:
  - `onNotificationOpenedApp` — app was in background, user tapped notification
  - `getInitialNotification` — app was killed, user tapped notification and launched it

The tap handler will read `remoteMessage.data.type` and `remoteMessage.data.issueId` (or whatever your backend sends) to navigate to the right screen using expo-router.

---

## Step 5 — Edit `app/_layout.tsx`

**Ask Claude:** "In the AuthLoader in `app/_layout.tsx`, after the user is successfully loaded, call the notification setup from `utils/notificationService.ts`"

Where it goes: inside `AuthLoader`, in the `loadUserProfile` function, right after `setUser(...)` succeeds (line ~72 in the current file). Also add the tap handlers in `RootLayout` alongside the existing deep link handler.

What gets added:
```ts
// After setUser({ username, ... }) in AuthLoader:
const permission = await requestNotificationPermission();
if (permission) {
  const token = await getFCMToken();
  if (token) {
    await saveFCMToken(token);  // sends to your backend
  }
}
```

```ts
// In RootLayout useEffect, alongside the Linking deep link handler:
setupNotificationTapHandlers(router);
```

---

## Step 6 — Rebuild with EAS

**You run this:**
```bash
eas build --profile development --platform android
```

> Native code changed (new package added), so Expo Go will not work anymore for this. You need an EAS dev build. You already have EAS configured so this is just running the command.

Wait for the build, install the APK on your device or use the QR code from EAS.

---

## Step 7 — Test Your First Notification

1. Open the app on your Android device (the EAS dev build from Step 6)
2. Log in — this triggers the token registration
3. Watch the Metro/console logs for a line like:
   ```
   [FCM] Token: dGhpcyBpcyBhIGZha2UgdG9rZW4...
   ```
4. Copy that token
5. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Engage → Messaging**
6. Click **"Send your first message"**
7. Fill in Title and Body (anything)
8. Under **"Test on device"** → paste your token → **Test**
9. Test all 3 app states:
   - **Foreground** (app open): check console log — you'll see the message received
   - **Background** (home screen): notification should appear in the notification tray
   - **Killed** (force close app): notification should appear, tapping it should open app

---

## Step 8 — Backend Integration

Your backend needs one new endpoint. Tell your backend team:

**Endpoint:** `POST /account/device-token`

**Request body:**
```json
{
  "token": "fcm-device-token-string",
  "platform": "android"
}
```

**What backend does with it:**
- Store the token linked to the authenticated user (use the JWT from the `Authorization` header to identify the user)
- One user can have multiple tokens (multiple devices) — store all of them
- On logout, delete the token (you'll need to call this endpoint with a DELETE or pass `null`)

**Sending a notification from backend (Node.js Firebase Admin SDK example):**
```js
const admin = require('firebase-admin');

await admin.messaging().send({
  token: userDeviceToken,
  notification: {
    title: 'Issue updated',
    body: 'Your pothole report has been resolved.',
  },
  data: {
    type: 'ISSUE_UPDATE',       // used by the app to navigate
    issueId: '456',
  },
  android: {
    priority: 'high',
  },
});
```

> The `data` object is what your app reads when the user taps the notification to decide where to navigate. Keep `type` as a consistent enum your frontend and backend agree on.

---

## Step 9 — Define Notification Types

Before your backend starts sending, agree on the notification types the app will handle. Suggested starting set for #local:

| `type` | Trigger | Navigate to |
|---|---|---|
| `ISSUE_UPDATE` | Status of user's issue changed | `issueDetail` screen |
| `NEARBY_ISSUE` | New issue reported near user | Map tab, centered on issue |
| `ISSUE_COMMENT` | Someone commented on user's issue | `issueDetail` screen |
| `KARMA_UPDATE` | User received karma | Profile / karma screen |

Add these as an enum in `utils/notificationService.ts` so both the handler and the backend share a contract.

---

## iOS — When You're Ready (2 Steps, No Code Changes)

### Step A — Upload APNs Key to Firebase (You, one-time)
1. Go to [Apple Developer Portal](https://developer.apple.com) → Certificates, Identifiers & Profiles → **Keys**
2. Create new key → enable **Apple Push Notifications service (APNs)** → Download `.p8` file
3. Firebase Console → Project Settings → **Cloud Messaging** → Apple app configuration
4. Upload the `.p8`, enter your **Key ID** and **Team ID**

### Step B — Enable iOS in permission request (Claude, 1 line)
In `utils/notificationService.ts`, `requestNotificationPermission()` will have a guard:
```ts
if (Platform.OS !== 'android') return false;  // ← remove this line when ready for iOS
```
Remove that guard and iOS is live. On iOS, `messaging().requestPermission()` shows the native system alert asking the user to allow notifications.

Then rebuild for iOS:
```bash
eas build --profile development --platform ios
```

That's it. All handlers, token registration, and tap routing already work on iOS — no other code changes.

---

## Troubleshooting Reference

| Symptom | Cause | Fix |
|---|---|---|
| Token is `null` | Permission denied or Play Services missing | Check `requestPermission()` return value, test on physical device not emulator |
| Works in dev build, not prod | Wrong `google-services.json` in build | Make sure EAS uses the file at project root |
| Background handler not called | Registered inside React component | Must be in `index.js` before `registerRootComponent` |
| Tap handler navigates wrong screen | `getInitialNotification` not awaited before navigation | It must resolve before `router.push` runs |
| Android 13 device — no notifications appear | `POST_NOTIFICATIONS` missing | Check `app.config.js` android.permissions |
| iOS: notification received but not shown | APNs key not uploaded or wrong bundle ID | Verify Firebase Console Cloud Messaging settings |
