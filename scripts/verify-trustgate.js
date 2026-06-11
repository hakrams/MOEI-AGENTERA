const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const moeiBaseUrl = process.env.MOEI_BASE_URL || "http://127.0.0.1:9710";
const simBaseUrl = process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715/";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    const userDataDir = path.join(os.tmpdir(), `trustgate-${Date.now()}-${process.pid}`);
    const debugPort = 9300 + Math.floor(Math.random() * 500);
    const browser = spawn("chromium", [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${debugPort}`,
      "about:blank"
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    const timeout = setTimeout(() => {
      browser.kill("SIGTERM");
      cleanup(userDataDir);
      reject(new Error(`Timed out waiting for Chromium DevTools endpoint.\n${stderr}`));
    }, 30000);

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

async function createPage(browserPort, viewport = { width: 1440, height: 1050, mobile: false }) {
  const response = await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chromium target: ${response.status}`);
  const target = await response.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  });
  return session;
}

async function navigate(session, url) {
  const loaded = new Promise((resolve) => {
    const listener = () => {
      const listeners = session.listeners.get("Page.loadEventFired") || [];
      session.listeners.set("Page.loadEventFired", listeners.filter((item) => item !== listener));
      resolve();
    };
    session.listeners.set("Page.loadEventFired", [...(session.listeners.get("Page.loadEventFired") || []), listener]);
  });
  await session.send("Page.navigate", { url });
  await loaded;
}

async function evalValue(session, expression) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result.value;
}

async function waitFor(session, expression, timeoutMs = 7000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await evalValue(session, expression);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function screenshot(session, filePath) {
  if (!filePath) return;
  const shot = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
}

function browserPort(endpoint) {
  const match = endpoint.match(/127\.0\.0\.1:(\d+)/);
  if (!match) throw new Error(`Could not parse Chromium port from ${endpoint}`);
  return match[1];
}

function decodeResultPayload(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

async function main() {
  const launch = await launchChromium();
  const port = browserPort(launch.endpoint);
  const web = await createPage(port);
  const phone = await createPage(port, { width: 430, height: 820, mobile: true });

  try {
    await navigate(web, simBaseUrl);
    await waitFor(web, "Boolean(document.querySelector('#simLoginForm')) && document.body.textContent.includes('Login to TrustGate')");
    const loginText = await evalValue(web, "document.body.textContent");
    assert(loginText.includes("demo trust layer") && loginText.includes("Demo only. Not connected to any official national identity provider"), "Standalone TrustGate login should disclose demo status");
    assert(!loginText.includes("Accounts on this simulator"), "Standalone TrustGate login should not show account picker rows");
    await screenshot(web, process.env.MOEI_TRUSTGATE_SIM_LOGIN_SCREENSHOT);

    await evalValue(web, `
      document.querySelector('#simLoginInput').value = '+971 50 000 2184';
      document.querySelector('#simPinInput').value = '1111';
      document.querySelector('#simLoginForm').requestSubmit();
      true;
    `);
    await waitFor(web, "Boolean(document.querySelector('.tg-dashboard')) && document.body.textContent.includes('Identity command center')");
    const portalText = await evalValue(web, "document.body.textContent");
    assert(!portalText.includes("Sign with TrustGate"), "Standalone TrustGate portal should not ask users to sign with TrustGate");
    assert(!portalText.includes("Ministry of Energy"), "Standalone TrustGate portal should not show MOEI ministry branding");
    assert(portalText.includes("Wallet") && portalText.includes("Audit") && portalText.includes("Profile"), "Standalone TrustGate portal should look like the TrustGate app shell");
    await screenshot(web, process.env.MOEI_TRUSTGATE_SIM_PORTAL_SCREENSHOT);

    const accountUrl = new URL("account/", simBaseUrl);
    await navigate(web, accountUrl.toString());
    await waitFor(web, "Boolean(document.querySelector('#logoutButton'))");
    const profileText = await evalValue(web, "document.body.textContent");
    assert(profileText.includes("Registered device"), "Account screen should show registered device detail");
    assert(profileText.includes("Signature"), "Account screen should show signature detail");
    const profileHasPinChange = await evalValue(web, `
      Boolean(document.querySelector('#openPinChangeDialog')) &&
      Boolean(document.querySelector('#pinChangeModal[hidden]')) &&
      Boolean(document.querySelector('#pinChangeForm'))
    `);
    assert(profileHasPinChange, "Account screen should include a compact PIN action and hidden PIN-change modal");
    assert(!profileText.includes("Use this account"), "Account screen should not expose an account picker");
    assert(!profileText.includes("Add TrustGate account") && !profileText.includes("Add TrustGate account"), "Account screen should not create accounts from UI");
    await screenshot(web, process.env.MOEI_TRUSTGATE_SIM_ACCOUNT_SCREENSHOT);

    const approvalUrl = new URL("", simBaseUrl);
    approvalUrl.searchParams.set("client", "moei");
    approvalUrl.searchParams.set("purpose", "approval");
    approvalUrl.searchParams.set("service", "housing-arrears");
    approvalUrl.searchParams.set("caseId", "MOEI-2026-00129");
    approvalUrl.searchParams.set("action", "Approve and apply digital seal");
    approvalUrl.searchParams.set("returnUrl", new URL("/office/housing-arrears/", moeiBaseUrl).toString());

    await navigate(web, approvalUrl.toString());
    await waitFor(web, "Boolean(document.querySelector('#simLoginForm'))");
    const approvalLoginHasPin = await evalValue(web, "Boolean(document.querySelector('#simPinInput'))");
    assert(!approvalLoginHasPin, "Incoming TrustGate approval page should ask for identity only; PIN belongs on the phone/app side");
    await evalValue(web, `
      document.querySelector('#simLoginInput').value = '+971 50 000 7190';
      document.querySelector('#simLoginForm').requestSubmit();
      true;
    `);
    await waitFor(web, "new URL(location.href).searchParams.get('stage') === 'waiting'");
    await screenshot(web, process.env.MOEI_TRUSTGATE_SIM_WEB_START_SCREENSHOT);
    const requestId = await evalValue(web, "new URL(location.href).searchParams.get('requestId')");
    assert(requestId, "Request ID was not created");
    await screenshot(web, process.env.MOEI_TRUSTGATE_SIM_WAITING_SCREENSHOT);

    const phoneUrl = new URL("phone/", simBaseUrl);
    phoneUrl.searchParams.set("requestId", requestId);
    await navigate(phone, phoneUrl.toString());
    await waitFor(phone, "document.querySelectorAll('.choice-button').length === 3");
    await screenshot(phone, process.env.MOEI_TRUSTGATE_SIM_PHONE_SCREENSHOT);

    const displayNumber = await evalValue(phone, `
      JSON.parse(localStorage.getItem('trustgate.requests.v1'))['${requestId}'].displayNumber
    `);
    await evalValue(phone, `
      document.querySelector('.choice-button[data-choice="${displayNumber}"]').click();
      true;
    `);
    await waitFor(phone, "Boolean(document.querySelector('#phonePinInput')) && document.body.textContent.includes('Confirm with PIN')");
    await evalValue(phone, `
      document.querySelector('#phonePinInput').value = '3333';
      document.querySelector('#phonePinForm').requestSubmit();
      true;
    `);
    await waitFor(phone, "document.body.textContent.includes('Approved')");
    await waitFor(web, `
      location.origin === '${new URL(moeiBaseUrl).origin}' &&
      location.pathname === '/office/housing-arrears/' &&
      location.search.includes('trustGateStatus=approved') &&
      location.search.includes('trustGateResult=')
    `, 10000);
    const resultPayload = await evalValue(web, "new URL(location.href).searchParams.get('trustGateResult')");
    const decodedResult = decodeResultPayload(resultPayload);

    const approvedRequest = await evalValue(phone, `
      JSON.parse(localStorage.getItem('trustgate.requests.v1'))['${requestId}']
    `);
    const audit = await evalValue(phone, "JSON.parse(localStorage.getItem('trustgate.audit.v1') || '[]')");

    assert(approvedRequest.status === "approved", "Request status should be approved");
    assert(approvedRequest.purpose === "approval", "Request purpose should be approval");
    assert(approvedRequest.caseId === "MOEI-2026-00129", "Approval case ID should survive the handshake");
    assert(approvedRequest.action === "Approve and apply digital seal", "Approval action should survive the handshake");
    assert(approvedRequest.officialName === "Mariam Al Ketbi", "Approval should use the created TrustGate official account");
    assert(approvedRequest.registeredDevice?.trusted === true, "Approval should include the registered trusted device");
    assert(approvedRequest.signature?.signingPermission === "Enabled", "Approval should include enabled signing permission");
    assert(Boolean(approvedRequest.pinVerifiedAt), "Approval request should include final PIN verification time");
    assert(decodedResult.resultVersion === "trustgate-result.v1", "Callback payload should include result version");
    assert(decodedResult.assuranceLevel === "simulated_number_match_and_pin", "Callback payload should use PIN-backed number matching");
    assert(Boolean(decodedResult.pinVerifiedAt), "Callback payload should include PIN verification time");
    assert(decodedResult.approval.officialName === "Mariam Al Ketbi", "Callback payload should include official name");
    assert(decodedResult.approval.payloadHash === approvedRequest.payloadHash, "Callback payload should include matching payload hash");
    assert(audit.some((event) => event.action === "account_identifier_submitted_request_created"), "Audit should include identity request creation");
    assert(audit.some((event) => event.action === "approval_number_matched" && event.requestId === requestId), "Audit should include approval number match");
    assert(audit.some((event) => event.auditType === "handshake" && event.action === "approval_handshake_approved" && event.requestId === requestId), "Audit should include approved approval handshake");

    console.log("TrustGate handshake verified");
    console.log(JSON.stringify({
      requestId,
      simBaseUrl,
      finalPath: await evalValue(web, "location.pathname + location.search"),
      resultStatus: approvedRequest.status,
      purpose: approvedRequest.purpose,
      caseId: approvedRequest.caseId,
      officialName: approvedRequest.officialName
    }, null, 2));
  } finally {
    web.close();
    phone.close();
    launch.browser.kill("SIGTERM");
    cleanup(launch.userDataDir);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
