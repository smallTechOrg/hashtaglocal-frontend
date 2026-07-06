# Push Notifications — Planning & Roadmap

> Project: #local (Expo + React Native, Firebase already configured, EAS builds)
> Created: 2026-05-24

---

## 1. What Push Notifications Actually Are

A push notification is a message sent from a server to a device, even when the app is not open. The flow is:

```
Your Backend  →  Notification Provider  →  Apple (APNs) / Google (FCM)  →  Device
```

Two things need to be true:
1. Your app registers a **device token** — a unique address for that device.
2. Your server sends a message to that token through the right provider.

---

## 2. Your Options

### Option A — `expo-notifications` (Expo Push Service)
| | |
|---|---|
| **How it works** | Expo wraps APNs + FCM behind one unified API. You send tokens to Expo's push endpoint; Expo forwards to Apple/Google. |
| **Pros** | Simplest setup, one token format for both platforms, no APNs key/cert to manage manually, works great with EAS builds. |
| **Cons** | Adds Expo as a middleman (tokens go through expo.dev). Slightly less control over advanced FCM features (topics, data-only messages). |
| **Best for** | Teams new to notifications, standard use cases (alerts, badges, sounds). |

### Option B — `@react-native-firebase/messaging` (Direct FCM)
| | |
|---|---|
| **How it works** | Uses Firebase Cloud Messaging directly. On Android this is FCM; on iOS FCM internally wraps APNs. You get a raw FCM token. |
| **Pros** | You already have Firebase installed (`@react-native-firebase/app`). Full FCM feature set: topics, data-only messages, analytics. No Expo middleman. |
| **Cons** | You must configure APNs authentication key in Firebase Console (one-time step). Slightly more setup than expo-notifications. |
| **Best for** | Projects already using Firebase (that's you). More control, server-side Firebase Admin SDK integration. |

### Option C — OneSignal / Courier / Knock (Third-party SaaS)
| | |
|---|---|
| **How it works** | A fully managed notification platform. You integrate their SDK; they handle delivery, templating, user segmentation, and analytics. |
| **Pros** | Rich dashboard, scheduling, A/B testing, multi-channel (email, SMS, push) from one place. |
| **Cons** | Another third-party dependency, costs money at scale, less ownership of the data. |
| **Best for** | Teams that want a no-code notification management dashboard without building backend logic. |

---

## 3. Recommendation for #local

**Use `@react-native-firebase/messaging` (Option B).**

Why: Firebase is already configured in your project (google-services.json, GoogleService-Info.plist, `@react-native-firebase/app` in package.json). Adding `@react-native-firebase/messaging` is a natural extension. You avoid a third-party middleman, and Firebase Admin SDK on your backend gives you full control over sending notifications.

---

## 4. How Notifications Work on Each Platform

### iOS
- Uses **APNs (Apple Push Notification service)**
- FCM wraps APNs — Firebase handles the APNs communication
- Requires: APNs Auth Key (.p8 file) uploaded to Firebase Console **once**
- Users must **grant permission** — you must ask explicitly with a prompt
- Supported notification types: alerts, badges, sounds, background fetch

### Android
- Uses **FCM (Firebase Cloud Messaging)** natively
- No user permission prompt needed on Android 12 and below
- Android 13+ requires `POST_NOTIFICATIONS` permission (expo-notifications handles this)
- More flexible: FCM data messages can wake the app in the background

---

## 5. Notification Types You'll Deal With

| State | Description | What you handle |
|---|---|---|
| **Foreground** | App is open and active | You receive the message but must show a local notification manually |
| **Background** | App is open but backgrounded | System shows the notification; you get a tap callback |
| **Killed / Quit** | App is not running | System shows the notification; app launches on tap |

Each state has a different handler — you need to write code for all three.

---

## 6. Files You Will Create or Modify

```
app.config.js                        ← add notification plugin config
google-services.json                 ← already exists, no changes needed
GoogleService-Info.plist             ← already exists, may need APNs key in Firebase

services/
  notifications/
    index.ts                         ← main notification service (setup, token, handlers)
    types.ts                         ← notification payload types

hooks/
  useNotifications.ts                ← React hook to wire up handlers in the app

app/
  _layout.tsx                        ← register foreground/background handlers at root level
```

---

## 7. What Your Backend Needs to Do

Your backend (not covered here) needs to:
1. Accept a device token from the app when a user logs in
2. Store the token linked to that user
3. Use Firebase Admin SDK to send notifications to specific tokens

Example backend call (Node.js Firebase Admin):
```js
admin.messaging().send({
  token: deviceToken,
  notification: {
    title: 'New issue nearby',
    body: 'A pothole was reported 0.2km from you',
  },
  data: {
    type: 'NEARBY_ISSUE',
    issueId: '123',
  },
});
```

---

## 8. Roadmap — First Notification Step by Step

### Phase 1 — Setup & Configuration

- [ ] **Step 1.1** — Install the package
  ```
  npx expo install @react-native-firebase/messaging
  ```

- [ ] **Step 1.2** — Configure APNs for iOS (one-time, do this first)
  1. Go to [Apple Developer Portal](https://developer.apple.com) → Certificates, Identifiers & Profiles → Keys
  2. Create a new key, enable "Apple Push Notifications service (APNs)"
  3. Download the `.p8` file — **save it, you can only download it once**
  4. Go to [Firebase Console](https://console.firebase.google.com) → your project → Project Settings → Cloud Messaging
  5. Under "Apple app configuration" upload the `.p8` key with your Key ID and Team ID

- [ ] **Step 1.3** — Add messaging plugin to `app.config.js`
  ```js
  plugins: [
    // ... existing plugins
    "@react-native-firebase/messaging",
  ]
  ```

- [ ] **Step 1.4** — Rebuild with EAS (native change requires a new build)
  ```
  eas build --profile development --platform all
  ```

---

### Phase 2 — Get a Device Token

- [ ] **Step 2.1** — Create `services/notifications/index.ts`
  - Request permission (iOS requires explicit ask)
  - Get FCM token
  - Return token to be sent to your backend

- [ ] **Step 2.2** — Wire up in `app/_layout.tsx`
  - Call notification setup after user logs in
  - Log the token so you can test manually from Firebase Console

---

### Phase 3 — Handle Incoming Notifications

- [ ] **Step 3.1** — Foreground handler
  - When app is open, decide what to show
  - For civic app: show an in-app banner or badge update

- [ ] **Step 3.2** — Background / quit tap handler
  - When user taps a notification, navigate to the right screen
  - Use `getInitialNotification()` for quit state
  - Use `onNotificationOpenedApp()` for background state

- [ ] **Step 3.3** — Background message handler (optional, for data-only)
  - Register a headless task for silent background updates

---

### Phase 4 — Send Your First Notification

- [ ] **Step 4.1** — Copy your device token from the console log
- [ ] **Step 4.2** — Go to Firebase Console → Cloud Messaging → "Send your first message"
- [ ] **Step 4.3** — Paste your device token as the target, write a test message, send
- [ ] **Step 4.4** — Verify it appears on device in all 3 app states (foreground, background, killed)

---

### Phase 5 — Backend Integration

- [ ] **Step 5.1** — Create an API endpoint on your backend: `POST /users/device-token`
- [ ] **Step 5.2** — Call that endpoint from the app after login, passing the FCM token
- [ ] **Step 5.3** — Backend stores token per user in the database
- [ ] **Step 5.4** — Backend sends notification when a relevant event occurs (new nearby issue, reply to report, etc.)

---

## 9. Common Gotchas

| Problem | Fix |
|---|---|
| Notification works on Android but not iOS | APNs key not uploaded to Firebase Console, or missing entitlement in the build |
| Token is null | Permissions not granted (iOS) or Google Play Services not available |
| Works in dev but not in prod EAS build | Make sure you used the correct `google-services.json` and `GoogleService-Info.plist` |
| Background handler not called | `setBackgroundMessageHandler` must be called outside the React component tree, at the top of `index.js` / entry file |
| App navigates to wrong screen on tap | `getInitialNotification()` must be awaited before navigation runs |
| Android 13+ no notifications | Need to request `POST_NOTIFICATIONS` permission at runtime |

---

## 10. Useful Links

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [@react-native-firebase/messaging](https://rnfirebase.io/messaging/usage)
- [Expo + Firebase Messaging guide](https://docs.expo.dev/push-notifications/third-party-integrations/)
- [Firebase Console](https://console.firebase.google.com)
- [Apple Developer Portal — Keys](https://developer.apple.com/account/resources/authkeys/list)
