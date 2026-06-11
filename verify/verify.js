const verifyCopy = {
  ar: {
    eyebrow: "التحقق من الاعتماد الرقمي",
    title: "التحقق من ختم الاعتماد المرتبط بالإجراء",
    intro: "تؤكد هذه الصفحة أن قرار الاعتماد صادر من موظف معتمد، ومرتبط بالحالة والإجراء وبصمة البيانات.",
    verified: "ختم موثق",
    missing: "لم يتم العثور على ختم",
    missingCopy: "افتح سجل التدقيق بعد اعتماد الحالة من مساحة عمل الموظف، ثم استخدم رابط التحقق من الختم.",
    stampId: "رقم الختم",
    caseId: "رقم الحالة",
    officer: "الموظف",
    role: "الدور",
    action: "الإجراء",
    approvedAt: "وقت الاعتماد",
    method: "طريقة الاعتماد",
    challenge: "رقم التحدي",
    hash: "بصمة البيانات",
    contract: "نسخة العقد",
    note: "التحقق هنا لا يعني أن الذكاء الاصطناعي اعتمد القرار. الذكاء الاصطناعي يجهز التوصية، والموظف هو من يعتمد الإجراء النهائي.",
    howTitle: "كيف يعمل التحقق",
    steps: [
      "يربط النظام الختم برقم الحالة والإجراء وبصمة البيانات.",
      "يؤكد الموظف الاعتماد عبر مطابقة رقم ورمز PIN في طبقة التحقق.",
      "يتم حفظ سجل الختم في سجل التدقيق.",
      "تقرأ صفحة التحقق سجل الختم وتعرض تفاصيل الاعتماد."
    ]
  },
  en: {
    eyebrow: "Digital approval verification",
    title: "Verify A Transaction-Bound Approval Seal",
    intro: "This page confirms that an approval was issued by a verified officer and tied to the case, action, and payload hash.",
    verified: "Verified seal",
    missing: "No seal found",
    missingCopy: "Open the audit record after approving a case from the officer workspace, then use the seal verification link.",
    stampId: "Stamp ID",
    caseId: "Case ID",
    officer: "Officer",
    role: "Role",
    action: "Action",
    approvedAt: "Approved at",
    method: "Approval method",
    challenge: "Challenge ID",
    hash: "Payload hash",
    contract: "Contract version",
    note: "Verification does not mean AI approved the decision. AI prepares the recommendation; the officer authorizes the final action.",
    howTitle: "How verification works",
    steps: [
      "The system binds the seal to the case, action, and payload hash.",
      "The officer confirms the approval through number matching and PIN verification.",
      "The seal record is saved into the audit trail.",
      "The verification page reads the seal record and displays the approval details."
    ]
  }
};

function getLang() {
  return window.routeShellLang || new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("arrearsflow-lang") || "ar";
}

function applyVerifyCopy() {
  const lang = getLang();
  const copy = verifyCopy[lang] || verifyCopy.ar;
  document.querySelectorAll("[data-verify-copy]").forEach((node) => {
    node.textContent = copy[node.dataset.verifyCopy] || node.dataset.verifyCopy;
  });
  document.getElementById("verificationSteps").innerHTML = copy.steps.map((step) => `<li>${step}</li>`).join("");
  renderSeal();
}

function localizeSealValue(key, seal, lang) {
  const value = seal[key];
  if (lang !== "ar") return value;
  const arabicValues = {
    approvedBy: seal.approvedBy?.replace(/^Officer\s+/, "الموظف "),
    role: seal.arRole || (seal.role === "Finance Review Officer" ? "موظف مراجعة مالية" : seal.role),
    method: seal.arMethod || (seal.method === "Rolling code challenge" ? "تحدي رمز متغير" : seal.method),
    contractVersion: "سجل ختم اعتماد",
    approvedAt: seal.approvedAt ? new Date(seal.approvedAt).toLocaleString("ar-AE") : seal.approvedAt
  };
  return arabicValues[key] || value;
}

async function loadSeededSeal(stampId) {
  try {
    const response = await fetch("/demo-state/approved-flow.seed.json", { cache: "no-store" });
    if (!response.ok) return null;
    const seed = await response.json();
    const seals = JSON.parse(seed.localStorage?.["arrearsflow-approval-seals"] || "[]");
    if (!stampId) return seals[0] || null;
    return seals.find((seal) => seal.stampId === stampId) || null;
  } catch {
    return null;
  }
}

async function renderSeal() {
  const lang = getLang();
  const copy = verifyCopy[lang] || verifyCopy.ar;
  const workflow = window.ArrearsFlowShared?.workflow;
  const stampId = new URLSearchParams(window.location.search).get("stamp");
  const seal = workflow?.getApprovalSeal(stampId) || await loadSeededSeal(stampId);
  const panel = document.getElementById("verificationPanel");

  if (!seal) {
    panel.innerHTML = `
      <span class="verification-status missing">${copy.missing}</span>
      <h2>${copy.missing}</h2>
      <p>${copy.missingCopy}</p>
    `;
    return;
  }

  const action = lang === "ar" ? seal.arAction || seal.action : seal.action;
  panel.innerHTML = `
    <span class="verification-status">${copy.verified}</span>
    <h2>${seal.stampId}</h2>
    <div class="seal-record">
      ${field(copy.stampId, seal.stampId)}
      ${field(copy.caseId, seal.caseId)}
      ${field(copy.officer, localizeSealValue("approvedBy", seal, lang))}
      ${field(copy.role, localizeSealValue("role", seal, lang))}
      ${field(copy.action, action)}
      ${field(copy.approvedAt, localizeSealValue("approvedAt", seal, lang))}
      ${field(copy.method, localizeSealValue("method", seal, lang))}
      ${field(copy.challenge, seal.challengeId)}
      ${field(copy.hash, seal.payloadHash)}
      ${field(copy.contract, localizeSealValue("contractVersion", seal, lang))}
    </div>
    <p class="verify-note">${copy.note}</p>
  `;
}

function field(label, value) {
  return `<div><span>${label}</span><strong>${value || "-"}</strong></div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  applyVerifyCopy();
  const toggle = document.getElementById("languageToggle");
  if (toggle) toggle.addEventListener("click", () => window.setTimeout(applyVerifyCopy, 0));
});
