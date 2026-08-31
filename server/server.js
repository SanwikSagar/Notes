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
const CORS_ORIGINS = new Set((process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean));

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
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(cors({
  origin(origin, callback) {
    // Same-origin browser requests have no Origin header and do not need CORS.
    if (!origin || CORS_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Filename', 'X-Transcription-Language'],
  maxAge: 86400
}));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), geolocation=(), payment=(), usb=()'
  });
  next();
});
app.use(express.json({ limit: '15mb' }));

function createRateLimit({ windowMs, max }) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = clients.get(key);
    const current = !entry || now - entry.startedAt >= windowMs ? { startedAt: now, count: 0 } : entry;
    current.count += 1;
    clients.set(key, current);
    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'RATE_LIMITED', retryAfter });
    }
    // Avoid retaining inactive addresses indefinitely in a long-running process.
    if (clients.size > 2000) {
      for (const [client, value] of clients) if (now - value.startedAt >= windowMs) clients.delete(client);
    }
    return next();
  };
}

const transcriptionRateLimit = createRateLimit({ windowMs: 10 * 60 * 1000, max: 8 });
const captionRateLimit = createRateLimit({ windowMs: 60 * 1000, max: 30 });

function filenameFromHeader(value) {
  try {
    return decodeURIComponent(value || 'lecture-recording.webm').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
  } catch (_) {
    return 'lecture-recording.webm';
  }
}

function youtubeIdFromUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.slice(1).split('/')[0];
    if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      return match ? match[1] : null;
    }
  } catch (_) { /* invalid URL falls through */ }
  return null;
}

// Uploaded recordings are sent straight to the transcription endpoint; no
// media is written to disk and the API key never reaches the browser.
app.post('/api/transcribe', transcriptionRateLimit, express.raw({ type: '*/*', limit: '26mb' }), async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'TRANSCRIPTION_NOT_CONFIGURED' });
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'EMPTY_MEDIA_FILE' });
  if (req.body.length > 25 * 1024 * 1024) return res.status(413).json({ error: 'MEDIA_FILE_TOO_LARGE' });

  try {
    const form = new FormData();
    form.append('file', new Blob([req.body], { type: req.get('content-type') || 'application/octet-stream' }), filenameFromHeader(req.get('x-filename')));
    form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe');
    const language = (req.get('x-transcription-language') || '').trim();
    if (/^[a-z]{2,3}$/i.test(language)) form.append('language', language);
    form.append('prompt', 'This is a lecture. Preserve technical terms, names, formulas, and spoken section headings accurately.');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Transcription request failed:', response.status, payload.error && payload.error.message);
      return res.status(502).json({ error: 'TRANSCRIPTION_FAILED' });
    }
    return res.json({ text: payload.text || '' });
  } catch (err) {
    console.error('Transcription request failed:', err.message);
    return res.status(502).json({ error: 'TRANSCRIPTION_FAILED' });
  }
});

// For public YouTube lectures, captions are much faster and preserve the
// original timing/wording. The library only reads captions already exposed by
// YouTube; it never downloads or bypasses access restrictions on video media.
app.post('/api/online-video-transcript', captionRateLimit, async (req, res) => {
  const videoId = youtubeIdFromUrl(req.body && req.body.url);
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return res.status(400).json({ error: 'UNSUPPORTED_VIDEO_HOST' });
  try {
    const { fetchTranscript } = require('youtube-transcript');
    if (typeof fetchTranscript !== 'function') {
      console.error('youtube-transcript is installed but does not expose fetchTranscript. Run npm install in the server folder.');
      return res.status(503).json({ error: 'CAPTION_SERVICE_UNAVAILABLE' });
    }
    // Do not force the browser language here: a lecture may only expose captions
    // in its original language, and the package can choose the available track.
    const transcript = await fetchTranscript(videoId);
    const text = transcript.map((part) => part.text || '').filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!text) return res.status(404).json({ error: 'NO_CAPTIONS_FOUND' });
    return res.json({ title: `YouTube lecture ${videoId}`, text });
  } catch (err) {
    console.warn('YouTube caption retrieval failed:', err.message);
    const knownCaptionFailure = /transcript|caption|subtitle|video unavailable|private|not found/i.test(err.message || '');
    return res.status(knownCaptionFailure ? 404 : 502).json({
      error: knownCaptionFailure ? 'NO_CAPTIONS_FOUND' : 'CAPTION_SERVICE_UNAVAILABLE'
    });
  }
});

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
app.use(express.static(APP_ROOT, {
  maxAge: '1d',
  setHeaders(res, filePath) {
    // HTML must always revalidate so feature and security updates reach users.
    if (filePath.endsWith('.html')) res.set('Cache-Control', 'no-cache');
  }
}));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'REQUEST_TOO_LARGE' });
  if (err && err.message === 'Origin is not allowed by CORS.') return res.status(403).json({ error: 'CORS_ORIGIN_NOT_ALLOWED' });
  console.error('Unhandled server error:', err && err.message);
  return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

app.listen(PORT, () => {
  console.log(`Drift notes server running at http://localhost:${PORT}`);
  if (!firebaseReady) {
    console.log('Firebase is not configured yet. See server/README.md for setup steps.');
  }
});
