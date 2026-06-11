const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const baseUrl = process.env.MOEI_BASE_URL || "http://127.0.0.1:9710";
const simBaseUrl = process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715/";

const routes = [
  { name: "gateway", path: "/" },
  { name: "customer-home", path: "/customer/" },
  {
    name: "customer-housing-gateway",
    path: "/customer/housing-arrears/",
    actions: []
  },
  {
    name: "customer-housing-gateway-en-real-copy",
    path: "/customer/housing-arrears/",
    lang: "en",
    actions: [],
    blockedPhrases: [
      "before TrustGate",
      "older ministry",
      "TrustGate Adapter",
      "Application Memory",
      "Create Normal",
      "ArrearsFlow",
      "agent verifies",
      "normal service account",
      "normal account layer"
    ]
  },
  {
    name: "customer-housing-after-trustgate",
    path: "/customer/housing-arrears/",
    authFlow: true,
    actions: [
      "document.getElementById('startNewApplicationBtn')?.click()"
    ]
  },
  { name: "office-home", path: "/office/" },
  { name: "office-housing", path: "/office/housing-arrears/" },
  { name: "verify-seal", path: "/verify/?stamp=STAMP-2026-DEMO-001" }
];

const allowedSingleTokens = new Set([
  "English",
  "UAE",
  "PASS",
  "TrustGate",
  "PIN",
  "Mariam",
  "Al",
  "Ketbi"
]);

const blockedSingleTokens = new Set([
  "AED",
  "AF",
  "Agent",
  "ArrearsFlow",
  "Main",
  "Account",
  "Search",
  "Worker",
  "worker",
  "fresh",
  "stale",
  "ready",
  "RULE",
  "Payload",
  "hash"
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanUserDataDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup only.
  }
}

function launchChromium() {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(os.tmpdir(), `moei-ar-copy-${Date.now()}-${process.pid}`);
    const browser = spawn("chromium", [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "about:blank"
    ], {
      stdio: ["ignore", "ignore", "pipe"]
    });

    let stderr = "";
    const timeout = setTimeout(() => {
      browser.kill("SIGTERM");
      cleanUserDataDir(userDataDir);
      reject(new Error(`Timed out waiting for Chromium DevTools endpoint.\n${stderr}`));
    }, 15000);

    browser.once("error", (error) => {
      clearTimeout(timeout);
      cleanUserDataDir(userDataDir);
      reject(error);
    });

    browser.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve({ browser, endpoint: match[1], userDataDir });
    });
  });
}

class CdpSession {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws = new WebSocket(webSocketUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.handleMessage(event));
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    if (message.method && this.listeners.has(message.method)) {
      for (const listener of this.listeners.get(message.method)) listener(message.params || {});
    }
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  waitFor(method, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const listener = (params) => {
        cleanup();
        resolve(params);
      };
      const cleanup = () => {
        clearTimeout(timeout);
        const listeners = this.listeners.get(method) || [];
        this.listeners.set(method, listeners.filter((item) => item !== listener));
      };
      this.listeners.set(method, [...(this.listeners.get(method) || []), listener]);
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // Closing a completed verifier session is best effort.
    }
  }
}

async function createPage(browserPort) {
  const response = await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chromium target: ${response.status}`);
  const target = await response.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false
  });
  return session;
}

async function navigate(session, routePath, lang = "ar") {
  const url = new URL(routePath, baseUrl);
  url.searchParams.set("lang", lang);
  const loaded = session.waitFor("Page.loadEventFired");
  await session.send("Page.navigate", { url: url.toString() });
  await loaded;
  await delay(500);
}

async function runAction(session, expression) {
  await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  await delay(300);
}

async function evalPage(session, expression) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

async function waitForCondition(session, expression, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evalPage(session, expression)) return;
    await delay(120);
  }
  throw new Error(`Timed out waiting for condition: ${expression}`);
}

async function completeTrustGateSignIn(session) {
  const moeiOrigin = new URL(baseUrl).origin;
  const simOrigin = new URL(simBaseUrl).origin;
  await evalPage(session, "document.getElementById('heroActionButton').click()");
  await waitForCondition(session, `location.origin === ${JSON.stringify(simOrigin)}`);
  await waitForCondition(session, "Boolean(document.getElementById('simLoginForm')) || Boolean(document.getElementById('startRequest'))");
  const loginState = await evalPage(session, `(() => ({
    origin: location.origin,
    path: location.pathname,
    loginForm: Boolean(document.getElementById('simLoginForm')),
    startRequest: Boolean(document.getElementById('startRequest'))
  }))()`);
  if (loginState.origin !== simOrigin || (!loginState.loginForm && !loginState.startRequest)) {
    throw new Error(`Expected TrustGate during visible-copy verifier, got ${JSON.stringify(loginState)}`);
  }
  if (loginState.loginForm) {
    await evalPage(session, `
      document.querySelector('#simLoginInput').value = '+971 50 000 2184';
      if (document.querySelector('#simPinInput')) document.querySelector('#simPinInput').value = '1111';
      document.querySelector('#simLoginForm').requestSubmit();
      true;
    `);
    await waitForCondition(session, "new URL(location.href).searchParams.get('stage') === 'waiting'");
  } else {
    await evalPage(session, "document.getElementById('startRequest').click()");
    await waitForCondition(session, "new URL(location.href).searchParams.get('stage') === 'waiting'");
  }
  const requestId = await evalPage(session, "new URL(location.href).searchParams.get('requestId')");
  await evalPage(session, `
    (async () => {
      const key = 'trustgate.requests.v1';
      const requests = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = {
        ...requests[${JSON.stringify(requestId)}],
        status: 'approved',
        approvedAt: new Date().toISOString(),
        numberMatchedAt: new Date().toISOString(),
        pinVerifiedAt: new Date().toISOString(),
        selectedNumber: requests[${JSON.stringify(requestId)}].displayNumber
      };
      requests[${JSON.stringify(requestId)}] = updated;
      localStorage.setItem(key, JSON.stringify(requests));
      await fetch('/api/requests/${requestId}', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      return true;
    })()
  `);
  await waitForCondition(session, `location.origin === ${JSON.stringify(moeiOrigin)} && location.pathname === '/customer/housing-arrears/'`, 10000);
}

async function snapshotVisibleCopy(session) {
  const expression = `(() => {
    function isVisible(element) {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      return element.getClientRects().length > 0;
    }
    const textChunks = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.replace(/\\s+/g, " ").trim();
      if (text && isVisible(node.parentElement)) textChunks.push(text);
    }
    const ariaLabels = Array.from(document.querySelectorAll("[aria-label]"))
      .filter(isVisible)
      .map((node) => node.getAttribute("aria-label"))
      .filter(Boolean);
    const placeholders = Array.from(document.querySelectorAll("input[placeholder], textarea[placeholder]"))
      .filter(isVisible)
      .map((node) => node.getAttribute("placeholder"))
      .filter(Boolean);
    return {
      title: document.title,
      htmlLang: document.documentElement.lang,
      htmlDir: document.documentElement.dir,
      textChunks,
      ariaLabels,
      placeholders
    };
  })()`;
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  return result.result.value;
}

function tokenIsAllowed(token, chunk) {
  const normalizedToken = token.replace(/[.,;:]+$/, "");
  if (allowedSingleTokens.has(normalizedToken)) return true;
  if (/^X+$/.test(token)) return true;
  if (/^X+-\d+$/.test(token)) return true;
  if (chunk.includes("@")) return true;
  if (/MOEI-HOUSING-\d{4}-\d+/.test(chunk)) return true;
  if (/MOEI-HOUSING-\d{4}-[A-Z0-9]+-[A-Z0-9]+/.test(chunk)) return true;
  if (/STAMP-\d{4}-/.test(chunk)) return true;
  if (/CHAL-\d+/.test(chunk)) return true;
  if (/OFF-\d+/.test(chunk)) return true;
  if (/^TGATE-[A-Z0-9-]+$/i.test(normalizedToken)) return true;
  if (/^demo-payload-hash-\d+$/i.test(normalizedToken)) return true;
  if (/^[a-f0-9]{6,}$/i.test(chunk.trim())) return true;
  if (/^[a-f0-9]{6,}$/i.test(token) && /\d/.test(token)) return true;
  if (/^\d+[A-Za-z]?$/.test(token)) return true;
  return false;
}

function findLeaks(snapshot) {
  const chunks = [
    { type: "title", values: [snapshot.title] },
    { type: "visible", values: snapshot.textChunks },
    { type: "aria-label", values: snapshot.ariaLabels },
    { type: "placeholder", values: snapshot.placeholders }
  ];
  const leaks = [];
  for (const group of chunks) {
    for (const chunk of group.values || []) {
      const tokens = chunk.match(/[A-Za-z][A-Za-z0-9_.-]*/g) || [];
      for (const token of tokens) {
        if (blockedSingleTokens.has(token) || !tokenIsAllowed(token, chunk)) {
          leaks.push({ type: group.type, token, chunk });
        }
      }
    }
  }
  return leaks;
}

function findBlockedPhrases(snapshot, phrases = []) {
  if (!phrases.length) return [];
  const chunks = [
    { type: "title", values: [snapshot.title] },
    { type: "visible", values: snapshot.textChunks },
    { type: "aria-label", values: snapshot.ariaLabels },
    { type: "placeholder", values: snapshot.placeholders }
  ];
  const loweredPhrases = phrases.map((phrase) => phrase.toLowerCase());
  const leaks = [];
  for (const group of chunks) {
    for (const chunk of group.values || []) {
      const normalized = chunk.toLowerCase();
      loweredPhrases.forEach((phrase, index) => {
        if (normalized.includes(phrase)) {
          leaks.push({ type: group.type, phrase: phrases[index], chunk });
        }
      });
    }
  }
  return leaks;
}

async function verifyRoute(route, browserPort) {
  const session = await createPage(browserPort);
  try {
    const lang = route.lang || "ar";
    await navigate(session, route.path, lang);
    if (route.authFlow) await completeTrustGateSignIn(session);
    for (const action of route.actions || []) await runAction(session, action);
    const snapshot = await snapshotVisibleCopy(session);
    if (lang === "ar" && (snapshot.htmlLang !== "ar" || snapshot.htmlDir !== "rtl")) {
      throw new Error(`${route.name} did not render Arabic RTL mode`);
    }
    if (lang === "en" && (snapshot.htmlLang !== "en" || snapshot.htmlDir !== "ltr")) {
      throw new Error(`${route.name} did not render English LTR mode`);
    }
    const leaks = lang === "ar"
      ? findLeaks(snapshot)
      : findBlockedPhrases(snapshot, route.blockedPhrases);
    return {
      name: route.name,
      path: route.path,
      lang,
      visibleTextChunks: snapshot.textChunks.length,
      ariaLabels: snapshot.ariaLabels.length,
      placeholders: snapshot.placeholders.length,
      leaks
    };
  } finally {
    session.close();
  }
}

async function main() {
  const launched = await launchChromium();
  const browserPort = new URL(launched.endpoint).port;
  try {
    const results = [];
    for (const route of routes) {
      results.push(await verifyRoute(route, browserPort));
    }
    const failures = results.flatMap((result) => result.leaks.map((leak) => ({ route: result.name, ...leak })));
    if (failures.length) {
      console.error("Visible-copy verifier found language or internal-explanation leaks:");
      console.error(JSON.stringify(failures.slice(0, 40), null, 2));
      if (failures.length > 40) console.error(`...and ${failures.length - 40} more.`);
      process.exit(1);
    }
    console.log("MOEI visible copy verified");
    console.log(JSON.stringify(results.map(({ leaks, ...result }) => result), null, 2));
  } finally {
    launched.browser.kill("SIGTERM");
    cleanUserDataDir(launched.userDataDir);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
