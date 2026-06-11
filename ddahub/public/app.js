const state = {
  overview: null,
  personas: [],
  available: [],
  audit: []
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-AE")} AED`;
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function gateTone(gate) {
  if (gate.activationStatus === "active") return "pass";
  if (gate.activationStatus === "pending" || gate.activationStatus === "manual_required") return "warn";
  return "fail";
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || data.error || `Request failed: ${res.status}`);
    error.data = data;
    throw error;
  }
  return data;
}

async function loadAll() {
  const [overview, personas, available, audit] = await Promise.all([
    api("/api/ddahub/overview"),
    api("/api/ddahub/personas"),
    api("/api/ddahub/personas/available"),
    api("/api/ddahub/audit?limit=20")
  ]);
  state.overview = overview;
  state.personas = personas.personas || [];
  state.available = available.available || [];
  state.audit = audit.events || [];
  render();
}

function renderOverview() {
  const overview = state.overview || {};
  const metrics = [
    ["Total personas", overview.total ?? 0],
    ["Available", overview.available ?? 0],
    ["Locked", overview.locked ?? 0],
    ["Activation blocked", overview.activationBlocked ?? 0],
    ["Bank statement required", overview.bankStatementsRequired ?? 0]
  ];
  $("overview").innerHTML = metrics.map(([label, value]) => `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function renderAvailableSelect() {
  const select = $("ddaPersonaSelect");
  select.innerHTML = state.available.length
    ? state.available.map((persona) => `
      <option value="${escapeHtml(persona.ddaPersonaId)}">
        ${escapeHtml(persona.ddaPersonaId)} — ${escapeHtml(persona.label)}
      </option>
    `).join("")
    : `<option value="">No available personas</option>`;
  select.disabled = state.available.length === 0;
}

function renderAudit() {
  $("auditList").innerHTML = state.audit.length
    ? state.audit.map((event) => `
      <div class="audit-item">
        <span>${escapeHtml(event.timestamp || "")}</span>
        <strong>${escapeHtml(event.eventType || "event")}</strong>
        <p>${escapeHtml(event.reason || "")}</p>
        <small>${escapeHtml(event.actor || "system")} · ${escapeHtml(event.result || "")}</small>
      </div>
    `).join("")
    : `<p class="empty">No audit events yet.</p>`;
}

function renderPersona(persona) {
  const financial = persona.financialSummary || {};
  const gate = persona.ddaGate || {};
  const risks = persona.riskSignals || {};
  const locked = persona.lockStatus === "locked";
  const apiTone = financial.financialApiAvailable ? "pass" : "fail";
  return `
    <article class="persona-card">
      <div class="persona-top">
        <div>
          <p class="kicker">${escapeHtml(persona.scenarioKey)}</p>
          <h3>${escapeHtml(persona.label)}</h3>
          <p>${escapeHtml(persona.ddaPersonaId)}</p>
        </div>
        <span class="badge ${locked ? "locked" : "pass"}">${escapeHtml(persona.lockStatus)}</span>
      </div>
      <div class="badge-row">
        <span class="badge ${gateTone(gate)}">DDA ${escapeHtml(gate.ddaStatus)}</span>
        <span class="badge ${gate.signatureStatus === "signed" ? "pass" : "warn"}">${escapeHtml(gate.signatureStatus)}</span>
        <span class="badge ${apiTone}">Financial API ${escapeHtml(financial.financialApiConsistency)}</span>
        ${financial.bankStatementRequired ? `<span class="badge warn">Bank statement required</span>` : `<span class="badge pass">Bank statement not required</span>`}
        ${risks.manualReviewSuggested ? `<span class="badge warn">Human review signal</span>` : ""}
      </div>
      <div class="data-grid">
        <div class="data-item"><span>Gross salary</span><strong>${money(financial.grossSalary)}</strong></div>
        <div class="data-item"><span>Current deduction</span><strong>${money(financial.currentDeductionAmount)} · ${pct(financial.currentDeductionRate)}</strong></div>
        <div class="data-item"><span>20% cap</span><strong>${money(financial.maximumAllowedDeductionAmount)}</strong></div>
        <div class="data-item"><span>Headroom</span><strong>${money(financial.availableHeadroomAmount)} · ${pct(financial.availableHeadroomRate)}</strong></div>
        <div class="data-item"><span>Obligations</span><strong>${money(financial.monthlyObligations)} · ${pct(financial.obligationsRate)}</strong></div>
        <div class="data-item"><span>Income trend</span><strong>${escapeHtml(financial.incomeTrend)}</strong></div>
      </div>
      <div class="data-item">
        <span>Activation gate</span>
        <strong>${escapeHtml(gate.activationStatus)}</strong>
        <p>${escapeHtml(gate.requiredAction || "No action required.")}</p>
      </div>
      ${locked ? `
        <div class="data-item">
          <span>Linked TrustGate</span>
          <strong>${escapeHtml(persona.linkedTrustGateId || "Unknown")}</strong>
          <p>${escapeHtml(persona.linkedEmiratesIdMasked || "")}</p>
        </div>
      ` : ""}
      <div class="persona-actions">
        <button class="small-button" type="button" data-action="sign" data-id="${escapeHtml(persona.ddaPersonaId)}">Sign DDA</button>
        <button class="small-button" type="button" data-action="manual" data-id="${escapeHtml(persona.ddaPersonaId)}">Manual transfer</button>
      </div>
    </article>
  `;
}

function renderPersonas() {
  $("personaGrid").innerHTML = state.personas.length
    ? state.personas.map(renderPersona).join("")
    : `<p class="empty">No DDA personas found.</p>`;
}

function render() {
  renderOverview();
  renderAvailableSelect();
  renderAudit();
  renderPersonas();
}

async function submitLink(event) {
  event.preventDefault();
  const result = $("linkResult");
  result.textContent = "Creating locked DDA link...";
  try {
    const payload = {
      ddaPersonaId: $("ddaPersonaSelect").value,
      trustGateId: $("trustGateId").value,
      emiratesId: $("emiratesId").value,
      actor: $("actor").value || "ddahub_console"
    };
    const response = await api("/api/ddahub/link", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    result.textContent = `Linked ${response.link.trustGateId} to ${response.link.ddaPersonaId}.`;
    await loadAll();
  } catch (error) {
    result.textContent = error.message;
  }
}

async function handlePersonaAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const ddaPersonaId = button.dataset.id;
  button.disabled = true;
  try {
    const endpoint = action === "sign" ? "/api/ddahub/sign" : "/api/ddahub/manual-transfer";
    await api(endpoint, {
      method: "POST",
      body: JSON.stringify({ ddaPersonaId, actor: "ddahub_console" })
    });
    await loadAll();
  } catch (error) {
    $("linkResult").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("refreshBtn").addEventListener("click", loadAll);
  $("linkForm").addEventListener("submit", submitLink);
  $("personaGrid").addEventListener("click", handlePersonaAction);
  loadAll().catch((error) => {
    $("personaGrid").innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  });
});
