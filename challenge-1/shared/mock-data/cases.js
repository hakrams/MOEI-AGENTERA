window.ArrearsFlowShared = window.ArrearsFlowShared || {};

window.ArrearsFlowShared.cases = [
  {
    id: "MOEI-HOUSING-2026-001",
    applicantName: "Aisha Al Mansoori",
    applicantNameAr: "عائشة المنصوري",
    emiratesIdMasked: "784-1988-XXXXXXX-1",
    phoneMasked: "+971 50 XXX 2184",
    emailMasked: "a.almansoori@example.ae",
    arrearsAmount: 42000,
    monthsDelayed: 9,
    monthlyIncome: 18000,
    monthlyObligations: 6500,
    dependents: 5,
    employmentStatus: "Employed",
    employmentStatusAr: "موظفة",
    reason: "Temporary salary reduction and family medical expenses.",
    reasonAr: "انخفاض مؤقت في الراتب ومصاريف علاجية للأسرة.",
    existingLoans: true,
    salaryStatus: "valid",
    bankStatus: "valid"
  },
  {
    id: "MOEI-HOUSING-2026-002",
    applicantName: "Saeed Al Nuaimi",
    applicantNameAr: "سعيد النعيمي",
    emiratesIdMasked: "784-1979-XXXXXXX-8",
    phoneMasked: "+971 55 XXX 7842",
    emailMasked: "s.alnuaimi@example.ae",
    arrearsAmount: 30000,
    monthsDelayed: 6,
    monthlyIncome: 15000,
    monthlyObligations: 4000,
    dependents: 3,
    employmentStatus: "Employed",
    employmentStatusAr: "موظف",
    reason: "Requesting rescheduling after temporary family expenses.",
    reasonAr: "طلب إعادة الجدولة بعد مصاريف أسرية مؤقتة.",
    existingLoans: false,
    salaryStatus: "invalid",
    bankStatus: "not_required"
  },
  {
    id: "MOEI-HOUSING-2026-003",
    applicantName: "Mariam Al Ketbi",
    applicantNameAr: "مريم الكتبي",
    emiratesIdMasked: "784-1992-XXXXXXX-4",
    phoneMasked: "+971 56 XXX 9031",
    emailMasked: "m.alketbi@example.ae",
    arrearsAmount: 96000,
    monthsDelayed: 18,
    monthlyIncome: 12000,
    monthlyObligations: 8900,
    dependents: 6,
    employmentStatus: "Salary reduced",
    employmentStatusAr: "تم تخفيض الراتب",
    reason: "Salary reduction, existing obligations, and urgent household expenses.",
    reasonAr: "انخفاض الراتب ووجود التزامات ومصاريف منزلية عاجلة.",
    existingLoans: true,
    salaryStatus: "valid",
    bankStatus: "valid"
  }
];

window.ArrearsFlowShared.statusLabels = {
  draft: { en: "Draft", ar: "مسودة" },
  submitted: { en: "Submitted", ar: "تم التقديم" },
  system_review: { en: "System review", ar: "مراجعة النظام" },
  officer_review: { en: "Officer review", ar: "مراجعة الموظف" },
  more_information: { en: "More information requested", ar: "مطلوب استكمال البيانات" },
  approved: { en: "Approved", ar: "تم الاعتماد" }
};
