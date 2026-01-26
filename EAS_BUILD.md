# EAS Build Guide

## Overview
This document explains how to build the #local mobile app using Expo Application Services (EAS).

## Prerequisites

### 1. EAS Account Setup
- Must be logged into Expo account: `madhyamakist`
- Project ID: `567a7bdf-fc21-4a5f-b83b-8d6d2262b3d2`
- Verify login status:
  ```bash
  npx --yes eas-cli@latest whoami
  ```

### 2. Build Profiles
The project has three build profiles configured in `eas.json`:

| Profile | Environment | Distribution | Purpose |
|---------|-------------|--------------|---------|
| `development` | development | internal | Development builds with dev client |
| `preview` | preview | internal | Internal testing/staging builds |
| `production` | production | (store) | Production releases with auto-increment |

## Environment Variables

### Preview Environment
The preview build uses environment variables configured in EAS:
- `EXPO_PUBLIC_API_BASE_URL=https://staging.api.smalltech.in/local`

View current environment variables:
```bash
npx --yes eas-cli@latest env:list preview
```

### Local .env File
The local `.env` file is **NOT** used during EAS builds. It's only for local development with `expo start`.

## Building for Android

### Preview Build (Recommended for Testing)
```bash
npx --yes eas-cli@latest build -p android --profile preview --non-interactive
```

**What happens:**
1. EAS loads environment variables from the "preview" environment
2. Project files are compressed and uploaded to EAS
3. Build is queued (Free tier has wait times)
4. Remote Android credentials are used automatically
5. APK/AAB is generated on EAS servers

**Build output:**
- Build logs URL: `https://expo.dev/accounts/madhyamakist/projects/hashtaglocal-frontend/builds/[BUILD_ID]`
- QR code displayed in terminal for easy installation
- Direct download link for Android devices

### Development Build
```bash
npx --yes eas-cli@latest build -p android --profile development --non-interactive
```

### Production Build
```bash
npx --yes eas-cli@latest build -p android --profile production --non-interactive
```

## Building for iOS

### Preview Build
```bash
npx --yes eas-cli@latest build -p ios --profile preview --non-interactive
```

### Development Build
```bash
npx --yes eas-cli@latest build -p ios --profile development --non-interactive
```

### Production Build
```bash
npx --yes eas-cli@latest build -p ios --profile production --non-interactive
```

## Installing Builds

### Android
1. Open the build URL on your Android device
2. Scan the QR code from terminal output, OR
3. Download the APK directly from the build page
4. Install the APK (may need to allow installation from unknown sources)

### iOS
1. Build must be signed with proper provisioning profile
2. Open build URL on iOS device
3. Install via TestFlight (for internal distribution) or direct install

## Managing Environment Variables

### List Variables
```bash
# List for specific environment
npx --yes eas-cli@latest env:list preview
npx --yes eas-cli@latest env:list production
npx --yes eas-cli@latest env:list development
```

### Create/Update Variable
```bash
npx --yes eas-cli@latest env:create EXPO_PUBLIC_API_BASE_URL --environment preview --value "https://your-api-url.com"
```

### Delete Variable
```bash
npx --yes eas-cli@latest env:delete EXPO_PUBLIC_API_BASE_URL --environment preview
```

## Troubleshooting

### Build Command Not Found
**Problem:** `eas build -p android --profile preview` returns "command not found"

**Solution:** Use the full npx command:
```bash
npx --yes eas-cli@latest build -p android --profile preview --non-interactive
```

### Not Logged In
**Problem:** EAS commands fail with authentication error

**Solution:** Login to Expo:
```bash
npx expo login
```

### Slow Build Times
**Problem:** Builds stuck in queue for long time

**Solution:** 
- Free tier has slower queue priority
- Consider upgrading to paid plan for faster builds
- Builds typically complete within 10-20 minutes on free tier

### Wrong Environment Variables
**Problem:** Build uses wrong API endpoint

**Solution:**
1. Check which env vars are loaded:
   ```bash
   npx --yes eas-cli@latest env:list preview
   ```
2. Update if needed:
   ```bash
   npx --yes eas-cli@latest env:create EXPO_PUBLIC_API_BASE_URL --environment preview --value "https://correct-url.com"
   ```

## Package Configuration

### Android Package
- Package name: `com.madhyamakist.hashtaglocalfrontend`
- Configured in `app.json` under `expo.android.package`

### Build Credentials
- Android: Using remote credentials stored on Expo servers
- Keystore: "Build Credentials vRtUUGJZOi (default)"

## Useful Commands

```bash
# Check EAS CLI version
npx --yes eas-cli@latest --version

# View build history
npx --yes eas-cli@latest build:list

# View specific build details
npx --yes eas-cli@latest build:view [BUILD_ID]

# Cancel a running build
npx --yes eas-cli@latest build:cancel

# Configure project (if needed)
npx --yes eas-cli@latest build:configure
```

## CI/CD Integration

For automated builds, add these environment variables to your CI/CD:
- `EXPO_TOKEN`: Generate from https://expo.dev/accounts/madhyamakist/settings/access-tokens

Example GitHub Actions:
```yaml
- name: Build Android Preview
  run: npx --yes eas-cli@latest build -p android --profile preview --non-interactive --no-wait
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## Resources
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Environment Variables Guide](https://docs.expo.dev/build-reference/variables/)
- [Project Dashboard](https://expo.dev/accounts/madhyamakist/projects/hashtaglocal-frontend)
