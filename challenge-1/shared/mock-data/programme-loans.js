window.ArrearsFlowShared = window.ArrearsFlowShared || {};

window.ArrearsFlowShared.programmeLoans = [
  {
    contractVersion: "programme-loan.v1",
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
    contractVersion: "programme-loan.v1",
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
    contractVersion: "programme-loan.v1",
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
