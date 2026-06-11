const { spawn } = require("child_process");
const path = require("path");

const port = Number(process.env.TRUSTGATE_BRIDGE_TEST_PORT || 9845);
const serverPath = path.join(__dirname, "..", "trustgate", "server.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    let stdout = "";
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for TrustGate server.\n${stdout}\n${stderr}`));
    }, 8000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!stdout.includes("TrustGate running")) return;
      clearTimeout(timer);
      resolve();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once("exit", (code) => {
      if (code === null) return;
      clearTimeout(timer);
      reject(new Error(`TrustGate server exited early with ${code}.\n${stdout}\n${stderr}`));
    });
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  let parsed = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    throw new Error(`${url} did not return JSON: ${body.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${body}`);
  }
  return parsed;
}

async function main() {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(child);

    const requestId = "BRIDGE-TEST-REQUEST";
    const created = {
      requestId,
      purpose: "login",
      status: "pending",
      subjectId: "TRUSTGATE-CUSTOMER-0001",
      displayNumber: "42",
      choices: ["42", "17", "88"],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 120000).toISOString()
    };

    await fetchJson(`http://127.0.0.1:${port}/api/requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(created)
    });

    const fromLocalhost = await fetchJson(`http://localhost:${port}/api/requests/${requestId}`);
    assert(fromLocalhost.status === "pending", "Request created through 127.0.0.1 was not visible through localhost.");
    assert(fromLocalhost.displayNumber === "42", "Request number did not survive bridge round trip.");

    const approved = {
      ...fromLocalhost,
      status: "approved",
      selectedNumber: "42",
      approvedAt: new Date().toISOString()
    };
    await fetchJson(`http://localhost:${port}/api/requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approved)
    });

    const fromLoopback = await fetchJson(`http://127.0.0.1:${port}/api/requests/${requestId}`);
    assert(fromLoopback.status === "approved", "Request update through localhost was not visible through 127.0.0.1.");
    assert(fromLoopback.selectedNumber === "42", "Selected number did not survive bridge update.");

    const allRequests = await fetchJson(`http://localhost:${port}/api/requests`);
    assert(allRequests[requestId]?.status === "approved", "Request list did not include approved bridge request.");

    console.log("TrustGate live request bridge verified");
    console.log(JSON.stringify({
      port,
      requestId,
      status: fromLoopback.status,
      choices: fromLoopback.choices
    }, null, 2));
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
