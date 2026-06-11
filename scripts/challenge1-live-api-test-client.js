const http = require("http");
const { spawn } = require("child_process");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(port, method, pathname, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: pathname,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers
      }
    }, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        let json = null;
        try {
          json = responseBody ? JSON.parse(responseBody) : null;
        } catch (error) {
          reject(new Error(`Invalid JSON from ${method} ${pathname}: ${error.message}`));
          return;
        }
        resolve({ statusCode: res.statusCode, body: json });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForHealth(port) {
  let lastError = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await requestJson(port, "GET", "/api/challenge-1/health");
      if (response.statusCode === 200 && response.body?.status === "ok") return response.body;
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }
  throw lastError || new Error("Challenge 1 live API did not become healthy");
}

async function withServer(port, run) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      ALLOW_TEST_RESET: "true"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForHealth(port);
    return await run();
  } finally {
    child.kill("SIGTERM");
    await wait(150);
    if (!child.killed && child.exitCode === null) child.kill("SIGKILL");
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

module.exports = {
  assert,
  requestJson,
  withServer
};
