# Image Rendering Architecture

## Overview

Image handling in this app spans three concerns: **upload** (getting an image to GCS), **processing** (turning API data into renderable URLs), and **rendering** (displaying images in carousels and full-screen viewers).

---

## 1. Upload Flow

**Files:** `hooks/useImageUpload.ts`, `api/IssueDetail.ts`

When a user captures an image and fills in the issue form, the hook `useImageUpload` drives the upload automatically whenever `imageUri` changes:

```
Camera/Gallery → imageUri → useImageUpload
                                  │
                    getSignedUploadUrl (POST /api/v1/media/upload-url)
                                  │ ← { signed_url, path }
                    uploadImageToGCP (PUT blob → signed_url)
                                  │
                              gcsPath (stored in issue payload)
```

Key details:

- `fetch(imageUri)` reads the local file as a `Blob`.
- A 60-second `AbortController` timeout guards the GCS PUT request.
- On auth error no alert is shown (auth flow handles it separately).
- On any other error: Firebase Crashlytics is notified, the user sees a Retry/Cancel alert.

---

## 2. URL Processing

**File:** `utils/ImageProcessing.ts`

Before rendering, raw API media arrays are normalised by `processImageUrls`:

```
API mediaUrls[]  →  filter empty strings  →  validate/pass-through URLs  →  string[]
                                                                     ↓ (if empty)
                                                              [defaultImage]  ←  fallback asset
```

`formatLocationString` also runs here to build the `"address, colloquialName  Lat: X°N Long: Y°E"` string shown in overlays.

---

## 3. Rendering Pipeline

### Component tree

```
IssueImage (orchestrator)
├── ScrollView (horizontal, pagingEnabled)
│   └── ImageCarouselItem  × N
│       ├── expo-image (primary, with thumbnail placeholder)
│       └── RN Image (fallback, only if expo-image errors)
├── PaginationDots
├── EmptyImagePlaceholder  (when images.length === 0)
├── Media Info Card  (description, username, days_active)
└── FullScreenImageViewer (Modal, opened on tap)
    ├── ScrollView (horizontal, pagingEnabled)
    │   └── expo-image  × N
    └── PaginationDots
```

---

### 3a. `IssueImage` — orchestrator

**File:** `components/IssueImage/IssueImage.tsx`

Accepts three mutually exclusive data shapes and normalises them into `images[]` and `thumbnails[]`:

| Prop           | Contains                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| `mediaItems`   | Full media objects with `url`, `url_thumbnail`, `description`, `username`, etc. |
| `imageSources` | Plain URL strings or `ImageSourcePropType` values                               |
| `imageSource`  | Single URL string or `ImageSourcePropType`                                      |

Priority: `mediaItems` > `imageSources` > `imageSource`.

Thumbnails are only available when `mediaItems` is used (`url_thumbnail` field).

State managed here:

- `currentIndex` — which slide is active (drives Pagination Dots and the Media Info Card).
- `imageErrors` — `Record<number, boolean>` tracking which indices have failed; passed down to `ImageCarouselItem` to trigger the RN Image fallback.
- `isFullScreenVisible` — controls `FullScreenImageViewer` visibility.
- `containerWidth` — measured via `onLayout` to size the `ScrollView` correctly.

---

### 3b. `ImageCarouselItem` — single slide

**File:** `components/IssueImage/ImageCarouselItem.tsx`

Each carousel slide is its own component. Rendering logic:

```
hasError === false
  → expo-image
      source         = full-resolution URL
      placeholder    = url_thumbnail (shown while full-res loads)
      contentFit     = "cover"
      transition     = 300 ms cross-fade
      cachePolicy    = "memory-disk"
  → onError: log to Crashlytics, call onError(index) → sets imageErrors[index]=true

hasError === true
  → React Native Image (fallback)
      source         = same full-resolution URL
      resizeMode     = "cover"
  → onError: log to Crashlytics (both loaders failed)
```

The `Pressable` wrapper fires `onPress` (opens full-screen viewer) across the entire slide area.

---

### 3c. `FullScreenImageViewer` — modal viewer

**File:** `components/IssueImage/FullScreenImageViewer.tsx`

Opens as a full-black `Modal` (animationType `"fade"`). Images are rendered with:

- `contentFit="contain"` (shows the whole image, letterboxed).
- `transition={200}` ms.
- No cachePolicy set (relies on expo-image's default in-memory cache).

The ScrollView is programmatically scrolled to `initialIndex` when the modal becomes visible.

---

### 3d. Supporting components

| Component               | Role                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PaginationDots`        | White dot indicators; active dot is fully opaque, others at 50% opacity. Hidden when `totalImages <= 1`.      |
| `EmptyImagePlaceholder` | Grey box with `image-not-supported` icon when `images.length === 0`.                                          |
| `TopOverlay`            | Location + timestamp row overlaid on top of an image (used in `IssueForm/ImagePreview`, not in the carousel). |

---

### 3e. `IssueForm/ImagePreview` — form preview

**File:** `components/IssueForm/ImagePreview.tsx`

Simple non-interactive preview during issue submission. Uses `expo-image` directly with `contentFit="cover"` and no placeholder/cache config. Renders `TopOverlay` over the image.

---

## 4. Progressive Loading Strategy

1. **Thumbnail placeholder** — `url_thumbnail` is fed to expo-image's `placeholder` prop. The low-res thumbnail is shown immediately via the in-memory cache while the full-res image downloads.
2. **Cross-fade transition** — a 300 ms fade when the full image replaces the placeholder.
3. **Memory+disk cache** — `cachePolicy="memory-disk"` on carousel images means a given URL is only fetched once per app session and survives backgrounding.
4. **Graceful fallback** — if expo-image fails, React Native's `Image` is used as a last resort, and the failure is logged to Firebase Crashlytics.

---

## 5. Error & Observability Path

```
expo-image onError
  → console.error("[IssueImage] Error loading image {index}")
  → Crashlytics.log("expo-image failed … falling back to RN Image")
  → Crashlytics.recordError(...)
  → IssueImage.imageErrors[index] = true  → render RN Image fallback

RN Image onError
  → console.error("[IssueImage] RN Image also failed for {index}")
  → Crashlytics.log("Image render failed (both loaders) at index {index}")
  → Crashlytics.recordError(...)
```

Load-time performance traces are emitted via `console.log` tagged `[ImageTiming]` — see section 6.

---

## 6. Load-Time Performance Traces

Every image render site emits structured `[ImageTiming]` logs with consistent fields:

| Field                           | Meaning                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `location`                      | Where in the app: `carousel`, `fullscreen`, `bottomSheet`, `listItem`, `nearbyCard`, `eventCard`, `formPreview` |
| `index` / `issueId` / `eventId` | Identifies which item                                                                                           |
| `renderer`                      | `expo-image` or `RNImage` (fallback)                                                                            |
| `type`                          | `thumbnail`, `mainImage`, or `hasThumbnail=true/false` for progressive-load sites                               |
| `duration`                      | ms between `onLoadStart` and `onLoad` / `onError`                                                               |
| `dimensions`                    | `(w×h)` from the loaded source                                                                                  |

### 6a. Sites and what they trace

| File                         | Component             | What is traced                                                  |
| ---------------------------- | --------------------- | --------------------------------------------------------------- |
| `ImageCarouselItem.tsx`      | Issue detail carousel | expo-image main load (+ `hasThumbnail`), RN Image fallback load |
| `FullScreenImageViewer.tsx`  | Full-screen modal     | expo-image per slide                                            |
| `app/(tabs)/index.tsx`       | Map bottom sheet      | expo-image with placeholder; logs `hasThumbnail`                |
| `IssueListItem.tsx`          | List page card        | expo-image thumbnail or main image                              |
| `NearbyIssuesCheck.tsx`      | Nearby-issue card     | expo-image thumbnail or main image                              |
| `EventCard.tsx`              | Events tab card       | expo-image event image                                          |
| `IssueForm/ImagePreview.tsx` | Issue form preview    | expo-image local file                                           |

### 6b. Example output

```
[ImageTiming] bottomSheet  issueId=42  renderer=expo-image  load started  hasThumbnail=true
[ImageTiming] bottomSheet  issueId=42  renderer=expo-image  mainImage loaded in 312ms  (1920×1080)
[ImageTiming] carousel  index=0  renderer=expo-image  hasThumbnail=true  mainImage load started
[ImageTiming] carousel  index=0  renderer=expo-image  mainImage loaded in 842ms  (1920×1080)
[ImageTiming] carousel  index=0  renderer=expo-image  mainImage error after 5012ms
[ImageTiming] carousel  index=0  renderer=RNImage  mainImage load started (fallback)
[ImageTiming] carousel  index=0  renderer=RNImage  mainImage loaded in 623ms
[ImageTiming] fullscreen  index=0  renderer=expo-image  mainImage loaded in 52ms  (1920×1080)
[ImageTiming] listItem  issueId=7  renderer=expo-image  type=thumbnail  loaded in 89ms  (256×256)
[ImageTiming] nearbyCard  issueId=7  renderer=expo-image  type=thumbnail  loaded in 71ms  (256×256)
[ImageTiming] eventCard  eventId=3  renderer=expo-image  loaded in 320ms  (800×450)
[ImageTiming] formPreview  renderer=expo-image  loaded in 15ms  (4032×3024)
```

Filter with `[ImageTiming]` in Metro / Expo Dev Tools console to isolate all load traces.
