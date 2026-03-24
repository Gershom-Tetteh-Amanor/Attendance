# QR Attendance System — Final v4

Upload 4 files. Deploy. Done.

---

## What was fixed in this version

### 1. Student check-ins not appearing on lecturer screen
**Root cause:** Without Firebase, `localStorage` is per-browser. A student on their phone has a separate localStorage — the lecturer's browser never sees their write.

**Fix — two-layer sync:**
- **With Firebase (recommended):** `db.ref('sessions/ID/records').on('value', ...)` fires a real-time event on *every connected client* the instant any student writes a check-in. The lecturer's dashboard updates within ~200ms automatically.
- **Without Firebase (same-device demo):** A `BroadcastChannel` sends a message between tabs in the same browser. Plus localStorage is polled every 1.5 seconds as a fallback. A yellow "Demo mode" banner warns you when Firebase is not configured.

### 2. Lecturer signup now uses random OTPs
Access codes are gone. Replaced with a clean OTP flow:
- Admin goes to **Admin → OTP Manager** and clicks **Generate OTP**
- A random 6-digit number is generated (e.g. `483921`)
- Admin shares it with the lecturer by any channel (email, WhatsApp, letter)
- Lecturer enters it on the **Registration** page — it is validated, marked used, and can never be reused
- Each OTP expires after **24 hours** and is single-use

---

## Files — upload all 4

```
index.html     ← Complete app (all HTML + CSS + JS inline)
sw.js          ← Service worker (offline support)
manifest.json  ← PWA manifest
README.md      ← This file
```

---

## Deploy to GitHub Pages (2 minutes)

1. Create a new GitHub repository
2. Upload all 4 files to the root
3. **Settings → Pages → Source → Deploy from branch → main / root → Save**
4. Live at: `https://<username>.github.io/<repo>/`

**Custom domain:** Settings → Pages → Custom domain. Add a CNAME DNS record at your registrar pointing `www` → `<username>.github.io`.

**Google Search:** Go to https://search.google.com/search-console → Add property → verify via DNS → Request indexing.

---

## Firebase Setup (10 minutes) — required for multi-device real-time sync

### Step 1 — Create project
1. https://console.firebase.google.com → **Add project**
2. Name it (e.g. `qr-attendance`) → Continue → Create

### Step 2 — Enable Realtime Database
Build → Realtime Database → Create database → choose region → **Start in test mode**

### Step 3 — Get config
Project Settings (gear) → Your apps → **Web `</>`** → Register → Copy config

### Step 4 — Paste into index.html
Find the `FB_CFG` block and replace the placeholder values:
```javascript
const FB_CFG = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  databaseURL:       "https://your-project-default-rtdb.firebaseio.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc..."
};
```

### Step 5 — Set database rules
Firebase Console → Realtime Database → Rules:
```json
{
  "rules": {
    "sessions": {
      ".read": true,
      "$sessionId": { ".write": true }
    },
    "lecturers": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "backup": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```
*(Tighten these rules before going to production.)*

---

## First-time setup

1. Deploy files
2. Open the app → **Admin** → default password: `admin1234`
3. **Settings → Change admin password immediately**
4. **OTP Manager → Generate OTP** for each lecturer → share the 6-digit code
5. Lecturer visits the site → **Lecturer → Register with your OTP**
6. Students only ever scan the QR code — no login, no app

---

## How real-time sync works

```
Student scans QR  →  check-in page opens (session decoded from URL)
       │
       ▼
Student taps "Check in"
       │
       ├─ Firebase configured? ─── YES ──► DB.pushRecord() writes to Firebase
       │                                         │
       │                                         ▼
       │                              Firebase fires .on('value') listener
       │                              on EVERY connected client (including lecturer)
       │                                         │
       │                                         ▼
       │                              renderLiveAtt() updates lecturer screen
       │
       └─ No Firebase? ──────────────► Write to localStorage
                                                 │
                                       BroadcastChannel message to open tabs
                                       + 1.5s polling timer reads localStorage
                                                 │
                                       renderLiveAtt() updates lecturer screen
                                       (only works if both are in same browser)
```

---

## Security

| Check | Mechanism |
|-------|-----------|
| Lecturer registration | Valid, unexpired, unused 6-digit OTP required |
| OTP security | Single-use; 24-hour expiry; admin can revoke before use |
| Login | Email + password (FNV-1a hashed locally; use Firebase Auth for production) |
| One device per session | Browser fingerprint (UA, screen, timezone, platform) |
| Unique student ID | Stored per session; duplicate rejected with original name shown |
| Location fence | Haversine distance vs. classroom GPS anchor |
| QR expiry | Timestamp embedded in URL; validated client-side on open |
| Co-admin actions | Queued as pending approvals; super admin must approve |
| Admin backup | Written on every session end; preserved even if lecturer deletes records |
