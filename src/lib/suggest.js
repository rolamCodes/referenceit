import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const suggestCallable = httpsCallable(functions, "suggest", { timeout: 20_000 });

/**
 * Ask the backend for a continuation of `text`, grounded on `reference`.
 * Resolves to `{ suggestion: string | null, reason?, scope, grounded, confidence, timings }`.
 */
export async function requestSuggestion({ text, reference }) {
  const { data } = await suggestCallable({ text, reference: reference || "" });
  return data;
}
