"use strict";

const crypto = require("crypto");
const https = require("https");

const GRAPH_API_VERSION = "v25.0";

// ── Signature verification ────────────────────────────────────
// Meta sends X-Hub-Signature-256: sha256=<hmac>
function verifyMetaSignature(appSecret, rawBody, signatureHeader) {
  if (!appSecret || !signatureHeader) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(Buffer.from(rawBody, "utf-8"))
    .digest("hex")}`;
  // lengths must match before timingSafeEqual
  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

// ── Hub verification (GET webhook challenge) ──────────────────
function verifyHubChallenge(query, verifyToken) {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = query;
  if (mode === "subscribe" && token === verifyToken) return challenge;
  return null;
}

// ── Normalize incoming webhook payload ────────────────────────
// Returns array of normalized message objects (usually 1 per webhook call)
function parseIncomingMessages(body) {
  const messages = [];
  try {
    const entries = body.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phoneNumberId = value.metadata?.phone_number_id || "";
        for (const msg of value.messages || []) {
          messages.push(normalizeMessage(msg, phoneNumberId, value.contacts || []));
        }
      }
    }
  } catch {
    // malformed payload — return empty
  }
  return messages;
}

function normalizeMessage(msg, phoneNumberId, contacts) {
  const contact = contacts.find((c) => c.wa_id === msg.from) || {};
  const customerName = contact.profile?.name || null;

  let text = null;
  let mediaId = null;
  let messageType = msg.type || "unknown";

  if (msg.type === "text") {
    text = msg.text?.body || null;
  } else if (["image", "document", "audio", "video"].includes(msg.type)) {
    mediaId = msg[msg.type]?.id || null;
    const caption = msg[msg.type]?.caption || null;
    if (caption) text = caption;
  } else if (msg.type === "interactive") {
    const reply = msg.interactive?.button_reply || msg.interactive?.list_reply;
    text = reply?.title || null;
    messageType = "interactive_reply";
  }

  return {
    externalMessageId: msg.id,
    customerPhone: msg.from ? `+${msg.from}` : null,
    customerName,
    phoneNumberId,
    messageType,
    text,
    mediaId,
    timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString()
  };
}

// ── Send text message via Meta Cloud API ──────────────────────
function sendTextMessage(phoneNumberId, accessToken, to, text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: text }
    });

    const options = {
      hostname: "graph.facebook.com",
      path: `/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const request_ = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
        if (response.statusCode >= 400 || parsed.error) {
          const error = new Error(parsed.error?.message || `Meta WhatsApp send failed with HTTP ${response.statusCode}`);
          error.statusCode = response.statusCode;
          error.meta = parsed;
          reject(error);
          return;
        }
        resolve(parsed);
      });
    });

    request_.on("error", reject);
    request_.write(payload);
    request_.end();
  });
}

// ── Language detection from phone number ─────────────────────
function detectLanguageFromPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  // Gulf/Arab country codes
  const arabicPrefixes = ["971", "966", "965", "974", "973", "968", "962", "20", "961"];
  for (const prefix of arabicPrefixes) {
    if (digits.startsWith(prefix)) return "ar";
  }
  return "en";
}

// ── Phone → customerId ────────────────────────────────────────
function phoneToCustomerId(phone) {
  if (!phone) return null;
  const digits = (phone || "").replace(/\D/g, "");
  return `WA-${digits.slice(-9)}`;
}

// ── Raw body reader (needed for signature verification) ───────
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      if (totalLength > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

module.exports = {
  verifyMetaSignature,
  verifyHubChallenge,
  parseIncomingMessages,
  sendTextMessage,
  detectLanguageFromPhone,
  phoneToCustomerId,
  readRawBody
};
