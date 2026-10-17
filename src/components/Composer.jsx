import { useCallback, useRef } from "react";
import { useHesitation } from "../hooks/useHesitation";
import { useSuggestion } from "../hooks/useSuggestion";
import { HesitationMeter } from "./HesitationMeter";
import { StatusStrip } from "./StatusStrip";

const MIN_CHARS_FOR_SUGGESTION = 12;
const ACCEPT_KEY = "/";

const isTypingKey = (event) =>
  !event.ctrlKey &&
  !event.metaKey &&
  (event.key.length === 1 || ["Backspace", "Delete", "Enter"].includes(event.key));

export function Composer({ text, onTextChange, reference }) {
  const textareaRef = useRef(null);
  const { status, result, request, dismiss, consume } = useSuggestion();

  const { recordKeystroke, cancel, thresholdMs, armedAt } = useHesitation(() => {
    const current = textareaRef.current?.value ?? "";
    if (current.trim().length < MIN_CHARS_FOR_SUGGESTION) return;
    request({ text: current, reference });
  });

  const acceptSuggestion = useCallback(() => {
    const suggestion = consume();
    if (!suggestion) return;
    const next = text + suggestion;
    onTextChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.length, next.length);
    });
    // Accepting counts as a keystroke so a follow-up pause can chain another suggestion.
    recordKeystroke();
  }, [consume, text, onTextChange, recordKeystroke]);

  const handleKeyDown = (event) => {
    if (event.key === ACCEPT_KEY && status === "ready" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      acceptSuggestion();
      return;
    }
    if (event.key === "Escape" && status !== "idle") {
      event.preventDefault();
      dismiss();
      cancel();
      return;
    }
    if (isTypingKey(event)) {
      if (status !== "idle") dismiss();
      recordKeystroke();
    }
  };

  const handleChange = (event) => {
    const next = event.target.value;
    onTextChange(next);
    if (!next.trim()) {
      dismiss();
      cancel();
    }
  };

  const handlePaste = () => {
    if (status !== "idle") dismiss();
    recordKeystroke();
  };

  const ghost = status === "ready" ? result?.suggestion : null;

  return (
    <section className={`composer composer--${status}`} aria-live="polite">
      <div className="composer__field">
        <div className="composer__mirror" aria-hidden="true">
          <span className="composer__typed">{text}</span>
          {ghost && <span className="composer__ghost">{ghost}</span>}
          {"\u200b"}
        </div>
        <textarea
          ref={textareaRef}
          className="composer__input"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Start writing. Pause when you're reaching for something."
          spellCheck
          autoFocus
          rows={1}
          aria-label="Your text"
        />
      </div>
      <HesitationMeter status={status} thresholdMs={thresholdMs} armedAt={armedAt} />
      <StatusStrip status={status} result={result} acceptKey={ACCEPT_KEY} />
    </section>
  );
}
