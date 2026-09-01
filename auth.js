/*
  In-page auth gate for Panne notes.
  Uses Firebase Auth (Google + email/password). The backend uses the
  Firebase ID token for Firestore sync authorization.
*/

const AUTH_TOKEN_KEY = 'drift-auth-token';
const AUTH_USER_KEY = 'drift-auth-username';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyASt9fkEIFe0fJyFV83iA9KJsROXzMsjJQ",
  authDomain: "panne-notes.firebaseapp.com",
  projectId: "panne-notes",
  storageBucket: "panne-notes.firebasestorage.app",
  messagingSenderId: "700399831481",
  appId: "1:700399831481:web:4e0b208b2fdc455d75ce68",
  measurementId: "G-GSHV6S95LJ"
};

const firebaseConfigured = Object.values(FIREBASE_CONFIG).every((value) => value && !value.startsWith('REPLACE_WITH_'));
const firebaseAvailable = Boolean(window.firebase && firebaseConfigured);
let firebaseAuth = null;
let firestoreDb = null;
let googleProvider = null;

if (firebaseAvailable) {
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth = firebase.auth();
  firestoreDb = firebase.firestore();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  // Cloud Firestore keeps queued writes locally, so notes can sync after a
  // connection returns instead of silently losing an offline update.
  firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(() => { /* Another tab or browser policy may own persistence. */ });
  window.firebaseAuth = firebaseAuth;
  window.firestoreDb = firestoreDb;
} else {
  window.firebaseAuth = null;
  window.firestoreDb = null;
}

function saveSession(token, username) {
  localStorage.setItem(AUTH_TOKEN_KEY, token || '');
  localStorage.setItem(AUTH_USER_KEY, username || '');
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function hideAuthGate() {
  document.getElementById('authGate').hidden = true;
}

function showAuthGate() {
  document.getElementById('authGate').hidden = false;
}

function showError(message) {
  const box = document.getElementById('authError');
  box.classList.remove('auth-setup-note');
  box.textContent = message;
  box.hidden = false;
}

function showSetupMessage(message) {
  const box = document.getElementById('authError');
  box.classList.add('auth-setup-note');
  box.textContent = message;
  box.hidden = false;
}

function mapFirebaseError(err) {
  const code = err && err.code;
  if (!code) return 'Authentication failed.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Wrong email or password.';
  }
  if (code === 'auth/email-already-in-use') return 'That email is already in use.';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was canceled.';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
  if (code === 'auth/unauthorized-domain') return 'This site is not authorized in Firebase. Add your current domain under Authentication → Settings → Authorized domains.';
  if (code === 'auth/account-exists-with-different-credential') return 'An account already exists with this email. Sign in using the original method.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a moment.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  return err.message || 'Authentication failed.';
}

function renderGoogleButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!firebaseAvailable) {
    container.hidden = true;
    return;
  }
  container.innerHTML = '<button type="button" class="auth-submit auth-google-btn" id="googleSignInBtn">Continue with Google</button>';
  container.querySelector('#googleSignInBtn').addEventListener('click', async () => {
    document.getElementById('authError').hidden = true;
    try {
      await firebaseAuth.signInWithPopup(googleProvider);
    } catch (err) {
      showError(mapFirebaseError(err));
    }
  });
}

function setupForm(formId, mode) {
  const form = document.getElementById(formId);
  if (!firebaseAvailable) {
    form.hidden = true;
    return;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('authError').hidden = true;

    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email || !password) {
      showError('Email and password are required.');
      return;
    }

    submitBtn.disabled = true;
    try {
      if (mode === 'signup') {
        await firebaseAuth.createUserWithEmailAndPassword(email, password);
      } else {
        await firebaseAuth.signInWithEmailAndPassword(email, password);
      }
    } catch (err) {
      showError(mapFirebaseError(err));
    } finally {
      submitBtn.disabled = false;
    }
  });
}

if (firebaseAvailable) firebaseAuth.onIdTokenChanged(async (user) => {
  if (!user) {
    clearSession();
    showAuthGate();
    window.dispatchEvent(new CustomEvent('drift-auth-changed', { detail: { signedIn: false } }));
    return;
  }

  try {
    const token = await user.getIdToken();
    const username = user.displayName || user.email || user.uid;
    saveSession(token, username);
    hideAuthGate();
    window.dispatchEvent(new CustomEvent('drift-auth-changed', { detail: { signedIn: true, username } }));
  } catch (err) {
    clearSession();
    showError('Could not complete sign-in session. Please try again.');
    showAuthGate();
    window.dispatchEvent(new CustomEvent('drift-auth-changed', { detail: { signedIn: false } }));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  showAuthGate();

  // Plain checkbox toggles which form is visible — no tabs/dynamic copy.
  const toggle = document.getElementById('showRegister');
  toggle.addEventListener('change', () => {
    document.getElementById('loginForm').hidden = toggle.checked;
    document.getElementById('registerForm').hidden = !toggle.checked;
    document.getElementById('authError').hidden = true;
  });

  renderGoogleButton('googleBtn');
  setupForm('loginForm', 'signin');
  setupForm('registerForm', 'signup');

  if (!firebaseAvailable) {
    const toggleLabel = document.querySelector('#showRegister').closest('label');
    if (toggleLabel) toggleLabel.hidden = true;
    showSetupMessage('Offline mode is ready. Add your Firebase web configuration before deploying accounts and cloud sync.');
  }

  document.getElementById('skipAuthLink').addEventListener('click', (e) => {
    e.preventDefault();
    hideAuthGate();
  });
});
