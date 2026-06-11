"use strict";

// Document Intelligence Service — C1 ArrearsFlow
//
// Unified analyzer for uploaded files and camera photos.
// Both paths produce the same output contract.
//
// Provider order:
//   1. Gemini (default) — native PDF/image vision, real content reading
//   2. OpenAI (fallback) — vision for images, context-only for PDFs
//   3. Mock filename (offline/demo) — heuristics only, never called "AI verification"
//
// Demo mode stores synthetic document base64 in local JSON under data/live for
// re-verification without re-upload. Production must use encrypted government
// document storage and store only document references, never raw file content.
//
// Issue classification:
//   All issue codes are validated through issue-registry.js.
//   AI providers may only assert registered codes.
//   Unknown codes → audit.ignoredModelIssues (never reach citizen or officer UI).
//   Deterministic postValidate is the sole authority for salary_mismatch and document_expired.

const geminiExtractor = require("./gemini-document-extractor.js");
const openaiExtractor  = require("./openai-document-extractor.js");
const registry         = require("./issue-registry.js");

const MAX_BASE64_BYTES = 10 * 1024 * 1024; // ~7.5 MB original file

function nowIso() { return new Date().toISOString(); }

/* ── Name comparison helpers ────────────────────────────────────────── */

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j
        : a[i - 1] === b[j - 1] ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns: "match" | "minor_variation" | "mismatch"
//
// Rules:
//   1. Given name (first token after prefix stripping) must match exactly or by ≤ 1 edit
//      (handles Khalid↔Khaled, Mohammed↔Mohamed transliterations).
//      Same surname alone is NOT enough — Khalid Al Ketbi vs Saeed Al Ketbi = mismatch.
//   2. When given names match, at least one shared surname token → minor_variation.
//   3. When given names match but surnames are completely different → mismatch.
function compareNames(a, b) {
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z؀-ۿ0-9 ]/g, "")
      .replace(/\b(al|el|bin|bint|abu|um)\b/g, "")
      .trim()
      .replace(/\s+/g, " ");

  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return "match";

  const wa = na.split(" ").filter((w) => w.length > 1);
  const wb = nb.split(" ").filter((w) => w.length > 1);
  if (!wa.length || !wb.length) return "mismatch";

  const givenA = wa[0];
  const givenB = wb[0];

  // Given name must be exact or ≤ 1 edit (transliteration tolerance only)
  const givenMatch = givenA === givenB || levenshtein(givenA, givenB) <= 1;
  if (!givenMatch) return "mismatch";

  // Given names match — check surname
  const surnameA = wa.slice(1);
  const surnameB = wb.slice(1);

  // Single-name: no surname to compare, given name match is sufficient
  if (surnameA.length === 0 || surnameB.length === 0) return "minor_variation";

  // At least one shared surname token → minor spelling/transliteration variation
  const surnameShared = surnameA.filter((w) => surnameB.includes(w));
  if (surnameShared.length > 0) return "minor_variation";

  // Given names match but surnames are completely different → mismatch
  return "mismatch";
}

/* ── Mock filename fallback ─────────────────────────────────────────── */
function buildMockResult({ fileName, documentType, source, fallbackReason }) {
  const name = (fileName || "").toLowerCase();

  const hasStamp = /(stamp|stamped|seal|sealed|notary|signed|official)/i.test(name);
  const noStamp  = /(no[-_ ]?stamp|missing[-_ ]?stamp|no[-_ ]?seal)/i.test(name);
  const isBlur   = /(blur|blurry|unreadable|low[-_ ]?quality)/i.test(name);
  const isStale  = /(old|stale|expired|outdated)/i.test(name);
  const isConflict = /(salary[-_ ]?conflict|income[-_ ]?conflict)/i.test(name);

  const blockingIssues = [];
  if (isBlur)     blockingIssues.push("document_unreadable");
  if (isStale)    blockingIssues.push("document_expired");
  if (isConflict) blockingIssues.push("salary_mismatch");

  // stamp_low_confidence is a registered WARNING — must never enter blockingIssues
  const mockWarnings = ["provider_mock_filename_only"];
  if (noStamp && !hasStamp) mockWarnings.push("stamp_low_confidence");

  return {
    documentType,
    provider:               "mock_filename",
    source:                 source || "upload",
    classificationConfidence: 0.3,
    readability: { status: isBlur ? "unreadable" : "assumed_clear", confidence: 0.3 },
    extractedFields: {
      applicantName: { value: null, confidence: 0 },
      salaryAmount:  { value: null, currency: "AED", confidence: 0 },
      employer:      { value: null, confidence: 0 },
      issueDate:     { value: null, confidence: 0 },
      stampDetected: { value: hasStamp && !noStamp, confidence: 0.3 },
      bankName:      { value: null, confidence: 0 },
      emiratesId:    { value: null, confidence: 0 }
    },
    validation: {
      isRequiredDocument:       true,
      isRecent:                 !isStale,
      matchesDeclaredSalary:    isConflict ? false : null,
      identityMatchesApplicant: null,
      identityMatchStatus:      null,
      nameMatchConfidence:      null,
      needsHumanReview:         blockingIssues.length > 0
    },
    blockingIssues,
    humanReviewIssues: [],
    warnings: mockWarnings,
    recommendedNextAction: blockingIssues.length ? "needs_resubmission" : "accept_for_financial_review",
    audit: { analyzedAt: nowIso(), model: "filename_heuristics", fallbackReason, ignoredModelIssues: [], identityComparison: null }
  };
}

/* ── Schema normalizer ──────────────────────────────────────────────── */
// Distributes AI-returned issue codes into 3 typed buckets via the registry.
// Unknown codes go to audit.ignoredModelIssues and never reach the citizen or officer UI.
function normalize(raw, documentType, source, provider, model) {
  const ef = raw.extractedFields || {};

  // Classify AI-reported blocking issues through registry
  const rawAiIssues = Array.isArray(raw.blockingIssues) ? raw.blockingIssues : [];
  const blockingIssues     = [];
  const humanReviewIssues  = [];
  const ignoredModelIssues = [];

  for (const code of rawAiIssues) {
    const bucket = registry.classify(code);
    if (bucket === "blocking")    { blockingIssues.push(code);     continue; }
    if (bucket === "humanReview") { humanReviewIssues.push(code);  continue; }
    if (bucket === "warning")     { /* fall through to warnings */ continue; }
    ignoredModelIssues.push(code); // unknown — log only
  }

  // AI-provided warnings — only registered warning codes enter warnings[].
  // Unknown warning codes are treated the same as unknown blocking codes: ignoredModelIssues.
  const rawWarnings = Array.isArray(raw.warnings) ? raw.warnings : [];
  const warnings = [];
  for (const w of rawWarnings) {
    const s = registry.getSeverity(w);
    if (s === "warning") {
      warnings.push(w);
    } else if (s === null) {
      // Unknown — AI invented this code, drop to audit
      if (!ignoredModelIssues.includes(w)) ignoredModelIssues.push(w);
    }
    // Known non-warning codes in the warnings array are silently dropped (miscategorised by model)
  }

  return {
    documentType:             raw.documentType             || documentType,
    provider,
    source:                   source || "upload",
    classificationConfidence: Number(raw.classificationConfidence) || 0,
    readability: {
      status:     raw.readability?.status     || "unknown",
      confidence: Number(raw.readability?.confidence) || 0
    },
    extractedFields: {
      applicantName: { value: ef.applicantName?.value ?? null,  confidence: Number(ef.applicantName?.confidence)  || 0 },
      salaryAmount:  { value: ef.salaryAmount?.value  ?? null,  currency: "AED", confidence: Number(ef.salaryAmount?.confidence) || 0 },
      employer:      { value: ef.employer?.value      ?? null,  confidence: Number(ef.employer?.confidence)      || 0 },
      issueDate:     { value: ef.issueDate?.value     ?? null,  confidence: Number(ef.issueDate?.confidence)     || 0 },
      stampDetected: { value: Boolean(ef.stampDetected?.value), confidence: Number(ef.stampDetected?.confidence) || 0 },
      bankName:      { value: ef.bankName?.value      ?? null,  confidence: Number(ef.bankName?.confidence)      || 0 },
      emiratesId:    { value: ef.emiratesId?.value    ?? null,  confidence: Number(ef.emiratesId?.confidence)    || 0 }
    },
    validation: {
      isRequiredDocument:       Boolean(raw.validation?.isRequiredDocument),
      isRecent:                 Boolean(raw.validation?.isRecent),
      matchesDeclaredSalary:    raw.validation?.matchesDeclaredSalary    ?? null,
      identityMatchesApplicant: raw.validation?.identityMatchesApplicant ?? null,
      identityMatchStatus:      null,  // set by postValidate when applicantName is in context
      nameMatchConfidence:      null,
      needsHumanReview:         Boolean(raw.validation?.needsHumanReview)
    },
    blockingIssues,
    humanReviewIssues,
    warnings,
    recommendedNextAction: raw.recommendedNextAction || "manual_review",
    audit: { analyzedAt: nowIso(), model, fallbackReason: null, ignoredModelIssues, identityComparison: null }
  };
}

/* ── Deterministic post-validation ─────────────────────────────────── */
// Runs after AI normalization. Deterministic checks always override AI decisions.
// The engine decides: salary_mismatch, document_expired, name comparison, confidence warnings.
function postValidate(result, applicationContext) {
  const ctx      = applicationContext || {};
  const ef       = result.extractedFields;
  const blocking = result.blockingIssues;
  const humanRev = result.humanReviewIssues;
  const warnings = result.warnings;

  // ── Salary mismatch — deterministic ──────────────────────────────
  // Strip currency/formatting from values like "AED 8,500" or "12,000 AED" before comparing.
  // Rule: diff > 250 AED AND > 2% of declared salary → salary_mismatch
  const declaredSalary  = Number(ctx.currentSalary);
  const rawSalVal       = ef.salaryAmount?.value;
  const extractedSalary = rawSalVal != null
    ? Number(String(rawSalVal).replace(/[^0-9.]/g, ""))
    : NaN;
  const salaryConf = Number(ef.salaryAmount?.confidence) || 0;

  if (declaredSalary > 0 && !isNaN(extractedSalary) && extractedSalary > 0 && salaryConf >= 0.5) {
    const diff = Math.abs(extractedSalary - declaredSalary);
    if (diff > 250 && diff / declaredSalary > 0.02) {
      result.validation.matchesDeclaredSalary = false;
      if (!blocking.includes("salary_mismatch")) blocking.push("salary_mismatch");
    } else {
      result.validation.matchesDeclaredSalary = true;
    }
  }

  // ── Document recency — salary_certificate only, 30-day rule ──────
  const issueDateVal = ef.issueDate?.value;
  const dateConf     = Number(ef.issueDate?.confidence) || 0;

  if (result.documentType === "salary_certificate" && issueDateVal && dateConf >= 0.5) {
    const issueDate = new Date(issueDateVal);
    if (!isNaN(issueDate.getTime())) {
      const ageDays = (Date.now() - issueDate.getTime()) / 86_400_000;
      if (ageDays > 30) {
        result.validation.isRecent = false;
        if (!blocking.includes("document_expired")) blocking.push("document_expired");
      }
    }
  }

  // ── Name comparison — deterministic when applicantName is in context ─
  // minor transliteration diff (given name ≤ 1 edit, same surname) → warning
  // different given name → human_review (citizen cannot fix by re-uploading)
  // same surname alone is NOT a match
  const applicantName = ctx.applicantName;
  const extractedName = ef.applicantName?.value;
  const nameConf      = Number(ef.applicantName?.confidence) || 0;

  if (applicantName && extractedName && nameConf >= 0.5) {
    const comparison = compareNames(applicantName, extractedName);

    const matchStatus =
      comparison === "match"           ? "exact_match" :
      comparison === "minor_variation" ? "minor_variation" :
      comparison === "mismatch"        ? "mismatch" : "uncertain";

    result.validation.identityMatchStatus   = matchStatus;
    result.validation.nameMatchConfidence   = nameConf;
    result.audit.identityComparison = {
      expectedName:  applicantName,
      extractedName: extractedName,
      status:        matchStatus,
      confidence:    nameConf
    };

    if (comparison === "minor_variation") {
      if (!warnings.includes("minor_name_variation")) warnings.push("minor_name_variation");
    } else if (comparison === "mismatch") {
      result.validation.identityMatchesApplicant = false;
      if (!humanRev.includes("identity_mismatch")) humanRev.push("identity_mismatch");
    } else {
      result.validation.identityMatchesApplicant = true;
    }
  }

  // ── Stamp confidence warning ──────────────────────────────────────
  const stampConf = Number(ef.stampDetected?.confidence) || 0;
  if (stampConf > 0 && stampConf < 0.6 && !warnings.includes("stamp_low_confidence")) {
    warnings.push("stamp_low_confidence");
  }

  // ── Confidence tiers — applied after all other checks ────────────
  // < 0.55 → document_unreadable (blocking: citizen must re-upload a clearer copy)
  // 0.55–0.75 → low_ocr_confidence (human_review: officer verifies key fields)
  // ≥ 0.75 → continue normally unless other issues exist
  const overallConf = result.classificationConfidence;
  if (overallConf > 0) {
    if (overallConf < 0.55) {
      if (!blocking.includes("document_unreadable")) blocking.push("document_unreadable");
    } else if (overallConf < 0.75) {
      if (!humanRev.includes("low_ocr_confidence")) humanRev.push("low_ocr_confidence");
    }
  }

  // ── Sync derived flags based on priority: blocking > humanReview ──
  if (blocking.length > 0) {
    result.validation.needsHumanReview = true;
    result.recommendedNextAction       = "needs_resubmission";
  } else if (humanRev.length > 0) {
    result.validation.needsHumanReview = true;
    result.recommendedNextAction       = "manual_review";
  }

  return result;
}

/* ── Main entry point ───────────────────────────────────────────────── */
async function analyze({ fileBase64, mimeType, fileName, documentType, source, applicationContext, geminiClient, openaiClient }) {

  // Size guard — always hard-blocks, regardless of filename
  if (fileBase64 && fileBase64.length > MAX_BASE64_BYTES) {
    return {
      documentType,
      provider:               "none",
      source:                 source || "upload",
      classificationConfidence: 0,
      readability:            { status: "unknown", confidence: 0 },
      extractedFields: {
        applicantName: { value: null, confidence: 0 },
        salaryAmount:  { value: null, currency: "AED", confidence: 0 },
        employer:      { value: null, confidence: 0 },
        issueDate:     { value: null, confidence: 0 },
        stampDetected: { value: false, confidence: 0 },
        bankName:      { value: null, confidence: 0 },
        emiratesId:    { value: null, confidence: 0 }
      },
      validation: {
        isRequiredDocument:       false,
        isRecent:                 false,
        matchesDeclaredSalary:    null,
        identityMatchesApplicant: null,
        identityMatchStatus:      null,
        nameMatchConfidence:      null,
        needsHumanReview:         true
      },
      blockingIssues:        ["file_too_large"],
      humanReviewIssues:     [],
      warnings:              [],
      recommendedNextAction: "needs_resubmission",
      audit: { analyzedAt: nowIso(), model: "none", fallbackReason: "file_too_large", ignoredModelIssues: [], identityComparison: null }
    };
  }

  const ctx = applicationContext || {};

  // Provider 1: Gemini — native PDF + image understanding
  if (fileBase64 && mimeType && geminiClient) {
    try {
      const raw = await geminiExtractor.extract({ fileBase64, mimeType, documentType, applicationContext: ctx, geminiClient });
      if (raw && Number(raw.classificationConfidence) > 0) {
        return postValidate(normalize(raw, documentType, source, "gemini", process.env.GEMINI_MODEL || "gemini-2.5-flash"), ctx);
      }
    } catch (err) {
      console.error("[doc-intelligence] Gemini provider error:", err.message);
    }
  }

  // Provider 2: OpenAI — vision fallback for images, context-only for PDFs
  if (fileBase64 && mimeType && openaiClient) {
    try {
      const raw = await openaiExtractor.extract({ fileBase64, mimeType, documentType, applicationContext: ctx, openaiClient });
      if (raw && Number(raw.classificationConfidence) > 0) {
        return postValidate(normalize(raw, documentType, source, "openai", "gpt-4o-mini"), ctx);
      }
    } catch (err) {
      console.error("[doc-intelligence] OpenAI provider error:", err.message);
    }
  }

  // Provider 3: Mock filename heuristics — offline demo fallback only
  return buildMockResult({
    fileName,
    documentType,
    source,
    fallbackReason: fileBase64 ? "ai_extraction_failed" : "no_file_content"
  });
}

module.exports = { analyze, MAX_BASE64_BYTES, postValidate };
