"use strict";

// Gemini document extractor.
// Uses native PDF/image vision to extract structured fields from real document content.

function buildPrompt(documentType, applicationContext) {
  const ctx = applicationContext || {};
  return `You are an AI document verification specialist for the UAE Ministry of Energy and Infrastructure (MOEI) housing loan arrears rescheduling unit.

Analyze this ${documentType} document and extract structured data.

Application context:
- Declared monthly salary: AED ${ctx.currentSalary || "not provided"}
- Total arrears amount: AED ${ctx.totalArrearsAmount || "not provided"}
- Employment status: ${ctx.employmentStatus || "not provided"}

Return ONLY valid JSON. No explanation. No markdown fences. Just the JSON object:
{
  "documentType": "${documentType}",
  "classificationConfidence": 0.92,
  "readability": {
    "status": "clear",
    "confidence": 0.91
  },
  "extractedFields": {
    "applicantName":  { "value": null, "confidence": 0 },
    "salaryAmount":   { "value": null, "currency": "AED", "confidence": 0 },
    "employer":       { "value": null, "confidence": 0 },
    "issueDate":      { "value": null, "confidence": 0 },
    "stampDetected":  { "value": false, "confidence": 0 },
    "bankName":       { "value": null, "confidence": 0 },
    "emiratesId":     { "value": null, "confidence": 0 }
  },
  "validation": {
    "isRequiredDocument": true,
    "isRecent": true,
    "matchesDeclaredSalary": null,
    "identityMatchesApplicant": null,
    "needsHumanReview": false
  },
  "blockingIssues": [],
  "warnings": [],
  "recommendedNextAction": "accept_for_financial_review"
}

Rules:
- readability.status: "clear" | "partially_obscured" | "unreadable"
- isRecent: true if issue date within last 30 days for salary_certificate, 90 days for others
- matchesDeclaredSalary: compare extracted salary vs declared salary — true/false/null (null if declared not provided or irrelevant doc type)
- blockingIssues: strings like "document_unreadable", "stamp_missing", "document_expired", "salary_mismatch", "wrong_document_type"
- recommendedNextAction: "accept_for_financial_review" | "needs_resubmission" | "manual_review"
- Set all confidence values as decimal between 0 and 1
- If field not visible or not applicable to this document type, set value to null and confidence to 0`;
}

async function extract({ fileBase64, mimeType, documentType, applicationContext, geminiClient }) {
  if (!geminiClient || !fileBase64 || !mimeType) return null;

  try {
    const model = geminiClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { temperature: 0.1, maxOutputTokens: 1500 }
    });

    const result = await model.generateContent([
      buildPrompt(documentType, applicationContext),
      { inlineData: { data: fileBase64, mimeType } }
    ]);

    const text = result.response.text().trim();
    // Strip markdown fences, then extract the outermost { ... } block
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const start = stripped.indexOf("{");
    const end   = stripped.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(stripped.slice(start, end + 1));

    if (typeof parsed.classificationConfidence !== "number") return null;
    return parsed;
  } catch (err) {
    console.error("[gemini-extractor] Error:", err.message);
    return null;
  }
}

module.exports = { extract };
