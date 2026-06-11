const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicHtmlFiles = [
  "customer/housing-arrears/index.html",
  "office/housing-arrears/index.html"
];
const bannedPublicPaths = [
  "shared/mock-data",
  "shared/mock-data/cases.js",
  "shared/mock-data/programme-loans.js"
];
const bannedPatterns = [
  "shared/mock-data/cases.js",
  "shared/mock-data/programme-loans.js",
  "../../shared/mock-data/cases.js",
  "../../shared/mock-data/programme-loans.js"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const checked = publicHtmlFiles.map((relativePath) => {
  const filePath = path.join(root, relativePath);
  assert(fs.existsSync(filePath), `Missing public route HTML: ${relativePath}`);
  const html = fs.readFileSync(filePath, "utf8");
  for (const pattern of bannedPatterns) {
    assert(!html.includes(pattern), `${relativePath} loads banned live mock script: ${pattern}`);
  }
  assert(html.includes("shared/live-api-client.js"), `${relativePath} must load the live API client`);
  return relativePath;
});

const absent = bannedPublicPaths.map((relativePath) => {
  const filePath = path.join(root, relativePath);
  assert(!fs.existsSync(filePath), `Banned public mock-data path still exists: ${relativePath}`);
  return relativePath;
});

console.log("Challenge 1 live UI mock-script verifier passed");
console.log(JSON.stringify({ checked, absent }, null, 2));
