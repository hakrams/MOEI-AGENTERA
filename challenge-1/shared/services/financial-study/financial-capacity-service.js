(function attachFinancialCapacityService(root, factory) {
  const service = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }

  if (root) {
    root.ArrearsFlowShared = root.ArrearsFlowShared || {};
    root.ArrearsFlowShared.financialCapacityService = service;
  }
})(typeof window !== "undefined" ? window : globalThis, function createFinancialCapacityService() {
  function roundMoney(value) {
    return Math.round(Number(value || 0));
  }

  function ratio(numerator, denominator) {
    return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
  }

  function calculate(caseData = {}, programmeLoan = {}) {
    const currentSalary = Number(caseData.currentSalary || caseData.monthlyIncome || 0);
    const monthlyObligations = Number(caseData.monthlyObligations || 0);
    const currentMonthlyInstallment = Number(programmeLoan.currentMonthlyInstallment || caseData.currentMonthlyInstallment || 0);
    const arrearsAmount = Number(programmeLoan.totalArrearsAmount || caseData.arrearsAmount || 0);
    const familyMembersCount = Math.max(1, Number(programmeLoan.familyMembersCount || caseData.familyMembersCount || Number(caseData.dependents || 0) + 1));
    const maxAllowedDeductionAmount = roundMoney(currentSalary * 0.2);
    const proposedReschedulingMonths = Math.max(6, Math.min(Number(programmeLoan.remainingRepaymentMonths || 48), Math.ceil(arrearsAmount / Math.max(maxAllowedDeductionAmount, 1))));
    const proposedMonthlyInstallment = roundMoney(arrearsAmount / Math.max(proposedReschedulingMonths, 1));
    const proposedTotalMonthlyDeduction = currentMonthlyInstallment + proposedMonthlyInstallment;

    return {
      currentSalary,
      monthlyObligations,
      currentMonthlyInstallment,
      maxAllowedDeductionAmount,
      proposedMonthlyInstallment,
      proposedTotalMonthlyDeduction,
      proposedReschedulingMonths,
      obligationsRatio: ratio(monthlyObligations, currentSalary),
      currentInstallmentRatio: ratio(currentMonthlyInstallment, currentSalary),
      proposedDeductionRate: ratio(proposedMonthlyInstallment, currentSalary),
      proposedTotalDeductionRate: ratio(proposedTotalMonthlyDeduction, currentSalary),
      averageIncomePerFamilyMember: roundMoney(currentSalary / familyMembersCount)
    };
  }

  return {
    calculate
  };
});
