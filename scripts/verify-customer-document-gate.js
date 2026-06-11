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
    const userDataDir = path.join(os.tmpdir(), `moei-doc-gate-${Date.now()}-${process.pid}`);
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

  waitFor(method, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        remove();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const listener = (params) => {
        remove();
        resolve(params);
      };
      const remove = () => {
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

async function createPage(browserPort) {
  const response = await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chromium target: ${response.status}`);
  const target = await response.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: Number(process.env.MOEI_VIEWPORT_WIDTH || 1440),
    height: Number(process.env.MOEI_VIEWPORT_HEIGHT || 1300),
    deviceScaleFactor: 1,
    mobile: process.env.MOEI_VIEWPORT_MOBILE === "1"
  });
  return session;
}

async function navigate(session, routePath) {
  const url = new URL(routePath, baseUrl);
  url.searchParams.set("lang", "ar");
  const loaded = session.waitFor("Page.loadEventFired").catch((error) => error);
  await session.send("Page.navigate", { url: url.toString() });
  const loadResult = await loaded;
  if (loadResult instanceof Error) {
    await delay(500);
    const readyState = await evalPage(session, "document.readyState");
    if (readyState !== "complete") throw loadResult;
  }
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

async function captureScreenshot(session, filePath) {
  if (!filePath) return;
  const result = await session.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
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
    throw new Error(`Expected TrustGate login or request page, got ${JSON.stringify(loginState)}`);
  }
  await captureScreenshot(session, process.env.MOEI_LOGIN_SCREENSHOT_PATH);
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
  await captureScreenshot(session, process.env.MOEI_TRUSTGATE_SCREENSHOT_PATH);
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
  const customerState = await evalPage(session, `(() => ({
    path: location.pathname,
    query: location.search,
    hasStart: Boolean(document.getElementById('startNewApplicationBtn')),
    hasAccountForm: Boolean(document.getElementById('createAccountForm')),
    session: JSON.parse(sessionStorage.getItem('arrearsflow-trustgate-demo-session') || 'null')
  }))()`);
  if (
    customerState.path !== "/customer/housing-arrears/"
    || customerState.query.includes("auth=")
    || !customerState.hasStart
    || customerState.hasAccountForm
    || !customerState.session?.expiresAt
  ) {
    throw new Error(`TrustGate sign-in did not return a clean verified workspace: ${JSON.stringify(customerState)}`);
  }
  return customerState;
}

async function main() {
  const launched = await launchChromium();
  const browserPort = new URL(launched.endpoint).port;
  const session = await createPage(browserPort);

  try {
    await navigate(session, "/customer/housing-arrears/");
    await captureScreenshot(session, process.env.MOEI_ACCOUNT_SCREENSHOT_PATH);
    const signInState = await completeTrustGateSignIn(session);
    await evalPage(session, "document.getElementById('startNewApplicationBtn').click()");
    await delay(300);

    await evalPage(session, "document.querySelector('#customerForm button[type=\"submit\"]').click()");
    await delay(500);
    const failedGate = await evalPage(session, `(() => {
      const submissions = JSON.parse(localStorage.getItem('arrearsflow-submissions') || '[]');
      return {
        submissionCount: submissions.length,
        correctionVisible: !document.getElementById('correctionNotice').hidden,
        correctionText: document.getElementById('correctionNotice').textContent,
        officeVisibleStatus: submissions[0]?.status || null
      };
    })()`);

    if (failedGate.submissionCount !== 0 || !failedGate.correctionVisible) {
      throw new Error(`Incomplete request reached storage or no correction appeared: ${JSON.stringify(failedGate)}`);
    }

    await evalPage(session, `(() => {
      document.getElementById('currentSalary').value = '18000';
      document.getElementById('remarks').value = 'طلب إعادة جدولة المتأخرات حسب الحالة المالية الحالية.';
      const input = document.getElementById('incomeDocumentFile');
      const file = new File(['salary certificate without stamp'], 'salary-certificate-no-stamp.pdf', { type: 'application/pdf' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const acknowledgement = document.getElementById('acknowledgement');
      acknowledgement.checked = true;
      acknowledgement.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await delay(300);
    const firstUploadThread = await evalPage(session, `(() => {
      const submissions = JSON.parse(localStorage.getItem('arrearsflow-submissions') || '[]');
      const draft = submissions[0] || {};
      const thread = draft.documentThreads?.income_proof || {};
      return {
        submissionCount: submissions.length,
        status: draft.status || null,
        latestStatus: draft.documentUploads?.income_proof?.status || null,
        threadContract: thread.contractVersion || null,
        attemptCount: thread.attempts?.length || 0,
        latestAttemptStatus: thread.attempts?.[thread.attempts.length - 1]?.status || null,
        correctionVisible: !document.getElementById('correctionNotice').hidden,
        correctionText: document.getElementById('correctionNotice').textContent,
        statusText: document.getElementById('statusCard').textContent,
        confirmationText: document.getElementById('confirmationCard').textContent
      };
    })()`);

    if (
      firstUploadThread.submissionCount !== 1
      || firstUploadThread.status !== "draft"
      || firstUploadThread.latestStatus !== "needs_stamp"
      || firstUploadThread.threadContract !== "document-thread.v1"
      || firstUploadThread.attemptCount !== 1
      || firstUploadThread.latestAttemptStatus !== "needs_stamp"
      || !firstUploadThread.correctionVisible
      || !firstUploadThread.correctionText.includes("ختم")
      || firstUploadThread.correctionText.includes("فعّل الإقرار")
      || firstUploadThread.statusText.includes("تمت مشاركة الطلب")
      || firstUploadThread.confirmationText.includes("مساحة عمل الموظف")
    ) {
      throw new Error(`First upload was not persisted as a correction thread: ${JSON.stringify(firstUploadThread)}`);
    }
    await captureScreenshot(session, process.env.MOEI_CORRECTION_SCREENSHOT_PATH);

    await evalPage(session, `(() => {
      const input = document.getElementById('incomeDocumentFile');
      const file = new File(['salary certificate with digital stamp'], 'salary-certificate-digital-stamp.pdf', { type: 'application/pdf' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await delay(300);
    await evalPage(session, `(() => {
      const toast = document.getElementById('toast');
      if (toast) toast.hidden = true;
    })()`);
    await captureScreenshot(session, process.env.MOEI_SCREENSHOT_PATH);
    await evalPage(session, `document.querySelector('#customerForm button[type="submit"]').click()`);
    await delay(600);

    const passedGate = await evalPage(session, `(() => {
      const submissions = JSON.parse(localStorage.getItem('arrearsflow-submissions') || '[]');
      return {
        id: submissions[0]?.id || null,
        submissionCount: submissions.length,
        status: submissions[0]?.status || null,
        gateReady: submissions[0]?.customerDocumentGate?.ready || false,
        docs: submissions[0]?.customerDocumentGate?.documents?.map((doc) => ({ key: doc.key, status: doc.status })) || [],
        uploadFile: submissions[0]?.documentUploads?.income_proof?.file?.name || null,
        recognitionContract: submissions[0]?.documentUploads?.income_proof?.recognition?.contractVersion || null,
        threadContract: submissions[0]?.documentThreads?.income_proof?.contractVersion || null,
        attemptCount: submissions[0]?.documentThreads?.income_proof?.attempts?.length || 0,
        attemptStatuses: submissions[0]?.documentThreads?.income_proof?.attempts?.map((attempt) => attempt.status) || []
      };
    })()`);

    if (passedGate.submissionCount !== 1 || passedGate.status !== "system_review" || !passedGate.gateReady) {
      throw new Error(`Completed request did not pass the customer gate: ${JSON.stringify(passedGate)}`);
    }
    if (passedGate.uploadFile !== "salary-certificate-digital-stamp.pdf" || passedGate.recognitionContract !== "document-recognition-result.v1") {
      throw new Error(`Document recognition result was not stored with the submission: ${JSON.stringify(passedGate)}`);
    }
    if (
      passedGate.threadContract !== "document-thread.v1"
      || passedGate.attemptCount !== 2
      || passedGate.attemptStatuses[0] !== "needs_stamp"
      || passedGate.attemptStatuses[1] !== "passed"
    ) {
      throw new Error(`Document thread history was not preserved through submission: ${JSON.stringify(passedGate)}`);
    }

    await navigate(session, "/office/housing-arrears/");
    const officeReloaded = session.waitFor("Page.loadEventFired");
    await evalPage(session, `
      sessionStorage.setItem('arrearsflow-office-trustgate-session', JSON.stringify({
        sessionVersion: 'moei-office-session.v1',
        subjectId: 'TRUSTGATE-OFFICIAL-7190',
        displayName: 'Mariam Al Ketbi',
        emiratesId: '+971 50 000 7190',
        role: 'Finance Collection Officer / Approver',
        groups: ['officer', 'seal-approver'],
        privileges: ['office.login', 'approval.authorize', 'seal.stamp'],
        trustGateRequestId: 'VERIFY-OFFICE-LOGIN',
        loggedInAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
      }));
      location.reload();
      true;
    `);
    await officeReloaded;
    await delay(500);
    const officeQueue = await evalPage(session, `(() => ({
      hasCustomerCase: document.getElementById('caseQueue').textContent.includes(${JSON.stringify(passedGate.id)}),
      queueText: document.getElementById('caseQueue').textContent
    }))()`);

    if (!officeQueue.hasCustomerCase) {
      throw new Error(`Completed customer case did not appear in office queue: ${JSON.stringify(officeQueue)}`);
    }

    console.log("MOEI customer document gate verified");
    console.log(JSON.stringify({ signInState, failedGate, firstUploadThread, passedGate, officeQueueVisible: officeQueue.hasCustomerCase }, null, 2));
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
