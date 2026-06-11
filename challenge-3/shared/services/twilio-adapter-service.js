"use strict";

const crypto = require("crypto");

// ── Signature verification ────────────────────────────────────
function verifyTwilioSignature(authToken, url, params, signature) {
  if (!authToken || !signature) return false;
  // Twilio signs: URL + sorted params concatenated
  const sortedParams = Object.keys(params || {}).sort().reduce((str, key) => {
    return str + key + params[key];
  }, url);
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(sortedParams, "utf-8"))
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// ── TwiML builders ────────────────────────────────────────────
function buildConversationRelayTwiML(wsUrl, options = {}) {
  const lang = options.language || "ar-SA";
  const ttsVoice = options.ttsVoice || (lang.startsWith("ar") ? "Google.ar-XA-Wavenet-B" : "Google.en-US-Neural2-J");
  const welcomeGreeting = options.welcomeGreeting || (lang.startsWith("ar")
    ? "أهلاً بك في مركز خدمة وزارة الطاقة والبنية التحتية. كيف يمكنني مساعدتك اليوم؟"
    : "Welcome to MOEI Service Center. How can I assist you today?");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${ttsVoice}" language="${lang}">${escXml(welcomeGreeting)}</Say>
  <Connect>
    <ConversationRelay
      url="${escXml(wsUrl)}"
      voice="${ttsVoice}"
      language="${lang}"
      transcriptionProvider="google"
      interruptByDtmf="false"
      dtmfDetection="true"
    />
  </Connect>
</Response>`;
}

function buildHangupTwiML(message, language) {
  const lang = language || "ar-SA";
  const voice = lang.startsWith("ar") ? "Google.ar-XA-Wavenet-B" : "Google.en-US-Neural2-J";
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${lang}">${escXml(message)}</Say>
  <Hangup/>
</Response>`;
}

function escXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── ConversationRelay message parser ─────────────────────────
function parseRelayMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── ConversationRelay response builder ───────────────────────
// Twilio expects: { type: "text", token: "...", last: true }
// Or: { type: "text", token: "...", last: false } for streaming
function buildRelayResponse(text, options = {}) {
  return JSON.stringify({
    type: "text",
    token: text,
    last: options.last !== false
  });
}

function buildRelayEnd(reason) {
  return JSON.stringify({
    type: "end",
    reason: reason || "completed"
  });
}

// ── Phone → customer ID ───────────────────────────────────────
function phoneToCustomerId(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // take last 9 digits as identifier
  return `CALL-${digits.slice(-9)}`;
}

// ── Language detection from Twilio call ──────────────────────
function detectLanguageFromCall(callData) {
  const fromCountry = (callData.FromCountry || "").toUpperCase();
  // UAE, Saudi, Gulf → Arabic
  const arabicCountries = ["AE", "SA", "KW", "QA", "BH", "OM", "JO", "EG", "LB"];
  return arabicCountries.includes(fromCountry) ? "ar" : "en";
}

module.exports = {
  verifyTwilioSignature,
  buildConversationRelayTwiML,
  buildHangupTwiML,
  parseRelayMessage,
  buildRelayResponse,
  buildRelayEnd,
  phoneToCustomerId,
  detectLanguageFromCall
};
