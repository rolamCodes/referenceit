import { useEffect, useRef, useState } from "react"
import { model } from "../firebase"

const App = () => {
  const [geminiOutput, setGeminiOutput] = useState("");
  const sessionRef = useRef();
  const sendMessage = (e) => {
    e.preventDefault();
    const userInput = e.target.userInput.value;
    sessionRef.current.send(userInput);
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
              console.log("Finished ###");
            } else {
              const parts = message.modelTurn?.parts;
              if (parts) {
                setGeminiOutput((prev) => {
                  parts.map((part) => {
                    console.log(part.text);
                    const next = prev + part.text;
                    return next;
                  })
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
  }, []);
  return (
    <div>
      <form onSubmit={(e) => sendMessage(e)}>
        <h1>reference:it</h1>
        <p>Text box</p>
        <textarea
          name="userInput"
          placeholder="Start typing..."
        />
        <button>Submit</button>
      </form>
      <button onClick={() => console.log(geminiOutput)}>Print response</button>
    </div>
  )
}

export default App
