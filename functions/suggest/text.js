/**
 * Deterministic text helpers. Anything a parser can decide is decided here,
 * not by a model.
 */

const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/;
const TERMINAL_PUNCT = /[.!?]["')\]]*\s*$/;
const WORD_CHAR = /[\p{L}\p{N}'’-]$/u;

/**
 * Split a reference document into chunks small enough for Jev to judge
 * individually. Paragraph boundaries are respected; long paragraphs are split
 * on sentence boundaries. If there are too many chunks, adjacent ones are
 * merged until the budget fits.
 */
function chunkReference(reference, { maxChars, maxChunks }) {
  const paragraphs = String(reference || "")
      .replace(/\r\n?/g, "\n")
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);

  let chunks = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      chunks.push(paragraph);
      continue;
    }
    let current = "";
    for (const sentence of paragraph.split(SENTENCE_SPLIT)) {
      if (current && current.length + sentence.length + 1 > maxChars) {
        chunks.push(current);
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) chunks.push(current);
  }

  while (chunks.length > maxChunks) {
    const merged = [];
    for (let i = 0; i < chunks.length; i += 2) {
      merged.push(chunks[i + 1] ? `${chunks[i]}\n${chunks[i + 1]}` : chunks[i]);
    }
    chunks = merged;
  }
  return chunks;
}

/**
 * What kind of continuation the end of the draft calls for. This is purely
 * about punctuation and whitespace, so it is decided in code.
 */
function detectScope(draft) {
  if (TERMINAL_PUNCT.test(draft)) return "next_sentence";
  if (WORD_CHAR.test(draft)) return "finish_word";
  return "finish_sentence";
}

function tail(text, maxChars) {
  const value = String(text || "");
  return value.length > maxChars ? value.slice(value.length - maxChars) : value;
}

function lastWords(text, count) {
  return text.trim().split(/\s+/).slice(-count).join(" ").toLowerCase();
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Normalize raw generations so they can be appended verbatim: trim, drop
 * echoes of the draft, cap length, dedupe, and fix the joining whitespace.
 */
function normalizeCandidates(rawCandidates, draft, scope, maxWords) {
  const endsWithSpace = /\s$/.test(draft);
  const echo = lastWords(draft, 3);
  const seen = new Set();
  const out = [];

  for (const raw of rawCandidates) {
    if (typeof raw !== "string") continue;
    let candidate = raw.replace(/\s+/g, " ").trim();
    if (!candidate) continue;

    if (echo && candidate.toLowerCase().startsWith(echo)) {
      candidate = candidate.slice(echo.length).trim();
      if (!candidate) continue;
    }

    const words = candidate.split(" ");
    if (words.length > maxWords) candidate = words.slice(0, maxWords).join(" ");

    const key = candidate.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const needsSpace = !endsWithSpace && scope !== "finish_word";
    out.push(needsSpace ? ` ${candidate}` : candidate);
  }
  return out;
}

module.exports = {
  chunkReference,
  detectScope,
  tail,
  countWords,
  normalizeCandidates,
};
