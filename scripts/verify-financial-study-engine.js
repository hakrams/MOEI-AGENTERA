const assert = require("assert");

global.window = global;
require("../challenge-1/shared/mock-data/cases.js");

const orchestrator = require("../challenge-1/shared/services/financial-study/assessment-orchestrator.js");

const cases = Object.fromEntries(window.ArrearsFlowShared.cases.map((item) => [item.id, item]));

function run(caseId) {
  const caseData = cases[caseId];
  assert(caseData, `Missing demo case: ${caseId}`);
  return orchestrator.assess(caseData);
}

const clean = run("MOEI-HOUSING-2026-001");
const missingDocs = run("MOEI-HOUSING-2026-002");
const highRisk = run("MOEI-HOUSING-2026-003");

assert.equal(clean.documents.documentCompletenessStatus, "complete", "Case A documents should pass");
assert.equal(clean.policy.activeRequestExists, false, "Case A should have no active request");
assert.equal(clean.policy.twentyPercentPass, true, "Case A should pass 20 percent salary cap");
assert.equal(clean.policy.periodPass, true, "Case A should pass repayment-period cap");
assert.equal(clean.recommendation.recommendationPath, "ready_for_trustgate", "Case A should be ready for TrustGate");
assert.equal(clean.assessmentResult.trustGateActionRequired, true, "Case A should require TrustGate human approval");
assert.equal(clean.financialStudy.finalAuthority, "human_officer_through_trustgate", "Case A final authority must be human officer");
assert.equal(clean.financialStudy.aiFinalApproval, false, "Case A must not mark AI as final approver");
assert(clean.financialStudy.confidenceScore >= 80, "Case A should have high confidence");

assert.notEqual(missingDocs.documents.documentCompletenessStatus, "complete", "Case B documents should fail");
assert.equal(missingDocs.recommendation.recommendationPath, "request_documents", "Case B should request documents");
assert.equal(missingDocs.assessmentResult.decisionStage, "needs_documents", "Case B should be needs_documents");
assert.equal(missingDocs.assessmentResult.trustGateActionRequired, false, "Case B should not request TrustGate");
assert.equal(missingDocs.financialStudy.aiFinalApproval, false, "Case B must not mark AI as final approver");

assert.equal(highRisk.documents.documentCompletenessStatus, "complete", "Case C documents should pass so risk is tested");
assert.equal(highRisk.recommendation.recommendationPath, "refer_human_review", "Case C should refer human review");
assert.equal(highRisk.assessmentResult.decisionStage, "human_review_required", "Case C should be human review required");
assert.equal(highRisk.recommendation.escalationRequired, true, "Case C should require escalation");
assert(highRisk.recommendation.escalationReasons.length >= 1, "Case C should show escalation reasons");
assert.equal(highRisk.policy.twentyPercentPass, true, "Case C still enforces 20 percent cap");
assert.equal(highRisk.financialStudy.aiFinalApproval, false, "Case C must not mark AI as final approver");
assert(highRisk.financialStudy.confidenceScore < clean.financialStudy.confidenceScore, "Case C confidence should be lower than Case A");

console.log("Challenge 1 financial-study engine verified");
console.log(JSON.stringify({
  cases: [
    {
      caseId: clean.caseId,
      path: clean.recommendation.recommendationPath,
      confidence: clean.financialStudy.confidenceScore,
      trustGateRequired: clean.assessmentResult.trustGateActionRequired
    },
    {
      caseId: missingDocs.caseId,
      path: missingDocs.recommendation.recommendationPath,
      documentsStatus: missingDocs.documents.documentCompletenessStatus
    },
    {
      caseId: highRisk.caseId,
      path: highRisk.recommendation.recommendationPath,
      confidence: highRisk.financialStudy.confidenceScore,
      escalationReasons: highRisk.recommendation.escalationReasons
    }
  ]
}, null, 2));
