(function attachTrustGateSessionService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.trustGateSessionService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createTrustGateSessionService() {
  const SESSION_KEY = "arrearsflow-trustgate-demo-session";
  const CUSTOMER_MEMORY_KEY = "arrearsflow-trustgate-customer-memory";
  const SESSION_TTL_MS = 30 * 60 * 1000;

  const CONTRACTS = {
    session: "trustgate-demo-session.v1",
    applicantMemory: "applicant-memory.v1",
    customerMemory: "trustgate-customer-memory-store.v1"
  };

  function storage(kind) {
    if (kind === "session" && typeof sessionStorage !== "undefined") return sessionStorage;
    if (typeof localStorage !== "undefined") return localStorage;
    return null;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    const random = typeof crypto !== "undefined" && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint32Array(2))).map((part) => part.toString(36)).join("")
      : Math.random().toString(36).slice(2, 12);
    return `${prefix}-${Date.now().toString(36)}-${random}`.toUpperCase();
  }

  function clone(value) {
    if (value === undefined || value === null) return value;
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback, kind = "local") {
    try {
      const store = storage(kind);
      if (!store) return fallback;
      return JSON.parse(store.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value, kind = "local") {
    const store = storage(kind);
    if (!store) return value;
    store.setItem(key, JSON.stringify(value));
    return value;
  }

  function removeItem(key, kind = "local") {
    const store = storage(kind);
    if (store) store.removeItem(key);
  }

  function profileFromVerifiedPerson(verifiedPerson = {}) {
    const claims = verifiedPerson.claims || verifiedPerson.profile || {};
    return {
      fullName: claims.fullName || "Aisha Al Mansoori",
      fullNameAr: claims.fullNameAr || "عائشة المنصوري",
      emiratesIdMasked: claims.emiratesIdMasked || "784-1988-XXXXXXX-1",
      mobileMasked: claims.mobileMasked || "+971 50 XXX 2184",
      emailMasked: claims.emailMasked || "a.almansoori@example.ae",
      nationality: claims.nationality || "United Arab Emirates",
      nationalityAr: claims.nationalityAr || "الإمارات العربية المتحدة"
    };
  }

  function createSessionFromVerifiedPerson(options = {}) {
    const verifiedPerson = options.verifiedPerson || {};
    const issuedAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const subjectId = verifiedPerson.providerSubject || verifiedPerson.subjectId || "TRUSTGATE-DEMO-7841988";

    return {
      contractVersion: CONTRACTS.session,
      sessionId: makeId("TRUSTGATE-SESSION"),
      provider: verifiedPerson.provider || "trustgate-demo",
      subjectId,
      assuranceLevel: verifiedPerson.accountLevel || verifiedPerson.assurance?.level || "verified-demo",
      serviceKey: options.serviceKey || verifiedPerson.consent?.serviceKey || "housing_arrears_assistance_scheduling",
      profile: profileFromVerifiedPerson(verifiedPerson),
      availableData: clone(verifiedPerson.availableData || [
        "fullName",
        "fullNameAr",
        "emiratesIdMasked",
        "mobileMasked",
        "emailMasked",
        "nationality"
      ]),
      missingData: clone(verifiedPerson.missingData || [
        "currentSalary",
        "remarks",
        "requiredDocuments",
        "financialObligations"
      ]),
      issuedAt,
      expiresAt,
      simulation: true
    };
  }

  function isSessionValid(session) {
    if (!session || session.contractVersion !== CONTRACTS.session) return false;
    if (!session.expiresAt) return false;
    return new Date(session.expiresAt).getTime() > Date.now();
  }

  function saveSession(session) {
    return writeJson(SESSION_KEY, session, "session");
  }

  function clearSession() {
    removeItem(SESSION_KEY, "session");
  }

  function readSession() {
    const session = readJson(SESSION_KEY, null, "session");
    if (!session) return null;
    if (!isSessionValid(session)) {
      clearSession();
      return null;
    }
    return session;
  }

  function readMemoryStore() {
    const store = readJson(CUSTOMER_MEMORY_KEY, null, "local");
    if (store?.contractVersion === CONTRACTS.customerMemory && store.memories) return store;
    return {
      contractVersion: CONTRACTS.customerMemory,
      memories: {},
      updatedAt: nowIso()
    };
  }

  function writeMemoryStore(store) {
    return writeJson(CUSTOMER_MEMORY_KEY, {
      contractVersion: CONTRACTS.customerMemory,
      memories: store.memories || {},
      updatedAt: nowIso()
    }, "local");
  }

  function readCustomerMemory(subjectId) {
    if (!subjectId) return null;
    return readMemoryStore().memories[subjectId] || null;
  }

  function saveCustomerMemory(memory) {
    const applicantId = memory?.applicantId;
    if (!applicantId) return memory;
    const store = readMemoryStore();
    store.memories[applicantId] = {
      ...memory,
      updatedAt: nowIso()
    };
    writeMemoryStore(store);
    return store.memories[applicantId];
  }

  function buildApplicantMemoryFromSession(session, previous = {}) {
    const createdAt = previous.createdAt || nowIso();
    return {
      contractVersion: CONTRACTS.applicantMemory,
      applicantId: session.subjectId,
      identityProvider: session.provider,
      verification: {
        status: "verified",
        providerSessionId: session.sessionId,
        verifiedAt: session.issuedAt,
        expiresAt: session.expiresAt,
        assuranceLevel: session.assuranceLevel
      },
      profile: {
        ...(previous.profile || {}),
        ...(session.profile || {})
      },
      availableData: Array.isArray(session.availableData) ? clone(session.availableData) : previous.availableData || [],
      missingData: Array.isArray(session.missingData) ? clone(session.missingData) : previous.missingData || [],
      recentServices: Array.isArray(previous.recentServices) ? clone(previous.recentServices) : [],
      applicationIds: Array.isArray(previous.applicationIds) ? clone(previous.applicationIds) : [],
      currentApplicationId: previous.currentApplicationId || null,
      customerAccount: {
        contractVersion: "verified-customer-session.v1",
        accountId: session.subjectId,
        status: "verified_by_trustgate",
        identityProvider: session.provider,
        profile: clone(session.profile || {})
      },
      identityLinkEvents: Array.isArray(previous.identityLinkEvents) ? clone(previous.identityLinkEvents) : [],
      integrationNotes: {
        replacementPath: "Production should replace this browser demo session with the approved TrustGate integration and an httpOnly server session."
      },
      createdAt,
      updatedAt: nowIso()
    };
  }

  function ensureApplicantMemory(session) {
    if (!isSessionValid(session)) return null;
    const previous = readCustomerMemory(session.subjectId) || {};
    const memory = buildApplicantMemoryFromSession(session, previous);
    return saveCustomerMemory(memory);
  }

  return {
    CONTRACTS,
    CUSTOMER_MEMORY_KEY,
    SESSION_KEY,
    SESSION_TTL_MS,
    buildApplicantMemoryFromSession,
    clearSession,
    createSessionFromVerifiedPerson,
    ensureApplicantMemory,
    isSessionValid,
    readCustomerMemory,
    readSession,
    saveCustomerMemory,
    saveSession
  };
});
