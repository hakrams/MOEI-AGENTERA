const assert = require("assert");

global.window = global;
require("../challenge-1/shared/mock-data/cases.js");

const orchestrator = require("../challenge-1/shared/services/financial-study/assessment-orchestrator.js");

const requiredActions = [
  "case_received",
  "uae_pass_simulated_profile_loaded",
  "programme_loan_data_retrieved",
  "documents_checked",
  "active_request_checked",
  "financial_capacity_calculated",
  "policy_rules_applied",
  "recommendation_produced",
  "trustgate_required_checked"
];

function verifyCase(caseData) {
  const result = orchestrator.assess(caseData);
  const actions = result.auditEvents.map((event) => event.action);
  for (const action of requiredActions) {
    assert(actions.includes(action), `${caseData.id} missing audit action: ${action}`);
  }
  for (const event of result.auditEvents) {
    assert.equal(event.contractVersion, "audit-event.v1", `${caseData.id} audit event contract missing`);
    assert(event.at, `${caseData.id} audit event missing timestamp`);
    assert(event.actor, `${caseData.id} audit event missing actor`);
    assert(event.result, `${caseData.id} audit event missing result`);
    assert.equal(event.source, "deterministic-financial-study-engine", `${caseData.id} audit event source should be deterministic engine`);
  }
  assert.equal(result.financialStudy.auditEvents.length, result.auditEvents.length, `${caseData.id} financialStudy should carry audit events`);
  return {
    caseId: caseData.id,
    auditEvents: result.auditEvents.length,
    recommendation: result.recommendation.recommendationPath
  };
}

const results = window.ArrearsFlowShared.cases.map(verifyCase);

console.log("Challenge 1 audit trail verified");
console.log(JSON.stringify({ results }, null, 2));
