const assert = require("assert/strict");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const serverPath = path.join(__dirname, "..", "trustgate", "server.js");
const port = Number(process.env.TRUSTGATE_PRODUCTION_PASSWORD_TEST_PORT || 9785);
const baseUrl = `http://127.0.0.1:${port}`;
const adminUsername = "security-admin";
const adminPassword = `TrustGate-${Date.now()}-${process.pid}`;

function request(route, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${route}`);
    const body = options.body || "";
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: options.method || "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        text += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          text,
          async json() {
            return JSON.parse(text || "{}");
          }
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for TrustGate production-password test server${stderr ? `\n${stderr}` : ""}`));
    }, 8000);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes(`127.0.0.1:${port}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`TrustGate test server exited early with code ${code}${stderr ? `\n${stderr}` : ""}`));
    });
  });
}

async function main() {
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      TRUSTGATE_PUBLIC_MODE: "true",
      TRUSTGATE_ALLOW_FILE_ADMINS: "false",
      TRUSTGATE_ADMIN_USERNAME: adminUsername,
      TRUSTGATE_ADMIN_EMAIL: "security.admin@trustgate.local",
      TRUSTGATE_ADMIN_DISPLAY_NAME: "TrustGate Security Admin",
      TRUSTGATE_ADMIN_PASSWORD: adminPassword,
      TRUSTGATE_MOEI_ALLOWED_ORIGINS: "https://moei.sahlabs.me"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForServer(child);

    const demoRootLogin = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ loginId: "root-admin", password: "9009" })
    });
    assert.equal(demoRootLogin.status, 403, "Production mode must reject demo root-admin / 9009");

    const wrongPassword = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ loginId: adminUsername, password: "wrong-password" })
    });
    assert.equal(wrongPassword.status, 403, "Production mode must reject wrong environment admin password");

    const login = await request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ loginId: adminUsername, password: adminPassword })
    });
    assert.equal(login.status, 200, "Production mode must accept environment admin password");
    const session = await login.json();
    assert.ok(session.token, "Environment admin login must return a bearer token");
    assert.equal(session.admin?.credentialSource, "environment", "Admin session must identify environment credential source");

    const accounts = await request("/api/accounts", {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    assert.equal(accounts.status, 200, "Environment admin bearer token must read accounts");

    const publicAccountsFile = await request("/data/accounts.json");
    assert.equal(publicAccountsFile.status, 403, "Production mode must not serve data/accounts.json");

    const relyingService = await request("/data/relying-services/moei.json");
    assert.equal(relyingService.status, 200, "Production mode must serve relying-service config");
    const relyingServiceBody = await relyingService.json();
    assert.deepEqual(relyingServiceBody.allowedReturnOrigins, ["https://moei.sahlabs.me"], "Relying-service origins must come from environment in production");

    const customerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ loginId: "a.almansoori@example.ae", pin: "1111" })
    });
    assert.equal(customerLogin.status, 200, "TrustGate production auth login must verify customer PIN server-side");
    const customer = await customerLogin.json();
    assert.equal(customer.account?.subjectId, "TRUSTGATE-CUSTOMER-0001", "Customer auth login returned wrong subject");
    assert.equal(customer.account?.demoPin, undefined, "Auth login response must not expose demoPin");

    const officeLookup = await request("/api/auth/lookup", {
      method: "POST",
      body: JSON.stringify({
        loginId: "m.al-ketbi@example.gov.ae",
        purpose: "approval",
        requiredPrivilege: "seal.stamp",
        officialSubjectId: "TRUSTGATE-OFFICIAL-7190"
      })
    });
    assert.equal(officeLookup.status, 200, "TrustGate production auth lookup must verify officer privilege server-side");

    const wrongPin = await request("/api/auth/verify-pin", {
      method: "POST",
      body: JSON.stringify({ subjectId: "TRUSTGATE-OFFICIAL-7190", pin: "0000" })
    });
    assert.equal(wrongPin.status, 403, "TrustGate production PIN verification must reject wrong PIN server-side");

    const rightPin = await request("/api/auth/verify-pin", {
      method: "POST",
      body: JSON.stringify({ subjectId: "TRUSTGATE-OFFICIAL-7190", pin: "3333" })
    });
    assert.equal(rightPin.status, 200, "TrustGate production PIN verification must accept correct PIN server-side");

    console.log("TrustGate production admin password verified");
    console.log(JSON.stringify({
      baseUrl,
      demoRootStatus: demoRootLogin.status,
      wrongPasswordStatus: wrongPassword.status,
      environmentAdminStatus: login.status,
      accountsStatus: accounts.status,
      publicAccountsFileStatus: publicAccountsFile.status,
      relyingOrigins: relyingServiceBody.allowedReturnOrigins,
      customerLoginStatus: customerLogin.status,
      officeLookupStatus: officeLookup.status,
      wrongPinStatus: wrongPin.status,
      rightPinStatus: rightPin.status
    }, null, 2));
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
