# #local Frontend Mobile

## Purpose
Mobile app for #local.


## Get started

### Install dependencies
```bash
npm install
```
### Setup Instructions
To run expo start on your local do expo login first.
```bash
npx expo login
```

###  Start the app
```bash
npx expo start
```

To use remotely, when not on same network:
```bash
npx expo start --tunnel
```


###  Run Backend

Create .env file.
And insert this:
`EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8080`

Replace the IP with the output you get when you run `npx expo start`:
Example:
› Metro waiting on exp://192.168.1.6:8081

`EXPO_PUBLIC_API_BASE_URL=http://192.168.1.6:8080`

Re-start the app after you've made this change.


## Config Setup

Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to the .env file. Get it from a team member.
   
## Map API Key 
Can be accessed through these links
https://console.cloud.google.com/google/maps-apis/api-list?project=ai-agent-boilerplate0

#local-app
https://console.cloud.google.com/google/maps-apis/credentials?project=ai-agent-boilerplate0

---

## Builds

Uses [EAS Build](https://docs.expo.dev/build/introduction/) with three profiles:

| Profile | Command | Output | Use for |
|---|---|---|---|
| `development` | `eas build --profile development --platform android` | APK | Local dev with dev client |
| `preview` | `eas build --profile preview --platform android` | APK | Internal QA, quick testing |
| `production` | `eas build --profile production --platform android` | AAB | Play Store submission |

---

## OTA Updates (EAS Update)

> **Use this to ship JS fixes without going through the Play Store. After a fix, this is almost always the right command instead of a full rebuild.**

### What it is

Expo apps have two layers:
1. **Native shell** — the compiled Android/iOS binary. Changing this requires a full rebuild + store submission.
2. **JavaScript bundle** — all React components, screens, business logic, API calls. This can be updated independently.

EAS Update pushes a new JS bundle directly to installed apps. On the next app launch, users silently receive the update — no Play Store download, no review wait.

### When to use OTA vs full rebuild

**Use `eas update` (OTA) for:**
- Any change in `.ts` / `.tsx` files — screens, components, utils, API clients
- Bug fixes, UI tweaks, logic changes, new JS-only packages

**Do a full `eas build` when:**
- You changed `app.config.js` (scheme, permissions, plugins, version)
- You added a package that includes native code (new Firebase module, new camera lib, etc.)
- You changed anything in `android/` or `ios/`

### How to push an update

```bash
# Push to production (Play Store users)
eas update --branch production --message "Fix: describe what changed"

# Push to preview channel (internal testers with preview APK)
eas update --branch preview --message "Test: describe what changed"
```

### How users receive updates

- On app launch, the app checks for a new bundle in the background
- If found, it downloads silently
- Update applies on the **next** app restart (not the current session)
- If download fails (no internet), the app keeps running the previous bundle safely

### Channels

| EAS build profile | Update channel | Who gets it |
|---|---|---|
| `production` | `production` | Play Store users |
| `preview` | `preview` | Internal testers with preview APK |

### Typical workflow

```
Bug reported → fix code → eas update --branch production --message "Fix: <what>" → done
```

No rebuild. No Play Store submission. Users get it on next launch.

