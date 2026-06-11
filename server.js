require("dotenv").config();
const fs = require("fs");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");
const { createChallenge1LiveStore } = require("./challenge-1/shared/services/live-store/challenge1-live-store.js");
const assessmentOrchestrator = require("./challenge-1/shared/services/financial-study/assessment-orchestrator.js");
const documentCompletenessService = require("./challenge-1/shared/services/financial-study/document-completeness-service.js");
const reasoningNarrativeService = require("./challenge-1/shared/services/financial-study/reasoning-narrative-service.js");
const { createFlashGateService } = require("./challenge-3/shared/services/flash-gate-service.js");
const { createChallenge3LiveStore } = require("./challenge-3/shared/services/live-store/challenge3-live-store.js");
const { createClaudeCopilotWorker } = require("./challenge-3/shared/services/claude-copilot-worker.js");
const { createCustomerBrainService } = require("./challenge-3/shared/services/customer-brain-service.js");
const { createOutputGuardService } = require("./challenge-3/shared/services/output-guard-service.js");
const twilioAdapter = require("./challenge-3/shared/services/twilio-adapter-service.js");
const metaWhatsApp = require("./challenge-3/shared/services/meta-whatsapp-adapter-service.js");
const { createProactiveNotificationService } = require("./challenge-3/shared/services/proactive-notification-service.js");
const moeiDataset = require("./challenge-3/shared/services/moei-dataset-service.js");
const countryIntelligenceService = require("./challenge-2/shared/services/country-intelligence-service.js");
const briefingOrchestrator = require("./challenge-2/shared/services/briefing-orchestrator.js");
const sourceGuardService = require("./challenge-2/shared/services/source-guard-service.js");
const { verifyDocument: aiVerifyDocument } = require("./challenge-1/shared/services/financial-study/document-ai-verification-service.js");
const documentIntelligence = require("./challenge-1/shared/services/document-intelligence/document-intelligence-service.js");
const { createDdaHubService } = require("./ddahub/services/ddahub-service.js");

const rootDir = __dirname;
const port = Number(process.env.PORT || 9710);

// DEMO MODE: liveStore writes JSON to data/live/challenge-1/*.json on disk.
// This includes fileBase64 of uploaded documents (synthetic/demo only).
// PRODUCTION must replace liveStore document records with encrypted government
// document storage references — never persist real citizen documents as raw base64 on disk.
const liveStore = createChallenge1LiveStore({ rootDir });
const ddaHubService = createDdaHubService({ rootDir });

function buildOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const { OpenAI } = require("openai");
    return new OpenAI({ apiKey });
  } catch {
    return null;
  }
}

function buildAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const Anthropic = require("@anthropic-ai/sdk");
    return new Anthropic.default({ apiKey });
  } catch {
    return null;
  }
}

function buildGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    return new GoogleGenerativeAI(apiKey);
  } catch {
    return null;
  }
}

const openaiClient = buildOpenAIClient();
const anthropicClient = buildAnthropicClient();
const geminiClient = buildGeminiClient();
const c3Store = createChallenge3LiveStore({ rootDir });
const flashGateService = createFlashGateService({ rootDir, openaiClient });
const outputGuardService = createOutputGuardService();
const claudeCopilotWorker = anthropicClient ? createClaudeCopilotWorker({ anthropicClient }) : null;
const proactiveNotificationService = createProactiveNotificationService({
  c1LiveStore: liveStore,
  c3LiveStore: c3Store,
  sendWhatsApp: sendWhatsAppTextWithFallback
});

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

const routeAliases = [
  {
    mount: "/customer/housing-arrears/",
    target: path.join(rootDir, "challenge-1", "customer", "prototype")
  },
  {
    mount: "/office/housing-arrears/",
    target: path.join(rootDir, "challenge-1", "office", "prototype")
  },
  {
    mount: "/customer/omnichannel-intake/",
    target: path.join(rootDir, "challenge-3", "customer", "omnichannel-intake")
  },
  {
    mount: "/office/omnichannel-intake/",
    target: path.join(rootDir, "challenge-3", "office", "omnichannel-intake")
  },
  {
    mount: "/leadership/dashboard/",
    target: path.join(rootDir, "challenge-3", "leadership", "dashboard")
  },
  {
    mount: "/challenge-2/intelligence/",
    target: path.join(rootDir, "challenge-2", "intelligence")
  },
  {
    mount: "/ddahub/",
    target: path.join(rootDir, "ddahub", "public")
  },
  {
    mount: "/shared/",
    target: path.join(rootDir, "shared")
  }
];

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendJson(res, statusCode, payload, headers = {}) {
  send(res, statusCode, JSON.stringify(payload, null, 2), {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
}

function whatsappAccessTokenSlots() {
  return [
    { slot: "primary", token: process.env.WHATSAPP_ACCESS_TOKEN || "" },
    { slot: "temporary", token: process.env.WHATSAPP_ACCESS_TOKEN_TEMPORARY || "" },
    { slot: "fallback", token: process.env.WHATSAPP_ACCESS_TOKEN_FALLBACK || "" }
  ].filter((item) => item.token);
}

async function sendWhatsAppTextWithFallback(phoneNumberId, to, text) {
  const slots = whatsappAccessTokenSlots();
  if (!phoneNumberId || slots.length === 0) {
    const error = new Error("WhatsApp not configured");
    error.statusCode = 503;
    throw error;
  }

  let lastError = null;
  for (const item of slots) {
    try {
      const result = await metaWhatsApp.sendTextMessage(phoneNumberId, item.token, to, text);
      return { tokenSlot: item.slot, result };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("WhatsApp send failed");
}

function publicOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || `127.0.0.1:${port}`;
  return `${proto}://${host}`;
}

function runtimeConfig(req) {
  const trustGateBaseUrl = process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715/";
  return {
    service: "arrearsflow",
    publicOrigin: process.env.MOEI_PUBLIC_ORIGIN || publicOrigin(req),
    identityProvider: {
      id: process.env.MOEI_AUTH_PROVIDER_ID || "trustgate",
      name: process.env.MOEI_AUTH_PROVIDER_NAME || "TrustGate",
      baseUrl: trustGateBaseUrl.endsWith("/") ? trustGateBaseUrl : `${trustGateBaseUrl}/`,
      loginResultParam: process.env.MOEI_AUTH_RESULT_PARAM || "trustGateResult",
      mode: process.env.MOEI_AUTH_PROVIDER_MODE || "standalone_trust_service"
    }
  };
}

function sendRuntimeConfig(req, res) {
  const body = `window.ArrearsFlowRuntimeConfig = ${JSON.stringify(runtimeConfig(req), null, 2)};\n`;
  send(res, 200, body, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-store"
  });
}

function redirect(res, location) {
  send(res, 301, "", { Location: location });
}

function safeJoin(baseDir, requestPath) {
  const decodedPath = decodeURIComponent(requestPath).replace(/^\/+/, "");
  const filePath = path.normalize(path.join(baseDir, decodedPath));
  if (!filePath.startsWith(baseDir)) return null;
  return filePath;
}

function isBlockedStaticPath(pathname) {
  const blockedPrefixes = [
    "/.git",
    "/.env",
    "/Akram",
    "/planning",
    "/notes",
    "/trustgate",
    "/tmp-screens",
    "/deploy-artifacts",
    "/demo-state",
    "/ddahub/data",
    "/ddahub/services",
    "/node_modules",
    "/scripts",
    "/challenge-1/shared",
    "/challenge-2/shared",
    "/challenge-2/data",
    "/challenge-3/shared"
  ];
  const blockedExact = new Set([
    "/AGENTS.md",
    "/push-manifest.json",
    "/table-of-contents.json",
    "/package.json",
    "/package-lock.json",
    "/challenge-1/README.md",
    "/challenge-2/README.md",
    "/challenge-2/challenge-analysis.md",
    "/challenge-2/briefing-notes.md",
    "/challenge-2/official-statement.md",
    "/challenge-3/README.md",
    "/challenge-3/challenge-analysis.md",
    "/challenge-3/official-statement.md"
  ]);
  return blockedExact.has(pathname) || blockedPrefixes.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}

function resolveStaticFile(pathname) {
  if (pathname === "/customer/housing-arrears") return { redirect: "/customer/housing-arrears/" };
  if (pathname === "/office/housing-arrears") return { redirect: "/office/housing-arrears/" };
  if (pathname === "/customer/omnichannel-intake") return { redirect: "/customer/omnichannel-intake/" };
  if (pathname === "/office/omnichannel-intake") return { redirect: "/office/omnichannel-intake/" };
  if (pathname === "/auth/trustgate/register" || pathname === "/auth/trustgate/register/") {
    const base = (process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715").replace(/\/$/, "");
    return { redirect: `${base}/register/` };
  }

  for (const alias of routeAliases) {
    if (pathname.startsWith(alias.mount)) {
      const rest = pathname.slice(alias.mount.length);
      const aliasFile = safeJoin(alias.target, rest || "index.html");
      return { filePath: aliasFile };
    }
  }

  const rootPath = safeJoin(rootDir, pathname === "/" ? "index.html" : pathname);
  return { filePath: rootPath };
}

function serveFile(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);
  if (isBlockedStaticPath(requestUrl.pathname)) {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  const resolved = resolveStaticFile(requestUrl.pathname);

  if (resolved.redirect) {
    const suffix = requestUrl.search || "";
    redirect(res, `${resolved.redirect}${suffix}`);
    return;
  }

  let filePath = resolved.filePath;
  if (!filePath) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (!requestUrl.pathname.endsWith("/")) {
      redirect(res, `${requestUrl.pathname}/${requestUrl.search || ""}`);
      return;
    }
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";
  fs.readFile(filePath, (error, body) => {
    if (error) {
      send(res, 500, "Server error", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    send(res, 200, body, { "Content-Type": contentType });
  });
}

function nowIso() {
  return new Date().toISOString();
}

function publicMode() {
  return process.env.NODE_ENV === "production";
}

function resetAllowed(req) {
  if (process.env.ALLOW_TEST_RESET !== "true") return false;
  const token = process.env.CHALLENGE1_TEST_TOKEN;
  if (!token) return !publicMode();
  return req.headers["x-challenge1-test-token"] === token;
}

function feedAllowed(req) {
  const token = process.env.CHALLENGE1_FEED_TOKEN;
  if (!token) return !publicMode();
  return req.headers["x-challenge1-feed-token"] === token;
}

function challenge3AdminAllowed(req) {
  const token = process.env.CHALLENGE3_ADMIN_TOKEN || process.env.CHALLENGE1_TEST_TOKEN;
  if (!token) return !publicMode();
  const authHeader = req.headers.authorization || "";
  return req.headers["x-challenge3-admin-token"] === token || authHeader === `Bearer ${token}`;
}

function requireChallenge3Admin(req, res) {
  if (challenge3AdminAllowed(req)) return true;
  sendJson(res, 403, { error: "challenge3_admin_not_allowed" });
  return false;
}

// Strip binary payloads from document records before sending to browser.
// fileBase64 stays server-side only — never returned to clients.
function customerSafeDocument(doc) {
  const { fileBase64, mimeType, ...safe } = doc;  // eslint-disable-line no-unused-vars
  return safe;
}

const DEFAULT_BODY_LIMIT = 1_000_000;          // 1 MB — all normal endpoints
const DOCUMENT_BODY_LIMIT = 14_000_000;        // 14 MB — document upload (base64 overhead)

function parseBody(req, maxBytes = DEFAULT_BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      const contentType = (req.headers["content-type"] || "").toLowerCase();
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const parsed = {};
        new URLSearchParams(body).forEach((v, k) => { parsed[k] = v; });
        resolve(parsed);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function redact(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 4) return "****";
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
}

function appendRecord(storeName, record) {
  liveStore.updateStore(storeName, (records) => {
    records.push(record);
    return records;
  });
  return record;
}

function appendAudit(applicationId, action, details = {}) {
  return appendRecord("auditEvents", {
    auditId: liveStore.nextId("AUD"),
    applicationId,
    action,
    actor: details.actor || "system",
    source: details.source || "challenge1-live-api",
    status: details.status || null,
    summary: details.summary || action,
    createdAt: nowIso()
  });
}

function appendStatus(applicationId, fromStatus, toStatus, reason) {
  return appendRecord("statusHistory", {
    statusEventId: liveStore.nextId("STS"),
    applicationId,
    fromStatus: fromStatus || null,
    toStatus,
    reason,
    createdAt: nowIso()
  });
}

function updateApplication(applicationId, updates, audit) {
  let updated = null;
  liveStore.updateStore("applications", (applications) => applications.map((application) => {
    if (application.applicationId !== applicationId) return application;
    const previousStatus = application.status;
    updated = {
      ...application,
      ...updates,
      updatedAt: nowIso()
    };
    if (updates.status && updates.status !== previousStatus) {
      appendStatus(applicationId, previousStatus, updates.status, audit?.summary || "Status updated");
    }
    return updated;
  }));
  if (updated && audit) appendAudit(applicationId, audit.action, { ...audit, status: updated.status });
  return updated;
}

function findBy(storeName, predicate) {
  return liveStore.readStore(storeName).filter(predicate);
}

function latestBy(storeName, predicate) {
  const matches = findBy(storeName, predicate);
  return matches[matches.length - 1] || null;
}

function customerSafeApplication(application) {
  if (!application) return null;
  return {
    applicationId: application.applicationId,
    status: application.status,
    language: application.language,
    channel: application.channel,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    customer: {
      displayName: application.customer?.displayName || null,
      identityRef: application.customer?.identityRef || null,
      emiratesIdMasked: application.customer?.emiratesIdMasked || null,
      phoneMasked: application.customer?.phoneMasked || null,
      emailMasked: application.customer?.emailMasked || null
    },
    latestAssessmentId: application.latestAssessmentId || null,
    trustGateRequired: Boolean(application.trustGateRequired),
    sealId: application.sealId || null
  };
}

function officeSafeApplication(application) {
  const latestAssessment = latestBy("assessmentRuns", (item) => item.applicationId === application.applicationId);
  const latestProgramme = latestBy("programmeData", (item) => item.applicationId === application.applicationId);
  return {
    ...customerSafeApplication(application),
    source: "live_api",
    remarks: application.remarks || "",
    financial: application.financial || {},
    family: application.family || {},
    specialCases: application.specialCases || {},
    programmeSummary: latestProgramme ? {
      programmeDataId: latestProgramme.programmeDataId,
      loanId: latestProgramme.loanId,
      totalArrearsAmount: latestProgramme.totalArrearsAmount,
      unpaidInstallmentsCount: latestProgramme.unpaidInstallmentsCount,
      remainingLoanBalance: latestProgramme.remainingLoanBalance,
      remainingRepaymentMonths: latestProgramme.remainingRepaymentMonths,
      currentMonthlyInstallment: latestProgramme.currentMonthlyInstallment,
      hasActiveReschedulingRequest: latestProgramme.hasActiveReschedulingRequest
    } : null,
    latestAssessment: latestAssessment ? {
      assessmentId: latestAssessment.assessmentId,
      status: latestAssessment.status,
      recommendationPath: latestAssessment.assessment?.recommendation?.recommendationPath || null,
      decisionStage: latestAssessment.assessment?.recommendation?.decisionStage || null,
      trustGateRequired: Boolean(latestAssessment.assessment?.recommendation?.trustGateRequired),
      financialStudy: latestAssessment.assessment?.financialStudy || null,
      documents: latestAssessment.assessment?.documents || null,
      policy: latestAssessment.assessment?.policy || null,
      auditEvents: latestAssessment.assessment?.auditEvents || [],
      reasoning: latestAssessment.assessment?.reasoning || null
    } : null
  };
}

function normalizeRecognitionStatus(status) {
  const value = status || "missing";
  const aliases = {
    accepted: "passed",
    approved: "passed",
    clear: "passed",
    valid: "passed",
    rejected: "needs_correction",
    failed: "needs_correction",
    suspicious: "needs_correction"
  };
  return aliases[value] || value;
}

function documentStatusFor(applicationId) {
  const documents = findBy("documents", (item) => item.applicationId === applicationId);
  const byType = Object.fromEntries(documents.map((doc) => [doc.documentType, doc]));
  return {
    incomeDocumentType: byType.non_work_letter ? "non_work_letter" : "salary_certificate",
    incomeDocumentStatus: normalizeRecognitionStatus(byType.non_work_letter?.recognitionStatus || byType.salary_certificate?.recognitionStatus),
    salaryStatus: normalizeRecognitionStatus(byType.salary_certificate?.recognitionStatus || byType.non_work_letter?.recognitionStatus),
    bankStatus: normalizeRecognitionStatus(byType.bank_statement?.recognitionStatus),
    missionLetterStatus: normalizeRecognitionStatus(byType.official_mission_letter?.recognitionStatus),
    passportStampStatus: normalizeRecognitionStatus(byType.passport_stamp?.recognitionStatus)
  };
}

function buildAssessmentCase(application, programmeLoan) {
  return {
    id: application.applicationId,
    caseId: application.applicationId,
    beneficiaryId: programmeLoan.beneficiaryId || application.customer?.identityRef || application.applicationId,
    applicantName: application.customer?.displayName || "Customer",
    applicantNameAr: application.customer?.displayNameAr || application.customer?.displayName || "المتعامل",
    currentSalary: Number(application.financial?.currentSalary || programmeLoan.currentSalary || 0),
    monthlyIncome: Number(application.financial?.currentSalary || programmeLoan.currentSalary || 0),
    monthlyObligations: Number(application.financial?.monthlyObligations || programmeLoan.monthlyObligations || 0),
    dependents: Number(application.family?.dependentsCount || programmeLoan.dependentsCount || 0),
    familyMembersCount: Number(application.family?.familyMembersCount || programmeLoan.familyMembersCount || 1),
    reason: application.remarks || "",
    reasonAr: application.remarks || "",
    existingLoans: Boolean(application.financial?.existingLoans || Number(application.financial?.monthlyObligations || 0) > 0),
    officialMissionCase: Boolean(application.specialCases?.officialMissionCase),
    employmentStatus: application.employment?.status || application.financial?.employmentStatus || null,
    ...documentStatusFor(application.applicationId)
  };
}

function assessmentWaiting(applicationId, status, summary) {
  updateApplication(applicationId, { status }, { action: "assessment_waiting", summary });
  return {
    status,
    assessmentCreated: false,
    summary
  };
}

function createWizardDemoProgrammeLoan(application) {
  const salary = Number(application.financial?.currentSalary || 0);
  const arrears = Math.max(18000, Math.round(salary * 2.4));
  const remainingBalance = Math.max(arrears * 6, 120000);
  return appendRecord("programmeData", {
    programmeDataId: liveStore.nextId("PRG"),
    contractVersion: "programme-loan.v1",
    applicationId: application.applicationId,
    beneficiaryId: application.customer?.identityRef || application.applicationId,
    caseId: application.applicationId,
    loanId: `WIZ-DEMO-${application.applicationId}`,
    source: "pwa_wizard_demo_programme_seed",
    retrievedAt: nowIso(),
    originalLoanAmount: Math.max(remainingBalance + arrears, 250000),
    remainingLoanBalance: remainingBalance,
    originalApprovedRepaymentMonths: 300,
    remainingRepaymentMonths: 180,
    totalArrearsAmount: arrears,
    unpaidInstallmentsCount: 6,
    currentMonthlyInstallment: salary > 0 ? Math.max(1000, Math.round(salary * 0.12)) : 1200,
    monthlyObligations: Number(application.financial?.monthlyObligations || 0),
    paymentHistorySummary: {
      source: "mentor_demo_fixture",
      note: "Generated only for PWA wizard mentor-review path when programme feed is not connected."
    },
    hasActiveReschedulingRequest: false,
    activeReschedulingRequest: null,
    previousApplications: [],
    familyStatus: "not_specified",
    dependentsCount: Number(application.family?.dependentsCount || 0),
    familyMembersCount: Number(application.family?.familyMembersCount || 1),
    createdAt: nowIso()
  });
}

function createSeal(application, body) {
  const seal = {
    sealId: liveStore.nextId("SEAL"),
    applicationId: application.applicationId,
    authorizedBy: body.authorizedBy || "local_trustgate_authority",
    authorizationResult: body.authorizationResult,
    trustGateTransactionId: body.trustGateTransactionId || liveStore.nextId("TGX"),
    issuedAt: nowIso(),
    verificationPath: null
  };
  seal.verificationPath = `/verify/?stamp=${encodeURIComponent(seal.sealId)}`;
  return appendRecord("approvalSeals", seal);
}

/* ── Shared: Google Places address autocomplete proxy ───────────────── */
async function handleLocationApi(req, res, requestUrl) {
  const q = (requestUrl.searchParams.get("q") || "").trim();
  if (!q || q.length < 2) { sendJson(res, 200, []); return; }

  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) { sendJson(res, 200, []); return; }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", q);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:ae");
  url.searchParams.set("language", "en");
  url.searchParams.set("types", "establishment|geocode");

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("[location] Google Places error:", data.status, data.error_message);
      sendJson(res, 200, []);
      return;
    }
    const results = (data.predictions || []).map(p => ({ label: p.description, place_id: p.place_id }));
    sendJson(res, 200, results);
  } catch (err) {
    console.warn("[location] fetch error:", err.message);
    sendJson(res, 200, []);
  }
}

async function handleDdaHubApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
  const method = req.method;

  if (method === "GET" && pathname === "/api/ddahub/health") {
    sendJson(res, 200, ddaHubService.health());
    return true;
  }

  if (method === "GET" && pathname === "/api/ddahub/overview") {
    sendJson(res, 200, ddaHubService.overview());
    return true;
  }

  if (method === "GET" && pathname === "/api/ddahub/personas") {
    sendJson(res, 200, { ok: true, personas: ddaHubService.linkService.listPersonas() });
    return true;
  }

  if (method === "GET" && pathname === "/api/ddahub/personas/available") {
    sendJson(res, 200, { ok: true, available: ddaHubService.linkService.availablePersonas() });
    return true;
  }

  const personaMatch = pathname.match(/^\/api\/ddahub\/persona\/([^/]+)$/);
  if (method === "GET" && personaMatch) {
    const persona = ddaHubService.linkService.getPersonaSummary(decodeURIComponent(personaMatch[1]));
    if (!persona) {
      sendJson(res, 404, { ok: false, code: "DDA_PERSONA_NOT_FOUND", message: "DDA persona was not found." });
      return true;
    }
    sendJson(res, 200, { ok: true, persona });
    return true;
  }

  const byTrustGateMatch = pathname.match(/^\/api\/ddahub\/by-trustgate\/([^/]+)$/);
  if (method === "GET" && byTrustGateMatch) {
    const result = ddaHubService.profileService.profileByTrustGate(decodeURIComponent(byTrustGateMatch[1]), "api");
    sendJson(res, result.ok ? 200 : result.statusCode || 404, result);
    return true;
  }

  const byEmiratesMatch = pathname.match(/^\/api\/ddahub\/by-emirates\/([^/]+)$/);
  if (method === "GET" && byEmiratesMatch) {
    const result = ddaHubService.profileService.profileByEmirates(decodeURIComponent(byEmiratesMatch[1]), "api");
    sendJson(res, result.ok ? 200 : result.statusCode || 404, result);
    return true;
  }

  if (method === "GET" && pathname === "/api/ddahub/audit") {
    const limit = Number(requestUrl.searchParams.get("limit") || 100);
    sendJson(res, 200, { ok: true, events: ddaHubService.audit.list(limit) });
    return true;
  }

  if (method === "POST" && pathname === "/api/ddahub/link") {
    const body = await parseBody(req);
    const result = ddaHubService.linkService.linkTrustGateToDdaPersona({
      trustGateId: body.trustGateId,
      emiratesId: body.emiratesId,
      ddaPersonaId: body.ddaPersonaId,
      actor: body.actor || "api"
    });
    sendJson(res, result.ok ? 201 : result.statusCode || 400, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/ddahub/sign") {
    const body = await parseBody(req);
    const result = ddaHubService.linkService.signDda({
      ddaPersonaId: body.ddaPersonaId,
      actor: body.actor || "demo_customer"
    });
    sendJson(res, result.ok ? 200 : result.statusCode || 400, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/ddahub/manual-transfer") {
    const body = await parseBody(req);
    const result = ddaHubService.linkService.markManualTransfer({
      ddaPersonaId: body.ddaPersonaId,
      actor: body.actor || "officer",
      reference: body.reference || null
    });
    sendJson(res, result.ok ? 200 : result.statusCode || 400, result);
    return true;
  }

  if (method === "POST" && (pathname === "/api/ddahub/reset-demo" || pathname === "/api/ddahub/generate-demo")) {
    if (!resetAllowed(req)) {
      sendJson(res, 403, { ok: false, code: "DDAHUB_RESET_NOT_ALLOWED", message: "DDAHub demo reset is disabled." });
      return true;
    }
    const body = await parseBody(req);
    sendJson(res, 200, ddaHubService.resetDemo(body.actor || "api_demo_reset"));
    return true;
  }

  return false;
}

async function handleChallenge1Api(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
  const method = req.method;

  if (method === "GET" && pathname === "/api/challenge-1/health") {
    const health = liveStore.health();
    sendJson(res, 200, {
      service: "challenge-1-live-api",
      mode: process.env.NODE_ENV || "development",
      resetEnabled: process.env.ALLOW_TEST_RESET === "true",
      ...health
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-1/test/reset") {
    if (!resetAllowed(req)) {
      sendJson(res, 403, { error: "reset_not_allowed" });
      return true;
    }
    liveStore.clearStores();
    sendJson(res, 200, { ok: true, counts: liveStore.counts() });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-1/stats") {
    const applications = liveStore.readStore("applications");
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const total = applications.length;
    const approved = applications.filter((a) => a.status === "approved_with_seal").length;
    const pending = applications.filter((a) => ["waiting_for_assessment", "documents_required", "human_review_required", "trustgate_pending"].includes(a.status)).length;
    const todaySubmitted = applications.filter((a) => (a.submittedAt || a.createdAt || "").startsWith(today)).length;
    const assessedApps = applications.filter((a) => a.latestAssessmentId);
    const avgAssessmentMs = assessedApps.length > 0
      ? assessedApps.reduce((sum, a) => {
          const start = new Date(a.submittedAt || a.createdAt).getTime();
          const end = new Date(a.updatedAt).getTime();
          return sum + Math.max(0, end - start);
        }, 0) / assessedApps.length
      : null;
    const avgAssessmentMin = avgAssessmentMs !== null ? Math.round(avgAssessmentMs / 60000 * 10) / 10 : null;
    sendJson(res, 200, {
      total, approved, pending, todaySubmitted,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      avgAssessmentMinutes: avgAssessmentMin,
      manualProcessingDays: 5,
      aiProcessingMinutes: avgAssessmentMin || 2.4,
      timeSavedLabel: "5 days → < 3 min",
      casesAutoAssessedPct: total > 0 ? Math.round((assessedApps.length / total) * 100) : 0,
      generatedAt: new Date().toISOString()
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-1/test/empty-state") {
    const counts = liveStore.counts();
    const empty = Object.values(counts).every((count) => count === 0);
    sendJson(res, empty ? 200 : 409, { empty, counts });
    return true;
  }

  const applicationMatch = pathname.match(/^\/api\/challenge-1\/applications\/([^/]+)$/);
  const documentMatch = pathname.match(/^\/api\/challenge-1\/applications\/([^/]+)\/documents$/);
  const verifyDocsMatch = pathname.match(/^\/api\/challenge-1\/applications\/([^/]+)\/verify-documents$/);
  const assessMatch = pathname.match(/^\/api\/challenge-1\/applications\/([^/]+)\/assess$/);
  const auditMatch = pathname.match(/^\/api\/challenge-1\/audit\/([^/]+)$/);
  const sealMatch = pathname.match(/^\/api\/challenge-1\/seals\/([^/]+)$/);

  if (method === "POST" && pathname === "/api/challenge-1/applications") {
    const body = await parseBody(req);
    const applicationId = liveStore.nextId("APP");
    const createdAt = nowIso();
    const application = appendRecord("applications", {
      applicationId,
      status: "application_submitted",
      language: body.language || "ar",
      channel: body.channel || "customer_web",
      source: "live_customer_api",
      customer: {
        displayName: body.customer?.displayName || body.applicantName || null,
        displayNameAr: body.customer?.displayNameAr || body.applicantNameAr || null,
        identityRef: body.customer?.identityRef || body.identityRef || null,
        emiratesIdMasked: body.customer?.emiratesIdMasked || redact(body.customer?.emiratesId || body.emiratesId),
        phoneMasked: body.customer?.phoneMasked || redact(body.customer?.phone || body.phone),
        emailMasked: body.customer?.emailMasked || redact(body.customer?.email || body.email)
      },
      financial: {
        currentSalary: Number(body.financial?.currentSalary || body.currentSalary || 0),
        monthlyObligations: Number(body.financial?.monthlyObligations || body.monthlyObligations || 0),
        existingLoans: Boolean(body.financial?.existingLoans || body.existingLoans),
        arrearsAmount: Number(body.financial?.arrearsAmount || body.arrearsAmount || body.totalArrears || 0)
      },
      family: {
        dependentsCount: Number(body.family?.dependentsCount || body.dependentsCount || 0),
        familyMembersCount: Number(body.family?.familyMembersCount || body.familyMembersCount || 1)
      },
      specialCases: {
        officialMissionCase: Boolean(body.specialCases?.officialMissionCase || body.officialMissionCase)
      },
      remarks: body.remarks || body.reason || "",
      acknowledgement: Boolean(body.acknowledgement),
      submittedAt: createdAt,
      createdAt,
      updatedAt: createdAt
    });
    appendStatus(applicationId, null, "application_submitted", "Customer application submitted");
    appendAudit(applicationId, "application_submitted", { actor: "customer", status: "application_submitted" });
    sendJson(res, 201, { application: customerSafeApplication(application) });
    return true;
  }

  if (method === "GET" && applicationMatch) {
    const applicationId = decodeURIComponent(applicationMatch[1]);
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) {
      sendJson(res, 404, { error: "application_not_found" });
      return true;
    }
    const latestAssessment = latestBy("assessmentRuns", (item) => item.applicationId === applicationId);
    sendJson(res, 200, {
      application: customerSafeApplication(application),
      latestAssessment: latestAssessment ? {
        assessmentId: latestAssessment.assessmentId,
        status: latestAssessment.status,
        recommendationPath: latestAssessment.assessment?.recommendation?.recommendationPath || null,
        citizenFacingStatus: latestAssessment.assessment?.assessmentResult?.citizenFacingStatus || null,
        citizenFacingStatusAr: latestAssessment.assessment?.assessmentResult?.citizenFacingStatusAr || null
      } : null
    });
    return true;
  }

  if (method === "POST" && documentMatch) {
    const applicationId = decodeURIComponent(documentMatch[1]);
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) {
      sendJson(res, 404, { error: "application_not_found" });
      return true;
    }
    const body = await parseBody(req, DOCUMENT_BODY_LIMIT);

    const docType     = body.documentType || "salary_certificate";
    const fileBase64  = body.fileBase64  || null;
    const mimeType    = body.mimeType    || null;
    const fileName    = body.fileName    || null;
    const source      = body.source      || "upload";

    const appCtx = {
      currentSalary:       application.financial?.currentSalary,
      monthlyIncome:       application.financial?.currentSalary,
      totalArrearsAmount:  application.financial?.arrearsAmount,
      monthsDelayed:       application.financial?.monthsDelayed,
      employmentStatus:    application.employment?.status,
      applicantName:       application.customer?.displayName || null
    };

    // Real document intelligence — reads actual file content when available
    const intelligence = await documentIntelligence.analyze({
      fileBase64,
      mimeType,
      fileName,
      documentType:       docType,
      source,
      applicationContext: appCtx,
      geminiClient,
      openaiClient
    });

    // Map intelligence result back to the existing schema fields for compatibility
    const recognitionStatus = intelligence.blockingIssues.includes("wrong_document_type")
      ? "wrong_document_type"
      : intelligence.blockingIssues.length
        ? "needs_correction"
        : (intelligence.humanReviewIssues || []).length
          ? "human_review"
          : "passed";
    const extractedSalary      = docType === "salary_certificate"
      ? (intelligence.extractedFields.salaryAmount?.value ?? null)
      : null;

    const document = appendRecord("documents", {
      documentId:           liveStore.nextId("DOC"),
      applicationId,
      documentType:         docType,
      fileName,
      source,
      uploadStatus:         body.uploadStatus || "received",
      recognitionStatus,
      authenticityRiskStatus: intelligence.validation.needsHumanReview ? "medium_risk" : "clear",
      extractedSalary,
      // Demo mode: base64 stored in document record, written to disk under data/live.
      // Production must use encrypted government document storage and store only a reference.
      fileBase64:           fileBase64 || null,
      mimeType:             mimeType   || null,
      intelligence: {
        provider:               intelligence.provider,
        classificationConfidence: intelligence.classificationConfidence,
        readability:            intelligence.readability,
        extractedFields:        intelligence.extractedFields,
        validation:             intelligence.validation,
        blockingIssues:         intelligence.blockingIssues,
        humanReviewIssues:      intelligence.humanReviewIssues || [],
        warnings:               intelligence.warnings,
        recommendedNextAction:  intelligence.recommendedNextAction,
        audit:                  intelligence.audit
      },
      notes:      body.notes || "",
      createdAt:  nowIso()
    });

    // Back-fill extracted salary if application has none
    if (extractedSalary && !application.financial?.currentSalary) {
      updateApplication(applicationId, { financial: { ...application.financial, currentSalary: extractedSalary } }, null);
    }

    updateApplication(applicationId, { status: "waiting_for_assessment" }, {
      action:  "document_received",
      actor:   "document_intelligence_service",
      summary: `Document received: ${docType} — provider:${intelligence.provider} confidence:${Math.round((intelligence.classificationConfidence || 0) * 100)}% issues:[${intelligence.blockingIssues.join(",")}]`
    });
    sendJson(res, 201, { document: customerSafeDocument(document) });
    return true;
  }

  // POST /api/challenge-1/applications/:id/verify-documents — re-run AI verification on all uploaded docs
  if (method === "POST" && verifyDocsMatch) {
    const applicationId = decodeURIComponent(verifyDocsMatch[1]);
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) { sendJson(res, 404, { error: "application_not_found" }); return true; }

    const documents = findBy("documents", (d) => d.applicationId === applicationId);
    if (!documents.length) { sendJson(res, 200, { verified: 0, results: [] }); return true; }

    const appCtx = {
      currentSalary:      application.financial?.currentSalary,
      totalArrearsAmount: application.financial?.arrearsAmount,
      monthsDelayed:      application.financial?.monthsDelayed,
      employmentStatus:   application.employment?.status,
      applicantName:      application.customer?.displayName || null
    };

    const results = [];
    for (const doc of documents) {
      const intelligence = await documentIntelligence.analyze({
        fileBase64:         doc.fileBase64  || null,
        mimeType:           doc.mimeType    || null,
        fileName:           doc.fileName    || null,
        documentType:       doc.documentType,
        source:             doc.source      || "upload",
        applicationContext: appCtx,
        geminiClient,
        openaiClient
      });

      const recognitionStatus = intelligence.blockingIssues.includes("wrong_document_type")
        ? "wrong_document_type"
        : intelligence.blockingIssues.length
          ? "needs_correction"
          : (intelligence.humanReviewIssues || []).length
            ? "human_review"
            : "passed";
      const extractedSalary   = doc.documentType === "salary_certificate"
        ? (intelligence.extractedFields.salaryAmount?.value ?? null)
        : null;

      liveStore.updateStore("documents", (docs) => {
        const idx = docs.findIndex((d) => d.documentId === doc.documentId);
        if (idx !== -1) {
          docs[idx].recognitionStatus    = recognitionStatus;
          docs[idx].authenticityRiskStatus = intelligence.validation.needsHumanReview ? "medium_risk" : "clear";
          docs[idx].intelligence         = {
            provider:               intelligence.provider,
            classificationConfidence: intelligence.classificationConfidence,
            readability:            intelligence.readability,
            extractedFields:        intelligence.extractedFields,
            validation:             intelligence.validation,
            blockingIssues:         intelligence.blockingIssues,
            humanReviewIssues:      intelligence.humanReviewIssues || [],
            warnings:               intelligence.warnings,
            recommendedNextAction:  intelligence.recommendedNextAction,
            audit:                  intelligence.audit
          };
          if (extractedSalary) docs[idx].extractedSalary = extractedSalary;
        }
        return docs;
      });

      results.push({
        documentId:            doc.documentId,
        documentType:          doc.documentType,
        provider:              intelligence.provider,
        recognitionStatus,
        blockingIssues:        intelligence.blockingIssues,
        humanReviewIssues:     intelligence.humanReviewIssues || [],
        warnings:              intelligence.warnings,
        recommendedNextAction: intelligence.recommendedNextAction
      });
    }

    updateApplication(applicationId, {}, {
      action: "documents_ai_verified",
      actor:  "document_intelligence_service",
      summary: `Re-verified ${results.length} document(s) via ${results.map(r => r.provider).join(",")}`
    });

    sendJson(res, 200, { verified: results.length, applicationId, results });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-1/programme-loans") {
    if (!feedAllowed(req)) {
      sendJson(res, 403, { error: "programme_feed_not_allowed" });
      return true;
    }
    const body = await parseBody(req);
    const applicationId = body.applicationId;
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) {
      sendJson(res, 404, { error: "application_not_found" });
      return true;
    }
    const programmeLoan = appendRecord("programmeData", {
      programmeDataId: liveStore.nextId("PRG"),
      contractVersion: "programme-loan.v1",
      applicationId,
      beneficiaryId: body.beneficiaryId || application.customer?.identityRef || applicationId,
      caseId: applicationId,
      loanId: body.loanId || null,
      source: body.source || "server_feed",
      retrievedAt: body.retrievedAt || nowIso(),
      originalLoanAmount: Number(body.originalLoanAmount || body.originalAmount || 0),
      remainingLoanBalance: Number(body.remainingLoanBalance || body.outstandingBalance || 0),
      originalApprovedRepaymentMonths: Number(body.originalApprovedRepaymentMonths || body.originalApprovedMonths || 0),
      remainingRepaymentMonths: Number(body.remainingRepaymentMonths || body.remainingMonths || 0),
      totalArrearsAmount: Number(body.totalArrearsAmount || body.arrearsAmount || 0),
      unpaidInstallmentsCount: Number(body.unpaidInstallmentsCount || 0),
      currentMonthlyInstallment: Number(body.currentMonthlyInstallment || body.monthlyInstalment || body.monthlyInstallment || 0),
      monthlyObligations: Number(body.monthlyObligations || application.financial?.monthlyObligations || 0),
      paymentHistorySummary: body.paymentHistorySummary || {},
      hasActiveReschedulingRequest: Boolean(body.hasActiveReschedulingRequest),
      activeReschedulingRequest: body.activeReschedulingRequest || null,
      previousApplications: Array.isArray(body.previousApplications) ? body.previousApplications : [],
      familyStatus: body.familyStatus || "not_specified",
      dependentsCount: Number(body.dependentsCount || application.family?.dependentsCount || 0),
      familyMembersCount: Number(body.familyMembersCount || application.family?.familyMembersCount || 1),
      createdAt: nowIso()
    });
    updateApplication(applicationId, { status: "waiting_for_assessment" }, {
      action: "programme_data_received",
      actor: "programme_feed",
      summary: "Programme loan data received"
    });
    sendJson(res, 201, { programmeLoan });
    return true;
  }

  if (method === "POST" && assessMatch) {
    const applicationId = decodeURIComponent(assessMatch[1]);
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) {
      sendJson(res, 404, { error: "application_not_found" });
      return true;
    }
    let programmeLoan = latestBy("programmeData", (item) => item.applicationId === applicationId);
    const allowDemoProgrammeSeed = process.env.MOEI_ENABLE_DEMO_PROGRAMME_SEED === "1"
      || requestUrl.searchParams.get("demoProgrammeData") === "1";
    if (!programmeLoan && application.channel === "pwa_wizard" && allowDemoProgrammeSeed) {
      programmeLoan = createWizardDemoProgrammeLoan(application);
      updateApplication(applicationId, { status: "waiting_for_assessment" }, {
        action: "programme_data_demo_seeded",
        actor: "pwa_wizard",
        summary: "Mentor demo programme loan data generated for wizard submission"
      });
    }
    if (!programmeLoan) {
      sendJson(res, 409, assessmentWaiting(applicationId, "waiting_for_programme_data", "Programme loan data is required before assessment."));
      return true;
    }
    const caseData = buildAssessmentCase(application, programmeLoan);
    const documentCheck = documentCompletenessService.evaluate(caseData);

    // Enrich document completeness results with document intelligence from stored records
    const storedDocs = findBy("documents", (d) => d.applicationId === applicationId);
    const storedByType = Object.fromEntries(storedDocs.map((d) => [d.documentType, d]));
    documentCheck.requiredDocuments = documentCheck.requiredDocuments.map((doc) => {
      const stored = storedByType[doc.key];
      if (!stored) return doc;
      const enriched = { ...doc, recognitionStatus: stored.recognitionStatus };
      if (stored.intelligence) {
        enriched.intelligence = {
          provider:               stored.intelligence.provider,
          classificationConfidence: stored.intelligence.classificationConfidence,
          readability:            stored.intelligence.readability,
          extractedFields:        stored.intelligence.extractedFields,
          validation:             stored.intelligence.validation,
          blockingIssues:         stored.intelligence.blockingIssues,
          warnings:               stored.intelligence.warnings,
          recommendedNextAction:  stored.intelligence.recommendedNextAction
        };
      }
      return enriched;
    });

    const analyzedDocs = storedDocs.filter((d) => d.intelligence?.provider);
    const providers = [...new Set(analyzedDocs.map((d) => d.intelligence.provider))];
    const avgConfidence = analyzedDocs.length
      ? Math.round(analyzedDocs.reduce((s, d) => s + (d.intelligence.classificationConfidence || 0), 0) / analyzedDocs.length * 100)
      : null;
    documentCheck.intelligenceSummary = {
      totalAnalyzed:          analyzedDocs.length,
      totalDocuments:         storedDocs.length,
      providers,
      averageConfidencePct:   avgConfidence,
      blockingIssuesDetected: storedDocs.some((d) => d.intelligence?.blockingIssues?.length > 0),
      humanReviewRequired:    storedDocs.some((d) => d.intelligence?.validation?.needsHumanReview)
    };

    if (documentCheck.correctionRequired) {
      updateApplication(applicationId, { status: "documents_required" }, {
        action: "assessment_waiting_documents",
        summary: "Required documents are missing or need correction"
      });
      sendJson(res, 409, {
        status: "documents_required",
        assessmentCreated: false,
        documents: documentCheck
      });
      return true;
    }
    const salary = caseData.currentSalary;
    if (salary < 1000 || salary > 500000) {
      updateApplication(applicationId, { status: "documents_required" }, {
        action: "salary_out_of_range",
        summary: `Salary ${salary} AED is outside accepted range 1,000–500,000 AED`
      });
      sendJson(res, 422, {
        status: "salary_out_of_range",
        assessmentCreated: false,
        error: `Salary must be between AED 1,000 and AED 500,000. Received: ${salary} AED`
      });
      return true;
    }
    const assessment = assessmentOrchestrator.assess(caseData, { programmeLoan });
    // Merge intelligence data into the orchestrator's document check so it reaches the response
    assessment.documents.intelligenceSummary = documentCheck.intelligenceSummary;
    assessment.documents.requiredDocuments   = documentCheck.requiredDocuments;
    assessment.reasoning = await reasoningNarrativeService.generateNarrative({ assessment, anthropicClient });

    // Salary consistency check — compare AI-extracted salary from document vs form-declared salary
    let salaryConsistencyCheck = null;
    const salaryCertDoc = storedByType["salary_certificate"];
    if (salaryCertDoc?.extractedSalary && caseData.currentSalary > 0) {
      const extracted = Number(salaryCertDoc.extractedSalary);
      const declared = caseData.currentSalary;
      const discrepancyPct = Math.round(Math.abs(extracted - declared) / Math.max(extracted, declared) * 100);
      salaryConsistencyCheck = {
        status: discrepancyPct <= 5 ? "pass" : discrepancyPct <= 20 ? "warning" : "fail",
        extractedSalary: extracted,
        declaredSalary: declared,
        discrepancyPct,
        checkedAt: nowIso()
      };
    }

    const assessmentId = liveStore.nextId("ASM");
    const assessmentRun = appendRecord("assessmentRuns", {
      assessmentId,
      applicationId,
      status: "assessment_completed",
      assessment,
      salaryConsistencyCheck,
      createdAt: nowIso()
    });

    let nextStatus = assessment.assessmentResult.recommendation === "ready_for_trustgate"
      ? "ready_for_trustgate"
      : assessment.assessmentResult.recommendation;
    // Salary mismatch > 20% escalates to human review regardless of recommendation
    if (salaryConsistencyCheck?.status === "fail" && nextStatus === "ready_for_trustgate") {
      nextStatus = "refer_human_review";
    }
    updateApplication(applicationId, {
      status: nextStatus,
      latestAssessmentId: assessmentId,
      trustGateRequired: Boolean(assessment.assessmentResult.trustGateActionRequired)
    }, {
      action: "assessment_completed",
      summary: `Assessment completed: ${nextStatus}`
    });
    sendJson(res, 201, { assessmentRun });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-1/office/queue") {
    const applications = liveStore.readStore("applications")
      .filter((application) => application.status !== "draft")
      .map((application) => ({
        ...officeSafeApplication(application),
        officeStatus: application.status,
        latestAssessmentId: application.latestAssessmentId || null
      }));
    sendJson(res, 200, { applications });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-1/office/actions") {
    const body = await parseBody(req);
    const applicationId = body.applicationId;
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) {
      sendJson(res, 404, { error: "application_not_found" });
      return true;
    }
    const actionType = body.actionType || "note_added";
    const statusByAction = {
      request_correction: "returned_for_correction",
      refer_human_review: "human_review_required",
      prepare_trustgate_approval: "trustgate_pending",
      return_case: "returned_for_correction",
      note_added: application.status
    };
    const action = appendRecord("officeActions", {
      officeActionId: liveStore.nextId("OFF"),
      applicationId,
      officerId: body.officerId || "local_officer",
      actionType,
      notes: body.notes || "",
      createdAt: nowIso()
    });
    const newStatus = statusByAction[actionType] || application.status;
    updateApplication(applicationId, { status: newStatus }, {
      action: `office_${actionType}`,
      actor: "officer",
      summary: body.notes || actionType
    });
    // Proactive notification — fire-and-forget, never blocks officer action
    if (newStatus !== application.status && actionType !== "note_added") {
      proactiveNotificationService.sendStatusNotification({ applicationId, newStatus, notes: body.notes })
        .catch((err) => console.error("[proactive] officer action notification failed:", err.message));
    }
    sendJson(res, 201, { action });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-1/trustgate/approval-callback") {
    const body = await parseBody(req);
    const applicationId = body.applicationId;
    const application = latestBy("applications", (item) => item.applicationId === applicationId);
    if (!application) {
      sendJson(res, 404, { error: "application_not_found" });
      return true;
    }
    const prepared = latestBy("officeActions", (item) => item.applicationId === applicationId && item.actionType === "prepare_trustgate_approval");
    if (!prepared) {
      sendJson(res, 409, { error: "trustgate_not_prepared" });
      return true;
    }
    if (body.authorizationResult !== "approved") {
      updateApplication(applicationId, { status: "trustgate_declined" }, {
        action: "trustgate_declined",
        actor: "trustgate_adapter",
        summary: "TrustGate authorization declined"
      });
      proactiveNotificationService.sendStatusNotification({ applicationId, newStatus: "trustgate_declined" })
        .catch((err) => console.error("[proactive] trustgate_declined notification failed:", err.message));
      sendJson(res, 200, { status: "trustgate_declined" });
      return true;
    }
    const seal = createSeal(application, body);
    updateApplication(applicationId, { status: "approved_with_seal", sealId: seal.sealId }, {
      action: "trustgate_authorized",
      actor: "trustgate_adapter",
      summary: "TrustGate authorization approved and seal created"
    });
    proactiveNotificationService.sendStatusNotification({ applicationId, newStatus: "approved_with_seal" })
      .then(() => {
        // Send CSAT survey 30s after approval notification (fire-and-forget)
        setTimeout(() => {
          proactiveNotificationService.sendCSATSurvey({ applicationId, lang: application.language || "ar" })
            .catch((err) => console.error("[csat] survey send error:", err.message));
        }, 30000);
      })
      .catch((err) => console.error("[proactive] approved_with_seal notification failed:", err.message));
    sendJson(res, 201, { seal });
    return true;
  }

  if (method === "GET" && auditMatch) {
    const applicationId = decodeURIComponent(auditMatch[1]);
    sendJson(res, 200, {
      applicationId,
      auditEvents: findBy("auditEvents", (item) => item.applicationId === applicationId),
      statusHistory: findBy("statusHistory", (item) => item.applicationId === applicationId)
    });
    return true;
  }

  if (method === "GET" && sealMatch) {
    const sealId = decodeURIComponent(sealMatch[1]);
    const seal = latestBy("approvalSeals", (item) => item.sealId === sealId);
    if (!seal) {
      sendJson(res, 404, { error: "seal_not_found" });
      return true;
    }
    sendJson(res, 200, { seal });
    return true;
  }

  return false;
}

async function handleChallenge3Api(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
  const method = req.method;

  if (method === "GET" && pathname === "/api/challenge-3/health") {
    const c3Health = c3Store.health();
    sendJson(res, 200, {
      service: "challenge-3-onecx",
      mode: process.env.NODE_ENV || "development",
      openaiConfigured: !!openaiClient,
      anthropicConfigured: !!anthropicClient,
      openaiModel: process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini",
      claudeModel: process.env.CLAUDE_REASONING_MODEL || "claude-haiku-4-5-20251001",
      ...c3Health
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-3/notify/status-change") {
    if (!requireChallenge3Admin(req, res)) return true;
    const body = await parseBody(req);
    const { applicationId, newStatus } = body;
    if (!applicationId || !newStatus) {
      sendJson(res, 400, { error: "applicationId and newStatus are required" });
      return true;
    }
    const result = await proactiveNotificationService.sendStatusNotification({ applicationId, newStatus, notes: body.notes });
    sendJson(res, 200, result);
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/notifications") {
    const notifications = c3Store.readStore("proactiveNotifications");
    sendJson(res, 200, { notifications, count: notifications.length });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/csat") {
    const ratings = c3Store.readStore("csatRatings");
    const total = ratings.length;
    const avg = total > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(2) : null;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of ratings) { if (r.rating >= 1 && r.rating <= 4) distribution[r.rating]++; }
    sendJson(res, 200, { ratings, total, averageRating: avg ? Number(avg) : null, distribution });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-3/test/reset") {
    if (!resetAllowed(req)) {
      sendJson(res, 403, { error: "reset_not_allowed" });
      return true;
    }
    c3Store.clearStores();
    sendJson(res, 200, { ok: true, counts: c3Store.counts() });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/test/empty-state") {
    const counts = c3Store.counts();
    const empty = Object.values(counts).every((count) => count === 0);
    sendJson(res, empty ? 200 : 409, { empty, counts });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-3/message") {
    const body = await parseBody(req);
    const { customerId, identityFromTrustGate, currentChannel, rawMessage } = body;
    if (!customerId || !rawMessage) {
      sendJson(res, 400, { error: "customerId and rawMessage are required" });
      return true;
    }
    const identity = identityFromTrustGate || { preferredLanguage: "ar", preferredChannel: currentChannel || "website" };
    const result = await flashGateService.process({
      customerId,
      identityFromTrustGate: identity,
      currentChannel: currentChannel || "website",
      rawMessage
    });
    const guardResult = outputGuardService.guardReply(
      { customerReply: result.customerReply, forbiddenClaimDetected: false },
      result.language,
      null
    );
    sendJson(res, 200, {
      ...result,
      customerReply: guardResult.customerReply,
      guardBlocked: guardResult.guardBlocked,
      violations: guardResult.violations
    });
    return true;
  }

  // ── Twilio: incoming call webhook (TwiML) ────────────────────────────────────
  if (method === "POST" && pathname === "/api/challenge-3/twilio/voice") {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSig = req.headers["x-twilio-signature"];
    const publicOrigin = process.env.MOEI_PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;

    // verify signature in production whenever Twilio auth is configured
    if (authToken) {
      if (!twilioSig) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Missing Twilio signature");
        return true;
      }
      const body = await parseBody(req);
      const fullUrl = `${publicOrigin}/api/challenge-3/twilio/voice`;
      if (!twilioAdapter.verifyTwilioSignature(authToken, fullUrl, body, twilioSig)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Invalid Twilio signature");
        return true;
      }
      const callBody = body;
      const callerPhone = callBody.From || "";
      const lang = twilioAdapter.detectLanguageFromCall(callBody);
      const wsUrl = `wss://${req.headers.host}/api/challenge-3/twilio/relay`;
      const twiml = twilioAdapter.buildConversationRelayTwiML(wsUrl, { language: lang === "ar" ? "ar-SA" : "en-US" });
      res.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
      res.end(twiml);
      return true;
    }

    // dev / no-auth path
    const rawBody = await parseBody(req);
    const callerPhone = rawBody.From || "";
    const lang = twilioAdapter.detectLanguageFromCall(rawBody);
    const wsProto = process.env.NODE_ENV === "production" ? "wss" : "ws";
    const wsUrl = `${wsProto}://${req.headers.host}/api/challenge-3/twilio/relay`;
    const twiml = twilioAdapter.buildConversationRelayTwiML(wsUrl, { language: lang === "ar" ? "ar-SA" : "en-US" });
    res.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
    res.end(twiml);
    return true;
  }

  // ── Call-events: channel-agnostic adapter (NICE / Twilio / Telnyx / Vonage) ──
  if (method === "POST" && pathname === "/api/challenge-3/call-events") {
    if (!requireChallenge3Admin(req, res)) return true;
    const body = await parseBody(req);
    const {
      provider = "unknown",
      externalContactId,
      customerPhone,
      customerId: rawCustomerId,
      eventType = "utterance",
      speaker = "customer",
      text,
      language: hintLanguage,
      metadata = {}
    } = body;

    // resolve customer identity: use provided ID, or derive from phone
    const customerId = rawCustomerId
      || (customerPhone ? `CALL-${customerPhone.replace(/\D/g, "").slice(-9)}` : null);

    if (!customerId) {
      sendJson(res, 400, { error: "customerId or customerPhone is required" });
      return true;
    }

    // non-utterance events: record and return immediately
    if (eventType === "call_started" || eventType === "call_ended" || speaker !== "customer") {
      const eventRecord = {
        eventId: `EVT-CALL-${Date.now()}`,
        customerId,
        provider,
        externalContactId: externalContactId || null,
        channel: "call",
        eventType,
        speaker,
        text: text || null,
        metadata,
        timestamp: new Date().toISOString()
      };
      c3Store.appendEvent(eventRecord);
      sendJson(res, 200, { ok: true, eventType, eventId: eventRecord.eventId, customerId });
      return true;
    }

    // customer utterance: run through flash-gate
    if (!text || !text.trim()) {
      sendJson(res, 400, { error: "text is required for customer utterance events" });
      return true;
    }

    const identity = {
      preferredLanguage: hintLanguage || "ar",
      preferredChannel: "call",
      externalContactId: externalContactId || null,
      agentId: metadata.agentId || null,
      skill: metadata.skill || null
    };

    const result = await flashGateService.process({
      customerId,
      identityFromTrustGate: identity,
      currentChannel: "call",
      rawMessage: text.trim()
    });

    const guardResult = outputGuardService.guardReply(
      { customerReply: result.customerReply, forbiddenClaimDetected: false },
      result.language,
      null
    );

    // build a compact agent suggestion from flash-gate output
    const agentSuggestion = {
      suggestedReply: guardResult.customerReply,
      intent: result.normalizedIntent || "unknown",
      language: result.language,
      requiresHuman: result.requiresHuman,
      escalationScore: result.escalationScore,
      gate: result.gate,
      deterministicAnswerUsed: result.deterministicAnswerUsed || false,
      modelUsed: result.modelUsed
    };

    sendJson(res, 200, {
      ok: true,
      customerId,
      provider,
      externalContactId: externalContactId || null,
      eventId: result.eventId,
      journeyId: result.journeyId,
      agentSuggestion,
      guardBlocked: guardResult.guardBlocked || false,
      durationMs: result.durationMs
    });
    return true;
  }

  // ── Twilio: call status callback ─────────────────────────────────────────────
  if (method === "POST" && pathname === "/api/challenge-3/twilio/status") {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSig = req.headers["x-twilio-signature"];
    const publicOrigin = process.env.MOEI_PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
    const body = await parseBody(req);
    if (authToken) {
      if (!twilioSig) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Missing Twilio signature");
        return true;
      }
      const fullUrl = `${publicOrigin}/api/challenge-3/twilio/status`;
      if (!twilioAdapter.verifyTwilioSignature(authToken, fullUrl, body, twilioSig)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Invalid Twilio signature");
        return true;
      }
    }
    const callSid = body.CallSid || null;
    const callStatus = body.CallStatus || "unknown";
    const from = body.From || "";
    if (callSid) {
      const customerId = twilioAdapter.phoneToCustomerId(from);
      c3Store.appendEvent({
        eventId: `EVT-TWILIO-STATUS-${Date.now()}`,
        customerId: customerId || "unknown",
        provider: "twilio",
        externalContactId: callSid,
        channel: "call",
        eventType: `call_status_${callStatus}`,
        speaker: "system",
        callStatus,
        from,
        timestamp: new Date().toISOString()
      });
    }
    send(res, 200, "", { "Content-Type": "text/plain" });
    return true;
  }

  // ── WhatsApp Business Cloud API: hub verification ────────────────────────────
  if (method === "GET" && pathname === "/api/challenge-3/whatsapp/webhook") {
    const query = Object.fromEntries(requestUrl.searchParams.entries());
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      send(res, 503, "WhatsApp verify token not configured", { "Content-Type": "text/plain" });
      return true;
    }
    const challenge = metaWhatsApp.verifyHubChallenge(query, verifyToken);
    if (!challenge) {
      send(res, 403, "Forbidden", { "Content-Type": "text/plain" });
      return true;
    }
    send(res, 200, challenge, { "Content-Type": "text/plain" });
    return true;
  }

  // ── WhatsApp Business Cloud API: incoming messages ───────────────────────────
  if (method === "POST" && pathname === "/api/challenge-3/whatsapp/webhook") {
    const rawBody = await metaWhatsApp.readRawBody(req);

    // signature verification
    const appSecret = process.env.META_APP_SECRET;
    const sigHeader = req.headers["x-hub-signature-256"] || "";
    if (appSecret) {
      if (!metaWhatsApp.verifyMetaSignature(appSecret, rawBody, sigHeader)) {
        send(res, 403, "Invalid signature", { "Content-Type": "text/plain" });
        return true;
      }
    }

    let body;
    try { body = JSON.parse(rawBody); } catch { sendJson(res, 400, { error: "Invalid JSON" }); return true; }

    // respond 200 immediately before processing (Meta requires fast ack)
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");

    const messages = metaWhatsApp.parseIncomingMessages(body);
    for (const msg of messages) {
      if (!msg.customerPhone || !msg.text) continue;

      const customerId = metaWhatsApp.phoneToCustomerId(msg.customerPhone);
      const lang = metaWhatsApp.detectLanguageFromPhone(msg.customerPhone);

      // CSAT detection — if reply is just 1–4, log as CSAT rating
      const csatMatch = msg.text.trim().match(/^([1-4])$/);
      if (csatMatch) {
        const rating = Number(csatMatch[1]);
        const labels = { 1: "Excellent", 2: "Good", 3: "Fair", 4: "Poor" };
        const labelsAr = { 1: "ممتاز", 2: "جيد", 3: "مقبول", 4: "ضعيف" };
        try {
          const existing = c3Store.readStore("csatRatings");
          c3Store.writeStore("csatRatings", [...existing, {
            csatId: `CSAT-${Date.now()}`,
            customerId,
            phone: msg.customerPhone,
            rating,
            label: labels[rating],
            labelAr: labelsAr[rating],
            channel: "whatsapp",
            recordedAt: new Date().toISOString()
          }]);
        } catch (err) {
          console.error("[csat] Store error:", err.message);
        }
        // Thank the customer
        const phoneNumberId = msg.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (phoneNumberId && whatsappAccessTokenSlots().length > 0) {
          const thanks = lang === "ar"
            ? `شكراً على تقييمكم! تقييمكم: ${labelsAr[rating]} ⭐\nنسعى دائماً لتحسين خدماتنا.`
            : `Thank you for your feedback! You rated: ${labels[rating]} ⭐\nWe're committed to improving our services.`;
          sendWhatsAppTextWithFallback(phoneNumberId, msg.customerPhone, thanks).catch(() => {});
        }
        continue;
      }
      const identity = { preferredLanguage: lang, preferredChannel: "whatsapp" };

      // append incoming event to ledger
      c3Store.appendEvent({
        eventId: `EVT-WA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerId,
        provider: "meta_cloud_api",
        externalMessageId: msg.externalMessageId,
        phoneNumberId: msg.phoneNumberId || null,
        channel: "whatsapp",
        eventType: "message",
        speaker: "customer",
        text: msg.text,
        language: lang,
        messageType: msg.messageType,
        timestamp: msg.timestamp
      });

      // run through flash-gate
      let result;
      try {
        result = await flashGateService.process({
          customerId,
          identityFromTrustGate: identity,
          currentChannel: "whatsapp",
          rawMessage: msg.text.trim()
        });
      } catch {
        continue;
      }

      const guardResult = outputGuardService.guardReply(
        { customerReply: result.customerReply, forbiddenClaimDetected: false },
        result.language,
        null
      );

      const replyText = guardResult.customerReply;

      // append outgoing event
      c3Store.appendEvent({
        eventId: `EVT-WA-OUT-${Date.now()}`,
        customerId,
        provider: "meta_cloud_api",
        phoneNumberId: msg.phoneNumberId || null,
        channel: "whatsapp",
        eventType: "message",
        speaker: "agent",
        text: replyText,
        language: result.language,
        gate: result.gate,
        modelUsed: result.modelUsed,
        timestamp: new Date().toISOString()
      });

      // send reply back via Meta Cloud API
      const phoneNumberId = msg.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (phoneNumberId && whatsappAccessTokenSlots().length > 0) {
        sendWhatsAppTextWithFallback(phoneNumberId, msg.customerPhone, replyText).then(({ tokenSlot, result: sendResult }) => {
          c3Store.appendEvent({
            eventId: `EVT-WA-SEND-OK-${Date.now()}`,
            customerId,
            provider: "meta_cloud_api",
            channel: "whatsapp",
            eventType: "message_send_accepted",
            speaker: "system",
            tokenSlot,
            externalMessageId: sendResult.messages?.[0]?.id || null,
            timestamp: new Date().toISOString()
          });
        }).catch((error) => {
          c3Store.appendEvent({
            eventId: `EVT-WA-SEND-FAILED-${Date.now()}`,
            customerId,
            provider: "meta_cloud_api",
            channel: "whatsapp",
            eventType: "message_send_failed",
            speaker: "system",
            errorMessage: error.message,
            errorCode: error.meta?.error?.code || null,
            errorSubcode: error.meta?.error?.error_subcode || null,
            fbtraceId: error.meta?.error?.fbtrace_id || null,
            timestamp: new Date().toISOString()
          });
        });
      }
    }
    return true;
  }

  // ── WhatsApp: manual send (for officer-initiated messages) ───────────────────
  if (method === "POST" && pathname === "/api/challenge-3/whatsapp/send") {
    if (!requireChallenge3Admin(req, res)) return true;
    const body = await parseBody(req);
    const { to, text } = body;
    if (!to || !text) {
      sendJson(res, 400, { error: "to and text are required" });
      return true;
    }
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId || whatsappAccessTokenSlots().length === 0) {
      sendJson(res, 503, { error: "WhatsApp not configured" });
      return true;
    }
    try {
      const { tokenSlot, result } = await sendWhatsAppTextWithFallback(phoneNumberId, to, text);
      sendJson(res, 200, { ok: true, tokenSlot, result });
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error.message,
        metaError: error.meta?.error || null
      });
    }
    return true;
  }

  const customerBrainMatch = pathname.match(/^\/api\/challenge-3\/customer\/([^/]+)\/brain$/);
  if (method === "GET" && customerBrainMatch) {
    const customerId = decodeURIComponent(customerBrainMatch[1]);
    const profile = c3Store.readStore("profiles").find((p) => p.customerId === customerId);
    const recentEvents = c3Store.getCustomerEvents(customerId, 10);
    if (!profile) {
      sendJson(res, 404, { error: "customer_not_found" });
      return true;
    }
    sendJson(res, 200, { profile, recentEvents, eventCount: recentEvents.length });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/events") {
    const params = requestUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") || 20), 100);
    const customerId = params.get("customerId");
    let events = c3Store.readStore("events");
    if (customerId) events = events.filter((e) => e.customerId === customerId);
    sendJson(res, 200, { events: events.slice(-limit), total: events.length });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/officer/queue") {
    const events = c3Store.readStore("events");
    const escalations = events
      .filter((e) => e.requiresHuman || e.escalationScore >= 50)
      .sort((a, b) => b.escalationScore - a.escalationScore)
      .slice(0, 50);
    sendJson(res, 200, { escalations, total: escalations.length });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-3/officer/copilot") {
    if (!claudeCopilotWorker) {
      sendJson(res, 503, { error: "Claude not configured — set ANTHROPIC_API_KEY" });
      return true;
    }
    const body = await parseBody(req);
    const { customerId, officerId, focus } = body;
    if (!customerId) {
      sendJson(res, 400, { error: "customerId is required" });
      return true;
    }
    const profile = c3Store.readStore("profiles").find((p) => p.customerId === customerId);
    if (!profile) {
      sendJson(res, 404, { error: "customer_not_found" });
      return true;
    }
    const recentEvents = c3Store.getCustomerEvents(customerId, 10);
    const brainService = createCustomerBrainService({ rootDir });
    const brain = brainService.buildBrain({
      customerId,
      identityFromTrustGate: profile,
      currentChannel: profile.preferredChannel || "officer_dashboard"
    });
    const copilotResult = await claudeCopilotWorker.runOfficerCopilot({ fullBrain: brain, recentEvents, officerId, focus });
    sendJson(res, 200, copilotResult);
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/leadership/kpis") {
    const events = c3Store.readStore("events");
    const profiles = c3Store.readStore("profiles");
    const now = Date.now();
    const h24 = 24 * 60 * 60 * 1000;

    const recent = events.filter(e => now - new Date(e.timestamp).getTime() < h24);

    const channelCount = {};
    const sentimentCount = {};
    const intentCount = {};
    const modelCount = {};
    let escalated = 0;
    let deterministicCount = 0;
    let totalDurationMs = 0;
    let durationSamples = 0;

    events.forEach(e => {
      const ch = e.currentChannel || e.channel || "web";
      channelCount[ch] = (channelCount[ch] || 0) + 1;

      const sent = e.sentiment || "neutral";
      sentimentCount[sent] = (sentimentCount[sent] || 0) + 1;

      const intent = e.normalizedIntent || "unknown";
      intentCount[intent] = (intentCount[intent] || 0) + 1;

      const model = e.deterministicAnswerUsed ? "deterministic" : (e.modelUsed || "unknown");
      modelCount[model] = (modelCount[model] || 0) + 1;

      if (e.requiresHuman || (e.escalationScore || 0) >= 50) escalated++;
      if (e.deterministicAnswerUsed) deterministicCount++;
      if (e.durationMs) { totalDurationMs += e.durationMs; durationSamples++; }
    });

    const topIntents = Object.entries(intentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([intent, count]) => ({ intent, count }));

    const avgDurationMs = durationSamples ? Math.round(totalDurationMs / durationSamples) : 0;
    const deterministicRate = events.length ? Math.round((deterministicCount / events.length) * 100) : 0;
    const escalationRate = events.length ? Math.round((escalated / events.length) * 100) : 0;

    sendJson(res, 200, {
      generatedAt: new Date().toISOString(),
      totals: {
        interactions: events.length,
        customers: profiles.length,
        escalated,
        escalationRate,
        deterministic: deterministicCount,
        deterministicRate,
        avgDurationMs
      },
      last24h: { interactions: recent.length },
      channelBreakdown: channelCount,
      sentimentBreakdown: sentimentCount,
      topIntents,
      modelUsage: modelCount,
      historicalDataset: (() => {
        try {
          const ds = moeiDataset.getOverviewStats();
          return {
            source: ds.source,
            totalInteractions: ds.totals.totalInteractions,
            channelBreakdown: ds.channelBreakdown,
            escalationRate: ds.escalationRate,
            fcrRate: ds.fcrRate,
            csatAvg: ds.csatAvg,
          };
        } catch (_) { return null; }
      })()
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-3/dataset/stats") {
    try {
      const stats = moeiDataset.getOverviewStats();
      sendJson(res, 200, stats);
    } catch (err) {
      sendJson(res, 500, { error: "dataset_read_error", message: err.message });
    }
    return true;
  }

  return false;
}

async function handleChallenge2Api(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
  const method = req.method;

  if (method === "GET" && pathname === "/api/challenge-2/health") {
    sendJson(res, 200, {
      service: "challenge-2-countryiq",
      countries: countryIntelligenceService.listCountries().length,
      geminiConfigured: !!geminiClient,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash"
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/challenge-2/countries") {
    const countries = countryIntelligenceService.listCountries();
    sendJson(res, 200, { countries, count: countries.length });
    return true;
  }

  if (method === "GET" && pathname.startsWith("/api/challenge-2/countries/")) {
    const countryCode = pathname.split("/").pop();
    const country = countryIntelligenceService.getCountry(countryCode);
    if (!country) { sendJson(res, 404, { error: "country_not_found" }); return true; }
    sendJson(res, 200, { country });
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-2/briefing") {
    const body = await parseBody(req);
    const { countryCode, meetingContext, fresh } = body;
    if (!countryCode) { sendJson(res, 400, { error: "countryCode is required" }); return true; }

    // Demo-mode: serve pre-seeded briefing instantly (no LLM call). Pass fresh:true to force live generation.
    if (!fresh) {
      const seedPath = path.join(rootDir, "challenge-2", "data", "seeded-briefings", `${countryCode.toUpperCase()}.json`);
      if (fs.existsSync(seedPath)) {
        try {
          const seeded = JSON.parse(fs.readFileSync(seedPath, "utf8"));
          seeded.briefingId = `BRIEF-${countryCode.toUpperCase()}-${Date.now()}`;
          seeded.generatedAt = new Date().toISOString();
          sendJson(res, 200, { ...seeded, seededDemo: true });
          return true;
        } catch { /* fall through to live generation */ }
      }
    }

    const result = await briefingOrchestrator.generateBriefing({ countryCode: countryCode.toUpperCase(), geminiClient, meetingContext });
    sendJson(res, 200, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-2/compare") {
    const body = await parseBody(req);
    const { countryCodeA, countryCodeB } = body;
    if (!countryCodeA || !countryCodeB) { sendJson(res, 400, { error: "countryCodeA and countryCodeB required" }); return true; }
    const result = await briefingOrchestrator.compareBriefings({
      countryCodeA: countryCodeA.toUpperCase(),
      countryCodeB: countryCodeB.toUpperCase(),
      geminiClient
    });
    sendJson(res, 200, result);
    return true;
  }

  if (method === "POST" && pathname === "/api/challenge-2/chat") {
    const body = await parseBody(req);
    const { countryCode, question, briefingContext } = body;
    if (!countryCode || !question) { sendJson(res, 400, { error: "countryCode and question required" }); return true; }
    const country = countryIntelligenceService.getCountry(countryCode.toUpperCase());
    if (!country) { sendJson(res, 404, { error: "country_not_found" }); return true; }

    let answer = null;
    if (geminiClient) {
      try {
        const chatModel = geminiClient.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
          tools: [{ googleSearch: {} }]
        });
        const prompt = `You are CountryIQ, a strategic advisor to UAE MOEI. Answer the analyst's follow-up question. Prioritize the provided country data, but you may supplement with your knowledge. Be concise (max 150 words). Flag anything uncertain as [UNVERIFIED].\n\nCountry data:\n${JSON.stringify({ uaeRelations: country.uaeRelations, opportunities: country.opportunities, risks: country.riskFactors, keyTopics: country.keyMeetingTopics }, null, 2)}\n\nQuestion: ${question}`;
        const result = await chatModel.generateContent(prompt);
        answer = result.response.text() || null;
      } catch (err) {
        console.error("[c2-chat] Gemini failed:", err.message);
      }
    }

    if (!answer) {
      answer = `Based on available data: ${country.uaeRelations?.strategicImportance || "Strategic partner for UAE."}`;
    }

    const guardResult = sourceGuardService.verifyBriefingContent(answer, countryCode.toUpperCase());
    sendJson(res, 200, { answer, countryCode, trustScore: guardResult.trustScore, flags: guardResult.flags });
    return true;
  }

  if (method === "GET" && pathname.startsWith("/api/challenge-2/export/")) {
    const countryCode = pathname.split("/").pop();
    const country = countryIntelligenceService.getCountry(countryCode);
    if (!country) { sendJson(res, 404, { error: "country_not_found" }); return true; }

    const exportData = {
      title: `CountryIQ Strategic Brief — ${country.countryName}`,
      generatedAt: new Date().toISOString(),
      classification: "UAE MOEI — CONFIDENTIAL (DEMO)",
      country: {
        name: country.countryName,
        nameAr: country.countryNameAr,
        region: country.region,
        gdpBn: Math.round((country.gdpUsd || 0) / 1e9),
        bilateralTradeUsd: country.uaeRelations?.bilateralTradeUsd,
        strategicImportance: country.uaeRelations?.strategicImportance
      },
      opportunities: country.opportunities || [],
      risks: country.riskFactors || [],
      keyMeetingTopics: country.keyMeetingTopics || [],
      talkingPoints: country.talkingPoints || {}
    };

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="CountryIQ-${countryCode}-Brief.json"`
    });
    res.end(JSON.stringify(exportData, null, 2));
    return true;
  }

  return false;
}

// ── /api/app/ — MOEI Case Cockpit citizen API ────────────────────────
// Live runtime serves APP-* cases only. Demo cases require explicit debug mode.
const APP_MOCK_CASES = {
  missing_document: {
    citizenId: "DEMO-KHALID",
    name:        { en: "Khalid Al Mansouri",                    ar: "خالد المنصوري" },
    programme:   { en: "Sheikh Zayed Housing Programme",        ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth: 62,
    healthLabel: { en: "Needs attention",                       ar: "يحتاج إلى انتباه" },
    nextUpdate:  { en: "Upload required",                       ar: "مطلوب رفع مستند" },
    arrearsAed: 40000, stage: "documents",
    blocker: {
      title:  { en: "Upload latest salary certificate",         ar: "رفع شهادة راتب حديثة" },
      sub:    { en: "Your previous certificate is older than 30 days", ar: "شهادتك السابقة تجاوزت 30 يوماً" },
      action: { en: "Upload",                                   ar: "رفع" }
    },
    officer: null, recommendation: null, appointment: null
  },
  under_review: {
    citizenId: "DEMO-FATIMA",
    name:        { en: "Fatima Al Zaabi",                       ar: "فاطمة الزعابي" },
    programme:   { en: "Sheikh Zayed Housing Programme",        ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth: 84,
    healthLabel: { en: "Low delay risk",                        ar: "مخاطر تأخير منخفضة" },
    nextUpdate:  { en: "2 days",                                ar: "خلال يومين" },
    arrearsAed: 35000, stage: "ai_review", blocker: null,
    officer: {
      name:     { en: "Aisha Al Nuaimi",                        ar: "عائشة النعيمي" },
      role:     { en: "Financial Review Officer",               ar: "موظفة المراجعة المالية" },
      activity: { en: "Checking repayment capacity",            ar: "فحص القدرة على السداد" }
    },
    recommendation: null, appointment: null
  },
  recommendation_ready: {
    citizenId: "DEMO-AHMED",
    name:        { en: "Ahmed Al Ketbi",                        ar: "أحمد الكتبي" },
    programme:   { en: "Sheikh Zayed Housing Programme",        ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth: 95,
    healthLabel: { en: "Decision ready",                        ar: "القرار جاهز" },
    nextUpdate:  { en: "Review plan",                           ar: "راجع الخطة" },
    arrearsAed: 28000, stage: "decision", blocker: null,
    officer: {
      name:     { en: "Mohammed Al Hammadi",                    ar: "محمد الحمادي" },
      role:     { en: "Senior Case Officer",                    ar: "مسؤول الطلبات الأول" },
      activity: { en: "Recommendation prepared",               ar: "تم إعداد التوصية" }
    },
    recommendation: {
      deductionPct: 18,
      path:     { en: "Maintain current installment",           ar: "الحفاظ على القسط الحالي" },
      duration: { en: "Within original loan period",            ar: "ضمن مدة القرض الأصلية" }
    },
    appointment: null
  },
  human_review: {
    citizenId: "DEMO-MOHAMMED",
    name:        { en: "Mohammed Al Rashdi",                    ar: "محمد الراشدي" },
    programme:   { en: "Sheikh Zayed Housing Programme",        ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth: 71,
    healthLabel: { en: "Officer review needed",                 ar: "مراجعة الموظف المختص مطلوبة" },
    nextUpdate:  { en: "Thursday",                              ar: "الخميس" },
    arrearsAed: 55000, stage: "officer", blocker: null,
    officer: {
      name:     { en: "Sara Al Darmaki",                        ar: "سارة الدرماكي" },
      role:     { en: "Housing Assessment Officer",             ar: "موظفة تقييم الطلبات السكنية" },
      activity: { en: "Scheduling review meeting",              ar: "جدولة اجتماع المراجعة" }
    },
    recommendation: null,
    appointment: {
      date:      { en: "Thursday, 12 Jun 2026",                 ar: "الخميس، 12 يونيو 2026" },
      mode:      { en: "In person — MOEI Abu Dhabi",            ar: "حضوري — وزارة الطاقة والبنية التحتية، أبوظبي" },
      dayNum: "12", monthShort: "JUN"
    }
  }
};

const APP_CITIZEN_MAP = {
  demo: "missing_document", khalid: "missing_document",
  fatima: "under_review", ahmed: "recommendation_ready", mohammed: "human_review",
  missing_document: "missing_document", under_review: "under_review",
  recommendation_ready: "recommendation_ready", human_review: "human_review"
};

function mapLiveAppToCaseData(app, assessment) {
  const statusStageMap = {
    application_submitted:  "submitted",
    documents_required:     "documents",
    waiting_for_assessment: "ai_review",
    human_review_required:  "officer",
    ready_for_trustgate:    "officer",
    approved_with_seal:     "decision",
    rejected:               "decision",
  };
  const healthScoreMap = {
    application_submitted:  70, documents_required: 45,
    waiting_for_assessment: 80, human_review_required: 72,
    ready_for_trustgate:    94, approved_with_seal: 99, rejected: 20,
  };
  const healthLabelMap = {
    application_submitted:  { en: "Processing",             ar: "قيد المعالجة" },
    documents_required:     { en: "Needs attention",        ar: "يحتاج إلى انتباه" },
    waiting_for_assessment: { en: "Low delay risk",         ar: "مخاطر تأخير منخفضة" },
    human_review_required:  { en: "Officer review needed",  ar: "مراجعة الموظف المختص مطلوبة" },
    ready_for_trustgate:    { en: "Decision ready",         ar: "القرار جاهز" },
    approved_with_seal:     { en: "Approved",               ar: "تمت الموافقة" },
    rejected:               { en: "Not approved",           ar: "غير موافق عليه" },
  };

  const stage       = statusStageMap[app.status]   || "submitted";
  const healthScore = healthScoreMap[app.status]   || 70;
  const healthLabel = healthLabelMap[app.status]   || { en: "Processing", ar: "قيد المعالجة" };
  const name        = app.customer?.displayName    || "Applicant";
  const arrears     = app.financial?.arrearsAmount || 0;

  const blocker = stage === "documents" ? {
    title:  { en: "Upload salary certificate",       ar: "رفع شهادة الراتب" },
    sub:    { en: "Required to continue assessment", ar: "مطلوب لاستكمال التقييم" },
    action: { en: "Upload",                          ar: "رفع" }
  } : null;

  const rec = assessment?.recommendation;
  const recommendation = rec ? {
    deductionPct: rec.deductionPct || 18,
    path:     { en: rec.recommendationPath || "Rescheduling plan prepared", ar: "تمت إعداد خطة الجدولة" },
    duration: { en: "Within original loan period", ar: "ضمن مدة القرض الأصلية" },
  } : null;

  return {
    citizenId:   app.applicationId,
    name:        { en: name, ar: name },
    programme:   { en: "Sheikh Zayed Housing Programme", ar: "برنامج الشيخ زايد للإسكان" },
    caseHealth:  healthScore,
    healthLabel,
    nextUpdate:  { en: "2 business days", ar: "خلال يومَي عمل" },
    arrearsAed:  arrears,
    stage,
    blocker,
    officer:     null,
    recommendation,
    appointment: null,
    _live:       true,
    _applicationId: app.applicationId,
  };
}

function handleAppApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
  const method   = req.method;

  const caseMatch = pathname.match(/^\/api\/app\/case\/([^/]+)$/);
  if (method === "GET" && caseMatch) {
    const key = decodeURIComponent(caseMatch[1]);

    // Real application lookup for wizard-submitted apps (APP- prefix)
    if (key.toUpperCase().startsWith("APP-")) {
      const app = latestBy("applications", (a) => a.applicationId === key.toUpperCase());
      if (app) {
        const assessment = latestBy("assessmentRuns", (a) => a.applicationId === key.toUpperCase());
        const caseData   = mapLiveAppToCaseData(app, assessment?.assessment);
        sendJson(res, 200, { ...caseData, _sprint: 2 });
        return true;
      }
    }

    // Demo case lookup is kept only for internal debug screenshots.
    if (requestUrl.searchParams.get("debug") === "1") {
      const stateKey = APP_CITIZEN_MAP[key.toLowerCase()];
      const caseData = stateKey ? APP_MOCK_CASES[stateKey] : null;
      if (caseData) {
        sendJson(res, 200, { ...caseData, _sprint: 1, _debugDemo: true });
        return true;
      }
    }

    sendJson(res, 404, { error: "application_not_found", applicationId: key });
    return true;
  }

  return false;
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/runtime-config.js") {
    sendRuntimeConfig(req, res);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/location") {
    await handleLocationApi(req, res, requestUrl);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/ddahub/")) {
    try {
      const handled = await handleDdaHubApi(req, res, requestUrl);
      if (!handled) sendJson(res, 404, { error: "api_route_not_found" });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (requestUrl.pathname.startsWith("/api/challenge-1/")) {
    try {
      const handled = await handleChallenge1Api(req, res, requestUrl);
      if (!handled) sendJson(res, 404, { error: "api_route_not_found" });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (requestUrl.pathname.startsWith("/api/challenge-3/")) {
    try {
      const handled = await handleChallenge3Api(req, res, requestUrl);
      if (!handled) sendJson(res, 404, { error: "api_route_not_found" });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (requestUrl.pathname.startsWith("/api/challenge-2/")) {
    try {
      const handled = await handleChallenge2Api(req, res, requestUrl);
      if (!handled) sendJson(res, 404, { error: "api_route_not_found" });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (requestUrl.pathname.startsWith("/api/app/")) {
    const handled = handleAppApi(req, res, requestUrl);
    if (!handled) sendJson(res, 404, { error: "api_route_not_found" });
    return;
  }

  if (!["GET", "HEAD"].includes(req.method)) {
    send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  serveFile(req, res);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(port, "127.0.0.1", () => {
  liveStore.ensureAllStores();
  ddaHubService.store.ensureAllStores();
  c3Store.ensureAllStores();
  console.log(`MOEI running at http://127.0.0.1:${port}/`);
  console.log(`  Challenge 1: /api/challenge-1/`);
  console.log(`  DDAHub: /api/ddahub/`);
  console.log(`  Challenge 3: /api/challenge-3/`);
  console.log(`  Twilio relay: ws://127.0.0.1:${port}/api/challenge-3/twilio/relay`);
  console.log(`  WhatsApp hook: http://127.0.0.1:${port}/api/challenge-3/whatsapp/webhook`);
  console.log(`  OpenAI: ${openaiClient ? "configured" : "not configured"}`);
  console.log(`  Anthropic: ${anthropicClient ? "configured" : "not configured"}`);
});

// ── Twilio ConversationRelay WebSocket server ─────────────────
const wss = new WebSocket.Server({ server, path: "/api/challenge-3/twilio/relay" });

wss.on("connection", (ws, req) => {
  let customerId = null;
  let sessionLang = "ar";
  let callSid = null;

  ws.on("message", async (raw) => {
    const msg = twilioAdapter.parseRelayMessage(raw.toString());
    if (!msg) return;

    // ── Setup event (first message from Twilio) ──────────────
    if (msg.type === "setup") {
      callSid = msg.callSid;
      const from = msg.from || "";
      customerId = twilioAdapter.phoneToCustomerId(from);
      sessionLang = msg.customParameters && msg.customParameters.lang
        ? msg.customParameters.lang
        : (from.startsWith("+971") || from.startsWith("00971") ? "ar" : "ar");

      // log call_started event
      c3Store.appendEvent({
        eventId: `EVT-CALL-START-${Date.now()}`,
        customerId,
        provider: "twilio",
        externalContactId: callSid,
        channel: "call",
        eventType: "call_started",
        speaker: "system",
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ── Prompt event (customer utterance transcript) ──────────
    if (msg.type === "prompt" && msg.voicePrompt) {
      const utterance = msg.voicePrompt.trim();
      if (!utterance || !customerId) return;

      try {
        const result = await flashGateService.process({
          customerId,
          identityFromTrustGate: {
            preferredLanguage: sessionLang,
            preferredChannel: "call",
            externalContactId: callSid
          },
          currentChannel: "call",
          rawMessage: utterance
        });

        const guardResult = outputGuardService.guardReply(
          { customerReply: result.customerReply, forbiddenClaimDetected: false },
          result.language,
          null
        );

        const reply = guardResult.customerReply || result.customerReply;
        ws.send(twilioAdapter.buildRelayResponse(reply));

        if (result.requiresHuman) {
          const handoffMsg = sessionLang === "ar"
            ? "سيتواصل معك موظف مختص قريباً. شكراً لصبرك."
            : "A specialist officer will contact you shortly. Thank you for your patience.";
          setTimeout(() => {
            ws.send(twilioAdapter.buildRelayEnd("human_handoff"));
          }, 2000);
        }
      } catch (err) {
        const errReply = sessionLang === "ar"
          ? "عذراً، حدث خطأ تقني. يُرجى المحاولة مرة أخرى."
          : "Sorry, a technical error occurred. Please try again.";
        ws.send(twilioAdapter.buildRelayResponse(errReply));
      }
      return;
    }

    // ── DTMF / interrupt events ───────────────────────────────
    if (msg.type === "interrupt") return;

    // ── End event ────────────────────────────────────────────
    if (msg.type === "end" || msg.type === "disconnect") {
      if (customerId) {
        c3Store.appendEvent({
          eventId: `EVT-CALL-END-${Date.now()}`,
          customerId,
          provider: "twilio",
          externalContactId: callSid,
          channel: "call",
          eventType: "call_ended",
          speaker: "system",
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  ws.on("error", (err) => {
    console.error("[Twilio relay WS error]", err.message);
  });
});
