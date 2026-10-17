import { useCallback, useEffect, useRef, useState } from "react";
import { requestSuggestion } from "../lib/suggest";

const TRANSIENT_STATUS_MS = 2000;

/**
 * Owns the suggestion lifecycle: idle -> thinking -> ready | empty | error.
 * Any dismissal bumps the request id so late responses are ignored.
 */
export function useSuggestion() {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const requestIdRef = useRef(0);
  const resetTimerRef = useRef(null);

  const settleBackToIdle = useCallback((id) => {
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      if (id !== requestIdRef.current) return;
      setStatus("idle");
      setResult(null);
    }, TRANSIENT_STATUS_MS);
  }, []);

  const dismiss = useCallback(() => {
    requestIdRef.current += 1;
    clearTimeout(resetTimerRef.current);
    setStatus("idle");
    setResult(null);
  }, []);

  const request = useCallback(
    async ({ text, reference }) => {
      const id = ++requestIdRef.current;
      clearTimeout(resetTimerRef.current);
      setStatus("thinking");
      setResult(null);

      try {
        const data = await requestSuggestion({ text, reference });
        if (id !== requestIdRef.current) return;
        setResult(data);
        if (data?.suggestion) {
          setStatus("ready");
        } else {
          setStatus("empty");
          settleBackToIdle(id);
        }
      } catch (error) {
        if (id !== requestIdRef.current) return;
        setResult({ error: error?.message || "Request failed" });
        setStatus("error");
        settleBackToIdle(id);
      }
    },
    [settleBackToIdle],
  );

  const consume = useCallback(() => {
    const suggestion = result?.suggestion ?? null;
    dismiss();
    return suggestion;
  }, [result, dismiss]);

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  return { status, result, request, dismiss, consume };
}
