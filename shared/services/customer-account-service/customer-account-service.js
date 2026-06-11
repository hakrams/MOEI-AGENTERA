(function attachCustomerAccountService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.customerAccountService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createCustomerAccountService() {
  const ACCOUNTS_KEY = "arrearsflow-customer-accounts";
  const SESSION_KEY = "arrearsflow-customer-session";

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function normalizeIdentifier(value) {
    return String(value || "").trim().toLowerCase();
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readAccounts() {
    return readJson(ACCOUNTS_KEY, []);
  }

  function writeAccounts(accounts) {
    writeJson(ACCOUNTS_KEY, accounts);
  }

  function createPasswordProof(password) {
    const text = String(password || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return `pw-${(hash >>> 0).toString(16)}`;
  }

  function buildAccountId(profile) {
    const emiratesDigits = String(profile.emiratesIdMasked || "").replace(/\D/g, "").slice(-4);
    return `MOEI-CUST-${emiratesDigits || Date.now()}`;
  }

  function profileFromInput(input = {}) {
    return {
      fullName: String(input.fullName || "").trim(),
      fullNameAr: String(input.fullNameAr || input.fullName || "").trim(),
      emiratesIdMasked: String(input.emiratesIdMasked || "").trim(),
      mobileMasked: String(input.mobileMasked || "").trim(),
      emailMasked: String(input.emailMasked || "").trim()
    };
  }

  function findAccount(identifier, accounts = readAccounts()) {
    const normalized = normalizeIdentifier(identifier);
    return accounts.find((account) => {
      const profile = account.profile || {};
      return normalizeIdentifier(profile.emailMasked) === normalized
        || normalizeIdentifier(profile.emiratesIdMasked) === normalized
        || normalizeIdentifier(account.credentials?.identifier) === normalized;
    }) || null;
  }

  function buildSession(account) {
    return {
      contractVersion: "customer-session.v1",
      sessionId: `SESSION-${Date.now()}`,
      accountId: account.accountId,
      status: "active",
      signedInAt: nowIso(),
      lastSeenAt: nowIso()
    };
  }

  function buildApplicantMemoryFromAccount(account, overrides = {}) {
    const previous = account.applicantMemory || {};
    return {
      contractVersion: "applicant-memory.v1",
      applicantId: account.accountId,
      identityProvider: "customer-account",
      verification: {
        status: "account_active",
        providerSessionId: overrides.session?.sessionId || previous.verification?.providerSessionId || null,
        verifiedAt: overrides.session?.signedInAt || previous.verification?.verifiedAt || account.createdAt,
        assuranceLevel: "customer_account"
      },
      profile: {
        ...(previous.profile || {}),
        ...(account.profile || {}),
        ...(overrides.profile || {})
      },
      availableData: ["fullName", "fullNameAr", "emiratesIdMasked", "mobileMasked", "emailMasked"],
      missingData: ["currentSalary", "remarks", "requiredDocuments", "financialObligations"],
      recentServices: Array.isArray(overrides.recentServices) ? overrides.recentServices : account.recentServices || [],
      applicationIds: Array.from(new Set([...(account.applicationIds || []), ...(overrides.applicationIds || [])])),
      currentApplicationId: overrides.currentApplicationId || account.currentApplicationId || null,
      customerAccount: {
        accountId: account.accountId,
        contractVersion: account.contractVersion,
        status: account.status,
        profile: account.profile
      },
      createdAt: previous.createdAt || account.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  function saveAccount(account) {
    const accounts = readAccounts();
    const nextAccount = {
      ...account,
      updatedAt: nowIso()
    };
    const nextAccounts = accounts.filter((item) => item.accountId !== nextAccount.accountId);
    nextAccounts.unshift(nextAccount);
    writeAccounts(nextAccounts);
    return nextAccount;
  }

  function saveSession(session) {
    writeJson(SESSION_KEY, session);
    return session;
  }

  function createAccount(input = {}) {
    const profile = profileFromInput(input);
    const identifier = normalizeIdentifier(profile.emailMasked || profile.emiratesIdMasked);
    if (!profile.fullName || !profile.emiratesIdMasked || !profile.mobileMasked || !profile.emailMasked || !input.password) {
      return { ok: false, code: "missing_required_fields" };
    }
    const accounts = readAccounts();
    if (findAccount(profile.emailMasked, accounts) || findAccount(profile.emiratesIdMasked, accounts)) {
      return { ok: false, code: "account_exists" };
    }
    const account = {
      contractVersion: "customer-account.v1",
      accountId: buildAccountId(profile),
      status: "active",
      profile,
      credentials: {
        identifier,
        passwordProof: createPasswordProof(input.password),
        updatedAt: nowIso()
      },
      applicationIds: [],
      currentApplicationId: null,
      recentServices: [],
      applicantMemory: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    account.applicantMemory = buildApplicantMemoryFromAccount(account);
    const session = buildSession(account);
    writeAccounts([account, ...accounts]);
    saveSession(session);
    return { ok: true, account: clone(account), session };
  }

  function signIn(input = {}) {
    const account = findAccount(input.identifier);
    if (!account || account.credentials?.passwordProof !== createPasswordProof(input.password)) {
      return { ok: false, code: "invalid_credentials" };
    }
    const session = buildSession(account);
    const nextAccount = saveAccount({
      ...account,
      applicantMemory: buildApplicantMemoryFromAccount(account, { session })
    });
    saveSession(session);
    return { ok: true, account: clone(nextAccount), session };
  }

  function readSession() {
    return readJson(SESSION_KEY, null);
  }

  function getActiveAccount() {
    const session = readSession();
    if (!session || session.status !== "active") return null;
    return readAccounts().find((account) => account.accountId === session.accountId && account.status === "active") || null;
  }

  function signOut() {
    const session = readSession();
    if (session) {
      saveSession({
        ...session,
        status: "signed_out",
        lastSeenAt: nowIso()
      });
    }
    return { ok: true };
  }

  return {
    ACCOUNTS_KEY,
    SESSION_KEY,
    createAccount,
    signIn,
    signOut,
    readAccounts,
    readSession,
    getActiveAccount,
    saveAccount,
    buildApplicantMemoryFromAccount,
    normalizeIdentifier
  };
});
