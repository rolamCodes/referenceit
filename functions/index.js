const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { runSuggestPipeline } = require("./suggest/pipeline");

const TYPESAFE_API_KEY = defineSecret("TYPESAFE_API_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const MAX_TEXT_CHARS = 20_000;
const MAX_REFERENCE_CHARS = 60_000;

setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

exports.suggest = onCall(
    {
      secrets: [TYPESAFE_API_KEY, GEMINI_API_KEY],
      timeoutSeconds: 30,
      memory: "256MiB",
    },
    async (request) => {
      const { text, reference } = request.data ?? {};

      if (typeof text !== "string" || !text.trim()) {
        throw new HttpsError("invalid-argument", "`text` must be a non-empty string.");
      }
      if (text.length > MAX_TEXT_CHARS) {
        throw new HttpsError("invalid-argument", `\`text\` exceeds ${MAX_TEXT_CHARS} characters.`);
      }
      if (reference != null && typeof reference !== "string") {
        throw new HttpsError("invalid-argument", "`reference` must be a string when provided.");
      }
      if (reference && reference.length > MAX_REFERENCE_CHARS) {
        throw new HttpsError(
            "invalid-argument",
            `\`reference\` exceeds ${MAX_REFERENCE_CHARS} characters.`,
        );
      }

      try {
        return await runSuggestPipeline({
          text,
          reference: reference ?? "",
          typesafeApiKey: TYPESAFE_API_KEY.value(),
          geminiApiKey: GEMINI_API_KEY.value(),
          logger,
        });
      } catch (error) {
        logger.error("suggest pipeline failed", { message: error?.message, name: error?.name });
        throw new HttpsError("internal", "Suggestion pipeline failed.");
      }
    },
);
