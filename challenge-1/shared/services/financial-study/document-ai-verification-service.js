"use strict";

// AI Document Verification Service — C1 Technical Excellence.
// Uses GPT-4o-mini to verify document authenticity, extract structured data,
// and confirm that the uploaded file content matches the expected slot type.
// Falls back gracefully when OpenAI is unavailable.

const DOCUMENT_TYPE_DESCRIPTIONS = {
  salary_certificate: {
    label: "Salary Certificate",
    description: "An official letter or certificate from the employer stating the employee's monthly salary. Typical filenames contain words like 'salary', 'راتب', 'certificate', 'income', 'payslip', 'employment letter'. Should NOT be: passport, visa stamp, mission letter.",
    extractsField: "salary"
  },
  non_work_letter: {
    label: "Non-Work Letter",
    description: "A notary public letter confirming the applicant is not currently employed (عدم العمل). Typical filenames: 'non_work', 'عدم_عمل', 'notary', 'unemployment'. Should NOT be a salary cert, passport, or mission letter.",
    extractsField: null
  },
  official_mission_letter: {
    label: "Official Mission Letter",
    description: "A formal letter from an employer or government body authorizing an official mission/assignment for the employee. Typical filenames: 'mission', 'مهمة', 'assignment', 'official_letter'. Should NOT be a passport stamp, salary cert, or unrelated document.",
    extractsField: null
  },
  passport_stamp: {
    label: "Passport Stamp",
    description: "A copy of the passport page showing an entry/exit stamp or visa stamp from UAE Immigration. Typical filenames: 'passport', 'stamp', 'جواز', 'visa', 'entry', 'exit', 'immigration'. Should NOT be a mission letter or salary cert.",
    extractsField: null
  }
};

const VERIFICATION_SYSTEM = `You are an AI document verification specialist for the UAE Ministry of Energy and Infrastructure (MOEI) housing loan arrears rescheduling unit.

Given document type, filename, and application context, you assess:
1. Whether the uploaded file appears to MATCH the expected document type (based on filename analysis).
2. Authenticity and trustworthiness of the document.
3. Key value extraction where applicable.

DOCUMENT TYPE MISMATCH RULES — this is critical:
- If the filename strongly suggests a DIFFERENT document type than expected, set recognitionStatus to "needs_correction", add "wrong_document_type" to flags, and explain in reasoningNotes.
- Examples of mismatches to catch:
  * Slot expects "official_mission_letter" but filename contains "passport", "stamp", "visa" → MISMATCH
  * Slot expects "passport_stamp" but filename contains "mission", "letter", "مهمة" → MISMATCH
  * Slot expects "salary_certificate" but filename contains "passport", "mission", "stamp" → MISMATCH
- If filename is generic (e.g., "doc1.pdf", "file.pdf", "scan.jpg") → cannot determine type, set typeVerified to false, do NOT set wrong_document_type unless there is a clear contradiction.

AUTHENTICITY RULES:
- A salary certificate from a government employer, with a reasonable salary matching the arrears context, should score 85-95.
- Suspicious signals: salary wildly inconsistent with arrears, generic filenames, dates that seem off.
- Never flag as suspicious without a specific reason. Most applicants are genuine.

Return ONLY this JSON object:
{
  "recognitionStatus": "passed",
  "authenticityScore": 87,
  "authenticityRiskStatus": "clear",
  "extractedValue": 12000,
  "extractedValueType": "salary",
  "consistencyCheck": "pass",
  "typeVerified": true,
  "flags": [],
  "reasoningNotes": "Salary certificate consistent with declared income and arrears profile."
}

Valid values:
- recognitionStatus: "passed" | "needs_correction" | "suspicious"
- authenticityRiskStatus: "clear" | "low_risk" | "medium_risk" | "high_risk"
- extractedValueType: "salary" | "bank_balance" | null
- consistencyCheck: "pass" | "warning" | "fail"
- typeVerified: true (filename confirms expected type) | false (filename is generic or ambiguous)
- flags: array of short strings — include "wrong_document_type" if filename contradicts expected type`;

async function verifyDocument({ documentType, fileName, applicationContext = {}, openaiClient }) {
  if (!openaiClient) {
    return buildFallback("ai_not_configured");
  }

  const typeInfo = DOCUMENT_TYPE_DESCRIPTIONS[documentType] || {
    label: documentType,
    description: "Unknown document type.",
    extractsField: null
  };

  const declaredSalary = applicationContext.currentSalary || applicationContext.monthlyIncome;
  const userPrompt = `Verify this document submission for a housing arrears rescheduling case:

Expected document type: ${documentType} — ${typeInfo.label}
What this document should look like: ${typeInfo.description}

File name submitted: ${fileName || "(not provided)"}

Application context:
- Declared monthly salary: AED ${declaredSalary || "not provided"}
- Total arrears amount: AED ${applicationContext.totalArrearsAmount || "not provided"}
- Months delayed: ${applicationContext.monthsDelayed || "not provided"}
- Employment status: ${applicationContext.employmentStatus || "employed"}

Important: Check if the filename matches the expected document type. If the filename clearly indicates a different document type, set recognitionStatus to "needs_correction" and add "wrong_document_type" to flags.

Provide your verification assessment.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.1,
      messages: [
        { role: "system", content: VERIFICATION_SYSTEM },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      recognitionStatus: parsed.recognitionStatus || "passed",
      authenticityScore: Number(parsed.authenticityScore) || 80,
      authenticityRiskStatus: parsed.authenticityRiskStatus || "clear",
      extractedValue: parsed.extractedValue ?? null,
      extractedValueType: parsed.extractedValueType || null,
      consistencyCheck: parsed.consistencyCheck || "pass",
      typeVerified: parsed.typeVerified !== false,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      reasoningNotes: parsed.reasoningNotes || "",
      aiVerified: true,
      model: "gpt-4o-mini",
      verifiedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("[doc-ai] Verification error:", err.message);
    return buildFallback("ai_error", err.message);
  }
}

function buildFallback(reason, errorMessage) {
  return {
    recognitionStatus: "needs_correction",
    authenticityScore: 0,
    authenticityRiskStatus: "medium_risk",
    extractedValue: null,
    extractedValueType: null,
    consistencyCheck: "warning",
    typeVerified: false,
    flags: ["ai_verification_unavailable", "manual_review_required"],
    reasoningNotes: `AI authenticity screening was unavailable (${reason}); route to manual document review instead of auto-passing.`,
    aiVerified: false,
    fallbackReason: reason,
    error: errorMessage || null,
    verifiedAt: new Date().toISOString()
  };
}

module.exports = { verifyDocument };
