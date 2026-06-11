// Server-only service — generates AI case brief narrative using Claude.
// Called after deterministic assessment pipeline completes.
// Input: full assessment object + anthropicClient.
// Output: { narrativeAr, narrativeEn, keyInsights: string[], confidenceLabel, generatedAt }

const REASONING_SYSTEM = `You are a senior housing loan officer at the UAE Ministry of Energy and Infrastructure (برنامج الشيخ زايد للإسكان).

You receive a structured financial case assessment that has already been computed by a deterministic policy engine. Your task is to write a concise, professional officer-level reasoning narrative in BOTH Arabic and English.

The narrative explains WHY the recommendation was reached — like a senior officer explaining to a junior officer in a case briefing. It must:
- Be grounded only in the provided data (do not invent figures)
- Reference the 20% deduction cap, obligations ratio, and period rule where relevant
- Be warm but formal — UAE government professional tone
- Arabic narrative: 100-130 words
- English narrative: 80-110 words
- Key insights: exactly 3 short bullet points in both Arabic and English

Return ONLY this JSON (no markdown, no explanation):
{
  "narrativeAr": "string — Arabic narrative 100-130 words",
  "narrativeEn": "string — English narrative 80-110 words",
  "keyInsights": [
    { "ar": "Arabic insight 1", "en": "English insight 1" },
    { "ar": "Arabic insight 2", "en": "English insight 2" },
    { "ar": "Arabic insight 3", "en": "English insight 3" }
  ]
}`;

function buildCaseContext(assessment) {
  const study = assessment.financialStudy || {};
  const rec = assessment.recommendation || {};
  const conf = assessment.confidence || {};
  const policy = assessment.policy || {};

  return {
    recommendationPath: rec.recommendationPath,
    recommendationLabel: rec.recommendationLabel,
    recommendationLabelAr: rec.recommendationLabelAr,
    confidenceScore: conf.score,
    confidenceLabel: conf.label,
    confidenceReasons: conf.reasons || [],
    salary: study.currentSalary,
    maxAllowedDeduction: study.maxAllowedDeductionAmount,
    proposedInstallment: study.proposedMonthlyInstallment,
    proposedMonths: study.proposedReschedulingMonths,
    arrearsAmount: study.arrearsAmount,
    obligationsRatioPct: study.obligationsRatioPct,
    familyMemberIncome: study.averageIncomePerFamilyMember,
    unpaidInstallments: study.unpaidInstallmentsCount,
    rulesSummary: (policy.ruleTrace || []).map((r) => ({
      id: r.id,
      status: r.status,
      label: r.label,
      reason: r.reason
    })),
    escalationRequired: rec.escalationRequired,
    escalationReasons: rec.escalationReasons || [],
    reasoningBullets: rec.reasoningBullets || [],
    reasoningBulletsAr: rec.reasoningBulletsAr || []
  };
}

function fallbackNarrative(assessment) {
  const rec = assessment.recommendation || {};
  const study = assessment.financialStudy || {};
  const path = rec.recommendationPath || "unknown";

  const narrativeMap = {
    ready_for_trustgate: {
      ar: `بناءً على الدراسة المالية المنجزة، استوفى المتعامل المتطلبات الأساسية لإعادة الجدولة. الراتب الشهري يتيح خصم القسط المقترح ضمن حد ٢٠٪ المعتمد، وتمّ التحقق من اكتمال المستندات المطلوبة. لا توجد طلبات نشطة تعيق المعالجة. مستوى الثقة في هذه التوصية مرتفع، وتبقى صلاحية الاعتماد النهائي للموظف المختص عبر TrustGate.`,
      en: `Based on the completed financial study, the applicant meets the core rescheduling requirements. The proposed monthly installment falls within the 20% deduction cap, required documents are complete, and no conflicting active requests were found. Confidence in this recommendation is high. Final authorization remains with the reviewing officer through TrustGate.`
    },
    refer_human_review: {
      ar: `تستوجب هذه الحالة مراجعة بشرية متخصصة نظراً لعوامل تستدعي تقديراً إضافياً من الموظف. قد تشمل هذه العوامل ارتفاع نسبة الالتزامات، أو عدم استقرار الدخل، أو ظروفاً خاصة تؤثر على القدرة التسديدية. يُنصح الموظف بالاطلاع على تفاصيل مسار القواعد وأسباب التصعيد قبل اتخاذ القرار.`,
      en: `This case requires specialist human review due to factors that warrant additional officer judgment. These may include elevated obligations ratio, income instability, or special circumstances affecting repayment capacity. The officer is advised to review the rule trace and escalation reasons in detail before making a determination.`
    },
    request_documents: {
      ar: `تعذّر إتمام التقييم المالي بسبب نقص في المستندات المطلوبة أو وجود ملاحظات عليها. يجب على المتعامل استيفاء متطلبات المستندات المحددة حتى يتسنى للنظام إجراء الدراسة المالية الكاملة وإصدار التوصية المناسبة.`,
      en: `The financial assessment could not be completed due to missing or flagged required documents. The applicant must fulfill the specified document requirements before a full financial study and recommendation can be issued.`
    },
    reject_due_active_request: {
      ar: `تم رفض هذا الطلب تلقائياً لوجود طلب إعادة جدولة نشط مسبق مرتبط بهذا المتعامل. لا يُسمح بمعالجة طلب جديد إلى حين إغلاق الطلب القائم أو إنهائه رسمياً.`,
      en: `This application was automatically rejected due to an existing active rescheduling request linked to this applicant. A new request cannot be processed until the existing request is formally closed or resolved.`
    }
  };

  const found = narrativeMap[path] || {
    ar: "الدراسة المالية مكتملة. راجع التفاصيل أدناه.",
    en: "Financial study complete. Review details below."
  };

  return {
    narrativeAr: found.ar,
    narrativeEn: found.en,
    keyInsights: [
      { ar: rec.reasoningBulletsAr?.[0] || "الدراسة المالية مكتملة", en: rec.reasoningBullets?.[0] || "Financial study complete" },
      { ar: `مستوى الثقة: ${study.confidenceLabel || "محدد"}`, en: `Confidence: ${study.confidenceLabel || "determined"}` },
      { ar: "القرار النهائي للموظف عبر TrustGate", en: "Final decision rests with officer via TrustGate" }
    ],
    source: "fallback",
    generatedAt: new Date().toISOString()
  };
}

async function generateNarrative({ assessment, anthropicClient }) {
  if (!anthropicClient) {
    return fallbackNarrative(assessment);
  }

  const caseContext = buildCaseContext(assessment);

  try {
    const response = await anthropicClient.messages.create({
      model: process.env.CLAUDE_REASONING_MODEL || "claude-sonnet-4-6",
      max_tokens: 600,
      system: REASONING_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Case assessment data:\n${JSON.stringify(caseContext, null, 2)}`
        }
      ]
    });

    const raw = response.content?.[0]?.text || "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    return {
      narrativeAr: parsed.narrativeAr || fallbackNarrative(assessment).narrativeAr,
      narrativeEn: parsed.narrativeEn || fallbackNarrative(assessment).narrativeEn,
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.slice(0, 3) : fallbackNarrative(assessment).keyInsights,
      source: "claude",
      model: process.env.CLAUDE_REASONING_MODEL || "claude-sonnet-4-6",
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("[reasoning-narrative] Claude call failed, using fallback:", err.message);
    return fallbackNarrative(assessment);
  }
}

module.exports = { generateNarrative };
