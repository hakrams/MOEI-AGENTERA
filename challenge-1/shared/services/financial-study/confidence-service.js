(function attachConfidenceService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.confidenceService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createConfidenceService() {
  function score({ documents = {}, policy = {}, programmeLoan = {}, recommendation = {} }) {
    const reasons = [];
    let value = 45;

    if (documents.documentCompletenessStatus === "complete") {
      value += 25;
      reasons.push("Documents complete");
    } else {
      value -= 20;
      reasons.push("Documents missing or invalid");
    }

    if (!policy.activeRequestExists) {
      value += 10;
      reasons.push("No active request");
    } else {
      value -= 25;
      reasons.push("Active request exists");
    }

    if (policy.twentyPercentPass) value += 10;
    else value -= 15;

    if (policy.periodPass) value += 10;
    else value -= 15;

    if (policy.highObligations) {
      value -= 15;
      reasons.push("High obligations");
    }
    if (policy.lowAverageIncome) {
      value -= 10;
      reasons.push("Low average family income");
    }
    if (policy.unstableIncome) {
      value -= 15;
      reasons.push("Income instability");
    }
    if (programmeLoan.source === "simulated_moei_edb_programme_data") {
      value += 5;
      reasons.push("Programme data retrieved");
    }
    if (recommendation.escalationRequired) value -= 5;

    const bounded = Math.max(0, Math.min(100, Math.round(value)));
    return {
      score: bounded,
      label: bounded >= 80 ? "high" : bounded >= 55 ? "medium" : "low",
      reasons
    };
  }

  return {
    score
  };
});
