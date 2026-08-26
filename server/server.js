/*
  Drift notes — Firebase sync server.
  - Auth: Firebase Authentication ID tokens (Google + email/password from frontend)
  - Database: Cloud Firestore (one document per user)
*/

const path = require('path');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const PORT = process.env.PORT || 8787;
const NOTES_COLLECTION = process.env.FIRESTORE_NOTES_COLLECTION || 'drift_notes';

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    const serviceAccount = JSON.parse(rawJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return;
  }

  // Falls back to GOOGLE_APPLICATION_CREDENTIALS or platform default credentials.
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

let firebaseReady = true;
try {
  initFirebaseAdmin();
} catch (err) {
  firebaseReady = false;
  console.error('Firebase Admin initialization failed:', err.message);
}

function requireFirebaseReady(req, res, next) {
  if (!firebaseReady) {
    return res.status(503).json({
      error: 'Firebase is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
    });
  }
  next();
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Not signed in.' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired auth token.' });
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, firebaseReady });
});

app.post('/api/signup', (req, res) => {
  res.status(410).json({ error: 'Use Firebase Auth from the client for sign-up.' });
});

app.post('/api/login', (req, res) => {
  res.status(410).json({ error: 'Use Firebase Auth from the client for login.' });
});

app.post('/api/google-auth', (req, res) => {
  res.status(410).json({ error: 'Use Firebase Google sign-in from the client.' });
});

app.post('/api/logout', requireFirebaseReady, requireAuth, (req, res) => {
  res.json({ ok: true });
});

app.get('/api/notes', requireFirebaseReady, requireAuth, async (req, res) => {
  const docRef = admin.firestore().collection(NOTES_COLLECTION).doc(req.user.uid);
  const snapshot = await docRef.get();
  if (!snapshot.exists) return res.json({ notebooks: {} });
  return res.json(snapshot.data());
});

app.put('/api/notes', requireFirebaseReady, requireAuth, async (req, res) => {
  const payload = req.body || {};
  const docRef = admin.firestore().collection(NOTES_COLLECTION).doc(req.user.uid);
  await docRef.set({
    ...payload,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    userUid: req.user.uid
  }, { merge: true });
  res.json({ ok: true, savedAt: new Date().toISOString() });
});

// Serve the app itself (index.html, app.js, styles.css) from this same server.
const APP_ROOT = path.join(__dirname, '..');
app.use((req, res, next) => {
  if (req.path.startsWith('/server')) return res.status(404).end();
  next();
});
app.use(express.static(APP_ROOT));

app.listen(PORT, () => {
  console.log(`Drift notes server running at http://localhost:${PORT}`);
  if (!firebaseReady) {
    console.log('Firebase is not configured yet. See server/README.md for setup steps.');
  }
});
