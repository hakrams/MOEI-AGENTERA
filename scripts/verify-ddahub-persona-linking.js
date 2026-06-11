#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const { createDdaHubService } = require("../ddahub/services/ddahub-service.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ddahub-verify-"));

function createService() {
  return createDdaHubService({
    rootDir,
    dataDir: tempDir,
    seedPersonasPath: path.join(rootDir, "ddahub", "data", "demo-personas.seed.json")
  });
}

function assertBlocked(result, code) {
  assert.equal(result.ok, false, `Expected ${code} to be blocked`);
  assert.equal(result.code, code);
  assert.equal(result.statusCode, 409);
}

try {
  const service = createService();
  service.store.ensureAllStores();

  const personas = service.linkService.listPersonas();
  assert(personas.length >= 6, "DDAHub should seed at least six personas");

  const normal = service.linkService.getPersonaSummary("DDA-PER-0001");
  assert(normal, "DDA-PER-0001 should exist");
  assert.equal(normal.financialSummary.salaryBasis, "grossSalary");
  assert.equal(normal.financialSummary.grossSalary, 30000);
  assert.equal(normal.financialSummary.netSalary, 25000);
  assert.equal(normal.financialSummary.maximumAllowedDeductionAmount, 6000, "20% cap must use gross salary, not net salary");
  assert.equal(normal.financialSummary.currentDeductionAmount, 1983);
  assert.equal(normal.financialSummary.currentDeductionRate, 0.0661);

  const missingDda = service.linkService.getPersonaSummary("DDA-PER-0002");
  assert.equal(missingDda.ddaGate.activationBlocked, true, "Missing DDA must block activation");
  assert.equal(missingDda.ddaGate.requiredAction, "sign_dda");

  const apiUnavailable = service.linkService.getPersonaSummary("DDA-PER-0007");
  assert.equal(apiUnavailable.financialSummary.financialApiAvailable, false);
  assert.equal(apiUnavailable.financialSummary.bankStatementRequired, true, "Financial API unavailable should require bank statement");

  const link = service.linkService.linkTrustGateToDdaPersona({
    trustGateId: "TG-VERIFY-001",
    emiratesId: "784-1988-1111111-1",
    ddaPersonaId: "DDA-PER-0001",
    actor: "verifier"
  });
  assert.equal(link.ok, true, "First link should succeed");
  assert.equal(link.persona.lockStatus, "locked");
  assert.equal(link.persona.linkedTrustGateId, "TG-VERIFY-001");

  assertBlocked(service.linkService.linkTrustGateToDdaPersona({
    trustGateId: "TG-VERIFY-002",
    emiratesId: "784-1989-2222222-2",
    ddaPersonaId: "DDA-PER-0001",
    actor: "verifier"
  }), "DDA_PERSONA_ALREADY_LINKED");

  assertBlocked(service.linkService.linkTrustGateToDdaPersona({
    trustGateId: "TG-VERIFY-001",
    emiratesId: "784-1990-3333333-3",
    ddaPersonaId: "DDA-PER-0002",
    actor: "verifier"
  }), "TRUSTGATE_ALREADY_LINKED");

  const lookup = service.profileService.profileByTrustGate("TG-VERIFY-001", "verifier");
  assert.equal(lookup.ok, true, "Lookup by TrustGate should find linked persona");
  assert.equal(lookup.persona.ddaPersonaId, "DDA-PER-0001");

  const sign = service.linkService.signDda({ ddaPersonaId: "DDA-PER-0002", actor: "verifier" });
  assert.equal(sign.ok, true);
  assert.equal(sign.ddaStatus, "active");
  assert.equal(sign.signatureStatus, "signed");
  assert.equal(sign.activationStatus, "active");

  const manual = service.linkService.markManualTransfer({
    ddaPersonaId: "DDA-PER-0003",
    actor: "verifier",
    reference: "MANUAL-VERIFY-001"
  });
  assert.equal(manual.ok, true);
  assert.equal(manual.ddaStatus, "manual_transfer_required");
  assert.equal(manual.activationStatus, "manual_required");

  const audit = service.audit.list(100);
  assert(audit.some((event) => event.eventType === "dda_persona_linked" && event.result === "success"), "Successful link audit missing");
  assert(audit.some((event) => event.eventType === "dda_relink_blocked" && event.result === "blocked"), "Blocked relink audit missing");
  assert(audit.some((event) => event.eventType === "dda_signed"), "DDA signature audit missing");
  assert(audit.some((event) => event.eventType === "dda_manual_transfer_marked"), "Manual transfer audit missing");

  const overview = service.overview();
  assert.equal(overview.integrity.ok, true, "DDAHub integrity report should pass");

  console.log("DDAHub persona linking verifier passed.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
