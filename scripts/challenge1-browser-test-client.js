const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 1000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort.
  }
}

function executableExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
}

function browserCandidates() {
  const envCandidate = process.env.CHALLENGE1_BROWSER_BIN || process.env.CHROME_BIN || "";
  return [
    envCandidate,
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "chromium"
  ].filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
}

function launchBrowserCandidate(browserBin, remoteDebuggingPort) {
  return new Promise((resolve, reject) => {
    const userDataDir = path.join(os.tmpdir(), `moei-c1-browser-${Date.now()}-${process.pid}`);
    const browser = spawn(browserBin, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${remoteDebuggingPort}`,
      "about:blank"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    let stdout = "";
    let settled = false;

    async function pollVersion() {
      const started = Date.now();
      while (!settled && Date.now() - started < 15000) {
        try {
          const response = await fetchWithTimeout(`http://127.0.0.1:${remoteDebuggingPort}/json/version`, {}, 750);
          if (response.ok) {
            const version = await response.json();
            settled = true;
            resolve({ browser, endpoint: version.webSocketDebuggerUrl, userDataDir, remoteDebuggingPort, browserBin });
            return;
          }
        } catch {
          // Keep polling until Chromium opens the debugging port.
        }
        await delay(150);
      }
      if (!settled) {
        settled = true;
        browser.kill("SIGTERM");
        cleanup(userDataDir);
        reject(new Error(`Timed out waiting for DevTools endpoint from ${browserBin} on ${remoteDebuggingPort}.\nstdout:\n${stdout}\nstderr:\n${stderr}`));
      }
    }

    browser.once("error", (error) => {
      settled = true;
      cleanup(userDataDir);
      reject(error);
    });

    browser.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    browser.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    pollVersion();
  });
}

async function launchChromium() {
  const remoteDebuggingPort = Number(process.env.CHROMIUM_DEBUG_PORT || (19777 + Math.floor(Math.random() * 1000)));
  const errors = [];

  for (const candidate of browserCandidates()) {
    if (candidate.startsWith("/") && !executableExists(candidate)) continue;
    try {
      return await launchBrowserCandidate(candidate, remoteDebuggingPort);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Could not launch a usable headless Chromium browser.\n${errors.join("\n\n")}`);
}

function closeBrowser(launched) {
  if (!launched) return;
  try {
    launched.browser.kill("SIGTERM");
  } catch {
    // Best effort.
  }
  cleanup(launched.userDataDir);
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
      const { resolve, reject, timeout } = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(timeout);
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
      else resolve(message.result || {});
      return;
    }
    if (message.method && this.listeners.has(message.method)) {
      for (const listener of this.listeners.get(message.method)) listener(message.params || {});
    }
  }

  send(method, params = {}, timeoutMs = 15000) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for CDP command ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // Best effort.
    }
  }
}

async function createPage(browserPort, viewport = {}) {
  const response = await fetchWithTimeout(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: "PUT" }, 5000);
  if (!response.ok) throw new Error(`Could not create Chromium target: ${response.status}`);
  const target = await response.json();
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.open();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width || 1440,
    height: viewport.height || 1200,
    deviceScaleFactor: viewport.deviceScaleFactor || 1,
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
    throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  }
  return result.result.value;
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
  await delay(500);
}

async function waitForCondition(session, expression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evalPage(session, expression)) return;
    await delay(150);
  }
  throw new Error(`Timed out waiting for condition: ${expression}`);
}

async function capturePng(session, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const result = await session.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
}

module.exports = {
  capturePng,
  closeBrowser,
  createPage,
  delay,
  evalPage,
  launchChromium,
  navigate,
  waitForCondition
};
