const { createCustomerBrainService } = require("./customer-brain-service");
const { createDeterministicAnswerService } = require("./deterministic-answer-service");
const { createChallenge3LiveStore } = require("./live-store/challenge3-live-store");

// Gate 0: input normalizer (OpenAI gpt-4o-mini)
// Gate 1: deterministic known-intent check
// Gate 2: deterministic live-store fact check
// Gate 3: model worker (OpenAI customer reply or Claude co-pilot)
// Gate 4: output humanizer (OpenAI gpt-4o-mini) + output guard

const INPUT_NORMALIZE_SYSTEM = `You are an intent normalizer for a UAE government housing service.
Your ONLY job is to parse the customer message and return a JSON object. Nothing else.
Return exactly this shape:
{
  "intent": one of [track_case, document_check, document_received_check, timeline_inquiry, complaint, new_request, general_faq, handoff, unknown],
  "language": "ar" or "en",
  "sentiment": one of [positive, neutral, frustrated, angry, urgent],
  "entities": { optional key-value of extracted facts },
  "confidence": 0.0 to 1.0
}
Rules:
- Accept Gulf Arabic, MSA, or English
- If message is Arabic dialect, classify as "ar"
- Do not add commentary. Return only the JSON.`;

const OUTPUT_HUMANIZE_SYSTEM = `You are a warm, professional Arabic/English response writer for a UAE government housing service.
You receive structured facts and must write a human-feeling response.
Rules:
- Do NOT add any facts that are not in the structured input
- Do NOT make any promises about approvals, timelines, or outcomes
- Use formal but warm government Arabic (MSA with respectful tone) for ar, professional English for en
- Keep it concise — 2-4 sentences maximum
- Return only the response text, no JSON wrapper`;

function createFlashGateService(options = {}) {
  const brainService = createCustomerBrainService(options);
  const deterministicService = createDeterministicAnswerService();
  const c3Store = createChallenge3LiveStore(options);

  const openaiClient = options.openaiClient || null;

  async function handleMessage({ customerId, identityFromTrustGate, currentChannel, rawMessage }) {
    const startTime = Date.now();
    let normalizedIntent = null;
    let language = "ar";
    let sentiment = "neutral";
    let entities = {};
    let modelUsed = "none";
    let gate = null;

    // GATE 0: input normalizer
    try {
      const normalized = await callInputNormalizer(rawMessage);
      normalizedIntent = normalized.intent;
      language = normalized.language || "ar";
      sentiment = normalized.sentiment || "neutral";
      entities = normalized.entities || {};
      modelUsed = process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini";
      gate = "gate_0_normalize";
    } catch (err) {
      normalizedIntent = "unknown";
      language = detectLanguage(rawMessage);
    }

    // Build brain AFTER normalizing so brain has current state
    const brain = brainService.buildBrain({ customerId, identityFromTrustGate, currentChannel });
    brain.challenge3OmnichannelContext.sentiment = sentiment;

    // GATE 1 + 2: deterministic check
    const deterministicResult = deterministicService.resolve(brain, normalizedIntent, language);

    let customerReply = null;
    let requiresHuman = false;
    let escalationScore = 0;

    if (deterministicResult.available) {
      // Zero tokens — answer directly from live store facts
      gate = "gate_2_deterministic";

      const rawFacts = deterministicResult.rawFacts;
      const rawText = language === "en"
        ? deterministicResult.customerMessageEn
        : deterministicResult.customerMessageAr;

      // GATE 4: output humanizer — reshape facts into warm tone
      try {
        customerReply = await callOutputHumanizer(rawText, language, sentiment);
        modelUsed = modelUsed !== "none"
          ? modelUsed
          : (process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini");
        gate = "gate_4_humanize_deterministic";
      } catch {
        customerReply = rawText;
      }

      brain.deterministicAnswer = deterministicResult;

    } else {
      // GATE 3: model worker for edge case
      gate = "gate_3_model_worker";
      modelUsed = process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini";

      const compactBrain = buildCompactBrain(brain);
      const workerResult = await callCustomerReplyWorker(normalizedIntent, language, sentiment, rawMessage, compactBrain);

      customerReply = workerResult.customerReply;
      requiresHuman = workerResult.requiresHuman || false;
      escalationScore = workerResult.escalationScore || 0;

      // GATE 4: humanize even model worker output
      try {
        customerReply = await callOutputHumanizer(customerReply, language, sentiment);
        gate = "gate_4_humanize_model";
      } catch {
        // keep original model reply
      }
    }

    escalationScore = escalationScore || computeEscalationScore(brain, requiresHuman);

    // Write event to ledger
    const eventId = c3Store.nextId("EVT");
    const journeyId = brain.challenge3OmnichannelContext.journeyId || c3Store.nextId("JRN");

    const event = {
      eventId,
      journeyId,
      customerId,
      caseId: brain.challenge1HousingContext.applicationId,
      channel: currentChannel,
      direction: "inbound",
      language,
      rawMessage,
      normalizedIntent,
      normalizedEntities: entities,
      sentiment,
      deterministicAnswerUsed: deterministicResult.available,
      modelUsed,
      customerReply,
      requiresHuman,
      escalationScore,
      piiClass: "low",
      timestamp: new Date().toISOString()
    };

    c3Store.appendEvent(event);
    c3Store.updateProfileLastSeen(customerId, currentChannel);

    return {
      eventId,
      journeyId,
      customerReply,
      requiresHuman,
      escalationScore,
      gate,
      language,
      modelUsed,
      durationMs: Date.now() - startTime
    };
  }

  async function callInputNormalizer(rawMessage) {
    if (!openaiClient) throw new Error("openaiClient not configured");
    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: INPUT_NORMALIZE_SYSTEM },
        { role: "user", content: rawMessage }
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content);
  }

  async function callOutputHumanizer(rawText, language, sentiment) {
    if (!openaiClient) return rawText;
    const userPrompt = `Language: ${language}\nSentiment: ${sentiment}\nFacts to humanize:\n${rawText}`;
    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: OUTPUT_HUMANIZE_SYSTEM },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.3
    });
    return response.choices[0].message.content.trim();
  }

  async function callCustomerReplyWorker(intent, language, sentiment, rawMessage, compactBrain) {
    if (!openaiClient) {
      return {
        customerReply: language === "en"
          ? "Your request has been received. An officer will follow up with you shortly."
          : "تم استلام طلبك. سيتواصل معك الموظف المختص قريباً.",
        requiresHuman: true,
        escalationScore: 50
      };
    }

    const systemPrompt = buildCustomerReplySystemPrompt(compactBrain);
    const userContent = `Intent: ${intent}\nLanguage: ${language}\nSentiment: ${sentiment}\nMessage: ${rawMessage}`;

    const response = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 300,
      temperature: 0.4,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  }

  function buildCustomerReplySystemPrompt(compactBrain) {
    const hasApp = compactBrain.hasApplication;
    const status = compactBrain.applicationStatus;
    const missing = compactBrain.missingDocuments || [];
    const allowedActions = compactBrain.allowedActions;

    return `You are a UAE government housing service assistant.
Customer context: ${hasApp ? `Has application (${status})` : "No active application"}.
${missing.length > 0 ? `Missing documents: ${missing.join(", ")}.` : "All documents received."}
Rules:
- NEVER promise approval, rejection, or timeline
- NEVER mention internal process details
- mayPromiseApproval: ${allowedActions.mayPromiseApproval}
- requiresOfficerForFinalDecision: ${allowedActions.requiresOfficerForFinalDecision}
Return JSON: { "customerReply": string, "requiresHuman": boolean, "escalationScore": 0-100 }`;
  }

  function buildCompactBrain(brain) {
    return {
      hasApplication: brain.challenge1HousingContext.hasActiveHousingApplication,
      applicationStatus: brain.challenge1HousingContext.applicationStatus,
      missingDocuments: brain.challenge1HousingContext.missingDocuments,
      repeatContactCount: brain.challenge3OmnichannelContext.repeatContactCount,
      escalationSignals: brain.challenge3OmnichannelContext.escalationSignals,
      allowedActions: brain.allowedActions
    };
  }

  function computeEscalationScore(brain, requiresHuman) {
    let score = 0;
    if (requiresHuman) score += 40;
    const signals = brain.challenge3OmnichannelContext.escalationSignals || [];
    if (signals.includes("angry_tone")) score += 25;
    if (signals.includes("frustrated_tone")) score += 15;
    if (signals.includes("repeat_follow_up")) score += 15;
    if (signals.includes("multiple_human_requests")) score += 20;
    return Math.min(score, 100);
  }

  function detectLanguage(text) {
    const arabicPattern = /[؀-ۿ]/;
    return arabicPattern.test(text) ? "ar" : "en";
  }

  function health() {
    const brainHealth = brainService.health();
    return {
      status: brainHealth.status,
      checkedAt: new Date().toISOString(),
      openaiConfigured: !!openaiClient,
      brain: brainHealth
    };
  }

  return { process: handleMessage, health };
}

module.exports = { createFlashGateService };
