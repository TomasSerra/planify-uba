import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

if (!apiKey || !authDomain || !projectId) {
  throw new Error(
    "Faltan VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN o VITE_FIREBASE_PROJECT_ID"
  );
}

const app = initializeApp({ apiKey, authDomain, projectId });

export const auth = getAuth(app);
auth.useDeviceLanguage();

export const googleProvider = new GoogleAuthProvider();
