import { useCallback, useEffect, useRef, useState } from "react";

const WINDOW_SIZE = 24;
const MULTIPLIER = 3;
const MIN_THRESHOLD_MS = 650;
const MAX_THRESHOLD_MS = 2200;
const DEFAULT_THRESHOLD_MS = 1000;
const MIN_SAMPLES = 4;
// Gaps longer than this are pauses, not typing rhythm, so they don't shape the baseline.
const MAX_SAMPLE_MS = 2500;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Detects hesitation from the writer's own typing rhythm. Each keystroke
 * re-arms a timer set to a multiple of the median inter-key interval; if it
 * fires, the writer has paused for noticeably longer than their usual rhythm.
 */
export function useHesitation(onHesitation) {
  const samplesRef = useRef([]);
  const lastKeyAtRef = useRef(null);
  const timerRef = useRef(null);
  const callbackRef = useRef(onHesitation);
  callbackRef.current = onHesitation;

  const [thresholdMs, setThresholdMs] = useState(DEFAULT_THRESHOLD_MS);
  const [armedAt, setArmedAt] = useState(null);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    setArmedAt(null);
  }, []);

  const recordKeystroke = useCallback(() => {
    const now = performance.now();
    if (lastKeyAtRef.current != null) {
      const interval = now - lastKeyAtRef.current;
      if (interval <= MAX_SAMPLE_MS) {
        samplesRef.current.push(interval);
        if (samplesRef.current.length > WINDOW_SIZE) samplesRef.current.shift();
      }
    }
    lastKeyAtRef.current = now;

    const samples = samplesRef.current;
    const base = samples.length >= MIN_SAMPLES ? median(samples) * MULTIPLIER : DEFAULT_THRESHOLD_MS;
    const threshold = Math.round(clamp(base, MIN_THRESHOLD_MS, MAX_THRESHOLD_MS));
    setThresholdMs(threshold);

    clearTimeout(timerRef.current);
    setArmedAt(now);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setArmedAt(null);
      callbackRef.current?.({ thresholdMs: threshold });
    }, threshold);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { recordKeystroke, cancel, thresholdMs, armedAt };
}
