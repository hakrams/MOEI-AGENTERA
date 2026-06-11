/* ── MOEI Case Cockpit — Sprint 1 ───────────────────────────────────── */

const APP_VERSION = 'v1.0.0';

const STAGES = [
  { key: "submitted", en: "Submitted",  ar: "تم التقديم" },
  { key: "documents", en: "Documents",  ar: "المستندات" },
  { key: "ai_review", en: "AI Review",  ar: "المراجعة الذكية", arShort: "المراجعة" },
  { key: "officer",   en: "Officer",    ar: "الموظف المختص",  arShort: "المختص"   },
  { key: "decision",  en: "Decision",   ar: "القرار" }
];

const MOCK_CASES = {
  missing_document: {
    citizenId:    "DEMO-KHALID",
    name:         { en: "Khalid Al Mansouri",   ar: "خالد المنصوري" },
    programme:    { en: "Sheikh Zayed Housing Programme", ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth:   62,
    healthLabel:  { en: "Needs attention",      ar: "يحتاج إلى انتباه" },
    nextUpdate:   { en: "Upload required",      ar: "مطلوب رفع مستند" },
    arrearsAed:   40000,
    stage:        "documents",
    blocker: {
      title:  { en: "Upload latest salary certificate", ar: "رفع شهادة راتب حديثة" },
      sub:    { en: "Your previous certificate is older than 30 days", ar: "شهادتك السابقة تجاوزت 30 يوماً" },
      action: { en: "Upload", ar: "رفع" }
    },
    officer:          null,
    recommendation:   null,
    appointment:      null
  },

  under_review: {
    citizenId:    "DEMO-FATIMA",
    name:         { en: "Fatima Al Zaabi",       ar: "فاطمة الزعابي" },
    programme:    { en: "Sheikh Zayed Housing Programme", ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth:   84,
    healthLabel:  { en: "Low delay risk",        ar: "مخاطر تأخير منخفضة" },
    nextUpdate:   { en: "2 days",                ar: "خلال يومين" },
    arrearsAed:   35000,
    stage:        "ai_review",
    blocker:      null,
    officer: {
      name:     { en: "Aisha Al Nuaimi",         ar: "عائشة النعيمي" },
      role:     { en: "Financial Review Officer", ar: "موظفة المراجعة المالية" },
      activity: { en: "Checking repayment capacity", ar: "فحص القدرة على السداد" }
    },
    recommendation: null,
    appointment:    null
  },

  recommendation_ready: {
    citizenId:    "DEMO-AHMED",
    name:         { en: "Ahmed Al Ketbi",        ar: "أحمد الكتبي" },
    programme:    { en: "Sheikh Zayed Housing Programme", ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth:   95,
    healthLabel:  { en: "Decision ready",        ar: "القرار جاهز" },
    nextUpdate:   { en: "Review plan",           ar: "راجع الخطة" },
    arrearsAed:   28000,
    stage:        "decision",
    blocker:      null,
    officer: {
      name:     { en: "Mohammed Al Hammadi",     ar: "محمد الحمادي" },
      role:     { en: "Senior Case Officer",     ar: "مسؤول الطلبات الأول" },
      activity: { en: "Recommendation prepared", ar: "تم إعداد التوصية" }
    },
    recommendation: {
      deductionPct: 18,
      path:       { en: "Maintain current installment", ar: "الحفاظ على القسط الحالي" },
      duration:   { en: "Within original loan period",  ar: "ضمن مدة القرض الأصلية" }
    },
    appointment: null
  },

  human_review: {
    citizenId:    "DEMO-MOHAMMED",
    name:         { en: "Mohammed Al Rashdi",    ar: "محمد الراشدي" },
    programme:    { en: "Sheikh Zayed Housing Programme", ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth:   71,
    healthLabel:  { en: "Officer review needed", ar: "مراجعة الموظف المختص مطلوبة" },
    nextUpdate:   { en: "Thursday",              ar: "الخميس" },
    arrearsAed:   55000,
    stage:        "officer",
    blocker:      null,
    officer: {
      name:     { en: "Sara Al Darmaki",         ar: "سارة الدرماكي" },
      role:     { en: "Housing Assessment Officer", ar: "موظفة تقييم الطلبات السكنية" },
      activity: { en: "Scheduling review meeting", ar: "جدولة اجتماع المراجعة" }
    },
    recommendation: null,
    appointment: {
      date:      { en: "Thursday, 12 Jun 2026", ar: "الخميس، 12 يونيو 2026" },
      mode:      { en: "In person — MOEI Abu Dhabi", ar: "حضوري — وزارة الطاقة والبنية التحتية، أبوظبي" },
      dayNum: "12", monthShort: "JUN"
    }
  }
};

/* ── State ──────────────────────────────────────────────────────────── */
const state = {
  lang:            "en",
  applicationId:   null,
  demoKey:         null,
  viewMode:        "entry",
  caseData:        null,
  loadError:       null,
  devOpen:         false,
  debugMode:       false,
  activeNav:       "home",
  swReg:           null,
  updateAvailable: false,
  updateWorker:    null,
  updateCheckMsg:  null
};

/* ── Boot ───────────────────────────────────────────────────────────── */
function boot() {
  const params     = new URLSearchParams(window.location.search);
  const appIdParam = params.get("applicationId");
  const demoParam  = params.get("demo");

  if (params.get("lang") === "ar") state.lang = "ar";
  state.debugMode = params.get("debug") === "1";

  if (appIdParam) {
    state.applicationId = appIdParam.trim().toUpperCase();
    state.viewMode = "live";
  } else if (state.debugMode && demoParam && MOCK_CASES[demoParam]) {
    state.demoKey = demoParam;
    state.viewMode = "demo";
  }

  registerSW();
  loadCase().then(() => {
    render();
    bindEvents();
  });
}

async function loadCase() {
  state.caseData = null;
  state.loadError = null;

  if (state.viewMode === "entry") return;

  if (state.viewMode === "demo") {
    state.caseData = MOCK_CASES[state.demoKey] || null;
    if (!state.caseData) {
      state.viewMode = "not_found";
      state.loadError = "demo_not_found";
    }
    return;
  }

  if (!state.applicationId || !state.applicationId.startsWith("APP-")) {
    state.viewMode = "not_found";
    state.loadError = "invalid_application_id";
    return;
  }

  try {
    const res = await fetch(`/api/app/case/${encodeURIComponent(state.applicationId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.stage) { state.caseData = json; return; }
    }
    state.loadError = res.status === 404 ? "application_not_found" : "case_load_failed";
  } catch (_) {
    state.loadError = "case_load_failed";
  }
  state.viewMode = "not_found";
}

/* ── Service Worker ─────────────────────────────────────────────────── */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' })
    .then(reg => {
      state.swReg = reg;

      // Worker already waiting (e.g. user had app open in another tab)
      if (reg.waiting) {
        state.updateAvailable = true;
        state.updateWorker    = reg.waiting;
        render(); bindEvents();
        return;
      }

      reg.addEventListener('updatefound', () => {
        const incoming = reg.installing;
        incoming.addEventListener('statechange', () => {
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            state.updateAvailable = true;
            state.updateWorker    = incoming;
            render(); bindEvents();
          }
        });
      });
    })
    .catch(() => { /* SW not supported or blocked — silent */ });

  // Once new SW takes control, reload to activate it
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function t(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[state.lang] || obj.en || "";
}

function fmt(n) {
  return Number(n).toLocaleString("en-AE");
}

function greeting() {
  const h = new Date().getHours();
  if (state.lang === "ar") return h < 12 ? "صباح الخير" : "مساء الخير";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function stageIndex(key) {
  return STAGES.findIndex(s => s.key === key);
}

/* ── Render ─────────────────────────────────────────────────────────── */
function render() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir  = state.lang === "ar" ? "rtl" : "ltr";
  document.title = state.lang === "ar" ? "بوابة طلبات الإسكان" : "MOEI Case Cockpit";

  const root = document.getElementById("app");
  const c = state.caseData;

  if (state.viewMode === "entry") {
    root.innerHTML = buildShell(buildEntryView());
    return;
  }

  if (state.viewMode === "not_found" || !c) {
    root.innerHTML = buildShell(buildNotFoundView());
    return;
  }

  const mainContent = state.activeNav === "settings"
    ? buildSettingsView()
    : `
        ${buildGreeting(c)}
        ${buildStatRow(c)}
        ${buildFinancialCard(c)}
        ${c.blocker ? buildBlockerCard(c.blocker) : buildReadyCard(c)}
        ${buildTracker(c)}
        ${buildPrimaryCard(c)}
        ${buildQuickGrid()}
        ${buildDecisionCard(c)}
      `;

  root.innerHTML = buildShell(`
        ${mainContent}
      `);
}

function buildShell(mainContent) {
  return `
    <div class="app-shell">
      ${buildUpdateBanner()}
      ${buildHeader()}
      <main class="scroll-body">
        ${mainContent}
      </main>
      ${buildBottomNav()}
      ${buildDevSwitcher()}
    </div>
  `;
}

function buildEntryView() {
  const title = state.lang === "ar" ? "تتبّع طلب الإسكان" : "Track your housing request";
  const sub = state.lang === "ar"
    ? "ابدأ طلباً ذكياً جديداً أو أدخل رقم طلب قائم لعرض حالته المباشرة. لا يتم عرض أي حالة تجريبية في هذا التطبيق."
    : "Start a new smart request or enter an existing application ID to view the live case status. This app does not show demo cases by default.";
  const trackLabel = state.lang === "ar" ? "رقم الطلب" : "Application ID";
  const placeholder = "APP-000001";
  const trackBtn = state.lang === "ar" ? "تتبع الطلب" : "Track request";
  const startBtn = state.lang === "ar" ? "ابدأ الطلب الذكي" : "Start Smart Request";
  const serviceBtn = state.lang === "ar" ? "صفحة الخدمة" : "Service page";
  const trustBtn = state.lang === "ar" ? "TrustGate" : "TrustGate";
  const note = state.lang === "ar"
    ? "تظهر بيانات الطلب بعد إرساله عبر التطبيق أو خدمة إعادة جدولة متأخرات الإسكان."
    : "Case data appears here after submission through the app or the Housing Arrears service.";
  return `
    <section class="empty-state-card">
      <div class="empty-kicker">${state.lang === "ar" ? "بوابة الطلبات" : "Case Cockpit"}</div>
      <h1>${title}</h1>
      <p>${sub}</p>
      <div class="entry-action-grid">
        <a class="start-link" href="/app/wizard.html?lang=${state.lang}">${startBtn}</a>
        <a class="secondary-action entry-link" href="/customer/housing-arrears/?lang=${state.lang}">${serviceBtn}</a>
        <a class="secondary-action entry-link" href="https://trustgate.sahlabs.me" target="_blank" rel="noopener">${trustBtn}</a>
      </div>
      <form class="track-form" id="trackForm">
        <label for="trackApplicationId">${trackLabel}</label>
        <div class="track-row">
          <input id="trackApplicationId" name="applicationId" autocomplete="off" placeholder="${placeholder}">
          <button type="submit">${trackBtn}</button>
        </div>
      </form>
      <p class="empty-note">${note}</p>
    </section>
  `;
}

function buildNotFoundView() {
  const title = state.lang === "ar" ? "لم يتم العثور على الطلب" : "Application not found";
  const sub = state.lang === "ar"
    ? "تحقق من رقم الطلب أو ارجع إلى خدمة إعادة جدولة المتأخرات."
    : "Check the application ID or return to the Housing Arrears service.";
  const trackBtn = state.lang === "ar" ? "تتبع طلب آخر" : "Track another request";
  const startBtn = state.lang === "ar" ? "فتح الخدمة" : "Open service";
  const error = state.loadError || "not_found";
  return `
    <section class="empty-state-card">
      <div class="empty-kicker">${state.lang === "ar" ? "حالة مباشرة فقط" : "Live cases only"}</div>
      <h1>${title}</h1>
      <p>${sub}</p>
      <div class="not-found-code">${state.applicationId || error}</div>
      <div class="empty-actions">
        <button class="secondary-action" id="trackAnotherBtn">${trackBtn}</button>
        <a class="start-link" href="/customer/housing-arrears/?lang=${state.lang}">${startBtn}</a>
      </div>
    </section>
  `;
}

/* ── Update banner ──────────────────────────────────────────────────── */
function buildUpdateBanner() {
  if (!state.updateAvailable) return "";
  const title  = state.lang === "ar" ? "تحديث جديد متاح" : "New version available";
  const sub    = state.lang === "ar" ? "أعد التحميل للحصول على أحدث نسخة" : "Reload for the latest version";
  const btnNow = state.lang === "ar" ? "تحديث الآن" : "Update now";
  const btnLtr = state.lang === "ar" ? "لاحقاً" : "Later";
  return `
    <div class="update-banner">
      <div class="update-banner-body">
        <div class="update-banner-icon">↑</div>
        <div>
          <div class="update-banner-title">${title}</div>
          <div class="update-banner-sub">${sub}</div>
        </div>
      </div>
      <div class="update-banner-btns">
        <button class="update-btn-now" id="updateNowBtn">${btnNow}</button>
        <button class="update-btn-later" id="updateLaterBtn">${btnLtr}</button>
      </div>
    </div>
  `;
}

/* ── Header ─────────────────────────────────────────────────────────── */
function buildHeader() {
  const langLabel = state.lang === "en" ? "عربي" : "English";
  return `
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark">M</div>
        <span class="brand-name">MOEI</span>
      </div>
      <button class="lang-toggle" id="langToggle">${langLabel}</button>
    </header>
  `;
}

/* ── Greeting ───────────────────────────────────────────────────────── */
function buildGreeting(c) {
  const firstName = t(c.name).split(" ")[0];
  return `
    <div class="greeting">
      <div class="greeting-time">${greeting()}, ${firstName}</div>
      <div class="programme-badge">${t(c.programme)}</div>
    </div>
  `;
}

/* ── Stat row ───────────────────────────────────────────────────────── */
function buildStatRow(c) {
  const healthColor = c.caseHealth >= 80 ? "green" : c.caseHealth >= 60 ? "gold" : "";
  return `
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-label">${state.lang === "ar" ? "حالة الطلب" : "CASE HEALTH"}</div>
        <div class="stat-value ${healthColor}">${c.caseHealth}%</div>
        <div class="stat-sub">${t(c.healthLabel)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${state.lang === "ar" ? "التحديث القادم" : "NEXT UPDATE"}</div>
        <div class="stat-value" style="font-size:20px;line-height:1.3;margin-top:8px">${t(c.nextUpdate)}</div>
        <div class="stat-sub">${state.lang === "ar" ? "الوقت المتوقع" : "Estimated timeline"}</div>
      </div>
    </div>
  `;
}

/* ── Financial card ─────────────────────────────────────────────────── */
function buildFinancialCard(c) {
  const label = state.lang === "ar" ? "الملخص المالي" : "FINANCIAL SNAPSHOT";
  const arrearLabel = state.lang === "ar" ? "متأخرات القرض السكني" : "Housing arrears";
  const proofLabel = (() => {
    const verified  = ["decision", "approved"].includes(c.stage);
    const reviewing = c.stage === "ai_review";
    if (state.lang === "ar") {
      if (verified)  return "تم التحقق من حد 20% · مسار التدقيق";
      if (reviewing) return "حد 20% قيد المراجعة · مسار التدقيق";
      return "جارٍ التحقق من حد 20% · مسار التدقيق";
    }
    if (verified)  return "20% rule verified · policy trail";
    if (reviewing) return "20% rule under review · policy trail";
    return "20% rule check in progress · policy trail";
  })();
  return `
    <div class="financial-card" role="button" tabindex="0">
      <div class="financial-body">
        <div class="financial-label">${label}</div>
        <div class="financial-amount">${state.lang === "ar" ? `${fmt(c.arrearsAed)} درهم` : `AED ${fmt(c.arrearsAed)}`}</div>
        <div class="financial-sub">${arrearLabel}</div>
        <div class="financial-proof">${proofLabel}</div>
      </div>
      <div class="financial-arrow">›</div>
    </div>
  `;
}

/* ── Blocker card ───────────────────────────────────────────────────── */
function buildBlockerCard(blocker) {
  return `
    <div class="blocker-card">
      <div class="blocker-icon">!</div>
      <div class="blocker-text">
        <div class="blocker-title">${t(blocker.title)}</div>
        <div class="blocker-sub">${t(blocker.sub)}</div>
      </div>
      <button class="blocker-action" id="blockerAction">${t(blocker.action)}</button>
    </div>
  `;
}

/* ── READY card ─────────────────────────────────────────────────────── */
function buildReadyCard(c) {
  const isHumanReview  = c.stage === "officer";
  const isAiReview     = c.stage === "ai_review";
  const isDecision     = c.stage === "decision";

  const dotColor  = isHumanReview ? "blue" : isAiReview ? "gold" : "green";
  const cardClass = isHumanReview ? "" : isAiReview ? " gold-state" : "";

  const statusLabel = isHumanReview
    ? (state.lang === "ar" ? "مراجعة الموظف" : "IN REVIEW")
    : isAiReview
      ? (state.lang === "ar" ? "قيد المراجعة الذكية" : "IN REVIEW")
      : isDecision
        ? (state.lang === "ar" ? "التوصية جاهزة" : "RECOMMENDATION READY")
        : (state.lang === "ar" ? "جاهز" : "READY");

  const message = isHumanReview
    ? t({ en: "Officer review scheduled",       ar: "تمت جدولة مراجعة الموظف المختص" })
    : isAiReview
      ? t({ en: "No action needed from you",    ar: "لا يلزمك أي إجراء" })
      : isDecision
        ? t({ en: "Review proposed repayment plan", ar: "راجع خطة إعادة الجدولة المقترحة" })
        : t({ en: "No action needed from you",  ar: "لا يلزمك أي إجراء" });

  const detail = isHumanReview
    ? t({ en: "A housing assessment officer will review your case.", ar: "ستتولى الموظفة المختصة مراجعة طلبك." })
    : isAiReview
      ? t({ en: "MOEI is checking your repayment capacity. We'll update you.", ar: "تقوم الوزارة بفحص قدرتك على السداد. سنخبرك عند التحديث." })
      : isDecision
        ? t({ en: "Your officer has prepared a restructuring plan. Review and confirm to proceed.", ar: "أعدّ الموظف المختص خطة إعادة جدولة. راجعها وأكّدها للمتابعة." })
        : t({ en: "Your case is moving forward.",   ar: "طلبك قيد المعالجة." });

  const officerLine = c.officer
    ? `<div class="ready-officer">${state.lang === "ar" ? "الموظف المختص" : "Officer"}: ${t(c.officer.name)} · ${t(c.officer.activity)}</div>`
    : "";

  const etaLine = `<div class="ready-eta">${state.lang === "ar" ? "التحديث القادم" : "Next update"}: ${t(c.nextUpdate)}</div>`;

  const appointmentLine = c.appointment ? (() => {
    const d = c.appointment.dayNum;
    const m = c.appointment.monthShort;
    const calIcon = d
      ? `<div class="appointment-cal" style="background:#1a3a6b;border-radius:8px;padding:4px 7px;text-align:center;min-width:38px;flex-shrink:0"><div style="font-size:8px;font-weight:700;color:#c9a227;text-transform:uppercase;line-height:1.2;letter-spacing:0.5px">${m}</div><div style="font-size:17px;font-weight:800;color:#fff;line-height:1.2">${d}</div></div>`
      : `<div class="appointment-icon" style="font-size:22px">🗓</div>`;
    return `
    <div class="appointment-strip">
      ${calIcon}
      <div class="appointment-info">
        <div class="appointment-date">${t(c.appointment.date)}</div>
        <div class="appointment-mode">${t(c.appointment.mode)}</div>
      </div>
    </div>`;
  })() : "";

  return `
    <div class="ready-card${cardClass}">
      <div class="ready-header">
        <div class="status-dot-wrap ${dotColor}">
          <div class="status-dot ${dotColor}"></div>
        </div>
        <span class="ready-status-label">${statusLabel}</span>
      </div>
      <div class="ready-message">${message}</div>
      <div class="ready-detail">${detail}</div>
      ${officerLine}
      ${etaLine}
      ${appointmentLine}
    </div>
  `;
}

/* ── Tracker ────────────────────────────────────────────────────────── */
function buildTracker(c) {
  const current = stageIndex(c.stage);
  const title = state.lang === "ar" ? "مسار الطلب" : "CASE PROGRESS";

  let pipelineHtml = "";
  STAGES.forEach((stage, i) => {
    const done    = i < current;
    const active  = i === current;
    const cls     = done ? "done" : active ? "current" : "future";

    pipelineHtml += `
      <div class="t-step ${cls}">
        <div class="t-dot ${cls}"></div>
        <span class="t-label">${state.lang === "ar" ? (stage.arShort || stage.ar) : stage.en}</span>
      </div>
    `;

    if (i < STAGES.length - 1) {
      const lineCls = done ? "done" : active ? "active" : "";
      pipelineHtml += `<div class="t-connector ${lineCls}"></div>`;
    }
  });

  return `
    <div class="tracker-card">
      <div class="tracker-title">${title}</div>
      <div class="tracker-pipeline">${pipelineHtml}</div>
    </div>
  `;
}

/* ── Primary action card ────────────────────────────────────────────── */
function buildPrimaryCard(c) {
  if (c.blocker || c.stage === "documents") {
    return `
      <div class="primary-action" role="button" tabindex="0" id="blockerAction" style="border-color:rgba(255,107,117,0.4)">
        <div class="primary-icon-wrap">📤</div>
        <div class="primary-text">
          <div class="primary-title">${state.lang === "ar" ? "رفع شهادة الراتب" : "Upload salary certificate"}</div>
          <div class="primary-sub">${state.lang === "ar" ? "تم إيقاف الطلب مؤقتاً لحين رفع المستند" : "Your case is paused until uploaded"}</div>
        </div>
        <div class="primary-arrow">›</div>
      </div>`;
  }

  if (c.stage === "decision" && c.recommendation) {
    const deduct = `${c.recommendation.deductionPct}% · ${t(c.recommendation.path)}`;
    return `
      <div class="primary-action" role="button" tabindex="0">
        <div class="primary-icon-wrap">📋</div>
        <div class="primary-text">
          <div class="primary-title">${state.lang === "ar" ? "راجع الخطة المقترحة" : "Review proposed plan"}</div>
          <div class="primary-sub">${deduct}</div>
        </div>
        <div class="primary-arrow">›</div>
      </div>`;
  }

  if (c.stage === "officer" && c.appointment) {
    return `
      <div class="primary-action" role="button" tabindex="0">
        <div class="primary-icon-wrap">🗓</div>
        <div class="primary-text">
          <div class="primary-title">${state.lang === "ar" ? "عرض الموعد" : "View appointment"}</div>
          <div class="primary-sub">${t(c.appointment.date)}</div>
        </div>
        <div class="primary-arrow">›</div>
      </div>`;
  }

  if (c.stage === "ai_review") {
    return `
      <div class="primary-action" role="button" tabindex="0">
        <div class="primary-icon-wrap">📡</div>
        <div class="primary-text">
          <div class="primary-title">${state.lang === "ar" ? "تتبّع تقدم طلبك" : "Track case progress"}</div>
          <div class="primary-sub">${state.lang === "ar" ? "المراجعة جارية — لا يلزمك أي إجراء" : "Review in progress — no action needed"}</div>
        </div>
        <div class="primary-arrow">›</div>
      </div>`;
  }

  return "";
}

/* ── Quick grid ─────────────────────────────────────────────────────── */
function buildQuickGrid() {
  const cards = [
    {
      icon: "📄", cls: "navy",
      title: { en: "Documents",          ar: "المستندات" },
      sub:   { en: "Salary cert, income, support files", ar: "شهادة الراتب، بيانات الدخل، المستندات الداعمة" }
    },
    {
      icon: "📷", cls: "gold",
      title: { en: "Smart Scan",         ar: "المسح الذكي" },
      sub:   { en: "Scan document, AI reads it", ar: "امسح المستند ليقوم النظام بقراءته" }
    },
    {
      icon: "💰", cls: "green",
      title: { en: "Repayment",          ar: "قدرة السداد" },
      sub:   { en: "See estimated safe deduction", ar: "اطّلع على الاستقطاع الآمن المقدّر" }
    },
    {
      icon: "🛡", cls: "blue",
      title: { en: "Case Health",        ar: "حالة الطلب" },
      sub:   { en: "Policy checks, delay risk", ar: "فحوصات السياسة ومخاطر التأخير" }
    }
  ];

  const cardsHtml = cards.map(card => `
    <div class="quick-card" role="button" tabindex="0">
      <div class="quick-icon ${card.cls}">${card.icon}</div>
      <div>
        <div class="quick-title">${t(card.title)}</div>
        <div class="quick-sub">${t(card.sub)}</div>
      </div>
    </div>
  `).join("");

  return `<div class="quick-grid">${cardsHtml}</div>`;
}

/* ── Decision / urgent card ─────────────────────────────────────────── */
function buildDecisionCard(c) {
  if (c.blocker) {
    const label = state.lang === "ar" ? "أكمل اليوم" : "COMPLETE TODAY";
    const title = t(c.blocker.title);
    const sub   = state.lang === "ar" ? "تم إيقاف الطلب مؤقتاً لحين رفع المستند" : "Your case is paused until this is uploaded";
    return `
      <div class="decision-card urgent" role="button" tabindex="0">
        <div class="decision-dot"></div>
        <div class="decision-text">
          <div class="decision-label">${label}</div>
          <div class="decision-title">${title}</div>
          <div class="decision-sub">${sub}</div>
        </div>
        <div class="decision-arrow">›</div>
      </div>
    `;
  }

  if (c.recommendation) {
    const label = state.lang === "ar" ? "الخطة المقترحة جاهزة" : "PROPOSED PLAN READY";
    const title = state.lang === "ar" ? "راجع خطة إعادة الجدولة" : "Review your restructuring plan";
    const sub   = `${state.lang === "ar" ? "الاستقطاع المقترح" : "Proposed deduction"}: ${c.recommendation.deductionPct}% · ${t(c.recommendation.path)}`;
    return `
      <div class="decision-card ready" role="button" tabindex="0">
        <div class="decision-dot"></div>
        <div class="decision-text">
          <div class="decision-label">${label}</div>
          <div class="decision-title">${title}</div>
          <div class="decision-sub">${sub}</div>
        </div>
        <div class="decision-arrow">›</div>
      </div>
    `;
  }

  return "";
}

/* ── Settings view ──────────────────────────────────────────────────── */
function buildSettingsView() {
  const msgHtml = state.updateCheckMsg
    ? `<div class="settings-msg settings-msg--${state.updateCheckMsg.type}">${state.updateCheckMsg.text}</div>`
    : "";

  const swStatus = state.swReg
    ? (state.lang === "ar" ? "مفعّل — وضع عدم الاتصال جاهز" : "Active — offline ready")
    : (state.lang === "ar" ? "غير متاح في هذا المتصفح" : "Not available in this browser");

  return `
    <div class="settings-view">

      <div class="settings-section">
        <div class="settings-section-title">${state.lang === "ar" ? "التطبيق" : "App"}</div>
        <div class="settings-row">
          <span class="settings-row-label">${state.lang === "ar" ? "الإصدار" : "Version"}</span>
          <span class="settings-row-value">${APP_VERSION} · Sprint 1</span>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">${state.lang === "ar" ? "وضع عدم الاتصال" : "Offline service"}</span>
          <span class="settings-row-value">${swStatus}</span>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${state.lang === "ar" ? "التحديثات" : "Updates"}</div>
        ${msgHtml}
        <button class="settings-btn" id="checkUpdateBtn">
          ${state.lang === "ar" ? "التحقق من التحديثات" : "Check for updates"}
        </button>
        <button class="settings-btn settings-btn--secondary" id="clearCacheBtn">
          ${state.lang === "ar" ? "مسح التخزين المؤقت وإعادة التحميل" : "Clear cache & reload"}
        </button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${state.lang === "ar" ? "عن التطبيق" : "About"}</div>
        <div class="settings-row">
          <span class="settings-row-label">MOEI Case Cockpit</span>
          <span class="settings-row-value">${state.lang === "ar" ? "نظام إدارة طلبات المتعامل" : "Citizen case management"}</span>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">${state.lang === "ar" ? "يعتمد على" : "Built on"}</span>
          <span class="settings-row-value">ArrearsFlow · MOEI 2026</span>
        </div>
      </div>

    </div>
  `;
}

/* ── Bottom nav ─────────────────────────────────────────────────────── */
function buildBottomNav() {
  const items = [
    { key: "docs",     icon: "📄", en: "Documents", ar: "المستندات" },
    { key: "timeline", icon: "◷",  en: "Timeline",  ar: "المسار" },
    { key: "decision", icon: "✓",  en: "Decision",  ar: "القرار" },
    { key: "settings", icon: "⚙",  en: "Settings",  ar: "الإعدادات" }
  ];
  const navHtml = items.map(item => `
    <div class="nav-item ${state.activeNav === item.key ? "active" : ""}" data-nav="${item.key}">
      <div class="nav-icon">${item.icon}</div>
      <span>${state.lang === "ar" ? item.ar : item.en}</span>
    </div>
  `).join("");
  return `<nav class="bottom-nav"><div class="nav-items">${navHtml}</div></nav>`;
}

/* ── Dev switcher — only visible with ?debug=1 ──────────────────────── */
function buildDevSwitcher() {
  if (!state.debugMode) return "";
  const options = [
    { key: "missing_document",    label: "🔴 Missing document" },
    { key: "under_review",        label: "🟡 Under review" },
    { key: "recommendation_ready",label: "🟢 Plan ready" },
    { key: "human_review",        label: "🔵 Human review" }
  ];
  const optHtml = options.map(o => `
    <button class="dev-option ${state.demoKey === o.key ? "active" : ""}" data-demo="${o.key}">${o.label}</button>
  `).join("");

  return `
    <div class="dev-switcher">
      <div class="dev-panel" id="devPanel" ${state.devOpen ? "" : "hidden"}>
        ${optHtml}
      </div>
      <div class="dev-badge" id="devBadge">DEV</div>
    </div>
  `;
}

/* ── Events ─────────────────────────────────────────────────────────── */
function bindEvents() {
  document.getElementById("app").addEventListener("click", handleClick);
  document.getElementById("app").addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") handleClick(e);
  });
}

async function handleClick(e) {
  const trackForm = e.target.closest("#trackForm");
  if (trackForm) {
    e.preventDefault();
    const input = document.getElementById("trackApplicationId");
    const applicationId = String(input?.value || "").trim().toUpperCase();
    if (!applicationId) return;
    const params = new URLSearchParams({ applicationId, lang: state.lang });
    window.location.href = `/app/?${params.toString()}`;
    return;
  }

  if (e.target.closest("#trackAnotherBtn")) {
    state.applicationId = null;
    state.caseData = null;
    state.loadError = null;
    state.viewMode = "entry";
    render(); bindEvents();
    return;
  }

  /* lang toggle */
  if (e.target.closest("#langToggle")) {
    state.lang = state.lang === "en" ? "ar" : "en";
    render(); bindEvents();
    return;
  }

  /* update banner — update now */
  if (e.target.closest("#updateNowBtn")) {
    if (state.updateWorker) {
      state.updateWorker.postMessage({ type: "SKIP_WAITING" });
    }
    return;
  }

  /* update banner — later */
  if (e.target.closest("#updateLaterBtn")) {
    state.updateAvailable = false;
    render(); bindEvents();
    return;
  }

  /* settings — check for updates */
  if (e.target.closest("#checkUpdateBtn")) {
    if (!state.swReg) {
      state.updateCheckMsg = { type: "info", text: state.lang === "ar" ? "الخدمة غير مدعومة في هذا المتصفح" : "Service worker not supported in this browser" };
      render(); bindEvents();
      return;
    }
    state.updateCheckMsg = { type: "info", text: state.lang === "ar" ? "جارٍ التحقق..." : "Checking..." };
    render(); bindEvents();
    state.swReg.update()
      .then(() => {
        if (!state.updateAvailable) {
          state.updateCheckMsg = { type: "ok", text: state.lang === "ar" ? "أنت تستخدم أحدث إصدار ✓" : "You're on the latest version ✓" };
          render(); bindEvents();
        }
      })
      .catch(() => {
        state.updateCheckMsg = { type: "err", text: state.lang === "ar" ? "تعذّر التحقق — يرجى التأكد من الاتصال" : "Could not check — verify your connection" };
        render(); bindEvents();
      });
    return;
  }

  /* settings — clear cache */
  if (e.target.closest("#clearCacheBtn")) {
    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => {
          state.updateCheckMsg = { type: "ok", text: state.lang === "ar" ? "تم مسح التخزين المؤقت، جارٍ إعادة التحميل…" : "Cache cleared — reloading…" };
          render(); bindEvents();
          setTimeout(() => window.location.reload(), 900);
        });
    } else {
      window.location.reload();
    }
    return;
  }

  /* dev badge */
  if (e.target.closest("#devBadge")) {
    state.devOpen = !state.devOpen;
    const panel = document.getElementById("devPanel");
    if (panel) panel.hidden = !state.devOpen;
    return;
  }

  /* dev option */
  const devOption = e.target.closest("[data-demo]");
  if (devOption) {
    const key = devOption.dataset.demo;
    if (MOCK_CASES[key]) {
      state.demoKey  = key;
      state.devOpen  = false;
      await loadCase();
      render(); bindEvents();
    }
    return;
  }

  /* bottom nav */
  const navItem = e.target.closest("[data-nav]");
  if (navItem) {
    state.activeNav      = navItem.dataset.nav;
    state.updateCheckMsg = null; // reset settings message on nav change
    render(); bindEvents();
    return;
  }
}

/* ── Go ─────────────────────────────────────────────────────────────── */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
