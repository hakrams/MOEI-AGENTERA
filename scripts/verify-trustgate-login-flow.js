const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const baseUrl = process.env.MOEI_BASE_URL || "http://127.0.0.1:9710";
const simBaseUrl = process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715/";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup.
  }
}

function launchChromium() {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(os.tmpdir(), `moei-trustgate-flow-${Date.now()}-${process.pid}`);
    const browser = spawn("chromium", [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "about:blank"
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    const timeout = setTimeout(() => {
      browser.kill("SIGTERM");
      cleanup(userDataDir);
      reject(new Error(`Timed out waiting for Chromium DevTools endpoint.\n${stderr}`));
    }, 15000);

    browser.once("error", (error) => {
      clearTimeout(timeout);
      cleanup(userDataDir);
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

  close() {
    try {
      this.ws.close();
    } catch {
      // Best effort close.
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
    height: 1150,
    deviceScaleFactor: 1,
    mobile: false
  });
  return session;
}

async function navigate(session, routePath, lang = "ar") {
  const url = new URL(routePath, baseUrl);
  url.searchParams.set("lang", lang);
  const loaded = new Promise((resolve) => {
    const listener = () => {
      const listeners = session.listeners.get("Page.loadEventFired") || [];
      session.listeners.set("Page.loadEventFired", listeners.filter((item) => item !== listener));
      resolve();
    };
    session.listeners.set("Page.loadEventFired", [...(session.listeners.get("Page.loadEventFired") || []), listener]);
  });
  await session.send("Page.navigate", { url: url.toString() });
  await loaded;
  await delay(500);
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

async function snapshot(session) {
  return evalPage(session, `(() => ({
    origin: location.origin,
    path: location.pathname,
    query: location.search,
    title: document.title,
    htmlLang: document.documentElement.lang,
    htmlDir: document.documentElement.dir,
    bodyText: document.body.textContent.replace(/\\s+/g, ' ').trim().slice(0, 1200),
    heroAction: Boolean(document.getElementById('heroActionButton')),
    simLoginForm: Boolean(document.getElementById('simLoginForm')),
    simStart: Boolean(document.getElementById('startRequest')),
    simWaiting: new URL(location.href).searchParams.get('stage') === 'waiting',
    simCancel: Boolean(document.getElementById('cancelRequest')),
    simRequestId: new URL(location.href).searchParams.get('requestId'),
    startButton: Boolean(document.getElementById('startNewApplicationBtn')),
    resumeButton: Boolean(document.getElementById('resumeApplicationBtn')),
    applicationVisible: Boolean(document.getElementById('journeyLayout') && !document.getElementById('journeyLayout').hidden),
    createForm: Boolean(document.getElementById('createAccountForm')),
    signInForm: Boolean(document.getElementById('signInForm')),
    caseSelect: Boolean(document.getElementById('caseSelect')),
    heroActionText: document.getElementById('heroActionButton')?.textContent.trim() || '',
    heroDescription: document.getElementById('serviceDescription')?.textContent.trim() || '',
    session: JSON.parse(sessionStorage.getItem('arrearsflow-trustgate-demo-session') || 'null'),
    customerAccounts: localStorage.getItem('arrearsflow-customer-accounts')
  }))()`);
}

async function officeSnapshot(session) {
  return evalPage(session, `(() => {
    function isVisible(element) {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      return element.getClientRects().length > 0;
    }
    return {
      origin: location.origin,
      path: location.pathname,
      authGateVisible: isVisible(document.getElementById('officeAuthGate')),
      officeLoginButton: Boolean(document.getElementById('officeTrustGateLoginBtn')),
      caseQueueVisible: isVisible(document.getElementById('caseQueue')),
      approveButtonVisible: isVisible(document.getElementById('approveBtn')),
      sessionCardText: document.getElementById('officeSessionCard')?.textContent.trim() || '',
      officeSession: JSON.parse(sessionStorage.getItem('arrearsflow-office-trustgate-session') || 'null')
    };
  })()`);
}

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
}

async function loginToSimIfNeeded(session, mobileOrEmail, pin = "1111") {
  const state = await snapshot(session);
  if (state.simStart) {
    await evalPage(session, "document.getElementById('startRequest').click()");
    await waitForCondition(session, "new URL(location.href).searchParams.get('stage') === 'waiting'");
    await waitForCondition(session, "Boolean(document.getElementById('cancelRequest'))");
    return;
  }
  if (!state.simLoginForm) return;
  await evalPage(session, `
    document.querySelector('#simLoginInput').value = ${JSON.stringify(mobileOrEmail)};
    if (document.querySelector('#simPinInput')) document.querySelector('#simPinInput').value = ${JSON.stringify(pin)};
    document.querySelector('#simLoginForm').requestSubmit();
    true;
  `);
  await waitForCondition(session, "new URL(location.href).searchParams.get('stage') === 'waiting'");
  await waitForCondition(session, "Boolean(document.getElementById('cancelRequest'))");
}

async function approveCurrentSimRequest(session) {
  const requestId = await evalPage(session, "new URL(location.href).searchParams.get('requestId')");
  assert(requestId, "TrustGate did not create a request ID.");
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
}

async function main() {
  const launched = await launchChromium();
  const browserPort = new URL(launched.endpoint).port;
  const session = await createPage(browserPort);
  const moeiOrigin = new URL(baseUrl).origin;
  const simOrigin = new URL(simBaseUrl).origin;

  try {
    await navigate(session, "/customer/housing-arrears/");
    const protectedLogin = await snapshot(session);
    assert(protectedLogin.heroAction, "Public service page should show the Start Service action.", protectedLogin);
    assert(!protectedLogin.startButton && !protectedLogin.resumeButton, "Start/resume must not appear before verification.", protectedLogin);
    assert(!protectedLogin.applicationVisible, "Application workspace must stay hidden before verification.", protectedLogin);
    assert(!protectedLogin.createForm && !protectedLogin.signInForm && !protectedLogin.caseSelect, "Old account forms or customer selector are visible.", protectedLogin);

    await evalPage(session, "document.getElementById('heroActionButton').click()");
    await waitForCondition(session, `location.origin === ${JSON.stringify(simOrigin)}`);
    await waitForCondition(session, "Boolean(document.getElementById('simLoginForm')) || Boolean(document.getElementById('startRequest'))");
    const loginScreen = await snapshot(session);
    assert(loginScreen.path === "/" && loginScreen.simLoginForm, "Clicking Start Service should open TrustGate login.", loginScreen);
    assert(loginScreen.htmlLang === "ar" && loginScreen.htmlDir === "rtl", "Arabic customer request should open an Arabic TrustGate authentication page.", loginScreen);
    assert(/المصادقة|طلب مصادقة/.test(loginScreen.bodyText), "Arabic TrustGate authentication copy should be visible.", loginScreen);

    await loginToSimIfNeeded(session, "+971 50 000 2184");
    const provider = await snapshot(session);
    assert(provider.origin === simOrigin && provider.simWaiting, "TrustGate should show the pending number-match screen after identity entry.", provider);
    assert(provider.htmlLang === "ar" && provider.htmlDir === "rtl", "Arabic TrustGate request should keep the number-matching page Arabic.", provider);
    assert(/بانتظار|طلب دخول/.test(provider.bodyText), "Arabic TrustGate number-matching copy should be visible.", provider);
    assert(!provider.applicationVisible && !provider.startButton, "Provider screen must not show service workspace controls.", provider);

    await approveCurrentSimRequest(session);
    await waitForCondition(session, `location.origin === ${JSON.stringify(moeiOrigin)} && location.pathname === '/customer/housing-arrears/'`, 10000);
    const verified = await snapshot(session);
    assert(verified.path === "/customer/housing-arrears/", "Approve should return to the customer service route.", verified);
    assert(!verified.query.includes("auth=") && !verified.query.includes("token="), "Return URL must not contain auth or token query values.", verified);
    assert(verified.startButton, "Verified workspace should show Start New Application.", verified);
    assert(!/Sign In|تسجيل الدخول/.test(verified.heroActionText), "Hero action should not still say sign in after verification.", verified);
    assert(!/Sign in with TrustGate|تسجيل الدخول عبر TrustGate/.test(verified.heroDescription), "Hero description should not still ask for sign-in after verification.", verified);
    assert(verified.session?.issuedAt && verified.session?.expiresAt, "Verified session must include issuedAt and expiresAt.", verified);
    assert(!verified.createForm && !verified.signInForm && !verified.caseSelect, "Old account forms or customer selector are visible after verification.", verified);
    assert(verified.customerAccounts === null, "New flow should not create the old customer account array.", verified);

    await evalPage(session, "document.getElementById('headerAccountButton').click()");
    await delay(500);
    const signedOut = await snapshot(session);
    assert(signedOut.heroAction && !signedOut.startButton && !signedOut.session, "Logout should clear the verified session and return to public service page.", signedOut);

    await evalPage(session, "document.getElementById('heroActionButton').click()");
    await waitForCondition(session, `location.origin === ${JSON.stringify(simOrigin)}`);
    await waitForCondition(session, "Boolean(document.getElementById('simLoginForm')) || Boolean(document.getElementById('startRequest'))");
    await loginToSimIfNeeded(session, "+971 50 000 2184");
    await waitForCondition(session, "Boolean(document.getElementById('cancelRequest'))");
    await evalPage(session, "document.getElementById('cancelRequest').click()");
    await waitForCondition(session, `location.origin === ${JSON.stringify(moeiOrigin)} && location.pathname === '/customer/housing-arrears/'`);
    const cancelled = await snapshot(session);
    assert(cancelled.path === "/customer/housing-arrears/" && cancelled.heroAction && !cancelled.session, "Cancel should return unauthenticated.", cancelled);

    await evalPage(session, "document.getElementById('heroActionButton').click()");
    await waitForCondition(session, `location.origin === ${JSON.stringify(simOrigin)}`);
    await waitForCondition(session, "Boolean(document.getElementById('simLoginForm')) || Boolean(document.getElementById('startRequest'))");
    await loginToSimIfNeeded(session, "+971 50 000 2184");
    await approveCurrentSimRequest(session);
    await waitForCondition(session, `location.origin === ${JSON.stringify(moeiOrigin)} && location.pathname === '/customer/housing-arrears/'`, 10000);
    await evalPage(session, `(() => {
      const session = JSON.parse(sessionStorage.getItem('arrearsflow-trustgate-demo-session') || 'null');
      session.expiresAt = '2020-01-01T00:00:00.000Z';
      sessionStorage.setItem('arrearsflow-trustgate-demo-session', JSON.stringify(session));
      location.reload();
    })()`);
    await delay(900);
    const expired = await snapshot(session);
    assert(expired.heroAction && !expired.startButton && !expired.session, "Expired sessions should return to public service page.", expired);

    await navigate(session, "/office/housing-arrears/", "en");
    const officeLocked = await officeSnapshot(session);
    assert(officeLocked.authGateVisible && officeLocked.officeLoginButton, "Office workspace should require TrustGate login before showing cases.", officeLocked);
    assert(!officeLocked.caseQueueVisible && !officeLocked.officeSession, "Office case queue must not be visible before officer login.", officeLocked);

    await evalPage(session, "document.getElementById('officeTrustGateLoginBtn').click()");
    await waitForCondition(session, `location.origin === ${JSON.stringify(simOrigin)}`);
    await waitForCondition(session, "Boolean(document.getElementById('simLoginForm')) || Boolean(document.getElementById('startRequest'))");
    const officeLogin = await snapshot(session);
    assert(officeLogin.simLoginForm && !officeLogin.simStart, "Office login should open TrustGate identity entry.", officeLogin);
    assert(officeLogin.htmlLang === "en" && officeLogin.htmlDir === "ltr", "English office request should open an English TrustGate authentication page.", officeLogin);
    const officeLoginHasPin = await evalPage(session, "Boolean(document.querySelector('#simPinInput'))");
    assert(!officeLoginHasPin, "External office login request should ask for phone or email only; PIN belongs to TrustGate confirmation.", officeLogin);

    await evalPage(session, `
      document.querySelector('#simLoginInput').value = '+971 50 000 2184';
      document.querySelector('#simLoginForm').requestSubmit();
      true;
    `);
    await delay(300);
    const deniedOfficeLogin = await evalPage(session, "document.getElementById('simLoginError').textContent");
    assert(/office\.login/.test(deniedOfficeLogin), "Customer identity must not be allowed into the office workspace.", { deniedOfficeLogin });

    await evalPage(session, `
      document.querySelector('#simLoginInput').value = '+971 50 000 7190';
      document.querySelector('#simLoginForm').requestSubmit();
      true;
    `);
    await waitForCondition(session, "new URL(location.href).searchParams.get('stage') === 'waiting'");
    await approveCurrentSimRequest(session);
    await waitForCondition(session, `location.origin === ${JSON.stringify(moeiOrigin)} && location.pathname === '/office/housing-arrears/'`, 10000);
    const officeVerified = await officeSnapshot(session);
    assert(!officeVerified.authGateVisible && officeVerified.caseQueueVisible && officeVerified.approveButtonVisible, "Verified officer should see the office dashboard.", officeVerified);
    assert(
      officeVerified.officeSession?.subjectId === "TRUSTGATE-OFFICIAL-7190"
        && officeVerified.officeSession?.privileges?.includes("office.login"),
      "Office session should be created from TrustGate officer login.",
      officeVerified
    );

    console.log("MOEI TrustGate login flow verified");
    console.log(JSON.stringify({
      protectedLogin: {
        path: protectedLogin.path,
        heroAction: protectedLogin.heroAction,
        applicationVisible: protectedLogin.applicationVisible
      },
      loginScreen: {
        path: loginScreen.path,
        simLoginForm: loginScreen.simLoginForm
      },
      provider: {
        origin: provider.origin,
        waitingVisible: provider.simWaiting
      },
      verified: {
        path: verified.path,
        query: verified.query,
        startButton: verified.startButton,
        sessionHasExpiry: Boolean(verified.session?.expiresAt)
      },
      signedOut: {
        heroAction: signedOut.heroAction,
        hasSession: Boolean(signedOut.session)
      },
      cancelled: {
        heroAction: cancelled.heroAction,
        hasSession: Boolean(cancelled.session)
      },
      expired: {
        heroAction: expired.heroAction,
        hasSession: Boolean(expired.session)
      },
      officeLocked: {
        authGateVisible: officeLocked.authGateVisible,
        caseQueueVisible: officeLocked.caseQueueVisible
      },
      officeVerified: {
        path: officeVerified.path,
        caseQueueVisible: officeVerified.caseQueueVisible,
        officer: officeVerified.officeSession?.displayName,
        privileges: officeVerified.officeSession?.privileges
      }
    }, null, 2));
  } finally {
    session.close();
    launched.browser.kill("SIGTERM");
    cleanup(launched.userDataDir);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
