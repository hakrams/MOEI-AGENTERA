"use strict";

// Central Issue Registry — C1 ArrearsFlow Document Intelligence
//
// Every issue code that may appear in blockingIssues, humanReviewIssues, or warnings
// must be registered here. AI providers may only assert codes that exist in this registry.
// Unknown codes are silently dropped to audit.ignoredModelIssues.
//
// Severity:
//   blocking     — citizen must fix (re-upload or correct input), assessment paused
//   human_review — officer must judge, citizen cannot fix by re-uploading
//   policy_fail  — policy guardrail triggered, routes to human review, citizen notified
//   warning      — continue, recorded in audit trail only

const ISSUES = {

  /* ── BLOCKING — citizen must fix ─────────────────────────────────── */

  file_too_large: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "The file you uploaded is too large. Please compress or resize it (max 7.5 MB) and try again.",
    citizenMessageAr: "حجم الملف كبير جداً. يرجى ضغطه أو تصغيره (الحد الأقصى 7.5 ميغابايت) والمحاولة مرة أخرى.",
    officerMessageEn: "File exceeded maximum allowed size limit.",
    officerMessageAr: "تجاوز الملف الحد الأقصى المسموح به."
  },

  unsupported_file_type: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "This file type is not supported. Please upload a PDF or a clear photo (JPG/PNG).",
    citizenMessageAr: "نوع الملف غير مدعوم. يرجى رفع ملف PDF أو صورة واضحة (JPG/PNG).",
    officerMessageEn: "Uploaded file has an unsupported MIME type.",
    officerMessageAr: "نوع الملف المرفوع غير مدعوم."
  },

  password_protected_file: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "Your file is password-protected. Please remove the password and re-upload.",
    citizenMessageAr: "الملف محمي بكلمة مرور. يرجى إزالة كلمة المرور وإعادة الرفع.",
    officerMessageEn: "Document is password-protected and cannot be read.",
    officerMessageAr: "المستند محمي بكلمة مرور ولا يمكن قراءته."
  },

  document_unreadable: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "The document is too blurry or dark to read. Please take a clearer photo or scan it again.",
    citizenMessageAr: "المستند ضبابي أو مظلم للغاية. يرجى التقاط صورة أوضح أو إعادة المسح.",
    officerMessageEn: "Document extraction failed — image quality too low to read content.",
    officerMessageAr: "فشل استخراج البيانات — جودة الصورة منخفضة جداً."
  },

  document_cropped: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "Part of the document appears to be cut off. Please ensure the full document is visible and re-upload.",
    citizenMessageAr: "يبدو أن جزءاً من المستند مقطوع. يرجى التأكد من ظهور المستند بالكامل وإعادة الرفع.",
    officerMessageEn: "Document is cropped — key fields may be missing from the image.",
    officerMessageAr: "المستند مقطوع — قد تكون الحقول الرئيسية غير مرئية."
  },

  wrong_document_type: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "The document you uploaded does not match the required document type for this step. Please upload the correct document.",
    citizenMessageAr: "المستند الذي رفعته لا يتطابق مع نوع المستند المطلوب في هذه الخطوة. يرجى رفع المستند الصحيح.",
    officerMessageEn: "Document type mismatch — wrong document uploaded to this slot.",
    officerMessageAr: "عدم تطابق نوع المستند — تم رفع مستند خاطئ في هذا الحقل."
  },

  duplicate_document_uploaded: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "This document has already been uploaded. Please check that you are uploading the correct document for each step.",
    citizenMessageAr: "تم رفع هذا المستند مسبقاً. يرجى التحقق من أنك ترفع المستند الصحيح لكل خطوة.",
    officerMessageEn: "Same document file uploaded more than once.",
    officerMessageAr: "تم رفع نفس الملف أكثر من مرة."
  },

  document_expired: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "This document is more than 30 days old and is no longer accepted. Please obtain and upload a recent copy.",
    citizenMessageAr: "هذا المستند أقدم من 30 يوماً ولم يعد مقبولاً. يرجى الحصول على نسخة حديثة ورفعها.",
    officerMessageEn: "Document issue date exceeds the 30-day recency requirement.",
    officerMessageAr: "تاريخ إصدار المستند يتجاوز شرط الحداثة البالغ 30 يوماً."
  },

  issue_date_missing: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "The issue date is not visible on this document. Please ensure the date is clearly shown and re-upload.",
    citizenMessageAr: "تاريخ الإصدار غير مرئي في هذا المستند. يرجى التأكد من وضوح التاريخ وإعادة الرفع.",
    officerMessageEn: "Issue date field not extracted — document may be incomplete or cropped.",
    officerMessageAr: "لم يتم استخراج تاريخ الإصدار — المستند قد يكون ناقصاً أو مقطوعاً."
  },

  invalid_issue_date: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "The issue date on this document appears to be invalid. Please upload a document with a valid date.",
    citizenMessageAr: "تاريخ الإصدار في هذا المستند يبدو غير صالح. يرجى رفع مستند بتاريخ صحيح.",
    officerMessageEn: "Extracted issue date failed date parsing — likely corrupted or non-standard format.",
    officerMessageAr: "فشل تحليل تاريخ الإصدار المستخرج — الصيغة غير صالحة أو تالفة."
  },

  salary_mismatch: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "The salary shown on your certificate does not match the salary you declared in your application. Please upload a certificate that matches your declared salary, or update your application details.",
    citizenMessageAr: "الراتب المبين في شهادتك لا يتطابق مع الراتب الذي أعلنته في طلبك. يرجى رفع شهادة تتطابق مع راتبك المُعلن أو تحديث بيانات طلبك.",
    officerMessageEn: "Extracted salary differs from declared salary by more than AED 250 and 2%.",
    officerMessageAr: "الراتب المستخرج يختلف عن الراتب المُعلن بأكثر من 250 درهم وأكثر من 2٪."
  },

  insufficient_statement_period: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "Your bank statement does not cover the required period (minimum 3 months). Please upload a more recent or longer statement.",
    citizenMessageAr: "كشف حسابك المصرفي لا يغطي الفترة المطلوبة (3 أشهر على الأقل). يرجى رفع كشف حساب أحدث أو أطول.",
    officerMessageEn: "Bank statement period is shorter than the required 3-month minimum.",
    officerMessageAr: "فترة كشف الحساب أقصر من الحد الأدنى المطلوب وهو 3 أشهر."
  },

  active_request_exists: {
    severity: "blocking",
    blocksAssessment: true,
    requiresHumanReview: false,
    canContinue: false,
    citizenMessageEn: "You already have an active request in the system. Please follow up on your existing request before submitting a new one.",
    citizenMessageAr: "لديك طلب نشط بالفعل في النظام. يرجى متابعة طلبك الحالي قبل تقديم طلب جديد.",
    officerMessageEn: "Citizen has an existing active request — duplicate submission blocked.",
    officerMessageAr: "لدى المتعامل طلب نشط قائم — تم حظر التقديم المكرر."
  },

  /* ── HUMAN_REVIEW — officer must judge ───────────────────────────── */

  identity_mismatch: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "The name on your document does not match your registered name. Your application has been referred to an officer for review.",
    citizenMessageAr: "الاسم في مستندك لا يتطابق مع الاسم المسجل. تم تحويل طلبك إلى موظف للمراجعة.",
    officerMessageEn: "Applicant name on document does not match the registered name. Manual identity verification required.",
    officerMessageAr: "اسم مقدم الطلب في المستند لا يتطابق مع الاسم المسجل. مطلوب التحقق اليدوي من الهوية."
  },

  emirates_id_mismatch: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "The Emirates ID number on your document does not match your registered Emirates ID. Your application has been referred to an officer.",
    citizenMessageAr: "رقم الهوية الإماراتية في مستندك لا يتطابق مع هويتك المسجلة. تم تحويل طلبك إلى موظف.",
    officerMessageEn: "Emirates ID number on document does not match the registered Emirates ID.",
    officerMessageAr: "رقم الهوية الإماراتية في المستند لا يتطابق مع الهوية المسجلة."
  },

  programme_loan_not_found: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "We could not locate your loan details in the housing programme records. An officer will review your case.",
    citizenMessageAr: "لم نتمكن من العثور على تفاصيل قرضك في سجلات برنامج الإسكان. سيراجع موظف حالتك.",
    officerMessageEn: "Programme loan record not found — Emirates ID lookup returned no match.",
    officerMessageAr: "لم يتم العثور على سجل قرض البرنامج — لم يتطابق البحث برقم الهوية الإماراتية."
  },

  employer_mismatch: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "The employer on your document differs from the employer on record. Your application has been referred to an officer for verification.",
    citizenMessageAr: "جهة العمل في مستندك تختلف عن جهة العمل المسجلة. تم تحويل طلبك إلى موظف للتحقق.",
    officerMessageEn: "Employer name on document does not match the employer on record. Verification required.",
    officerMessageAr: "اسم صاحب العمل في المستند لا يتطابق مع الاسم المسجل. مطلوب التحقق."
  },

  income_inconsistency: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "There are inconsistencies in the income data across your documents. An officer will review your application.",
    citizenMessageAr: "توجد تناقضات في بيانات الدخل عبر مستنداتك. سيراجع موظف طلبك.",
    officerMessageEn: "Income data is inconsistent across documents — manual cross-check required.",
    officerMessageAr: "بيانات الدخل متناقضة عبر المستندات — مطلوب التحقق اليدوي المتقاطع."
  },

  deduction_cap_exceeded: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "The proposed repayment plan exceeds the maximum allowed monthly deduction limit. An officer will review your case to explore options.",
    citizenMessageAr: "خطة السداد المقترحة تتجاوز الحد الأقصى المسموح به للاقتطاع الشهري. سيراجع موظف حالتك لاستكشاف الخيارات.",
    officerMessageEn: "Proposed deduction exceeds the 20% salary cap. Requires plan adjustment or exception approval.",
    officerMessageAr: "الاقتطاع المقترح يتجاوز سقف 20٪ من الراتب. يتطلب تعديل الخطة أو موافقة استثنائية."
  },

  repayment_period_exceeded: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "The proposed repayment period exceeds the maximum allowed duration. An officer will review your case.",
    citizenMessageAr: "فترة السداد المقترحة تتجاوز المدة القصوى المسموح بها. سيراجع موظف حالتك.",
    officerMessageEn: "Proposed repayment period exceeds the maximum allowed duration. Exception or restructure required.",
    officerMessageAr: "فترة السداد المقترحة تتجاوز الحد الأقصى المسموح به. مطلوب استثناء أو إعادة هيكلة."
  },

  /* ── POLICY_FAIL — policy guardrail, routes to human review ──────── */

  policy_data_missing: {
    severity: "policy_fail",
    blocksAssessment: true,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "Some information required to complete your financial assessment is missing. An officer will reach out to collect the missing details.",
    citizenMessageAr: "بعض المعلومات المطلوبة لإتمام التقييم المالي غير متوفرة. سيتواصل معك موظف لجمع التفاصيل الناقصة.",
    officerMessageEn: "Financial policy assessment cannot run — required data fields are missing from the application record.",
    officerMessageAr: "لا يمكن إجراء التقييم المالي — الحقول المطلوبة غير موجودة في سجل الطلب."
  },

  /* ── WARNING — continue, record in audit trail ────────────────────── */

  minor_name_variation: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "A minor spelling variation was detected in the name on your document. This has been noted.",
    citizenMessageAr: "تم رصد اختلاف بسيط في تهجئة الاسم في مستندك. تم تسجيل ذلك.",
    officerMessageEn: "Minor name transliteration variation between document and registered name. Emirates ID consistent.",
    officerMessageAr: "اختلاف بسيط في ترجمة الاسم بين المستند والاسم المسجل. الهوية الإماراتية متطابقة."
  },

  name_missing_but_id_matches: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "The name field on your document is not clearly visible, but your Emirates ID matches. Continuing.",
    citizenMessageAr: "حقل الاسم في مستندك غير واضح، لكن الهوية الإماراتية متطابقة. جارٍ المتابعة.",
    officerMessageEn: "Applicant name not extracted from document, but Emirates ID lookup confirmed identity.",
    officerMessageAr: "لم يتم استخراج اسم مقدم الطلب من المستند، لكن الهوية الإماراتية تؤكد الهوية."
  },

  net_salary_only: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "Your salary certificate shows net salary only. Gross salary is preferred for a more accurate assessment.",
    citizenMessageAr: "تُظهر شهادة راتبك صافي الراتب فقط. يُفضل الراتب الإجمالي لإجراء تقييم أكثر دقة.",
    officerMessageEn: "Document contains net salary only — gross salary unavailable for policy checks.",
    officerMessageAr: "المستند يحتوي على صافي الراتب فقط — الراتب الإجمالي غير متاح لفحوصات السياسة."
  },

  stamp_low_confidence: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "The official stamp on your document is not clearly visible. This has been noted and may require manual review.",
    citizenMessageAr: "الختم الرسمي في مستندك غير واضح بشكل كافٍ. تم تسجيل ذلك وقد يتطلب مراجعة يدوية.",
    officerMessageEn: "Stamp detection confidence is below threshold — verify stamp authenticity during manual review.",
    officerMessageAr: "ثقة اكتشاف الختم أقل من الحد المطلوب — تحقق من صحة الختم خلال المراجعة اليدوية."
  },

  qr_not_verified: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "The QR code on your document could not be verified automatically. This has been noted.",
    citizenMessageAr: "تعذّر التحقق تلقائياً من رمز QR في مستندك. تم تسجيل ذلك.",
    officerMessageEn: "Document QR code not verified — may be missing, damaged, or from a non-integrated system.",
    officerMessageAr: "لم يتم التحقق من رمز QR في المستند — قد يكون مفقوداً أو تالفاً أو من نظام غير متكامل."
  },

  high_obligations_ratio: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "Your monthly obligations are high relative to your income. An officer will review whether a lighter repayment plan is more suitable.",
    citizenMessageAr: "التزاماتك الشهرية مرتفعة نسبياً مقارنةً بدخلك. سيراجع موظف ما إذا كانت خطة سداد أخف أكثر ملاءمة.",
    officerMessageEn: "Obligations-to-income ratio is above the recommended threshold. Consider a lighter plan.",
    officerMessageAr: "نسبة الالتزامات إلى الدخل تتجاوز الحد الموصى به. يُنصح بالنظر في خطة أخف."
  },

  payment_instability: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "Your bank statement shows fluctuating payment patterns. This has been noted in your assessment.",
    citizenMessageAr: "يُظهر كشف حسابك المصرفي أنماط دفع متقلبة. تم تسجيل ذلك في تقييمك.",
    officerMessageEn: "Bank statement shows payment instability — income regularity cannot be confirmed.",
    officerMessageAr: "يُظهر كشف الحساب تقلباً في المدفوعات — لا يمكن تأكيد انتظام الدخل."
  },

  low_ocr_confidence: {
    severity: "human_review",
    blocksAssessment: false,
    requiresHumanReview: true,
    canContinue: false,
    citizenMessageEn: "The system had difficulty reading some fields on your document. An officer will verify the extracted data before continuing.",
    citizenMessageAr: "واجه النظام صعوبة في قراءة بعض الحقول في مستندك. سيتحقق موظف من البيانات المستخرجة قبل المتابعة.",
    officerMessageEn: "AI extraction confidence is 55–75% — key fields may be inaccurate. Manual field verification required before accepting.",
    officerMessageAr: "ثقة استخراج الذكاء الاصطناعي 55–75٪ — قد تكون الحقول الرئيسية غير دقيقة. مطلوب التحقق اليدوي من الحقول قبل القبول."
  },

  employer_variation: {
    severity: "warning",
    blocksAssessment: false,
    requiresHumanReview: false,
    canContinue: true,
    citizenMessageEn: "A minor variation in the employer name was noted on your document. This has been recorded.",
    citizenMessageAr: "لوحظ اختلاف بسيط في اسم جهة العمل في مستندك. تم تسجيل ذلك.",
    officerMessageEn: "Minor employer name variation between document and application record — likely abbreviation or trading name difference.",
    officerMessageAr: "اختلاف بسيط في اسم صاحب العمل بين المستند وسجل الطلب — على الأرجح اختصار أو اسم تجاري مختلف."
  }

};

/* ── Registry accessors ─────────────────────────────────────────────── */

function getIssue(code) {
  return ISSUES[code] || null;
}

function isKnownIssue(code) {
  return Object.prototype.hasOwnProperty.call(ISSUES, code);
}

function getSeverity(code) {
  return ISSUES[code]?.severity || null;
}

function blocksAssessment(code) {
  return Boolean(ISSUES[code]?.blocksAssessment);
}

function requiresHumanReview(code) {
  return Boolean(ISSUES[code]?.requiresHumanReview);
}

// Classify an issue code into the correct output bucket.
// Returns: "blocking" | "humanReview" | "warning" | "unknown"
function classify(code) {
  const entry = ISSUES[code];
  if (!entry) return "unknown";
  if (entry.severity === "blocking" || entry.severity === "policy_fail") return "blocking";
  if (entry.severity === "human_review") return "humanReview";
  return "warning";
}

module.exports = { ISSUES, getIssue, isKnownIssue, getSeverity, blocksAssessment, requiresHumanReview, classify };
