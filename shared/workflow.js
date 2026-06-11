window.ArrearsFlowShared = window.ArrearsFlowShared || {};

(function attachWorkflow(shared) {
  const SUBMISSIONS_KEY = "arrearsflow-submissions";
  const SNAPSHOTS_KEY = "arrearsflow-case-snapshots";
  const SEALS_KEY = "arrearsflow-approval-seals";
  const APPLICANT_MEMORY_KEY = "arrearsflow-applicant-memory";
  const CONTRACTS = {
    case: "case.v1",
    auditEvent: "audit-event.v1",
    documentVerification: "document-verification-result.v1",
    workerHealth: "worker-health.v1",
    caseSnapshot: "case-snapshot.v1",
    statusTransition: "status-transition.v1",
    approvalSeal: "approval-seal.v1",
    applicantMemory: "applicant-memory.v1",
    documentThread: "document-thread.v1"
  };

  const statusLabels = shared.statusLabels || {};

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function nowTime(locale) {
    return new Date().toLocaleTimeString(locale || "en-AE", { hour: "2-digit", minute: "2-digit" });
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readSubmissions() {
    return readJson(SUBMISSIONS_KEY, []);
  }

  function writeSubmissions(submissions) {
    writeJson(SUBMISSIONS_KEY, submissions.slice(0, 20));
  }

  function readSnapshots() {
    return readJson(SNAPSHOTS_KEY, {});
  }

  function writeSnapshots(snapshots) {
    writeJson(SNAPSHOTS_KEY, snapshots);
  }

  function readApprovalSeals() {
    return readJson(SEALS_KEY, []);
  }

  function readApplicantMemory() {
    return readJson(APPLICANT_MEMORY_KEY, null);
  }

  function saveApplicantMemory(memory) {
    const previous = readApplicantMemory() || {};
    const nextMemory = {
      contractVersion: CONTRACTS.applicantMemory,
      applicantId: memory.applicantId || previous.applicantId || `APP-${Date.now()}`,
      identityProvider: memory.identityProvider || previous.identityProvider || "customer-account",
      verification: {
        status: memory.verification?.status || previous.verification?.status || "account_active",
        providerSessionId: memory.verification?.providerSessionId || previous.verification?.providerSessionId || null,
        verifiedAt: memory.verification?.verifiedAt || previous.verification?.verifiedAt || null,
        assuranceLevel: memory.verification?.assuranceLevel || previous.verification?.assuranceLevel || "customer_account"
      },
      profile: {
        ...(previous.profile || {}),
        ...(memory.profile || {})
      },
      availableData: Array.isArray(memory.availableData) ? memory.availableData : previous.availableData || [],
      missingData: Array.isArray(memory.missingData) ? memory.missingData : previous.missingData || [],
      recentServices: Array.isArray(memory.recentServices) ? memory.recentServices : previous.recentServices || [],
      applicationIds: Array.from(new Set([...(previous.applicationIds || []), ...(memory.applicationIds || [])])),
      currentApplicationId: memory.currentApplicationId || previous.currentApplicationId || null,
      customerAccount: memory.customerAccount || previous.customerAccount || null,
      identityLinkEvents: Array.isArray(memory.identityLinkEvents) ? memory.identityLinkEvents : previous.identityLinkEvents || [],
      integrationNotes: {
        ...(previous.integrationNotes || {}),
        ...(memory.integrationNotes || {})
      },
      createdAt: previous.createdAt || memory.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    writeJson(APPLICANT_MEMORY_KEY, nextMemory);
    return nextMemory;
  }

  function saveApprovalSeal(seal) {
    const nextSeal = {
      contractVersion: CONTRACTS.approvalSeal,
      ...seal,
      savedAt: seal.savedAt || nowIso()
    };
    const seals = readApprovalSeals().filter((item) => item.stampId !== nextSeal.stampId);
    seals.unshift(nextSeal);
    writeJson(SEALS_KEY, seals.slice(0, 20));
    return nextSeal;
  }

  function getApprovalSeal(stampId) {
    const seals = readApprovalSeals();
    if (!stampId) return seals[0] || null;
    return seals.find((seal) => seal.stampId === stampId) || null;
  }

  function normalizeCase(caseData, overrides = {}) {
    return {
      ...clone(caseData),
      contractVersion: CONTRACTS.case,
      id: caseData.id,
      status: overrides.status || caseData.status || "draft",
      language: overrides.language || caseData.language || "ar",
      submittedAt: overrides.submittedAt || caseData.submittedAt || null,
      updatedAt: overrides.updatedAt || nowIso(),
      channel: overrides.channel || caseData.channel || "prototype",
      source: overrides.source || caseData.source || "demo",
      auditTrail: Array.isArray(caseData.auditTrail) ? clone(caseData.auditTrail) : []
    };
  }

  function appendAudit(caseData, event) {
    return {
      ...caseData,
      auditTrail: [
        ...(Array.isArray(caseData.auditTrail) ? caseData.auditTrail : []),
        {
          contractVersion: CONTRACTS.auditEvent,
          id: event.id || `AUD-${Date.now()}`,
          at: event.at || nowIso(),
          actor: event.actor || "system",
          action: event.action,
          actionAr: event.actionAr || event.action,
          status: event.status || caseData.status || "draft",
          requiresHumanApproval: Boolean(event.requiresHumanApproval),
          source: event.source || "coded-worker"
        }
      ]
    };
  }

  function saveSubmission(caseData, status, meta = {}) {
    const base = normalizeCase(caseData, {
      status,
      language: meta.language,
      submittedAt: caseData.submittedAt || meta.submittedAt || (status === "draft" ? null : nowIso()),
      updatedAt: nowIso(),
      channel: meta.channel || caseData.channel || "customer-prototype",
      source: meta.source || caseData.source || "customer"
    });
    const withAudit = appendAudit(base, {
      actor: meta.actor || "customer",
      action: meta.action || (status === "draft" ? "Draft saved" : "Application submitted"),
      actionAr: meta.actionAr || (status === "draft" ? "تم حفظ المسودة" : "تم إرسال الطلب"),
      status,
      requiresHumanApproval: status !== "draft",
      source: meta.auditSource || "customer-portal"
    });
    const existing = readSubmissions().filter((item) => item.id !== withAudit.id);
    existing.unshift(withAudit);
    writeSubmissions(existing);
    return withAudit;
  }

  function saveWorkspaceState(caseData, meta = {}) {
    const workspaceCase = normalizeCase(caseData, {
      status: meta.status || caseData.status || "draft",
      language: meta.language || caseData.language,
      submittedAt: caseData.submittedAt || null,
      updatedAt: nowIso(),
      channel: meta.channel || caseData.channel || "customer-prototype",
      source: meta.source || caseData.source || "customer"
    });
    const existing = readSubmissions().filter((item) => item.id !== workspaceCase.id);
    existing.unshift(workspaceCase);
    writeSubmissions(existing);
    return workspaceCase;
  }

  function updateSubmission(caseId, changes, auditEvent) {
    const submissions = readSubmissions();
    const index = submissions.findIndex((item) => item.id === caseId);
    if (index === -1) return null;
    let next = {
      ...submissions[index],
      ...changes,
      updatedAt: nowIso()
    };
    if (auditEvent) next = appendAudit(next, auditEvent);
    submissions[index] = next;
    writeSubmissions(submissions);
    return next;
  }

  function requireBankStatement(caseData) {
    return Boolean(caseData.existingLoans || caseData.employmentStatus !== "Employed");
  }

  function normalizeDocumentStatus(status, legacyStatus) {
    if (status) return status;
    if (legacyStatus === "valid") return "passed";
    if (legacyStatus === "invalid") return "needs_stamp";
    return "missing";
  }

  function documentResult(status, names, details = {}) {
    const statusMap = {
      passed: {
        status: "pass",
        detail: "Uploaded document passed the gateway checks.",
        arDetail: "اجتاز المستند المرفوع فحص البوابة."
      },
      needs_stamp: {
        status: "fail",
        detail: "Document is present but missing the required authority stamp or digital stamp.",
        arDetail: "المستند مرفق لكن ينقصه ختم الجهة أو الختم الرقمي المطلوب."
      },
      unreadable: {
        status: "fail",
        detail: "Document is present but not clear enough for reliable reading.",
        arDetail: "المستند مرفق لكنه غير واضح بما يكفي للقراءة الموثوقة."
      },
      stale: {
        status: "fail",
        detail: "Document is present but not recent enough for the gateway check.",
        arDetail: "المستند مرفق لكنه ليس حديثاً بما يكفي لفحص البوابة."
      },
      mismatch: {
        status: "fail",
        detail: "Document details do not match the application.",
        arDetail: "بيانات المستند لا تطابق بيانات الطلب."
      },
      salary_conflict: {
        status: "fail",
        detail: "Document salary information conflicts with the form.",
        arDetail: "بيانات الراتب في المستند تتعارض مع بيانات الطلب."
      },
      date_mismatch: {
        status: "fail",
        detail: "Document dates do not support the stated scenario.",
        arDetail: "تواريخ المستند لا تدعم الحالة المذكورة."
      },
      missing: {
        status: "fail",
        detail: "Required document is not available.",
        arDetail: "المستند المطلوب غير متوفر."
      }
    };
    const result = statusMap[status] || statusMap.missing;
    return {
      status: result.status,
      label: names.label,
      arLabel: names.arLabel,
      detail: details.detail || result.detail,
      arDetail: details.arDetail || result.arDetail,
      aiCallPoint: true
    };
  }

  function buildDocumentResults(caseData) {
    const incomeDocumentType = caseData.incomeDocumentType || "salary_certificate";
    const primaryNames = incomeDocumentType === "non_work_letter"
      ? {
        label: "Non-work letter from notary public",
        arLabel: "رسالة عدم عمل من كاتب العدل"
      }
      : {
        label: "Detailed recent salary certificate",
        arLabel: "شهادة راتب تفصيلية حديثة"
      };
    const docs = [
      documentResult(
        normalizeDocumentStatus(caseData.incomeDocumentStatus, caseData.salaryStatus),
        primaryNames
      )
    ];

    if (caseData.officialMissionCase) {
      docs.push(
        documentResult(
          normalizeDocumentStatus(caseData.missionLetterStatus),
          {
            label: "Official mission letter",
            arLabel: "شهادة المهمة الرسمية"
          }
        ),
        documentResult(
          normalizeDocumentStatus(caseData.passportStampStatus),
          {
            label: "Passport stamp",
            arLabel: "ختم جواز السفر"
          }
        )
      );
    }
    return docs;
  }

  function buildPlan(caseData) {
    const salary = Number(caseData.currentSalary || caseData.monthlyIncome || 0);
    const maxRepayment = Math.round(salary * 0.2);
    const baseMonths = Math.max(6, Math.ceil(Number(caseData.arrearsAmount || 0) / Math.max(maxRepayment, 1)));
    const durationMonths = Math.min(Math.max(baseMonths, 12), 48);
    const monthlyRepayment = Math.ceil(Number(caseData.arrearsAmount || 0) / durationMonths);
    return { maxRepayment, durationMonths, monthlyRepayment };
  }

  function buildRuleResults(caseData, plan, docs) {
    const docFailures = docs.filter((doc) => doc.status === "fail").length;
    const obligationRatio = Number(caseData.monthlyObligations || 0) / Math.max(Number(caseData.monthlyIncome || 0), 1);
    const monthlyRepaymentAr = Number(plan.monthlyRepayment || 0).toLocaleString("ar-AE");
    const maxRepaymentAr = Number(plan.maxRepayment || 0).toLocaleString("ar-AE");
    return [
      {
        id: "RULE-20PCT",
        label: "Repayment should not exceed 20% of monthly salary",
        arLabel: "يجب ألا يتجاوز السداد ٢٠٪ من الراتب الشهري",
        status: plan.monthlyRepayment <= plan.maxRepayment ? "pass" : "fail",
        calculation: `${plan.monthlyRepayment} AED <= ${plan.maxRepayment} AED`,
        arCalculation: `${monthlyRepaymentAr} درهم <= ${maxRepaymentAr} درهم`,
        reason: plan.monthlyRepayment <= plan.maxRepayment ? "Recommended repayment is within the policy threshold." : "Recommended repayment exceeds the policy threshold.",
        arReason: plan.monthlyRepayment <= plan.maxRepayment ? "قيمة السداد المقترحة ضمن حد السياسة." : "قيمة السداد المقترحة تتجاوز حد السياسة."
      },
      {
        id: "RULE-DOCS",
        label: "Required documents must be complete",
        arLabel: "يجب استكمال المستندات المطلوبة",
        status: docFailures === 0 ? "pass" : "fail",
        calculation: `${docFailures} blocking document issue(s)`,
        arCalculation: `${Number(docFailures).toLocaleString("ar-AE")} مشكلة مستندية مانعة`,
        reason: docFailures === 0 ? "No blocking document issue detected." : "Case cannot proceed without corrected documents.",
        arReason: docFailures === 0 ? "لا توجد مشكلة مستندية مانعة." : "لا يمكن متابعة الحالة دون تصحيح المستندات."
      },
      {
        id: "RULE-OBLIGATIONS",
        label: "Financial obligations should be reviewed when high",
        arLabel: "يجب مراجعة الالتزامات المالية عند ارتفاعها",
        status: obligationRatio > 0.65 ? "warn" : "pass",
        calculation: `${Math.round(obligationRatio * 100)}% obligation-to-income ratio`,
        arCalculation: `${Number(Math.round(obligationRatio * 100)).toLocaleString("ar-AE")}٪ نسبة الالتزامات إلى الدخل`,
        reason: obligationRatio > 0.65 ? "High obligations require officer attention." : "Declared obligations are within ordinary review range.",
        arReason: obligationRatio > 0.65 ? "الالتزامات المرتفعة تتطلب انتباه الموظف." : "الالتزامات المعلنة ضمن نطاق المراجعة الاعتيادي."
      }
    ];
  }

  function classifyRisk(caseData, docs, rules) {
    const hasFail = docs.some((doc) => doc.status === "fail") || rules.some((rule) => rule.status === "fail");
    const highObligations = Number(caseData.monthlyObligations || 0) / Math.max(Number(caseData.monthlyIncome || 0), 1) > 0.65;
    const exceptional = Number(caseData.arrearsAmount || 0) >= 90000 || Number(caseData.monthsDelayed || 0) >= 18 || caseData.employmentStatus !== "Employed";
    if (hasFail) return { key: "missing", label: "Missing information", ar: "معلومات ناقصة", tone: "warn" };
    if (highObligations || exceptional) return { key: "high", label: "High-risk review", ar: "مراجعة عالية المخاطر", tone: "fail" };
    return { key: "ready", label: "Ready for officer review", ar: "جاهزة لمراجعة الموظف", tone: "pass" };
  }

  function buildRecommendation(plan, risk) {
    if (risk.key === "missing") {
      return {
        durationMonths: null,
        monthlyRepayment: null,
        nextAction: "Request corrected documents",
        arNextAction: "طلب تصحيح المستندات",
        rationale: "Deterministic checks found missing or invalid required evidence. Officer should request corrected documents before approving a plan.",
        arRationale: "رصدت الفحوصات المحددة مستندات مطلوبة ناقصة أو غير صحيحة. يجب طلب التصحيح قبل اعتماد أي خطة."
      };
    }
    if (risk.key === "high") {
      return {
        durationMonths: plan.durationMonths,
        monthlyRepayment: plan.monthlyRepayment,
        nextAction: "Escalate for exceptional review",
        arNextAction: "تصعيد لمراجعة استثنائية",
        rationale: "A possible plan was prepared, but obligations, arrears size, or employment status require human review.",
        arRationale: "تم إعداد خطة محتملة، لكن الالتزامات أو حجم المتأخرات أو الحالة الوظيفية تتطلب مراجعة بشرية."
      };
    }
    return {
      durationMonths: plan.durationMonths,
      monthlyRepayment: plan.monthlyRepayment,
      nextAction: "Officer review and digital approval seal",
      arNextAction: "مراجعة الموظف وختم الاعتماد الرقمي",
      rationale: "The proposed plan stays within the 20% salary threshold and balances arrears recovery with declared obligations.",
      arRationale: "الخطة المقترحة ضمن حد ٢٠٪ من الراتب وتوازن بين تحصيل المتأخرات والالتزامات المعلنة."
    };
  }

  function riskFromAssessment(result) {
    const path = result.recommendation.recommendationPath;
    const map = {
      ready_for_trustgate: {
        key: "ready",
        label: "Ready for TrustGate authorization",
        ar: "جاهزة لتفويض TrustGate",
        tone: "pass"
      },
      request_documents: {
        key: "missing",
        label: "Additional information required",
        ar: "مطلوب استكمال معلومات",
        tone: "warn"
      },
      reject_due_active_request: {
        key: "active_request",
        label: "Active request found",
        ar: "يوجد طلب قائم",
        tone: "fail"
      },
      refer_human_review: {
        key: "human_review",
        label: "Human review required",
        ar: "مطلوب مراجعة بشرية",
        tone: "fail"
      }
    };
    return map[path] || { key: "review", label: "Officer review required", ar: "مطلوب مراجعة الموظف", tone: "warn" };
  }

  function documentStatusForUi(document) {
    if (document.passed) return "pass";
    if (document.missing) return "fail";
    return "warn";
  }

  function auditActionLabel(action) {
    const labels = {
      case_received: { en: "Case received", ar: "تم استلام الطلب" },
      uae_pass_simulated_profile_loaded: { en: "Verified profile loaded", ar: "تم تحميل ملف الهوية الموثق" },
      programme_loan_data_retrieved: { en: "Programme loan data retrieved", ar: "تم جلب بيانات قرض البرنامج" },
      documents_checked: { en: "Documents checked", ar: "تم فحص المستندات" },
      active_request_checked: { en: "Active request checked", ar: "تم فحص وجود طلب قائم" },
      financial_capacity_calculated: { en: "Financial capacity calculated", ar: "تم احتساب القدرة المالية" },
      policy_rules_applied: { en: "Policy rules applied", ar: "تم تطبيق قواعد السياسة" },
      recommendation_produced: { en: "Recommendation prepared", ar: "تم تجهيز التوصية" },
      trustgate_required_checked: { en: "Human authorization boundary checked", ar: "تم فحص حدود الاعتماد البشري" }
    };
    return labels[action] || { en: action.replaceAll("_", " "), ar: action.replaceAll("_", " ") };
  }

  function buildReviewFromAssessment(caseData, assessment, options) {
    const locale = options.locale || "en-AE";
    const docs = assessment.documents.requiredDocuments.map((doc) => ({
      status: documentStatusForUi(doc),
      label: doc.label,
      arLabel: doc.arLabel,
      detail: doc.passed
        ? "Document passed deterministic completeness checks."
        : doc.missing ? "Required document is missing." : "Document requires correction before approval.",
      arDetail: doc.passed
        ? "اجتاز المستند فحوصات الاكتمال المحددة."
        : doc.missing ? "المستند المطلوب غير مرفق." : "يحتاج المستند إلى تصحيح قبل الاعتماد.",
      aiCallPoint: false
    }));
    const risk = riskFromAssessment(assessment);
    const recommendation = {
      durationMonths: assessment.financialStudy.proposedReschedulingMonths,
      monthlyRepayment: assessment.financialStudy.proposedMonthlyInstallment,
      nextAction: assessment.recommendation.recommendationLabel,
      arNextAction: assessment.recommendation.recommendationLabelAr,
      rationale: assessment.recommendation.reasoningBullets.join(" "),
      arRationale: assessment.recommendation.reasoningBulletsAr.join(" ")
    };
    const auditLog = assessment.auditEvents.map((event) => ({
      time: new Date(event.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
      text: `${auditActionLabel(event.action).en}: ${event.reason}`,
      ar: `${auditActionLabel(event.action).ar}.`
    }));

    return {
      docs,
      rules: assessment.policy.ruleTrace,
      risk,
      recommendation,
      auditLog,
      officerActions: Array.isArray(options.officerActions) ? clone(options.officerActions) : [],
      workerHealth: {
        contractVersion: CONTRACTS.workerHealth,
        status: "ready",
        builtAt: nowIso(),
        deterministicWorkers: [
          "programme_loan_data",
          "document_completeness",
          "financial_capacity",
          "rescheduling_policy",
          "recommendation",
          "confidence",
          "audit"
        ],
        aiCallPoint: "not_needed"
      },
      documentVerification: {
        contractVersion: CONTRACTS.documentVerification,
        status: assessment.documents.documentCompletenessStatus === "complete"
          ? "deterministic_check_complete"
          : "document_correction_required",
        confidence: assessment.confidence.score,
        reviewMode: "deterministic_financial_study_engine",
        aiUsed: false,
        documents: docs.map((doc) => ({
          label: doc.label,
          arLabel: doc.arLabel,
          status: doc.status,
          aiCallPoint: doc.aiCallPoint
        }))
      },
      financialStudy: assessment.financialStudy,
      assessmentResult: assessment.assessmentResult,
      programmeLoan: assessment.programmeLoan,
      documentCompleteness: assessment.documents,
      capacity: assessment.capacity,
      policy: assessment.policy,
      confidence: assessment.confidence
    };
  }

  function buildReview(caseData, options = {}) {
    if (shared.assessmentOrchestrator?.assess) {
      return buildReviewFromAssessment(caseData, shared.assessmentOrchestrator.assess(caseData), options);
    }

    const locale = options.locale || "en-AE";
    const plan = buildPlan(caseData);
    const docs = buildDocumentResults(caseData);
    const rules = buildRuleResults(caseData, plan, docs);
    const risk = classifyRisk(caseData, docs, rules);
    const recommendation = buildRecommendation(plan, risk);
    const aiReviewNeeded = docs.some((doc) => doc.aiCallPoint && doc.status !== "fail");
    const auditLog = [
      { time: nowTime(locale), text: "Intake Normalizer Worker prepared a stable case record.", ar: "جهز عامل تنظيم الاستقبال سجل حالة ثابتاً." },
      { time: nowTime(locale), text: "Required Documents Worker checked income proof, stamp, and conditional mission documents.", ar: "تحقق عامل المستندات المطلوبة من إثبات الدخل والختم والمستندات الشرطية للمهمة الرسمية." },
      { time: nowTime(locale), text: "Eligibility Rules Worker evaluated repayment against the 20% salary threshold.", ar: "قيّم عامل قواعد الأهلية السداد مقابل حد ٢٠٪ من الراتب." },
      { time: nowTime(locale), text: `Risk Review Worker classified case as ${risk.label}.`, ar: `صنّف عامل مراجعة المخاطر الحالة: ${risk.ar}.` },
      { time: nowTime(locale), text: aiReviewNeeded ? "AI specialist call point prepared for document authenticity review." : "No AI specialist call is needed before officer review.", ar: aiReviewNeeded ? "تم تجهيز نقطة استدعاء الذكاء الاصطناعي لمراجعة موثوقية المستندات." : "لا توجد حاجة لاستدعاء ذكاء اصطناعي قبل مراجعة الموظف." },
      { time: nowTime(locale), text: "Audit Worker recorded the decision path for human review.", ar: "سجل عامل التدقيق مسار القرار للمراجعة البشرية." }
    ];
    return {
      docs,
      rules,
      risk,
      recommendation,
      auditLog,
      officerActions: Array.isArray(options.officerActions) ? clone(options.officerActions) : [],
      workerHealth: {
        contractVersion: CONTRACTS.workerHealth,
        status: "ready",
        builtAt: nowIso(),
        deterministicWorkers: ["intake_normalizer", "required_documents", "eligibility_rules", "routing", "status_snapshot", "audit"],
        aiCallPoint: aiReviewNeeded ? "document_authenticity_review" : "not_needed"
      },
      documentVerification: {
        contractVersion: CONTRACTS.documentVerification,
        status: aiReviewNeeded ? "ai_specialist_recommended" : "deterministic_check_complete",
        confidence: null,
        reviewMode: aiReviewNeeded ? "specialist_authenticity_review_point" : "deterministic_gateway_check",
        aiUsed: false,
        documents: docs.map((doc) => ({
          label: doc.label,
          arLabel: doc.arLabel,
          status: doc.status,
          aiCallPoint: doc.aiCallPoint
        }))
      }
    };
  }

  function buildCaseSnapshot(caseData, review = buildReview(caseData), source = "prepared_snapshot") {
    return {
      contractVersion: CONTRACTS.caseSnapshot,
      caseId: caseData.id,
      snapshotType: "officer_case_brief",
      builtAt: nowIso(),
      freshness: { stale: false, source },
      source,
      workerStatus: review.workerHealth.status,
      aiUsed: Boolean(review.documentVerification.aiUsed),
      aiCallPoint: review.workerHealth.aiCallPoint,
      confidence: review.documentVerification.confidence,
      requiresHumanApproval: true,
      status: caseData.status || "officer_review",
      risk: review.risk,
      recommendation: review.recommendation,
      financialStudy: review.financialStudy || null,
      assessmentResult: review.assessmentResult || null,
      programmeLoan: review.programmeLoan || null,
      documentCompleteness: review.documentCompleteness || null,
      capacity: review.capacity || null,
      policy: review.policy || null,
      evidenceRefs: review.docs.map((doc) => doc.label),
      nextActions: [
        review.recommendation.nextAction,
        "Officer approval, rejection, or more-information request"
      ],
      review
    };
  }

  function saveSnapshot(caseId, snapshot) {
    const snapshots = readSnapshots();
    snapshots[caseId] = snapshot;
    writeSnapshots(snapshots);
    return snapshot;
  }

  function getSnapshot(caseId) {
    return readSnapshots()[caseId] || null;
  }

  function labelStatus(status, lang) {
    const label = statusLabels[status] || statusLabels.draft || { en: "Draft", ar: "مسودة" };
    return lang === "ar" ? label.ar : label.en;
  }

  shared.workflow = {
    SUBMISSIONS_KEY,
    SNAPSHOTS_KEY,
    SEALS_KEY,
    APPLICANT_MEMORY_KEY,
    CONTRACTS,
    appendAudit,
    buildCaseSnapshot,
    buildDocumentResults,
    buildReview,
    getSnapshot,
    getApprovalSeal,
    labelStatus,
    normalizeCase,
    readApplicantMemory,
    readApprovalSeals,
    readSubmissions,
    requireBankStatement,
    saveApprovalSeal,
    saveApplicantMemory,
    saveSnapshot,
    saveSubmission,
    saveWorkspaceState,
    updateSubmission
  };
})(window.ArrearsFlowShared);
