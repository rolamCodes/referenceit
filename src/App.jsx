import { useState } from "react";
import { Composer } from "./components/Composer";
import { ReferencePanel } from "./components/ReferencePanel";

const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export default function App() {
  const [text, setText] = useState("");
  const [reference, setReference] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className={`app ${panelOpen ? "app--panel-open" : ""}`}>
      <header className="topbar">
        <div className="brand">
          reference<span className="brand__colon">:</span>it
        </div>
        <button
          type="button"
          className={`chip ${reference ? "chip--active" : ""}`}
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
        >
          <span className="chip__dot" aria-hidden="true" />
          {reference ? `Reference · ${formatCount(reference.length)} chars` : "Add reference"}
        </button>
      </header>

      <main className="stage">
        <Composer text={text} onTextChange={setText} reference={reference} />
        <p className="hints">
          <kbd>/</kbd> add suggestion
          <span className="hints__sep">·</span>
          keep typing to dismiss
          <span className="hints__sep">·</span>
          <kbd>Esc</kbd> dismiss
        </p>
      </main>

      <ReferencePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        reference={reference}
        onReferenceChange={setReference}
      />
    </div>
  );
}
