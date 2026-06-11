(function attachReschedulingPolicyService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.reschedulingPolicyService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createReschedulingPolicyService() {
  function rule(id, label, arLabel, status, calculation, arCalculation, reason, arReason) {
    return { id, label, arLabel, status, calculation, arCalculation, reason, arReason };
  }

  function apply({ caseData = {}, programmeLoan = {}, documents = {}, capacity = {} }) {
    const activeRequestExists = Boolean(programmeLoan.hasActiveReschedulingRequest || caseData.hasActiveReschedulingRequest);
    const twentyPercentPass = Number(capacity.proposedMonthlyInstallment || 0) <= Number(capacity.maxAllowedDeductionAmount || 0);
    const periodPass = Number(capacity.proposedReschedulingMonths || 0) <= Number(programmeLoan.remainingRepaymentMonths || 0);
    const documentsPass = documents.documentCompletenessStatus === "complete";
    const obligationsRatio = Number(capacity.obligationsRatio || 0);
    const lowAverageIncome = Number(capacity.averageIncomePerFamilyMember || 0) < 2500;
    const unstableIncome = caseData.employmentStatus != null && caseData.employmentStatus !== "Employed";

    const ruleTrace = [
      rule(
        "RULE-ACTIVE-REQUEST",
        "No active rescheduling request",
        "عدم وجود طلب إعادة جدولة قائم",
        activeRequestExists ? "fail" : "pass",
        activeRequestExists ? "Active request found" : "No active request found",
        activeRequestExists ? "يوجد طلب قائم" : "لا يوجد طلب قائم",
        activeRequestExists ? "A new recommendation cannot proceed while another request is active." : "The case can proceed to deterministic checks.",
        activeRequestExists ? "لا يمكن متابعة توصية جديدة مع وجود طلب قائم." : "يمكن متابعة الحالة للفحوصات المحددة."
      ),
      rule(
        "RULE-DOCUMENTS",
        "Required documents complete",
        "اكتمال المستندات المطلوبة",
        documentsPass ? "pass" : "fail",
        `${documents.missingDocuments?.length || 0} missing / ${documents.invalidDocuments?.length || 0} invalid`,
        `${documents.missingDocuments?.length || 0} ناقصة / ${documents.invalidDocuments?.length || 0} غير صالحة`,
        documentsPass ? "Document gate passed." : "Missing or invalid documents block the recommendation.",
        documentsPass ? "اجتازت الحالة بوابة المستندات." : "المستندات الناقصة أو غير الصحيحة تمنع التوصية."
      ),
      rule(
        "RULE-20PCT",
        "Proposed arrears payment within 20% salary cap",
        "سداد المتأخرات المقترح ضمن حد ٢٠٪ من الراتب",
        twentyPercentPass ? "pass" : "fail",
        `${capacity.proposedMonthlyInstallment || 0} <= ${capacity.maxAllowedDeductionAmount || 0} AED`,
        `${capacity.proposedMonthlyInstallment || 0} <= ${capacity.maxAllowedDeductionAmount || 0} درهم`,
        twentyPercentPass ? "Proposed arrears payment stays within the cap." : "Proposed arrears payment exceeds the salary cap.",
        twentyPercentPass ? "سداد المتأخرات المقترح ضمن الحد." : "سداد المتأخرات المقترح يتجاوز حد الراتب."
      ),
      rule(
        "RULE-PERIOD",
        "Proposed schedule within remaining approved repayment period",
        "الجدولة المقترحة ضمن مدة السداد المعتمدة المتبقية",
        periodPass ? "pass" : "fail",
        `${capacity.proposedReschedulingMonths || 0} <= ${programmeLoan.remainingRepaymentMonths || 0} months`,
        `${capacity.proposedReschedulingMonths || 0} <= ${programmeLoan.remainingRepaymentMonths || 0} شهر`,
        periodPass ? "Proposed duration fits the remaining repayment boundary." : "Proposed duration exceeds the remaining repayment boundary.",
        periodPass ? "المدة المقترحة ضمن حد مدة السداد المتبقية." : "المدة المقترحة تتجاوز حد مدة السداد المتبقية."
      ),
      rule(
        "RULE-OBLIGATIONS",
        "Obligations ratio review",
        "مراجعة نسبة الالتزامات",
        obligationsRatio > 0.6 ? "warn" : "pass",
        `${Math.round(obligationsRatio * 100)}% obligations-to-income`,
        `${Math.round(obligationsRatio * 100)}٪ نسبة الالتزامات إلى الدخل`,
        obligationsRatio > 0.6 ? "High obligations require human review or a lighter path." : "Obligations are within ordinary review range.",
        obligationsRatio > 0.6 ? "الالتزامات المرتفعة تتطلب مراجعة بشرية أو مساراً أخف." : "الالتزامات ضمن نطاق المراجعة الاعتيادي."
      ),
      rule(
        "RULE-FAMILY-CAPACITY",
        "Average income per family member",
        "متوسط الدخل لكل فرد من الأسرة",
        lowAverageIncome ? "warn" : "pass",
        `${capacity.averageIncomePerFamilyMember || 0} AED per family member`,
        `${capacity.averageIncomePerFamilyMember || 0} درهم لكل فرد`,
        lowAverageIncome ? "Low average income per family member should reduce auto-processing confidence." : "Average income per family member supports normal review.",
        lowAverageIncome ? "انخفاض متوسط الدخل للفرد يقلل الثقة في المعالجة الآلية." : "متوسط الدخل للفرد يدعم المراجعة الاعتيادية."
      )
    ];

    if (unstableIncome) {
      ruleTrace.push(rule(
        "RULE-INCOME-STABILITY",
        "Income stability",
        "استقرار الدخل",
        "warn",
        caseData.employmentStatus,
        caseData.employmentStatusAr || caseData.employmentStatus,
        "Unstable or reduced income requires human review.",
        "الدخل غير المستقر أو المنخفض يتطلب مراجعة بشرية."
      ));
    }

    return {
      ruleTrace,
      activeRequestExists,
      documentsPass,
      twentyPercentPass,
      periodPass,
      highObligations: obligationsRatio > 0.6,
      lowAverageIncome,
      unstableIncome,
      hasBlockingFailure: ruleTrace.some((item) => item.status === "fail"),
      hasWarnings: ruleTrace.some((item) => item.status === "warn")
    };
  }

  return {
    apply
  };
});
