import { useEffect, useState } from "react";
import { fetchSavedReferences } from "../lib/references";

const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function ReferencePanel({ open, onClose, reference, onReferenceChange }) {
  const [saved, setSaved] = useState([]);
  const [savedState, setSavedState] = useState("loading");
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!open || savedState !== "loading") return;
    let cancelled = false;
    fetchSavedReferences()
      .then((items) => {
        if (cancelled) return;
        setSaved(items);
        setSavedState("loaded");
      })
      .catch(() => {
        if (!cancelled) setSavedState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [open, savedState]);

  const load = (item) => {
    setActiveId(item.id);
    onReferenceChange(item.text);
  };

  const handleChange = (event) => {
    setActiveId(null);
    onReferenceChange(event.target.value);
  };

  return (
    <aside className={`panel ${open ? "panel--open" : ""}`} aria-hidden={!open}>
      <header className="panel__header">
        <div>
          <h2 className="panel__title">Reference</h2>
          <p className="panel__hint">
            Source material the suggestions are grounded in. Paste anything: notes, a transcript, a brief.
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close reference panel">
          ×
        </button>
      </header>

      <textarea
        className="panel__text"
        value={reference}
        onChange={handleChange}
        placeholder="Paste reference text here…"
        spellCheck={false}
      />

      <div className="panel__meta">
        <span>{formatCount(reference.length)} chars</span>
        {reference && (
          <button type="button" className="link-button" onClick={() => onReferenceChange("")}>
            Clear
          </button>
        )}
      </div>

      <section className="panel__saved">
        <h3 className="panel__subtitle">Saved</h3>
        {savedState === "loading" && <p className="panel__muted">Loading…</p>}
        {savedState === "unavailable" && <p className="panel__muted">Saved references are unavailable.</p>}
        {savedState === "loaded" && saved.length === 0 && <p className="panel__muted">No saved references yet.</p>}
        {saved.length > 0 && (
          <ul className="panel__list">
            {saved.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`panel__item ${activeId === item.id ? "panel__item--active" : ""}`}
                  onClick={() => load(item)}
                >
                  <span className="panel__item-label">{item.label}</span>
                  <span className="panel__item-count">{formatCount(item.text.length)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
