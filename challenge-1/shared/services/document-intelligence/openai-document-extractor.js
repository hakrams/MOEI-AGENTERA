"use strict";

// OpenAI document extractor.
// Fallback for image types when Gemini is unavailable.
// Uses vision (gpt-4o-mini) for images; filename-context only for PDFs.

const SYSTEM_PROMPT = `You are an AI document verification specialist for MOEI housing loan arrears rescheduling.
Extract structured information from the provided document.

Return ONLY valid JSON with no explanation:
{
  "documentType": "salary_certificate",
  "classificationConfidence": 0.88,
  "readability": { "status": "clear", "confidence": 0.90 },
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
}`;

async function extract({ fileBase64, mimeType, documentType, applicationContext, openaiClient }) {
  if (!openaiClient || !fileBase64) return null;

  const ctx = applicationContext || {};
  const isImage = mimeType && mimeType.startsWith("image/");

  try {
    let userContent;

    if (isImage) {
      userContent = [
        {
          type: "text",
          text: `Analyze this ${documentType}. Declared salary: AED ${ctx.currentSalary || "not provided"}. Extract all visible fields.`
        },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${fileBase64}`, detail: "high" }
        }
      ];
    } else {
      // PDF — OpenAI vision cannot process PDF binary; use context-only analysis as best-effort
      userContent = `Analyze this ${documentType} (PDF). Declared salary: AED ${ctx.currentSalary || "not provided"}. Return the JSON schema. Since PDF binary is not directly readable here, return classificationConfidence: 0.3 and set needsHumanReview: true.`;
    }

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userContent }
      ],
      response_format: { type: "json_object" }
    });

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (typeof parsed.classificationConfidence !== "number") return null;
    return parsed;
  } catch (err) {
    console.error("[openai-extractor] Error:", err.message);
    return null;
  }
}

module.exports = { extract };
