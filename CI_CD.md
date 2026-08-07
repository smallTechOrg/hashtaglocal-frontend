# CI/CD Pipeline

## Overview

Three GitHub Actions workflows handle CI checks and EAS builds. No VM deployment — builds are handled by Expo Application Services (EAS).

## Architecture

```
Push to any branch ──▶ ci.yml ──▶ lint + test
PR to main         ──▶ eas-preview.yml ──▶ lint + test ──▶ EAS preview build (Android APK)
Manual trigger     ──▶ eas-production.yml ──▶ lint + test ──▶ EAS production build ──▶ (optional) store submit
```

## Workflows

### 1. CI (`ci.yml`)

Runs on every push to `main`/`staging` and on PRs to `main`.

- `npm ci`
- `npx expo lint` (ESLint via expo config)
- `npx jest --ci --coverage`

### 2. EAS Preview Build (`eas-preview.yml`)

Runs on PRs to `main`. First runs lint + test, then builds.

- Uses `expo/expo-github-action@v8` to set up EAS CLI
- `eas build --platform android --profile preview --non-interactive`
- Produces an internal-distribution APK for testing
- Build URL appears in the GitHub Actions logs and on [expo.dev](https://expo.dev)

### 3. EAS Production Build (`eas-production.yml`)

Manual trigger only (`workflow_dispatch`). Options:

| Input | Type | Description |
|-------|------|-------------|
| `platform` | choice | `android`, `ios`, or `all` |
| `submit` | boolean | Whether to submit to Play Store / App Store after build |

Flow:
1. Lint + test
2. `eas build --platform PLATFORM --profile production --non-interactive`
3. (If submit=true) `eas submit --platform PLATFORM --non-interactive`

## EAS Profiles (from `eas.json`)

| Profile | Distribution | Use |
|---------|-------------|-----|
| `development` | internal | Dev client builds |
| `preview` | internal | PR preview APKs |
| `production` | store | Play Store / App Store releases |

## GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `EXPO_TOKEN` | Personal access token from [expo.dev](https://expo.dev) → Account Settings → Access Tokens (owner: `madhyamakist`) |

## How to Get `EXPO_TOKEN`

1. Log in to [expo.dev](https://expo.dev) as the `madhyamakist` account
2. Go to **Account Settings → Access Tokens**
3. Create a new token with a descriptive name (e.g., `github-actions`)
4. Copy the token and add it as a GitHub secret named `EXPO_TOKEN`

## Running Locally

```bash
# Lint
npx expo lint

# Test
npx jest

# Preview build
eas build --platform android --profile preview

# Production build
eas build --platform android --profile production
```
