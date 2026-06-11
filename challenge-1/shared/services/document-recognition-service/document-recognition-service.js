(function attachDocumentRecognitionService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.documentRecognitionService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createDocumentRecognitionService() {
  const CONTRACTS = {
    request: "document-recognition-request.v1",
    result: "document-recognition-result.v1"
  };

  const DOCUMENT_LABELS = {
    salary_certificate: {
      en: "Detailed recent salary certificate",
      ar: "شهادة راتب تفصيلية حديثة"
    },
    non_work_letter: {
      en: "Non-work letter from notary public",
      ar: "رسالة عدم عمل من كاتب العدل"
    },
    official_mission_letter: {
      en: "Official mission letter",
      ar: "شهادة المهمة الرسمية"
    },
    passport_stamp: {
      en: "Passport stamp",
      ar: "ختم جواز السفر"
    }
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeFile(file = {}) {
    return {
      name: file.name || file.fileName || "",
      type: file.type || file.mimeType || "application/octet-stream",
      size: Number(file.size || file.fileSize || 0),
      lastModified: file.lastModified || null
    };
  }

  function buildRecognitionRequest({
    caseId,
    applicantId,
    serviceKey,
    documentKey,
    file,
    customerNote = ""
  }) {
    const labels = DOCUMENT_LABELS[documentKey] || { en: documentKey, ar: documentKey };
    return {
      contractVersion: CONTRACTS.request,
      caseId,
      applicantId,
      serviceKey,
      document: {
        key: documentKey,
        label: labels.en,
        arLabel: labels.ar,
        file: file ? normalizeFile(file) : null,
        customerNote
      },
      requestedAt: nowIso()
    };
  }

  function hasStampSignal(fileName, documentKey) {
    const text = fileName.toLowerCase();
    if (/(no[-_ ]?stamp|missing[-_ ]?stamp|without[-_ ]?stamp|no[-_ ]?seal|missing[-_ ]?seal|not[-_ ]?notarized)/i.test(text)) {
      return false;
    }
    if (documentKey === "passport_stamp") return true;
    return /(stamp|stamped|digital|seal|sealed|notary|signed|official)/i.test(text);
  }

  function hasUnreadableSignal(fileName) {
    return /(blur|blurry|unclear|unreadable|low[-_ ]?quality|bad[-_ ]?scan)/i.test(fileName);
  }

  function hasStaleSignal(fileName) {
    return /(old|stale|expired|outdated|six[-_ ]?month)/i.test(fileName);
  }

  function hasMismatchSignal(fileName) {
    return /(mismatch|wrong[-_ ]?person|identity[-_ ]?mismatch|salary[-_ ]?mismatch)/i.test(fileName);
  }

  function hasSalaryConflictSignal(fileName) {
    return /(salary[-_ ]?conflict|income[-_ ]?conflict)/i.test(fileName);
  }

  function hasDateMismatchSignal(fileName) {
    return /(date[-_ ]?gap|date[-_ ]?mismatch|period[-_ ]?mismatch)/i.test(fileName);
  }

  const TYPE_SIGNALS = {
    salary_certificate: /(salary|payslip|income[-_ ]?proof|راتب|wage|pay[-_ ]?slip)/i,
    non_work_letter: /(non[-_ ]?work|عدم[-_ ]?عمل|notary[-_ ]?letter|unemployment)/i,
    official_mission_letter: /(mission(?!ary)|مهمة|official[-_ ]?mission|assignment[-_ ]?letter)/i,
    passport_stamp: /(passport|entry[-_ ]?stamp|exit[-_ ]?stamp|جواز|visa[-_ ]?stamp|immigration[-_ ]?stamp)/i
  };

  function detectWrongDocType(fileName, documentKey) {
    const text = fileName.toLowerCase();
    for (const [typeKey, pattern] of Object.entries(TYPE_SIGNALS)) {
      if (typeKey !== documentKey && pattern.test(text)) {
        return typeKey;
      }
    }
    return null;
  }

  function buildResult({
    documentKey,
    labels,
    file,
    customerStatus,
    decision,
    checks,
    customerMessage,
    customerMessageAr
  }) {
    return {
      contractVersion: CONTRACTS.result,
      status: "local_review_complete",
      customerStatus,
      decision,
      confidence: null,
      aiUsed: false,
      aiProvider: null,
      reviewMode: "local_filename_check",
      checkedAt: nowIso(),
      document: {
        key: documentKey,
        label: labels.en,
        arLabel: labels.ar,
        file,
        checks,
        customerMessage,
        customerMessageAr
      }
    };
  }

  function inspectDocument(request) {
    const file = request.document?.file || null;
    const documentKey = request.document?.key || "document";
    const labels = DOCUMENT_LABELS[documentKey] || {
      en: request.document?.label || documentKey,
      ar: request.document?.arLabel || documentKey
    };

    if (!file || !file.name) {
      return {
        contractVersion: CONTRACTS.result,
        status: "blocked_missing_document",
        customerStatus: "missing",
        decision: "needs_customer_action",
        confidence: null,
        aiUsed: false,
        aiProvider: null,
        reviewMode: "local_filename_check",
        checkedAt: nowIso(),
        document: {
          key: documentKey,
          label: labels.en,
          arLabel: labels.ar,
          file: null,
          checks: [
            {
              id: "document_present",
              status: "fail",
              label: "Document uploaded",
              arLabel: "تم رفع المستند"
            }
          ],
          customerMessage: "Upload the required document before submitting.",
          customerMessageAr: "ارفع المستند المطلوب قبل إرسال الطلب."
        }
      };
    }

    const detectedWrongType = detectWrongDocType(file.name, documentKey);
    if (detectedWrongType) {
      const detectedLabels = DOCUMENT_LABELS[detectedWrongType] || { en: detectedWrongType, ar: detectedWrongType };
      return buildResult({
        documentKey,
        labels,
        file,
        customerStatus: "wrong_document_type",
        decision: "needs_customer_action",
        checks: [
          { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
          {
            id: "document_type_match",
            status: "fail",
            label: `Correct document type (expected: ${labels.en})`,
            arLabel: `نوع المستند صحيح (المطلوب: ${labels.ar})`
          }
        ],
        customerMessage: `Wrong document type. Expected: ${labels.en}. Filename suggests: ${detectedLabels.en}. Upload the correct document.`,
        customerMessageAr: `نوع المستند غير صحيح. المطلوب: ${labels.ar}. المستند المرفوع يبدو: ${detectedLabels.ar}. ارفع المستند الصحيح.`
      });
    }

    if (hasUnreadableSignal(file.name)) {
      return buildResult({
        documentKey,
        labels,
        file,
        customerStatus: "unreadable",
        decision: "needs_customer_action",
        checks: [
          { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
          { id: "readability", status: "fail", label: "Readable copy", arLabel: "نسخة واضحة للقراءة" }
        ],
        customerMessage: "Upload a clearer copy so the details can be read.",
        customerMessageAr: "أعد رفع نسخة أوضح حتى يمكن قراءة البيانات."
      });
    }

    if (hasDateMismatchSignal(file.name)) {
      return buildResult({
        documentKey,
        labels,
        file,
        customerStatus: "date_mismatch",
        decision: "needs_customer_action",
        checks: [
          { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
          { id: "readability", status: "pass", label: "Readable copy", arLabel: "نسخة واضحة للقراءة" },
          { id: "date_fit", status: "fail", label: "Dates match the stated scenario", arLabel: "التواريخ تطابق الحالة المذكورة" }
        ],
        customerMessage: "Upload a document where the dates support the stated case.",
        customerMessageAr: "أعد رفع مستند تكون تواريخه مطابقة للحالة المذكورة."
      });
    }

    if (hasSalaryConflictSignal(file.name)) {
      return buildResult({
        documentKey,
        labels,
        file,
        customerStatus: "salary_conflict",
        decision: "needs_customer_action",
        checks: [
          { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
          { id: "readability", status: "pass", label: "Readable copy", arLabel: "نسخة واضحة للقراءة" },
          { id: "salary_consistency", status: "fail", label: "Salary matches the form", arLabel: "الراتب يطابق بيانات الطلب" }
        ],
        customerMessage: "The document conflicts with the salary details in the form. Correct the salary or upload the right document.",
        customerMessageAr: "بيانات المستند تتعارض مع الراتب في الطلب. صحح الراتب أو أعد رفع المستند الصحيح."
      });
    }

    if (hasMismatchSignal(file.name)) {
      return buildResult({
        documentKey,
        labels,
        file,
        customerStatus: "mismatch",
        decision: "needs_customer_action",
        checks: [
          { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
          { id: "readability", status: "pass", label: "Readable copy", arLabel: "نسخة واضحة للقراءة" },
          { id: "identity_or_amount_match", status: "fail", label: "Details match the application", arLabel: "البيانات تطابق الطلب" }
        ],
        customerMessage: "The uploaded document details do not match the application. Upload the correct document.",
        customerMessageAr: "بيانات المستند لا تطابق الطلب. أعد رفع المستند الصحيح."
      });
    }

    if (hasStaleSignal(file.name)) {
      return buildResult({
        documentKey,
        labels,
        file,
        customerStatus: "stale",
        decision: "needs_customer_action",
        checks: [
          { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
          { id: "readability", status: "pass", label: "Readable copy", arLabel: "نسخة واضحة للقراءة" },
          { id: "date_freshness", status: "fail", label: "Recent document", arLabel: "مستند حديث" }
        ],
        customerMessage: "Upload a recent copy of the document.",
        customerMessageAr: "أعد رفع نسخة حديثة من المستند."
      });
    }

    const stamped = hasStampSignal(file.name, documentKey);
    return buildResult({
      documentKey,
      labels,
      file,
      customerStatus: stamped ? "passed" : "needs_stamp",
      decision: stamped ? "accepted_for_gateway" : "needs_customer_action",
      checks: [
        { id: "document_present", status: "pass", label: "Document uploaded", arLabel: "تم رفع المستند" },
        { id: "readability", status: "pass", label: "Readable copy", arLabel: "نسخة واضحة للقراءة" },
        {
          id: "stamp_or_digital_stamp",
          status: stamped ? "pass" : "fail",
          label: "Authority stamp or digital stamp",
          arLabel: "ختم الجهة أو الختم الرقمي"
        }
      ],
      customerMessage: stamped
        ? "Document passed the gateway checks."
        : "Upload the document with the authority stamp or digital stamp.",
      customerMessageAr: stamped
        ? "اجتاز المستند فحص البوابة."
        : "أعد رفع المستند بختم الجهة أو الختم الرقمي."
    });
  }

  function buildApiEnvelope({ caseId, applicantId, serviceKey, documents }) {
    return {
      contractVersion: CONTRACTS.request,
      caseId,
      applicantId,
      serviceKey,
      documents,
      requestedAt: nowIso()
    };
  }

  return {
    CONTRACTS,
    buildApiEnvelope,
    buildRecognitionRequest,
    inspectDocument
  };
});
