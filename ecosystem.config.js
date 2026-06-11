module.exports = {
  apps: [
    {
      name: "moei-hackathon",
      script: "server.js",
      cwd: "/apps/moei-hackathon",
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT: "9710",
        NODE_ENV: "production",
        MOEI_PUBLIC_ORIGIN: process.env.MOEI_PUBLIC_ORIGIN || "https://moei.sahlabs.me",
        MOEI_AUTH_PROVIDER_ID: process.env.MOEI_AUTH_PROVIDER_ID || "trustgate",
        MOEI_AUTH_PROVIDER_NAME: process.env.MOEI_AUTH_PROVIDER_NAME || "TrustGate",
        MOEI_AUTH_PROVIDER_MODE: process.env.MOEI_AUTH_PROVIDER_MODE || "standalone_trust_service",
        MOEI_AUTH_RESULT_PARAM: process.env.MOEI_AUTH_RESULT_PARAM || "trustGateResult",
        TRUSTGATE_BASE_URL: process.env.TRUSTGATE_BASE_URL || "https://trustgate.sahlabs.me/",
        ALLOW_TEST_RESET: process.env.ALLOW_TEST_RESET || "false",
        CHALLENGE1_FEED_TOKEN: process.env.CHALLENGE1_FEED_TOKEN || "",
        CHALLENGE1_TEST_TOKEN: process.env.CHALLENGE1_TEST_TOKEN || "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
        OPENAI_CUSTOMER_MODEL: process.env.OPENAI_CUSTOMER_MODEL || "gpt-4o-mini",
        CLAUDE_REASONING_MODEL: process.env.CLAUDE_REASONING_MODEL || "claude-haiku-4-5-20251001",
        META_APP_ID: process.env.META_APP_ID || "",
        META_APP_SECRET: process.env.META_APP_SECRET || "",
        WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || "",
        WHATSAPP_ACCESS_TOKEN_TEMPORARY: process.env.WHATSAPP_ACCESS_TOKEN_TEMPORARY || "",
        WHATSAPP_ACCESS_TOKEN_FALLBACK: process.env.WHATSAPP_ACCESS_TOKEN_FALLBACK || "",
        WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
        WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
        WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || "",
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
        TWILIO_VERIFY_TOKEN: process.env.TWILIO_VERIFY_TOKEN || ""
      }
    }
  ]
};
