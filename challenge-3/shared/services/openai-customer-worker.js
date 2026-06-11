// OpenAI customer worker — handles edge cases that the deterministic service cannot resolve.
// Called by flash-gate-service.js only when gate_3 is triggered.

const SYSTEM_PROMPT_AR = `أنت مساعد خدمة العملاء لوزارة الإسكان الإماراتية.
مهمتك: الرد على استفسارات العميل بشكل مهني ودود.
قواعد صارمة:
1. لا تعد بأي قرار أو موعد نهائي أو موافقة
2. لا تذكر تفاصيل العمليات الداخلية
3. إذا لم تعرف الإجابة، أخبر العميل بأن الموظف المختص سيتواصل معه
4. لا تضف أي معلومات غير موجودة في السياق
5. ردودك يجب أن تكون قصيرة ومركزة (2-4 جمل)
أعد JSON: { "customerReply": string, "requiresHuman": boolean, "escalationScore": 0-100, "forbiddenClaimDetected": false }`;

const SYSTEM_PROMPT_EN = `You are a customer service assistant for the UAE Ministry of Housing.
Your task: respond to customer inquiries professionally and warmly.
Strict rules:
1. Never promise any decision, timeline, or approval
2. Never mention internal process details
3. If you don't know the answer, tell the customer that an officer will follow up
4. Never add information not present in the context
5. Keep responses concise (2-4 sentences)
Return JSON: { "customerReply": string, "requiresHuman": boolean, "escalationScore": 0-100, "forbiddenClaimDetected": false }`;

function createOpenAICustomerWorker({ openaiClient }) {
  if (!openaiClient) throw new Error("openaiClient is required for OpenAICustomerWorker");

  async function run({ intent, language, sentiment, rawMessage, compactBrain }) {
    const model = process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini";
    const systemPrompt = language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_AR;
    const contextBlock = buildContextBlock(compactBrain, language);
    const userContent = `${contextBlock}\n\nCustomer message: ${rawMessage}`;

    const response = await openaiClient.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 350,
      temperature: 0.4,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    return {
      customerReply: parsed.customerReply || "",
      requiresHuman: Boolean(parsed.requiresHuman),
      escalationScore: Number(parsed.escalationScore) || 0,
      forbiddenClaimDetected: Boolean(parsed.forbiddenClaimDetected),
      modelUsed: model
    };
  }

  function buildContextBlock(brain, language) {
    const lines = [];
    if (brain.hasApplication) {
      lines.push(`Application status: ${brain.applicationStatus}`);
      if (brain.missingDocuments && brain.missingDocuments.length > 0) {
        lines.push(`Missing documents: ${brain.missingDocuments.join(", ")}`);
      } else {
        lines.push("All documents received.");
      }
    } else {
      lines.push("Customer has no active housing application.");
    }
    if (brain.repeatContactCount >= 3) {
      lines.push(`Note: This customer has contacted us ${brain.repeatContactCount} times previously.`);
    }
    return `[CONTEXT]\n${lines.join("\n")}`;
  }

  return { run };
}

module.exports = { createOpenAICustomerWorker };
