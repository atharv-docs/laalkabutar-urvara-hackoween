/**
 * Single Firebase initialisation point. When the public config is missing the
 * app runs in labelled demo-data mode instead of failing.
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/** These values identify the Firebase project; they are safe in client code. Security comes from Auth + Firestore rules. */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const DATA_MODE_OVERRIDE = process.env.NEXT_PUBLIC_URVARA_DATA_MODE;

export function isFirebaseConfigured(): boolean {
  if (DATA_MODE_OVERRIDE === "demo") return false;
  return Boolean(config.apiKey && config.projectId && config.appId && config.authDomain);
}

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function getFirebase() {
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured; running in demo-data mode.");
  if (!cached) {
    const app = getApps()[0] ?? initializeApp(config);
    cached = { app, auth: getAuth(app), db: getFirestore(app) };
  }
  return cached;
}

/** Email used for Firebase Auth accounts derived from an Urvara login ID. */
export function loginIdToEmail(loginId: string): string {
  return `${loginId.trim().toLowerCase()}@users.urvara.app`;
}
