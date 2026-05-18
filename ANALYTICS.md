# Analytics Tracking

All events are sent via **Firebase Analytics** (`@react-native-firebase/analytics`).  
The central module is [`utils/analytics.ts`](utils/analytics.ts).

To test on development build:
1. Connect phone to laptop through adb
2. run this command 

```adb shell setprop debug.firebase.analytics.app com.smalltech.hashtaglocal```

3. Check real time logs on https://console.firebase.google.com/project/ai-agent-boilerplate0/analytics/app/ios:com.smalltech.hashtaglocal/debugview/realtime~2Fdebugview%3Ffpn%3D870371939888


---

## Dashboard Metrics (Firebase Console)

| Metric                                    | How to derive it                                                   |
| ----------------------------------------- | ------------------------------------------------------------------ |
| **Active Users** (uploaded 1+ issue/week) | Count distinct users who fired `issue_reported` in the last 7 days |
| **New User Sign-Ups**                     | Count `sign_up` events                                             |
| **Total Issues Reported**                 | Count `issue_reported` events                                      |
| **Total Verifications**                   | Count `issue_verified` events                                      |

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

Events fire in order as the user moves through the report flow. Any gap between steps = a drop-off / abandonment.

```
report_flow_started  ← tab focused
       ↓
  report_cta_tapped  ← "Report Issue" button pressed
       ↓
  camera_opened  (mode: "report")
       ↓
  photo_captured (mode: "report")
       ↓
 issue_form_opened (mode: "report")
       ↓
    issue_reported
```

| Event name              | Trigger                                                          | Parameters                                                    |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `report_flow_started`   | User opens the **Report** tab (guidelines screen)                | —                                                             |
| `report_cta_tapped`     | User taps the **"Report Issue"** button on the guidelines screen | —                                                             |
| `camera_opened`         | `CameraCapture` screen mounts                                    | `mode: "report" \| "update"`                                  |
| `photo_captured`        | User successfully captures a photo                               | `mode: "report" \| "update"`                                  |
| `issue_form_opened`     | `IssueForm` screen mounts                                        | `mode: "report" \| "update"`                                  |
| `report_form_abandoned` | `IssueForm` unmounts **without** a successful submission         | `mode: "report" \| "update"`, `step: "no_type" \| "has_type"` |
| `issue_reported`        | Issue is successfully submitted to the API                       | `issue_type: string` (lowercased)                             |

**`step` values for `report_form_abandoned`:**

| Value      | Meaning                                  |
| ---------- | ---------------------------------------- |
| `no_type`  | User left before selecting an issue type |
| `has_type` | User selected a type but did not submit  |

**Photo captured but form never opened:**  
No explicit event is needed — the gap between `photo_captured` (fires) and `issue_form_opened` (doesn't fire) is detectable as a funnel drop-off in Firebase Console.

---

### Issue Detail

| Event name            | Trigger                                | Parameters         |
| --------------------- | -------------------------------------- | ------------------ |
| `issue_detail_opened` | Issue detail screen loads successfully | `issue_id: string` |

---

### Issue Actions

| Event name            | Trigger                                      | Parameters         |
| --------------------- | -------------------------------------------- | ------------------ |
| `issue_detail_opened` | Issue detail screen loads successfully       | `issue_id: string` |
| `issue_verified`      | User successfully verifies an existing issue | `issue_id: string` |
| `issue_resolved`      | User successfully resolves an existing issue | `issue_id: string` |

---

