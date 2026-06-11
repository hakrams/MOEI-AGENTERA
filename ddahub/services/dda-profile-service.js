"use strict";

function createDdaProfileService({ linkService, audit }) {
  function profileByTrustGate(trustGateId, actor = "challenge1") {
    audit.append({
      eventType: "dda_persona_lookup_started",
      trustGateId,
      actor,
      result: "started",
      reason: "DDAHub profile lookup by TrustGate ID started."
    });
    const result = linkService.lookupByTrustGate(trustGateId);
    audit.append({
      eventType: result.ok ? "dda_persona_lookup_success" : "dda_persona_lookup_missing",
      trustGateId,
      ddaPersonaId: result.ok ? result.persona.ddaPersonaId : null,
      actor,
      result: result.ok ? "success" : "missing",
      reason: result.ok ? "DDA persona linked to TrustGate account." : result.message
    });
    return result;
  }

  function profileByEmirates(emiratesId, actor = "challenge1") {
    audit.append({
      eventType: "dda_persona_lookup_started",
      emiratesId,
      actor,
      result: "started",
      reason: "DDAHub profile lookup by Emirates ID started."
    });
    const result = linkService.lookupByEmirates(emiratesId);
    audit.append({
      eventType: result.ok ? "dda_persona_lookup_success" : "dda_persona_lookup_missing",
      emiratesId,
      ddaPersonaId: result.ok ? result.persona.ddaPersonaId : null,
      actor,
      result: result.ok ? "success" : "missing",
      reason: result.ok ? "DDA persona linked to Emirates ID." : result.message
    });
    return result;
  }

  return {
    profileByTrustGate,
    profileByEmirates
  };
}

module.exports = { createDdaProfileService };
