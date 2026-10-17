/**
 * A thin bar under the composer. While the writer types it quietly fills
 * toward the hesitation threshold; once hesitation is detected it holds full
 * and changes colour with the suggestion status.
 */
export function HesitationMeter({ status, thresholdMs, armedAt }) {
  const armed = armedAt != null && status === "idle";
  return (
    <div className={`meter meter--${status} ${armed ? "meter--armed" : ""}`} aria-hidden="true">
      <div
        key={armed ? armedAt : status}
        className="meter__fill"
        style={armed ? { animationDuration: `${thresholdMs}ms` } : undefined}
      />
    </div>
  );
}
