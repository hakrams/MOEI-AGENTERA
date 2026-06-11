const fs = require("fs");
const path = require("path");
const { buildApprovedDemoState, root } = require("./demo-workflow-utils");

const outDir = path.join(root, "demo-state");
const outFile = path.join(outDir, "approved-flow.seed.json");
fs.mkdirSync(outDir, { recursive: true });

const state = buildApprovedDemoState();
const payload = {
  generatedAt: new Date().toISOString(),
  purpose: "Seeded approved demo state for rehearsal and /verify/ fallback.",
  caseId: state.approved.id,
  status: state.approved.status,
  stampId: state.seal.stampId,
  localStorage: state.storage
};

fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);

console.log("MOEI demo state seeded");
console.log(JSON.stringify({
  file: path.relative(root, outFile),
  caseId: payload.caseId,
  status: payload.status,
  stampId: payload.stampId,
  storageKeys: Object.keys(payload.localStorage)
}, null, 2));
