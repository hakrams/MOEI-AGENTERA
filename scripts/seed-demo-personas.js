#!/usr/bin/env node
"use strict";

// Idempotent demo persona seeder.
// Seeds 3 demo personas across C1 + C3 stores with full cross-channel history.
// Safe to run multiple times — checks for existing IDs before inserting.

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const c1DataDir = path.join(rootDir, "data", "live", "challenge-1");
const c3DataDir = path.join(rootDir, "data", "live", "challenge-3");

function readJson(filePath, defaultValue) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() - offsetMs).toISOString();
}

// ── DEMO PERSONAS ──────────────────────────────────────────────────────────

const DEMO_PERSONAS = [
  {
    // DEMO-001: Ahmed Al Mansouri — Approved case, cross-channel (website → WhatsApp)
    c3Profile: {
      customerId: "DEMO-001",
      source: "trustgate",
      identityRef: "DEMO-001",
      displayName: "Ahmed Al Mansouri",
      displayNameAr: "أحمد المنصوري",
      maskedEmiratesId: "784-1990-1234567-1",
      phone: process.env.DEMO_NOTIFICATION_PHONE || "+971500001001",
      preferredLanguage: "ar",
      preferredChannel: "whatsapp",
      firstSeenAt: nowIso(7 * 24 * 3600 * 1000),
      lastSeenAt: nowIso(2 * 3600 * 1000),
      repeatContactCount: 5,
      isDemoPersona: true
    },
    c1Application: {
      applicationId: "DEMO-APP-001",
      status: "approved_with_seal",
      language: "ar",
      channel: "website",
      source: "demo_seed",
      customer: {
        displayName: "Ahmed Al Mansouri",
        displayNameAr: "أحمد المنصوري",
        identityRef: "DEMO-001",
        emiratesIdMasked: "784-****-4567",
        phoneMasked: "***-***-1001",
        notificationPhone: process.env.DEMO_NOTIFICATION_PHONE || "+971500001001",
        emailMasked: "a.***@gmail.com"
      },
      financial: { currentSalary: 18000, monthlyObligations: 3200, existingLoans: true },
      family: { dependentsCount: 4, familyMembersCount: 6 },
      specialCases: { officialMissionCase: false },
      arrearsData: {
        arrearsAmount: 24000,
        unpaidInstallmentsCount: 3,
        lastPaymentDate: nowIso(90 * 24 * 3600 * 1000)
      },
      sealId: "SEAL-DEMO-001",
      submittedAt: nowIso(6 * 24 * 3600 * 1000),
      createdAt: nowIso(6 * 24 * 3600 * 1000),
      updatedAt: nowIso(1 * 3600 * 1000)
    },
    c3Events: [
      {
        channel: "website",
        direction: "inbound",
        language: "ar",
        rawMessage: "أريد الاستفسار عن تأخير قسط السكن",
        normalizedIntent: "arrears_inquiry",
        normalizedEntities: { serviceType: "housing_arrears" },
        sentiment: "concerned",
        deterministicAnswerUsed: true,
        modelUsed: "deterministic",
        customerReply: "يمكنك التقدم بطلب إعادة جدولة من خلال البوابة الإلكترونية. هل تريد الانتقال إلى الخدمة؟",
        requiresHuman: false,
        escalationScore: 15,
        offsetMs: 6 * 24 * 3600 * 1000 - 3600 * 1000
      },
      {
        channel: "whatsapp",
        direction: "inbound",
        language: "ar",
        rawMessage: "قدّمت الطلب. متى يصلني رد؟",
        normalizedIntent: "status_check",
        normalizedEntities: {},
        sentiment: "neutral",
        deterministicAnswerUsed: false,
        modelUsed: "gpt-4o-mini",
        customerReply: "طلبكم قيد الدراسة. سيتم إشعاركم فور اكتمال التقييم.",
        requiresHuman: false,
        escalationScore: 10,
        offsetMs: 5 * 24 * 3600 * 1000
      },
      {
        channel: "whatsapp",
        direction: "outbound",
        language: "ar",
        rawMessage: null,
        normalizedIntent: "proactive_notification",
        normalizedEntities: { triggerType: "approved_with_seal" },
        sentiment: "positive",
        deterministicAnswerUsed: true,
        modelUsed: "proactive_service",
        customerReply: "تهانينا! تمت الموافقة على طلب إعادة جدولة المتأخرات DEMO-APP-001.",
        requiresHuman: false,
        escalationScore: 0,
        offsetMs: 1 * 3600 * 1000
      }
    ]
  },
  {
    // DEMO-002: Fatima Al Zaabi — Documents pending, cross-channel (WhatsApp → website)
    c3Profile: {
      customerId: "DEMO-002",
      source: "whatsapp",
      identityRef: "DEMO-002",
      displayName: "Fatima Al Zaabi",
      displayNameAr: "فاطمة الزعابي",
      maskedEmiratesId: "784-1985-7654321-2",
      phone: process.env.DEMO_NOTIFICATION_PHONE || "+971500001002",
      preferredLanguage: "ar",
      preferredChannel: "whatsapp",
      firstSeenAt: nowIso(3 * 24 * 3600 * 1000),
      lastSeenAt: nowIso(5 * 3600 * 1000),
      repeatContactCount: 3,
      isDemoPersona: true
    },
    c1Application: {
      applicationId: "DEMO-APP-002",
      status: "documents_required",
      language: "ar",
      channel: "whatsapp",
      source: "demo_seed",
      customer: {
        displayName: "Fatima Al Zaabi",
        displayNameAr: "فاطمة الزعابي",
        identityRef: "DEMO-002",
        emiratesIdMasked: "784-****-1321",
        phoneMasked: "***-***-1002",
        notificationPhone: process.env.DEMO_NOTIFICATION_PHONE || "+971500001002",
        emailMasked: "f.***@hotmail.com"
      },
      financial: { currentSalary: 14500, monthlyObligations: 2800, existingLoans: false },
      family: { dependentsCount: 2, familyMembersCount: 4 },
      specialCases: { officialMissionCase: false },
      arrearsData: {
        arrearsAmount: 15000,
        unpaidInstallmentsCount: 2,
        lastPaymentDate: nowIso(60 * 24 * 3600 * 1000)
      },
      requiredDocuments: [
        { docType: "salary_certificate", status: "missing", label: "شهادة راتب", labelEn: "Salary Certificate" },
        { docType: "bank_statement_6m", status: "missing", label: "كشف حساب بنكي 6 أشهر", labelEn: "Bank Statement (6 months)" }
      ],
      submittedAt: nowIso(3 * 24 * 3600 * 1000),
      createdAt: nowIso(3 * 24 * 3600 * 1000),
      updatedAt: nowIso(5 * 3600 * 1000)
    },
    c3Events: [
      {
        channel: "whatsapp",
        direction: "inbound",
        language: "ar",
        rawMessage: "مساء الخير، أريد أعرف كيف أقدم طلب تأجيل السكن",
        normalizedIntent: "service_inquiry",
        normalizedEntities: { serviceType: "housing_arrears" },
        sentiment: "neutral",
        deterministicAnswerUsed: true,
        modelUsed: "deterministic",
        customerReply: "مرحباً! يمكنك التقديم عبر بوابة إعادة الجدولة. هل تريدين رابط الخدمة؟",
        requiresHuman: false,
        escalationScore: 5,
        offsetMs: 3 * 24 * 3600 * 1000
      },
      {
        channel: "website",
        direction: "inbound",
        language: "ar",
        rawMessage: "قدمت الطلب لكن ما فهمت إيش المستندات المطلوبة",
        normalizedIntent: "document_inquiry",
        normalizedEntities: {},
        sentiment: "confused",
        deterministicAnswerUsed: false,
        modelUsed: "gpt-4o-mini",
        customerReply: "طلبكم يحتاج: 1) شهادة راتب، 2) كشف حساب بنكي آخر 6 أشهر. يرجى رفعها عبر البوابة.",
        requiresHuman: false,
        escalationScore: 20,
        offsetMs: 5 * 3600 * 1000
      }
    ]
  },
  {
    // DEMO-003: Mohammed Al Ketbi — Human escalation, cross-channel (website → voice → WhatsApp)
    c3Profile: {
      customerId: "DEMO-003",
      source: "trustgate",
      identityRef: "DEMO-003",
      displayName: "Mohammed Al Ketbi",
      displayNameAr: "محمد الكتبي",
      maskedEmiratesId: "784-1978-9876543-3",
      phone: process.env.DEMO_NOTIFICATION_PHONE || "+971500001003",
      preferredLanguage: "en",
      preferredChannel: "voice",
      firstSeenAt: nowIso(10 * 24 * 3600 * 1000),
      lastSeenAt: nowIso(2 * 24 * 3600 * 1000),
      repeatContactCount: 8,
      isDemoPersona: true
    },
    c1Application: {
      applicationId: "DEMO-APP-003",
      status: "human_review_required",
      language: "en",
      channel: "website",
      source: "demo_seed",
      customer: {
        displayName: "Mohammed Al Ketbi",
        displayNameAr: "محمد الكتبي",
        identityRef: "DEMO-003",
        emiratesIdMasked: "784-****-6543",
        phoneMasked: "***-***-1003",
        notificationPhone: process.env.DEMO_NOTIFICATION_PHONE || "+971500001003",
        emailMasked: "m.***@outlook.com"
      },
      financial: { currentSalary: 22000, monthlyObligations: 8500, existingLoans: true },
      family: { dependentsCount: 5, familyMembersCount: 7 },
      specialCases: { officialMissionCase: true },
      arrearsData: {
        arrearsAmount: 48000,
        unpaidInstallmentsCount: 6,
        lastPaymentDate: nowIso(180 * 24 * 3600 * 1000)
      },
      submittedAt: nowIso(9 * 24 * 3600 * 1000),
      createdAt: nowIso(9 * 24 * 3600 * 1000),
      updatedAt: nowIso(2 * 24 * 3600 * 1000)
    },
    c3Events: [
      {
        channel: "website",
        direction: "inbound",
        language: "en",
        rawMessage: "I need help with my housing loan arrears, I've been on official mission",
        normalizedIntent: "arrears_inquiry",
        normalizedEntities: { serviceType: "housing_arrears", specialCase: "official_mission" },
        sentiment: "stressed",
        deterministicAnswerUsed: false,
        modelUsed: "gpt-4o-mini",
        customerReply: "I understand this is stressful. Official mission cases have dedicated processing. I'm routing you to a specialist officer.",
        requiresHuman: true,
        escalationScore: 75,
        offsetMs: 9 * 24 * 3600 * 1000
      },
      {
        channel: "voice",
        direction: "inbound",
        language: "en",
        rawMessage: "[VOICE] Called to check status of application submitted 3 days ago",
        normalizedIntent: "status_check",
        normalizedEntities: { channel: "voice" },
        sentiment: "impatient",
        deterministicAnswerUsed: false,
        modelUsed: "claude-haiku",
        customerReply: "Your application DEMO-APP-003 is with our specialist team for official mission case review. Expected response within 48 hours.",
        requiresHuman: false,
        escalationScore: 40,
        offsetMs: 6 * 24 * 3600 * 1000
      },
      {
        channel: "whatsapp",
        direction: "inbound",
        language: "en",
        rawMessage: "Any update? It's been over a week",
        normalizedIntent: "status_check",
        normalizedEntities: {},
        sentiment: "frustrated",
        deterministicAnswerUsed: false,
        modelUsed: "gpt-4o-mini",
        customerReply: "We sincerely apologize for the delay. Your case DEMO-APP-003 is with our senior review team. You will receive a decision within 24 hours.",
        requiresHuman: true,
        escalationScore: 85,
        offsetMs: 2 * 24 * 3600 * 1000
      }
    ]
  }
];

// ── SEEDER LOGIC ──────────────────────────────────────────────────────────

function seedC3Profiles() {
  const filePath = path.join(c3DataDir, "profiles.json");
  const profiles = readJson(filePath, []);
  let added = 0;

  for (const persona of DEMO_PERSONAS) {
    const exists = profiles.find((p) => p.customerId === persona.c3Profile.customerId);
    if (!exists) {
      profiles.push(persona.c3Profile);
      added++;
    }
  }

  writeJson(filePath, profiles);
  console.log(`[profiles] ${added} added, ${profiles.length} total`);
}

function seedC3Events() {
  const filePath = path.join(c3DataDir, "events.json");
  const events = readJson(filePath, []);
  let added = 0;

  // Find max event/journey ID
  let evtCounter = events.length;
  let jrnCounter = events.length;

  for (const persona of DEMO_PERSONAS) {
    const journeyId = `JRN-DEMO-${persona.c3Profile.customerId}`;
    const existingInJourney = events.find((e) => e.journeyId === journeyId);
    if (existingInJourney) continue;

    for (const evt of persona.c3Events) {
      evtCounter++;
      events.push({
        eventId: `EVT-DEMO-${String(evtCounter).padStart(4, "0")}`,
        journeyId,
        customerId: persona.c3Profile.customerId,
        caseId: persona.c1Application.applicationId,
        channel: evt.channel,
        direction: evt.direction,
        language: evt.language,
        rawMessage: evt.rawMessage,
        normalizedIntent: evt.normalizedIntent,
        normalizedEntities: evt.normalizedEntities,
        sentiment: evt.sentiment,
        deterministicAnswerUsed: evt.deterministicAnswerUsed,
        modelUsed: evt.modelUsed,
        customerReply: evt.customerReply,
        requiresHuman: evt.requiresHuman,
        escalationScore: evt.escalationScore,
        piiClass: "low",
        timestamp: nowIso(evt.offsetMs),
        isDemoEvent: true
      });
      added++;
    }
  }

  writeJson(filePath, events);
  console.log(`[events] ${added} added, ${events.length} total`);
}

function seedC1Applications() {
  const filePath = path.join(c1DataDir, "applications.json");
  const applications = readJson(filePath, []);
  let added = 0;

  for (const persona of DEMO_PERSONAS) {
    const exists = applications.find((a) => a.applicationId === persona.c1Application.applicationId);
    if (!exists) {
      applications.push(persona.c1Application);
      added++;
    }
  }

  writeJson(filePath, applications);
  console.log(`[c1 applications] ${added} added, ${applications.length} total`);
}

function seedC1AuditEvents() {
  const filePath = path.join(c1DataDir, "auditEvents.json");
  const events = readJson(filePath, []);
  let added = 0;

  const demoAudits = [
    {
      applicationId: "DEMO-APP-001",
      action: "trustgate_authorized",
      actor: "trustgate_adapter",
      summary: "TrustGate authorization approved and seal created",
      timestamp: nowIso(1 * 3600 * 1000)
    },
    {
      applicationId: "DEMO-APP-002",
      action: "office_request_correction",
      actor: "officer",
      summary: "Documents required: salary certificate and bank statement",
      timestamp: nowIso(5 * 3600 * 1000)
    },
    {
      applicationId: "DEMO-APP-003",
      action: "office_refer_human_review",
      actor: "officer",
      summary: "Official mission case — referred to senior specialist review",
      timestamp: nowIso(2 * 24 * 3600 * 1000)
    }
  ];

  for (const audit of demoAudits) {
    const exists = events.find((e) => e.applicationId === audit.applicationId && e.action === audit.action);
    if (!exists) {
      events.push({
        auditEventId: `AUDIT-DEMO-${audit.applicationId}`,
        ...audit,
        createdAt: audit.timestamp
      });
      added++;
    }
  }

  writeJson(filePath, events);
  console.log(`[c1 auditEvents] ${added} added, ${events.length} total`);
}

function seedProactiveNotifications() {
  const filePath = path.join(c3DataDir, "proactiveNotifications.json");
  const notifications = readJson(filePath, []);
  let added = 0;

  const demoNotifications = [
    {
      notificationId: "NOTIF-DEMO-001",
      applicationId: "DEMO-APP-001",
      customerId: "DEMO-001",
      trigger: "status_change",
      newStatus: "approved_with_seal",
      phone: "***-***-1001",
      message: "تهانينا أحمد المنصوري! 🎉\nتمت الموافقة على طلب إعادة جدولة المتأخرات DEMO-APP-001.",
      lang: "ar",
      sentAt: nowIso(1 * 3600 * 1000),
      channel: "whatsapp",
      deliveryStatus: "sent",
      isDemoNotification: true
    }
  ];

  for (const notif of demoNotifications) {
    const exists = notifications.find((n) => n.notificationId === notif.notificationId);
    if (!exists) {
      notifications.push(notif);
      added++;
    }
  }

  writeJson(filePath, notifications);
  console.log(`[proactiveNotifications] ${added} added, ${notifications.length} total`);
}

// ── RUN ───────────────────────────────────────────────────────────────────

console.log("🌱 Seeding demo personas...\n");

try {
  seedC3Profiles();
  seedC3Events();
  seedC1Applications();
  seedC1AuditEvents();
  seedProactiveNotifications();
  console.log("\n✅ Demo persona seed complete.");
  console.log("   DEMO-001: Ahmed Al Mansouri — Approved (website → WhatsApp)");
  console.log("   DEMO-002: Fatima Al Zaabi   — Documents pending (WhatsApp → website)");
  console.log("   DEMO-003: Mohammed Al Ketbi — Human review (website → voice → WhatsApp)");
} catch (err) {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
}
