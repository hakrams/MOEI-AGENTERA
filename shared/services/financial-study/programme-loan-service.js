(function attachProgrammeLoanService(root, factory) {
  const service = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.programmeLoanService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createProgrammeLoanService(root) {
  const CONTRACT_VERSION = "programme-loan.v1";

  const fallbackProgrammeLoans = [
    {
      contractVersion: CONTRACT_VERSION,
      beneficiaryId: "BEN-001",
      caseId: "MOEI-HOUSING-2026-001",
      loanId: "EDB-HOUSING-2018-001",
      source: "simulated_moei_edb_programme_data",
      retrievedAt: "2026-06-05T19:45:00+04:00",
      originalLoanAmount: 720000,
      remainingLoanBalance: 388000,
      originalApprovedRepaymentMonths: 240,
      remainingRepaymentMonths: 132,
      totalArrearsAmount: 42000,
      unpaidInstallmentsCount: 9,
      currentMonthlyInstallment: 3100,
      paymentHistorySummary: {
        lastPaidAt: "2025-08-30T00:00:00+04:00",
        missedInstallments: 9,
        pattern: "temporary_interruption_after_regular_payments"
      },
      hasActiveReschedulingRequest: false,
      activeReschedulingRequest: null,
      previousApplications: [],
      familyStatus: "married_with_dependents",
      dependentsCount: 5,
      familyMembersCount: 6
    },
    {
      contractVersion: CONTRACT_VERSION,
      beneficiaryId: "BEN-002",
      caseId: "MOEI-HOUSING-2026-002",
      loanId: "EDB-HOUSING-2020-044",
      source: "simulated_moei_edb_programme_data",
      retrievedAt: "2026-06-05T19:45:00+04:00",
      originalLoanAmount: 540000,
      remainingLoanBalance: 402000,
      originalApprovedRepaymentMonths: 216,
      remainingRepaymentMonths: 158,
      totalArrearsAmount: 30000,
      unpaidInstallmentsCount: 6,
      currentMonthlyInstallment: 2550,
      paymentHistorySummary: {
        lastPaidAt: "2025-11-30T00:00:00+04:00",
        missedInstallments: 6,
        pattern: "short_arrears_with_document_gap"
      },
      hasActiveReschedulingRequest: false,
      activeReschedulingRequest: null,
      previousApplications: [],
      familyStatus: "married",
      dependentsCount: 3,
      familyMembersCount: 4
    },
    {
      contractVersion: CONTRACT_VERSION,
      beneficiaryId: "BEN-003",
      caseId: "MOEI-HOUSING-2026-003",
      loanId: "EDB-HOUSING-2016-019",
      source: "simulated_moei_edb_programme_data",
      retrievedAt: "2026-06-05T19:45:00+04:00",
      originalLoanAmount: 850000,
      remainingLoanBalance: 612000,
      originalApprovedRepaymentMonths: 240,
      remainingRepaymentMonths: 96,
      totalArrearsAmount: 96000,
      unpaidInstallmentsCount: 18,
      currentMonthlyInstallment: 4600,
      paymentHistorySummary: {
        lastPaidAt: "2024-12-30T00:00:00+04:00",
        missedInstallments: 18,
        pattern: "long_arrears_with_salary_reduction"
      },
      hasActiveReschedulingRequest: false,
      activeReschedulingRequest: null,
      previousApplications: [
        {
          requestId: "MOEI-RESCH-2025-117",
          status: "closed_no_action",
          closedAt: "2025-09-15T00:00:00+04:00"
        }
      ],
      familyStatus: "married_with_dependents",
      dependentsCount: 6,
      familyMembersCount: 7
    }
  ];

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function sourceData() {
    const sharedLoans = root?.ArrearsFlowShared?.programmeLoans;
    return Array.isArray(sharedLoans) && sharedLoans.length > 0
      ? sharedLoans
      : fallbackProgrammeLoans;
  }

  function getByCaseId(caseId) {
    const found = sourceData().find((item) => item.caseId === caseId);
    return found ? clone(found) : null;
  }

  function buildFromCase(caseData = {}) {
    const existing = getByCaseId(caseData.id || caseData.caseId);
    if (existing) return existing;

    const monthlyIncome = Number(caseData.currentSalary || caseData.monthlyIncome || 0);
    const arrearsAmount = Number(caseData.arrearsAmount || 0);
    const currentMonthlyInstallment = Math.max(1, Math.round(monthlyIncome * 0.15));
    return {
      contractVersion: CONTRACT_VERSION,
      beneficiaryId: caseData.beneficiaryId || caseData.applicantId || `BEN-${String(caseData.id || Date.now()).slice(-3)}`,
      caseId: caseData.id || caseData.caseId || `MOEI-HOUSING-${Date.now()}`,
      loanId: caseData.loanId || "EDB-HOUSING-SIMULATED",
      source: "simulated_moei_edb_programme_data",
      retrievedAt: new Date().toISOString(),
      originalLoanAmount: Number(caseData.originalLoanAmount || 600000),
      remainingLoanBalance: Number(caseData.remainingLoanBalance || Math.max(arrearsAmount * 8, 0)),
      originalApprovedRepaymentMonths: Number(caseData.originalApprovedRepaymentMonths || 240),
      remainingRepaymentMonths: Number(caseData.remainingRepaymentMonths || 120),
      totalArrearsAmount: arrearsAmount,
      unpaidInstallmentsCount: Number(caseData.monthsDelayed || caseData.unpaidInstallmentsCount || 0),
      currentMonthlyInstallment,
      paymentHistorySummary: {
        lastPaidAt: null,
        missedInstallments: Number(caseData.monthsDelayed || 0),
        pattern: "simulated_from_case_fields"
      },
      hasActiveReschedulingRequest: Boolean(caseData.hasActiveReschedulingRequest),
      activeReschedulingRequest: caseData.hasActiveReschedulingRequest
        ? {
          requestId: caseData.activeRequestId || "MOEI-RESCH-ACTIVE",
          status: "active",
          openedAt: new Date().toISOString()
        }
        : null,
      previousApplications: Array.isArray(caseData.previousApplications) ? clone(caseData.previousApplications) : [],
      familyStatus: caseData.familyStatus || "not_specified",
      dependentsCount: Number(caseData.dependents || caseData.dependentsCount || 0),
      familyMembersCount: Math.max(1, Number(caseData.familyMembersCount || caseData.dependents || 0) + 1)
    };
  }

  return {
    CONTRACT_VERSION,
    getByCaseId,
    list: () => clone(sourceData()),
    buildFromCase
  };
});
