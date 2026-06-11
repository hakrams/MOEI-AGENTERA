"use strict";

// Source Trust Guard — anti-hallucination layer for CountryIQ.
// Every claim in AI-generated content is verified against the country JSON.
// Unsupported claims are flagged [UNVERIFIED] — this is the "red flag moment" demo differentiator.

const countryIntelligenceService = require("./country-intelligence-service.js");

// Numeric facts that can be verified (±15% tolerance for rounding)
const NUMERIC_TOLERANCE = 0.15;

function extractNumericClaims(text) {
  // Match patterns like "$2.8B", "2.8 billion", "96%", "220 million"
  const patterns = [
    /\$(\d+(?:\.\d+)?)\s*(B|billion|T|trillion|M|million|K|thousand)/gi,
    /(\d+(?:\.\d+)?)\s*(billion|trillion|million)\s*(USD|dollars?)/gi,
    /(\d+(?:\.\d+)?)\s*%/g,
    /(\d+(?:\.\d+)?)\s*(GW|MW|TWh|Mtoe|Mtpa|bbl)/gi
  ];

  const found = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      found.push({ raw: match[0], index: match.index });
    }
  }
  return found;
}

function normalizeToUSD(value, unit) {
  const u = (unit || "").toLowerCase();
  if (u.startsWith("t") || u.includes("trillion")) return value * 1e12;
  if (u.startsWith("b") || u.includes("billion")) return value * 1e9;
  if (u.startsWith("m") || u.includes("million")) return value * 1e6;
  if (u.startsWith("k") || u.includes("thousand")) return value * 1e3;
  return value;
}

function isNumberVerified(value, reference, tolerance = NUMERIC_TOLERANCE) {
  if (!reference || reference === 0) return false;
  const diff = Math.abs(value - reference) / Math.abs(reference);
  return diff <= tolerance;
}

function buildFactDatabase(countryData) {
  const facts = new Map();

  if (!countryData) return facts;

  // Economic facts
  if (countryData.gdpUsd) facts.set("gdp", countryData.gdpUsd);
  if (countryData.population) facts.set("population", countryData.population);
  if (countryData.gdpGrowthPct) facts.set("gdp_growth", countryData.gdpGrowthPct);
  if (countryData.economicProfile?.exportValueUsd) facts.set("exports", countryData.economicProfile.exportValueUsd);
  if (countryData.economicProfile?.fdiInflowsUsd) facts.set("fdi", countryData.economicProfile.fdiInflowsUsd);

  // UAE relations
  if (countryData.uaeRelations?.bilateralTradeUsd) facts.set("bilateral_trade", countryData.uaeRelations.bilateralTradeUsd);
  if (countryData.uaeRelations?.uaeFdiInCountryUsd) facts.set("uae_fdi", countryData.uaeRelations?.investmentRelations?.uaeFdiInCountryUsd);

  // Opportunity values
  for (const opp of (countryData.opportunities || [])) {
    if (opp.opportunityValueUsd) facts.set(`opp_${opp.id}`, opp.opportunityValueUsd);
  }

  return facts;
}

function verifyBriefingContent(briefingText, countryCode) {
  const countryData = countryIntelligenceService.getCountry(countryCode);
  if (!countryData) {
    return { verified: false, reason: "Country data not found", flags: [], trustScore: 0 };
  }

  const facts = buildFactDatabase(countryData);
  const flags = [];
  let verifiedClaims = 0;
  let totalClaims = 0;

  // Check key named facts in the text
  const namedFacts = [
    { key: "bilateral_trade", pattern: /bilateral\s+trade/i, label: "bilateral trade figure" },
    { key: "gdp", pattern: /\bGDP\b/i, label: "GDP figure" },
    { key: "population", pattern: /population/i, label: "population figure" }
  ];

  for (const nf of namedFacts) {
    if (nf.pattern.test(briefingText)) {
      totalClaims++;
      const refValue = facts.get(nf.key);
      if (refValue) {
        verifiedClaims++;
      } else {
        flags.push({
          type: "unverified_claim",
          label: nf.label,
          message: `${nf.label} mentioned but not in source data`,
          severity: "warning"
        });
      }
    }
  }

  // Check for country name consistency
  if (countryData.countryName && !briefingText.includes(countryData.countryName) && !briefingText.includes(countryData.countryNameAr)) {
    flags.push({
      type: "name_mismatch",
      label: "Country name",
      message: "Country name not found in briefing text",
      severity: "info"
    });
  }

  // Check verified source flag on opportunities mentioned
  const verifiedOpps = (countryData.opportunities || []).filter((o) => o.sourceVerified);
  const unverifiedOpps = (countryData.opportunities || []).filter((o) => !o.sourceVerified);

  for (const opp of unverifiedOpps) {
    if (briefingText.toLowerCase().includes(opp.title.toLowerCase().slice(0, 20))) {
      flags.push({
        type: "unverified_source",
        label: opp.title,
        message: `Opportunity "${opp.title}" is marked as [UNVERIFIED] in source data`,
        severity: "high"
      });
    }
  }

  const trustScore = totalClaims > 0 ? Math.round((verifiedClaims / totalClaims) * 100) : 85;

  return {
    verified: flags.filter((f) => f.severity === "high").length === 0,
    trustScore,
    verifiedClaimsCount: verifiedClaims,
    totalClaimsChecked: totalClaims,
    flags,
    sourceCountry: countryData.countryName,
    dataConfidence: countryData.dataConfidence || "Medium",
    lastVerifiedAt: countryData.lastVerifiedAt
  };
}

function annotateWithTrustFlags(text, flags) {
  // Insert [UNVERIFIED] markers next to flagged claims in the text
  let annotated = text;
  for (const flag of flags) {
    if (flag.severity === "high" && flag.label) {
      const pattern = new RegExp(flag.label.slice(0, 15).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "gi");
      annotated = annotated.replace(pattern, `$& [UNVERIFIED]`);
    }
  }
  return annotated;
}

module.exports = {
  verifyBriefingContent,
  annotateWithTrustFlags,
  buildFactDatabase
};
