const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mustInclude(source, needles, label) {
  needles.forEach((needle) => {
    assert(source.includes(needle), `${label} is missing required contract text: ${needle}`);
  });
}

function mustNotInclude(source, needles, label) {
  needles.forEach((needle) => {
    assert(!source.includes(needle), `${label} still contains retired contract text: ${needle}`);
  });
}

const officeApp = read("challenge-1/office/prototype/app.js");
const officeHtml = read("challenge-1/office/prototype/index.html");
const customerApp = read("challenge-1/customer/prototype/app.js");
const simApp = read("trustgate/app.js");
const approvalSchema = read("trustgate/contracts/approval-request.schema.json");
const resultSchema = read("trustgate/contracts/verification-result.schema.json");

mustNotInclude(`${officeApp}\n${officeHtml}`, [
  "428193",
  "DEMO_CODE",
  "approvalCodeInput",
  "verifyApprovalBtn"
], "Office approval flow");

mustInclude(officeApp, [
  "TRUSTGATE_BASE_URL",
  "TRUSTGATE_APPROVAL_PENDING_KEY",
  "TRUSTGATE_APPROVAL_CONSUMED_KEY",
  "startTrustGateApproval",
  "consumeTrustGateApprovalCallback",
  "validateTrustGateApprovalResult",
  "relyingRequestId",
  "trustGateResult",
  "approval.registeredDevice?.trusted === true",
  "approval.signature?.status === \"Qualified Demo Signature\"",
  "approval.signature?.signingPermission === \"Enabled\"",
  "approval.payloadHash === pending?.payloadHash",
  "approval.officialSubjectId === pending?.officialSubjectId",
  "approval.caseId === pending?.caseId",
  "approval.action === pending?.action",
  "result?.assuranceLevel === \"simulated_number_match_and_pin\"",
  "Boolean(result?.pinVerifiedAt)"
], "Office TrustGate callback contract");

mustInclude(customerApp, [
  "TRUSTGATE_BASE_URL",
  "consumeTrustGateCallback",
  "trustGateResult",
  "createSessionFromVerifiedPerson"
], "Customer TrustGate login contract");
mustNotInclude(customerApp, ["/auth/trustgate/start/"], "Customer active login route");

mustInclude(simApp, [
  "data/accounts.json",
  "allowedReturnPaths",
  "allowedReturnOrigins",
  "requiredPrivilegeForPurpose",
  "canUseAccountForPurpose",
  "verifyDemoPin",
  "canAccountApproveRequest",
  "requestedOfficialSubjectId",
  "relyingRequestId",
  "trustGateResult",
  "requestExpired",
  "redirectAfterNonApproval",
  "registeredDevice",
  "signature"
], "TrustGate trust boundary");

mustInclude(approvalSchema, [
  "\"requiredPrivilege\"",
  "\"registeredDevice\"",
  "\"signature\"",
  "\"relyingRequestId\"",
  "\"requestedOfficialSubjectId\"",
  "\"awaiting_pin\"",
  "\"pinVerifiedAt\""
], "Approval request schema");

mustInclude(resultSchema, [
  "\"resultVersion\"",
  "\"relyingRequestId\"",
  "\"registeredDevice\"",
  "\"signature\"",
  "\"pinVerifiedAt\"",
  "\"numberMatchedAt\""
], "Verification result schema");

console.log("TrustGate office callback contract verified");
console.log(JSON.stringify({
  officeFixedCodeRemoved: true,
  customerUsesStandaloneSim: true,
  officeChecksCallbackPayload: true,
  simCarriesPrivilegeDeviceSignature: true
}, null, 2));
