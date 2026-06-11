"use strict";

const VALID_DDA_STATUS = new Set(["active", "missing", "pending_signature", "manual_transfer_required", "suspended", "expired"]);
const VALID_SIGNATURE_STATUS = new Set(["signed", "not_signed", "pending", "expired"]);
const VALID_ACTIVATION_STATUS = new Set(["active", "blocked", "pending", "manual_required"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(value) {
  return String(value || "").trim();
}

function maskEmiratesId(value) {
  const raw = normalizeId(value);
  if (raw.length < 7) return raw;
  return `${raw.slice(0, 3)}-****-*******-${raw.slice(-1)}`;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? Number((Number(numerator || 0) / denominator).toFixed(4)) : 0;
}

function withComputedSummary(persona) {
  if (!persona) return null;
  const financial = persona.financialProfile || {};
  const mandate = persona.ddaMandate || {};
  const grossSalary = Number(financial.grossSalary || 0);
  const currentDeductionAmount = Number(financial.currentDeductionAmount || 0);
  const currentDeductionRate = financial.currentDeductionRate != null
    ? Number(financial.currentDeductionRate)
    : ratio(currentDeductionAmount, grossSalary);
  const maximumAllowedDeductionRate = 0.2;
  const maximumAllowedDeductionAmount = Math.round(grossSalary * maximumAllowedDeductionRate);
  return {
    ddaPersonaId: persona.ddaPersonaId,
    scenarioKey: persona.scenarioKey,
    label: persona.label,
    linked: Boolean(persona.linked),
    linkedTrustGateId: persona.linkedTrustGateId || null,
    linkedEmiratesIdMasked: persona.linkedEmiratesId ? maskEmiratesId(persona.linkedEmiratesId) : null,
    lockStatus: persona.lockStatus || "available",
    financialSummary: {
      source: financial.source || "mock_financial_api",
      financialApiAvailable: Boolean(financial.financialApiAvailable),
      financialApiConsistency: financial.financialApiConsistency || "unknown",
      salaryBasis: "grossSalary",
      grossSalary,
      netSalary: Number(financial.netSalary || 0),
      previousGrossSalary: financial.previousGrossSalary != null ? Number(financial.previousGrossSalary) : null,
      monthlyObligations: Number(financial.monthlyObligations || 0),
      obligationsRate: financial.obligationsRate != null ? Number(financial.obligationsRate) : ratio(financial.monthlyObligations, grossSalary),
      incomeStable: Boolean(financial.incomeStable),
      incomeTrend: financial.incomeTrend || "unknown",
      currentDeductionAmount,
      currentDeductionRate,
      maximumAllowedDeductionRate,
      maximumAllowedDeductionAmount,
      availableHeadroomAmount: Math.max(0, maximumAllowedDeductionAmount - currentDeductionAmount),
      availableHeadroomRate: Number(Math.max(0, maximumAllowedDeductionRate - currentDeductionRate).toFixed(4)),
      bankName: financial.bankName || null,
      bankStatementRequired: Boolean(financial.bankStatementRequired),
      bankStatementReason: financial.bankStatementReason || null,
      temporaryCircumstance: Boolean(financial.temporaryCircumstance)
    },
    ddaGate: {
      mandateReference: mandate.mandateReference || null,
      ddaStatus: mandate.ddaStatus || "missing",
      signatureStatus: mandate.signatureStatus || "not_signed",
      activationStatus: mandate.activationStatus || "blocked",
      activationBlocked: mandate.activationStatus !== "active",
      manualTransferRequired: Boolean(mandate.manualTransferRequired),
      requiredAction: mandate.requiredAction || null,
      lastUpdatedAt: mandate.lastUpdatedAt || null
    },
    riskSignals: clone(persona.riskSignals || {})
  };
}

function error(code, message, statusCode = 400, extra = {}) {
  return { ok: false, statusCode, code, message, ...extra };
}

function createDdaLinkService({ store, audit }) {
  function listPersonas() {
    return store.readStore("personas").map(withComputedSummary);
  }

  function getPersona(ddaPersonaId) {
    const id = normalizeId(ddaPersonaId);
    return store.readStore("personas").find((persona) => persona.ddaPersonaId === id) || null;
  }

  function getPersonaSummary(ddaPersonaId) {
    return withComputedSummary(getPersona(ddaPersonaId));
  }

  function availablePersonas() {
    return store.readStore("personas")
      .filter((persona) => !persona.linked && persona.lockStatus === "available")
      .map(withComputedSummary);
  }

  function findLinkByTrustGateId(trustGateId) {
    const id = normalizeId(trustGateId);
    return store.readStore("links").find((link) => link.trustGateId === id && link.status === "active") || null;
  }

  function findLinkByDdaPersonaId(ddaPersonaId) {
    const id = normalizeId(ddaPersonaId);
    return store.readStore("links").find((link) => link.ddaPersonaId === id && link.status === "active") || null;
  }

  function buildLinkId(links) {
    return `DDA-LINK-${String(links.length + 1).padStart(4, "0")}`;
  }

  function blocked(eventType, actor, trustGateId, emiratesId, ddaPersonaId, code, message) {
    audit.append({
      eventType,
      trustGateId,
      emiratesId,
      ddaPersonaId,
      actor,
      result: "blocked",
      reason: message
    });
    return error(code, message, 409);
  }

  function linkTrustGateToDdaPersona({ trustGateId, emiratesId, ddaPersonaId, actor = "system" }) {
    const tgId = normalizeId(trustGateId);
    const eid = normalizeId(emiratesId);
    const personaId = normalizeId(ddaPersonaId);
    if (!tgId) return error("TRUSTGATE_ID_REQUIRED", "trustGateId is required.");
    if (!personaId) return error("DDA_PERSONA_ID_REQUIRED", "ddaPersonaId is required.");

    const links = store.readStore("links");
    const existingTrustGateLink = links.find((link) => link.trustGateId === tgId && link.status === "active");
    if (existingTrustGateLink) {
      return blocked("dda_relink_blocked", actor, tgId, eid, personaId, "TRUSTGATE_ALREADY_LINKED", "This TrustGate account is already locked to a DDA persona.");
    }

    const existingDdaLink = links.find((link) => link.ddaPersonaId === personaId && link.status === "active");
    if (existingDdaLink) {
      return blocked("dda_relink_blocked", actor, tgId, eid, personaId, "DDA_PERSONA_ALREADY_LINKED", "This DDA persona is already locked to another TrustGate account.");
    }

    const personas = store.readStore("personas");
    const persona = personas.find((item) => item.ddaPersonaId === personaId);
    if (!persona) return error("DDA_PERSONA_NOT_FOUND", "DDA persona was not found.", 404);
    if (persona.linked || persona.lockStatus === "locked") {
      return blocked("dda_relink_blocked", actor, tgId, eid, personaId, "DDA_PERSONA_LOCKED", "This DDA persona is locked and cannot be linked again.");
    }

    const linkedAt = new Date().toISOString();
    const link = {
      linkId: buildLinkId(links),
      trustGateId: tgId,
      emiratesId: eid || null,
      ddaPersonaId: personaId,
      linkedAt,
      linkedBy: actor,
      lockStatus: "locked",
      relinkAllowed: false,
      status: "active"
    };

    store.writeStore("links", [...links, link]);
    store.writeStore("personas", personas.map((item) => item.ddaPersonaId === personaId
      ? {
          ...item,
          linked: true,
          linkedTrustGateId: tgId,
          linkedEmiratesId: eid || null,
          lockStatus: "locked"
        }
      : item));

    audit.append({
      eventType: "dda_persona_linked",
      trustGateId: tgId,
      emiratesId: eid || null,
      ddaPersonaId: personaId,
      actor,
      result: "success",
      reason: "One-time TrustGate to DDA persona link created."
    });

    return {
      ok: true,
      link,
      persona: getPersonaSummary(personaId)
    };
  }

  function updateMandate(ddaPersonaId, updater, auditEvent) {
    const personaId = normalizeId(ddaPersonaId);
    const personas = store.readStore("personas");
    const persona = personas.find((item) => item.ddaPersonaId === personaId);
    if (!persona) return error("DDA_PERSONA_NOT_FOUND", "DDA persona was not found.", 404);
    const nextMandate = {
      ...(persona.ddaMandate || {}),
      ...updater(persona.ddaMandate || {}),
      lastUpdatedAt: new Date().toISOString()
    };
    if (!VALID_DDA_STATUS.has(nextMandate.ddaStatus)) return error("INVALID_DDA_STATUS", "Invalid DDA status.");
    if (!VALID_SIGNATURE_STATUS.has(nextMandate.signatureStatus)) return error("INVALID_SIGNATURE_STATUS", "Invalid signature status.");
    if (!VALID_ACTIVATION_STATUS.has(nextMandate.activationStatus)) return error("INVALID_ACTIVATION_STATUS", "Invalid activation status.");
    store.writeStore("personas", personas.map((item) => item.ddaPersonaId === personaId
      ? { ...item, ddaMandate: nextMandate }
      : item));
    audit.append({ ddaPersonaId: personaId, ...auditEvent });
    return {
      ok: true,
      ddaPersonaId: personaId,
      ddaStatus: nextMandate.ddaStatus,
      signatureStatus: nextMandate.signatureStatus,
      activationStatus: nextMandate.activationStatus,
      persona: getPersonaSummary(personaId)
    };
  }

  function signDda({ ddaPersonaId, actor = "demo_customer" }) {
    const reference = `DDA-2026-${String(Date.now()).slice(-6)}`;
    return updateMandate(
      ddaPersonaId,
      (current) => ({
        mandateReference: current.mandateReference || reference,
        ddaStatus: "active",
        signatureStatus: "signed",
        activationStatus: "active",
        manualTransferRequired: false,
        requiredAction: null
      }),
      {
        eventType: "dda_signed",
        actor,
        result: "success",
        reason: "DDA signature completed and activation gate opened."
      }
    );
  }

  function markManualTransfer({ ddaPersonaId, actor = "officer", reference = null }) {
    return updateMandate(
      ddaPersonaId,
      () => ({
        ddaStatus: "manual_transfer_required",
        signatureStatus: "not_signed",
        activationStatus: "manual_required",
        manualTransferRequired: true,
        manualTransferReference: reference || `MANUAL-${Date.now()}`,
        requiredAction: "manual_bank_authorization"
      }),
      {
        eventType: "dda_manual_transfer_marked",
        actor,
        result: "success",
        reason: "Manual bank transfer authorization marked as required."
      }
    );
  }

  function lookupByTrustGate(trustGateId) {
    const link = findLinkByTrustGateId(trustGateId);
    if (!link) return error("DDA_NOT_LINKED", "No DDA persona is linked to this TrustGate account.", 404);
    return {
      ok: true,
      link,
      persona: getPersonaSummary(link.ddaPersonaId)
    };
  }

  function lookupByEmirates(emiratesId) {
    const eid = normalizeId(emiratesId);
    const link = store.readStore("links").find((item) => item.emiratesId === eid && item.status === "active");
    if (!link) return error("DDA_NOT_LINKED", "No DDA persona is linked to this Emirates ID.", 404);
    return {
      ok: true,
      link,
      persona: getPersonaSummary(link.ddaPersonaId)
    };
  }

  function integrityReport() {
    const personas = store.readStore("personas");
    const links = store.readStore("links").filter((link) => link.status === "active");
    const warnings = [];
    for (const persona of personas) {
      const link = links.find((item) => item.ddaPersonaId === persona.ddaPersonaId);
      if (persona.linked && !link) warnings.push({ type: "persona_linked_without_link", ddaPersonaId: persona.ddaPersonaId });
      if (!persona.linked && link) warnings.push({ type: "link_without_persona_lock", ddaPersonaId: persona.ddaPersonaId, linkId: link.linkId });
    }
    return { ok: warnings.length === 0, warnings };
  }

  return {
    listPersonas,
    availablePersonas,
    getPersona,
    getPersonaSummary,
    findLinkByTrustGateId,
    findLinkByDdaPersonaId,
    linkTrustGateToDdaPersona,
    signDda,
    markManualTransfer,
    lookupByTrustGate,
    lookupByEmirates,
    integrityReport
  };
}

module.exports = {
  createDdaLinkService,
  withComputedSummary
};
