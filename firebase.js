import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAI, getLiveGenerativeModel, GoogleAIBackend, ResponseModality } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyBCEM_AAmRfCME1zD9PYheXPNFGQCe1nPE",
  authDomain: "referenceit.firebaseapp.com",
  projectId: "referenceit",
  storageBucket: "referenceit.firebasestorage.app",
  messagingSenderId: "1091829551925",
  appId: "1:1091829551925:web:1b870b065f5dde1081327c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
const ai = getAI(app, { backend: new GoogleAIBackend() });
export const model = getLiveGenerativeModel(ai, {
  model: "gemini-2.0-flash-live-001",
  generationConfig: {
    responseModalities: [ResponseModality.TEXT],
  }
});