(function attachRecommendationService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.recommendationService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createRecommendationService() {
  function recommend({ documents = {}, policy = {}, capacity = {} }) {
    const reasons = [];

    if (policy.activeRequestExists) {
      return {
        recommendationPath: "reject_due_active_request",
        recommendationLabel: "Reject due active request",
        recommendationLabelAr: "رفض بسبب وجود طلب قائم",
        decisionStage: "rejected_active_request",
        applicationStatus: "complete",
        trustGateRequired: false,
        escalationRequired: false,
        escalationReasons: ["Existing active rescheduling request"],
        reasoningBullets: ["The system found an active request and cannot prepare a new approval-ready path."],
        reasoningBulletsAr: ["رصد النظام طلباً قائماً ولا يمكن إعداد مسار اعتماد جديد."]
      };
    }

    if (documents.documentCompletenessStatus !== "complete") {
      return {
        recommendationPath: "request_documents",
        recommendationLabel: "Request corrected documents",
        recommendationLabelAr: "طلب تصحيح المستندات",
        decisionStage: "needs_documents",
        applicationStatus: "incomplete",
        trustGateRequired: false,
        escalationRequired: false,
        escalationReasons: [],
        reasoningBullets: [documents.correctionMessage],
        reasoningBulletsAr: [documents.correctionMessageAr]
      };
    }

    if (!policy.twentyPercentPass || !policy.periodPass || policy.highObligations || policy.lowAverageIncome || policy.unstableIncome) {
      if (!policy.twentyPercentPass) reasons.push("20 percent salary cap is not met");
      if (!policy.periodPass) reasons.push("Proposed schedule exceeds repayment-period boundary");
      if (policy.highObligations) reasons.push("High obligations ratio");
      if (policy.lowAverageIncome) reasons.push("Low average income per family member");
      if (policy.unstableIncome) reasons.push("Unstable or reduced income");
      return {
        recommendationPath: "refer_human_review",
        recommendationLabel: "Refer for human review",
        recommendationLabelAr: "إحالة للمراجعة البشرية",
        decisionStage: "human_review_required",
        applicationStatus: "complete",
        trustGateRequired: false,
        escalationRequired: true,
        escalationReasons: reasons,
        reasoningBullets: [
          "A support plan can be calculated, but risk indicators require officer review before any final action.",
          `Calculated support payment: ${capacity.proposedMonthlyInstallment || 0} AED for ${capacity.proposedReschedulingMonths || 0} months.`
        ],
        reasoningBulletsAr: [
          "يمكن احتساب خطة مساندة، لكن مؤشرات المخاطر تتطلب مراجعة الموظف قبل أي إجراء نهائي.",
          `قيمة السداد المحتسبة: ${capacity.proposedMonthlyInstallment || 0} درهم لمدة ${capacity.proposedReschedulingMonths || 0} شهر.`
        ]
      };
    }

    return {
      recommendationPath: "ready_for_trustgate",
      recommendationLabel: "Approve recommendation pending TrustGate authorization",
      recommendationLabelAr: "اعتماد التوصية بانتظار تفويض TrustGate",
      decisionStage: "ready_for_trustgate",
      applicationStatus: "complete",
      trustGateRequired: true,
      escalationRequired: false,
      escalationReasons: [],
      reasoningBullets: [
        "Required documents are complete.",
        "The calculated arrears payment is within the 20 percent salary cap.",
        "The proposed duration is within the remaining approved repayment period."
      ],
      reasoningBulletsAr: [
        "المستندات المطلوبة مكتملة.",
        "سداد المتأخرات المحتسب ضمن حد ٢٠٪ من الراتب.",
        "المدة المقترحة ضمن مدة السداد المعتمدة المتبقية."
      ]
    };
  }

  return {
    recommend
  };
});
