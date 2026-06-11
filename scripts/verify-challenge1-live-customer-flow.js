const { assert, requestJson, withServer } = require("./challenge1-live-api-test-client");

const port = Number(process.env.TEST_PORT || 9722);
const unique = Date.now();

async function main() {
  await withServer(port, async () => {
    const reset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
    assert(reset.statusCode === 200, `reset failed with ${reset.statusCode}`);

    const created = await requestJson(port, "POST", "/api/challenge-1/applications", {
      language: "ar",
      channel: "customer_web",
      customer: {
        displayName: `Live Test Customer ${unique}`,
        identityRef: `TEST-${unique}`,
        emiratesId: `7841999${unique}`,
        phone: `050${String(unique).slice(-7)}`,
        email: `live-${unique}@example.test`
      },
      financial: {
        currentSalary: 18000,
        monthlyObligations: 1000,
        existingLoans: true
      },
      family: {
        dependentsCount: 2,
        familyMembersCount: 4
      },
      remarks: "Temporary arrears support request from live API verifier.",
      acknowledgement: true
    });
    assert(created.statusCode === 201, `application create failed with ${created.statusCode}`);
    const applicationId = created.body.application.applicationId;
    assert(applicationId, "missing applicationId");

    const earlyAssessment = await requestJson(port, "POST", `/api/challenge-1/applications/${applicationId}/assess`, {});
    assert(earlyAssessment.statusCode === 409, "assessment should wait for programme data");
    assert(earlyAssessment.body.status === "waiting_for_programme_data", "wrong no-programme-data status");

    const programmeFeed = await requestJson(port, "POST", "/api/challenge-1/programme-loans", {
      applicationId,
      beneficiaryId: `TEST-${unique}`,
      loanId: `LN-${unique}`,
      source: "verifier_feed",
      originalLoanAmount: 700000,
      remainingLoanBalance: 360000,
      originalApprovedRepaymentMonths: 300,
      remainingRepaymentMonths: 120,
      totalArrearsAmount: 12000,
      unpaidInstallmentsCount: 3,
      currentMonthlyInstallment: 3000,
      monthlyObligations: 1000,
      hasActiveReschedulingRequest: false,
      familyStatus: "family_with_dependents",
      dependentsCount: 2,
      familyMembersCount: 4
    });
    assert(programmeFeed.statusCode === 201, `programme feed failed with ${programmeFeed.statusCode}`);

    const salaryDoc = await requestJson(port, "POST", `/api/challenge-1/applications/${applicationId}/documents`, {
      documentType: "salary_certificate",
      fileName: `salary-${unique}.pdf`,
      recognitionStatus: "accepted",
      authenticityRiskStatus: "low_risk",
      extractedSalary: 18000
    });
    assert(salaryDoc.statusCode === 201, `salary document failed with ${salaryDoc.statusCode}`);

    const bankDoc = await requestJson(port, "POST", `/api/challenge-1/applications/${applicationId}/documents`, {
      documentType: "bank_statement",
      fileName: `bank-${unique}.pdf`,
      recognitionStatus: "accepted",
      authenticityRiskStatus: "low_risk"
    });
    assert(bankDoc.statusCode === 201, `bank document failed with ${bankDoc.statusCode}`);

    const assessment = await requestJson(port, "POST", `/api/challenge-1/applications/${applicationId}/assess`, {});
    assert(assessment.statusCode === 201, `assessment failed with ${assessment.statusCode}`);
    assert(assessment.body.assessmentRun.assessment.assessmentResult.finalAuthority === "human_officer_through_trustgate", "final authority is not TrustGate/human");
    assert(assessment.body.assessmentRun.assessment.assessmentResult.aiFinalApproval === false, "AI must not be final approval");

    const queue = await requestJson(port, "GET", "/api/challenge-1/office/queue");
    assert(queue.statusCode === 200, `queue failed with ${queue.statusCode}`);
    assert(queue.body.applications.some((item) => item.applicationId === applicationId), "application missing from office queue");

    const action = await requestJson(port, "POST", "/api/challenge-1/office/actions", {
      applicationId,
      officerId: "verifier_officer",
      actionType: "prepare_trustgate_approval",
      notes: "Verifier prepared application for TrustGate authorization."
    });
    assert(action.statusCode === 201, `office action failed with ${action.statusCode}`);

    const approval = await requestJson(port, "POST", "/api/challenge-1/trustgate/approval-callback", {
      applicationId,
      authorizationResult: "approved",
      authorizedBy: "verifier_trustgate",
      trustGateTransactionId: `TG-${unique}`
    });
    assert(approval.statusCode === 201, `TrustGate callback failed with ${approval.statusCode}`);
    assert(approval.body.seal.sealId, "missing approval seal");

    const seal = await requestJson(port, "GET", `/api/challenge-1/seals/${approval.body.seal.sealId}`);
    assert(seal.statusCode === 200, `seal lookup failed with ${seal.statusCode}`);

    const audit = await requestJson(port, "GET", `/api/challenge-1/audit/${applicationId}`);
    assert(audit.statusCode === 200, `audit failed with ${audit.statusCode}`);
    assert(audit.body.auditEvents.length >= 5, "expected audit events from live flow");

    const finalReset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
    assert(finalReset.statusCode === 200, `final reset failed with ${finalReset.statusCode}`);
    const empty = await requestJson(port, "GET", "/api/challenge-1/test/empty-state");
    assert(empty.statusCode === 200 && empty.body.empty === true, "stores were not wiped after verifier");
  });

  console.log("Challenge 1 live customer-flow verifier passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
