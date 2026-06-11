(function attachTrustGateAdapter(root, factory) {
  const adapter = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = adapter;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.trustGateAdapter = adapter;
  }
})(typeof window !== "undefined" ? window : globalThis, function createTrustGateAdapter() {
  const CONTRACTS = {
    authRequest: "trustgate-auth-request.v1",
    verifiedPerson: "trustgate-verified-person.v1",
    customerAccount: "arrearsflow-customer-account.v1",
    identityLinkEvent: "identity-link-event.v1",
    applicantMemory: "applicant-memory.v1"
  };

  const REFERENCE_DOCS = [
    "trustgate/contracts/identity-request.schema.json",
    "trustgate/contracts/verification-result.schema.json"
  ];

  const AVAILABLE_DATA = [
    "fullName",
    "fullNameAr",
    "emiratesIdMasked",
    "mobileMasked",
    "emailMasked",
    "nationality"
  ];

  const SERVICE_MISSING_DATA = [
    "currentSalary",
    "remarks",
    "requiredDocuments",
    "financialObligations"
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`.toUpperCase();
  }

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function profileFromSourceCase(sourceCase = {}) {
    return {
      fullName: sourceCase.applicantName || "Aisha Al Mansoori",
      fullNameAr: sourceCase.applicantNameAr || "عائشة المنصوري",
      emiratesIdMasked: sourceCase.emiratesIdMasked || "784-1988-XXXXXXX-1",
      mobileMasked: sourceCase.phoneMasked || "+971 50 XXX 2184",
      emailMasked: sourceCase.emailMasked || "a.almansoori@example.ae",
      nationality: sourceCase.nationality || "United Arab Emirates",
      nationalityAr: sourceCase.nationalityAr || "الإمارات العربية المتحدة"
    };
  }

  function createDemoAuthRequest(options = {}) {
    return {
      contractVersion: CONTRACTS.authRequest,
      requestId: makeId("TRUSTGATE-AUTH"),
      provider: "trustgate-demo-adapter",
      protocolFamily: "oauth2",
      flow: "authorization_code",
      serviceKey: options.serviceKey || "housing_arrears_assistance_scheduling",
      redirectUri: options.redirectUri || "arrearsflow://trustgate/callback",
      state: makeId("STATE"),
      nonce: makeId("NONCE"),
      requestedScopes: ["openid", "profile", "email", "phone"],
      createdAt: nowIso(),
      replaceWithRealProvider: [
        "authorizationEndpoint",
        "clientId",
        "redirectUri",
        "pkceVerifier",
        "tokenEndpoint",
        "userinfoEndpoint"
      ],
      referenceDocs: REFERENCE_DOCS
    };
  }

  function createManualCustomerAccount(options = {}) {
    const profile = profileFromSourceCase(options.sourceCase);
    const createdAt = nowIso();
    return {
      contractVersion: CONTRACTS.customerAccount,
      accountId: options.accountId || makeId("MOEI-ACCOUNT"),
      status: "manual_created_pending_trustgate",
      origin: "ministry-account",
      identityProvider: "manual-account",
      profile,
      availableData: [],
      missingData: [...AVAILABLE_DATA, ...SERVICE_MISSING_DATA],
      verificationRequirements: [
        "trustgate_identity_verification",
        "emirates_id_confirmation",
        "mobile_email_confirmation"
      ],
      identityLinkEvents: [],
      createdAt,
      updatedAt: createdAt
    };
  }

  function exchangeDemoCodeForVerifiedPerson(options = {}) {
    const authRequest = options.authRequest || createDemoAuthRequest(options);
    const claims = profileFromSourceCase(options.sourceCase);
    const verifiedAt = nowIso();
    return {
      contractVersion: CONTRACTS.verifiedPerson,
      provider: "trustgate-demo-adapter",
      providerSubject: options.providerSubject || "TRUSTGATE-DEMO-7841988",
      accountLevel: "SOP3",
      verifiedAt,
      authRequestId: authRequest.requestId,
      authCode: options.authCode ? "demo-code-received-redacted" : "demo-code-generated",
      assurance: {
        level: "SOP3",
        mobileVerified: true,
        emailVerified: true,
        emiratesIdVerified: true
      },
      claims,
      availableData: clone(AVAILABLE_DATA),
      missingData: clone(SERVICE_MISSING_DATA),
      consent: {
        serviceKey: authRequest.serviceKey,
        purpose: "Create or verify ArrearsFlow customer account and prefill available identity data.",
        grantedAt: verifiedAt
      },
      rawProviderToken: {
        type: "demo_redacted",
        accessToken: "redacted",
        idToken: "redacted"
      },
      referenceDocs: REFERENCE_DOCS
    };
  }

  function linkVerifiedPersonToCustomerAccount(options = {}) {
    const verifiedPerson = options.verifiedPerson || exchangeDemoCodeForVerifiedPerson(options);
    const account = options.account || createManualCustomerAccount({ sourceCase: options.sourceCase });
    const linkedAt = nowIso();
    const linkEvent = {
      contractVersion: CONTRACTS.identityLinkEvent,
      id: makeId("IDENTITY-LINK"),
      at: linkedAt,
      provider: verifiedPerson.provider,
      providerSubject: verifiedPerson.providerSubject,
      action: "trustgate_verified_person_linked_to_customer_account",
      previousStatus: account.status,
      nextStatus: "verified_by_trustgate"
    };

    return {
      ...account,
      status: "verified_by_trustgate",
      origin: account.origin === "ministry-account" ? "trustgate-transfer" : account.origin,
      identityProvider: verifiedPerson.provider,
      providerSubject: verifiedPerson.providerSubject,
      accountLevel: verifiedPerson.accountLevel,
      verification: {
        status: "verified",
        providerSessionId: verifiedPerson.authRequestId,
        verifiedAt: verifiedPerson.verifiedAt,
        assuranceLevel: verifiedPerson.accountLevel
      },
      profile: {
        ...(account.profile || {}),
        ...verifiedPerson.claims
      },
      availableData: clone(verifiedPerson.availableData),
      missingData: clone(verifiedPerson.missingData),
      identityLinkEvents: [
        ...(Array.isArray(account.identityLinkEvents) ? account.identityLinkEvents : []),
        linkEvent
      ],
      updatedAt: linkedAt
    };
  }

  function buildApplicantMemoryFromAccount(options = {}) {
    const account = options.account || createManualCustomerAccount(options);
    const verifiedPerson = options.verifiedPerson || null;
    const verified = account.status === "verified_by_trustgate";
    return {
      contractVersion: CONTRACTS.applicantMemory,
      applicantId: account.accountId,
      identityProvider: account.identityProvider,
      verification: {
        status: verified ? "verified" : "pending_trustgate",
        providerSessionId: account.verification?.providerSessionId || verifiedPerson?.authRequestId || null,
        verifiedAt: account.verification?.verifiedAt || verifiedPerson?.verifiedAt || null,
        assuranceLevel: account.verification?.assuranceLevel || verifiedPerson?.accountLevel || "not_verified"
      },
      profile: clone(account.profile || {}),
      availableData: clone(account.availableData || []),
      missingData: clone(account.missingData || SERVICE_MISSING_DATA),
      recentServices: Array.isArray(options.recentServices) ? clone(options.recentServices) : [],
      applicationIds: Array.isArray(options.applicationIds) ? clone(options.applicationIds) : [],
      currentApplicationId: options.currentApplicationId || null,
      customerAccount: clone(account),
      identityLinkEvents: clone(account.identityLinkEvents || []),
      integrationNotes: {
        adapterBoundary: "TrustGate Adapter receives or simulates verified identity, then creates ArrearsFlow account memory.",
        replacementPath: "Replace trustgate-demo-adapter calls with production trust-provider responses while preserving applicant-memory.v1.",
        referenceDocs: REFERENCE_DOCS
      },
      createdAt: account.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  function runDemoAccountTransfer(options = {}) {
    const authRequest = createDemoAuthRequest(options);
    const manualAccount = createManualCustomerAccount(options);
    const verifiedPerson = exchangeDemoCodeForVerifiedPerson({
      ...options,
      authRequest,
      authCode: options.authCode || "demo-auth-code"
    });
    const linkedAccount = linkVerifiedPersonToCustomerAccount({
      ...options,
      account: manualAccount,
      verifiedPerson
    });
    const applicantMemory = buildApplicantMemoryFromAccount({
      ...options,
      account: linkedAccount,
      verifiedPerson
    });
    return { authRequest, manualAccount, verifiedPerson, linkedAccount, applicantMemory };
  }

  return {
    CONTRACTS,
    REFERENCE_DOCS,
    createDemoAuthRequest,
    createManualCustomerAccount,
    exchangeDemoCodeForVerifiedPerson,
    linkVerifiedPersonToCustomerAccount,
    buildApplicantMemoryFromAccount,
    runDemoAccountTransfer
  };
});
