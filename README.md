# reference:it

Hesitation-aware autocomplete. You write in a single box. When you pause for noticeably longer than your own typing rhythm, the app reads that as hesitation, finds a short continuation grounded in your reference material, and shows it inline as ghost text. Press `/` to add it. Keep typing to dismiss it.

## How it works

```
keystrokes ──► hesitation detector (client, timing only)
                     │ pause > 3 × your median inter-key interval
                     ▼
            Cloud Function `suggest`
                     │
     ┌───────────────┼────────────────────────────────────────────┐
     │ 1. Jev        │ is the text finished? reaching for a       │
     │   (TypeSafe)  │ detail? which reference chunks are         │
     │   ~100 ms     │ relevant to the last two sentences?        │
     │               ▼                                            │
     │   code        gate on "finished", pick top chunks          │
     │               ▼                                            │
     │ 2. Gemini     3 short candidate continuations as JSON,     │
     │               grounded on the selected chunks only         │
     │               ▼                                            │
     │   code        normalize: trim echoes, cap length, fix join │
     │               ▼                                            │
     │ 3. Jev        best candidate · fluent join? · grounded in  │
     │   ~100 ms     the reference?                               │
     │               ▼                                            │
     │   code        composite score, thresholds, final answer    │
     └───────────────┼────────────────────────────────────────────┘
                     ▼
            ghost text + "Suggestion ready · / add"
```

Division of labour:

- **Code** owns everything deterministic: timing, chunking, punctuation-based scope (`finish_word` / `finish_sentence` / `next_sentence`), candidate cleanup, thresholds, and the final decision.
- **Jev** (TypeSafe's System One model) makes the fast semantic judgments. It never generates text; it returns typed probabilities that code combines. Every threshold lives in `functions/suggest/config.js`.
- **Gemini** is the only generative step. It gets the end of the draft, the scope, and only the reference chunks Jev judged relevant.

## Project layout

```
src/
  App.jsx                    layout: composer + reference panel
  components/Composer.jsx    input box, ghost text, `/` accept, typing dismisses
  components/StatusStrip.jsx hesitation / ready / nothing-to-add indicator
  components/HesitationMeter.jsx  thin bar that fills toward the hesitation threshold
  components/ReferencePanel.jsx   paste reference text or load a saved one
  hooks/useHesitation.js     median inter-key interval → adaptive pause timer
  hooks/useSuggestion.js     request lifecycle with stale-response protection
  lib/firebase.js            Firebase app, Firestore, Functions (europe-west1)
  lib/suggest.js             callable wrapper
  lib/references.js          saved references from Firestore

functions/
  index.js                   `suggest` callable: validation, secrets, error mapping
  suggest/pipeline.js        orchestration
  suggest/jev.js             the two System One requests
  suggest/gemini.js          candidate generation
  suggest/text.js            chunking, scope detection, normalization
  suggest/config.js          every tunable number
```

## Setup

Requirements: Node 22, Firebase CLI (`npm i -g firebase-tools`), a Firebase project (this repo points at `referenceit`), a [TypeSafe API key](https://console.typesafe.ai), and a Gemini API key.

```sh
npm install
npm --prefix functions install
```

### Secrets

The function reads two secrets. For deployment:

```sh
firebase functions:secrets:set TYPESAFE_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

For the local emulator, create `functions/.secret.local` (git-ignored):

```
TYPESAFE_API_KEY=...
GEMINI_API_KEY=...
```

Optional environment overrides: `GEMINI_MODEL` (default `gemini-2.5-flash`), `TYPESAFE_MODEL` (default `jev-latest`).

### Local development

```sh
cp .env.example .env.local          # points the web app at the emulators
firebase emulators:start            # functions on :5001, firestore on :8080
npm run dev                         # vite on :5173
```

### Deploy

```sh
npm run build
firebase deploy
```

## Interaction model

| State | Indicator | Meaning |
| --- | --- | --- |
| Typing | Thin bar fills toward the threshold | Measuring your rhythm |
| Hesitation detected | Amber pulsing ring and dot, "Looking for a continuation…" | Pipeline running |
| Suggestion ready | Green ring, ghost text after your cursor, `/ add` | Press `/` to append verbatim |
| Nothing to add | Grey, short message, fades out | Text looked finished, or nothing held up against the reference |

Keep typing at any point to dismiss. `Esc` also dismisses. Accepting a suggestion counts as a keystroke, so a second pause can chain another one.

## Tuning

Client-side timing constants are at the top of `src/hooks/useHesitation.js`. Server-side policy (chunk sizes, relevance floor, grounding and fluency minimums, composite weights, candidate counts) is in `functions/suggest/config.js`. Jev's answers are calibrated probabilities, so adjust thresholds by looking at real sessions rather than reworking the questions.
