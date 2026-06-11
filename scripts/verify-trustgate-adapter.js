const assert = require("assert");
const trustGateAdapter = require("../challenge-1/shared/integrations/trustgate-adapter/trustgate-adapter.js");
const trustGateSessionService = require("../challenge-1/shared/services/trustgate-session-service/trustgate-session-service.js");

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

function main() {
  global.sessionStorage = createStorage();
  global.localStorage = createStorage();

  const sourceCase = {
    applicantName: "Aisha Al Mansoori",
    applicantNameAr: "عائشة المنصوري",
    emiratesIdMasked: "784-1988-XXXXXXX-1",
    phoneMasked: "+971 50 XXX 2184",
    emailMasked: "a.almansoori@example.ae"
  };

  const authRequest = trustGateAdapter.createDemoAuthRequest({
    serviceKey: "housing_arrears_assistance_scheduling"
  });
  const manualAccount = trustGateAdapter.createManualCustomerAccount({ sourceCase });
  const verifiedPerson = trustGateAdapter.exchangeDemoCodeForVerifiedPerson({
    authRequest,
    authCode: "demo-auth-code",
    sourceCase
  });
  const linkedAccount = trustGateAdapter.linkVerifiedPersonToCustomerAccount({
    account: manualAccount,
    verifiedPerson
  });
  const applicantMemory = trustGateAdapter.buildApplicantMemoryFromAccount({
    account: linkedAccount,
    verifiedPerson
  });

  assert.equal(authRequest.contractVersion, "trustgate-auth-request.v1");
  assert.equal(authRequest.protocolFamily, "oauth2");
  assert.equal(manualAccount.contractVersion, "arrearsflow-customer-account.v1");
  assert.equal(manualAccount.status, "manual_created_pending_trustgate");
  assert.equal(verifiedPerson.contractVersion, "trustgate-verified-person.v1");
  assert.equal(verifiedPerson.accountLevel, "SOP3");
  assert.equal(linkedAccount.status, "verified_by_trustgate");
  assert.equal(linkedAccount.identityProvider, "trustgate-demo-adapter");
  assert.equal(linkedAccount.identityLinkEvents.length, 1);
  assert.equal(applicantMemory.contractVersion, "applicant-memory.v1");
  assert.equal(applicantMemory.verification.status, "verified");
  assert.equal(applicantMemory.profile.emiratesIdMasked, sourceCase.emiratesIdMasked);
  assert(applicantMemory.missingData.includes("currentSalary"));
  assert(applicantMemory.missingData.includes("requiredDocuments"));

  const session = trustGateSessionService.createSessionFromVerifiedPerson({
    verifiedPerson,
    serviceKey: "housing_arrears_assistance_scheduling"
  });
  trustGateSessionService.saveSession(session);
  const storedSession = trustGateSessionService.readSession();
  const sessionMemory = trustGateSessionService.ensureApplicantMemory(storedSession);

  assert.equal(session.contractVersion, "trustgate-demo-session.v1");
  assert.equal(Boolean(session.issuedAt), true);
  assert.equal(Boolean(session.expiresAt), true);
  assert.equal(storedSession.subjectId, verifiedPerson.providerSubject);
  assert.equal(sessionMemory.contractVersion, "applicant-memory.v1");
  assert.equal(sessionMemory.applicantId, session.subjectId);
  assert.equal(sessionMemory.verification.status, "verified");

  console.log("TrustGate adapter verified");
  console.log(JSON.stringify({
    authContract: authRequest.contractVersion,
    manualStatus: manualAccount.status,
    verifiedPersonContract: verifiedPerson.contractVersion,
    linkedStatus: linkedAccount.status,
    sessionContract: session.contractVersion,
    sessionHasExpiry: Boolean(session.expiresAt),
    applicantMemoryContract: applicantMemory.contractVersion,
    verificationStatus: applicantMemory.verification.status,
    missingServiceFields: applicantMemory.missingData
  }, null, 2));
}

main();
