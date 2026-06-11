(function attachAssessmentOrchestrator(root, factory) {
  const service = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.assessmentOrchestrator = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createAssessmentOrchestrator(root) {
  function loadDependency(globalKey, relativePath) {
    if (root?.ArrearsFlowShared?.[globalKey]) return root.ArrearsFlowShared[globalKey];
    if (typeof require === "function") return require(relativePath);
    throw new Error(`Missing financial-study dependency: ${globalKey}`);
  }

  const programmeLoanService = loadDependency("programmeLoanService", "./programme-loan-service.js");
  const documentCompletenessService = loadDependency("documentCompletenessService", "./document-completeness-service.js");
  const financialCapacityService = loadDependency("financialCapacityService", "./financial-capacity-service.js");
  const reschedulingPolicyService = loadDependency("reschedulingPolicyService", "./rescheduling-policy-service.js");
  const recommendationService = loadDependency("recommendationService", "./recommendation-service.js");
  const confidenceService = loadDependency("confidenceService", "./confidence-service.js");
  const auditLedgerService = loadDependency("auditLedgerService", "./audit-ledger-service.js");

  function nowIso() {
    return new Date().toISOString();
  }

  function roundPct(value) {
    return Number((Number(value || 0) * 100).toFixed(1));
  }

  function findRule(policy, id) {
    return policy.ruleTrace.find((item) => item.id === id) || null;
  }

  function citizenStatusFor(recommendation) {
    const map = {
      ready_for_trustgate: {
        en: "Approved recommendation pending human approval",
        ar: "توصية معتمدة بانتظار اعتماد الموظف"
      },
      request_documents: {
        en: "Additional Information Required",
        ar: "مطلوب استكمال معلومات"
      },
      reject_due_active_request: {
        en: "Rejected due active request",
        ar: "مرفوض بسبب وجود طلب قائم"
      },
      refer_human_review: {
        en: "Human Review Required",
        ar: "مطلوب مراجعة بشرية"
      }
    };
    return map[recommendation.recommendationPath] || { en: "In Progress", ar: "قيد الإجراء" };
  }

  function buildFinancialStudy({ caseData, programmeLoan, documents, capacity, policy, recommendation, confidence, auditEvents }) {
    const salaryStatus = documents.requiredDocuments.find((doc) => doc.key === "salary_certificate" || doc.key === "non_work_letter")?.status || "unknown";
    return {
      contractVersion: "financial-study.v1",
      caseId: caseData.id || caseData.caseId,
      beneficiaryId: programmeLoan.beneficiaryId,
      builtAt: nowIso(),
      currentSalary: capacity.currentSalary,
      salarySourceStatus: salaryStatus,
      monthlyObligations: capacity.monthlyObligations,
      obligationsRatio: capacity.obligationsRatio,
      obligationsRatioPct: roundPct(capacity.obligationsRatio),
      currentInstallmentRatio: capacity.currentInstallmentRatio,
      currentInstallmentRatioPct: roundPct(capacity.currentInstallmentRatio),
      maxAllowedDeductionAmount: capacity.maxAllowedDeductionAmount,
      proposedMonthlyInstallment: recommendation.recommendationPath === "request_documents" ? null : capacity.proposedMonthlyInstallment,
      proposedDeductionRate: recommendation.recommendationPath === "request_documents" ? null : capacity.proposedDeductionRate,
      proposedDeductionRatePct: recommendation.recommendationPath === "request_documents" ? null : roundPct(capacity.proposedDeductionRate),
      proposedReschedulingMonths: recommendation.recommendationPath === "request_documents" ? null : capacity.proposedReschedulingMonths,
      averageIncomePerFamilyMember: capacity.averageIncomePerFamilyMember,
      arrearsAmount: programmeLoan.totalArrearsAmount,
      remainingLoanBalance: programmeLoan.remainingLoanBalance,
      unpaidInstallmentsCount: programmeLoan.unpaidInstallmentsCount,
      remainingRepaymentMonths: programmeLoan.remainingRepaymentMonths,
      currentMonthlyInstallment: programmeLoan.currentMonthlyInstallment,
      documentsStatus: documents.documentCompletenessStatus,
      activeRequestCheck: findRule(policy, "RULE-ACTIVE-REQUEST"),
      twentyPercentRule: findRule(policy, "RULE-20PCT"),
      repaymentPeriodRule: findRule(policy, "RULE-PERIOD"),
      ruleTrace: policy.ruleTrace,
      recommendationPath: recommendation.recommendationPath,
      recommendationLabel: recommendation.recommendationLabel,
      recommendationLabelAr: recommendation.recommendationLabelAr,
      confidenceScore: confidence.score,
      confidenceLabel: confidence.label,
      confidenceReasons: confidence.reasons,
      escalationRequired: recommendation.escalationRequired,
      escalationReasons: recommendation.escalationReasons,
      reasoningBullets: recommendation.reasoningBullets,
      reasoningBulletsAr: recommendation.reasoningBulletsAr,
      auditEvents,
      trustGateRequired: recommendation.trustGateRequired,
      finalAuthority: "human_officer_through_trustgate",
      aiFinalApproval: false
    };
  }

  function buildAssessmentResult({ caseData, recommendation, financialStudy, auditEvents }) {
    const citizen = citizenStatusFor(recommendation);
    return {
      contractVersion: "assessment-result.v1",
      caseId: caseData.id || caseData.caseId,
      applicationStatus: recommendation.applicationStatus,
      decisionStage: recommendation.decisionStage,
      recommendation: recommendation.recommendationPath === "ready_for_trustgate"
        ? "ready_for_trustgate"
        : recommendation.recommendationPath,
      citizenFacingStatus: citizen.en,
      citizenFacingStatusAr: citizen.ar,
      officerFacingSummary: recommendation.recommendationLabel,
      officerFacingSummaryAr: recommendation.recommendationLabelAr,
      trustGateActionRequired: recommendation.trustGateRequired,
      auditSummary: auditEvents,
      financialStudy,
      aiFinalApproval: false,
      finalAuthority: "human_officer_through_trustgate"
    };
  }

  function assess(caseData = {}, options = {}) {
    const programmeLoan = options.programmeLoan || programmeLoanService.buildFromCase(caseData);
    const documents = documentCompletenessService.evaluate(caseData);
    const capacity = financialCapacityService.calculate(caseData, programmeLoan);
    const policy = reschedulingPolicyService.apply({ caseData, programmeLoan, documents, capacity });
    const recommendation = recommendationService.recommend({ caseData, programmeLoan, documents, capacity, policy });
    const confidence = confidenceService.score({ documents, policy, programmeLoan, recommendation });
    const auditEvents = auditLedgerService.build({ caseData, programmeLoan, documents, policy, recommendation, confidence });
    const financialStudy = buildFinancialStudy({
      caseData,
      programmeLoan,
      documents,
      capacity,
      policy,
      recommendation,
      confidence,
      auditEvents
    });

    return {
      contractVersion: "assessment-result.v1",
      caseId: caseData.id || caseData.caseId,
      programmeLoan,
      documents,
      capacity,
      policy,
      recommendation,
      confidence,
      financialStudy,
      auditEvents,
      assessmentResult: buildAssessmentResult({
        caseData,
        recommendation,
        financialStudy,
        auditEvents
      })
    };
  }

  return {
    assess
  };
});
