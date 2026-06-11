"use strict";

const { createDdaPersonaStore } = require("./dda-persona-store.js");
const { createDdaAuditService } = require("./dda-audit-service.js");
const { createDdaLinkService } = require("./dda-link-service.js");
const { createDdaProfileService } = require("./dda-profile-service.js");

function createDdaHubService(options = {}) {
  const store = createDdaPersonaStore(options);
  const audit = createDdaAuditService({ store });
  const linkService = createDdaLinkService({ store, audit });
  const profileService = createDdaProfileService({ linkService, audit });

  function resetDemo(actor = "system_demo_reset") {
    const counts = store.resetDemo();
    audit.append({
      eventType: "dda_demo_reset",
      actor,
      result: "success",
      reason: "DDAHub demo personas reset. Links and audit were cleared before this event."
    });
    return { ok: true, counts };
  }

  function overview() {
    const personas = linkService.listPersonas();
    const total = personas.length;
    const available = personas.filter((p) => p.lockStatus === "available").length;
    const locked = personas.filter((p) => p.lockStatus === "locked").length;
    const activationBlocked = personas.filter((p) => p.ddaGate.activationBlocked).length;
    const bankStatementsRequired = personas.filter((p) => p.financialSummary.bankStatementRequired).length;
    return {
      ok: true,
      service: "ddahub",
      mode: "mock_financial_authority",
      total,
      available,
      locked,
      activationBlocked,
      bankStatementsRequired,
      integrity: linkService.integrityReport(),
      generatedAt: new Date().toISOString()
    };
  }

  return {
    store,
    audit,
    linkService,
    profileService,
    health: store.health,
    resetDemo,
    overview
  };
}

module.exports = { createDdaHubService };
