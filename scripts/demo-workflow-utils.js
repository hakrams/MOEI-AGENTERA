const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    dump() {
      return Object.fromEntries(store.entries());
    }
  };
}

function loadSharedWorkflow() {
  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    structuredClone,
    localStorage: createLocalStorage(),
    window: {}
  };
  context.window.localStorage = context.localStorage;
  vm.createContext(context);

  for (const file of [
    "challenge-1/shared/mock-data/cases.js",
    "challenge-1/shared/workflow.js"
  ]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(source, context, { filename: file });
  }

  return {
    context,
    shared: context.window.ArrearsFlowShared,
    workflow: context.window.ArrearsFlowShared.workflow
  };
}

function buildApprovedDemoState() {
  const { context, shared, workflow } = loadSharedWorkflow();
  const sourceCase = structuredClone(shared.cases[0]);
  const submitted = workflow.saveSubmission(sourceCase, "system_review", {
    language: "ar",
    channel: "customer-prototype",
    source: "customer",
    actor: "customer",
    action: "Application submitted for deterministic worker review",
    actionAr: "تم إرسال الطلب لمراجعة العمال المحددين",
    auditSource: "customer-portal"
  });

  const review = workflow.buildReview(submitted, { locale: "ar-AE" });
  const snapshot = workflow.buildCaseSnapshot({ ...submitted, status: "officer_review" }, review, "status-snapshot-worker");
  workflow.saveSnapshot(submitted.id, snapshot);
  workflow.updateSubmission(submitted.id, { status: "officer_review", preparedSnapshotAt: snapshot.builtAt }, {
    actor: "system",
    action: "Prepared case snapshot sent to officer dashboard",
    actionAr: "تم إرسال لقطة الحالة المجهزة إلى لوحة الموظف",
    source: "status-snapshot-worker",
    requiresHumanApproval: true
  });

  const approved = workflow.updateSubmission(submitted.id, { status: "approved" }, {
    actor: "officer",
    action: "Mariam Al Ketbi approved recommendation through TrustGate number matching and PIN",
    actionAr: "اعتمدت مريم الكتبي التوصية عبر TrustGate ورمز PIN",
    source: "trustgate",
    requiresHumanApproval: true
  });

  const seal = workflow.saveApprovalSeal({
    stampId: "STAMP-2026-DEMO-001",
    caseId: approved.id,
    approvedBy: "Mariam Al Ketbi",
    approvedByAr: "مريم الكتبي",
    role: "Finance Collection Officer / Approver",
    arRole: "مسؤولة التحصيل المالي والاعتماد",
    action: "Arrears rescheduling recommendation approved",
    arAction: "تم اعتماد توصية إعادة جدولة المتأخرات",
    approvedAt: "2026-05-30T16:25:00+04:00",
    method: "TrustGate number matching and PIN",
    arMethod: "مطابقة رقم ورمز PIN عبر TrustGate",
    challengeId: "TGATE-DEMO-001",
    payloadHash: "demo-payload-hash-001",
    status: "verified",
    trustGate: {
      resultVersion: "trustgate-result.v1",
      requestId: "TGATE-DEMO-001",
      relyingRequestId: "MOEI-SEAL-DEMO-001",
      selectedNumber: "73",
      numberMatchedAt: "2026-05-30T16:24:50+04:00",
      pinVerifiedAt: "2026-05-30T16:25:00+04:00",
      assuranceLevel: "simulated_number_match_and_pin",
      requiredPrivilege: "seal.stamp",
      registeredDeviceId: "DEMO-DEVICE-SEAL-003",
      signatureCertificateId: "DEMO-SIGN-SEAL-003"
    }
  });

  return {
    approved,
    snapshot,
    seal,
    storage: context.localStorage.dump()
  };
}

module.exports = {
  buildApprovedDemoState,
  createLocalStorage,
  loadSharedWorkflow,
  root
};
