const path = require("path");
const { assert, requestJson, withServer } = require("./challenge1-live-api-test-client");
const {
  capturePng,
  closeBrowser,
  createPage,
  delay,
  evalPage,
  launchChromium,
  navigate,
  waitForCondition
} = require("./challenge1-browser-test-client");

const port = Number(process.env.TEST_PORT || 9742);
const baseUrl = `http://127.0.0.1:${port}`;

async function seedLiveApplication(unique) {
  const created = await requestJson(port, "POST", "/api/challenge-1/applications", {
    language: "ar",
    channel: "customer_web",
    customer: {
      displayName: `Office UI Live Customer ${unique}`,
      identityRef: `OFFICE-UI-${unique}`,
      emiratesId: `7841998${unique}`,
      phone: `050${String(unique).slice(-7)}`,
      email: `office-ui-${unique}@example.test`
    },
    financial: {
      currentSalary: 22000,
      monthlyObligations: 900,
      existingLoans: true
    },
    family: {
      dependentsCount: 3,
      familyMembersCount: 5
    },
    remarks: `Visible office browser verifier ${unique}`,
    acknowledgement: true
  });
  assert(created.statusCode === 201, `application create failed with ${created.statusCode}`);
  const applicationId = created.body.application.applicationId;
  assert(applicationId, "missing applicationId");

  const programmeFeed = await requestJson(port, "POST", "/api/challenge-1/programme-loans", {
    applicationId,
    beneficiaryId: `OFFICE-UI-${unique}`,
    loanId: `OFFICE-LN-${unique}`,
    source: "office_ui_verifier_feed",
    originalLoanAmount: 800000,
    remainingLoanBalance: 390000,
    originalApprovedRepaymentMonths: 300,
    remainingRepaymentMonths: 130,
    totalArrearsAmount: 15000,
    unpaidInstallmentsCount: 3,
    currentMonthlyInstallment: 3200,
    monthlyObligations: 900,
    hasActiveReschedulingRequest: false,
    familyStatus: "family_with_dependents",
    dependentsCount: 3,
    familyMembersCount: 5
  });
  assert(programmeFeed.statusCode === 201, `programme feed failed with ${programmeFeed.statusCode}`);

  for (const documentType of ["salary_certificate", "bank_statement"]) {
    const document = await requestJson(port, "POST", `/api/challenge-1/applications/${applicationId}/documents`, {
      documentType,
      fileName: `${documentType}-${unique}.pdf`,
      recognitionStatus: "accepted",
      authenticityRiskStatus: "low_risk",
      extractedSalary: documentType === "salary_certificate" ? 22000 : undefined
    });
    assert(document.statusCode === 201, `${documentType} failed with ${document.statusCode}`);
  }

  const assessment = await requestJson(port, "POST", `/api/challenge-1/applications/${applicationId}/assess`, {});
  assert(assessment.statusCode === 201, `assessment failed with ${assessment.statusCode}`);
  assert(assessment.body.assessmentRun.assessment.assessmentResult.finalAuthority === "human_officer_through_trustgate", "final authority is not TrustGate/human");
  assert(assessment.body.assessmentRun.assessment.assessmentResult.aiFinalApproval === false, "AI must not be final approval");

  return applicationId;
}

async function seedOfficeSession(session, unique) {
  await evalPage(session, `
    (() => {
      sessionStorage.setItem('arrearsflow-office-trustgate-session', JSON.stringify({
        sessionVersion: 'moei-office-session.v1',
        subjectId: 'OFFICE-UI-VERIFIER-${unique}',
        displayName: 'Office UI Verifier',
        role: 'Authorized officer',
        roleAr: 'موظف معتمد',
        groups: ['finance_collection'],
        privileges: ['office.login', 'seal.stamp'],
        registeredDevice: { trusted: true, deviceId: 'verifier-device-${unique}' },
        signature: { status: 'Qualified Demo Signature', signingPermission: 'Enabled' },
        trustGateRequestId: 'OFFICE-LOGIN-${unique}',
        loggedInAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
      }));
      return true;
    })()
  `);
}

async function verifyOfficeReview(session, applicationId, unique) {
  console.log("Waiting for live application in office case selector...");
  await waitForCondition(session, `
    (() => {
      const select = document.getElementById('caseSelect');
      return Boolean(select && [...select.options].some((option) => option.value === '${applicationId}'));
    })()
  `, 15000);

  console.log("Selecting live application in office UI...");
  await evalPage(session, `
    (() => {
      document.getElementById('caseSelect').value = '${applicationId}';
      document.getElementById('caseSelect').dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `);

  console.log("Waiting for selected case details to render...");
  await waitForCondition(session, `
    (() => {
      const text = document.body.textContent;
      return text.includes('${applicationId}') && text.includes('Office UI Live Customer ${unique}');
    })()
  `);

  console.log("Capturing office review screenshot...");
  await capturePng(
    session,
    path.join(__dirname, "..", "planning", "01-references", "challenge-1-live-ui-2026-06-06", "office-live-review-verifier.png")
  );

  console.log("Clicking approval preparation button...");
  await evalPage(session, "document.getElementById('approveBtn').click(); true");
  console.log("Waiting for server-side TrustGate pending status...");
  await waitForTrustGatePending(applicationId);
}

async function waitForTrustGatePending(applicationId, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const queue = await requestJson(port, "GET", "/api/challenge-1/office/queue");
    assert(queue.statusCode === 200, `office queue failed with ${queue.statusCode}`);
    const match = queue.body.applications.find((item) => item.applicationId === applicationId);
    if (match && (match.status === "trustgate_pending" || match.officeStatus === "trustgate_pending")) return match;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${applicationId} to reach trustgate_pending`);
}

async function main() {
  const unique = Date.now();
  console.log("Launching browser for office UI verifier...");
  const launched = await launchChromium();
  console.log(`Browser launched: ${launched.browserBin || "unknown browser"}`);
  const browserPort = new URL(launched.endpoint).port;
  let session = null;

  try {
    await withServer(port, async () => {
      console.log("Resetting live stores...");
      const reset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
      assert(reset.statusCode === 200, `reset failed with ${reset.statusCode}`);

      console.log("Seeding live application, programme feed, documents, and assessment...");
      const applicationId = await seedLiveApplication(unique);
      session = await createPage(browserPort, { width: 1440, height: 1200 });
      console.log("Opening office route...");
      await navigate(session, `${baseUrl}/office/housing-arrears/?lang=en`);
      await seedOfficeSession(session, unique);
      console.log("Office session seeded; reloading office route...");
      await navigate(session, `${baseUrl}/office/housing-arrears/?lang=en`);
      console.log("Verifying visible office review and TrustGate preparation...");
      await verifyOfficeReview(session, applicationId, unique);

      console.log("Checking server queue and audit after office UI action...");
      const queue = await requestJson(port, "GET", "/api/challenge-1/office/queue");
      assert(queue.statusCode === 200, `office queue failed with ${queue.statusCode}`);
      const match = queue.body.applications.find((item) => item.applicationId === applicationId);
      assert(match, "application missing from office queue after visible office review");
      assert(match.status === "trustgate_pending" || match.officeStatus === "trustgate_pending", `expected trustgate_pending after approval prep, got ${match.status || match.officeStatus}`);

      const audit = await requestJson(port, "GET", `/api/challenge-1/audit/${applicationId}`);
      assert(audit.statusCode === 200, `audit failed with ${audit.statusCode}`);
      assert(audit.body.auditEvents.some((item) => item.action === "office_prepare_trustgate_approval"), "missing office TrustGate-prep audit event");

      const finalReset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
      assert(finalReset.statusCode === 200, `final reset failed with ${finalReset.statusCode}`);
      const empty = await requestJson(port, "GET", "/api/challenge-1/test/empty-state");
      assert(empty.statusCode === 200 && empty.body.empty === true, "stores were not wiped after office UI verifier");
    });
  } finally {
    if (session) session.close();
    closeBrowser(launched);
  }

  console.log("Challenge 1 live UI office-review verifier passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
