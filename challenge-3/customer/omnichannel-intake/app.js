/* C3 Smart Service — MOEI light theme, wizard-driven, no chatbot */
(function OneCXPortalApp() {
  "use strict";

  const runtimeConfig = window.ArrearsFlowRuntimeConfig || {};
  const TRUSTGATE_BASE_URL = (runtimeConfig.identityProvider && runtimeConfig.identityProvider.baseUrl) || "https://trustgate.sahlabs.me/";
  const API_BASE = runtimeConfig.apiBase || "";

  /* ── i18n strings ─────────────────────────────────────────────────── */
  const STRINGS = {
    ar: {
      brandCountry: "الإمارات العربية المتحدة",
      brandMinistry: "وزارة الطاقة والبنية التحتية",
      bcHome: "الرئيسية",
      bcService: "الخدمة الذكية",
      s1Title: "OneCX",
      s1Desc: "سجّل دخولك للوصول إلى بوابة الخدمات الموحدة.",
      trustgateLoginBtnText: "تسجيل الدخول عبر TrustGate",
      trustgateLoginNote: "مدعوم من خدمة التحقق من الهوية · TrustGate",
      logoutLabel: "تسجيل الخروج",
      langSwitch: "EN",
      ctxIdentityTitle: "هويتك الموثقة",
      ctxVerified: "هوية موثقة",
      ctxCaseTitle: "طلبك الحالي",
      ctxTimelineTitle: "سجل التفاعلات",
      ctxTimelineSub: "جميع القنوات",
      timelineEmpty: "لا يوجد سجل بعد.",
      nextBtn: "التالي ←",
      backBtn: "→ رجوع",
      submitBtn: "تقديم الطلب",
      backLabel: "رجوع",
      estimateLabel: "القسط الشهري المقدّر",
      confirmTitle: "تم تقديم طلبك بنجاح",
      confirmSub: "سيراجع الفريق طلبك وسيتواصل معك خلال 3 أيام عمل.",
      confirmRefLabel: "رقم الطلب",
      confirmNextH: "الخطوات التالية",
      confirmCockpit: "تابع طلبك",
      statusLabels: {
        pending: "قيد المراجعة", under_review: "تحت الدراسة",
        awaiting_document: "بانتظار مستند", approved: "تمت الموافقة",
        rejected: "مرفوض", completed: "مكتمل"
      },
      channelLabels: { web: "الويب", website: "الويب", whatsapp: "واتساب", call: "مكالمة", system: "النظام" },
      errorMsg: "حدث خطأ. يُرجى المحاولة مرة أخرى.",
      uploadedLabel: "تم الرفع ✓",
      uploadBtn: "رفع",
    },
    en: {
      brandCountry: "United Arab Emirates",
      brandMinistry: "Ministry of Energy and Infrastructure",
      bcHome: "Home",
      bcService: "Smart Service",
      s1Title: "OneCX",
      s1Desc: "Sign in to access the unified service portal.",
      trustgateLoginBtnText: "Sign in via TrustGate",
      trustgateLoginNote: "Powered by TrustGate Identity Verification",
      logoutLabel: "Sign out",
      langSwitch: "عربي",
      ctxIdentityTitle: "Your Verified Identity",
      ctxVerified: "Identity Verified",
      ctxCaseTitle: "Your Active Case",
      ctxTimelineTitle: "Interaction History",
      ctxTimelineSub: "All Channels",
      timelineEmpty: "No history yet.",
      nextBtn: "Next →",
      backBtn: "← Back",
      submitBtn: "Submit Application",
      backLabel: "Back",
      estimateLabel: "Estimated Monthly Instalment",
      confirmTitle: "Application Submitted Successfully",
      confirmSub: "Your team will review your application and contact you within 3 business days.",
      confirmRefLabel: "Application Reference",
      confirmNextH: "Next Steps",
      confirmCockpit: "Track Your Application",
      statusLabels: {
        pending: "Under Review", under_review: "Being Studied",
        awaiting_document: "Awaiting Document", approved: "Approved",
        rejected: "Rejected", completed: "Completed"
      },
      channelLabels: { web: "Web", website: "Web", whatsapp: "WhatsApp", call: "Call", system: "System" },
      errorMsg: "An error occurred. Please try again.",
      uploadedLabel: "Uploaded ✓",
      uploadBtn: "Upload",
    }
  };

  /* ── Wizard step definitions (mirrors WizardCore labels) ──────────── */
  const STEPS = {
    ar: [
      { id: "eligibility",   label: "الأهلية",        icon: "✓" },
      { id: "employment",    label: "التوظيف",         icon: "💼" },
      { id: "loan",          label: "القرض",            icon: "🏠" },
      { id: "documents",     label: "المستندات",        icon: "📄" },
      { id: "review",        label: "المراجعة",         icon: "👁" },
      { id: "confirmation",  label: "التأكيد",          icon: "🎉" },
    ],
    en: [
      { id: "eligibility",   label: "Eligibility",     icon: "✓" },
      { id: "employment",    label: "Employment",       icon: "💼" },
      { id: "loan",          label: "Loan Details",     icon: "🏠" },
      { id: "documents",     label: "Documents",        icon: "📄" },
      { id: "review",        label: "Review",           icon: "👁" },
      { id: "confirmation",  label: "Confirmation",     icon: "🎉" },
    ]
  };

  /* ── State ────────────────────────────────────────────────────────── */
  let lang = "ar";
  let customerId = null;
  let displayName = null;
  let journeyId = null;
  let currentStep = 0;
  let caseData = null;
  let submittedRef = null;
  let timeline = [];

  /* form data */
  const formData = {
    emiratesId: "", fullName: "", employmentType: "", employer: "",
    monthlySalary: "", loanRef: "", totalArrears: "", requestedPlan: "12",
    docs: { salary_certificate: null, bank_statement: null, official_mission_letter: null }
  };

  /* ── Session persistence ──────────────────────────────────────────── */
  const SESSION_KEY = "onecx_session_v1";

  function saveSession() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ customerId, displayName, journeyId, lang })); } catch {}
  }
  function loadSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s.customerId) return false;
      customerId = s.customerId;
      displayName = s.displayName;
      journeyId = s.journeyId || null;
      if (s.lang === "en" || s.lang === "ar") lang = s.lang;
      return true;
    } catch { return false; }
  }
  function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }

  /* ── DOM helpers ──────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  function t(key) { return (STRINGS[lang] || STRINGS.ar)[key] || key; }
  function hide(el) { if (el) el.hidden = true; }
  function show(el) { if (el) el.hidden = false; }

  function applyStrings() {
    const s = STRINGS[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    for (const [id, key] of Object.entries({
      brandCountry: "brandCountry", brandMinistry: "brandMinistry",
      bcHome: "bcHome", bcService: "bcService",
      s1Tag: "s1Tag", s1Title: "s1Title", s1Desc: "s1Desc",
      s1NeedH: "s1NeedH", s1Need1: "s1Need1", s1Need2: "s1Need2", s1Need3: "s1Need3",
      s1Rule: "s1Rule", trustgateLoginBtnText: "trustgateLoginBtnText",
      trustgateLoginNote: "trustgateLoginNote", logoutLabel: "logoutLabel",
      ctxIdentityTitle: "ctxIdentityTitle", ctxVerified: "ctxVerified",
      ctxCaseTitle: "ctxCaseTitle", ctxTimelineTitle: "ctxTimelineTitle",
      ctxTimelineSub: "ctxTimelineSub", timelineEmpty: "timelineEmpty",
      langToggle: "langSwitch"
    })) {
      const el = $(id);
      if (el) el.textContent = s[key] || "";
    }
  }

  /* ── TrustGate auth ───────────────────────────────────────────────── */
  function startTrustGateLogin() {
    const loginUrl = new URL("/", TRUSTGATE_BASE_URL);
    loginUrl.searchParams.set("service", "onecx");
    loginUrl.searchParams.set("client", "moei");
    loginUrl.searchParams.set("purpose", "login");
    loginUrl.searchParams.set("lang", lang);
    const returnUrl = new URL(window.location.href);
    ["trustGateRequestId", "trustGateStatus", "trustGatePurpose", "trustGateResult"].forEach(k => returnUrl.searchParams.delete(k));
    loginUrl.searchParams.set("returnUrl", returnUrl.toString());
    window.location.href = loginUrl.toString();
  }

  function decodeBase64UrlJson(value) {
    if (!value) throw new Error("Missing TrustGate result payload.");
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function consumeTrustGateCallback() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("trustGatePurpose") !== "login") return false;
    if (params.get("trustGateStatus") !== "approved") return false;
    try {
      const result = decodeBase64UrlJson(params.get("trustGateResult"));
      if (!result || result.status !== "approved") return false;
      const subject = result.subject || {};
      customerId  = subject.subjectId || subject.emiratesId || "";
      displayName = subject.displayName || customerId;
      const cleanUrl = new URL(window.location.href);
      ["trustGateRequestId", "trustGateStatus", "trustGatePurpose", "trustGateResult"].forEach(k => cleanUrl.searchParams.delete(k));
      window.history.replaceState({}, "", cleanUrl.toString());
      saveSession();
      return true;
    } catch { return false; }
  }

  function logout() {
    clearSession();
    customerId = displayName = journeyId = null;
    currentStep = 0;
    caseData = null;
    submittedRef = null;
    timeline = [];
    for (const k in formData) { if (typeof formData[k] === "object") { for (const dk in formData[k]) formData[k][dk] = null; } else formData[k] = ""; }
    showLogin();
  }

  /* ── Screen transitions ───────────────────────────────────────────── */
  function showLogin() {
    hide($("portalScreen")); show($("loginScreen"));
    hide($("identityBadge")); hide($("logoutBtn"));
  }
  function showPortal() {
    hide($("loginScreen")); show($("portalScreen"));
    const badge = $("identityBadge");
    if (badge) { badge.textContent = displayName || customerId; show(badge); }
    show($("logoutBtn"));
    renderContextPanel();
    fetchCaseStatus();
    renderStep();
  }

  /* ── Context panel ────────────────────────────────────────────────── */
  function renderContextPanel() {
    const ctxName = $("ctxName"); const ctxId = $("ctxId");
    if (ctxName) ctxName.textContent = displayName || "—";
    if (ctxId)   ctxId.textContent   = customerId  || "—";
    show($("identityCtx"));
  }

  function renderCaseCard() {
    if (!caseData) { hide($("caseCtx")); return; }
    const s = STRINGS[lang];
    const idEl = $("ctxCaseId"); if (idEl) idEl.textContent = caseData.applicationId || caseData.id || "—";
    const badge = $("ctxCaseBadge");
    if (badge) {
      const status = caseData.status || "pending";
      badge.textContent = s.statusLabels[status] || status;
      badge.className = "case-badge" + (status === "approved" ? " approved" : status === "rejected" ? " rejected" : "");
    }
    const svc = $("ctxCaseService"); if (svc) svc.textContent = caseData.serviceTitle || t("s1Title");
    const missing = caseData.missingDocuments || [];
    const missingEl = $("ctxMissingDocs");
    if (missingEl) {
      if (missing.length > 0) {
        const listEl = $("ctxMissingList"); if (listEl) listEl.textContent = missing.join(" · ");
        show(missingEl);
      } else hide(missingEl);
    }
    show($("caseCtx"));
  }

  function renderTimeline() {
    const listEl = $("timelineList"); if (!listEl) return;
    if (!timeline.length) {
      listEl.innerHTML = `<p class="timeline-empty">${t("timelineEmpty")}</p>`;
      return;
    }
    const s = STRINGS[lang];
    listEl.innerHTML = timeline.slice(-20).reverse().map(e => {
      const ch = s.channelLabels[e.channel] || e.channel || "";
      const time = e.createdAt ? new Date(e.createdAt).toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
      const icons = { web: "🌐", website: "🌐", whatsapp: "💬", call: "📞", system: "⚙" };
      return `<div class="tl-event">
        <span class="tl-icon">${icons[e.channel] || "📝"}</span>
        <div class="tl-body">
          <div class="tl-meta">${ch} · ${time}</div>
          <div class="tl-text">${e.summary || e.message || ""}</div>
        </div>
      </div>`;
    }).join("");
  }

  async function fetchCaseStatus() {
    if (!journeyId || !journeyId.startsWith("APP-")) return;
    try {
      const r = await fetch(`${API_BASE}/api/challenge-1/applications/${encodeURIComponent(journeyId)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.application) {
        caseData = data.application;
        renderCaseCard();
        if (Array.isArray(caseData.timeline)) { timeline = caseData.timeline; renderTimeline(); }
      }
    } catch {}
  }

  /* ── Progress bar ─────────────────────────────────────────────────── */
  function renderProgressBar() {
    const container = $("progressSteps"); if (!container) return;
    const steps = STEPS[lang];
    container.innerHTML = steps.map((step, i) => {
      const cls = i < currentStep ? "prog-step done" : i === currentStep ? "prog-step active" : "prog-step";
      const dot = i < currentStep ? "✓" : (i + 1).toString();
      return `<div class="${cls}">
        <div class="prog-dot">${dot}</div>
        <div class="prog-label">${step.label}</div>
      </div>`;
    }).join("");
  }

  /* ── Wizard steps ─────────────────────────────────────────────────── */
  function renderStep() {
    renderProgressBar();
    const body = $("wizardBody"); if (!body) return;
    switch (currentStep) {
      case 0: renderStepEligibility(body); break;
      case 1: renderStepEmployment(body); break;
      case 2: renderStepLoan(body); break;
      case 3: renderStepDocuments(body); break;
      case 4: renderStepReview(body); break;
      case 5: renderStepConfirmation(body); break;
      default: renderStepEligibility(body);
    }
  }

  function stepTag(n) { return STEPS[lang][n]?.label || ""; }

  function actionBar(showBack = true) {
    const isSubmit = currentStep === 4;
    const backBtn  = showBack
      ? `<button class="wiz-back-btn" type="button" onclick="window.__c3back()">${t("backLabel")}</button>`
      : "";
    const nextLabel = isSubmit ? t("submitBtn") : t("nextBtn");
    const nextCls   = isSubmit ? "wiz-next-btn submit-btn" : "wiz-next-btn";
    return `<div class="wiz-actions">
      ${backBtn}
      <button id="wizNext" class="${nextCls}" type="button" onclick="window.__c3next()">${nextLabel}</button>
    </div>`;
  }

  /* Step 0 — Eligibility */
  function renderStepEligibility(body) {
    body.innerHTML = `<div class="wiz-step">
      <div class="wiz-tag">${stepTag(0)}</div>
      <h2 class="wiz-title">${lang === "ar" ? "تأكيد الأهلية" : "Confirm Eligibility"}</h2>
      <p class="wiz-sub">${lang === "ar" ? "هل أنت من المستفيدين من قروض الإسكان في برنامج الشيخ زايد؟" : "Are you a housing loan beneficiary under the Sheikh Zayed Housing Programme?"}</p>

      <div class="wiz-field">
        <label class="wiz-label">${lang === "ar" ? "الهوية الإماراتية (موثقة)" : "Emirates ID (verified)"}</label>
        <input class="wiz-input" id="f_emiratesId" type="text" placeholder="${lang === "ar" ? "784-..." : "784-..."}" value="${formData.emiratesId}" />
      </div>
      <div class="wiz-field">
        <label class="wiz-label">${lang === "ar" ? "الاسم الكامل" : "Full Name"}</label>
        <input class="wiz-input" id="f_fullName" type="text" value="${formData.fullName || (displayName || "")}" />
      </div>
      ${actionBar(false)}
    </div>`;
  }

  /* Step 1 — Employment */
  function renderStepEmployment(body) {
    const opts = [
      { v: "government",   ar: "حكومي", en: "Government" },
      { v: "private",      ar: "خاص",   en: "Private" },
      { v: "self_employed",ar: "أعمال حرة", en: "Self-employed" },
      { v: "retired",      ar: "متقاعد",  en: "Retired" },
    ];
    const selOpts = opts.map(o =>
      `<option value="${o.v}" ${formData.employmentType === o.v ? "selected" : ""}>${lang === "ar" ? o.ar : o.en}</option>`
    ).join("");
    body.innerHTML = `<div class="wiz-step">
      <div class="wiz-tag">${stepTag(1)}</div>
      <h2 class="wiz-title">${lang === "ar" ? "بيانات التوظيف" : "Employment Details"}</h2>
      <p class="wiz-sub">${lang === "ar" ? "أدخل بيانات وظيفتك لحساب القدرة على السداد." : "Enter your employment details to calculate repayment capacity."}</p>

      <div class="wiz-grid-2">
        <div class="wiz-field">
          <label class="wiz-label">${lang === "ar" ? "نوع التوظيف" : "Employment Type"}</label>
          <select class="wiz-select" id="f_employmentType">${selOpts}</select>
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${lang === "ar" ? "جهة العمل" : "Employer"}</label>
          <input class="wiz-input" id="f_employer" type="text" value="${formData.employer}" />
        </div>
      </div>
      <div class="wiz-field">
        <label class="wiz-label">${lang === "ar" ? "الراتب الشهري الإجمالي (درهم)" : "Gross Monthly Salary (AED)"}</label>
        <input class="wiz-input" id="f_monthlySalary" type="number" min="0" value="${formData.monthlySalary}" />
        <p class="wiz-field-note">${lang === "ar" ? "الحد الأقصى للقسط: 20% من الراتب" : "Max monthly instalment: 20% of salary"}</p>
      </div>

      <div id="salary-estimate" class="wiz-estimate" ${formData.monthlySalary ? "" : "hidden"}>
        <div><div class="wiz-estimate-label">${t("estimateLabel")}</div></div>
        <div id="salary-estimate-val" class="wiz-estimate-value">${Math.round(Number(formData.monthlySalary) * 0.2).toLocaleString()} ${lang === "ar" ? "د.إ" : "AED"}</div>
      </div>
      ${actionBar()}
    </div>`;
    $("f_monthlySalary")?.addEventListener("input", e => {
      formData.monthlySalary = e.target.value;
      const v = Number(e.target.value);
      const box = $("salary-estimate");
      const val = $("salary-estimate-val");
      if (box) box.hidden = !e.target.value;
      if (val) val.textContent = `${Math.round(v * 0.2).toLocaleString()} ${lang === "ar" ? "د.إ" : "AED"}`;
    });
  }

  /* Step 2 — Loan */
  function renderStepLoan(body) {
    const planOpts = [12, 24, 36, 48, 60].map(m =>
      `<option value="${m}" ${formData.requestedPlan === String(m) ? "selected" : ""}>${m} ${lang === "ar" ? "شهراً" : "months"}</option>`
    ).join("");
    body.innerHTML = `<div class="wiz-step">
      <div class="wiz-tag">${stepTag(2)}</div>
      <h2 class="wiz-title">${lang === "ar" ? "تفاصيل القرض" : "Loan Details"}</h2>
      <p class="wiz-sub">${lang === "ar" ? "أدخل تفاصيل قرضك السكاني وخطة إعادة الجدولة المطلوبة." : "Enter your housing loan details and the requested rescheduling plan."}</p>

      <div class="wiz-grid-2">
        <div class="wiz-field">
          <label class="wiz-label">${lang === "ar" ? "رقم القرض" : "Loan Reference"}</label>
          <input class="wiz-input" id="f_loanRef" type="text" placeholder="${lang === "ar" ? "ZHP-..." : "ZHP-..."}" value="${formData.loanRef}" />
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${lang === "ar" ? "إجمالي المتأخرات (درهم)" : "Total Arrears (AED)"}</label>
          <input class="wiz-input" id="f_totalArrears" type="number" min="0" value="${formData.totalArrears}" />
        </div>
      </div>
      <div class="wiz-field">
        <label class="wiz-label">${lang === "ar" ? "خطة الجدولة المطلوبة" : "Requested Plan"}</label>
        <select class="wiz-select" id="f_requestedPlan">${planOpts}</select>
      </div>

      ${formData.totalArrears && formData.requestedPlan ? `<div class="wiz-estimate">
        <div>
          <div class="wiz-estimate-label">${t("estimateLabel")}</div>
        </div>
        <div class="wiz-estimate-value">${Math.round(Number(formData.totalArrears) / Number(formData.requestedPlan)).toLocaleString()} ${lang === "ar" ? "د.إ" : "AED"}</div>
      </div>` : ""}
      ${actionBar()}
    </div>`;
  }

  /* Step 3 — Documents */
  function renderStepDocuments(body) {
    const docs = [
      { key: "salary_certificate",     ar: "شهادة الراتب",        en: "Salary Certificate",        spec: lang === "ar" ? "أقل من 30 يوماً · PDF/JPG" : "Less than 30 days · PDF/JPG", required: true },
      { key: "official_mission_letter", ar: "خطاب المهمة الرسمية", en: "Official Mission Letter",   spec: lang === "ar" ? "إن وجد · PDF/JPG" : "If applicable · PDF/JPG",         required: false },
      { key: "bank_statement",          ar: "كشف الحساب البنكي",   en: "Bank Statement",            spec: lang === "ar" ? "آخر 3 أشهر · PDF" : "Last 3 months · PDF",              required: false },
    ];
    const rows = docs.map(d => {
      const uploaded = !!formData.docs[d.key];
      const statusHtml = uploaded
        ? `<span class="doc-status uploaded">${t("uploadedLabel")}</span>`
        : `<label class="doc-upload-btn" for="upload_${d.key}">${t("uploadBtn")}<input class="doc-upload-input" id="upload_${d.key}" type="file" accept=".pdf,.jpg,.jpeg,.png" data-dockey="${d.key}" /></label>`;
      return `<div class="doc-row">
        <div class="doc-info">
          <div class="doc-name">${lang === "ar" ? d.ar : d.en}${d.required ? "" : ` <span style="color:var(--muted);font-weight:400;font-size:11px">${lang === "ar" ? "(اختياري)" : "(optional)"}</span>`}</div>
          <div class="doc-spec">${d.spec}</div>
        </div>
        ${statusHtml}
      </div>`;
    }).join("");
    body.innerHTML = `<div class="wiz-step">
      <div class="wiz-tag">${stepTag(3)}</div>
      <h2 class="wiz-title">${lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}</h2>
      <p class="wiz-sub">${lang === "ar" ? "ارفع المستندات المطلوبة. يجب رفع شهادة الراتب على الأقل." : "Upload the required documents. Salary certificate is mandatory."}</p>
      ${rows}
      ${actionBar()}
    </div>`;
    body.querySelectorAll(".doc-upload-input").forEach(input => {
      input.addEventListener("change", e => {
        const key = e.target.dataset.dockey;
        if (e.target.files && e.target.files[0]) {
          formData.docs[key] = e.target.files[0];
          renderStep();
        }
      });
    });
  }

  /* Step 4 — Review */
  function renderStepReview(body) {
    const salary = Number(formData.monthlySalary) || 0;
    const maxInstalment = Math.round(salary * 0.2);
    const arrears = Number(formData.totalArrears) || 0;
    const plan = Number(formData.requestedPlan) || 12;
    const monthlyInstalment = plan > 0 ? Math.round(arrears / plan) : 0;
    const affordable = monthlyInstalment <= maxInstalment;
    const ar = lang === "ar";
    body.innerHTML = `<div class="wiz-step">
      <div class="wiz-tag">${stepTag(4)}</div>
      <h2 class="wiz-title">${ar ? "مراجعة الطلب" : "Review Application"}</h2>
      <p class="wiz-sub">${ar ? "راجع تفاصيل طلبك قبل التقديم." : "Review your application details before submitting."}</p>

      <div class="review-section">
        <div class="review-h">${ar ? "بيانات الهوية" : "Identity"}</div>
        <div class="review-row"><span class="review-key">${ar ? "الاسم" : "Name"}</span><span class="review-val">${formData.fullName || displayName || "—"}</span></div>
        <div class="review-row"><span class="review-key">${ar ? "الهوية الإماراتية" : "Emirates ID"}</span><span class="review-val">${formData.emiratesId || customerId || "—"}</span></div>
      </div>

      <div class="review-section">
        <div class="review-h">${ar ? "بيانات التوظيف" : "Employment"}</div>
        <div class="review-row"><span class="review-key">${ar ? "جهة العمل" : "Employer"}</span><span class="review-val">${formData.employer || "—"}</span></div>
        <div class="review-row"><span class="review-key">${ar ? "الراتب الشهري" : "Monthly Salary"}</span><span class="review-val">${salary.toLocaleString()} ${ar ? "د.إ" : "AED"}</span></div>
      </div>

      <div class="review-section">
        <div class="review-h">${ar ? "بيانات القرض" : "Loan"}</div>
        <div class="review-row"><span class="review-key">${ar ? "رقم القرض" : "Loan Ref"}</span><span class="review-val">${formData.loanRef || "—"}</span></div>
        <div class="review-row"><span class="review-key">${ar ? "إجمالي المتأخرات" : "Total Arrears"}</span><span class="review-val">${arrears.toLocaleString()} ${ar ? "د.إ" : "AED"}</span></div>
        <div class="review-row"><span class="review-key">${ar ? "خطة الجدولة" : "Plan"}</span><span class="review-val">${plan} ${ar ? "شهراً" : "months"}</span></div>
      </div>

      <div class="policy-checks">
        <div class="policy-check">
          <span>${ar ? "القسط الشهري المقدّر:" : "Est. Monthly Instalment:"}</span>
          <span class="policy-check-val" style="color:${affordable ? "var(--green)" : "var(--red)"}">
            ${monthlyInstalment.toLocaleString()} ${ar ? "د.إ" : "AED"} ${affordable ? "✓" : "⚠"}
          </span>
        </div>
        <div class="policy-check">
          <span>${ar ? "الحد الأقصى المسموح به (20%):" : "Max allowed (20%):"}</span>
          <span class="policy-check-val">${maxInstalment.toLocaleString()} ${ar ? "د.إ" : "AED"}</span>
        </div>
      </div>

      <div class="confirm-row">
        <input type="checkbox" id="declarationCheck" />
        <label for="declarationCheck">${ar ? "أقر بأن جميع البيانات المقدمة صحيحة وكاملة، وأوافق على شروط إعادة الجدولة." : "I confirm that all provided information is accurate and complete, and I agree to the rescheduling terms."}</label>
      </div>
      ${actionBar()}
    </div>`;
  }

  /* Step 5 — Confirmation */
  function renderStepConfirmation(body) {
    const ar = lang === "ar";
    body.innerHTML = `<div class="wiz-step">
      <div class="confirm-step">
        <div class="confirm-icon">🎉</div>
        <h2 class="confirm-title">${t("confirmTitle")}</h2>
        <p class="confirm-sub">${t("confirmSub")}</p>
        <div class="confirm-ref-box">
          <div class="confirm-ref-label">${t("confirmRefLabel")}</div>
          <div class="confirm-ref-value">${submittedRef || "—"}</div>
        </div>
        <div class="confirm-next-steps">
          <div class="confirm-next-h">${t("confirmNextH")}</div>
          <ul class="confirm-next-list">
            <li>${ar ? "سيراجع الموظف المختص طلبك خلال 3 أيام عمل" : "A specialist officer will review your application within 3 business days"}</li>
            <li>${ar ? "ستتلقى إشعاراً عبر الرسائل القصيرة والبريد الإلكتروني" : "You will receive notification via SMS and email"}</li>
            <li>${ar ? "يمكنك متابعة طلبك عبر بوابة الخدمات" : "You can track your application via the services portal"}</li>
          </ul>
        </div>
        <a class="confirm-cockpit-btn" href="/customer/">${t("confirmCockpit")}</a>
      </div>
    </div>`;
    renderProgressBar();
  }

  /* ── Navigation ───────────────────────────────────────────────────── */
  function collectFormData() {
    const fields = { f_emiratesId: "emiratesId", f_fullName: "fullName", f_employer: "employer",
      f_monthlySalary: "monthlySalary", f_loanRef: "loanRef", f_totalArrears: "totalArrears",
      f_employmentType: "employmentType", f_requestedPlan: "requestedPlan" };
    for (const [id, key] of Object.entries(fields)) {
      const el = $(id); if (el) formData[key] = el.value.trim();
    }
  }

  function validateStep() {
    collectFormData();
    if (currentStep === 0) {
      if (!formData.emiratesId || !formData.fullName) {
        alert(lang === "ar" ? "يرجى إدخال رقم الهوية الإماراتية والاسم الكامل." : "Please enter Emirates ID and full name.");
        return false;
      }
    }
    if (currentStep === 1) {
      if (!formData.monthlySalary || Number(formData.monthlySalary) <= 0) {
        alert(lang === "ar" ? "يرجى إدخال الراتب الشهري." : "Please enter your monthly salary.");
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.loanRef || !formData.totalArrears || Number(formData.totalArrears) <= 0) {
        alert(lang === "ar" ? "يرجى إدخال رقم القرض وإجمالي المتأخرات." : "Please enter loan reference and total arrears.");
        return false;
      }
    }
    if (currentStep === 3) {
      if (!formData.docs.salary_certificate) {
        alert(lang === "ar" ? "يرجى رفع شهادة الراتب." : "Please upload the salary certificate.");
        return false;
      }
    }
    if (currentStep === 4) {
      if (!$("declarationCheck")?.checked) {
        alert(lang === "ar" ? "يرجى الموافقة على الإقرار قبل التقديم." : "Please accept the declaration before submitting.");
        return false;
      }
    }
    return true;
  }

  async function goNext() {
    if (!validateStep()) return;
    if (currentStep === 4) { await submitApplication(); return; }
    currentStep++;
    renderStep();
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (currentStep === 0) return;
    currentStep--;
    renderStep();
    window.scrollTo(0, 0);
  }

  async function submitApplication() {
    const btn = $("wizNext");
    if (btn) { btn.disabled = true; btn.textContent = lang === "ar" ? "جارٍ التقديم..." : "Submitting..."; }
    try {
      const display = formData.fullName || displayName || customerId || "";
      const payload = {
        language: lang,
        channel: "web_c3",
        customer: {
          displayName: display,
          displayNameAr: display,
          identityRef: customerId || formData.emiratesId || null,
          emiratesIdMasked: formData.emiratesId || customerId || "",
          phoneMasked: "",
          emailMasked: ""
        },
        financial: {
          currentSalary: Number(formData.monthlySalary || 0),
          monthlyObligations: 0,
          existingLoans: true,
          arrearsAmount: Number(formData.totalArrears || 0)
        },
        family: {
          dependentsCount: 0,
          familyMembersCount: 1
        },
        specialCases: {
          officialMissionCase: Boolean(formData.docs?.official_mission_letter)
        },
        remarks: [
          formData.loanRef ? `Loan reference: ${formData.loanRef}` : "",
          formData.totalArrears ? `Declared arrears: AED ${formData.totalArrears}` : "",
          formData.requestedPlan ? `Requested plan: ${formData.requestedPlan} months` : "",
          formData.employmentType ? `Employment type: ${formData.employmentType}` : "",
          formData.employer ? `Employer: ${formData.employer}` : ""
        ].filter(Boolean).join("; "),
        acknowledgement: true
      };
      const r = await fetch(`${API_BASE}/api/challenge-1/applications`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "submit_failed");
      submittedRef = data.application?.applicationId || data.application?.id || data.id || "REF-" + Date.now();
      if (data.application?.applicationId) journeyId = data.application.applicationId;
      caseData = data.application || null;
      saveSession();
      currentStep = 5;
      renderStep();
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("submit error", err);
      alert(t("errorMsg"));
      if (btn) { btn.disabled = false; btn.textContent = t("submitBtn"); }
    }
  }

  /* ── Global callbacks for inline onclick ──────────────────────────── */
  window.__c3next = goNext;
  window.__c3back = goBack;

  /* ── Init ─────────────────────────────────────────────────────────── */
  function init() {
    const restored = loadSession();
    applyStrings();

    $("langToggle")?.addEventListener("click", () => {
      lang = lang === "ar" ? "en" : "ar";
      applyStrings();
      saveSession();
      if (customerId) renderStep();
    });

    $("trustgateLoginBtn")?.addEventListener("click", startTrustGateLogin);
    $("logoutBtn")?.addEventListener("click", logout);

    if (consumeTrustGateCallback()) { showPortal(); return; }
    if (restored)                    { showPortal(); return; }
    showLogin();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
