const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const baseUrl = process.env.MOEI_BASE_URL || "http://127.0.0.1:9710";
const trustGateBaseUrl = process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715/";
const outputDir = process.env.MOEI_AUDIT_SCREENSHOT_DIR
  || path.resolve(__dirname, "..", "planning", "01-references", "challenge-1-audit-2026-06-05");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanUserDataDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup.
  }
}

function launchChromium() {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(os.tmpdir(), `moei-challenge1-audit-${Date.now()}-${process.pid}`);
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
      cleanUserDataDir(userDataDir);
      reject(new Error(`Timed out waiting for Chromium DevTools endpoint.\n${stderr}`));
    }, 30000);

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
      // Best effort close.
    }
  }
}

async function createPage(browserPort, viewport) {
  const response = await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chromium target: ${response.status}`);
  const target = await response.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  session.viewport = viewport;
  await session.open();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: Boolean(viewport.mobile)
  });
  return session;
}

async function evalPage(session, expression) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result.value;
}

async function waitForCondition(session, expression, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evalPage(session, expression)) return true;
    await delay(120);
  }
  throw new Error(`Timed out waiting for condition: ${expression}`);
}

async function navigate(session, routePath, lang = "ar", root = baseUrl) {
  const url = new URL(routePath, root);
  if (root === baseUrl) url.searchParams.set("lang", lang);
  const loaded = session.waitFor("Page.loadEventFired").catch((error) => error);
  await session.send("Page.navigate", { url: url.toString() });
  const loadResult = await loaded;
  if (loadResult instanceof Error) {
    await delay(600);
    const readyState = await evalPage(session, "document.readyState");
    if (readyState !== "complete") throw loadResult;
  }
  await delay(700);
}

async function screenshot(session, name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await evalPage(session, "window.scrollTo(0, 0); true;").catch(() => true);
  await delay(120);
  const width = Math.max(1, Number(session.viewport?.width || 0));
  const height = Math.max(1, Number(session.viewport?.height || 0));
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    clip: { x: 0, y: 0, width, height, scale: 1 }
  });
  fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
  return filePath;
}

async function auditPage(session, name) {
  return evalPage(session, `(() => {
    function visible(element) {
      if (!element) return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.getClientRects().length > 0;
    }
    const overflow = Array.from(document.querySelectorAll('body *'))
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          id: element.id || '',
          className: typeof element.className === 'string' ? element.className : '',
          text: (element.innerText || element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          rectWidth: Math.round(rect.width)
        };
      })
      .filter((item) => item.scrollWidth > item.clientWidth + 4 && item.clientWidth > 0)
      .slice(0, 30);
    const text = document.body.innerText.replace(/\\s+/g, ' ').trim();
    const internalSignals = ['aiFinalApproval', 'RULE-', 'Payload hash', 'worker', 'undefined', 'NaN']
      .filter((signal) => text.includes(signal));
    return {
      name: ${JSON.stringify(name)},
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      path: location.pathname,
      textLength: text.length,
      internalSignals,
      overflow
    };
  })()`);
}

async function captureAndAudit(session, name) {
  const filePath = await screenshot(session, name);
  const audit = await auditPage(session, name);
  return { ...audit, filePath };
}

async function completeCustomerTrustGate(session) {
  const moeiOrigin = new URL(baseUrl).origin;
  const trustGateOrigin = new URL(trustGateBaseUrl).origin;
  const trustGateResults = [];
  await evalPage(session, "document.getElementById('heroActionButton').click()");
  await waitForCondition(session, `location.origin === ${JSON.stringify(trustGateOrigin)}`);
  await waitForCondition(session, "Boolean(document.getElementById('simLoginForm')) || Boolean(document.getElementById('startRequest'))");
  trustGateResults.push(await captureAndAudit(session, "02-trustgate-customer-login"));
  await evalPage(session, `
    if (document.querySelector('#simLoginForm')) {
      document.querySelector('#simLoginInput').value = '+971 50 000 2184';
      if (document.querySelector('#simPinInput')) document.querySelector('#simPinInput').value = '1111';
      document.querySelector('#simLoginForm').requestSubmit();
    } else {
      document.getElementById('startRequest').click();
    }
    true;
  `);
  await waitForCondition(session, "new URL(location.href).searchParams.get('stage') === 'waiting'");
  trustGateResults.push(await captureAndAudit(session, "03-trustgate-customer-waiting"));
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
  await delay(500);
  return trustGateResults;
}

async function fillCustomerCorrectionPath(session) {
  await evalPage(session, "document.getElementById('startNewApplicationBtn')?.click()");
  await delay(400);
  await evalPage(session, `(() => {
    document.getElementById('currentSalary').value = '18000';
    document.getElementById('remarks').value = 'طلب إعادة جدولة المتأخرات حسب الحالة المالية الحالية.';
    const acknowledgement = document.getElementById('acknowledgement');
    acknowledgement.checked = true;
    acknowledgement.dispatchEvent(new Event('change', { bubbles: true }));
    const input = document.getElementById('incomeDocumentFile');
    const file = new File(['salary certificate without stamp'], 'salary-certificate-no-stamp.pdf', { type: 'application/pdf' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await delay(700);
}

async function submitCustomerCleanPath(session) {
  await evalPage(session, `(() => {
    const input = document.getElementById('incomeDocumentFile');
    const file = new File(['salary certificate with digital stamp'], 'salary-certificate-digital-stamp.pdf', { type: 'application/pdf' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await delay(500);
  await evalPage(session, "document.querySelector('#customerForm button[type=\"submit\"]').click()");
  await delay(900);
}

async function injectOfficeSession(session) {
  await evalPage(session, `
    sessionStorage.setItem('arrearsflow-office-trustgate-session', JSON.stringify({
      sessionVersion: 'moei-office-session.v1',
      subjectId: 'TRUSTGATE-OFFICIAL-7190',
      displayName: 'Mariam Al Ketbi',
      emiratesId: '+971 50 000 7190',
      role: 'Finance Collection Officer / Approver',
      roleAr: 'مسؤولة التحصيل المالي والاعتماد',
      groups: ['officer', 'seal-approver'],
      privileges: ['office.login', 'approval.authorize', 'seal.stamp'],
      trustGateRequestId: 'AUDIT-OFFICE-LOGIN',
      loggedInAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
    }));
    true;
  `);
}

async function selectOfficeCase(session, caseId) {
  await waitForCondition(session, "Boolean(document.getElementById('caseSelect')) && !document.body.classList.contains('office-auth-locked')", 10000);
  await evalPage(session, `
    (() => {
      const select = document.getElementById('caseSelect');
      if (!select) throw new Error('Office case selector is not available');
      select.value = ${JSON.stringify(caseId)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);
  await delay(700);
  await evalPage(session, "document.querySelector('[data-screen=\"officer\"]').click()");
  await delay(300);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const launched = await launchChromium();
  const browserPort = new URL(launched.endpoint).port;
  const desktop = await createPage(browserPort, { width: 1440, height: 1300 });
  const mobile = await createPage(browserPort, { width: 430, height: 920, mobile: true });
  const results = [];

  try {
    await navigate(desktop, "/customer/housing-arrears/", "ar");
    results.push(await captureAndAudit(desktop, "01-customer-public-service-ar"));
    results.push(...await completeCustomerTrustGate(desktop));
    await fillCustomerCorrectionPath(desktop);
    results.push(await captureAndAudit(desktop, "04-customer-correction-blocked"));
    await submitCustomerCleanPath(desktop);
    results.push(await captureAndAudit(desktop, "05-customer-submitted-assessment"));

    await navigate(desktop, "/office/housing-arrears/", "ar");
    results.push(await captureAndAudit(desktop, "06-office-auth-gate"));
    await injectOfficeSession(desktop);
    await navigate(desktop, "/office/housing-arrears/", "ar");
    await selectOfficeCase(desktop, "MOEI-HOUSING-2026-001");
    results.push(await captureAndAudit(desktop, "07-office-case-a-ready"));
    await selectOfficeCase(desktop, "MOEI-HOUSING-2026-002");
    results.push(await captureAndAudit(desktop, "08-office-case-b-documents"));
    await selectOfficeCase(desktop, "MOEI-HOUSING-2026-003");
    results.push(await captureAndAudit(desktop, "09-office-case-c-human-review"));

    const approvalUrl = new URL("/", trustGateBaseUrl);
    approvalUrl.searchParams.set("client", "moei");
    approvalUrl.searchParams.set("purpose", "approval");
    approvalUrl.searchParams.set("service", "housing-arrears");
    approvalUrl.searchParams.set("caseId", "MOEI-HOUSING-2026-001");
    approvalUrl.searchParams.set("action", "Approve housing arrears rescheduling recommendation");
    approvalUrl.searchParams.set("officialSubjectId", "TRUSTGATE-OFFICIAL-7190");
    approvalUrl.searchParams.set("officialName", "Mariam Al Ketbi");
    approvalUrl.searchParams.set("officialRole", "Finance Collection Officer / Approver");
    approvalUrl.searchParams.set("requiredPrivilege", "seal.stamp");
    approvalUrl.searchParams.set("payloadHash", "demo-payload-hash-001");
    approvalUrl.searchParams.set("relyingRequestId", "MOEI-SEAL-AUDIT-001");
    approvalUrl.searchParams.set("returnUrl", new URL("/office/housing-arrears/", baseUrl).toString());
    await navigate(desktop, approvalUrl.toString(), "ar", trustGateBaseUrl);
    results.push(await captureAndAudit(desktop, "10-trustgate-approval-handoff"));

    await navigate(mobile, "/customer/housing-arrears/", "ar");
    results.push(await captureAndAudit(mobile, "11-mobile-customer-public-ar"));

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      trustGateBaseUrl,
      outputDir,
      results
    };
    fs.writeFileSync(path.join(outputDir, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log("Challenge 1 audit screenshots captured");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    desktop.close();
    mobile.close();
    launched.browser.kill("SIGTERM");
    cleanUserDataDir(launched.userDataDir);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
