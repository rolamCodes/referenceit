const EMPTY_REASONS = {
  looks_finished: "That reads as finished. Nothing to add.",
  no_candidates: "Nothing worth suggesting here.",
  nothing_fits: "Nothing fit well enough to suggest.",
  failed_verification: "Had ideas, but none held up against the reference.",
};

function describe(status, result) {
  switch (status) {
    case "thinking":
      return "Hesitation detected. Looking for a continuation…";
    case "ready":
      return "Suggestion ready";
    case "empty":
      return EMPTY_REASONS[result?.reason] || "Nothing to suggest right now.";
    case "error":
      return "Couldn't reach the suggestion service.";
    default:
      return "Type. Pause when you're stuck.";
  }
}

export function StatusStrip({ status, result, acceptKey }) {
  return (
    <div className={`status status--${status}`}>
      <span className="status__dot" aria-hidden="true" />
      <span className="status__label">{describe(status, result)}</span>

      {status === "ready" && result?.grounded && <span className="status__tag">from reference</span>}

      <span className="status__spacer" />

      {status === "ready" ? (
        <span className="status__keys">
          <kbd>{acceptKey}</kbd> add
          <span className="status__sep">·</span>
          keep typing to dismiss
        </span>
      ) : (
        status === "thinking" && <span className="status__keys">keep typing to cancel</span>
      )}
    </div>
  );
}
