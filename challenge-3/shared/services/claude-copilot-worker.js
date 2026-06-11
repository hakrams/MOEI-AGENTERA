// Claude co-pilot worker — officer assistance and leadership insights.
// Uses Claude Sonnet/Haiku for reasoning tasks that need full brain context.
// Never called for customer-facing replies. Only for officer dashboard and leadership.

// full analysis — all fields, max 800 tokens
const OFFICER_COPILOT_SYSTEM = `You are an AI co-pilot for a UAE government housing officer.
You receive a customer's full context and recent interaction history.
Return JSON with this exact shape:
{
  "caseSummary": "2-3 sentence summary",
  "customerNeed": "what the customer needs right now",
  "riskAssessment": { "sentimentRisk": "low|medium|high", "slaRisk": "low|medium|high", "escalationRisk": "low|medium|high", "reasons": [] },
  "recommendedNextAction": "specific action for officer",
  "recommendedOfficerResponse": "suggested reply to customer",
  "mustNotPromise": ["things officer must not commit to"],
  "confidence": 0.0
}`;

// risk-only — smaller JSON, ~300 tokens
const OFFICER_COPILOT_RISK_SYSTEM = `You are a risk assessment AI for a UAE government housing officer.
Analyse the customer context and return ONLY this JSON:
{
  "caseSummary": "1-2 sentence summary",
  "customerNeed": "what the customer needs",
  "riskAssessment": { "sentimentRisk": "low|medium|high", "slaRisk": "low|medium|high", "escalationRisk": "low|medium|high", "reasons": [] },
  "confidence": 0.0
}`;

// reply-only — smallest, ~200 tokens
const OFFICER_COPILOT_REPLY_SYSTEM = `You are a reply assistant for a UAE government housing officer.
Based on the customer context, generate ONLY a suggested reply message.
Return ONLY this JSON:
{
  "recommendedOfficerResponse": "suggested reply in the customer's preferred language",
  "recommendedNextAction": "one-line next step for officer"
}`;

const LEADERSHIP_INSIGHT_SYSTEM = `You are an analytics assistant for UAE housing ministry leadership.
You receive aggregated interaction data across many customers.
Identify patterns, risks, and service improvement opportunities.
Return JSON: {
  "topCustomerConcerns": [{ "concern": string, "count": number }],
  "satisfactionRisk": "low|medium|high",
  "bottlenecks": ["list of identified bottlenecks"],
  "urgentEscalations": number,
  "recommendedActions": ["prioritized action list"],
  "insight": "1 paragraph narrative for leadership briefing"
}`;

function createClaudeCopilotWorker({ anthropicClient }) {
  if (!anthropicClient) throw new Error("anthropicClient is required for ClaudeCopilotWorker");

  async function runOfficerCopilot({ fullBrain, recentEvents, officerId, focus }) {
    const model = process.env.CLAUDE_REASONING_MODEL || "claude-haiku-4-5-20251001";
    const contextBlock = buildOfficerContextBlock(fullBrain, recentEvents);

    let systemPrompt = OFFICER_COPILOT_SYSTEM;
    let maxTokens = 800;

    if (focus === "risk") {
      systemPrompt = OFFICER_COPILOT_RISK_SYSTEM;
      maxTokens = 350;
    } else if (focus === "reply") {
      systemPrompt = OFFICER_COPILOT_REPLY_SYSTEM;
      maxTokens = 250;
    }

    const response = await anthropicClient.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: contextBlock }]
    });

    const text = response.content[0].text.trim();
    const parsed = JSON.parse(text);

    return {
      ...parsed,
      focus: focus || "full",
      modelUsed: model,
      officerId: officerId || null
    };
  }

  async function runLeadershipInsight({ aggregatedData }) {
    const model = process.env.CLAUDE_REASONING_MODEL || "claude-sonnet-4-6";

    const contextBlock = JSON.stringify(aggregatedData, null, 2);

    const response = await anthropicClient.messages.create({
      model,
      max_tokens: 1000,
      system: LEADERSHIP_INSIGHT_SYSTEM,
      messages: [
        { role: "user", content: `Aggregated interaction data:\n${contextBlock}` }
      ]
    });

    const text = response.content[0].text.trim();
    return {
      ...JSON.parse(text),
      modelUsed: model
    };
  }

  function buildOfficerContextBlock(brain, recentEvents) {
    const lines = [];
    lines.push(`Customer: ${brain.identity.displayName || brain.identity.customerId}`);
    lines.push(`Preferred language: ${brain.identity.preferredLanguage}`);
    lines.push(`Preferred channel: ${brain.identity.preferredChannel}`);

    const housing = brain.challenge1HousingContext;
    if (housing.hasActiveHousingApplication) {
      lines.push(`Application ID: ${housing.applicationId}`);
      lines.push(`Application status: ${housing.applicationStatus}`);
      if (housing.latestAssessmentStatus) {
        lines.push(`Latest assessment: ${housing.latestAssessmentStatus}`);
      }
      if (housing.missingDocuments.length > 0) {
        lines.push(`Missing documents: ${housing.missingDocuments.join(", ")}`);
      }
      if (housing.latestOfficerAction) {
        lines.push(`Last officer action: ${housing.latestOfficerAction}`);
      }
      if (housing.approvalSealStatus) {
        lines.push(`Approval seal: ${housing.approvalSealStatus}`);
      }
    } else {
      lines.push("No active housing application.");
    }

    const omni = brain.challenge3OmnichannelContext;
    lines.push(`Repeat contact count: ${omni.repeatContactCount}`);
    lines.push(`Current sentiment: ${omni.sentiment}`);
    if (omni.escalationSignals.length > 0) {
      lines.push(`Escalation signals: ${omni.escalationSignals.join(", ")}`);
    }
    if (omni.openLoopSummary) {
      lines.push(`Open loop: ${omni.openLoopSummary}`);
    }

    if (recentEvents && recentEvents.length > 0) {
      lines.push("\nRecent interactions (latest first):");
      [...recentEvents].reverse().slice(0, 5).forEach((e) => {
        lines.push(`  [${e.timestamp}] ${e.channel} / ${e.normalizedIntent} / ${e.sentiment} — "${e.rawMessage}"`);
      });
    }

    return lines.join("\n");
  }

  return { runOfficerCopilot, runLeadershipInsight };
}

module.exports = { createClaudeCopilotWorker };
