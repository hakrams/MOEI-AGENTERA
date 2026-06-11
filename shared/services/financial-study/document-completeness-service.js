(function attachDocumentCompletenessService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.documentCompletenessService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createDocumentCompletenessService() {
  const PASS_STATUSES = new Set(["passed", "valid", "not_required"]);
  const MISSING_STATUSES = new Set(["missing", "", null, undefined]);

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeStatus(status, legacyStatus) {
    const value = status || legacyStatus || "missing";
    if (value === "valid") return "passed";
    if (value === "invalid") return "needs_correction";
    return value;
  }

  function documentRecord(key, label, arLabel, status, required = true) {
    const normalized = normalizeStatus(status);
    return {
      key,
      label,
      arLabel,
      required,
      status: normalized,
      passed: PASS_STATUSES.has(normalized),
      missing: MISSING_STATUSES.has(normalized),
      invalid: !PASS_STATUSES.has(normalized) && !MISSING_STATUSES.has(normalized)
    };
  }

  function requiredDocuments(caseData = {}) {
    const incomeDocumentType = caseData.incomeDocumentType || "salary_certificate";
    const incomeDoc = incomeDocumentType === "non_work_letter"
      ? documentRecord("non_work_letter", "Non-work letter from notary public", "رسالة عدم عمل من كاتب العدل", caseData.incomeDocumentStatus || caseData.salaryStatus)
      : documentRecord("salary_certificate", "Detailed recent salary certificate", "شهادة راتب تفصيلية حديثة", caseData.incomeDocumentStatus || caseData.salaryStatus);
    const docs = [incomeDoc];

    if (caseData.existingLoans || Number(caseData.monthlyObligations || 0) > 0) {
      docs.push(documentRecord("bank_statement", "Bank statement for declared obligations", "كشف حساب للالتزامات المعلنة", caseData.bankStatus));
    }

    if (caseData.officialMissionCase) {
      docs.push(
        documentRecord("official_mission_letter", "Official mission letter", "شهادة المهمة الرسمية", caseData.missionLetterStatus),
        documentRecord("passport_stamp", "Passport stamp", "ختم جواز السفر", caseData.passportStampStatus)
      );
    }

    return docs;
  }

  function evaluate(caseData = {}) {
    const docs = requiredDocuments(caseData);
    const submittedDocuments = docs.filter((doc) => !doc.missing);
    const missingDocuments = docs.filter((doc) => doc.missing);
    const invalidDocuments = docs.filter((doc) => doc.invalid);
    const correctionRequired = missingDocuments.length > 0 || invalidDocuments.length > 0;
    const status = correctionRequired
      ? missingDocuments.length > 0 ? "incomplete" : "needs_correction"
      : "complete";

    return {
      contractVersion: "document-completeness.v1",
      caseId: caseData.id || caseData.caseId,
      checkedAt: nowIso(),
      requiredDocuments: docs,
      submittedDocuments,
      missingDocuments,
      invalidDocuments,
      documentCompletenessStatus: status,
      correctionRequired,
      correctionMessage: correctionRequired
        ? "Correct or upload the required documents before the recommendation can proceed."
        : "Required documents are complete for deterministic review.",
      correctionMessageAr: correctionRequired
        ? "صحح أو ارفع المستندات المطلوبة قبل متابعة التوصية."
        : "المستندات المطلوبة مكتملة للمراجعة المحددة."
    };
  }

  return {
    evaluate,
    requiredDocuments
  };
});
