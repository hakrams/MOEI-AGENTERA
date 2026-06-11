const STATUS_LABELS = {
  ar: {
    submitted: "تم تقديم طلبك بنجاح",
    documents_required: "مطلوب منك تقديم وثائق إضافية",
    under_assessment: "طلبك قيد المراجعة من قِبل الفريق المختص",
    waiting_for_salary_certificate: "بانتظار شهادة الراتب",
    waiting_for_no_objection_letter: "بانتظار خطاب عدم الممانعة",
    waiting_for_bank_statement: "بانتظار كشف الحساب البنكي",
    approved: "تم اعتماد طلبك",
    rejected: "للأسف تم رفض طلبك — يرجى التواصل مع الموظف المختص",
    pending_officer_review: "طلبك في انتظار مراجعة الموظف",
    on_hold: "طلبك موقوف مؤقتاً — سنتواصل معك قريباً",
    not_requested: "لا يوجد ختم موافقة حتى الآن"
  },
  en: {
    submitted: "Your application has been submitted successfully",
    documents_required: "Additional documents are required from you",
    under_assessment: "Your application is under review by the specialist team",
    waiting_for_salary_certificate: "Waiting for salary certificate",
    waiting_for_no_objection_letter: "Waiting for no-objection letter",
    waiting_for_bank_statement: "Waiting for bank statement",
    approved: "Your application has been approved",
    rejected: "Unfortunately your application was rejected — please contact the officer",
    pending_officer_review: "Your application is awaiting officer review",
    on_hold: "Your application is on hold — we will contact you soon",
    not_requested: "No approval seal has been requested yet"
  }
};

const DOCUMENT_LABELS = {
  ar: {
    salary_certificate: "شهادة الراتب",
    bank_statement: "كشف الحساب البنكي",
    no_objection_letter: "خطاب عدم الممانعة",
    passport: "جواز السفر",
    emirates_id: "بطاقة الهوية الإماراتية",
    proof_of_residence: "إثبات الإقامة"
  },
  en: {
    salary_certificate: "Salary certificate",
    bank_statement: "Bank statement",
    no_objection_letter: "No-objection letter",
    passport: "Passport",
    emirates_id: "Emirates ID",
    proof_of_residence: "Proof of residence"
  }
};

function createDeterministicAnswerService() {

  function resolve(brain, normalizedIntent, language) {
    const lang = language === "en" ? "en" : "ar";
    const housing = brain.challenge1HousingContext;

    if (normalizedIntent === "track_case") {
      return resolveTrackCase(housing, lang);
    }

    if (normalizedIntent === "document_check") {
      return resolveDocumentCheck(housing, lang);
    }

    if (normalizedIntent === "document_received_check") {
      return resolveDocumentReceivedCheck(housing, lang);
    }

    if (normalizedIntent === "timeline_inquiry") {
      return resolveTimelineInquiry(housing, lang);
    }

    if (normalizedIntent === "general_faq") {
      return resolveGeneralFaq(lang);
    }

    return { available: false, answerType: normalizedIntent, rawFacts: null, customerMessageAr: null, customerMessageEn: null };
  }

  function resolveTrackCase(housing, lang) {
    if (!housing.hasActiveHousingApplication) {
      return {
        available: true,
        answerType: "no_application",
        rawFacts: { hasApplication: false },
        customerMessageAr: "لا يوجد طلب مسكن نشط مرتبط بهويتك حالياً. للتقديم، يُرجى زيارة الموقع الرسمي.",
        customerMessageEn: "There is no active housing application linked to your identity at this time. To apply, please visit the official website."
      };
    }

    const statusLabel = STATUS_LABELS[lang][housing.applicationStatus] || housing.applicationStatus;
    const assessmentLabel = housing.latestAssessmentStatus
      ? (STATUS_LABELS[lang][housing.latestAssessmentStatus] || housing.latestAssessmentStatus)
      : null;

    const rawFacts = {
      applicationId: housing.applicationId,
      applicationStatus: housing.applicationStatus,
      latestAssessmentStatus: housing.latestAssessmentStatus
    };

    const ar = `رقم طلبك: ${housing.applicationId}. الحالة الحالية: ${STATUS_LABELS.ar[housing.applicationStatus] || housing.applicationStatus}${assessmentLabel ? ". " + STATUS_LABELS.ar[housing.latestAssessmentStatus] : ""}.`;
    const en = `Application ID: ${housing.applicationId}. Current status: ${STATUS_LABELS.en[housing.applicationStatus] || housing.applicationStatus}${assessmentLabel ? ". " + STATUS_LABELS.en[housing.latestAssessmentStatus] : ""}.`;

    return {
      available: true,
      answerType: "case_status",
      rawFacts,
      customerMessageAr: ar,
      customerMessageEn: en
    };
  }

  function resolveDocumentCheck(housing, lang) {
    if (!housing.hasActiveHousingApplication) {
      return { available: false, answerType: "document_check", rawFacts: null, customerMessageAr: null, customerMessageEn: null };
    }

    if (housing.missingDocuments.length === 0) {
      return {
        available: true,
        answerType: "documents_complete",
        rawFacts: { missingDocuments: [] },
        customerMessageAr: "جميع الوثائق المطلوبة تم استلامها بنجاح. طلبك قيد المراجعة.",
        customerMessageEn: "All required documents have been received successfully. Your application is under review."
      };
    }

    const missingAr = housing.missingDocuments
      .map((d) => DOCUMENT_LABELS.ar[d] || d)
      .join("، ");
    const missingEn = housing.missingDocuments
      .map((d) => DOCUMENT_LABELS.en[d] || d)
      .join(", ");

    return {
      available: true,
      answerType: "missing_documents",
      rawFacts: { missingDocuments: housing.missingDocuments },
      customerMessageAr: `الوثائق المطلوبة المتبقية: ${missingAr}. يُرجى تقديمها في أقرب وقت ممكن.`,
      customerMessageEn: `Remaining required documents: ${missingEn}. Please submit them as soon as possible.`
    };
  }

  function resolveDocumentReceivedCheck(housing, lang) {
    if (!housing.hasActiveHousingApplication) {
      return { available: false, answerType: "document_received_check", rawFacts: null, customerMessageAr: null, customerMessageEn: null };
    }

    if (housing.missingDocuments.length === 0) {
      return {
        available: true,
        answerType: "all_documents_received",
        rawFacts: { allReceived: true },
        customerMessageAr: "نعم، تم استلام جميع وثائقك بنجاح.",
        customerMessageEn: "Yes, all your documents have been received successfully."
      };
    }

    const missingAr = housing.missingDocuments.map((d) => DOCUMENT_LABELS.ar[d] || d).join("، ");
    const missingEn = housing.missingDocuments.map((d) => DOCUMENT_LABELS.en[d] || d).join(", ");

    return {
      available: true,
      answerType: "documents_still_missing",
      rawFacts: { missingDocuments: housing.missingDocuments },
      customerMessageAr: `لم يتم استلام الوثائق التالية بعد: ${missingAr}.`,
      customerMessageEn: `The following documents have not been received yet: ${missingEn}.`
    };
  }

  function resolveTimelineInquiry(housing, lang) {
    if (!housing.hasActiveHousingApplication) {
      return { available: false, answerType: "timeline_inquiry", rawFacts: null, customerMessageAr: null, customerMessageEn: null };
    }

    if (housing.missingDocuments.length > 0) {
      return {
        available: true,
        answerType: "timeline_blocked_by_docs",
        rawFacts: { blockedReason: "missing_documents", missingDocuments: housing.missingDocuments },
        customerMessageAr: "لا يمكن تحديد موعد نهائي حتى يتم استلام جميع الوثائق المطلوبة.",
        customerMessageEn: "A timeline cannot be determined until all required documents are received."
      };
    }

    return {
      available: true,
      answerType: "timeline_under_assessment",
      rawFacts: { applicationStatus: housing.applicationStatus },
      customerMessageAr: "طلبك حالياً قيد المراجعة. سيتم إعلامك فور اتخاذ القرار.",
      customerMessageEn: "Your application is currently under review. You will be notified as soon as a decision is made."
    };
  }

  function resolveGeneralFaq(lang) {
    return {
      available: true,
      answerType: "general_faq",
      rawFacts: {},
      customerMessageAr: "يُرجى توضيح استفسارك حتى نتمكن من مساعدتك بشكل أفضل.",
      customerMessageEn: "Please clarify your inquiry so we can assist you better."
    };
  }

  return { resolve };
}

module.exports = { createDeterministicAnswerService, STATUS_LABELS, DOCUMENT_LABELS };
