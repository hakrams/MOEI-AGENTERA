const routeShellCopy = {
  ar: {
    brandMark: "وزارة",
    toggle: "English",
    country: "الإمارات العربية المتحدة",
    ministry: "وزارة الطاقة والبنية التحتية",
    platform: "منصة عمليات الخدمات لوزارة الطاقة والبنية التحتية",
    gatewayTitle: "بوابة تجربة منصة عمليات الخدمات",
    gatewayText: "اختر بوابة المتعامل أو مساحة عمل الموظف لاستعراض وحدات الخدمات الذكية.",
    trustgateTitle: "TrustGate — بوابة الثقة",
    trustgateText: "طبقة التحقق من الهوية والصلاحيات التي تحمي دخول الموظفين والاعتماد النهائي.",
    openTrustGate: "فتح TrustGate",
    customerPortal: "بوابة المتعامل",
    customerText: "خدمات رقمية تساعد المتعامل على تقديم الطلبات وتتبع حالتها.",
    officePortal: "مساحة عمل الموظف",
    officeText: "مساحة مراجعة واعتماد تساعد الموظف على اتخاذ القرار مع بقاء الاعتماد النهائي بشرياً.",
    verifyPortal: "التحقق من الختم",
    verifyText: "صفحة عامة للتحقق من ختم الاعتماد المرتبط بالحالة والإجراء وبصمة البيانات.",
    openCustomer: "فتح بوابة المتعامل",
    openOffice: "فتح مساحة الموظف",
    openVerify: "فتح التحقق من الختم",
    platformHome: "العودة إلى الرئيسية",
    customerHome: "العودة إلى بوابة المتعامل",
    officeHome: "العودة إلى مساحة الموظف",
    catalogueTitle: "الخدمات المتاحة",
    officeCatalogueTitle: "مساحات العمل المتاحة",
    catalogueText: "اختر وحدة الخدمة للمتابعة.",
    housingTitle: "إعادة جدولة متأخرات الإسكان",
    housingText: "تقديم الطلب، فحص المستندات، وإرسال الحالة لمراجعة النظام والموظف.",
    countryTitle: "CountryIQ — استخبارات الدول",
    countryText: "منصة استخباراتية للمسؤولين تولّد إحاطات استراتيجية موثّقة المصادر قبل الاجتماعات الثنائية.",
    openCountryIQ: "فتح منصة CountryIQ",
    ddaHubTitle: "DDAHub — تفويض الخصم المباشر",
    ddaHubText: "طبقة تفصل هوية TrustGate عن تفويض الخصم والملف المالي قبل دراسة إعادة الجدولة.",
    openDdaHub: "فتح DDAHub",
    omniTitle: "مركز التواصل الموحد — OneCX",
    omniText: "تواصل، تتبع طلبك، واحصل على إجابات فورية من أي قناة.",
    leadershipTitle: "لوحة قيادة الخدمات",
    leadershipText: "مؤشرات أداء حية: حجم القنوات، المشاعر، التصعيد، وكفاءة النماذج.",
    ready: "جاهزة",
    planned: "مخطط لها",
    open: "فتح الخدمة"
  },
  en: {
    brandMark: "MOEI",
    toggle: "العربية",
    country: "United Arab Emirates",
    ministry: "Ministry of Energy & Infrastructure",
    platform: "MOEI Service Operations Platform",
    gatewayTitle: "Service Operations Demo Gateway",
    gatewayText: "Choose the customer portal or officer workspace to explore the intelligent service modules.",
    trustgateTitle: "TrustGate — Identity Command Center",
    trustgateText: "The identity and privilege layer that protects officer access and final authorization.",
    openTrustGate: "Open TrustGate",
    customerPortal: "Customer Portal",
    customerText: "Digital services for submitting requests and tracking their status.",
    officePortal: "Officer Workspace",
    officeText: "Review and approval workspaces where AI recommends and verified officers authorize.",
    verifyPortal: "Seal Verification",
    verifyText: "Public verification for the approval seal tied to the case, action, and payload hash.",
    openCustomer: "Open Customer Portal",
    openOffice: "Open Officer Workspace",
    openVerify: "Open Seal Verification",
    platformHome: "Back to Platform Home",
    customerHome: "Back to Customer Portal",
    officeHome: "Back to Officer Workspace",
    catalogueTitle: "Available Services",
    officeCatalogueTitle: "Available Workspaces",
    catalogueText: "Choose a service module to continue.",
    housingTitle: "Housing Arrears Rescheduling",
    housingText: "Submit the request, check documents, and send the case for system and officer review.",
    countryTitle: "CountryIQ — Country Intelligence",
    countryText: "Strategic intelligence platform for officials. Generates source-verified briefings before bilateral meetings.",
    openCountryIQ: "Open CountryIQ",
    ddaHubTitle: "DDAHub — Direct Debit Authority",
    ddaHubText: "A separate mandate and financial-persona layer between TrustGate identity and arrears recommendations.",
    openDdaHub: "Open DDAHub",
    omniTitle: "OneCX — Unified Contact Center",
    omniText: "Chat, track your case, and get instant answers from any channel.",
    leadershipTitle: "Service Leadership Dashboard",
    leadershipText: "Live KPIs: channel volume, sentiment, escalation risk, and model efficiency.",
    ready: "Ready",
    planned: "Planned",
    open: "Open Service"
  }
};

let routeShellLang = new URLSearchParams(window.location.search).get("lang")
  || localStorage.getItem("arrearsflow-lang")
  || "ar";

function applyRouteShellLanguage() {
  const copy = routeShellCopy[routeShellLang] || routeShellCopy.ar;
  document.documentElement.lang = routeShellLang;
  document.documentElement.dir = routeShellLang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-copy]").forEach((node) => {
    node.textContent = copy[node.dataset.copy] || node.dataset.copy;
  });
  document.querySelectorAll("[data-lang-link]").forEach((node) => {
    const url = new URL(node.getAttribute("href"), window.location.origin);
    url.searchParams.set("lang", routeShellLang);
    node.setAttribute("href", `${url.pathname}${url.search}`);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyRouteShellLanguage();
  const toggle = document.getElementById("languageToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      routeShellLang = routeShellLang === "ar" ? "en" : "ar";
      localStorage.setItem("arrearsflow-lang", routeShellLang);
      applyRouteShellLanguage();
    });
  }
});
