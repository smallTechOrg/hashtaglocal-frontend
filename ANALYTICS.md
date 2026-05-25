# Analytics Tracking

All events are sent via **Firebase Analytics** (`@react-native-firebase/analytics`).  
The central module is [`utils/analytics.ts`](utils/analytics.ts).

To test on development build:

1. Connect phone to laptop through adb
2. run this command

`adb shell setprop debug.firebase.analytics.app com.smalltech.hashtaglocal`

3. Check real time logs on https://console.firebase.google.com/project/ai-agent-boilerplate0/analytics/app/ios:com.smalltech.hashtaglocal/debugview/realtime~2Fdebugview%3Ffpn%3D870371939888

---

## Dashboard Metrics (Firebase Console)

> All metrics are aggregated by Firebase — nothing is calculated in the app.  
> There is a **~24h delay** for production data. For real-time individual events, use DebugView (see testing section above).

| Metric                                    | Where to see it in Firebase Console                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Active Users** (uploaded 1+ issue/week) | Analytics → Events → click `issue_reported` → set date range to last 7 days → **User count** |
| **New User Sign-Ups**                     | Analytics → Events → click `sign_up` → **Event count**                                       |
| **Total Issues Reported**                 | Analytics → Events → click `issue_reported` → **Event count**                                |
| **Total Verifications**                   | Analytics → Events → click `issue_verified` → **Event count**                                |

**Report funnel drop-off:**  
Analytics → **Funnels** → create a funnel with steps: `report_screen` → `report_cta_tapped` → `camera_opened` → `photo_captured` → `issue_form_opened` → `issue_reported`

---

## Events

### Auth

| Event name | Trigger                                                       | Parameters         |
| ---------- | ------------------------------------------------------------- | ------------------ |
| `sign_up`  | User authenticates and a **new** account is created in the DB | `method: "google"` |
| `login`    | User authenticates and an **existing** account is found       | `method: "google"` |
| `logout`   | User taps logout                                              | —                  |

> `sign_up` vs `login` is determined by the backend's `is_new_user` flag in the OAuth callback.  
> Source: `GoogleAuthService.java` → `auth-handler.html` → `app/auth/callback.tsx`.

---

### Report Funnel

Events fire in order as the user moves through the report flow. Abandonment events fire at each step when the user backs out.

```
      report_screen  ← Report tab focused
            ↓  (back without tapping CTA)
report_screen_abandoned

      report_screen
            ↓  (tapped CTA)
   report_cta_tapped
            ↓
      camera_opened  (mode: "report")
            ↓  (back before taking photo)
    camera_abandoned  (mode: "report")

      camera_opened
            ↓  (photo taken)
     photo_captured  (mode: "report")
            ↓  (back from photo preview)
    photo_abandoned  (mode: "report")

     photo_captured
            ↓  (proceeded to form)
  issue_form_opened  (mode: "report")
            ↓  (back without submitting)
 issue_form_abandoned  (mode, step)

  issue_form_opened
            ↓  (submitted)
     issue_reported
```

| Event name                | Trigger                                                               | Parameters                                                    |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `report_screen`           | User opens (or returns to) the **Report** tab                         | —                                                             |
| `report_screen_abandoned` | User leaves the Report tab **without** tapping the CTA                | —                                                             |
| `report_cta_tapped`       | User taps the **"Report Issue"** button on the guidelines screen      | —                                                             |
| `camera_opened`           | `CameraCapture` screen gains focus                                    | `mode: "report" \| "update"`                                  |
| `camera_abandoned`        | User exits `CameraCapture` **before** taking any photo                | `mode: "report" \| "update"`                                  |
| `photo_captured`          | User successfully captures a photo                                    | `mode: "report" \| "update"`                                  |
| `photo_abandoned`         | User took a photo but **went back** from the preview without using it | `mode: "report" \| "update"`                                  |
| `issue_form_opened`       | `IssueForm` screen gains focus                                        | `mode: "report" \| "update"`                                  |
| `issue_form_abandoned`    | User leaves `IssueForm` **without** a successful submission           | `mode: "report" \| "update"`, `step: "no_type" \| "has_type"` |
| `issue_reported`          | Issue is successfully submitted to the API                            | `issue_type: string` (lowercased)                             |

**`step` values for `issue_form_abandoned`:**

| Value      | Meaning                                  |
| ---------- | ---------------------------------------- |
| `no_type`  | User left before selecting an issue type |
| `has_type` | User selected a type but did not submit  |

---

### Issue Actions

| Event name            | Trigger                                      | Parameters         |
| --------------------- | -------------------------------------------- | ------------------ |
| `issue_detail_opened` | Issue detail screen loads successfully       | `issue_id: string` |
| `issue_verified`      | User successfully verifies an existing issue | `issue_id: string` |
| `issue_resolved`      | User successfully resolves an existing issue | `issue_id: string` |

---
