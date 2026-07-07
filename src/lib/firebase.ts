import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * True only when every required Firebase env var is present. When false the app
 * runs in a graceful "demo" mode: auth and Firestore are disabled and the UI
 * shows a configuration banner instead of crashing on a blank screen.
 */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();
// Always show the account chooser rather than silently reusing a session — and
// keep the popup/redirect flow predictable across browsers.
googleProvider.setCustomParameters({ prompt: "select_account" });

/** Non-null accessors — call only after guarding on `firebaseConfigured`. */
export function requireAuth(): Auth {
  if (!authInstance) throw new Error("Firebase auth is not configured.");
  return authInstance;
}

export function requireDb(): Firestore {
  if (!dbInstance) throw new Error("Firestore is not configured.");
  return dbInstance;
}

export function requireStorage(): FirebaseStorage {
  if (!storageInstance) throw new Error("Firebase Storage is not configured.");
  return storageInstance;
}
