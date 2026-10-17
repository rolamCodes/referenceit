/**
 * The two System One (Jev) requests in the pipeline. Jev returns typed
 * judgments and probabilities; every threshold and combination is applied by
 * the caller in code.
 */
const { TypeSafeClient, noul, choice } = require("@typesafe-ai/sdk");

function createJevClient(apiKey, { model, timeoutMs }) {
  return new TypeSafeClient({ apiKey, defaultModel: model, timeout: timeoutMs });
}

/**
 * Stage 1: decide whether a suggestion is worth making and which reference
 * chunks are relevant to what the writer is working on right now.
 */
async function gateAndFilter(client, { draft, chunks }) {
  const questions = {
    writer_is_done: noul(
        {
          question: "Does `draft` read as a finished piece of text that the writer would not add anything to?",
          inspect: "`draft`, especially its last sentence",
          focus: "Judge only whether the text has reached a natural end, not its quality.",
        },
        {
          true: {
            what: "The text ends with a closing remark, sign-off, or complete final statement",
            examples: ["Thanks again, and talk soon. Best, Maria", "That concludes the summary."],
          },
          false: {
            what: "The text stops mid-sentence, mid-list, mid-argument, or right after introducing a point",
            examples: ["The main reason for this is", "We decided to go with the second option because it"],
          },
        },
    ),
    seeking_detail: noul(
        {
          question: "Does the end of `draft` set up a specific fact, name, number, date, quote, or detail that has not yet been written?",
          inspect: "the last sentence of `draft`",
          focus: "Look for a sentence that leads into a concrete piece of information without supplying it.",
        },
        {
          true: {
            what: "The sentence is heading toward a concrete detail that is still missing",
            examples: ["According to the report, revenue grew by", "The project lead, whose name is"],
          },
          false: {
            what: "The sentence is complete, or what comes next is general and does not depend on a specific detail",
            examples: ["I hope you are doing well.", "Let me know what you think"],
          },
        },
    ),
  };

  chunks.forEach((_, i) => {
    questions[`chunk_${i}_relevant`] = noul(
        {
          question: `Does \`reference_chunks[${i}]\` contain information about the subject the last two sentences of \`draft\` are discussing?`,
          focus: "Judge topical overlap with the end of the draft only, not with the whole draft.",
        },
        {
          true: "The chunk talks about the same subject, entity, event, or claim as the end of the draft",
          false: "The chunk is about a different subject, or only shares generic words",
        },
    );
  });

  const { answers, usage } = await client.systemOne({
    state: { draft, reference_chunks: chunks },
    questions,
  });

  const relevance = chunks.map((text, i) => ({
    index: i,
    text,
    probability: answers[`chunk_${i}_relevant`].noul,
  }));

  return {
    writerIsDone: answers.writer_is_done.noul,
    seekingDetail: answers.seeking_detail.noul,
    relevance,
    usage,
  };
}

/**
 * Stage 3: choose the best candidate continuation and verify it against the
 * reference and the draft.
 */
async function selectCandidate(client, { draft, chunks, candidates }) {
  const options = {};
  candidates.forEach((_, i) => {
    options[`candidate_${i}`] = `The text in \`candidates[${i}]\``;
  });
  options.none = "Every candidate would read as wrong, off-topic, or out of place after `draft`";

  const questions = {
    best: choice(
        {
          question: "Which candidate is the most natural text to appear immediately after the end of `draft`?",
          focus: "Prefer the candidate that continues the writer's current sentence or point in the same voice.",
        },
        options,
    ),
  };

  candidates.forEach((_, i) => {
    questions[`natural_${i}`] = noul(
        {
          question: `Does \`draft\` followed immediately by \`candidates[${i}]\` read as fluent text written by one person?`,
          focus: "Check the join: no repeated words, no missing words, consistent tense and person.",
        },
        {
          true: "The join is seamless and the register matches the draft",
          false: "The join repeats or drops words, changes tense or person, or shifts tone",
        },
    );
    if (chunks.length > 0) {
      questions[`grounded_${i}`] = noul(
          {
            question: `Is every specific fact, name, number, date, or claim in \`candidates[${i}]\` stated in or directly implied by \`reference\`?`,
            focus: "Only specific, checkable content counts. Generic phrasing with no facts is grounded.",
          },
          {
            true: "All specific content appears in the reference, or the candidate contains no specific content",
            false: "The candidate introduces a fact, name, number, or claim that the reference does not support",
          },
      );
    }
  });

  const { answers, usage } = await client.systemOne({
    state: { draft, reference: chunks, candidates },
    questions,
  });

  const scored = candidates.map((text, i) => ({
    index: i,
    text,
    bestProbability: answers.best.probabilities[`candidate_${i}`] ?? 0,
    natural: answers[`natural_${i}`].noul,
    grounded: chunks.length > 0 ? answers[`grounded_${i}`].noul : null,
  }));

  return {
    choice: answers.best.choice,
    confidence: answers.best.confidence,
    noneProbability: answers.best.probabilities.none ?? 0,
    scored,
    usage,
  };
}

module.exports = { createJevClient, gateAndFilter, selectCandidate };
