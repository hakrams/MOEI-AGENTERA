(function OneCXOfficerApp() {
  "use strict";

  const STRINGS = {
    ar: {
      brandCountry: "الإمارات العربية المتحدة",
      brandMinistry: "OneCX — مركز الموظف 360°",
      officerBadge: "موظف متقدم",
      refresh: "تحديث",
      langToggle: "EN",
      kpiTotalLabel: "تفاعل",
      kpiEscalatedLabel: "مصعّد",
      kpiDeterministicLabel: "حتمي",
      queueTitle: "قائمة التصعيد",
      viewAllLabel: "الكل",
      queueEmpty: "لا توجد حالات مصعّدة حالياً",
      emptyState360Text: "اختر حالة من القائمة لعرض ملف المتعامل الكامل",
      liveFeedTitle: "آخر التفاعلات — جميع المتعاملين",
      customerTimelineTitle: "مسار المتعامل عبر القنوات",
      customerTimelineSub: "جميع القنوات",
      copilotTitle: "المساعد الذكي للموظف",
      copilotLoadingText: "يحلل الحالة بالذكاء الاصطناعي...",
      runCopilotLabel: "تحليل بالذكاء الاصطناعي",
      focusFullLabel: "تحليل كامل",
      focusRiskLabel: "المخاطر فقط",
      focusReplyLabel: "رد مقترح فقط",
      cpCaseSummary: "ملخص الحالة",
      cpCustomerNeed: "حاجة المتعامل",
      cpRiskAssessment: "تقييم المخاطر",
      cpSentimentRisk: "المزاج",
      cpSlaRisk: "المهلة",
      cpEscalationRisk: "التصعيد",
      cpNextAction: "الإجراء المُوصى به",
      cpSuggestedReply: "رد مُقترح للمتعامل",
      cpMustNot: "لا تعد بـ",
      cpCopy: "نسخ",
      cpCopied: "تم النسخ",
      riskLabels: { high: "عالي", medium: "متوسط", low: "منخفض" },
      sentimentLabels: { positive: "😊 إيجابي", neutral: "😐 محايد", frustrated: "😤 محبط", angry: "😠 غاضب" },
      channelLabels: { web: "الويب", website: "الويب", whatsapp: "واتساب", call: "مكالمة", system: "النظام" },
      timeAgo: { now: "الآن", min: "د", hour: "س" },
      escalationRisk: "خطر تصعيد",
      needsOfficer: "يحتاج موظف",
      deterministicLabel: "🟢 حتمي",
      noTimeline: "لا توجد تفاعلات مسجلة لهذا المتعامل",
      copilotUnconfigured: "المساعد الذكي غير مُهيأ. تأكد من إعداد ANTHROPIC_API_KEY."
    },
    en: {
      brandCountry: "United Arab Emirates",
      brandMinistry: "OneCX — Officer 360° Center",
      officerBadge: "Senior Officer",
      refresh: "Refresh",
      langToggle: "ع",
      kpiTotalLabel: "interactions",
      kpiEscalatedLabel: "escalated",
      kpiDeterministicLabel: "deterministic",
      queueTitle: "Escalation Queue",
      viewAllLabel: "All",
      queueEmpty: "No escalated cases at this time",
      emptyState360Text: "Select a case from the queue to view the full customer profile",
      liveFeedTitle: "Latest Interactions — All Customers",
      customerTimelineTitle: "Customer Channel Journey",
      customerTimelineSub: "All Channels",
      copilotTitle: "AI Officer Co-Pilot",
      copilotLoadingText: "Analysing case with AI...",
      runCopilotLabel: "Analyse with AI",
      focusFullLabel: "Full Analysis",
      focusRiskLabel: "Risk Only",
      focusReplyLabel: "Reply Only",
      cpCaseSummary: "Case Summary",
      cpCustomerNeed: "Customer Need",
      cpRiskAssessment: "Risk Assessment",
      cpSentimentRisk: "Sentiment",
      cpSlaRisk: "SLA",
      cpEscalationRisk: "Escalation",
      cpNextAction: "Recommended Next Action",
      cpSuggestedReply: "Suggested Officer Reply",
      cpMustNot: "Do Not Promise",
      cpCopy: "Copy",
      cpCopied: "Copied",
      riskLabels: { high: "High", medium: "Medium", low: "Low" },
      sentimentLabels: { positive: "😊 Positive", neutral: "😐 Neutral", frustrated: "😤 Frustrated", angry: "😠 Angry" },
      channelLabels: { web: "Web", website: "Web", whatsapp: "WhatsApp", call: "Call", system: "System" },
      timeAgo: { now: "now", min: "m", hour: "h" },
      escalationRisk: "Escalation risk",
      needsOfficer: "Needs officer",
      deterministicLabel: "🟢 Deterministic",
      noTimeline: "No recorded interactions for this customer",
      copilotUnconfigured: "AI co-pilot not configured. Set ANTHROPIC_API_KEY."
    }
  };

  const CHANNEL_ICONS = {
    web: "🌐", website: "🌐", whatsapp: "💬", call: "📞", system: "🔔"
  };

  let lang = localStorage.getItem("onecx-officer-lang") || "ar";
  let activeCustomerId = null;
  let allEvents = [];

  function t(key) { return (STRINGS[lang] || STRINGS.ar)[key] || key; }
  function tObj(key) { return (STRINGS[lang] || STRINGS.ar)[key] || {}; }

  function applyStrings() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const ids = [
      "brandCountry","brandMinistry","officerBadge","kpiTotalLabel",
      "kpiEscalatedLabel","kpiDeterministicLabel","queueTitle","viewAllLabel",
      "emptyState360Text","liveFeedTitle","customerTimelineTitle","customerTimelineSub",
      "copilotTitle","copilotLoadingText","runCopilotLabel",
      "focusFullLabel","focusRiskLabel","focusReplyLabel"
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = t(id);
    });
    document.getElementById("refreshBtn").textContent = t("refresh");
    document.getElementById("langToggle").textContent = t("langToggle");
  }

  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    const ta = tObj("timeAgo");
    if (diff < 60) return ta.now;
    if (diff < 3600) return `${Math.floor(diff/60)}${ta.min}`;
    return `${Math.floor(diff/3600)}${ta.hour}`;
  }

  function formatTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-AE", { hour: "2-digit", minute: "2-digit" });
  }

  function scoreClass(score) {
    if (score >= 70) return "score-high";
    if (score >= 40) return "score-medium";
    return "score-low";
  }

  function riskClass(level) {
    if (level === "high")   return "risk-high";
    if (level === "medium") return "risk-medium";
    return "risk-low";
  }

  async function apiFetch(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── KPIs ─────────────────────────────────────────────────────
  function updateKpis(events) {
    const total = events.length;
    const escalated = events.filter(e => e.requiresHuman || e.escalationScore >= 50).length;
    const deterministic = events.filter(e => e.deterministicAnswerUsed).length;
    document.getElementById("kpiTotal").textContent = total;
    document.getElementById("kpiEscalated").textContent = escalated;
    document.getElementById("kpiDeterministic").textContent = deterministic;
  }

  // ── Queue ─────────────────────────────────────────────────────
  async function loadQueue() {
    const container = document.getElementById("queueList");
    try {
      const data = await apiFetch("/api/challenge-3/officer/queue");
      document.getElementById("queueCount").textContent = data.total;
      if (!data.escalations || !data.escalations.length) {
        container.innerHTML = `<p class="empty-state small">${t("queueEmpty")}</p>`;
        return;
      }
      container.innerHTML = "";
      data.escalations.forEach(e => {
        const item = document.createElement("div");
        item.className = "queue-item";
        if (e.customerId === activeCustomerId) item.classList.add("active");
        const channel = e.currentChannel || e.channel || "web";
        item.innerHTML = `
          <div class="escalation-score ${scoreClass(e.escalationScore)}">${e.escalationScore || 0}</div>
          <div class="queue-item-body">
            <div class="queue-item-id">${escHtml(e.customerId)}</div>
            <div class="queue-item-meta">${CHANNEL_ICONS[channel] || "?"} ${escHtml(e.normalizedIntent || "—")}</div>
            <div class="queue-item-meta">${escHtml((e.rawMessage || "").slice(0, 45))}</div>
          </div>
          <div class="queue-channel-icon">${timeAgo(e.timestamp)}</div>
        `;
        item.addEventListener("click", () => loadCustomer360(e.customerId, item));
        container.appendChild(item);
      });
    } catch (err) {
      container.innerHTML = `<p class="empty-state small" style="color:var(--red)">${escHtml(err.message)}</p>`;
    }
  }

  // ── Live feed (all events) ────────────────────────────────────
  async function loadLiveFeed() {
    const feed = document.getElementById("liveFeed");
    try {
      const data = await apiFetch("/api/challenge-3/events?limit=30");
      allEvents = data.events || [];
      updateKpis(allEvents);
      if (!allEvents.length) {
        feed.innerHTML = `<p class="empty-state small">${t("queueEmpty")}</p>`;
        return;
      }
      feed.innerHTML = "";
      [...allEvents].reverse().forEach(e => {
        const channel = e.currentChannel || e.channel || "web";
        const row = document.createElement("div");
        row.className = "feed-row";
        row.innerHTML = `
          <div class="feed-icon">${CHANNEL_ICONS[channel] || "?"}</div>
          <div>
            <div class="feed-intent">${escHtml(e.normalizedIntent || "unknown")}</div>
            <div class="feed-cid">${escHtml(e.customerId)}</div>
            <div class="feed-msg" dir="auto">"${escHtml((e.rawMessage || "").slice(0, 60))}"</div>
          </div>
          <div class="feed-right">
            ${formatTime(e.timestamp)}
            <div class="feed-score">
              ${e.deterministicAnswerUsed ? t("deterministicLabel") : `🤖 ${escHtml(e.modelUsed || "—")}`}
            </div>
            ${e.requiresHuman ? `<div style="color:var(--red);font-size:10px;margin-top:2px">⚠ ${t("needsOfficer")}</div>` : ""}
          </div>
        `;
        row.addEventListener("click", () => loadCustomer360(e.customerId, null));
        feed.appendChild(row);
      });
    } catch (err) {
      feed.innerHTML = `<p class="empty-state small" style="color:var(--red)">${escHtml(err.message)}</p>`;
    }
  }

  // ── Customer 360 ──────────────────────────────────────────────
  async function loadCustomer360(customerId, clickedItem) {
    activeCustomerId = customerId;

    // mark active in queue
    document.querySelectorAll(".queue-item").forEach(el => el.classList.remove("active"));
    if (clickedItem) clickedItem.classList.add("active");

    // switch to 360 view
    document.getElementById("emptyState360").hidden = true;
    const view = document.getElementById("view360");
    view.hidden = false;

    // populate profile strip
    document.getElementById("profileName").textContent = customerId;
    document.getElementById("profileId").textContent = customerId;
    document.getElementById("channelChipsRow").innerHTML = "";
    document.getElementById("sentimentBadge").textContent = "";
    document.getElementById("sentimentBadge").className = "sentiment-badge";

    // reset co-pilot panel — officer triggers manually
    document.getElementById("copilotTrigger").hidden = false;
    document.getElementById("copilotLoading").hidden = true;
    document.getElementById("copilotResult").hidden = true;
    document.getElementById("copilotError").hidden = true;

    loadCustomerTimeline(customerId);
  }

  async function loadCustomerTimeline(customerId) {
    const container = document.getElementById("customerTimeline");
    container.innerHTML = `<p class="empty-state small">جاري التحميل...</p>`;
    try {
      const data = await apiFetch(`/api/challenge-3/events?customerId=${encodeURIComponent(customerId)}&limit=30`);
      const events = data.events || [];

      if (!events.length) {
        container.innerHTML = `<p class="empty-state small">${t("noTimeline")}</p>`;
        return;
      }

      // compute unique channels for profile strip
      const channels = [...new Set(events.map(e => e.currentChannel || e.channel || "web"))];
      const chipsRow = document.getElementById("channelChipsRow");
      chipsRow.innerHTML = "";
      channels.forEach(ch => {
        const chip = document.createElement("span");
        chip.className = `ch-chip ${ch}`;
        const channelLabels = tObj("channelLabels");
        chip.textContent = `${CHANNEL_ICONS[ch] || "?"} ${channelLabels[ch] || ch}`;
        chipsRow.appendChild(chip);
      });

      // detect sentiment from last event
      const last = events[events.length - 1];
      if (last && last.sentiment) {
        const badge = document.getElementById("sentimentBadge");
        const sentimentLabels = tObj("sentimentLabels");
        badge.textContent = sentimentLabels[last.sentiment] || last.sentiment;
        badge.className = `sentiment-badge ${last.sentiment}`;
      }

      container.innerHTML = "";
      [...events].reverse().forEach(ev => {
        const channel = ev.currentChannel || ev.channel || "web";
        const text = ev.rawMessage || ev.customerReply || ev.eventType || "";
        const row = document.createElement("div");
        row.className = "tl-event";
        row.innerHTML = `
          <div class="tl-dot ${channel}">${CHANNEL_ICONS[channel] || "🔔"}</div>
          <div class="tl-body">
            <div class="tl-meta">${formatTime(ev.timestamp)} · ${tObj("channelLabels")[channel] || channel}</div>
            <div class="tl-text" dir="auto">${escHtml(text.slice(0, 140))}</div>
            ${ev.escalationScore >= 50 ? `<span class="tl-score">⚠ ${t("escalationRisk")}</span>` : ""}
          </div>
        `;
        container.appendChild(row);
      });

    } catch (err) {
      container.innerHTML = `<p class="empty-state small" style="color:var(--red)">${escHtml(err.message)}</p>`;
    }
  }

  async function runCopilot(customerId, focus) {
    const trigger = document.getElementById("copilotTrigger");
    const loading = document.getElementById("copilotLoading");
    const result  = document.getElementById("copilotResult");
    const errEl   = document.getElementById("copilotError");

    trigger.hidden = true;
    loading.hidden = false;
    result.hidden = true;
    errEl.hidden  = true;

    try {
      const data = await apiFetch("/api/challenge-3/officer/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, officerId: "officer-local", focus: focus || "full" })
      });

      loading.hidden = true;
      result.hidden = false;
      result.innerHTML = renderCopilot(data);

      // wire copy button
      const copyBtn = result.querySelector(".copy-btn");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          const reply = copyBtn.dataset.reply || "";
          navigator.clipboard.writeText(reply).then(() => {
            copyBtn.textContent = t("cpCopied");
            setTimeout(() => { copyBtn.textContent = t("cpCopy"); }, 2000);
          });
        });
      }

    } catch (err) {
      loading.hidden = true;
      trigger.hidden = false;
      errEl.hidden = false;
      const msg = err.message.includes("Claude not configured") || err.message.includes("503")
        ? t("copilotUnconfigured")
        : escHtml(err.message);
      errEl.textContent = msg;
    }
  }

  function renderCopilot(data) {
    const risk = data.riskAssessment || {};
    const riskL = tObj("riskLabels");
    const mustNot = (data.mustNotPromise || []).map(m => `<li>${escHtml(m)}</li>`).join("");
    const replyText = data.recommendedOfficerResponse || "";

    return `
      <div class="cp-section">
        <div class="cp-label">${t("cpCaseSummary")}</div>
        <div class="cp-text">${escHtml(data.caseSummary || "—")}</div>
      </div>
      <div class="cp-section">
        <div class="cp-label">${t("cpCustomerNeed")}</div>
        <div class="cp-text">${escHtml(data.customerNeed || "—")}</div>
      </div>
      <div class="cp-section">
        <div class="cp-label">${t("cpRiskAssessment")}</div>
        <div class="risk-grid">
          <div class="risk-pill ${riskClass(risk.sentimentRisk)}">
            <span class="risk-pill-label">${t("cpSentimentRisk")}</span>
            ${riskL[risk.sentimentRisk] || risk.sentimentRisk || "—"}
          </div>
          <div class="risk-pill ${riskClass(risk.slaRisk)}">
            <span class="risk-pill-label">${t("cpSlaRisk")}</span>
            ${riskL[risk.slaRisk] || risk.slaRisk || "—"}
          </div>
          <div class="risk-pill ${riskClass(risk.escalationRisk)}">
            <span class="risk-pill-label">${t("cpEscalationRisk")}</span>
            ${riskL[risk.escalationRisk] || risk.escalationRisk || "—"}
          </div>
        </div>
      </div>
      <div class="cp-section">
        <div class="cp-label">${t("cpNextAction")}</div>
        <div class="action-box">${escHtml(data.recommendedNextAction || "—")}</div>
      </div>
      ${replyText ? `
      <div class="cp-section">
        <div class="cp-label">${t("cpSuggestedReply")}</div>
        <div class="reply-box" dir="auto">
          <button class="copy-btn" data-reply="${escHtml(replyText)}">${t("cpCopy")}</button>
          ${escHtml(replyText)}
        </div>
      </div>` : ""}
      ${mustNot ? `
      <div class="cp-section">
        <div class="cp-label">${t("cpMustNot")}</div>
        <ul class="must-not-list">${mustNot}</ul>
      </div>` : ""}
      <div class="cp-model-note">نموذج: ${escHtml(data.modelUsed || "—")}</div>
    `;
  }

  // ── Refresh all ───────────────────────────────────────────────
  function refreshAll() {
    loadQueue();
    loadLiveFeed();
    if (activeCustomerId) {
      loadCustomerTimeline(activeCustomerId);
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    const session = window.MoeiTrustGateAuth?.requireAccess({
      service: "onecx-officer",
      storageKey: "moei-trustgate-session:challenge-3-onecx-officer",
      requiredPrivilege: "office.login",
      productName: "OneCX Officer 360",
      title: lang === "ar" ? "تسجيل الدخول إلى مركز الموظف" : "Sign in to Officer 360",
      copy: lang === "ar"
        ? "مركز الموظف يعرض تفاعلات المتعاملين عبر القنوات. استخدم TrustGate للتحقق من صلاحية الموظف قبل عرض البيانات."
        : "Officer 360 shows customer interactions across channels. Use TrustGate to verify officer access before viewing data."
    });
    if (!session) return;

    applyStrings();

    document.getElementById("langToggle").addEventListener("click", () => {
      lang = lang === "ar" ? "en" : "ar";
      localStorage.setItem("onecx-officer-lang", lang);
      applyStrings();
      refreshAll();
    });

    document.getElementById("refreshBtn").addEventListener("click", refreshAll);

    document.getElementById("runCopilotBtn").addEventListener("click", () => {
      if (!activeCustomerId) return;
      const focusEl = document.querySelector("input[name='copilotFocus']:checked");
      const focus = focusEl ? focusEl.value : "full";
      runCopilot(activeCustomerId, focus);
    });

    document.getElementById("viewAllBtn").addEventListener("click", () => {
      // close 360, show live feed
      activeCustomerId = null;
      document.getElementById("view360").hidden = true;
      document.getElementById("emptyState360").hidden = false;
      document.querySelectorAll(".queue-item").forEach(el => el.classList.remove("active"));
    });

    document.getElementById("closeViewBtn").addEventListener("click", () => {
      activeCustomerId = null;
      document.getElementById("view360").hidden = true;
      document.getElementById("emptyState360").hidden = false;
      document.querySelectorAll(".queue-item").forEach(el => el.classList.remove("active"));
    });

    // auto-load on open
    loadQueue();
    loadLiveFeed();

    // auto-refresh every 30s
    setInterval(refreshAll, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
