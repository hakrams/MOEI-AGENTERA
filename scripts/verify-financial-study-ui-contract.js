const assert = require("assert");

global.window = global;

require("../challenge-1/shared/mock-data/cases.js");
require("../challenge-1/shared/mock-data/programme-loans.js");
require("../challenge-1/shared/services/financial-study/programme-loan-service.js");
require("../challenge-1/shared/services/financial-study/document-completeness-service.js");
require("../challenge-1/shared/services/financial-study/financial-capacity-service.js");
require("../challenge-1/shared/services/financial-study/rescheduling-policy-service.js");
require("../challenge-1/shared/services/financial-study/recommendation-service.js");
require("../challenge-1/shared/services/financial-study/confidence-service.js");
require("../challenge-1/shared/services/financial-study/audit-ledger-service.js");
require("../challenge-1/shared/services/financial-study/assessment-orchestrator.js");
require("../challenge-1/shared/workflow.js");

const shared = window.ArrearsFlowShared;
const cases = Object.fromEntries(shared.cases.map((item) => [item.id, item]));

function verify(caseId, expectedPath) {
  const caseData = cases[caseId];
  assert(caseData, `Missing case ${caseId}`);
  const review = shared.workflow.buildReview(caseData, { locale: "en-AE" });
  const snapshot = shared.workflow.buildCaseSnapshot(caseData, review, "ui_contract_verifier");

  assert(review.financialStudy, `${caseId} review missing financialStudy`);
  assert(review.assessmentResult, `${caseId} review missing assessmentResult`);
  assert(review.programmeLoan, `${caseId} review missing programmeLoan`);
  assert.equal(review.financialStudy.recommendationPath, expectedPath, `${caseId} wrong recommendation path`);
  assert.equal(review.financialStudy.aiFinalApproval, false, `${caseId} must not mark AI as final approver`);
  assert.equal(review.assessmentResult.finalAuthority, "human_officer_through_trustgate", `${caseId} final authority boundary missing`);
  assert(snapshot.financialStudy, `${caseId} snapshot missing financialStudy`);
  assert.equal(snapshot.financialStudy.recommendationPath, expectedPath, `${caseId} snapshot wrong path`);
  assert(Array.isArray(snapshot.review.rules) && snapshot.review.rules.length >= 4, `${caseId} snapshot missing rule trace`);

  return {
    caseId,
    recommendationPath: review.financialStudy.recommendationPath,
    confidence: review.financialStudy.confidenceScore,
    snapshotCarriesFinancialStudy: Boolean(snapshot.financialStudy)
  };
}

const results = [
  verify("MOEI-HOUSING-2026-001", "ready_for_trustgate"),
  verify("MOEI-HOUSING-2026-002", "request_documents"),
  verify("MOEI-HOUSING-2026-003", "refer_human_review")
];

console.log("Challenge 1 financial-study UI contract verified");
console.log(JSON.stringify({ results }, null, 2));
