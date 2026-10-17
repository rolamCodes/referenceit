import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// Single-user prototype: references live under a fixed user document until auth lands.
const USER_ID = "1";

export async function fetchSavedReferences() {
  const snapshot = await getDocs(collection(db, "users", USER_ID, "transcripts"));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      label: data.label || "Untitled",
      text: data.textContent || "",
    };
  });
}
