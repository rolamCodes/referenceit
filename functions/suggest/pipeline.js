/**
 * Orchestrates one suggestion request:
 *
 *   code      -> trim draft, chunk reference, detect scope
 *   Jev  (1)  -> is the writer done? reaching for a detail? which chunks matter?
 *   code      -> gate, pick chunks
 *   Gemini    -> N candidate continuations
 *   code      -> normalize candidates
 *   Jev  (2)  -> best candidate, fluency of the join, grounding in the reference
 *   code      -> composite score, thresholds, final answer
 */
const config = require("./config");
const { chunkReference, detectScope, tail, normalizeCandidates } = require("./text");
const { createJevClient, gateAndFilter, selectCandidate } = require("./jev");
const { createGeminiClient, generateCandidates } = require("./gemini");

function noSuggestion(reason, extra = {}) {
  return { suggestion: null, reason, ...extra };
}

async function runSuggestPipeline({ text, reference, typesafeApiKey, geminiApiKey, logger }) {
  const startedAt = Date.now();
  const draft = tail(text, config.draftTailChars);
  const scope = detectScope(draft);
  const chunks = chunkReference(reference, config.chunk);

  const jev = createJevClient(typesafeApiKey, config.jev);

  // Stage 1: gate and filter.
  const gate = await gateAndFilter(jev, { draft, chunks });
  const gateMs = Date.now() - startedAt;

  if (gate.writerIsDone > config.gate.writerIsDoneMax) {
    return noSuggestion("looks_finished", { scope, timings: { gateMs } });
  }

  const selectedChunks = gate.relevance
      .filter((c) => c.probability >= config.gate.chunkRelevantMin)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, config.gate.maxChunksForGeneration)
      .map((c) => c.text);

  // Stage 2: generate.
  const gemini = createGeminiClient(geminiApiKey);
  const t2 = Date.now();
  const raw = await generateCandidates(gemini, {
    draft,
    scope,
    chunks: selectedChunks,
    config: config.generation,
  });
  const generateMs = Date.now() - t2;

  const candidates = normalizeCandidates(
      raw,
      draft,
      scope,
      config.generation.maxWordsByScope[scope],
  );
  if (candidates.length === 0) {
    return noSuggestion("no_candidates", { scope, timings: { gateMs, generateMs } });
  }

  // Stage 3: select and verify.
  const t3 = Date.now();
  const selection = await selectCandidate(jev, { draft, chunks: selectedChunks, candidates });
  const selectMs = Date.now() - t3;

  if (selection.choice === "none" && selection.noneProbability >= config.select.noneMin) {
    return noSuggestion("nothing_fits", { scope, timings: { gateMs, generateMs, selectMs } });
  }

  const { weights } = config.select;
  const grounded = selectedChunks.length > 0;
  const ranked = selection.scored
      .filter((c) => c.natural >= config.select.naturalMin)
      .filter((c) => !grounded || c.grounded >= config.select.groundedMin)
      .map((c) => ({
        ...c,
        score:
          weights.best * c.bestProbability +
          weights.natural * c.natural +
          weights.grounded * (grounded ? c.grounded : c.natural),
      }))
      .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return noSuggestion("failed_verification", {
      scope,
      timings: { gateMs, generateMs, selectMs },
    });
  }

  const winner = ranked[0];
  const result = {
    suggestion: winner.text,
    scope,
    grounded,
    seekingDetail: gate.seekingDetail,
    confidence: Number(winner.score.toFixed(3)),
    timings: { gateMs, generateMs, selectMs, totalMs: Date.now() - startedAt },
    usage: {
      jevInputTokens: (gate.usage?.input_tokens ?? 0) + (selection.usage?.input_tokens ?? 0),
    },
  };

  if (logger) {
    logger.info("suggestion", {
      scope,
      grounded,
      chunksTotal: chunks.length,
      chunksUsed: selectedChunks.length,
      candidates: candidates.length,
      winner: winner.text,
      timings: result.timings,
    });
  }
  return result;
}

module.exports = { runSuggestPipeline };
