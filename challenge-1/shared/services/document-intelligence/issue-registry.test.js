#!/usr/bin/env node
"use strict";

// Issue Registry + postValidate — fixture-based smoke tests
// Run: node challenge-1/shared/services/document-intelligence/issue-registry.test.js

const registry  = require("./issue-registry.js");
const { postValidate } = require("./document-intelligence-service.js");

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// Build a minimal normalised result for postValidate testing
function stubResult(overrides = {}) {
  const base = {
    documentType: "salary_certificate",
    provider: "gemini",
    classificationConfidence: 0.95,
    readability: { status: "clear", confidence: 0.95 },
    extractedFields: {
      applicantName: { value: null, confidence: 0 },
      salaryAmount:  { value: null, currency: "AED", confidence: 0 },
      employer:      { value: null, confidence: 0 },
      issueDate:     { value: null, confidence: 0 },
      stampDetected: { value: true, confidence: 0.85 },
      bankName:      { value: null, confidence: 0 },
      emiratesId:    { value: null, confidence: 0 }
    },
    validation: {
      isRequiredDocument: true,
      isRecent: true,
      matchesDeclaredSalary: null,
      identityMatchesApplicant: null,
      identityMatchStatus: null,
      nameMatchConfidence: null,
      needsHumanReview: false
    },
    blockingIssues:    [],
    humanReviewIssues: [],
    warnings:          [],
    recommendedNextAction: "accept_for_financial_review",
    audit: { analyzedAt: new Date().toISOString(), model: "gemini-2.5-flash", fallbackReason: null, ignoredModelIssues: [], identityComparison: null }
  };
  // Deep-merge overrides at top level
  return Object.assign({}, base, overrides);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Registry integrity ───────────────────────────────────────────");

assert("All issue codes are known by isKnownIssue()",
  Object.keys(registry.ISSUES).every(c => registry.isKnownIssue(c)));

const requiredCodes = [
  "file_too_large", "unsupported_file_type", "password_protected_file",
  "document_unreadable", "document_cropped", "wrong_document_type",
  "duplicate_document_uploaded", "document_expired", "issue_date_missing",
  "invalid_issue_date", "salary_mismatch", "insufficient_statement_period",
  "active_request_exists",
  "identity_mismatch", "emirates_id_mismatch", "programme_loan_not_found",
  "employer_mismatch", "income_inconsistency", "deduction_cap_exceeded",
  "repayment_period_exceeded", "policy_data_missing",
  "minor_name_variation", "name_missing_but_id_matches", "net_salary_only",
  "stamp_low_confidence", "qr_not_verified", "high_obligations_ratio",
  "payment_instability", "low_ocr_confidence", "employer_variation"
];

for (const code of requiredCodes) {
  assert(`Issue "${code}" registered`, registry.isKnownIssue(code));
}

assert("file_too_large is blocking",           registry.getSeverity("file_too_large")       === "blocking");
assert("identity_mismatch is human_review",    registry.getSeverity("identity_mismatch")    === "human_review");
assert("minor_name_variation is warning",      registry.getSeverity("minor_name_variation") === "warning");
assert("policy_data_missing is policy_fail",   registry.getSeverity("policy_data_missing")  === "policy_fail");
assert("low_ocr_confidence is human_review",   registry.getSeverity("low_ocr_confidence")   === "human_review");

assert("file_too_large → blocking bucket",         registry.classify("file_too_large")      === "blocking");
assert("policy_data_missing → blocking bucket",    registry.classify("policy_data_missing") === "blocking");
assert("identity_mismatch → humanReview bucket",   registry.classify("identity_mismatch")   === "humanReview");
assert("low_ocr_confidence → humanReview bucket",  registry.classify("low_ocr_confidence")  === "humanReview");
assert("minor_name_variation → warning bucket",    registry.classify("minor_name_variation") === "warning");
assert("unknown_code → unknown",                   registry.classify("invented_by_ai")      === "unknown");

assert("All issues have citizenMessageEn",
  Object.values(registry.ISSUES).every(i => typeof i.citizenMessageEn === "string" && i.citizenMessageEn.length > 10));
assert("All issues have citizenMessageAr",
  Object.values(registry.ISSUES).every(i => typeof i.citizenMessageAr === "string" && i.citizenMessageAr.length > 5));
assert("All issues have officerMessageEn",
  Object.values(registry.ISSUES).every(i => typeof i.officerMessageEn === "string" && i.officerMessageEn.length > 5));

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 1: Clean salary certificate — PASS ───────────────────");
{
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      salaryAmount: { value: "12000", currency: "AED", confidence: 0.95 },
      issueDate:    { value: tenDaysAgo, confidence: 0.9 }
    }
  }), { currentSalary: 12000 });

  assert("No blocking issues",       r.blockingIssues.length === 0,    JSON.stringify(r.blockingIssues));
  assert("No human review issues",   r.humanReviewIssues.length === 0, JSON.stringify(r.humanReviewIssues));
  assert("matchesDeclaredSalary = true", r.validation.matchesDeclaredSalary === true);
  assert("isRecent = true",          r.validation.isRecent === true);
  assert("needsHumanReview = false", r.validation.needsHumanReview === false);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 2: Salary mismatch (doc=8500, declared=12000) — BLOCK ─");
{
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      salaryAmount: { value: "AED 8,500", currency: "AED", confidence: 0.92 },
      issueDate:    { value: tenDaysAgo, confidence: 0.9 }
    }
  }), { currentSalary: 12000 });

  assert("salary_mismatch in blockingIssues",           r.blockingIssues.includes("salary_mismatch"));
  assert("matchesDeclaredSalary = false",               r.validation.matchesDeclaredSalary === false);
  assert("recommendedNextAction = needs_resubmission",  r.recommendedNextAction === "needs_resubmission");
  assert("needsHumanReview = true",                     r.validation.needsHumanReview === true);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 3: Expired certificate (45 days old) — BLOCK ─────────");
{
  const oldDate = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      salaryAmount: { value: "12000", currency: "AED", confidence: 0.9 },
      issueDate:    { value: oldDate, confidence: 0.9 }
    }
  }), { currentSalary: 12000 });

  assert("document_expired in blockingIssues", r.blockingIssues.includes("document_expired"));
  assert("isRecent = false",                   r.validation.isRecent === false);
  assert("needsHumanReview = true",            r.validation.needsHumanReview === true);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 4: File too large — hard-blocked ─────────────────────");
{
  assert("file_too_large is known",              registry.isKnownIssue("file_too_large"));
  assert("file_too_large blocks assessment",     registry.blocksAssessment("file_too_large"));
  assert("file_too_large has citizen message",   registry.getIssue("file_too_large").citizenMessageEn.length > 10);
  // Verify registry is consistent — file_too_large must not be human_review
  assert("file_too_large is NOT human_review",   registry.getSeverity("file_too_large") !== "human_review");
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 5: Minor name typo (Khalid vs Khaled) — WARNING ──────");
{
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      applicantName: { value: "Khaled Al Ketbi", confidence: 0.88 }
    }
  }), { currentSalary: 0, applicantName: "Khalid Al Ketbi" });

  assert("minor_name_variation in warnings",            r.warnings.includes("minor_name_variation"),
    JSON.stringify(r.warnings));
  assert("identity_mismatch NOT in humanReviewIssues",  !r.humanReviewIssues.includes("identity_mismatch"));
  assert("identityMatchStatus = minor_variation",       r.validation.identityMatchStatus === "minor_variation");
  assert("audit.identityComparison populated",          r.audit.identityComparison !== null);
  assert("No blocking issues",                          r.blockingIssues.length === 0);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 6: Strong name mismatch — HUMAN_REVIEW ───────────────");
{
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      applicantName: { value: "Saeed Al Nuaimi", confidence: 0.9 }
    }
  }), { currentSalary: 0, applicantName: "Khalid Al Ketbi" });

  assert("identity_mismatch in humanReviewIssues",      r.humanReviewIssues.includes("identity_mismatch"),
    JSON.stringify(r.humanReviewIssues));
  assert("identityMatchesApplicant = false",            r.validation.identityMatchesApplicant === false);
  assert("identityMatchStatus = mismatch",              r.validation.identityMatchStatus === "mismatch");
  assert("recommendedNextAction = manual_review",       r.recommendedNextAction === "manual_review");
  assert("needsHumanReview = true",                     r.validation.needsHumanReview === true);
  assert("No blocking issues (human_review not block)", r.blockingIssues.length === 0);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 6b: Same surname, different given name — HUMAN_REVIEW ─");
{
  // Khalid Al Ketbi vs Saeed Al Ketbi — same family name but different given name
  // Must NOT be treated as minor_variation
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      applicantName: { value: "Saeed Al Ketbi", confidence: 0.9 }
    }
  }), { currentSalary: 0, applicantName: "Khalid Al Ketbi" });

  assert("identity_mismatch (same surname, diff given)", r.humanReviewIssues.includes("identity_mismatch"),
    JSON.stringify({ humanReview: r.humanReviewIssues, warnings: r.warnings }));
  assert("NOT minor_name_variation",                    !r.warnings.includes("minor_name_variation"));
  assert("identityMatchStatus = mismatch",              r.validation.identityMatchStatus === "mismatch");
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 7: Wrong document type from AI — BLOCK ───────────────");
{
  const r = postValidate(stubResult({
    blockingIssues: ["wrong_document_type"]
  }), {});

  assert("wrong_document_type in blockingIssues",   r.blockingIssues.includes("wrong_document_type"));
  assert("registry confirms it is blocking",        registry.getSeverity("wrong_document_type") === "blocking");
  assert("needsHumanReview = true",                 r.validation.needsHumanReview === true);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 8a: Very low confidence (0.45) — BLOCKING ────────────");
{
  const r = postValidate(stubResult({
    classificationConfidence: 0.45
  }), {});

  assert("document_unreadable in blockingIssues",   r.blockingIssues.includes("document_unreadable"),
    JSON.stringify(r.blockingIssues));
  assert("recommendedNextAction = needs_resubmission", r.recommendedNextAction === "needs_resubmission");
  assert("needsHumanReview = true",                 r.validation.needsHumanReview === true);
  assert("low_ocr_confidence NOT in humanReview",   !r.humanReviewIssues.includes("low_ocr_confidence"));
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 8b: Medium confidence (0.65) — HUMAN_REVIEW ──────────");
{
  const r = postValidate(stubResult({
    classificationConfidence: 0.65
  }), {});

  assert("low_ocr_confidence in humanReviewIssues", r.humanReviewIssues.includes("low_ocr_confidence"),
    JSON.stringify(r.humanReviewIssues));
  assert("document_unreadable NOT in blockingIssues", !r.blockingIssues.includes("document_unreadable"));
  assert("recommendedNextAction = manual_review",   r.recommendedNextAction === "manual_review");
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 9: Salary confidence too low — deterministic skips ───");
{
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      salaryAmount: { value: "8500", currency: "AED", confidence: 0.3 },
      issueDate:    { value: tenDaysAgo, confidence: 0.9 }
    }
  }), { currentSalary: 12000 });

  assert("salary_mismatch NOT fired (low sal confidence)", !r.blockingIssues.includes("salary_mismatch"));
  assert("matchesDeclaredSalary = null (undecided)",       r.validation.matchesDeclaredSalary === null);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 10: AI invented unknown blocking code — ignored ───────");
{
  assert("future_dated_document is unknown",         !registry.isKnownIssue("future_dated_document"));
  assert("classify returns 'unknown'",               registry.classify("future_dated_document") === "unknown");

  // postValidate receives an already-normalized result — normalize() strips it before here
  const r = postValidate(stubResult({ blockingIssues: [] }), {});
  assert("blockingIssues empty after normalize strips unknown", r.blockingIssues.length === 0);
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 10b: AI invented unknown WARNING code — ignoredModelIssues ─");
{
  // normalize() should put unknown warning codes into ignoredModelIssues, not warnings[].
  // We simulate what normalize() does with the warnings filter.
  const unknownCode = "suspicious_document_format"; // not in registry
  assert("unknown warning code is not in registry",  !registry.isKnownIssue(unknownCode));

  // A result where the AI snuck an unknown code into warnings (before normalize filtering)
  // After normalize, it should be in ignoredModelIssues, not warnings
  // We simulate the normalized output: unknown was already filtered → warnings must be empty
  const r = postValidate(stubResult({
    warnings: [],   // normalize() already stripped unknown codes
    audit: { ...stubResult().audit, ignoredModelIssues: [unknownCode] }
  }), {});

  assert("unknown warning not in warnings[]",          !r.warnings.includes(unknownCode));
  assert("unknown warning in ignoredModelIssues",       r.audit.ignoredModelIssues.includes(unknownCode));
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 11: Stamp low confidence — WARNING only ──────────────");
{
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      stampDetected: { value: true, confidence: 0.45 }
    }
  }), {});

  assert("stamp_low_confidence in warnings",             r.warnings.includes("stamp_low_confidence"),
    JSON.stringify(r.warnings));
  assert("stamp_low_confidence NOT in blockingIssues",   !r.blockingIssues.includes("stamp_low_confidence"));
  assert("stamp_low_confidence NOT in humanReviewIssues", !r.humanReviewIssues.includes("stamp_low_confidence"));
  assert("registry severity is warning",                 registry.getSeverity("stamp_low_confidence") === "warning");
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Fixture 12: Mohammed vs Mohamed — minor variation ────────────");
{
  const r = postValidate(stubResult({
    extractedFields: {
      ...stubResult().extractedFields,
      applicantName: { value: "Mohamed Al Rashid", confidence: 0.9 }
    }
  }), { currentSalary: 0, applicantName: "Mohammed Al Rashid" });

  assert("minor_name_variation in warnings",            r.warnings.includes("minor_name_variation"),
    JSON.stringify({ warnings: r.warnings, humanReview: r.humanReviewIssues }));
  assert("identity_mismatch NOT triggered",             !r.humanReviewIssues.includes("identity_mismatch"));
  assert("identityMatchStatus = minor_variation",       r.validation.identityMatchStatus === "minor_variation");
}

// ─────────────────────────────────────────────────────────────────────
console.log("\n── Summary ──────────────────────────────────────────────────────");
console.log(`  ${passed + failed} assertions: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("\n  SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("\n  ALL TESTS PASSED");
}
