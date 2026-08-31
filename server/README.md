# Drift notes — Firebase sync server (legacy/optional)

**This server is no longer required.** The Drift app now talks to Cloud
Firestore directly from the browser using the Firebase client SDK (see
`../auth.js` and the account/cloud-sync code in `../app.js`), and the
static site is meant to be hosted on Cloudflare Pages (`../wrangler.toml`).
Firestore access is restricted per-user by `../firestore.rules`.

Keep this folder only if you specifically want a custom Node backend in
front of Firestore (e.g. for server-side validation or a different auth
provider). Otherwise it can be ignored/deleted.

This server validates Firebase Authentication ID tokens and stores notes in
Cloud Firestore.

## What this gives you

- Google login via Firebase Auth in the frontend.
- Email/password login via Firebase Auth in the frontend.
- Notes saved per Firebase user in Firestore (`drift_notes` collection by default).

## Requirements

- Node.js 18+
- A Firebase project with:
1. Authentication enabled (`Google` and optionally `Email/Password` providers)
2. Firestore database created
3. Service account credentials for server-side Admin SDK

## 1) Configure frontend Firebase keys

Edit `../auth.js` and replace the `FIREBASE_CONFIG` placeholders with your
real Firebase web app values (`apiKey`, `authDomain`, `projectId`, `appId`).

## 2) Configure server Firebase credentials

Use one of these options:

1. `FIREBASE_SERVICE_ACCOUNT_JSON`

Set an environment variable containing the full service account JSON string.

2. `GOOGLE_APPLICATION_CREDENTIALS`

Set this env var to a local path to your Firebase service-account JSON file.

Example (PowerShell):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "E:\path\to\firebase-service-account.json"
```

## 3) Install and run

```bash
cd server
npm install
npm start
```

### Optional: video lecture notes

Set `OPENAI_API_KEY` on the server to enable transcription for uploaded video
or audio recordings (the key must never be placed in the browser). The app
uses `gpt-4o-transcribe` by default; set `OPENAI_TRANSCRIPTION_MODEL` to use a
different supported transcription model.

Public YouTube links use any captions that YouTube makes available. Videos
without captions, private videos, and other streaming platforms cannot be
downloaded by this app; use the platform's download/export feature and upload
the resulting MP4, WebM, M4A, or MP3 instead.

Server runs at:

```
http://localhost:8787
```

## Firestore data model

- Collection: `drift_notes` (change with `FIRESTORE_NOTES_COLLECTION` env var)
- Document ID: Firebase user UID
- Document fields: full notes payload + `updatedAt` + `userUid`

## Notes

- If Firebase is not configured, `/api/notes` returns `503` with setup guidance.
- Local browser storage still works as fallback when server is unavailable.
- Firestore documents have a 1 MiB size limit; very large embedded drawings may require splitting data across documents if your note payload grows too large.
