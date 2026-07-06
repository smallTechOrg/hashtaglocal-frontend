# EAS Build Guide

## Quick Start

**Check login status:**
```bash
npx eas-cli whoami
```

**Build commands:**
```bash
# Development build (with dev tools)
npx eas-cli build -p android --profile development

# Preview build (for testing)
npx eas-cli build -p android --profile preview

# Production build
npx eas-cli build -p android --profile production
```

## Project Info
- Account: `smalltech`
- Project ID: `567a7bdf-fc21-4a5f-b83b-8d6d2262b3d2`
- Package: `com.smalltech.hashtaglocalfrontend`

## Build Profiles

| Profile | Purpose | Environment |
|---------|---------|-------------|
| `development` | Dev builds with Expo Dev Client | development |
| `preview` | Internal testing/staging | preview |
| `production` | App store releases | production |

## Configuration

**app.config.js:**
- JavaScript-based config with environment variable support
- **DO NOT** hardcode secrets - use EAS env vars
- Safe to commit to git

**Native Dependencies:**
- `react-native-maps` - Requires rebuild when added/updated
- Google Maps API key stored as EAS secret

## Environment Variables & Secrets

**List environment variables** (must specify environment):
```bash
npx eas-cli env:list --environment development
npx eas-cli env:list --environment preview
npx eas-cli env:list --environment production
```

**List secrets (deprecated, use env:list):**
```bash
npx eas-cli secret:list
```

**Create secret:**
```bash
npx eas-cli env:create --scope project --name SECRET_NAME --value "value" --type string
```

Example:
npx eas-cli env:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "xyz.apps.googleusercontent.com" --type string --environment preview

**Update secret:**
```bash
npx eas-cli env:update SECRET_NAME --value "new-value"
```

**Delete secret:**
```bash
npx eas-cli env:delete SECRET_NAME
```

**Current environment variables:**
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URI`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_MAPS_API_KEY` (secret)
- `ANDROID_GOOGLE_SERVICES` (file secret — Android Firebase config, production only)
- `IOS_GOOGLE_SERVICES` (file secret — iOS Firebase config, production only)

> **Note:** Local `.env` file is NOT used in EAS builds - only for `expo start`

## Firebase Config Files

`google-services.json` and `GoogleService-Info.plist` are gitignored. For EAS builds to work, upload them as file secrets once per environment:

```bash
# Android
npx eas-cli env:create --scope project --name ANDROID_GOOGLE_SERVICES --type file --value ./google-services.json --environment production

# iOS
npx eas-cli env:create --scope project --name IOS_GOOGLE_SERVICES --type file --value ./GoogleService-Info.plist --environment production
```

**`app.config.js` must reference the secrets** (already updated):
```js
// Android
googleServicesFile: process.env.ANDROID_GOOGLE_SERVICES ?? "./google-services.json",

// iOS
googleServicesFile: process.env.IOS_GOOGLE_SERVICES ?? "./GoogleService-Info.plist",
```

These secrets only exist for the `production` environment — `development` and `preview` builds fall back to the local gitignored files.

Locally (during `expo start`) the files are read directly from disk. On EAS the env var path is used.

## Installation

**Android:**
1. QR code shown in terminal after build completes
2. Download APK from build page
3. Install (may need to enable "Install from unknown sources")

**iOS:**
1. Requires proper provisioning profile
2. Install via TestFlight or direct install

## Useful Commands

```bash
# View build history
npx eas-cli build:list

# View specific build
npx eas-cli build:view [BUILD_ID]

# Cancel build
npx eas-cli build:cancel

# Check CLI version
npx eas-cli --version
```

## Troubleshooting

**Command not found:**
Use `npx eas-cli` instead of `eas`

**Not logged in:**
```bash
npx expo login
```

**Slow builds:**
Free tier has slower queue priority (10-20 min typical)

## Resources
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Environment Variables](https://docs.expo.dev/build-reference/variables/)
- [Project Dashboard](https://expo.dev/accounts/madhyamakist/projects/hashtaglocal-frontend)

