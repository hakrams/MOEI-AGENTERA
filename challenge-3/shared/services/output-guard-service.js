// output-guard-service.js — validates every model output before it reaches the customer.
// Three layers: prompt rules (in workers) + JSON schema check (here) + deterministic code guard (here).
// If any guard fails, the reply is blocked and replaced with a safe fallback.

const FORBIDDEN_CLAIM_PATTERNS = [
  /سيتم اعتماد/i,
  /ستحصل على/i,
  /مضمون/i,
  /بالتأكيد سيتم/i,
  /will be approved/i,
  /guaranteed/i,
  /you will receive approval/i,
  /approval is confirmed/i,
  /decision will be made by/i,
  /expect approval/i,
  /تضمن الحصول/i,
  /موعد الاعتماد/i,
  /الموافقة مؤكدة/i
];

const SAFE_FALLBACK = {
  ar: "شكراً لتواصلك. سيتواصل معك الموظف المختص في أقرب وقت ممكن.",
  en: "Thank you for reaching out. A specialist officer will follow up with you as soon as possible."
};

function createOutputGuardService() {

  function validate(modelOutput, language, brain) {
    const result = {
      passed: true,
      violations: [],
      safeReply: null
    };

    if (!modelOutput.customerReply || typeof modelOutput.customerReply !== "string" || !modelOutput.customerReply.trim()) {
      result.passed = false;
      result.violations.push("empty_reply");
    }

    if (modelOutput.forbiddenClaimDetected === true) {
      result.passed = false;
      result.violations.push("forbidden_claim_flagged_by_model");
    }

    if (modelOutput.customerReply) {
      const detected = FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(modelOutput.customerReply));
      if (detected) {
        result.passed = false;
        result.violations.push("forbidden_claim_detected_by_guard");
      }
    }

    if (modelOutput.promisesMade && Array.isArray(modelOutput.promisesMade) && modelOutput.promisesMade.length > 0) {
      result.passed = false;
      result.violations.push("promises_made_not_empty");
    }

    if (brain && modelOutput.caseStatusUsed) {
      const ledgerStatus = brain.challenge1HousingContext.applicationStatus;
      if (ledgerStatus && modelOutput.caseStatusUsed !== ledgerStatus) {
        result.passed = false;
        result.violations.push("case_status_mismatch_with_ledger");
      }
    }

    if (!result.passed) {
      const lang = language === "en" ? "en" : "ar";
      result.safeReply = SAFE_FALLBACK[lang];
    }

    return result;
  }

  function guardReply(modelOutput, language, brain) {
    const guardResult = validate(modelOutput, language, brain);

    if (!guardResult.passed) {
      return {
        customerReply: guardResult.safeReply,
        guardBlocked: true,
        violations: guardResult.violations,
        originalReply: modelOutput.customerReply || null
      };
    }

    return {
      customerReply: modelOutput.customerReply,
      guardBlocked: false,
      violations: []
    };
  }

  return { validate, guardReply };
}

module.exports = { createOutputGuardService, SAFE_FALLBACK };
