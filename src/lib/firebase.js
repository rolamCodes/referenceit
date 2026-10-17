import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBCEM_AAmRfCME1zD9PYheXPNFGQCe1nPE",
  authDomain: "referenceit.firebaseapp.com",
  projectId: "referenceit",
  storageBucket: "referenceit.firebasestorage.app",
  messagingSenderId: "1091829551925",
  appId: "1:1091829551925:web:1b870b065f5dde1081327c",
};

export const FUNCTIONS_REGION = "europe-west1";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
