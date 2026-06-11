const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const scanRoots = [
  "challenge-1/customer/prototype",
  "challenge-1/office/prototype",
  "challenge-1/shared",
  "customer/housing-arrears",
  "office/housing-arrears",
  "shared"
];

const allowedUrl = /https?:\/\/(?:(?:127\.0\.0\.1|localhost)(?::\d+)?|json-schema\.org|moei\.prototype\.local)/i;
const externalUrl = /https?:\/\/[^\s"'`<>)]+/ig;
const disallowedIntegrationSignals = [
  /uaepass\.ae/i,
  /moei\.gov\.ae\/api/i,
  /api\.moei/i,
  /whatsapp\.com\/api/i,
  /graph\.facebook\.com/i,
  /bank.*api/i,
  /openbanking/i
];

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(entryPath);
    if (entry.isFile() && /\.(js|html|css|json)$/i.test(entry.name)) return [entryPath];
    return [];
  });
}

const files = scanRoots.flatMap((scanRoot) => listFiles(path.join(root, scanRoot)));
const violations = [];

for (const filePath of files) {
  const body = fs.readFileSync(filePath, "utf8");
  for (const match of body.matchAll(externalUrl)) {
    if (!allowedUrl.test(match[0])) {
      violations.push({ file: path.relative(root, filePath), signal: match[0] });
    }
  }
  for (const pattern of disallowedIntegrationSignals) {
    if (pattern.test(body)) {
      violations.push({ file: path.relative(root, filePath), signal: String(pattern) });
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Live integration signals found:\n${JSON.stringify(violations, null, 2)}`);
}

console.log("Challenge 1 no-live-integration guard verified");
console.log(JSON.stringify({
  scannedRoots: scanRoots,
  files: files.length,
  violations: 0
}, null, 2));
