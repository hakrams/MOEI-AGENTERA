const http = require("http");
const fs = require("fs");
const path = require("path");

const moeiBaseUrl = process.env.MOEI_BASE_URL || "http://127.0.0.1:9710";
const trustGateBaseUrl = process.env.TRUSTGATE_BASE_URL || "http://127.0.0.1:9715/";
const root = path.resolve(__dirname, "..");

const packagedRoutes = [
  {
    id: "customer-housing-arrears",
    routePath: "customer/housing-arrears",
    requiredFiles: ["index.html", "app.js", "styles.css"]
  },
  {
    id: "office-housing-arrears",
    routePath: "office/housing-arrears",
    requiredFiles: ["index.html", "app.js", "styles.css"]
  },
  {
    id: "shared-runtime",
    routePath: "shared",
    requiredFiles: [
      "workflow.js",
      "live-api-client.js",
      "contracts/assessment-result.schema.json",
      "contracts/case.schema.json",
      "contracts/document-completeness.schema.json",
      "contracts/financial-study.schema.json",
      "contracts/programme-loan.schema.json",
      "services/financial-study/assessment-orchestrator.js",
      "services/financial-study/audit-ledger-service.js",
      "services/financial-study/confidence-service.js",
      "services/financial-study/document-completeness-service.js",
      "services/financial-study/financial-capacity-service.js",
      "services/financial-study/programme-loan-service.js",
      "services/financial-study/recommendation-service.js",
      "services/financial-study/rescheduling-policy-service.js"
    ]
  }
];

const moeiRoutes = [
  { route: "/", type: "html" },
  { route: "/customer/", type: "html" },
  { route: "/customer/housing-arrears", type: "redirect-or-html" },
  { route: "/customer/housing-arrears/", type: "html" },
  { route: "/office/", type: "html" },
  { route: "/office/housing-arrears", type: "redirect-or-html" },
  { route: "/office/housing-arrears/", type: "html" },
  { route: "/shared/workflow.js", type: "shared-js" },
  { route: "/verify/", type: "verify-html" },
  { route: "/verify/?stamp=STAMP-2026-DEMO-001", type: "verify-html" }
];

const forbiddenMoeiRoutes = [
  "/shared/mock-data/cases.js",
  "/shared/mock-data/programme-loans.js"
];

const trustGateRoutes = [
  { route: "/", type: "trustgate-html" },
  { route: "/account/", type: "trustgate-html" },
  { route: "/phone/", type: "trustgate-html" },
  { route: "/api/requests", type: "json" }
];

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    } else if (entry.isSymbolicLink()) {
      files.push(entryPath);
    }
  }
  return files;
}

function verifyPackagedRoute(route) {
  const routeDirectory = path.join(root, route.routePath);
  if (!fs.existsSync(routeDirectory)) {
    throw new Error(`${route.id} package route missing: ${route.routePath}`);
  }

  const routeStat = fs.lstatSync(routeDirectory);
  if (routeStat.isSymbolicLink()) {
    throw new Error(`${route.id} package route must be a real directory, not a symlink: ${route.routePath}`);
  }
  if (!routeStat.isDirectory()) {
    throw new Error(`${route.id} package route is not a directory: ${route.routePath}`);
  }

  for (const requiredFile of route.requiredFiles) {
    const filePath = path.join(routeDirectory, requiredFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${route.id} missing required packaged file: ${requiredFile}`);
    }
    const fileStat = fs.lstatSync(filePath);
    if (fileStat.isSymbolicLink()) {
      throw new Error(`${route.id} packaged file must not be a symlink: ${requiredFile}`);
    }
    if (!fileStat.isFile()) {
      throw new Error(`${route.id} packaged path is not a file: ${requiredFile}`);
    }
    if (fileStat.size === 0) {
      throw new Error(`${route.id} packaged file is zero bytes: ${requiredFile}`);
    }
  }

  const zeroByteFiles = listFiles(routeDirectory).filter((filePath) => fs.lstatSync(filePath).isFile() && fs.statSync(filePath).size === 0);
  if (zeroByteFiles.length > 0) {
    throw new Error(`${route.id} contains zero-byte packaged files: ${zeroByteFiles.map((filePath) => path.relative(root, filePath)).join(", ")}`);
  }

  return {
    id: route.id,
    routePath: route.routePath,
    requiredFiles: route.requiredFiles.length,
    files: listFiles(routeDirectory).filter((filePath) => fs.lstatSync(filePath).isFile()).length
  };
}

function verifyPackagedRoutes() {
  return packagedRoutes.map(verifyPackagedRoute);
}

function fetchRoute(baseUrl, route) {
  const url = new URL(route, baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          route,
          url: url.toString(),
          statusCode: res.statusCode,
          location: res.headers.location || "",
          body
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Timed out fetching ${url.toString()}`));
    });
  });
}

function includesHtml(body) {
  return body.includes("<!doctype html>") || body.includes("<!DOCTYPE html>");
}

function assertRoute(result, type) {
  if (type === "redirect-or-html" && [301, 302, 307, 308].includes(result.statusCode)) {
    if (!result.location) throw new Error(`${result.route} redirected without a Location header`);
    return;
  }

  if (result.statusCode !== 200) {
    throw new Error(`${result.route} returned ${result.statusCode}`);
  }

  if (type.includes("html") && !includesHtml(result.body)) {
    throw new Error(`${result.route} did not return HTML`);
  }
  if (type === "verify-html" && !result.body.includes("verify.js")) {
    throw new Error(`${result.route} did not include the verification script`);
  }
  if (type === "trustgate-html" && !result.body.includes("app.js")) {
    throw new Error(`${result.route} did not include the TrustGate script`);
  }
  if (type === "shared-js" && !result.body.includes("window.ArrearsFlowShared")) {
    throw new Error(`${result.route} did not include shared workflow code`);
  }
  if (type === "json") {
    try {
      JSON.parse(result.body);
    } catch {
      throw new Error(`${result.route} did not return JSON`);
    }
  }
}

async function verifyGroup(baseUrl, routes) {
  const results = [];
  for (const { route, type } of routes) {
    const result = await fetchRoute(baseUrl, route);
    assertRoute(result, type);
    results.push({
      route,
      statusCode: result.statusCode,
      location: result.location,
      bytes: result.body.length
    });
  }
  return results;
}

async function verifyForbiddenGroup(baseUrl, routes) {
  const results = [];
  for (const route of routes) {
    const result = await fetchRoute(baseUrl, route);
    if (result.statusCode !== 404) {
      throw new Error(`${route} should be unavailable but returned ${result.statusCode}`);
    }
    results.push({
      route,
      statusCode: result.statusCode,
      bytes: result.body.length
    });
  }
  return results;
}

async function main() {
  const packaged = verifyPackagedRoutes();
  const moei = await verifyGroup(moeiBaseUrl, moeiRoutes);
  const forbiddenMoei = await verifyForbiddenGroup(moeiBaseUrl, forbiddenMoeiRoutes);
  const trustGate = await verifyGroup(trustGateBaseUrl, trustGateRoutes);
  console.log("MOEI and TrustGate public routes verified");
  console.log(JSON.stringify({
    moeiBaseUrl,
    trustGateBaseUrl,
    packaged,
    moei,
    forbiddenMoei,
    trustGate
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
