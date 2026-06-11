const { createChallenge1BridgeService } = require("./challenge1-bridge-service");
const { createChallenge3LiveStore } = require("./live-store/challenge3-live-store");
const { lookupCustomerHistory } = require("./moei-dataset-service");

function createCustomerBrainService(options = {}) {
  const c1Bridge = createChallenge1BridgeService(options);
  const c3Store = createChallenge3LiveStore(options);

  function buildBrain({ customerId, identityFromTrustGate, currentChannel }) {
    if (!customerId) throw new Error("customerId is required to build customer brain");
    if (!currentChannel) throw new Error("currentChannel is required to build customer brain");

    const identity = {
      source: "trustgate",
      customerId,
      displayName: identityFromTrustGate.displayName || null,
      maskedEmiratesId: identityFromTrustGate.maskedEmiratesId || null,
      phone: identityFromTrustGate.phone || null,
      preferredLanguage: identityFromTrustGate.preferredLanguage || "ar",
      preferredChannel: identityFromTrustGate.preferredChannel || currentChannel
    };

    const challenge1HousingContext = c1Bridge.getHousingContext(customerId);

    const profile = c3Store.getOrCreateProfile(customerId, identity);
    const recentEvents = c3Store.getCustomerEvents(customerId, 10);

    const sessions = c3Store.readStore("channelSessions");
    const activeSession = sessions.find(
      (s) => s.customerId === customerId && s.status === "active"
    ) || null;

    const escalationSignals = detectEscalationSignals(recentEvents, profile);

    const challenge3OmnichannelContext = {
      journeyId: activeSession ? activeSession.journeyId : null,
      lastChannel: profile.preferredChannel !== currentChannel ? profile.preferredChannel : null,
      currentChannel,
      recentEvents: recentEvents.slice(-10),
      repeatContactCount: profile.repeatContactCount || 0,
      openLoopSummary: buildOpenLoopSummary(recentEvents, challenge1HousingContext),
      sentiment: detectLatestSentiment(recentEvents),
      escalationSignals
    };

    const allowedActions = {
      mayGiveStatus: challenge1HousingContext.hasActiveHousingApplication,
      mayRequestDocument: challenge1HousingContext.missingDocuments.length > 0,
      mayPromiseApproval: false,
      mayCloseCase: false,
      requiresOfficerForFinalDecision: true
    };

    // Enrich with MOEI historical dataset if customer exists there
    let moeiHistoricalContext = null;
    try {
      moeiHistoricalContext = lookupCustomerHistory(customerId);
    } catch (_) {}

    return {
      identity,
      challenge1HousingContext,
      challenge3OmnichannelContext,
      moeiHistoricalContext,
      deterministicAnswer: { available: false, answerType: null, rawFacts: null, customerMessageAr: null, customerMessageEn: null },
      allowedActions
    };
  }

  function detectEscalationSignals(recentEvents, profile) {
    const signals = [];
    if (profile.repeatContactCount >= 3) signals.push("repeat_follow_up");
    const recentSentiments = recentEvents.slice(-3).map((e) => e.sentiment).filter(Boolean);
    if (recentSentiments.includes("angry")) signals.push("angry_tone");
    if (recentSentiments.includes("frustrated")) signals.push("frustrated_tone");
    const humanRequested = recentEvents.filter((e) => e.requiresHuman).length;
    if (humanRequested >= 2) signals.push("multiple_human_requests");
    return signals;
  }

  function detectLatestSentiment(recentEvents) {
    if (!recentEvents.length) return "neutral";
    const last = [...recentEvents].reverse().find((e) => e.sentiment);
    return last ? last.sentiment : "neutral";
  }

  function buildOpenLoopSummary(recentEvents, housingContext) {
    const lastEvent = recentEvents.slice(-1)[0];
    if (!lastEvent) {
      if (housingContext.missingDocuments.length > 0) {
        return `Customer has ${housingContext.missingDocuments.length} missing document(s): ${housingContext.missingDocuments.join(", ")}`;
      }
      return null;
    }
    if (lastEvent.requiresHuman) return `Customer interaction from ${lastEvent.channel} requires human follow-up`;
    if (housingContext.missingDocuments.length > 0) {
      return `Missing documents: ${housingContext.missingDocuments.join(", ")}`;
    }
    return null;
  }

  function health() {
    const c1Health = c1Bridge.health();
    const c3Health = c3Store.health();
    return {
      status: c1Health.status === "ok" && c3Health.status === "ok" ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      c1Bridge: c1Health,
      c3Store: c3Health
    };
  }

  return { buildBrain, health };
}

module.exports = { createCustomerBrainService };
