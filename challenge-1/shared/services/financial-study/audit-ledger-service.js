(function attachAuditLedgerService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.auditLedgerService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createAuditLedgerService() {
  function event(caseId, actor, action, result, reason) {
    return {
      contractVersion: "audit-event.v1",
      id: `AUD-${caseId}-${action}`.replace(/[^A-Z0-9-]/gi, "-"),
      at: new Date().toISOString(),
      actor,
      action,
      result,
      reason,
      source: "deterministic-financial-study-engine"
    };
  }

  function build({ caseData = {}, documents = {}, policy = {}, recommendation = {} }) {
    const caseId = caseData.id || caseData.caseId;
    return [
      event(caseId, "system", "case_received", "ok", "Case loaded into deterministic assessment orchestrator."),
      event(caseId, "system", "uae_pass_simulated_profile_loaded", "ok", "Simulated identity/profile state is used for the prototype."),
      event(caseId, "system", "programme_loan_data_retrieved", "ok", "Simulated programme loan data retrieved."),
      event(caseId, "system", "documents_checked", documents.documentCompletenessStatus, documents.correctionMessage),
      event(caseId, "system", "active_request_checked", policy.activeRequestExists ? "fail" : "pass", policy.activeRequestExists ? "Active request exists." : "No active request found."),
      event(caseId, "system", "financial_capacity_calculated", "ok", "Capacity ratios and proposed schedule calculated deterministically."),
      event(caseId, "system", "policy_rules_applied", policy.hasBlockingFailure ? "blocking_failure" : policy.hasWarnings ? "warnings" : "pass", "Rule trace prepared for officer review."),
      event(caseId, "system", "recommendation_produced", recommendation.recommendationPath, recommendation.recommendationLabel),
      event(caseId, "system", "trustgate_required_checked", recommendation.trustGateRequired ? "required" : "not_required", "TrustGate is only for human authorization after AI recommendation.")
    ];
  }

  return {
    build,
    event
  };
});
