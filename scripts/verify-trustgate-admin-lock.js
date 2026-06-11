const assert = require("assert/strict");
const http = require("http");

const baseUrl = (process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715").replace(/\/$/, "");

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
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

async function main() {
  const openAccounts = await request("/api/accounts");
  assert.equal(openAccounts.status, 401, "Accounts API must require admin login");

  const staticAdmins = await request("/data/admins.json");
  assert.equal(staticAdmins.status, 403, "Admin registry must not be served as a static file");

  const badLogin = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ loginId: "root-admin", password: "0000" })
  });
  assert.equal(badLogin.status, 403, "Wrong admin password must be rejected");

  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ loginId: "root-admin", password: "9009" })
  });
  assert.equal(login.status, 200, "Correct admin login should create a session");
  const session = await login.json();
  assert.ok(session.token, "Admin login should return a session token");
  assert.ok(session.admin?.privileges?.includes("trustgate.accounts.manage"), "Admin session should carry manage privilege");

  const authorizedAccounts = await request("/api/accounts", {
    headers: { Authorization: `Bearer ${session.token}` }
  });
  assert.equal(authorizedAccounts.status, 200, "Authorized admin should read accounts");
  const accounts = await authorizedAccounts.json();
  assert.ok(Array.isArray(accounts) && accounts.length >= 1, "Authorized accounts response should be a non-empty array");

  const logout = await request("/api/admin/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` }
  });
  assert.equal(logout.status, 200, "Admin logout should succeed");

  const afterLogout = await request("/api/accounts", {
    headers: { Authorization: `Bearer ${session.token}` }
  });
  assert.equal(afterLogout.status, 401, "Logged-out admin token must stop working");

  console.log("TrustGate admin lock verified");
  console.log(JSON.stringify({
    baseUrl,
    openAccountsStatus: openAccounts.status,
    staticAdminsStatus: staticAdmins.status,
    wrongPinStatus: badLogin.status,
    authorizedAccountCount: accounts.length,
    afterLogoutStatus: afterLogout.status
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
