const assert = require("assert");

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
    },
    clear() {
      data.clear();
    }
  };
}

global.localStorage = createStorage();
global.window = global;

const service = require("../challenge-1/shared/services/customer-account-service/customer-account-service.js");

const created = service.createAccount({
  fullName: "Aisha Al Mansoori",
  fullNameAr: "عائشة المنصوري",
  emiratesIdMasked: "784-1988-XXXXXXX-1",
  mobileMasked: "+971 50 XXX 2184",
  emailMasked: "a.almansoori@example.ae",
  password: "Passw0rd!2026"
});

assert.equal(created.ok, true);
assert.equal(created.account.contractVersion, "customer-account.v1");
assert.equal(created.session.contractVersion, "customer-session.v1");
assert.equal(created.account.profile.emailMasked, "a.almansoori@example.ae");

const duplicate = service.createAccount({
  fullName: "Aisha Al Mansoori",
  emiratesIdMasked: "784-1988-XXXXXXX-1",
  mobileMasked: "+971 50 XXX 2184",
  emailMasked: "a.almansoori@example.ae",
  password: "Passw0rd!2026"
});

assert.equal(duplicate.ok, false);
assert.equal(duplicate.code, "account_exists");

service.signOut();
assert.equal(service.getActiveAccount(), null);

const denied = service.signIn({
  identifier: "a.almansoori@example.ae",
  password: "wrong"
});

assert.equal(denied.ok, false);
assert.equal(denied.code, "invalid_credentials");

const signedIn = service.signIn({
  identifier: "a.almansoori@example.ae",
  password: "Passw0rd!2026"
});

assert.equal(signedIn.ok, true);
assert.equal(service.getActiveAccount().accountId, created.account.accountId);

const applicantMemory = service.buildApplicantMemoryFromAccount(signedIn.account, {
  session: signedIn.session,
  currentApplicationId: "MOEI-HOUSING-2026-001",
  applicationIds: ["MOEI-HOUSING-2026-001"],
  recentServices: [
    {
      serviceKey: "housing_arrears_assistance_scheduling",
      applicationId: "MOEI-HOUSING-2026-001",
      label: "Housing Arrears Assistance Scheduling",
      status: "draft",
      updatedAt: "2026-05-29T00:00:00.000Z"
    }
  ]
});

assert.equal(applicantMemory.contractVersion, "applicant-memory.v1");
assert.equal(applicantMemory.identityProvider, "customer-account");
assert.equal(applicantMemory.verification.status, "account_active");
assert.equal(applicantMemory.currentApplicationId, "MOEI-HOUSING-2026-001");
assert.equal(applicantMemory.recentServices.length, 1);

console.log("MOEI customer account service verified");
