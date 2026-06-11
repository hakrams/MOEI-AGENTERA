const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const packRoot = path.join(projectRoot, "planning/01-references/sample-upload-documents");
const manifestPath = path.join(packRoot, "manifest.json");
const servicePath = path.join(projectRoot, "challenge-1/shared/services/document-recognition-service/document-recognition-service.js");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mimeType(filePath) {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

global.window = { ArrearsFlowShared: {} };
require(servicePath);

const service = global.window.ArrearsFlowShared.documentRecognitionService;
assert(service, "documentRecognitionService was not attached to ArrearsFlowShared.");

const manifest = loadJson(manifestPath);
assert(Array.isArray(manifest.samples), "manifest.samples must be an array.");
assert(manifest.samples.length >= 10, "sample pack should cover the main clean and correction cases.");

const results = manifest.samples.map((sample) => {
  const absolutePath = path.join(packRoot, sample.sampleFile);
  assert(fs.existsSync(absolutePath), `Missing sample file: ${sample.sampleFile}`);

  const stat = fs.statSync(absolutePath);
  const request = service.buildRecognitionRequest({
    caseId: "MOEI-SAMPLE-VERIFY-001",
    applicantId: "APPLICANT-SAMPLE-001",
    serviceKey: "housing_arrears_assistance_scheduling",
    documentKey: sample.documentKey,
    file: {
      name: path.basename(sample.sampleFile),
      type: mimeType(sample.sampleFile),
      size: stat.size,
      lastModified: stat.mtimeMs
    },
    customerNote: "Verifier-run fictional sample document."
  });

  const result = service.inspectDocument(request);
  assert(result.contractVersion === "document-recognition-result.v1", `${sample.id}: wrong result contract.`);
  assert(result.document.key === sample.documentKey, `${sample.id}: wrong document key.`);
  assert(result.customerStatus === sample.expectedCustomerStatus, `${sample.id}: expected ${sample.expectedCustomerStatus}, got ${result.customerStatus}.`);
  assert(result.decision === sample.expectedDecision, `${sample.id}: expected ${sample.expectedDecision}, got ${result.decision}.`);

  return {
    id: sample.id,
    documentKey: sample.documentKey,
    file: sample.sampleFile,
    customerStatus: result.customerStatus,
    decision: result.decision
  };
});

const passCount = results.filter((item) => item.customerStatus === "passed").length;
const correctionCount = results.length - passCount;
assert(passCount >= 3, "sample pack should include multiple passing document examples.");
assert(correctionCount >= 5, "sample pack should include multiple correction examples.");

console.log("MOEI document sample pack verified");
console.log(JSON.stringify({ total: results.length, passCount, correctionCount, results }, null, 2));
