const { buildApprovedDemoState, loadSharedWorkflow } = require("./demo-workflow-utils");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const { workflow } = loadSharedWorkflow();
  const state = buildApprovedDemoState();
  const approved = state.approved;
  const snapshot = state.snapshot;
  const foundSeal = state.seal;
  const review = snapshot.review;

  assert(approved.contractVersion === workflow.CONTRACTS.case, "approved case contractVersion missing");
  assert(approved.status === "approved", "approved status not persisted");
  assert(approved.auditTrail.length === 3, "expected customer, snapshot, and approval audit events");
  assert(approved.auditTrail[0].contractVersion === workflow.CONTRACTS.auditEvent, "audit event contractVersion missing");
  assert(approved.auditTrail[2].actor === "officer", "final audit event actor should be the verified officer");
  assert(approved.auditTrail[2].source === "trustgate", "final audit event source should be the stable simulator protocol");
  assert(review.workerHealth.contractVersion === workflow.CONTRACTS.workerHealth, "worker health contractVersion missing");
  assert(review.documentVerification.contractVersion === workflow.CONTRACTS.documentVerification, "document verification contractVersion missing");
  assert(review.workerHealth.status === "ready", "worker health not ready");
  assert(snapshot.contractVersion === workflow.CONTRACTS.caseSnapshot, "case snapshot contractVersion missing");
  assert(workflow.labelStatus(approved.status, "ar") === "تم الاعتماد", "Arabic status label not available");
  assert(workflow.labelStatus(approved.status, "en") === "Approved", "English status label not available");
  assert(foundSeal.contractVersion === workflow.CONTRACTS.approvalSeal, "approval seal contractVersion missing");
  assert(foundSeal.caseId === approved.id, "approval seal case link missing");
  assert(foundSeal.method === "TrustGate number matching and PIN", "approval seal should use TrustGate number matching and PIN");
  assert(foundSeal.trustGate?.requiredPrivilege === "seal.stamp", "approval seal should record seal.stamp privilege");
  assert(foundSeal.trustGate?.assuranceLevel === "simulated_number_match_and_pin", "approval seal should record PIN-backed assurance");
  assert(Boolean(foundSeal.trustGate?.pinVerifiedAt), "approval seal should record PIN verification time");

  console.log("MOEI customer-office flow verified");
  console.log(JSON.stringify({
    caseId: approved.id,
    status: approved.status,
    auditEvents: approved.auditTrail.length,
    snapshotContract: snapshot.contractVersion,
    sealContract: foundSeal.contractVersion,
    sealStatus: foundSeal.status,
    workerStatus: review.workerHealth.status,
    aiCallPoint: review.workerHealth.aiCallPoint
  }, null, 2));
}

main();
