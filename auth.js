/*
  In-page auth gate for Drift notes.
  Uses Firebase Auth (Google + email/password). The backend uses the
  Firebase ID token for Firestore sync authorization.
*/

const AUTH_TOKEN_KEY = 'drift-auth-token';
const AUTH_USER_KEY = 'drift-auth-username';

const FIREBASE_CONFIG = {
  apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  appId: 'REPLACE_WITH_FIREBASE_APP_ID'
};

if (!window.firebase) {
  throw new Error('Firebase SDK did not load. Check index.html script tags.');
}

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const firebaseAuth = firebase.auth();
const firestoreDb = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();
window.firebaseAuth = firebaseAuth;
window.firestoreDb = firestoreDb;

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
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a moment.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  return err.message || 'Authentication failed.';
}

function renderGoogleButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
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

firebaseAuth.onIdTokenChanged(async (user) => {
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

  document.getElementById('skipAuthLink').addEventListener('click', (e) => {
    e.preventDefault();
    hideAuthGate();
  });
});
