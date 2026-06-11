(function OneCXLeadershipApp() {
  "use strict";

  const STRINGS = {
    ar: {
      brandCountry: "الإمارات العربية المتحدة",
      brandMinistry: "OneCX — لوحة قيادة الخدمات",
      refresh: "تحديث",
      langToggle: "EN",
      labelTotalInteractions: "إجمالي التفاعلات",
      labelTotalCustomers: "المتعاملون",
      labelEscalated: "حالات مصعّدة",
      labelDeterministic: "معدل الإجابة الحتمية",
      labelDeterministicSub: "بدون تكلفة نموذج",
      labelAvgDuration: "متوسط وقت الاستجابة",
      titleChannels: "التفاعلات حسب القناة",
      subChannels: "توزيع القنوات",
      titleSentiment: "توزيع المشاعر",
      subSentiment: "من الردود الأخيرة",
      titleIntents: "أكثر الاستفسارات",
      subIntents: "حسب النوع",
      titleModels: "كفاءة النماذج",
      subModels: "حتمي مقابل AI",
      titleRiskSignal: "إشارة المخاطر",
      titleQuickNav: "التنقل السريع",
      linkOfficer: "مركز الموظف 360°",
      linkCustomer: "بوابة المتعامل",
      linkHousing: "مكتب الإسكان",
      noData: "لا توجد بيانات بعد",
      updatedAt: "آخر تحديث:",
      msUnit: "مللي ثانية",
      pctDeterministic: "من التفاعلات بدون نموذج AI — توفير في التكلفة",
      channelLabels: {
        web: "الويب 🌐", website: "الويب 🌐",
        whatsapp: "واتساب 💬", call: "مكالمة 📞", system: "النظام 🔔"
      },
      sentimentConfig: [
        { key: "positive",   icon: "😊", label: "إيجابي",  cls: "positive" },
        { key: "neutral",    icon: "😐", label: "محايد",   cls: "neutral" },
        { key: "frustrated", icon: "😤", label: "محبط",    cls: "frustrated" },
        { key: "angry",      icon: "😠", label: "غاضب",    cls: "angry" }
      ],
      riskSignalLabels: {
        escalationRateOk: "معدل التصعيد منخفض",
        escalationRateWarn: "معدل تصعيد متوسط",
        escalationRateCrit: "تصعيد مرتفع — تدخل مطلوب",
        deterministicOk: "الإجابة الحتمية تعمل بكفاءة",
        satisfactionOk: "رضا المتعاملين جيد",
        satisfactionWarn: "مشاعر سلبية ملحوظة"
      },
      intentLabels: {
        track_case: "تتبع الطلب",
        document_check: "التحقق من مستند",
        document_received_check: "استلام مستند",
        timeline_inquiry: "استفسار عن الجدول الزمني",
        general_faq: "سؤال عام",
        unknown: "غير محدد",
        session_start: "بداية جلسة",
        complaint: "شكوى",
        upload_document: "رفع مستند"
      },
      modelLabels: {
        deterministic: "حتمي 🟢",
        "gpt-4o-mini": "GPT-4o mini",
        "claude-haiku": "Claude Haiku",
        unknown: "غير معروف"
      }
    },
    en: {
      brandCountry: "United Arab Emirates",
      brandMinistry: "OneCX — Service Leadership Dashboard",
      refresh: "Refresh",
      langToggle: "ع",
      labelTotalInteractions: "Total Interactions",
      labelTotalCustomers: "Customers",
      labelEscalated: "Escalated Cases",
      labelDeterministic: "Deterministic Rate",
      labelDeterministicSub: "No model cost",
      labelAvgDuration: "Avg Response Time",
      titleChannels: "Interactions by Channel",
      subChannels: "Channel distribution",
      titleSentiment: "Sentiment Distribution",
      subSentiment: "From recent responses",
      titleIntents: "Top Request Types",
      subIntents: "By intent",
      titleModels: "Model Efficiency",
      subModels: "Deterministic vs AI",
      titleRiskSignal: "Risk Signals",
      titleQuickNav: "Quick Navigation",
      linkOfficer: "Officer 360° Center",
      linkCustomer: "Customer Portal",
      linkHousing: "Housing Office",
      noData: "No data yet",
      updatedAt: "Last updated:",
      msUnit: "ms",
      pctDeterministic: "of interactions resolved without AI model — cost saving",
      channelLabels: {
        web: "Web 🌐", website: "Web 🌐",
        whatsapp: "WhatsApp 💬", call: "Call 📞", system: "System 🔔"
      },
      sentimentConfig: [
        { key: "positive",   icon: "😊", label: "Positive",   cls: "positive" },
        { key: "neutral",    icon: "😐", label: "Neutral",    cls: "neutral" },
        { key: "frustrated", icon: "😤", label: "Frustrated", cls: "frustrated" },
        { key: "angry",      icon: "😠", label: "Angry",      cls: "angry" }
      ],
      riskSignalLabels: {
        escalationRateOk: "Escalation rate is low",
        escalationRateWarn: "Moderate escalation rate",
        escalationRateCrit: "High escalation — action required",
        deterministicOk: "Deterministic engine running efficiently",
        satisfactionOk: "Customer satisfaction is healthy",
        satisfactionWarn: "Negative sentiment detected"
      },
      intentLabels: {
        track_case: "Track Case",
        document_check: "Document Check",
        document_received_check: "Document Receipt",
        timeline_inquiry: "Timeline Inquiry",
        general_faq: "General FAQ",
        unknown: "Unknown",
        session_start: "Session Start",
        complaint: "Complaint",
        upload_document: "Upload Document"
      },
      modelLabels: {
        deterministic: "Deterministic 🟢",
        "gpt-4o-mini": "GPT-4o mini",
        "claude-haiku": "Claude Haiku",
        unknown: "Unknown"
      }
    }
  };

  let lang = localStorage.getItem("onecx-leadership-lang") || "ar";
  let lastData = null;

  function t(key) { return (STRINGS[lang] || STRINGS.ar)[key] || key; }
  function tObj(key) { return (STRINGS[lang] || STRINGS.ar)[key] || {}; }

  function applyStrings() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const ids = [
      "brandCountry","brandMinistry","labelTotalInteractions","labelTotalCustomers",
      "labelEscalated","labelDeterministic","labelDeterministicSub","labelAvgDuration",
      "titleChannels","subChannels","titleSentiment","subSentiment",
      "titleIntents","subIntents","titleModels","subModels",
      "titleRiskSignal","titleQuickNav","linkOfficer","linkCustomer","linkHousing"
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(id);
    });
    document.getElementById("refreshBtn").textContent = t("refresh");
    document.getElementById("langToggle").textContent = t("langToggle");
  }

  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── Render helpers ────────────────────────────────────────────

  function renderBarChart(containerId, items, maxVal, labelMap, colorKey) {
    const container = document.getElementById(containerId);
    if (!items || !items.length) {
      container.innerHTML = `<p class="empty-chart">${t("noData")}</p>`;
      return;
    }
    container.innerHTML = "";
    items.forEach(({ label, count }) => {
      const pct = maxVal ? Math.round((count / maxVal) * 100) : 0;
      const displayLabel = labelMap[label] || label;
      const colorClass = colorKey ? (colorKey === "label" ? label : colorKey) : "";
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="bar-label">${escHtml(displayLabel)}</div>
        <div class="bar-track">
          <div class="bar-fill ${colorClass}" style="width:${pct}%"></div>
        </div>
        <div class="bar-count">${count}</div>
      `;
      container.appendChild(row);
    });
  }

  function renderSentimentChart(breakdown, total) {
    const container = document.getElementById("sentimentChart");
    const cfg = tObj("sentimentConfig");
    if (!total) {
      container.innerHTML = `<p class="empty-chart">${t("noData")}</p>`;
      return;
    }
    container.innerHTML = "";
    cfg.forEach(({ key, icon, label, cls }) => {
      const count = breakdown[key] || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const row = document.createElement("div");
      row.className = "sentiment-row";
      row.innerHTML = `
        <span class="sentiment-icon">${icon}</span>
        <div class="sentiment-track">
          <div class="sentiment-fill bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <div class="sentiment-meta">${label} <strong>${pct}%</strong></div>
      `;
      container.appendChild(row);
    });
  }

  function renderRiskSignals(data) {
    const container = document.getElementById("riskSignal");
    const labels = tObj("riskSignalLabels");
    const signals = [];

    // escalation rate
    const er = data.totals.escalationRate || 0;
    if (er < 15) {
      signals.push({ cls: "green", icon: "✅", val: `${er}%`, lbl: labels.escalationRateOk });
    } else if (er < 40) {
      signals.push({ cls: "yellow", icon: "⚠️", val: `${er}%`, lbl: labels.escalationRateWarn });
    } else {
      signals.push({ cls: "red", icon: "🚨", val: `${er}%`, lbl: labels.escalationRateCrit });
    }

    // deterministic rate
    const dr = data.totals.deterministicRate || 0;
    if (dr >= 60) {
      signals.push({ cls: "green", icon: "⚡", val: `${dr}%`, lbl: labels.deterministicOk });
    }

    // sentiment: check negative ratio
    const sent = data.sentimentBreakdown || {};
    const total = data.totals.interactions || 1;
    const negative = (sent.frustrated || 0) + (sent.angry || 0);
    const negPct = Math.round((negative / total) * 100);
    if (negPct < 20) {
      signals.push({ cls: "green", icon: "😊", val: `${100 - negPct}%`, lbl: labels.satisfactionOk });
    } else {
      signals.push({ cls: "yellow", icon: "😤", val: `${negPct}%`, lbl: labels.satisfactionWarn });
    }

    container.innerHTML = "";
    signals.forEach(s => {
      const pill = document.createElement("div");
      pill.className = `signal-pill ${s.cls}`;
      pill.innerHTML = `
        <span class="signal-pill-icon">${s.icon}</span>
        <div class="signal-pill-body">
          <span class="signal-pill-val">${s.val}</span>
          <span class="signal-pill-lbl">${escHtml(s.lbl)}</span>
        </div>
      `;
      container.appendChild(pill);
    });
  }

  // ── Load & render ─────────────────────────────────────────────
  async function loadKpis() {
    try {
      const res = await fetch("/api/challenge-3/leadership/kpis");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      lastData = data;
      renderDashboard(data);
    } catch (err) {
      console.error("Leadership KPI fetch failed:", err.message);
    }
  }

  function renderDashboard(data) {
    const t_ = data.totals;
    const intLabel = tObj("intentLabels");
    const modelLabel = tObj("modelLabels");
    const channelLabel = tObj("channelLabels");

    // KPI cards
    document.getElementById("totalInteractions").textContent = t_.interactions;
    document.getElementById("totalCustomers").textContent = t_.customers;
    document.getElementById("totalEscalated").textContent = t_.escalated;
    document.getElementById("escalationRate").textContent = `${t_.escalationRate}%`;
    document.getElementById("deterministicRate").textContent = `${t_.deterministicRate}%`;
    document.getElementById("avgDuration").textContent = t_.avgDurationMs ? `${t_.avgDurationMs} ${t("msUnit")}` : "—";

    const last24 = data.last24h || {};
    document.getElementById("kpiLast24h").textContent =
      last24.interactions !== undefined ? `+${last24.interactions} ${lang === "ar" ? "آخر 24 ساعة" : "last 24h"}` : "";

    // Channel chart
    const chBreak = data.channelBreakdown || {};
    const chItems = Object.entries(chBreak)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
    const chMax = chItems.length ? chItems[0].count : 1;
    renderBarChart("channelChart", chItems, chMax, channelLabel, "label");

    // Sentiment chart
    renderSentimentChart(data.sentimentBreakdown || {}, t_.interactions);

    // Intent chart
    const intItems = (data.topIntents || []).map(({ intent, count }) => ({ label: intent, count }));
    const intMax = intItems.length ? intItems[0].count : 1;
    renderBarChart("intentChart", intItems, intMax, intLabel, "");

    // Model chart
    const modBreak = data.modelUsage || {};
    const modItems = Object.entries(modBreak)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
    const modMax = modItems.length ? modItems[0].count : 1;
    renderBarChart("modelChart", modItems, modMax, modelLabel, "label");

    // Cost note
    const costNote = document.getElementById("costNote");
    if (t_.deterministicRate >= 0) {
      costNote.textContent = `${t_.deterministicRate}% ${t("pctDeterministic")}`;
      costNote.style.display = "block";
    }

    // Risk signals
    renderRiskSignals(data);

    // Last updated
    document.getElementById("lastUpdated").textContent =
      `${t("updatedAt")} ${new Date(data.generatedAt).toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-AE", { hour: "2-digit", minute: "2-digit" })}`;
  }

  // ── MOEI Dataset Panel ────────────────────────────────────────
  async function loadDatasetPanel() {
    try {
      const res = await fetch("/api/challenge-3/dataset/stats");
      if (!res.ok) return;
      const ds = await res.json();
      const t = ds.totals;
      const isAr = lang === "ar";

      const fmt = (n) => n != null ? n.toLocaleString() : "—";

      document.getElementById("dsWhatsapp").textContent = fmt(ds.channelBreakdown?.whatsapp);
      document.getElementById("dsVoice").textContent = fmt(ds.channelBreakdown?.voice);
      document.getElementById("dsWeb").textContent = fmt(ds.channelBreakdown?.web);
      document.getElementById("dsCrm").textContent = fmt(t?.crmProfiles);
      document.getElementById("dsTotal").textContent = fmt(t?.totalInteractions);
      document.getElementById("dsTotalLabel").textContent = isAr ? "إجمالي التفاعلات" : "Total Interactions";
      document.getElementById("dsVoiceLabel").textContent = isAr ? "اتصالات" : "Voice";
      document.getElementById("dsCsat").textContent = ds.csatAvg != null ? ds.csatAvg.toFixed(1) : "—";
      document.getElementById("dsFcr").textContent = ds.fcrRate != null ? `${ds.fcrRate}%` : "—";
      document.getElementById("dsEscalation").textContent = ds.escalationRate != null ? `${ds.escalationRate}%` : "—";
      document.getElementById("dsEscLabel").textContent = isAr ? "معدل التصعيد" : "Escalation Rate";
      document.getElementById("datasetSource").textContent = ds.source || "MOEI Official Dataset";

      const pillContainer = document.getElementById("dsTopServices");
      pillContainer.innerHTML = "";
      (ds.topServiceCategories || []).slice(0, 6).forEach(({ label, count }) => {
        const pill = document.createElement("span");
        pill.className = "ds-service-pill";
        pill.textContent = `${label} (${count})`;
        pillContainer.appendChild(pill);
      });
    } catch (_) {}
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    const session = window.MoeiTrustGateAuth?.requireAccess({
      service: "onecx-leadership",
      storageKey: "moei-trustgate-session:challenge-3-leadership",
      requiredPrivilege: "seal.override",
      productName: "OneCX Leadership Dashboard",
      title: lang === "ar" ? "تسجيل الدخول إلى لوحة القيادة" : "Sign in to leadership dashboard",
      copy: lang === "ar"
        ? "لوحة القيادة تعرض مؤشرات تشغيلية على مستوى الخدمة. استخدم TrustGate للتحقق من صلاحية القيادة قبل عرض البيانات."
        : "The leadership dashboard shows service-level operating intelligence. Use TrustGate to verify senior access before viewing data."
    });
    if (!session) return;

    applyStrings();
    loadKpis();
    loadDatasetPanel();

    document.getElementById("refreshBtn").addEventListener("click", () => { loadKpis(); loadDatasetPanel(); });

    document.getElementById("langToggle").addEventListener("click", () => {
      lang = lang === "ar" ? "en" : "ar";
      localStorage.setItem("onecx-leadership-lang", lang);
      applyStrings();
      if (lastData) renderDashboard(lastData);
    });

    // auto-refresh every 60s
    setInterval(loadKpis, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
