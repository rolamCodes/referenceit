import { useState, useRef, useEffect } from "react";
import { model, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const SLIDING_WINDOW_SIZE = 30;
const LIKELY_PAUSE_MULTIPLIER = 1.9;
const PAUSE_MULTIPLIER = 3;

const updateIkiHistory = (iki, currentHistory) => {
  const newHistory = [...currentHistory, iki];
  if (newHistory.length > SLIDING_WINDOW_SIZE) newHistory.shift();
  return newHistory;
};

const calculateMiki = (ikiHistory) => {
  if (ikiHistory.length === 0) return 0;
  const sum = ikiHistory.reduce((a, b) => a + b, 0);
  return sum / ikiHistory.length;
};

const handleKeyPress = (timestamp, lastTimestamp, ikiHistory) => {
  if (lastTimestamp === null) return { newIkiHistory: ikiHistory, newMiki: calculateMiki(ikiHistory) };
  const iki = timestamp - lastTimestamp;
  const newIkiHistory = updateIkiHistory(iki, ikiHistory);
  const newMiki = calculateMiki(newIkiHistory);
  return { newIkiHistory, newMiki };
};

const App = () => {
  const [geminiOutput, setGeminiOutput] = useState("");
  const [transcripts, setTranscripts] = useState([]);

  const [ikiHistory, setIkiHistory] = useState([]);
  const [miki, setMiki] = useState(0);
  const [pauseStatus, setPauseStatus] = useState("no_pause");

  const sessionRef = useRef();
  const textBoxRef = useRef();
  const lastTimestampRef = useRef(null);
  const likelyTimerRef = useRef(null);
  const trueTimerRef = useRef(null);

  const sendMessageToLLM = () => {
    const userInput = textBoxRef.current.value;
    if (userInput.trim() && sessionRef.current) {
      sessionRef.current.send(`TEXT TO AUTOCOMPLETE: ${userInput}`);
      setPauseStatus('sent_likely_pause');
    }
  };

  const injectLLMResponse = () => {
    handleInjectSuggestion();
    setPauseStatus('injected_true_pause');
  };

  const handleKeyDown = () => {
    const now = Date.now();
    const { newIkiHistory, newMiki } = handleKeyPress(now, lastTimestampRef.current, ikiHistory);

    lastTimestampRef.current = now;
    setIkiHistory(newIkiHistory);
    setMiki(newMiki);

    if (likelyTimerRef.current) clearTimeout(likelyTimerRef.current);
    if (trueTimerRef.current) clearTimeout(trueTimerRef.current);

    const likelyThreshold = newMiki * LIKELY_PAUSE_MULTIPLIER;
    const trueThreshold = newMiki * PAUSE_MULTIPLIER;

    likelyTimerRef.current = setTimeout(sendMessageToLLM, likelyThreshold);
    trueTimerRef.current = setTimeout(injectLLMResponse, trueThreshold);
  };

  const handleSelectTranscript = (transcript) => {
    const text = transcript.data.textContent;
    sessionRef.current.send(
      `INSTRUCTIONS: You are an autocomplete machine. You're given context and some text. You return the next few words based on the context, nothing else.
      DO NOT: Include the given text in your completion.
      CONTEXT: ${text}`, false);
  };

  const handleInjectSuggestion = () => {
    const prev = textBoxRef.current.value;
    textBoxRef.current.value = prev + geminiOutput;
    setGeminiOutput('');
  };

  useEffect(() => {
    const initGeminiLive = async () => {
      const session = await model.connect();
      sessionRef.current = session;
      const messages = session.receive();
      for await (const message of messages) {
        if (message.type === "serverContent" && !message.turnComplete) {
          const parts = message.modelTurn?.parts;
          if (parts) {
            setGeminiOutput((prev) => {
              let next;
              parts.map((part) => { next = prev + part.text; });
              return next;
            });
          }
        }
      }
    };

    const fetchTranscripts = async () => {
      const colRef = collection(db, 'users', '1', 'transcripts');
      const colSnap = await getDocs(colRef);
      const newTranscripts = [];
      colSnap.forEach((doc) => newTranscripts.push({ id: doc.id, data: doc.data() }));
      setTranscripts(newTranscripts);
    };

    initGeminiLive();
    fetchTranscripts();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={(e) => e.preventDefault()}>
        <h1>reference:it</h1>
        <p>Transcripts</p>
        <ul>
          {transcripts.map((transcript) => (
            <li key={transcript.id} style={{ cursor: "pointer" }} onClick={() => handleSelectTranscript(transcript)}>
              {transcript.data.label}
            </li>
          ))}
        </ul>
        <textarea
          ref={textBoxRef}
          name="userInput"
          placeholder="Start typing..."
          onKeyDown={handleKeyDown}
        />
      </form>
      <p>Average interval (miki): {miki.toFixed(2)} ms</p>
      <p>Pause status: {pauseStatus}</p>
    </div>
  );
};

export default App;