import { useEffect, useRef, useState } from "react";
import { model, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const App = () => {
  const [geminiOutput, setGeminiOutput] = useState("");
  const [transcripts, setTranscripts] = useState([]);
  const sessionRef = useRef();
  const textBoxRef = useRef();

  const sendMessage = (e) => {
    e.preventDefault();
    const userInput = e.target.userInput.value;
    sessionRef.current.send(`TEXT TO AUTOCOMPLETE: ${userInput}`);
  }

  const handleSelectTranscript = (transcript) => {
    const text = transcript.data.textContent;
    sessionRef.current.send(
      `INSTRUCTIONS: You are an autocomplete machine. You're given context and some text. You return the next few words based on the context, nothing else.
      DO NOT: Include the given text in your completion.
      CONTEXT: ${text}`, false);
  }

  const handleInjectSuggestion = () => {
    const prev = textBoxRef.current.value;
    const next = prev + geminiOutput;
    textBoxRef.current.value = next;
    setGeminiOutput('');
  }

  useEffect(() => {
    const initGeminiLive = async () => {
      const session = await model.connect();
      sessionRef.current = session;
      const messages = session.receive();
      for await (const message of messages) {
        switch (message.type) {
          case "serverContent":
            if (message.turnComplete) {
              // completion done
            } else {
              const parts = message.modelTurn?.parts;
              if (parts) {
                setGeminiOutput((prev) => {
                  let next;
                  parts.map((part) => {
                    console.log(part.text);
                    next = prev + part.text;
                  });
                  return next;
                })
              }
            }
            break;
          case "toolCall":
          // Ignore
          case "toolCallCancellation":
          // Ignore
        }
      }
    }
    initGeminiLive();

    const fetchTranscripts = async () => {
      const colRef = collection(db, 'users', '1', 'transcripts');
      const colSnap = await getDocs(colRef);
      const newTranscripts = [];
      colSnap.forEach((doc) => {
        newTranscripts.push({
          id: doc.id,
          data: doc.data()
        });
      });
      setTranscripts(newTranscripts)
    }
    fetchTranscripts();
  }, []);

  return (
    <div>
      <form onSubmit={(e) => sendMessage(e)}>
        <h1>reference:it</h1>
        <p>Transcripts</p>
        <ul>
          {transcripts.map((transcript) => {
            return (
              <li
                key={transcript.id}
                style={{ cursor: "pointer" }}
                onClick={() => (handleSelectTranscript(transcript))}
              >
                {transcript.data.label}
              </li>
            )
          })}
        </ul>
        <textarea
          ref={textBoxRef}
          name="userInput"
          placeholder="Start typing..."
        />
        <button>Possible Pause</button>
      </form>
      <button onClick={() => handleInjectSuggestion()}>True Pause</button>
    </div>
  )
}

export default App
