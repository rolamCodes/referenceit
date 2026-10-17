/**
 * Every number the suggestion pipeline reads lives here. Changing policy is a
 * constant edit, not a reworded model question.
 */
module.exports = {
  // How much of the writer's text (from the end) Jev and Gemini see.
  draftTailChars: 700,

  // Reference chunking.
  chunk: {
    maxChars: 480,
    maxChunks: 20,
  },

  // Stage 1 (Jev): gate + chunk relevance.
  gate: {
    writerIsDoneMax: 0.7, // above this the text reads as finished; stay quiet
    chunkRelevantMin: 0.45, // chunks below this are not about the draft
    maxChunksForGeneration: 4,
  },

  // Stage 2 (Gemini): candidate generation.
  generation: {
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    candidates: 3,
    temperature: 0.9,
    maxOutputTokens: 220,
    maxWordsByScope: {
      finish_word: 4,
      finish_sentence: 14,
      next_sentence: 22,
    },
  },

  // Stage 3 (Jev): pick and verify.
  select: {
    weights: { best: 0.5, grounded: 0.3, natural: 0.2 },
    groundedMin: 0.5, // only enforced when reference chunks were used
    naturalMin: 0.4,
    noneMin: 0.6, // if "none" wins with at least this probability, show nothing
  },

  jev: {
    model: process.env.TYPESAFE_MODEL || "jev-latest",
    timeoutMs: 6000,
  },
};
