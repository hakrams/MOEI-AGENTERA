"use strict";

// CountryIQ Briefing Orchestrator — 5-step autonomous intelligence generation.
// Step 1: Retrieve country data
// Step 2: Analyse strategic capacity
// Step 3: Identify and rank opportunities
// Step 4: Generate narrative brief (Claude)
// Step 5: Source-guard verify — flag unsupported claims [UNVERIFIED]

const countryIntelligenceService = require("./country-intelligence-service.js");
const sourceGuardService = require("./source-guard-service.js");

const BRIEFING_SYSTEM = `You are CountryIQ, an elite strategic intelligence analyst for the UAE Ministry of Energy and Infrastructure (MOEI).

You receive structured country intelligence data and produce a concise, authoritative strategic briefing for a senior UAE government official preparing for a bilateral meeting.

The briefing must:
- Be grounded ONLY in the provided structured data — never invent statistics or claim relationships not in the data
- Be professional, crisp, and government-level (not consulting-firm generic)
- Lead with the strategic relationship status
- Highlight the top 3 actionable opportunities with specific value figures from the data
- Flag the top 2 risks with mitigation notes
- Close with 5 key talking points for the meeting
- Arabic terms for ministry/government names where appropriate
- Maximum 400 words
- Do NOT use headers — prose paragraphs only
- Use the exact figures provided (GDP, trade volumes, etc.)

Return ONLY this JSON structure (no markdown):
{
  "executiveSummary": "string — 2-sentence opening: relationship status + headline number",
  "strategicContext": "string — 80-100 words: geopolitical and economic positioning",
  "topOpportunities": [
    { "title": "string", "value": "string (e.g. $3.5B over 5 years)", "priority": "High|Medium", "insight": "string — 30-40 words" }
  ],
  "keyRisks": [
    { "category": "string", "risk": "string — 25-30 words", "mitigation": "string — 20 words" }
  ],
  "talkingPoints": ["string x5 — each a specific, actionable talking point for the meeting"],
  "closingRecommendation": "string — 30-40 words: what the official should prioritize in this meeting"
}`;

const COMPARE_SYSTEM = `You are CountryIQ, a strategic analyst comparing investment opportunities across two countries for UAE MOEI leadership.

Compare both countries across: energy partnership potential, economic complementarity with UAE, bilateral trade trajectory, and strategic risk profile.

Return ONLY this JSON:
{
  "winnerOverall": "countryCode of stronger overall opportunity",
  "comparisonDimensions": [
    { "dimension": "string", "countryA": "string — 20-word assessment", "countryB": "string — 20-word assessment", "winner": "A|B|tie" }
  ],
  "recommendedFocus": "string — 50 words on which country deserves immediate attention and why",
  "complementaryStrategy": "string — 40 words on how to engage BOTH simultaneously if resources allow"
}`;

async function generateBriefing({ countryCode, geminiClient, meetingContext }) {
  const country = countryIntelligenceService.getCountry(countryCode);
  if (!country) {
    throw new Error(`Country not found: ${countryCode}`);
  }

  const steps = [];

  // Step 1: Retrieve
  steps.push({ step: 1, label: "Data Retrieved", detail: `${country.countryName} — ${(country.opportunities || []).length} opportunities, ${(country.riskFactors || []).length} risks` });

  // Step 2: Capacity analysis
  const gdpBn = Math.round((country.gdpUsd || 0) / 1e9);
  const tradeBn = Math.round((country.uaeRelations?.bilateralTradeUsd || 0) / 1e9);
  const capacity = {
    economicSize: gdpBn > 5000 ? "Major economy" : gdpBn > 1000 ? "Significant economy" : "Emerging economy",
    tradeDepth: tradeBn > 50 ? "Deep" : tradeBn > 10 ? "Moderate" : "Nascent",
    energyAlignment: country.energyProfile?.renewablesSharePct > 30 ? "Renewables-led" : "Fossil-dependent (transition opportunity)"
  };
  steps.push({ step: 2, label: "Capacity Analysed", detail: `${capacity.economicSize}, ${capacity.tradeDepth} trade, ${capacity.energyAlignment}` });

  // Step 3: Opportunity ranking
  const opportunities = (country.opportunities || []).sort((a, b) => (b.opportunityValueUsd || 0) - (a.opportunityValueUsd || 0));
  steps.push({ step: 3, label: "Opportunities Ranked", detail: `Top: ${opportunities[0]?.title || "none"} ($${Math.round((opportunities[0]?.opportunityValueUsd || 0) / 1e9 * 10) / 10}B)` });

  // Step 4: LLM brief generation
  let brief = null;
  let llmSource = "fallback";

  const contextPayload = {
    country: {
      name: country.countryName,
      nameAr: country.countryNameAr,
      region: country.region,
      gdpBn,
      gdpGrowthPct: country.gdpGrowthPct,
      population: country.population,
      governmentType: country.governmentType,
      headOfState: country.headOfState
    },
    uaeRelations: country.uaeRelations,
    energyProfile: {
      renewablesSharePct: country.energyProfile?.renewablesSharePct,
      netOilExporter: country.energyProfile?.netOilExporterStatus,
      electricityMix: country.energyProfile?.electricityMixPct,
      energyGoals: country.energyProfile?.energyTransitionGoals
    },
    topOpportunities: opportunities.slice(0, 4),
    risks: country.riskFactors || [],
    keyMeetingTopics: country.keyMeetingTopics || [],
    meetingContext: meetingContext || null,
    capacity
  };

  if (geminiClient) {
    try {
      // Step 4a: Web search grounding — fetch recent developments (best-effort)
      let webIntelligence = null;
      try {
        const searchModel = geminiClient.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
          tools: [{ googleSearch: {} }]
        });
        const searchResult = await searchModel.generateContent(
          `Summarize the most recent 2024-2025 developments between UAE and ${country.countryName} in energy, infrastructure investment, and bilateral trade. Focus on MOEI-relevant news. 120 words max.`
        );
        webIntelligence = searchResult.response.text();
      } catch (_) { /* web search is best-effort */ }

      // Step 4b: Structured JSON generation with Gemini
      const genModel = geminiClient.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const userPrompt = `${BRIEFING_SYSTEM}\n\nStructured country data:\n${JSON.stringify(contextPayload, null, 2)}${webIntelligence ? `\n\nFresh web intelligence (2024-2025, Google Search):\n${webIntelligence}` : ""}`;
      const result = await genModel.generateContent(userPrompt);
      const raw = result.response.text();
      brief = JSON.parse(raw);
      llmSource = webIntelligence ? "gemini-search" : "gemini";
    } catch (err) {
      console.error("[briefing-orchestrator] Gemini call failed:", err.message);
    }
  }

  // Fallback brief from structured data
  if (!brief) {
    const topOpp = opportunities[0];
    const topRisk = (country.riskFactors || [])[0];
    brief = {
      executiveSummary: `${country.uaeRelations?.diplomaticStatus || "Active bilateral relationship"}. Bilateral trade stands at $${tradeBn}B with strong growth trajectory.`,
      strategicContext: country.uaeRelations?.strategicImportance || `${country.countryName} is an important partner for UAE.`,
      topOpportunities: opportunities.slice(0, 3).map((o) => ({
        title: o.title,
        value: `$${Math.round((o.opportunityValueUsd || 0) / 1e9 * 10) / 10}B over ${o.timelineYears} years`,
        priority: o.riskLevel === "Low" ? "High" : "Medium",
        insight: o.description?.slice(0, 100) || ""
      })),
      keyRisks: (country.riskFactors || []).slice(0, 2).map((r) => ({
        category: r.category,
        risk: r.description?.slice(0, 120) || r.title,
        mitigation: r.mitigation || "Monitor closely"
      })),
      talkingPoints: (country.keyMeetingTopics || []).slice(0, 5),
      closingRecommendation: `Prioritize ${topOpp?.title || "key strategic area"} as the highest-value near-term opportunity in this meeting.`
    };
    llmSource = "structured_fallback";
  }

  steps.push({ step: 4, label: "Brief Generated", detail: `Source: ${llmSource}` });

  // Step 5: Source guard verification
  const fullBriefText = [
    brief.executiveSummary,
    brief.strategicContext,
    ...(brief.topOpportunities || []).map((o) => `${o.title}: ${o.insight}`),
    ...(brief.talkingPoints || [])
  ].join(" ");

  const guardResult = sourceGuardService.verifyBriefingContent(fullBriefText, countryCode);
  steps.push({
    step: 5,
    label: "Source Guard Complete",
    detail: `Trust score: ${guardResult.trustScore}% | Flags: ${guardResult.flags.length}`
  });

  return {
    briefingId: `BRIEF-${countryCode}-${Date.now()}`,
    countryCode,
    countryName: country.countryName,
    countryNameAr: country.countryNameAr,
    generatedAt: new Date().toISOString(),
    llmSource,
    orchestratorSteps: steps,
    brief,
    sourceGuard: guardResult,
    rawCountrySummary: {
      gdpBn,
      gdpGrowthPct: country.gdpGrowthPct,
      bilateralTradeUsd: country.uaeRelations?.bilateralTradeUsd,
      opportunityCount: opportunities.length,
      riskCount: (country.riskFactors || []).length,
      dataConfidence: country.dataConfidence
    }
  };
}

async function compareBriefings({ countryCodeA, countryCodeB, geminiClient }) {
  const [countryA, countryB] = [
    countryIntelligenceService.getCountry(countryCodeA),
    countryIntelligenceService.getCountry(countryCodeB)
  ];

  if (!countryA || !countryB) {
    throw new Error(`One or both countries not found: ${countryCodeA}, ${countryCodeB}`);
  }

  let comparison = null;

  if (geminiClient) {
    try {
      const genModel = geminiClient.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `${COMPARE_SYSTEM}\n\nCompare these two countries for UAE MOEI investment strategy:\n\nCountry A (${countryCodeA}):\n${JSON.stringify({
        name: countryA.countryName,
        gdpBn: Math.round(countryA.gdpUsd / 1e9),
        bilateralTrade: countryA.uaeRelations?.bilateralTradeUsd,
        opportunities: countryA.opportunities?.slice(0, 3),
        risks: countryA.riskFactors?.slice(0, 2),
        strategicImportance: countryA.uaeRelations?.strategicImportance
      }, null, 2)}\n\nCountry B (${countryCodeB}):\n${JSON.stringify({
        name: countryB.countryName,
        gdpBn: Math.round(countryB.gdpUsd / 1e9),
        bilateralTrade: countryB.uaeRelations?.bilateralTradeUsd,
        opportunities: countryB.opportunities?.slice(0, 3),
        risks: countryB.riskFactors?.slice(0, 2),
        strategicImportance: countryB.uaeRelations?.strategicImportance
      }, null, 2)}`;

      const result = await genModel.generateContent(prompt);
      comparison = JSON.parse(result.response.text());
    } catch (err) {
      console.error("[briefing-orchestrator] Gemini compare call failed:", err.message);
    }
  }

  if (!comparison) {
    const aTradeUsd = countryA.uaeRelations?.bilateralTradeUsd || 0;
    const bTradeUsd = countryB.uaeRelations?.bilateralTradeUsd || 0;
    comparison = {
      winnerOverall: aTradeUsd >= bTradeUsd ? countryCodeA : countryCodeB,
      comparisonDimensions: [
        {
          dimension: "Bilateral Trade Volume",
          countryA: `$${Math.round(aTradeUsd / 1e9)}B`,
          countryB: `$${Math.round(bTradeUsd / 1e9)}B`,
          winner: aTradeUsd >= bTradeUsd ? "A" : "B"
        }
      ],
      recommendedFocus: `${aTradeUsd >= bTradeUsd ? countryA.countryName : countryB.countryName} offers stronger immediate opportunity based on bilateral trade depth.`,
      complementaryStrategy: "Engage both countries through different strategic lenses — one for energy, one for food security."
    };
  }

  return {
    comparisonId: `COMPARE-${countryCodeA}-${countryCodeB}-${Date.now()}`,
    countryA: { code: countryCodeA, name: countryA.countryName },
    countryB: { code: countryCodeB, name: countryB.countryName },
    generatedAt: new Date().toISOString(),
    comparison
  };
}

module.exports = { generateBriefing, compareBriefings };
