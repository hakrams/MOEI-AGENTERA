const runtimeConfig = window.ArrearsFlowRuntimeConfig || {};
const identityProviderConfig = runtimeConfig.identityProvider || {};
const TRUSTGATE_BASE_URL = identityProviderConfig.baseUrl || runtimeConfig.trustGateBaseUrl || "http://127.0.0.1:9715/";
const AUTH_PROVIDER_NAME = identityProviderConfig.name || "TrustGate";
const TRUSTGATE_APPROVAL_PENDING_KEY = "arrearsflow-pending-trustgate-approval";
const TRUSTGATE_APPROVAL_CONSUMED_KEY = "arrearsflow-consumed-trustgate-results";
const TRUSTGATE_RESULT_VERSION = "trustgate-result.v1";
const TRUSTGATE_REQUIRED_PRIVILEGE = "seal.stamp";
const OFFICE_LOGIN_SESSION_KEY = "arrearsflow-office-trustgate-session";
const OFFICE_LOGIN_SESSION_VERSION = "moei-office-session.v1";
const OFFICE_LOGIN_REQUIRED_PRIVILEGE = "office.login";
const OFFICE_LOGIN_SESSION_TTL_MINUTES = 45;
const APPROVAL_ACTION = "Approve housing arrears rescheduling recommendation";
const APPROVAL_CONTRACT_VERSION = "moei-trustgate-approval.v1";
const OFFICIAL_APPROVER = {
  subjectId: "TRUSTGATE-OFFICIAL-7190",
  name: "Mariam Al Ketbi",
  nameAr: "مريم الكتبي",
  role: "Finance Collection Officer / Approver",
  roleAr: "مسؤولة التحصيل المالي والاعتماد"
};
const SUBMISSIONS_KEY = "arrearsflow-submissions";

const shared = window.ArrearsFlowShared || {};
const mockCases = (shared.cases || []).map((item) => ({ ...structuredClone(item), source: "mock" }));
const workflow = shared.workflow || null;
const liveApi = shared.liveApi || null;

const i18n = {
  ar: {
    "brand.mark": "وزارة",
    "brand.title": "منصة متأخرات الإسكان",
    "brand.subtitle": "مساحة عمل موظف وزارة الطاقة والبنية التحتية",
    "nav.intake": "استقبال الطلب",
    "nav.system": "مراجعة النظام",
    "nav.officer": "لوحة الموظف",
    "nav.audit": "سجل التدقيق",
    "nav.modules": "وحدات المنصة",
    "principle.label": "المبدأ",
    "principle.copy": "الذكاء الاصطناعي يوصي. الموظف المعتمد هو من يعتمد.",
    "auth.title": "تسجيل الدخول إلى مساحة الموظف",
    "auth.copy": "استخدم TrustGate للتحقق من حساب لديه صلاحية دخول مساحة الموظف قبل عرض الحالات.",
    "auth.action": "الدخول عبر TrustGate",
    "auth.requiredPrivilege": "يتطلب صلاحية دخول مساحة الموظف",
    "auth.stampNote": "اعتماد الختم الرقمي يبقى خطوة منفصلة ويتطلب صلاحية الختم.",
    "auth.failed": "لم يكتمل تسجيل دخول الموظف عبر TrustGate.",
    "auth.badPrivilege": "حساب TrustGate لا يملك صلاحية دخول مساحة الموظف.",
    "auth.signedIn": "تم الدخول عبر TrustGate",
    "auth.verifiedWith": "تم التحقق من صلاحية الموظف",
    "auth.logout": "تسجيل الخروج",
    "top.eyebrow": "وحدة متأخرات الإسكان",
    "top.title": "نظام إعادة جدولة متأخرات الإسكان",
    "wayfinding.officeHome": "العودة إلى مساحة عمل الموظف",
    "metric.currentLabel": "الوضع الحالي",
    "metric.currentValue": "٥ أيام عمل",
    "metric.targetLabel": "الهدف",
    "metric.targetValue": "توصية فورية",
    "metric.controlLabel": "التحكم",
    "metric.controlValue": "اعتماد الموظف",
    "intake.title": "قائمة الطلبات الواردة",
    "intake.copy": "اختيار طلب وارد من بوابة المتعامل. يجهز النظام دراسة الحالة تلقائياً ثم يعرضها للموظف للاعتماد النهائي.",
    "intake.caseLabel": "قائمة العمل",
    "intake.portalCaseLabel": "وارد من بوابة المتعامل",
    "intake.demoCaseLabel": "حالة تدريبية",
    "intake.queueStats": "طلبات واردة: {portal} · حالات تدريبية: {demo}",
    "intake.queueHint": "حدد طلباً من قائمة العمل؛ تتم مراجعة النظام تلقائياً قبل اعتماد الموظف.",
    "intake.requirements": "قائمة المتطلبات",
    "intake.statement": "إفادة المتعامل",
    "intake.autoPreparedTitle": "مراجعة مجهزة تلقائياً",
    "intake.autoPreparedCopy": "هذه البيانات متاحة للقراءة والتدقيق. النظام يجهز الفحص والتوصية دون أن يضغط الموظف على خطوات تشغيل داخلية.",
    "field.applicantName": "اسم المتعامل",
    "field.emiratesId": "رقم الهاتف الموثق",
    "field.arrearsAmount": "قيمة المتأخرات (درهم)",
    "field.monthsDelayed": "عدد أشهر التأخر",
    "field.monthlyIncome": "الدخل الشهري (درهم)",
    "field.monthlyObligations": "الالتزامات الشهرية (درهم)",
    "field.dependents": "عدد أفراد الأسرة",
    "field.employmentStatus": "الحالة الوظيفية",
    "field.reason": "سبب طلب إعادة الجدولة",
    "field.existingLoans": "المتعامل يقر بوجود قروض أو التزامات رئيسية",
    "field.salaryCertificate": "شهادة الراتب",
    "field.bankStatement": "كشف الحساب البنكي",
    "action.refreshReview": "تحديث التوصية المجهزة",
    "action.sendOfficer": "عرض لوحة الموظف",
    "action.approve": "اعتماد بالختم الرقمي",
    "action.moreInfo": "طلب معلومات إضافية",
    "action.escalate": "تصعيد",
    "system.title": "مراجعة النظام",
    "system.copy": "مسار شفاف يبين ما جهزه النظام تلقائياً: تنظيم الطلب، فحص المستندات، تطبيق القواعد، وتجهيز التوصية.",
    "system.facts": "البيانات المستخرجة",
    "system.documents": "التحقق من المستندات",
    "system.recommendation": "التوصية",
    "system.rules": "مسار قواعد السياسة",
    "system.log": "سجل إجراءات النظام",
    "system.aiSpecialistTitle": "نقطة استدعاء الذكاء الاصطناعي المتخصص",
    "system.aiSpecialistCopy": "يتم استخدام الذكاء الاصطناعي فقط عند الحاجة إلى مراجعة موثوقية المستندات أو الغموض الصعب. القواعد والحالة والاعتماد تبقى محددة ومضبوطة.",
    "system.aiSpecialistStatus": "مضبوطة ومحدودة",
    "system.preparedLabel": "مجهز تلقائياً",
    "system.preparedCopy": "هذه شاشة اطلاع على خطوات النظام. لا يحتاج الموظف إلى تشغيل كل خطوة؛ دوره هو مراجعة النتيجة النهائية واعتمادها أو طلب إجراء مناسب.",
    "officer.title": "لوحة الموظف",
    "officer.copy": "يراجع الموظف التوصية المجهزة ويتحكم فقط في الإجراء النهائي: اعتماد، طلب معلومات، أو تصعيد.",
    "officer.queue": "قائمة الحالات",
    "officer.selected": "الحالة المختارة",
    "officer.evidence": "الأدلة والقواعد",
    "officer.sourcePortal": "بوابة المتعامل",
    "officer.sourceDemo": "تجريبية",
    "audit.title": "سجل التدقيق",
    "audit.copy": "سجل القرار النهائي وختم الاعتماد ومسار القواعد وتاريخ الإجراءات.",
    "audit.record": "سجل القرار المختوم",
    "audit.trail": "سجل التدقيق الكامل",
    "modules.title": "وحدات المنصة",
    "modules.copy": "متأخرات الإسكان هي الوحدة العاملة، والوحدات الأخرى معاينات توسعية.",
    "modules.active": "الوحدة النشطة",
    "modules.preview": "معاينة توسعية",
    "modules.housing": "متأخرات الإسكان",
    "modules.housingCopy": "التحقق من المستندات، فحص القواعد، توصية إعادة الجدولة، واعتماد الموظف.",
    "modules.country": "معلومات الدول والقطاعات",
    "modules.countryCopy": "ملف دولة من مصادر موثوقة، تصفية حسب قطاعات الوزارة، ونقاط حديث تنفيذية.",
    "modules.omni": "الاستقبال متعدد القنوات",
    "modules.omniCopy": "سياق موحد للمتعامل، نموذج ديناميكي، استخراج المستندات، وتوجيه للأنظمة الخلفية.",
    "seal.eyebrow": "ختم الاعتماد الرقمي الديناميكي",
    "seal.title": "اعتماد مرتبط بالإجراء",
    "seal.codeLabel": "طلب عبر TrustGate",
    "seal.challengeCopy": "يتحقق الجهاز الموثوق من الحالة والموظف والإجراء وبصمة البيانات قبل إصدار الختم.",
    "seal.enterCode": "نتيجة الاعتماد",
    "seal.verify": "فتح TrustGate",
    "language.toggle": "English",
    "aria.officeSections": "أقسام مساحة العمل",
    "aria.serviceMetrics": "مؤشرات الخدمة",
    "aria.closeApprovalModal": "إغلاق نافذة الاعتماد",
    "aria.approvalChallenge": "تسليم الاعتماد إلى TrustGate"
  },
  en: {
    "brand.mark": "AF",
    "brand.title": "ArrearsFlow",
    "brand.subtitle": "MOEI Officer Workspace",
    "nav.intake": "Intake",
    "nav.system": "System Review",
    "nav.officer": "Officer Dashboard",
    "nav.audit": "Audit Record",
    "nav.modules": "Platform Modules",
    "principle.label": "Principle",
    "principle.copy": "The AI recommends. The verified officer authorizes.",
    "auth.title": "Sign in to officer workspace",
    "auth.copy": "Use TrustGate to verify an account with office access before viewing cases.",
    "auth.action": "Sign in with TrustGate",
    "auth.requiredPrivilege": "Requires office.login privilege",
    "auth.stampNote": "Digital seal approval stays separate and still requires seal.stamp privilege.",
    "auth.failed": "TrustGate officer login was not completed.",
    "auth.badPrivilege": "This TrustGate account does not have officer workspace access.",
    "auth.signedIn": "Signed in with TrustGate",
    "auth.verifiedWith": "Officer privilege verified",
    "auth.logout": "Logout",
    "top.eyebrow": "Housing Arrears Module",
    "top.title": "Housing Arrears Rescheduling System",
    "wayfinding.officeHome": "Back to Officer Workspace",
    "metric.currentLabel": "Current",
    "metric.currentValue": "5 working days",
    "metric.targetLabel": "Target",
    "metric.targetValue": "Instant recommendation",
    "metric.controlLabel": "Control",
    "metric.controlValue": "Officer seal",
    "intake.title": "Incoming Case Queue",
    "intake.copy": "Select a customer portal request. The system prepares the case study automatically, then presents it for final officer authorization.",
    "intake.caseLabel": "Work queue",
    "intake.portalCaseLabel": "Customer portal intake",
    "intake.demoCaseLabel": "Training case",
    "intake.queueStats": "Portal requests: {portal} · Training cases: {demo}",
    "intake.queueHint": "Choose a work-queue item; system review is prepared automatically before officer authorization.",
    "intake.requirements": "Requirement Checklist",
    "intake.statement": "Applicant statement",
    "intake.autoPreparedTitle": "Review prepared automatically",
    "intake.autoPreparedCopy": "These details are available for inspection. The system prepares checks and recommendation without making the officer click through internal worker steps.",
    "field.applicantName": "Applicant name",
    "field.emiratesId": "Verified phone",
    "field.arrearsAmount": "Arrears amount (AED)",
    "field.monthsDelayed": "Months delayed",
    "field.monthlyIncome": "Monthly income (AED)",
    "field.monthlyObligations": "Monthly obligations (AED)",
    "field.dependents": "Dependents",
    "field.employmentStatus": "Employment status",
    "field.reason": "Reason for rescheduling",
    "field.existingLoans": "Applicant declares existing loans or major obligations",
    "field.salaryCertificate": "Salary certificate",
    "field.bankStatement": "Bank statement",
    "action.refreshReview": "Refresh Prepared Recommendation",
    "action.sendOfficer": "View Officer Dashboard",
    "action.approve": "Approve With Digital Seal",
    "action.moreInfo": "Request More Info",
    "action.escalate": "Escalate",
    "system.title": "System Review",
    "system.copy": "Transparent workflow steps show what the system prepared automatically: structure, document checks, policy rules, and recommendation.",
    "system.facts": "Extracted Facts",
    "system.documents": "Document Validation",
    "system.recommendation": "Recommendation",
    "system.rules": "Policy Rule Trace",
    "system.log": "System Action Log",
    "system.aiSpecialistTitle": "AI Specialist Call Point",
    "system.aiSpecialistCopy": "AI is reserved for document authenticity or hard ambiguity. Rules, status movement, and final approval stay deterministic and controlled.",
    "system.aiSpecialistStatus": "Controlled boundary",
    "system.preparedLabel": "Prepared automatically",
    "system.preparedCopy": "This is an inspection screen for the system trace. The officer does not run every worker step; the officer reviews the prepared result and authorizes or redirects the final action.",
    "officer.title": "Officer Dashboard",
    "officer.copy": "Officer reviews the prepared recommendation and controls only the final action: approve, request information, or escalate.",
    "officer.queue": "Case Queue",
    "officer.selected": "Selected Case",
    "officer.evidence": "Evidence And Rules",
    "officer.sourcePortal": "Customer portal",
    "officer.sourceDemo": "Demo",
    "audit.title": "Audit Record",
    "audit.copy": "Final decision record, seal, rule trace, and action history.",
    "audit.record": "Stamped Decision Record",
    "audit.trail": "Complete Audit Trail",
    "modules.title": "Platform Modules",
    "modules.copy": "Housing Arrears is the working module. The other modules are extension previews.",
    "modules.active": "Active module",
    "modules.preview": "Extension preview",
    "modules.housing": "Housing Arrears",
    "modules.housingCopy": "Document validation, rule checks, rescheduling recommendation, officer seal.",
    "modules.country": "Country Intelligence",
    "modules.countryCopy": "Trusted-source country brief, MOEI sector filter, executive talking points.",
    "modules.omni": "Omnichannel Intake",
    "modules.omniCopy": "Shared customer context, dynamic form, document extraction, backend routing.",
    "seal.eyebrow": "Dynamic Digital Approval Seal",
    "seal.title": "Transaction-bound approval",
    "seal.codeLabel": "TrustGate request",
    "seal.challengeCopy": "The trusted device confirms the case, officer, action, and payload hash before the seal is issued.",
    "seal.enterCode": "Approval result",
    "seal.verify": "Open TrustGate",
    "language.toggle": "العربية",
    "aria.officeSections": "Office sections",
    "aria.serviceMetrics": "Service metrics",
    "aria.closeApprovalModal": "Close approval modal",
    "aria.approvalChallenge": "TrustGate approval handoff"
  }
};

const optionText = {
  employment: {
    ar: [["Employed", "موظف"], ["Salary reduced", "تم تخفيض الراتب"], ["Unemployed", "غير موظف"]],
    en: [["Employed", "Employed"], ["Salary reduced", "Salary reduced"], ["Unemployed", "Unemployed"]]
  },
  salary: {
    ar: [["valid", "صحيحة ومصدقة"], ["invalid", "مرفقة وغير صحيحة"], ["missing", "غير مرفقة"]],
    en: [["valid", "Valid and attested"], ["invalid", "Present but invalid"], ["missing", "Missing"]]
  },
  bank: {
    ar: [["valid", "صحيح"], ["invalid", "مرفق وغير صحيح"], ["missing", "غير مرفق"], ["not_required", "غير مطلوب"]],
    en: [["valid", "Valid"], ["invalid", "Present but invalid"], ["missing", "Missing"], ["not_required", "Not required"]]
  }
};

let state = {
  lang: new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("arrearsflow-lang") || "ar",
  selectedCase: mockCases[0] ? structuredClone(mockCases[0]) : null,
  liveOfficeCases: [],
  liveQueueNotice: "",
  review: null,
  seal: null,
  approvalNotice: "",
  officeSession: null,
  officeLoginNotice: "",
  screen: "intake"
};

const $ = (id) => document.getElementById(id);
const t = (key) => i18n[state.lang][key] || key;
const money = (value) => {
  const amount = Number(value).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-AE");
  return state.lang === "ar" ? `${amount} درهم` : `${amount} AED`;
};
const pct = (value) => {
  const number = Number(value || 0).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-AE", { maximumFractionDigits: 1 });
  return state.lang === "ar" ? `${number}٪` : `${number}%`;
};
const nowTime = () => new Date().toLocaleTimeString(state.lang === "ar" ? "ar-AE" : "en-AE", { hour: "2-digit", minute: "2-digit" });
const dual = (en, ar) => `<span>${state.lang === "ar" ? ar || en : en}</span>`;
const displayName = (caseData) => state.lang === "ar" ? caseData.applicantNameAr || caseData.applicantName : caseData.applicantName;
const displayReason = (caseData) => state.lang === "ar" ? caseData.reasonAr || caseData.reason : caseData.reason;
const displayRuleCode = (id) => {
  const labels = {
    "RULE-20PCT": { ar: "قاعدة حد السداد", en: "RULE-20PCT" },
    "RULE-ACTIVE-REQUEST": { ar: "قاعدة الطلب القائم", en: "RULE-ACTIVE-REQUEST" },
    "RULE-DOCUMENTS": { ar: "قاعدة اكتمال المستندات", en: "RULE-DOCUMENTS" },
    "RULE-DOCS": { ar: "قاعدة اكتمال المستندات", en: "RULE-DOCS" },
    "RULE-OBLIGATIONS": { ar: "قاعدة الالتزامات", en: "RULE-OBLIGATIONS" },
    "RULE-PERIOD": { ar: "قاعدة مدة السداد", en: "RULE-PERIOD" },
    "RULE-FAMILY-CAPACITY": { ar: "قاعدة قدرة الأسرة", en: "RULE-FAMILY-CAPACITY" },
    "RULE-INCOME-STABILITY": { ar: "قاعدة استقرار الدخل", en: "RULE-INCOME-STABILITY" }
  };
  return labels[id]?.[state.lang] || id;
};
const displayRuleCalculation = (rule) => state.lang === "ar" ? rule.arCalculation || rule.calculation : rule.calculation;
const displayWorkerStatus = (status) => {
  const labels = {
    ready: { ar: "جاهز", en: "ready" },
    missing: { ar: "غير متوفر", en: "missing" },
    failed: { ar: "تعذر التجهيز", en: "failed" }
  };
  return labels[status]?.[state.lang] || status;
};
const displayFreshness = (freshness) => {
  if (!freshness) return state.lang === "ar" ? "غير محددة" : "unknown";
  return freshness.stale
    ? (state.lang === "ar" ? "تحتاج تحديثاً" : "stale")
    : (state.lang === "ar" ? "حديثة" : "fresh");
};
const displayEscalationReason = (reason) => {
  const labels = {
    "High obligations ratio": { ar: "ارتفاع نسبة الالتزامات", en: "High obligations ratio" },
    "Low average income per family member": { ar: "انخفاض متوسط الدخل لكل فرد من الأسرة", en: "Low average income per family member" },
    "Unstable or reduced income": { ar: "عدم استقرار الدخل أو انخفاضه", en: "Unstable or reduced income" },
    "20 percent salary cap is not met": { ar: "عدم استيفاء حد ٢٠٪ من الراتب", en: "20 percent salary cap is not met" },
    "Proposed schedule exceeds repayment-period boundary": { ar: "المدة المقترحة تتجاوز حد مدة السداد", en: "Proposed schedule exceeds repayment-period boundary" },
    "Existing active rescheduling request": { ar: "وجود طلب إعادة جدولة قائم", en: "Existing active rescheduling request" }
  };
  return labels[reason]?.[state.lang] || reason;
};
const shortHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
};
const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function decodeBase64UrlJson(value) {
  if (!value) throw new Error("Missing TrustGate result payload.");
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function readPendingTrustGateApproval() {
  try {
    return JSON.parse(sessionStorage.getItem(TRUSTGATE_APPROVAL_PENDING_KEY) || "null");
  } catch {
    return null;
  }
}

function writePendingTrustGateApproval(pending) {
  sessionStorage.setItem(TRUSTGATE_APPROVAL_PENDING_KEY, JSON.stringify(pending));
}

function clearPendingTrustGateApproval() {
  sessionStorage.removeItem(TRUSTGATE_APPROVAL_PENDING_KEY);
}

function readConsumedTrustGateApprovals() {
  try {
    return JSON.parse(localStorage.getItem(TRUSTGATE_APPROVAL_CONSUMED_KEY) || "[]");
  } catch {
    return [];
  }
}

function markTrustGateApprovalConsumed(requestId) {
  const consumed = readConsumedTrustGateApprovals().filter((id) => id !== requestId);
  consumed.unshift(requestId);
  localStorage.setItem(TRUSTGATE_APPROVAL_CONSUMED_KEY, JSON.stringify(consumed.slice(0, 30)));
}

function stripTrustGateCallbackParams() {
  const clean = new URL(window.location.href);
  [
    "trustGateRequestId",
    "trustGateStatus",
    "trustGatePurpose",
    "trustGateResult"
  ].forEach((key) => clean.searchParams.delete(key));
  window.history.replaceState({}, "", `${clean.pathname}${clean.search}${clean.hash}`);
}

function approvalReturnUrl() {
  const returnUrl = new URL("/office/housing-arrears/", window.location.origin);
  returnUrl.searchParams.set("lang", state.lang);
  return returnUrl.toString();
}

function officeLoginReturnUrl() {
  const returnUrl = new URL("/office/housing-arrears/", window.location.origin);
  returnUrl.searchParams.set("lang", state.lang);
  return returnUrl.toString();
}

function readOfficeSession() {
  try {
    return JSON.parse(sessionStorage.getItem(OFFICE_LOGIN_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function saveOfficeSession(session) {
  sessionStorage.setItem(OFFICE_LOGIN_SESSION_KEY, JSON.stringify(session));
}

function clearOfficeSession() {
  sessionStorage.removeItem(OFFICE_LOGIN_SESSION_KEY);
}

function isOfficeSessionValid(session) {
  return Boolean(
    session
      && session.sessionVersion === OFFICE_LOGIN_SESSION_VERSION
      && session.subjectId
      && Array.isArray(session.privileges)
      && session.privileges.includes(OFFICE_LOGIN_REQUIRED_PRIVILEGE)
      && new Date(session.expiresAt || 0).getTime() > Date.now()
  );
}

function currentOfficeSession() {
  const session = state.officeSession || readOfficeSession();
  if (!isOfficeSessionValid(session)) {
    clearOfficeSession();
    state.officeSession = null;
    return null;
  }
  state.officeSession = session;
  return session;
}

function isOfficeSignedIn() {
  return Boolean(currentOfficeSession());
}

function startOfficeLogin() {
  const loginUrl = new URL("/", TRUSTGATE_BASE_URL);
  loginUrl.searchParams.set("client", "moei");
  loginUrl.searchParams.set("purpose", "login");
  loginUrl.searchParams.set("service", "housing-arrears");
  loginUrl.searchParams.set("lang", state.lang);
  loginUrl.searchParams.set("requiredPrivilege", OFFICE_LOGIN_REQUIRED_PRIVILEGE);
  loginUrl.searchParams.set("returnUrl", officeLoginReturnUrl());
  window.location.href = loginUrl.toString();
}

function validateOfficeLoginResult(result, query) {
  const subject = result?.subject || {};
  const privileges = normalizeOfficePrivileges(result);
  const checks = [
    [result?.resultVersion === TRUSTGATE_RESULT_VERSION, "TrustGate returned an unexpected result contract."],
    [result?.status === "approved", "TrustGate did not approve this login."],
    [result?.purpose === "login", "TrustGate result was not a login result."],
    [result?.assuranceLevel === "simulated_number_match_and_pin", "TrustGate did not return PIN-backed number matching."],
    [Boolean(result?.numberMatchedAt), "TrustGate did not confirm number matching."],
    [Boolean(result?.pinVerifiedAt), "TrustGate did not confirm the PIN."],
    [query.get("trustGateRequestId") === result?.requestId, "TrustGate request IDs did not match."],
    [privileges.includes(OFFICE_LOGIN_REQUIRED_PRIVILEGE), t("auth.badPrivilege")]
  ];
  const failed = checks.find(([passed]) => !passed);
  return failed ? failed[1] : "";
}

function createOfficeSession(result) {
  const subject = result.subject || {};
  const privileges = normalizeOfficePrivileges(result);
  const createdAt = new Date(result.approvedAt || Date.now());
  return {
    sessionVersion: OFFICE_LOGIN_SESSION_VERSION,
    subjectId: subject.subjectId,
    displayName: subject.displayName || "Verified officer",
    emiratesId: subject.emiratesId || subject.mobile || "",
    role: subject.officialRole || subject.role || "Authorized officer",
    roleAr: subject.officialRoleAr || "",
    groups: Array.isArray(subject.groups) ? subject.groups : [],
    privileges,
    registeredDevice: subject.registeredDevice || null,
    signature: subject.signature || null,
    trustGateRequestId: result.requestId,
    loggedInAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + OFFICE_LOGIN_SESSION_TTL_MINUTES * 60 * 1000).toISOString()
  };
}

function normalizeOfficePrivileges(result) {
  const subject = result?.subject || {};
  const subjectPrivileges = Array.isArray(subject.privileges) ? subject.privileges : [];
  const resultPrivileges = Array.isArray(result?.subjectPrivileges) ? result.subjectPrivileges : [];
  return Array.from(new Set([...subjectPrivileges, ...resultPrivileges].filter(Boolean)));
}

function consumeOfficeLoginCallback() {
  const query = new URLSearchParams(window.location.search);
  if (query.get("trustGatePurpose") !== "login") return false;

  if (query.get("trustGateStatus") !== "approved") {
    state.officeLoginNotice = t("auth.failed");
    clearOfficeSession();
    stripTrustGateCallbackParams();
    return false;
  }

  try {
    const result = decodeBase64UrlJson(query.get("trustGateResult"));
    const validationError = validateOfficeLoginResult(result, query);
    if (validationError) {
      state.officeLoginNotice = validationError;
      clearOfficeSession();
      stripTrustGateCallbackParams();
      return false;
    }
    const session = createOfficeSession(result);
    saveOfficeSession(session);
    state.officeSession = session;
    state.officeLoginNotice = "";
    stripTrustGateCallbackParams();
    return true;
  } catch (error) {
    state.officeLoginNotice = error.message || t("auth.failed");
    clearOfficeSession();
    stripTrustGateCallbackParams();
    return false;
  }
}

function buildApprovalContext() {
  if (!state.review) state.review = runSystemReview(state.selectedCase);
  const rec = state.review.recommendation;
  const approvalPayload = {
    contractVersion: "moei-approval-payload.v1",
    caseId: state.selectedCase.id,
    applicantName: state.selectedCase.applicantName,
    applicantNameAr: state.selectedCase.applicantNameAr || "",
    emiratesIdMasked: state.selectedCase.emiratesIdMasked,
    arrearsAmount: state.selectedCase.arrearsAmount,
    monthsDelayed: state.selectedCase.monthsDelayed,
    action: APPROVAL_ACTION,
    recommendation: {
      nextAction: rec.nextAction,
      arNextAction: rec.arNextAction,
      durationMonths: rec.durationMonths || null,
      monthlyRepayment: rec.monthlyRepayment || null
    },
    officer: {
      subjectId: OFFICIAL_APPROVER.subjectId,
      name: OFFICIAL_APPROVER.name,
      role: OFFICIAL_APPROVER.role,
      requiredPrivilege: TRUSTGATE_REQUIRED_PRIVILEGE
    }
  };
  const requestedAt = new Date();
  return {
    contractVersion: APPROVAL_CONTRACT_VERSION,
    relyingRequestId: `MOEI-SEAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    caseId: state.selectedCase.id,
    action: APPROVAL_ACTION,
    officialSubjectId: OFFICIAL_APPROVER.subjectId,
    officialName: OFFICIAL_APPROVER.name,
    officialNameAr: OFFICIAL_APPROVER.nameAr,
    officialRole: OFFICIAL_APPROVER.role,
    officialRoleAr: OFFICIAL_APPROVER.roleAr,
    requiredPrivilege: TRUSTGATE_REQUIRED_PRIVILEGE,
    payloadHash: shortHash(JSON.stringify(approvalPayload)),
    payload: approvalPayload,
    requestedAt: requestedAt.toISOString(),
    expiresAt: new Date(requestedAt.getTime() + 10 * 60 * 1000).toISOString()
  };
}

function validateTrustGateApprovalResult(result, pending, query) {
  const approval = result?.approval || {};
  const checks = [
    [Boolean(pending), "No pending MOEI approval request was found."],
    [pending?.contractVersion === APPROVAL_CONTRACT_VERSION, "Pending approval contract is not recognized."],
    [new Date(pending?.expiresAt || 0).getTime() > Date.now(), "The pending MOEI approval request expired."],
    [result?.resultVersion === TRUSTGATE_RESULT_VERSION, "TrustGate returned an unexpected result contract."],
    [result?.status === "approved", "TrustGate did not approve this request."],
    [result?.purpose === "approval", "TrustGate result was not an approval result."],
    [result?.assuranceLevel === "simulated_number_match_and_pin", "TrustGate did not return PIN-backed number matching."],
    [Boolean(result?.numberMatchedAt), "TrustGate did not confirm number matching."],
    [Boolean(result?.pinVerifiedAt), "TrustGate did not confirm the signing PIN."],
    [query.get("trustGateRequestId") === result?.requestId, "TrustGate request IDs did not match."],
    [!readConsumedTrustGateApprovals().includes(result?.requestId), "This TrustGate approval result was already consumed."],
    [approval.relyingRequestId === pending?.relyingRequestId, "MOEI approval request IDs did not match."],
    [approval.caseId === pending?.caseId, "Approved case ID did not match the prepared case."],
    [approval.action === pending?.action, "Approved action did not match the prepared action."],
    [approval.officialSubjectId === pending?.officialSubjectId, "Approving officer did not match the assigned official."],
    [approval.officialName === pending?.officialName, "Approving officer name did not match the assigned official."],
    [approval.officialRole === pending?.officialRole, "Approving officer role did not match the assigned official."],
    [approval.payloadHash === pending?.payloadHash, "Approved payload hash did not match the prepared recommendation."],
    [approval.registeredDevice?.trusted === true, "Approval did not come from a trusted registered device."],
    [approval.signature?.status === "Qualified Demo Signature", "Approval did not include a qualified demo signature."],
    [approval.signature?.signingPermission === "Enabled", "Approving account did not have signing permission enabled."]
  ];
  const failed = checks.find(([passed]) => !passed);
  return failed ? failed[1] : "";
}

function cloneCase(caseData) {
  return structuredClone(caseData);
}

function mapLiveApplicationToCase(application) {
  const financialStudy = application.latestAssessment?.financialStudy || {};
  const programme = application.programmeSummary || {};
  const documentsComplete = application.latestAssessment?.documents?.documentCompletenessStatus === "complete";
  return {
    id: application.applicationId,
    applicationId: application.applicationId,
    source: "customer",
    liveApiBacked: true,
    applicantName: application.customer?.displayName || application.applicationId,
    applicantNameAr: application.customer?.displayName || application.applicationId,
    emiratesIdMasked: application.customer?.phoneMasked || application.customer?.emiratesIdMasked || "",
    arrearsAmount: Number(programme.totalArrearsAmount || financialStudy.arrearsAmount || 0),
    monthsDelayed: Number(programme.unpaidInstallmentsCount || financialStudy.unpaidInstallmentsCount || 0),
    monthlyIncome: Number(application.financial?.currentSalary || financialStudy.currentSalary || 0),
    monthlyObligations: Number(application.financial?.monthlyObligations || financialStudy.monthlyObligations || 0),
    dependents: Number(application.family?.dependentsCount || 0),
    familyMembersCount: Number(application.family?.familyMembersCount || 1),
    employmentStatus: "Employed",
    reason: application.remarks || "",
    reasonAr: application.remarks || "",
    existingLoans: Number(application.financial?.monthlyObligations || 0) > 0,
    salaryStatus: documentsComplete ? "valid" : "missing",
    bankStatus: Number(application.financial?.monthlyObligations || 0) > 0 ? documentsComplete ? "valid" : "missing" : "not_required",
    status: application.officeStatus || application.status || "application_submitted",
    liveQueueRecord: application,
    liveAssessment: application.latestAssessment || null
  };
}

async function loadLiveOfficeCases() {
  if (!liveApi?.officeQueue) return [];
  try {
    const response = await liveApi.officeQueue();
    state.liveOfficeCases = (response.applications || []).map(mapLiveApplicationToCase);
    state.liveQueueNotice = "";
  } catch (error) {
    state.liveOfficeCases = [];
    state.liveQueueNotice = error.message || "Could not load live queue.";
  }
  return state.liveOfficeCases;
}

function readCustomerSubmissions() {
  const officeVisibleStatuses = new Set(["system_review", "submitted", "officer_review", "more_information", "approved"]);
  if (workflow) {
    return workflow.readSubmissions()
      .filter((item) => item && item.id && officeVisibleStatuses.has(item.status))
      .map((item) => ({ ...item, source: "customer", customerSubmitted: true }));
  }
  try {
    return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || "[]")
      .filter((item) => item && item.id && officeVisibleStatuses.has(item.status))
      .map((item) => ({ ...item, source: "customer", customerSubmitted: true }));
  } catch {
    return [];
  }
}

function getOfficeCases() {
  if (state.liveOfficeCases.length) return state.liveOfficeCases;
  const submissions = readCustomerSubmissions();
  const submissionIds = new Set(submissions.map((item) => item.id));
  const remainingMocks = mockCases.filter((item) => !submissionIds.has(item.id));
  return [...submissions, ...remainingMocks];
}

function emptyQueueMessage() {
  return state.lang === "ar"
    ? "لا توجد طلبات مباشرة في قائمة الخادم حالياً. ستظهر الطلبات هنا بعد إرسالها من بوابة المتعامل أو تغذيتها عبر واجهة البرنامج."
    : "There are no live server applications in the queue yet. Applications will appear here after customer submission or programme feed intake.";
}

async function init() {
  applyLanguage();
  bindEvents();
  consumeOfficeLoginCallback();
  state.officeSession = readOfficeSession();
  if (!isOfficeSignedIn()) {
    renderOfficeAuthGate();
    return;
  }
  await loadLiveOfficeCases();
  const pendingApproval = readPendingTrustGateApproval();
  const cases = getOfficeCases();
  const firstCase = (pendingApproval && cases.find((item) => item.id === pendingApproval.caseId)) || cases[0] || null;
  if (firstCase) loadCase(firstCase.id);
  else state.selectedCase = null;
  const approvalCompleted = consumeTrustGateApprovalCallback();
  showScreen(approvalCompleted ? "audit" : "officer");
  renderAll();
}

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.body.dataset.lang = state.lang;
  document.title = t("top.title");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  $("languageToggle").textContent = t("language.toggle");
  populateSelectOptions();
  populateCaseSelect();
}

function populateSelectOptions() {
  fillOptions($("employmentStatus"), optionText.employment[state.lang]);
  fillOptions($("salaryStatus"), optionText.salary[state.lang]);
  fillOptions($("bankStatus"), optionText.bank[state.lang]);
}

function fillOptions(select, options) {
  const current = select.value;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (current) select.value = current;
}

function populateCaseSelect() {
  const current = $("caseSelect").value || state.selectedCase?.id;
  const cases = getOfficeCases();
  $("caseSelect").innerHTML = cases.length
    ? cases.map((item) => {
      const source = item.source === "customer" ? t("intake.portalCaseLabel") : t("intake.demoCaseLabel");
      const statusLabel = workflow ? workflow.labelStatus(item.status || "draft", state.lang) : item.status || "";
      const label = `${source} · ${displayName(item)} · ${item.id} · ${statusLabel}`;
      return `<option value="${item.id}">${label}</option>`;
    }).join("")
    : `<option value="">${emptyQueueMessage()}</option>`;
  if (current) $("caseSelect").value = current;
  renderIntakeQueueStats(cases);
}

function renderIntakeQueueStats(cases = getOfficeCases()) {
  const portalCount = cases.filter((item) => item.source === "customer").length;
  const demoCount = cases.length - portalCount;
  const stats = t("intake.queueStats")
    .replace("{portal}", portalCount)
    .replace("{demo}", demoCount);
  $("intakeQueueStats").innerHTML = `
    <span>${stats}</span>
    <strong>${t("intake.queueHint")}</strong>
  `;
  renderLiveImpactMetrics();
}

async function renderLiveImpactMetrics() {
  const el = document.getElementById("impactPanel");
  if (!el) return;
  try {
    const res = await fetch("/api/challenge-1/stats");
    if (!res.ok) return;
    const s = await res.json();
    const lang = state.lang || "ar";
    const isAr = lang === "ar";

    const before = isAr ? "٥ أيام عمل" : "5 Working Days";
    const after = isAr ? "< ٣ دقائق" : "< 3 Minutes";
    const totalLabel = isAr ? "إجمالي الطلبات" : "Total Applications";
    const approvedLabel = isAr ? "موافق عليها" : "Approved";
    const pendingLabel = isAr ? "قيد الإجراء" : "Pending Action";
    const aiLabel = isAr ? "تقييم آلي" : "AI Assessed";

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:4px;">
        <div style="background:var(--wash,#f7f8fb);border:1px solid var(--line,#ded7c9);border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#171b25">${s.total}</div>
          <div style="font-size:11px;color:#5f6677;margin-top:2px">${totalLabel}</div>
        </div>
        <div style="background:var(--wash,#f7f8fb);border:1px solid #a3f0d0;border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#00b87a">${s.approved}</div>
          <div style="font-size:11px;color:#5f6677;margin-top:2px">${approvedLabel}</div>
        </div>
        <div style="background:var(--wash,#f7f8fb);border:1px solid #ded7c9;border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#f0a500">${s.pending}</div>
          <div style="font-size:11px;color:#5f6677;margin-top:2px">${pendingLabel}</div>
        </div>
        <div style="background:var(--wash,#f7f8fb);border:1px solid #a3d8f0;border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#0ea4bc">${s.casesAutoAssessedPct}%</div>
          <div style="font-size:11px;color:#5f6677;margin-top:2px">${aiLabel}</div>
        </div>
      </div>
      <div style="margin-top:10px;background:#eff8f5;border:1px solid #a3f0d0;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:16px;font-size:13px">
        <span style="color:#5f6677">${isAr ? "وقت المعالجة" : "Processing Time"}:</span>
        <span style="text-decoration:line-through;color:#b0b8c8">${before}</span>
        <span style="color:#39445a">→</span>
        <strong style="color:#00b87a">${after}</strong>
        <span style="margin-right:auto;font-size:11px;color:#0ea4bc;font-weight:600">● ${isAr ? "مباشر" : "LIVE"}</span>
      </div>
    `;
  } catch {
    // silent fail — metrics are supplementary
  }
}

function bindEvents() {
  $("languageToggle").addEventListener("click", () => {
    const signedIn = isOfficeSignedIn();
    if (signedIn) syncFormToState();
    state.lang = state.lang === "ar" ? "en" : "ar";
    localStorage.setItem("arrearsflow-lang", state.lang);
    applyLanguage();
    if (!signedIn) {
      renderOfficeAuthGate();
      return;
    }
    fillForm(state.selectedCase);
    renderAll();
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.screen));
  });

  $("caseSelect").addEventListener("change", (event) => loadCase(event.target.value));
  $("intakeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    syncFormToState();
    prepareCaseForOfficer({ persistIfNeeded: true });
    state.seal = null;
    showScreen("officer");
    renderAll();
  });

  $("approveBtn").addEventListener("click", () => startTrustGateApproval());
  $("moreInfoBtn").addEventListener("click", () => addOfficerAction("More information requested from applicant.", "تم طلب معلومات إضافية من المتعامل."));
  $("escalateBtn").addEventListener("click", () => addOfficerAction("Case escalated to supervisor for exceptional review.", "تم تصعيد الحالة إلى المشرف للمراجعة الاستثنائية."));
}

function loadCase(caseId) {
  const found = getOfficeCases().find((item) => item.id === caseId);
  state.selectedCase = found ? cloneCase(found) : null;
  state.review = null;
  state.seal = null;
  if (!state.selectedCase) {
    renderAll();
    return;
  }
  fillForm(state.selectedCase);
  prepareCaseForOfficer({ persistIfNeeded: true });
  renderAll();
}

function prepareCaseForOfficer({ persistIfNeeded = false } = {}) {
  state.review = runSystemReview(state.selectedCase);
  const currentStatus = state.selectedCase.status || "draft";
  const canPersist = workflow && state.selectedCase.source === "customer" && !state.selectedCase.liveApiBacked;
  const alreadyOfficerReady = ["officer_review", "approved", "more_information"].includes(currentStatus);
  if (persistIfNeeded && canPersist && !alreadyOfficerReady) {
    savePreparedSnapshot("officer_review", {
      actor: "system",
      action: "System prepared recommendation and case snapshot for officer review",
      actionAr: "جهز النظام التوصية ولقطة الحالة لمراجعة الموظف",
      source: "status-snapshot-worker",
      requiresHumanApproval: false
    });
  }
  return state.review;
}

function fillForm(caseData) {
  if (!caseData) return;
  if ($("intakeForm")) $("intakeForm").hidden = false;
  setIntakeFieldsEnabled(true);
  $("caseSelect").value = caseData.id;
  $("applicantName").value = displayName(caseData);
  $("emiratesIdMasked").value = caseData.emiratesIdMasked;
  $("arrearsAmount").value = caseData.arrearsAmount;
  $("monthsDelayed").value = caseData.monthsDelayed;
  $("monthlyIncome").value = caseData.monthlyIncome;
  $("monthlyObligations").value = caseData.monthlyObligations;
  $("dependents").value = caseData.dependents;
  $("employmentStatus").value = caseData.employmentStatus;
  $("reason").value = displayReason(caseData);
  $("existingLoans").checked = caseData.existingLoans;
  $("salaryStatus").value = caseData.salaryStatus;
  $("bankStatus").value = caseData.bankStatus;
}

function syncFormToState() {
  const applicantName = $("applicantName").value;
  const reason = $("reason").value;
  state.selectedCase = {
    ...state.selectedCase,
    applicantName: state.lang === "en" ? applicantName : state.selectedCase.applicantName,
    applicantNameAr: state.lang === "ar" ? applicantName : state.selectedCase.applicantNameAr,
    emiratesIdMasked: $("emiratesIdMasked").value,
    arrearsAmount: Number($("arrearsAmount").value),
    monthsDelayed: Number($("monthsDelayed").value),
    monthlyIncome: Number($("monthlyIncome").value),
    monthlyObligations: Number($("monthlyObligations").value),
    dependents: Number($("dependents").value),
    employmentStatus: $("employmentStatus").value,
    reason: state.lang === "en" ? reason : state.selectedCase.reason,
    reasonAr: state.lang === "ar" ? reason : state.selectedCase.reasonAr,
    existingLoans: $("existingLoans").checked,
    salaryStatus: $("salaryStatus").value,
    bankStatus: $("bankStatus").value
  };
}

function liveDocTone(status) {
  if (["passed", "valid", "not_required", "complete"].includes(status)) return "pass";
  if (["missing", "incomplete"].includes(status)) return "fail";
  return "warn";
}

function buildLiveSystemReview(caseData) {
  const assessment = caseData.liveAssessment;
  const study = assessment?.financialStudy || null;
  const docs = assessment?.documents?.requiredDocuments || [];
  const recommendationPath = assessment?.recommendationPath || study?.recommendationPath || "waiting_for_programme_data";
  const recommendationTone = recommendationPath === "ready_for_trustgate"
    ? { tone: "pass", label: "Approval-ready", ar: "جاهزة للاعتماد" }
    : recommendationPath === "request_documents"
      ? { tone: "fail", label: "Documents required", ar: "مطلوب استكمال المستندات" }
      : { tone: "warn", label: "Officer review", ar: "مراجعة الموظف" };
  const reviewDocs = docs.length ? docs.map((doc) => {
    const aiV = doc.aiVerification || null;
    const scoreLabel = aiV?.aiVerified && doc.authenticityScore
      ? ` · AI verified: ${doc.authenticityScore}%`
      : "";
    const scoreAr = aiV?.aiVerified && doc.authenticityScore
      ? ` · التحقق الذكي: ${doc.authenticityScore}٪`
      : "";
    const notes = aiV?.reasoningNotes ? ` — ${aiV.reasoningNotes}` : "";
    return {
      status: liveDocTone(doc.status),
      label: doc.label,
      arLabel: doc.arLabel || doc.label,
      detail: (doc.reason || doc.status) + scoreLabel + notes,
      arDetail: (doc.arReason || doc.status) + scoreAr,
      aiVerified: aiV?.aiVerified || false,
      authenticityScore: doc.authenticityScore || null
    };
  }) : [
    {
      status: "warn",
      label: "Server assessment pending",
      arLabel: "التقييم الخادمي بانتظار البيانات",
      detail: "Programme data or required documents may still be missing.",
      arDetail: "قد تكون بيانات البرنامج أو المستندات المطلوبة غير مكتملة."
    }
  ];
  const rules = assessment?.policy?.ruleTrace || study?.ruleTrace || [];
  const auditLog = (assessment?.auditEvents || []).map((event) => ({
    time: event.time || nowTime(),
    text: event.summary || event.label || event.id || "Server assessment event",
    ar: event.summaryAr || event.arLabel || event.summary || "حدث تقييم خادمي"
  }));

  return {
    docs: reviewDocs,
    rules,
    risk: recommendationTone,
    recommendation: {
      recommendationPath,
      durationMonths: study?.proposedReschedulingMonths || null,
      monthlyRepayment: study?.proposedMonthlyInstallment || null,
      rationale: study?.reasoningBullets?.join(" ") || assessment?.decisionStage || "Server assessment is linked to this case.",
      arRationale: study?.reasoningBulletsAr?.join(" ") || assessment?.decisionStage || "تم ربط التقييم الخادمي بهذه الحالة.",
      nextAction: recommendationPath === "ready_for_trustgate" ? "Prepare TrustGate authorization." : "Review the server status and required data.",
      arNextAction: recommendationPath === "ready_for_trustgate" ? "تجهيز اعتماد TrustGate." : "مراجعة حالة الخادم والبيانات المطلوبة."
    },
    financialStudy: study,
    reasoning: assessment?.reasoning || null,
    documentVerification: {
      status: assessment?.documents?.documentCompletenessStatus === "complete" ? "deterministic_passed" : "ai_specialist_recommended"
    },
    auditLog: auditLog.length ? auditLog : [
      {
        time: nowTime(),
        text: "Live API queue loaded this application from server state.",
        ar: "تم تحميل هذا الطلب من حالة الخادم."
      }
    ],
    officerActions: caseData.officerActions || []
  };
}

function runSystemReview(caseData) {
  if (caseData?.liveApiBacked) return buildLiveSystemReview(caseData);
  if (workflow) {
    return workflow.buildReview(caseData, {
      locale: state.lang === "ar" ? "ar-AE" : "en-AE",
      officerActions: state.review?.officerActions || caseData.officerActions || []
    });
  }

  const maxRepayment = Math.round(caseData.monthlyIncome * 0.2);
  const baseMonths = Math.max(6, Math.ceil(caseData.arrearsAmount / Math.max(maxRepayment, 1)));
  const durationMonths = Math.min(Math.max(baseMonths, 12), 48);
  const monthlyRepayment = Math.ceil(caseData.arrearsAmount / durationMonths);

  const docs = buildDocumentResults(caseData);
  const rules = buildRuleResults(caseData, monthlyRepayment, maxRepayment, docs);
  const risk = classifyRisk(caseData, docs, rules);
  const recommendation = buildRecommendation(caseData, monthlyRepayment, durationMonths, risk);
  const auditLog = [
    { time: nowTime(), text: "Intake worker parsed applicant request and financial fields.", ar: "قرأ عامل الاستقبال الطلب والبيانات المالية." },
    { time: nowTime(), text: "Document worker checked salary certificate and bank statement requirements.", ar: "تحقق عامل المستندات من شهادة الراتب ومتطلبات كشف الحساب." },
    { time: nowTime(), text: "Financial rules worker evaluated repayment against the 20% salary threshold.", ar: "قيّم عامل القواعد المالية السداد مقابل حد ٢٠٪ من الراتب." },
    { time: nowTime(), text: `Risk worker classified case as ${risk.label}.`, ar: `صنّف عامل المخاطر الحالة: ${risk.ar}.` },
    { time: nowTime(), text: "Recommendation worker prepared officer-facing recommendation.", ar: "أعد عامل التوصية ملخصاً موجهاً للموظف." },
    { time: nowTime(), text: "Audit recorder saved the decision path for review.", ar: "سجل نظام التدقيق مسار القرار للمراجعة." }
  ];

  return { docs, rules, risk, recommendation, auditLog, officerActions: [] };
}

function buildDocumentResults(caseData) {
  const salaryMap = {
    valid: { status: "pass", label: "Salary certificate valid", arLabel: "شهادة الراتب صحيحة", detail: "Present, signed, and attested.", arDetail: "متوفرة وموقعة ومصدقة." },
    invalid: { status: "warn", label: "Salary certificate needs correction", arLabel: "شهادة الراتب تحتاج تصحيحاً", detail: "Present but missing attestation or required format.", arDetail: "متوفرة ولكن ينقصها التصديق أو الصيغة المطلوبة." },
    missing: { status: "fail", label: "Salary certificate missing", arLabel: "شهادة الراتب غير مرفقة", detail: "Required document is not available.", arDetail: "المستند المطلوب غير متوفر." }
  };

  const bankRequired = caseData.existingLoans || caseData.employmentStatus !== "Employed";
  const bankMap = {
    valid: { status: "pass", label: "Bank statement valid", arLabel: "كشف الحساب صحيح", detail: "Statement supports declared obligations.", arDetail: "الكشف يدعم الالتزامات المعلنة." },
    invalid: { status: "warn", label: "Bank statement needs review", arLabel: "كشف الحساب يحتاج مراجعة", detail: "Statement is present but inconsistent or incomplete.", arDetail: "الكشف موجود لكنه غير مكتمل أو غير متسق." },
    missing: {
      status: bankRequired ? "fail" : "neutral",
      label: bankRequired ? "Bank statement missing" : "Bank statement not provided",
      arLabel: bankRequired ? "كشف الحساب غير مرفق" : "لم يتم إرفاق كشف الحساب",
      detail: bankRequired ? "Required because applicant declared obligations or salary change." : "Not required for this case."
      , arDetail: bankRequired ? "مطلوب لأن المتعامل أعلن عن التزامات أو تغير في الراتب." : "غير مطلوب لهذه الحالة."
    },
    not_required: { status: "neutral", label: "Bank statement not required", arLabel: "كشف الحساب غير مطلوب", detail: "No extra loan claim detected.", arDetail: "لم يتم رصد مطالبة بوجود قرض إضافي." }
  };

  return [salaryMap[caseData.salaryStatus], bankMap[caseData.bankStatus]];
}

function buildRuleResults(caseData, monthlyRepayment, maxRepayment, docs) {
  const docFailures = docs.filter((doc) => doc.status === "fail").length;
  const obligationRatio = caseData.monthlyObligations / Math.max(caseData.monthlyIncome, 1);
  return [
      {
        id: "RULE-20PCT",
      label: "Repayment should not exceed 20% of monthly salary",
      arLabel: "يجب ألا يتجاوز السداد ٢٠٪ من الراتب الشهري",
      status: monthlyRepayment <= maxRepayment ? "pass" : "fail",
      calculation: `${money(monthlyRepayment)} <= ${money(maxRepayment)}`,
      arCalculation: `${money(monthlyRepayment)} <= ${money(maxRepayment)}`,
      reason: monthlyRepayment <= maxRepayment
        ? "Recommended repayment is within the policy threshold."
        : "Recommended repayment exceeds the policy threshold.",
      arReason: monthlyRepayment <= maxRepayment
        ? "قيمة السداد المقترحة ضمن حد السياسة."
        : "قيمة السداد المقترحة تتجاوز حد السياسة."
    },
    {
      id: "RULE-DOCS",
      label: "Required documents must be complete",
      arLabel: "يجب استكمال المستندات المطلوبة",
      status: docFailures === 0 ? "pass" : "fail",
      calculation: `${docFailures} blocking document issue(s)`,
      arCalculation: `${docFailures} مشكلة مستندية مانعة`,
      reason: docFailures === 0 ? "No blocking document issue detected." : "Case cannot proceed without corrected documents.",
      arReason: docFailures === 0 ? "لا توجد مشكلة مستندية مانعة." : "لا يمكن متابعة الحالة دون تصحيح المستندات."
    },
    {
      id: "RULE-OBLIGATIONS",
      label: "Financial obligations should be reviewed when high",
      arLabel: "يجب مراجعة الالتزامات المالية عند ارتفاعها",
      status: obligationRatio > 0.65 ? "warn" : "pass",
      calculation: `${Math.round(obligationRatio * 100)}% obligation-to-income ratio`,
      arCalculation: `${Math.round(obligationRatio * 100)}٪ نسبة الالتزامات إلى الدخل`,
      reason: obligationRatio > 0.65
        ? "High obligations require officer attention."
        : "Declared obligations are within ordinary review range.",
      arReason: obligationRatio > 0.65
        ? "الالتزامات المرتفعة تتطلب انتباه الموظف."
        : "الالتزامات المعلنة ضمن نطاق المراجعة الاعتيادي."
    }
  ];
}

function classifyRisk(caseData, docs, rules) {
  const hasFail = docs.some((doc) => doc.status === "fail") || rules.some((rule) => rule.status === "fail");
  const highObligations = caseData.monthlyObligations / Math.max(caseData.monthlyIncome, 1) > 0.65;
  const exceptional = caseData.arrearsAmount >= 90000 || caseData.monthsDelayed >= 18 || caseData.employmentStatus !== "Employed";

  if (hasFail) return { key: "missing", label: "Missing information", ar: "معلومات ناقصة", tone: "warn" };
  if (highObligations || exceptional) return { key: "high", label: "High-risk review", ar: "مراجعة عالية المخاطر", tone: "fail" };
  return { key: "ready", label: "Ready for officer review", ar: "جاهزة لمراجعة الموظف", tone: "pass" };
}

function buildRecommendation(caseData, monthlyRepayment, durationMonths, risk) {
  if (risk.key === "missing") {
    return {
      durationMonths: null,
      monthlyRepayment: null,
      nextAction: "Request corrected documents",
      arNextAction: "طلب تصحيح المستندات",
      rationale: "The system found missing or invalid required evidence. Officer should request corrected documents before approving a plan.",
      arRationale: "رصد النظام مستندات مطلوبة ناقصة أو غير صحيحة. يجب طلب التصحيح قبل اعتماد أي خطة."
    };
  }
  if (risk.key === "high") {
    return {
      durationMonths,
      monthlyRepayment,
      nextAction: "Escalate for exceptional review",
      arNextAction: "تصعيد لمراجعة استثنائية",
      rationale: "The system prepared a possible plan, but obligations, arrears size, or employment status require human review.",
      arRationale: "أعد النظام خطة محتملة، لكن الالتزامات أو حجم المتأخرات أو الحالة الوظيفية تتطلب مراجعة بشرية."
    };
  }
  return {
    durationMonths,
    monthlyRepayment,
    nextAction: "Officer review and digital approval seal",
    arNextAction: "مراجعة الموظف وختم الاعتماد الرقمي",
    rationale: "The proposed plan stays within the 20% salary threshold and balances arrears recovery with declared obligations.",
    arRationale: "الخطة المقترحة ضمن حد ٢٠٪ من الراتب وتوازن بين تحصيل المتأخرات والالتزامات المعلنة."
  };
}

function showScreen(screen) {
  state.screen = screen;
  document.querySelectorAll(".screen").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  $(`screen-${screen}`).classList.add("active");
  document.querySelector(`[data-screen="${screen}"]`).classList.add("active");
}

function renderOfficeAuthGate() {
  document.body.classList.add("office-auth-locked");
  const nav = document.querySelector(".nav-list");
  const sideNote = document.querySelector(".side-note");
  const sessionCard = $("officeSessionCard");
  if (nav) nav.hidden = true;
  if (sideNote) sideNote.hidden = true;
  if (sessionCard) sessionCard.hidden = true;

  const main = document.querySelector(".main");
  if (!main) return;
  Array.from(main.children).forEach((child) => {
    if (child.id !== "officeAuthGate") child.hidden = true;
  });
  let gate = $("officeAuthGate");
  if (!gate) {
    gate = document.createElement("section");
    gate.id = "officeAuthGate";
    gate.className = "office-auth-gate";
    main.prepend(gate);
  }
  gate.hidden = false;
  gate.innerHTML = `
    <div class="office-auth-card">
      <div class="office-auth-brand">
        <div class="office-auth-mark">${t("brand.mark")}</div>
        <div>
          <strong>${t("brand.title")}</strong>
          <span>${t("brand.subtitle")}</span>
        </div>
      </div>
      <div class="office-auth-rule" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <span class="mini-pill neutral">${t("auth.requiredPrivilege")}</span>
      <h1>${t("auth.title")}</h1>
      <p>${t("auth.copy")}</p>
      ${state.officeLoginNotice ? `<div class="auth-notice" role="alert">${escapeHtml(state.officeLoginNotice)}</div>` : ""}
      <div class="office-auth-actions">
        <button id="officeTrustGateLoginBtn" class="primary-action" type="button">${t("auth.action")}</button>
        <button id="officeAuthLanguageBtn" class="secondary-action" type="button">${t("language.toggle")}</button>
      </div>
      <small>${t("auth.stampNote")}</small>
    </div>
  `;
  $("officeTrustGateLoginBtn").addEventListener("click", startOfficeLogin);
  $("officeAuthLanguageBtn").addEventListener("click", () => {
    state.lang = state.lang === "ar" ? "en" : "ar";
    localStorage.setItem("arrearsflow-lang", state.lang);
    applyLanguage();
    renderOfficeAuthGate();
  });
}

function restoreOfficeWorkspace() {
  document.body.classList.remove("office-auth-locked");
  const nav = document.querySelector(".nav-list");
  const sideNote = document.querySelector(".side-note");
  const gate = $("officeAuthGate");
  if (nav) nav.hidden = false;
  if (sideNote) sideNote.hidden = false;
  if (gate) gate.hidden = true;
  document.querySelectorAll(".main > [hidden]").forEach((child) => {
    if (child.id !== "officeAuthGate") child.hidden = false;
  });
}

function renderOfficeSessionCard() {
  const session = currentOfficeSession();
  const card = $("officeSessionCard");
  if (!card || !session) return;
  const hasSealPrivilege = session.privileges.includes(TRUSTGATE_REQUIRED_PRIVILEGE);
  const privilegeText = state.lang === "ar"
    ? hasSealPrivilege ? "دخول الموظف وختم الاعتماد" : "دخول الموظف"
    : hasSealPrivilege ? `${OFFICE_LOGIN_REQUIRED_PRIVILEGE}, ${TRUSTGATE_REQUIRED_PRIVILEGE}` : OFFICE_LOGIN_REQUIRED_PRIVILEGE;
  card.hidden = false;
  card.innerHTML = `
    <span>${t("auth.signedIn")}</span>
    <strong>${escapeHtml(session.displayName)}</strong>
    <small>${escapeHtml(session.role)}</small>
    <em>${t("auth.verifiedWith")}: ${escapeHtml(privilegeText)}</em>
    <button id="officeLogoutBtn" type="button">${t("auth.logout")}</button>
  `;
  $("officeLogoutBtn").addEventListener("click", () => {
    clearOfficeSession();
    state.officeSession = null;
    window.location.href = officeLoginReturnUrl();
  });
}

function renderAll() {
  if (!isOfficeSignedIn()) {
    renderOfficeAuthGate();
    return;
  }
  restoreOfficeWorkspace();
  renderOfficeSessionCard();
  populateCaseSelect();
  if (!state.selectedCase) {
    renderEmptyOfficeWorkspace();
    return;
  }
  renderRequirements();
  renderSystemReview();
  renderOfficer();
  renderAudit();
}

function renderEmptyOfficeWorkspace() {
  const message = emptyQueueMessage();
  if ($("intakeForm")) $("intakeForm").hidden = true;
  setIntakeFieldsEnabled(false);
  clearIntakeFields();
  $("requirementList").innerHTML = `<div class="check-item"><span class="mini-pill neutral">${labelForStatus("neutral")}</span><strong>${message}</strong></div>`;
  $("casePreview").textContent = message;
  $("factsList").innerHTML = "";
  $("documentList").innerHTML = "";
  $("ruleTrace").innerHTML = "";
  $("recommendationCard").innerHTML = `<div class="preview-box"><span class="note-label">${state.lang === "ar" ? "قائمة مباشرة فارغة" : "Empty live queue"}</span><p>${message}</p></div>`;
  $("aiSpecialistCard").innerHTML = "";
  $("systemLog").innerHTML = `<div class="timeline-item"><span>${nowTime()}</span><p>${message}</p></div>`;
  $("officerStatus").className = "status-pill neutral";
  $("officerStatus").textContent = state.lang === "ar" ? "لا توجد طلبات" : "No live applications";
  $("caseQueue").innerHTML = `<div class="queue-empty">${message}</div>`;
  $("officerSummary").innerHTML = `<div class="summary-block"><span class="note-label">${state.lang === "ar" ? "قائمة العمل" : "Work queue"}</span><p>${message}</p></div>`;
  $("officerEvidence").innerHTML = "";
  $("auditStatus").className = "status-pill neutral";
  $("auditStatus").textContent = state.lang === "ar" ? "لا يوجد سجل" : "No record";
  $("sealCard").className = "seal-card empty";
  $("sealCard").innerHTML = state.lang === "ar" ? "لا يوجد ختم اعتماد" : "No approval seal";
  $("finalSummary").innerHTML = "";
  $("auditLog").innerHTML = "";
}

function setIntakeFieldsEnabled(enabled) {
  [
    "applicantName",
    "emiratesIdMasked",
    "arrearsAmount",
    "monthsDelayed",
    "monthlyIncome",
    "monthlyObligations",
    "dependents",
    "employmentStatus",
    "reason",
    "existingLoans",
    "salaryStatus",
    "bankStatus"
  ].forEach((id) => {
    const node = $(id);
    if (node) node.disabled = !enabled;
  });
}

function clearIntakeFields() {
  [
    "applicantName",
    "emiratesIdMasked",
    "arrearsAmount",
    "monthsDelayed",
    "monthlyIncome",
    "monthlyObligations",
    "dependents",
    "reason"
  ].forEach((id) => {
    const node = $(id);
    if (node) node.value = "";
  });
  if ($("existingLoans")) $("existingLoans").checked = false;
}

function renderRequirements() {
  const caseData = state.selectedCase;
  const items = [
    { label: "Salary certificate required", status: caseData.salaryStatus === "valid" ? "pass" : caseData.salaryStatus === "missing" ? "fail" : "warn" },
    { label: "Bank statement if obligations are declared", ar: "كشف الحساب عند وجود التزامات", status: !caseData.existingLoans || caseData.bankStatus === "valid" || caseData.bankStatus === "not_required" ? "pass" : "fail" },
    { label: "Reason for rescheduling provided", ar: "تم إدخال سبب إعادة الجدولة", status: caseData.reason.trim() ? "pass" : "fail" },
    { label: "Financial data available", ar: "البيانات المالية متوفرة", status: caseData.monthlyIncome > 0 && caseData.arrearsAmount > 0 ? "pass" : "fail" }
  ];
  items[0].ar = "شهادة الراتب مطلوبة";
  $("requirementList").innerHTML = items.map((item) => `
    <div class="check-item">
      <span class="mini-pill ${item.status}">${labelForStatus(item.status)}</span>
      <strong>${dual(item.label, item.ar)}</strong>
    </div>
  `).join("");
  $("casePreview").textContent = displayReason(caseData);
}

function renderSystemReview() {
  const review = state.review || runSystemReview(state.selectedCase);
  const caseData = state.selectedCase;
  const financialStudy = review.financialStudy || null;
  $("factsList").innerHTML = [
    ["Applicant", "المتعامل", displayName(caseData)],
    ["Arrears", "المتأخرات", money(caseData.arrearsAmount)],
    ["Delay", "التأخير", state.lang === "ar" ? `${caseData.monthsDelayed} شهر` : `${caseData.monthsDelayed} months`],
    ["Income", "الدخل", money(caseData.monthlyIncome)],
    ["Obligations", "الالتزامات", money(caseData.monthlyObligations)],
    ["Dependents", "المعالون", caseData.dependents],
    ["Employment", "الحالة الوظيفية", state.lang === "ar" ? caseData.employmentStatusAr || caseData.employmentStatus : caseData.employmentStatus],
    ...(financialStudy ? [
      ["Current installment", "القسط الحالي", money(financialStudy.currentMonthlyInstallment)],
      ["Remaining balance", "الرصيد المتبقي", money(financialStudy.remainingLoanBalance)],
      ["Unpaid installments", "الأقساط غير المسددة", financialStudy.unpaidInstallmentsCount]
    ] : [])
  ].map(([label, ar, value]) => `<div class="detail-item"><span>${dual(label, ar)}</span><strong>${value}</strong></div>`).join("");

  const docListHtml = review.docs.map((doc) => `
    <div class="status-item">
      <span class="mini-pill ${doc.status}">${labelForStatus(doc.status)}</span>
      <strong>${state.lang === "ar" ? doc.arLabel : doc.label}</strong>
      ${doc.aiVerified ? `<span class="mini-pill pass" style="font-size:10px;padding:2px 6px;margin-${state.lang === "ar" ? "right" : "left"}:4px">AI ✓ ${doc.authenticityScore}%</span>` : ""}
      <p>${state.lang === "ar" ? doc.arDetail : doc.detail}</p>
    </div>
  `).join("");

  const verifyBtnHtml = state.selectedCase?.liveApiBacked
    ? `<div style="margin-top:8px"><button id="aiVerifyDocsBtn" class="secondary-action" style="font-size:12px;padding:4px 12px" type="button">${state.lang === "ar" ? "التحقق الذكي من المستندات" : "AI Verify Documents"}</button></div>`
    : "";

  $("documentList").innerHTML = docListHtml + verifyBtnHtml;

  const verifyBtn = document.getElementById("aiVerifyDocsBtn");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      if (!state.selectedCase?.applicationId) return;
      verifyBtn.disabled = true;
      verifyBtn.textContent = state.lang === "ar" ? "جارٍ التحقق..." : "Verifying...";
      try {
        const res = await fetch(`/api/challenge-1/applications/${encodeURIComponent(state.selectedCase.applicationId)}/verify-documents`, { method: "POST" });
        const data = await res.json();
        verifyBtn.textContent = state.lang === "ar"
          ? `تم التحقق من ${data.verified} مستند`
          : `${data.verified} document(s) verified`;
        setTimeout(() => { if (state.selectedCase?.liveApiBacked) selectCase(state.selectedCase.applicationId); }, 800);
      } catch {
        verifyBtn.textContent = state.lang === "ar" ? "خطأ في التحقق" : "Verification error";
        verifyBtn.disabled = false;
      }
    });
  }

  $("ruleTrace").innerHTML = review.rules.map((rule) => `
    <div class="rule-item">
      <div>
        <span>${displayRuleCode(rule.id)}</span>
        <strong>${state.lang === "ar" ? rule.arLabel : rule.label}</strong>
        <p>${state.lang === "ar" ? rule.arReason : rule.reason}</p>
      </div>
      <div>
        <span class="mini-pill ${rule.status}">${labelForStatus(rule.status)}</span>
        <p>${displayRuleCalculation(rule)}</p>
      </div>
    </div>
  `).join("");

  $("recommendationCard").innerHTML = renderRecommendation(review);
  $("aiSpecialistCard").innerHTML = renderAIBrief(review);
  $("systemLog").innerHTML = renderTimeline(review.auditLog);
}

function renderAIBrief(review) {
  const reasoning = review.reasoning || null;
  const study = review.financialStudy;
  const confidenceScore = study?.confidenceScore ?? null;
  const confidenceTone = confidenceScore === null ? "neutral" : confidenceScore >= 80 ? "pass" : confidenceScore >= 60 ? "warn" : "fail";
  const confidenceLabel = confidenceScore === null ? (state.lang === "ar" ? "غير محدد" : "Pending") : confidenceScore >= 80 ? (state.lang === "ar" ? "ثقة عالية" : "High Confidence") : confidenceScore >= 60 ? (state.lang === "ar" ? "ثقة متوسطة" : "Medium Confidence") : (state.lang === "ar" ? "ثقة منخفضة" : "Low Confidence");

  if (!reasoning) {
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="mini-pill neutral">${state.lang === "ar" ? "جارٍ التحليل" : "Analysing"}</span>
        <strong>${state.lang === "ar" ? "ملخص الوكيل الذكي" : "AI Case Brief"}</strong>
      </div>
      <p style="color:var(--text-muted)">${state.lang === "ar" ? "سيتوفر الملخص بعد اكتمال التقييم الخادمي." : "Brief will be available after server assessment completes."}</p>
    `;
  }

  const narrative = state.lang === "ar" ? reasoning.narrativeAr : reasoning.narrativeEn;
  const insights = (reasoning.keyInsights || []).map((ins) => state.lang === "ar" ? ins.ar : ins.en);
  const sourceLabel = reasoning.source === "claude"
    ? (state.lang === "ar" ? `Claude ${reasoning.model || ""}` : `Claude ${reasoning.model || ""}`)
    : (state.lang === "ar" ? "نص احتياطي" : "Fallback text");

  const scoreNum = typeof confidenceScore === "number" ? confidenceScore : null;
  const barColor = confidenceTone === "pass" ? "#00843d" : confidenceTone === "warn" ? "#e59c00" : "#c0392b";

  return `
    <div style="background:var(--surface-2,#f7f9fc);border:1px solid var(--border);border-radius:6px;padding:14px 16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
        <strong style="font-size:13px">${state.lang === "ar" ? "مستوى ثقة الذكاء الاصطناعي" : "AI Confidence Score"}</strong>
        <span style="font-size:22px;font-weight:800;color:${barColor}">${scoreNum !== null ? scoreNum + "%" : "—"}</span>
      </div>
      <div style="background:var(--border,#e0e4ea);border-radius:100px;height:8px;overflow:hidden;margin-bottom:8px">
        <div style="width:${scoreNum || 0}%;height:100%;background:${barColor};border-radius:100px;transition:width 0.6s ease"></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="mini-pill ${confidenceTone}" style="font-size:11px;padding:2px 8px">${confidenceLabel}</span>
        <span style="font-size:11px;color:var(--text-muted)">${sourceLabel}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <strong style="font-size:14px">${state.lang === "ar" ? "ملخص الوكيل الذكي" : "AI Case Brief"}</strong>
    </div>
    <p style="line-height:1.7;margin-bottom:12px;font-size:14px;${state.lang === "ar" ? "font-family:var(--font-arabic,inherit);direction:rtl;text-align:right" : ""}">${escapeHtml(narrative)}</p>
    ${insights.length ? `
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px">
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${state.lang === "ar" ? "النقاط الرئيسية" : "Key Insights"}</p>
      ${insights.map((ins) => `
        <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:4px">
          <span style="color:var(--accent);font-weight:bold;flex-shrink:0">•</span>
          <span style="font-size:13px${state.lang === "ar" ? ";direction:rtl;text-align:right" : ""}">${escapeHtml(ins)}</span>
        </div>
      `).join("")}
    </div>` : ""}
  `;
}

function renderFinancialStudyMetrics(review) {
  const study = review.financialStudy;
  if (!study) return "";
  const periodRule = study.repaymentPeriodRule || {};
  const twentyRule = study.twentyPercentRule || {};
  const activeRule = study.activeRequestCheck || {};
  const confidenceTone = study.confidenceScore >= 80 ? "pass" : study.confidenceScore >= 60 ? "warn" : "fail";
  return `
    <div class="summary-block">
      <span class="note-label">${state.lang === "ar" ? "الدراسة المالية المحددة" : "Deterministic financial study"}</span>
      <div class="recommendation-metric">
        <div><span>${state.lang === "ar" ? "القسط الحالي" : "Current EMI"}</span><strong>${money(study.currentMonthlyInstallment)}</strong></div>
        <div><span>${state.lang === "ar" ? "الرصيد المتبقي" : "Remaining balance"}</span><strong>${money(study.remainingLoanBalance)}</strong></div>
        <div><span>${state.lang === "ar" ? "المتأخرات" : "Arrears"}</span><strong>${money(study.arrearsAmount)}</strong></div>
        <div><span>${state.lang === "ar" ? "السداد المقترح" : "Proposed payment"}</span><strong>${study.proposedMonthlyInstallment ? money(study.proposedMonthlyInstallment) : dual("Not available", "غير متاح")}</strong></div>
        <div><span>${state.lang === "ar" ? "حد ٢٠٪" : "20% cap"}</span><strong>${labelForStatus(twentyRule.status || "neutral")}</strong></div>
        <div><span>${state.lang === "ar" ? "مدة السداد" : "Repayment period"}</span><strong>${labelForStatus(periodRule.status || "neutral")}</strong></div>
        <div><span>${state.lang === "ar" ? "الطلب القائم" : "Active request"}</span><strong>${labelForStatus(activeRule.status || "neutral")}</strong></div>
        <div><span>${state.lang === "ar" ? "الثقة" : "Confidence"}</span><strong><span class="mini-pill ${confidenceTone}">${pct(study.confidenceScore)}</span></strong></div>
      </div>
      ${study.escalationReasons.length ? `
        <p>${state.lang === "ar" ? "أسباب المراجعة: " : "Review reasons: "}${study.escalationReasons.map((reason) => escapeHtml(displayEscalationReason(reason))).join(state.lang === "ar" ? "، " : ", ")}</p>
      ` : `
        <p>${state.lang === "ar" ? "لا توجد أسباب تصعيد في المسار المحدد، ويبقى الاعتماد النهائي للموظف." : "No escalation reasons in the deterministic path; final authorization remains with the officer."}</p>
      `}
    </div>
  `;
}

function renderFinancialStudyEvidence(review) {
  const study = review.financialStudy;
  if (!study) return [];
  return [
    `<div class="status-item"><strong>${dual("20% cap", "حد ٢٠٪")}</strong><p>${displayRuleCalculation(study.twentyPercentRule || {})}</p></div>`,
    `<div class="status-item"><strong>${dual("Repayment period", "مدة السداد")}</strong><p>${displayRuleCalculation(study.repaymentPeriodRule || {})}</p></div>`,
    `<div class="status-item"><strong>${dual("Obligations ratio", "نسبة الالتزامات")}</strong><p>${pct(study.obligationsRatioPct)} · ${money(study.monthlyObligations)}</p></div>`,
    `<div class="status-item"><strong>${dual("Average family income", "متوسط دخل الفرد")}</strong><p>${money(study.averageIncomePerFamilyMember)}</p></div>`,
    `<div class="status-item"><strong>${dual("Final authority", "صلاحية الاعتماد النهائي")}</strong><p>${dual("Verified officer through TrustGate. AI final approval is false.", "الموظف الموثق عبر TrustGate. لا يوجد اعتماد نهائي من الذكاء الاصطناعي.")}</p></div>`
  ];
}

function renderAssessmentResultPack(review, snapshot) {
  const study = review.financialStudy;
  if (!study) return "";
  const rec = review.recommendation;
  const recommendationPath = study.recommendationPath || rec.recommendationPath;
  const confidenceTone = study.confidenceScore >= 80 ? "pass" : study.confidenceScore >= 60 ? "warn" : "fail";
  const documentStatus = study.documentsStatus === "complete"
    ? { tone: "pass", en: "Complete", ar: "مكتملة" }
    : { tone: "fail", en: "Needs correction", ar: "تحتاج تصحيحاً" };
  const classification = recommendationPath === "ready_for_trustgate"
    ? { tone: "pass", en: "Standard approval-ready", ar: "مسار اعتيادي جاهز للاعتماد" }
    : recommendationPath === "request_documents"
      ? { tone: "fail", en: "Correction needed", ar: "مطلوب استكمال المستندات" }
      : recommendationPath === "refer_human_review"
        ? { tone: "warn", en: "Human review required", ar: "مطلوب مراجعة بشرية" }
        : { tone: "warn", en: "Officer decision required", ar: "مطلوب قرار الموظف" };
  const finalAuthority = state.seal
    ? { tone: "pass", en: "Approved through TrustGate", ar: "معتمد عبر TrustGate" }
    : { tone: "neutral", en: "Pending officer authorization", ar: "بانتظار اعتماد الموظف" };
  const duration = study.proposedReschedulingMonths
    ? state.lang === "ar" ? `${study.proposedReschedulingMonths} شهر` : `${study.proposedReschedulingMonths} months`
    : dual("Not available", "غير متاح");
  const escalation = study.escalationReasons.length
    ? study.escalationReasons.map((reason) => escapeHtml(displayEscalationReason(reason))).join(state.lang === "ar" ? "، " : ", ")
    : state.lang === "ar" ? "لا توجد أسباب تصعيد" : "No escalation reasons";
  const escalationCount = study.escalationReasons.length
    ? state.lang === "ar" ? `${study.escalationReasons.length} أسباب للمراجعة` : `${study.escalationReasons.length} review reasons`
    : state.lang === "ar" ? "لا توجد أسباب مراجعة" : "No review reasons";
  const statusLabel = snapshot && workflow
    ? workflow.labelStatus(snapshot.status, state.lang)
    : state.lang === "ar" ? classification.ar : classification.en;
  const rules = [
    { labelEn: "Document completeness", labelAr: "اكتمال المستندات", tone: documentStatus.tone, value: state.lang === "ar" ? documentStatus.ar : documentStatus.en },
    { labelEn: "Active request", labelAr: "الطلب القائم", tone: study.activeRequestCheck?.status || "neutral", value: labelForStatus(study.activeRequestCheck?.status || "neutral") },
    { labelEn: "20% salary cap", labelAr: "حد ٢٠٪ من الراتب", tone: study.twentyPercentRule?.status || "neutral", value: labelForStatus(study.twentyPercentRule?.status || "neutral") },
    { labelEn: "Repayment-period cap", labelAr: "حد مدة السداد", tone: study.repaymentPeriodRule?.status || "neutral", value: labelForStatus(study.repaymentPeriodRule?.status || "neutral") }
  ];

  return `
    <div class="assessment-pack">
      <div class="assessment-pack-head">
        <div>
          <span class="note-label">${state.lang === "ar" ? "نتيجة التقييم الآلي" : "Assessment Result"}</span>
          <h4>${state.lang === "ar" ? "حزمة قرار الموظف" : "Officer Decision Pack"}</h4>
          <p>${state.lang === "ar" ? "ملخص موحد لنتائج خط التقييم السباعي قبل اعتماد الموظف." : "A unified summary of the 7-agent assessment pipeline before officer authorization."}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span class="status-pill ${classification.tone}">${state.lang === "ar" ? classification.ar : classification.en}</span>
          <span style="font-size:20px;font-weight:800;color:${confidenceTone === "pass" ? "#00843d" : confidenceTone === "warn" ? "#e59c00" : "#c0392b"}">${pct(study.confidenceScore)} <span style="font-size:11px;font-weight:500;color:var(--text-muted)">${state.lang === "ar" ? "ثقة" : "confidence"}</span></span>
        </div>
      </div>
      <div class="assessment-pack-grid">
        <div class="assessment-pack-cell">
          <span>${state.lang === "ar" ? "حالة الطلب" : "Application status"}</span>
          <strong>${statusLabel}</strong>
        </div>
        <div class="assessment-pack-cell">
          <span>${state.lang === "ar" ? "الدخل / الالتزامات" : "Income / obligations"}</span>
          <strong>${money(study.currentSalary)} / ${money(study.monthlyObligations)}</strong>
          <small>${state.lang === "ar" ? "نسبة الالتزامات" : "Obligations ratio"}: ${pct(study.obligationsRatioPct)}</small>
        </div>
        <div class="assessment-pack-cell">
          <span>${state.lang === "ar" ? "متوسط دخل الفرد" : "Income per family member"}</span>
          <strong>${money(study.averageIncomePerFamilyMember)}</strong>
        </div>
        <div class="assessment-pack-cell">
          <span>${state.lang === "ar" ? "المتأخرات / الرصيد" : "Arrears / balance"}</span>
          <strong>${money(study.arrearsAmount)} / ${money(study.remainingLoanBalance)}</strong>
          <small>${state.lang === "ar" ? `${study.unpaidInstallmentsCount} أقساط غير مسددة` : `${study.unpaidInstallmentsCount} unpaid installments`}</small>
        </div>
        <div class="assessment-pack-cell">
          <span>${state.lang === "ar" ? "المبلغ والمدة المقترحة" : "Proposed amount and duration"}</span>
          <strong>${study.proposedMonthlyInstallment ? money(study.proposedMonthlyInstallment) : dual("Not available", "غير متاح")}</strong>
          <small>${duration}</small>
        </div>
        <div class="assessment-pack-cell">
          <span>${state.lang === "ar" ? "الثقة" : "Confidence"}</span>
          <strong><span class="mini-pill ${confidenceTone}">${pct(study.confidenceScore)}</span></strong>
          <small>${escalationCount}</small>
        </div>
      </div>
      <div class="assessment-rule-row">
        ${rules.map((rule) => `
          <div>
            <span>${state.lang === "ar" ? rule.labelAr : rule.labelEn}</span>
            <strong class="mini-pill ${rule.tone}">${rule.value}</strong>
          </div>
        `).join("")}
      </div>
      ${study.escalationReasons.length ? `
        <div class="assessment-escalation-row">
          <span>${state.lang === "ar" ? "أسباب المراجعة" : "Review reasons"}</span>
          <p>${escalation}</p>
        </div>
      ` : ""}
      <div class="assessment-authority-row">
        <span class="mini-pill ${finalAuthority.tone}">${state.lang === "ar" ? finalAuthority.ar : finalAuthority.en}</span>
        <p>${state.lang === "ar" ? "التقييم يوصي فقط. الاعتماد النهائي يبقى للموظف الموثق عبر TrustGate." : "The assessment recommends only. Final authority stays with the verified officer through TrustGate."}</p>
      </div>
    </div>
  `;
}

function renderRecommendation(review) {
  const rec = review.recommendation;
  const plan = rec.durationMonths
    ? `<div class="recommendation-metric">
        <div><span>${state.lang === "ar" ? "المدة" : "Duration"}</span><strong>${state.lang === "ar" ? `${rec.durationMonths} شهر` : `${rec.durationMonths} months`}</strong></div>
        <div><span>${state.lang === "ar" ? "القسط الشهري" : "Monthly repayment"}</span><strong>${money(rec.monthlyRepayment)}</strong></div>
      </div>`
    : "";
  return `
    <span class="status-pill ${review.risk.tone}">${state.lang === "ar" ? review.risk.ar : review.risk.label}</span>
    ${plan}
    <p>${state.lang === "ar" ? rec.arRationale : rec.rationale}</p>
    <div class="preview-box">
      <span class="note-label">${state.lang === "ar" ? "الإجراء التالي" : "Next action"}</span>
      <p>${state.lang === "ar" ? rec.arNextAction : rec.nextAction}</p>
    </div>
  `;
}

function renderOfficer() {
  const review = state.review || runSystemReview(state.selectedCase);
  const snapshot = workflow
    ? workflow.buildCaseSnapshot({ ...state.selectedCase, status: state.selectedCase.status || "officer_review" }, review, "office_dashboard")
    : null;
  const statusTone = state.seal ? "pass" : review.risk.tone;
  $("officerStatus").className = `status-pill ${statusTone}`;
  $("officerStatus").innerHTML = state.seal
    ? dual("Approved with digital seal", "معتمد بالختم الرقمي")
    : workflow ? workflow.labelStatus(state.selectedCase.status || "officer_review", state.lang) : dual(review.risk.label, review.risk.ar);

  $("caseQueue").innerHTML = getOfficeCases().map((item) => {
    const active = item.id === state.selectedCase.id ? "active" : "";
    const sourceLabel = item.source === "customer" ? t("officer.sourcePortal") : t("officer.sourceDemo");
    const statusLabel = workflow ? workflow.labelStatus(item.status || "draft", state.lang) : item.status || "";
    const confScore = item.liveAssessment?.financialStudy?.confidenceScore ?? item.financialStudy?.confidenceScore ?? null;
    const confTone = confScore === null ? "" : confScore >= 80 ? "#00843d" : confScore >= 60 ? "#e59c00" : "#c0392b";
    const confBadge = confScore !== null ? `<span style="font-size:11px;font-weight:700;color:${confTone};margin-${state.lang === "ar" ? "right" : "left"}:auto">${confScore}%</span>` : "";
    return `<button class="queue-item ${active}" data-queue-id="${item.id}">
      <strong>${displayName(item)}</strong>
      <span style="display:flex;align-items:center;gap:4px">${item.id}${confBadge}</span>
      <em>${sourceLabel} · ${statusLabel}</em>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-queue-id]").forEach((button) => {
    button.addEventListener("click", () => {
      loadCase(button.dataset.queueId);
      showScreen("officer");
    });
  });

  $("officerSummary").innerHTML = `
    ${renderAssessmentResultPack(review, snapshot)}
    <div class="summary-block source-block">
      <span class="note-label">${state.selectedCase.source === "customer" ? t("officer.sourcePortal") : t("officer.sourceDemo")}</span>
      <p>${state.lang === "ar" ? "تم تحميل هذه الحالة من قائمة الطلبات المشتركة بين بوابة المتعامل ومساحة عمل الموظف." : "This case is loaded from the shared queue between the customer portal and officer workspace."}</p>
    </div>
    ${state.approvalNotice ? `
    <div class="summary-block">
      <span class="note-label">${state.lang === "ar" ? "حالة اعتماد TrustGate" : "TrustGate approval status"}</span>
      <p>${escapeHtml(state.approvalNotice)}</p>
    </div>` : ""}
    ${snapshot ? `
    <div class="summary-block">
      <span class="note-label">${state.lang === "ar" ? "موجز الحالة المجهز" : "Prepared case brief"}</span>
      <p>${state.lang === "ar" ? "هذه نتيجة مجهزة للموظف: فحوصات محددة أولاً، ثم نقطة ذكاء اصطناعي متخصصة عند الحاجة، والاعتماد النهائي يبقى بشرياً." : "This is officer-ready prepared output: deterministic checks first, a specialist AI call point only when needed, and final approval remains human-controlled."}</p>
      <div class="recommendation-metric">
        <div><span>${state.lang === "ar" ? "حالة الطلب" : "Case status"}</span><strong>${workflow.labelStatus(snapshot.status, state.lang)}</strong></div>
        <div><span>${state.lang === "ar" ? "الإجراء المطلوب" : "Required action"}</span><strong>${state.lang === "ar" ? snapshot.recommendation.arNextAction : snapshot.recommendation.nextAction}</strong></div>
        <div><span>${state.lang === "ar" ? "فحص المستندات" : "Document review"}</span><strong>${state.lang === "ar" ? review.documentVerification.status === "ai_specialist_recommended" ? "مراجعة موثوقية" : "فحص محدد" : review.documentVerification.status === "ai_specialist_recommended" ? "Authenticity review" : "Deterministic check"}</strong></div>
        <div><span>${state.lang === "ar" ? "جاهزية النظام" : "System readiness"}</span><strong>${displayWorkerStatus(snapshot.workerStatus)}</strong></div>
        <div><span>${state.lang === "ar" ? "نمط الفحص" : "Review mode"}</span><strong>${state.lang === "ar" ? "فحص بوابة محلي" : "Local gateway check"}</strong></div>
        <div><span>${state.lang === "ar" ? "الحداثة" : "Freshness"}</span><strong>${displayFreshness(snapshot.freshness)}</strong></div>
      </div>
    </div>` : ""}
    ${renderFinancialStudyMetrics(review)}
    <div class="summary-block">
      <span class="note-label">${state.lang === "ar" ? "توصية النظام" : "System recommendation"}</span>
      ${renderRecommendation(review)}
    </div>
    <div class="summary-block">
      <span class="note-label">${state.lang === "ar" ? "ملاحظة الموظف" : "Officer note"}</span>
      <p>${state.lang === "ar" ? "راجع حالة المستندات ومسار القواعد وإفادة المتعامل قبل الاعتماد." : "Review document status, rule trace, and applicant remarks before authorizing."}</p>
    </div>
  `;

  $("officerEvidence").innerHTML = [
    ...renderFinancialStudyEvidence(review),
    `<div class="status-item"><strong>${dual("Documents", "المستندات")}</strong><p>${review.docs.map((doc) => state.lang === "ar" ? doc.arLabel : doc.label).join(state.lang === "ar" ? "؛ " : "; ")}</p></div>`,
    `<div class="status-item"><strong>${dual("Document verification", "التحقق من المستندات")}</strong><p>${state.lang === "ar" ? "الفحص محدد ومقيد، وأي ذكاء اصطناعي يبقى نقطة مساعدة لا يقرر الاعتماد." : "Checks are deterministic and controlled; any AI remains an assistive call point and does not authorize approval."}</p></div>`,
    `<div class="status-item"><strong>${dual("Applicant reason", "سبب المتعامل")}</strong><p>${displayReason(state.selectedCase)}</p></div>`
  ].join("");
}

function renderAudit() {
  const review = state.review || runSystemReview(state.selectedCase);
  $("auditStatus").className = `status-pill ${state.seal ? "pass" : "neutral"}`;
  $("auditStatus").innerHTML = state.seal ? dual("Verified digital seal issued", "تم إصدار ختم رقمي موثق") : dual("Awaiting approval", "بانتظار الاعتماد");

  if (state.seal) {
    $("sealCard").className = "seal-card";
    $("sealCard").innerHTML = `
      <div class="seal-title">${state.lang === "ar" ? "تم الاعتماد رقمياً" : "DIGITALLY APPROVED"}</div>
      <div class="seal-grid">
        <div class="seal-field"><span class="note-label">${state.lang === "ar" ? "رقم الختم" : "Stamp ID"}</span><strong>${state.seal.stampId}</strong></div>
        <div class="seal-field"><span class="note-label">${state.lang === "ar" ? "الموظف" : "Officer"}</span><strong>${state.lang === "ar" ? state.seal.approvedByAr || state.seal.approvedBy : state.seal.approvedBy}</strong></div>
        <div class="seal-field"><span class="note-label">${state.lang === "ar" ? "الإجراء" : "Action"}</span><strong>${state.lang === "ar" ? state.seal.arAction : state.seal.action}</strong></div>
        <div class="seal-field"><span class="note-label">${state.lang === "ar" ? "بصمة البيانات" : "Payload hash"}</span><strong>${state.seal.payloadHash}</strong></div>
      </div>
      <a class="verify-link" href="/verify/?stamp=${encodeURIComponent(state.seal.stampId)}" target="_blank" rel="noreferrer">${state.lang === "ar" ? "فتح صفحة التحقق من الختم" : "Open seal verification page"}</a>
    `;
  } else {
    $("sealCard").className = "seal-card empty";
    $("sealCard").innerHTML = dual("No digital seal issued yet.", "لم يتم إصدار الختم الرقمي بعد.");
  }

  const rec = review.recommendation;
  $("finalSummary").innerHTML = `
    <p><strong>${dual("Case", "الحالة")}:</strong> ${state.selectedCase.id}</p>
    <p><strong>${dual("Applicant", "المتعامل")}:</strong> ${displayName(state.selectedCase)}</p>
    <p><strong>${dual("Recommendation", "التوصية")}:</strong> ${rec.durationMonths ? state.lang === "ar" ? `${rec.durationMonths} شهر بقسط ${money(rec.monthlyRepayment)}` : `${rec.durationMonths} months at ${money(rec.monthlyRepayment)}` : state.lang === "ar" ? rec.arNextAction : rec.nextAction}</p>
    <p><strong>${dual("Control", "التحكم")}:</strong> ${dual("Final action requires verified officer approval.", "الإجراء النهائي يتطلب اعتماداً موثقاً من الموظف.")}</p>
  `;

  const combinedLog = [
    ...review.auditLog,
    ...(review.officerActions || []),
    ...(state.seal ? [{ time: nowTime(), text: `Digital seal ${state.seal.stampId} verified for officer approval.`, ar: `تم توثيق الختم الرقمي ${state.seal.stampId} لاعتماد الموظف.` }] : [])
  ];
  $("auditLog").innerHTML = renderTimeline(combinedLog);
}

function renderTimeline(entries) {
  return entries.map((entry) => `
    <div class="timeline-entry">
      <time>${entry.time}</time>
      <div><p>${state.lang === "ar" ? entry.ar || entry.text : entry.text}</p></div>
    </div>
  `).join("");
}

function labelForStatus(status) {
  const labels = {
    ar: { pass: "تم", warn: "مراجعة", fail: "متوقف", neutral: "معلومة" },
    en: { pass: "Passed", warn: "Review", fail: "Blocked", neutral: "Info" }
  };
  return labels[state.lang][status] || status;
}

async function startTrustGateApproval() {
  syncFormToState();
  prepareCaseForOfficer({ persistIfNeeded: true });
  if (state.selectedCase.liveApiBacked && liveApi?.officeAction) {
    try {
      await liveApi.officeAction({
        applicationId: state.selectedCase.applicationId || state.selectedCase.id,
        officerId: OFFICIAL_APPROVER.subjectId,
        actionType: "prepare_trustgate_approval",
        notes: "Officer prepared case for TrustGate authorization from live office workspace."
      });
    } catch (error) {
      state.approvalNotice = error.message || "Could not prepare live TrustGate approval.";
      renderAll();
      return;
    }
  }
  const pending = buildApprovalContext();
  writePendingTrustGateApproval(pending);

  const approvalUrl = new URL("/", TRUSTGATE_BASE_URL);
  approvalUrl.searchParams.set("client", "moei");
  approvalUrl.searchParams.set("purpose", "approval");
  approvalUrl.searchParams.set("service", "housing-arrears");
  approvalUrl.searchParams.set("caseId", pending.caseId);
  approvalUrl.searchParams.set("action", pending.action);
  approvalUrl.searchParams.set("officialSubjectId", pending.officialSubjectId);
  approvalUrl.searchParams.set("officialName", pending.officialName);
  approvalUrl.searchParams.set("officialRole", pending.officialRole);
  approvalUrl.searchParams.set("requiredPrivilege", pending.requiredPrivilege);
  approvalUrl.searchParams.set("payloadHash", pending.payloadHash);
  approvalUrl.searchParams.set("relyingRequestId", pending.relyingRequestId);
  approvalUrl.searchParams.set("returnUrl", approvalReturnUrl());
  window.location.href = approvalUrl.toString();
}

function consumeTrustGateApprovalCallback() {
  const query = new URLSearchParams(window.location.search);
  if (query.get("trustGatePurpose") !== "approval") return false;

  const pending = readPendingTrustGateApproval();
  if (query.get("trustGateStatus") !== "approved") {
    state.approvalNotice = state.lang === "ar" ? "لم يكتمل اعتماد TrustGate." : "TrustGate approval was not completed.";
    clearPendingTrustGateApproval();
    stripTrustGateCallbackParams();
    return false;
  }

  try {
    const result = decodeBase64UrlJson(query.get("trustGateResult"));
    const validationError = validateTrustGateApprovalResult(result, pending, query);
    if (validationError) {
      state.approvalNotice = validationError;
      stripTrustGateCallbackParams();
      return false;
    }
    issueApprovalSeal(result, pending);
    markTrustGateApprovalConsumed(result.requestId);
    clearPendingTrustGateApproval();
    stripTrustGateCallbackParams();
    state.approvalNotice = "";
    return true;
  } catch (error) {
    state.approvalNotice = error.message || "Could not read the TrustGate approval result.";
    stripTrustGateCallbackParams();
    return false;
  }
}

function issueApprovalSeal(result, pending) {
  if (!state.review) state.review = runSystemReview(state.selectedCase);
  if (!Array.isArray(state.review.officerActions)) state.review.officerActions = [];
  const approval = result.approval;
  state.seal = {
    contractVersion: workflow?.CONTRACTS?.approvalSeal || "approval-seal.v1",
    stampId: `STAMP-2026-${Math.floor(800000 + Math.random() * 9000)}`,
    caseId: state.selectedCase.id,
    approvedBy: approval.officialName,
    approvedByAr: pending.officialNameAr,
    role: approval.officialRole,
    arRole: pending.officialRoleAr,
    action: "Arrears rescheduling recommendation approved",
    approvedAt: new Date(result.approvedAt).toLocaleString("en-AE"),
    method: "TrustGate number matching and PIN",
    arMethod: "مطابقة رقم ورمز PIN عبر TrustGate",
    challengeId: result.requestId,
    payloadHash: approval.payloadHash,
    arAction: "تم اعتماد توصية إعادة جدولة المتأخرات",
    status: "verified",
    trustGate: {
      resultVersion: result.resultVersion,
      requestId: result.requestId,
      relyingRequestId: approval.relyingRequestId,
      selectedNumber: result.selectedNumber,
      numberMatchedAt: result.numberMatchedAt,
      pinVerifiedAt: result.pinVerifiedAt,
      assuranceLevel: result.assuranceLevel,
      requiredPrivilege: pending.requiredPrivilege,
      registeredDeviceId: approval.registeredDevice?.deviceId || "",
      signatureCertificateId: approval.signature?.certificateId || ""
    }
  };
  if (workflow) state.seal = workflow.saveApprovalSeal(state.seal);
  if (state.selectedCase.liveApiBacked && liveApi?.trustGateApprovalCallback) {
    liveApi.trustGateApprovalCallback({
      applicationId: state.selectedCase.applicationId || state.selectedCase.id,
      authorizationResult: "approved",
      authorizedBy: approval.officialSubjectId,
      trustGateTransactionId: result.requestId
    }).then((response) => {
      if (response?.seal?.sealId) {
        state.selectedCase.sealId = response.seal.sealId;
      }
    }).catch((error) => {
      state.approvalNotice = error.message || "Live TrustGate callback was not stored.";
    });
  }
  state.review.officerActions.push({
    time: nowTime(),
    text: `${approval.officialName} approved recommendation through TrustGate number matching and PIN.`,
    ar: `اعتمدت ${pending.officialNameAr} التوصية عبر مطابقة رقم ورمز PIN في TrustGate.`
  });
  state.selectedCase.status = "approved";
  persistOfficerAction("approved", {
    actor: "officer",
    action: `${approval.officialName} approved recommendation through TrustGate number matching and PIN`,
    actionAr: `اعتمدت ${pending.officialNameAr} التوصية عبر TrustGate ورمز PIN`,
    source: "trustgate",
    requiresHumanApproval: true
  });
}

async function addOfficerAction(text, ar) {
  if (!state.review) state.review = runSystemReview(state.selectedCase);
  state.review.officerActions.push({ time: nowTime(), text, ar });
  const status = text.toLowerCase().includes("escalated") ? "officer_review" : "more_information";
  state.selectedCase.status = status;
  const actionType = text.toLowerCase().includes("escalated") ? "refer_human_review" : "request_correction";
  if (state.selectedCase.liveApiBacked && liveApi?.officeAction) {
    try {
      await liveApi.officeAction({
        applicationId: state.selectedCase.applicationId || state.selectedCase.id,
        officerId: OFFICIAL_APPROVER.subjectId,
        actionType,
        notes: text
      });
      await loadLiveOfficeCases();
      const refreshed = getOfficeCases().find((item) => item.id === state.selectedCase.id);
      if (refreshed) state.selectedCase = refreshed;
    } catch (error) {
      state.approvalNotice = error.message || "Could not save live office action.";
    }
    renderAll();
    return;
  }
  persistOfficerAction(status, {
    actor: "officer",
    action: text,
    actionAr: ar,
    source: "officer-workspace",
    requiresHumanApproval: true
  });
  renderAll();
}

function savePreparedSnapshot(status, auditEvent) {
  state.selectedCase.status = status;
  if (!state.review) state.review = runSystemReview(state.selectedCase);
  if (state.selectedCase.liveApiBacked) return null;
  const snapshot = workflow
    ? workflow.buildCaseSnapshot(state.selectedCase, state.review, "status-snapshot-worker")
    : null;
  if (workflow && snapshot) workflow.saveSnapshot(state.selectedCase.id, snapshot);
  if (workflow && state.selectedCase.source === "customer") {
    const updated = workflow.updateSubmission(
      state.selectedCase.id,
      { ...state.selectedCase, status, preparedSnapshotAt: snapshot?.builtAt },
      auditEvent
    );
    if (updated) state.selectedCase = { ...state.selectedCase, ...updated, source: "customer", customerSubmitted: true };
  }
  return snapshot;
}

function persistOfficerAction(status, auditEvent) {
  const snapshot = savePreparedSnapshot(status, auditEvent);
  if (workflow && snapshot) workflow.saveSnapshot(state.selectedCase.id, { ...snapshot, status });
}

init();
