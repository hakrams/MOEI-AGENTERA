"use strict";

// Proactive notification service — C3 core capability #5.
// Sends outbound WhatsApp/SMS notifications when case status changes,
// SLA is breached, or documents are overdue.
// This is what turns the system from reactive → proactive.

const STATUS_MESSAGES = {
  under_assessment: {
    ar: (name, caseId) => `مرحباً ${name}،\nطلبكم ${caseId} قيد الدراسة الآن. سيتم إشعاركم فور اكتمال التقييم.\nوزارة الطاقة والبنية التحتية 🇦🇪`,
    en: (name, caseId) => `Hello ${name},\nYour application ${caseId} is now under assessment. We will notify you once the review is complete.\nMOEI 🇦🇪`
  },
  documents_required: {
    ar: (name, caseId) => `مرحباً ${name}،\nطلبكم ${caseId} يحتاج إلى مستندات إضافية لاستكمال الدراسة. يرجى تقديم المستندات المطلوبة عبر البوابة الإلكترونية.\nوزارة الطاقة والبنية التحتية`,
    en: (name, caseId) => `Hello ${name},\nYour application ${caseId} requires additional documents. Please submit the required documents via the customer portal.\nMOEI`
  },
  returned_for_correction: {
    ar: (name, caseId) => `مرحباً ${name}،\nطلبكم ${caseId} يحتاج إلى تصحيحات. الرجاء مراجعة ملاحظات الموظف عبر البوابة الإلكترونية والمتابعة.`,
    en: (name, caseId) => `Hello ${name},\nYour application ${caseId} needs corrections. Please review the officer's notes via the customer portal and follow up.`
  },
  human_review_required: {
    ar: (name, caseId) => `مرحباً ${name}،\nطلبكم ${caseId} محال للمراجعة من قبل متخصص. سيتواصل معكم الموظف المختص قريباً.`,
    en: (name, caseId) => `Hello ${name},\nYour application ${caseId} has been referred for specialist review. A dedicated officer will contact you shortly.`
  },
  trustgate_pending: {
    ar: (name, caseId) => `مرحباً ${name},\nبشرى سارة! طلبكم ${caseId} وصل لمرحلة الاعتماد النهائي. سيتم إشعاركم فور الانتهاء.`,
    en: (name, caseId) => `Hello ${name},\nGood news! Your application ${caseId} has reached the final approval stage. You will be notified upon completion.`
  },
  approved_with_seal: {
    ar: (name, caseId) => `تهانينا ${name}! 🎉\nتمت الموافقة على طلب إعادة جدولة المتأخرات ${caseId}. سيتواصل معكم مختص قريباً لإتمام الإجراءات.\nوزارة الطاقة والبنية التحتية 🇦🇪`,
    en: (name, caseId) => `Congratulations ${name}! 🎉\nYour arrears rescheduling application ${caseId} has been approved. A specialist will contact you shortly to complete the process.\nMOEI 🇦🇪`
  },
  trustgate_declined: {
    ar: (name, caseId) => `مرحباً ${name}،\nنأسف لإبلاغكم بأن طلبكم ${caseId} لم يُعتمد في هذه المرحلة. لمزيد من المعلومات، تواصلوا مع خدمة العملاء.`,
    en: (name, caseId) => `Hello ${name},\nWe regret to inform you that your application ${caseId} was not approved at this stage. For more information, please contact customer service.`
  },
  sla_warning: {
    ar: (name, caseId) => `مرحباً ${name}،\nنعتذر عن التأخير في معالجة طلبكم ${caseId}. سيتم التواصل معكم خلال 24 ساعة.`,
    en: (name, caseId) => `Hello ${name},\nWe apologize for the delay in processing your application ${caseId}. We will contact you within 24 hours.`
  },
  document_reminder: {
    ar: (name, caseId) => `تذكير: طلبكم ${caseId} لا يزال ينتظر المستندات المطلوبة. يرجى رفعها عبر البوابة لتسريع المعالجة.`,
    en: (name, caseId) => `Reminder: Your application ${caseId} is still awaiting the required documents. Please upload them via the portal to speed up processing.`
  }
};

function buildMessage(statusKey, name, caseId, lang) {
  const msgTemplate = STATUS_MESSAGES[statusKey];
  if (!msgTemplate) {
    const fallback = lang === "ar"
      ? `مرحباً ${name}، تم تحديث حالة طلبكم ${caseId}.`
      : `Hello ${name}, your application ${caseId} status has been updated.`;
    return fallback;
  }
  const fn = lang === "ar" ? msgTemplate.ar : msgTemplate.en;
  return fn(name, caseId);
}

function createProactiveNotificationService({ c3LiveStore, c1LiveStore, sendWhatsApp }) {
  function resolvePhone(application) {
    // First try: raw notification phone stored on application
    if (application.customer?.notificationPhone) {
      return application.customer.notificationPhone;
    }

    // Second try: find linked C3 profile by identityRef
    if (application.customer?.identityRef && c3LiveStore) {
      try {
        const profiles = c3LiveStore.readStore("profiles");
        const linked = profiles.find((p) =>
          p.identityRef === application.customer.identityRef ||
          p.customerId === application.customer.identityRef
        );
        if (linked?.phone) return linked.phone;
      } catch {
        // store read failed — continue to fallback
      }
    }

    // Third try: demo fallback phone
    if (process.env.DEMO_NOTIFICATION_PHONE) {
      return process.env.DEMO_NOTIFICATION_PHONE;
    }

    return null;
  }

  function resolveLanguage(application) {
    return application.language || "ar";
  }

  async function sendStatusNotification({ applicationId, newStatus, notes }) {
    try {
      const application = c1LiveStore
        ? c1LiveStore.readStore("applications").find((a) => a.applicationId === applicationId)
        : null;

      if (!application) {
        console.warn(`[proactive] Application ${applicationId} not found`);
        return { sent: false, reason: "application_not_found" };
      }

      const phone = resolvePhone(application);
      const lang = resolveLanguage(application);
      const name = (lang === "ar" ? application.customer?.displayNameAr : application.customer?.displayName)
        || application.customer?.displayName
        || (lang === "ar" ? "المتعامل" : "Valued Customer");
      const caseId = applicationId;

      const message = buildMessage(newStatus, name, caseId, lang);

      // Log the notification to C3 store (always, even if WhatsApp fails)
      const notification = {
        notificationId: `NOTIF-${Date.now()}`,
        applicationId,
        customerId: application.customer?.identityRef || null,
        trigger: "status_change",
        newStatus,
        phone: phone ? phone.replace(/.(?=.{4})/g, "*") : null,
        message,
        lang,
        sentAt: new Date().toISOString(),
        channel: "whatsapp",
        deliveryStatus: "pending"
      };

      if (c3LiveStore) {
        try {
          const existing = c3LiveStore.readStore("proactiveNotifications");
          c3LiveStore.writeStore("proactiveNotifications", [...existing, notification]);
        } catch (err) {
          console.error("[proactive] Failed to log notification:", err.message);
        }
      }

      // Send WhatsApp if phone available
      if (!phone) {
        console.log(`[proactive] No phone for ${applicationId} — notification logged but not sent`);
        notification.deliveryStatus = "no_phone";
        return { sent: false, reason: "no_phone", logged: true, message };
      }

      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!phoneNumberId || !sendWhatsApp) {
        console.log(`[proactive] WhatsApp not configured — notification logged only`);
        notification.deliveryStatus = "whatsapp_not_configured";
        return { sent: false, reason: "whatsapp_not_configured", logged: true, message };
      }

      await sendWhatsApp(phoneNumberId, phone, message);
      notification.deliveryStatus = "sent";
      console.log(`[proactive] Sent ${newStatus} notification for ${applicationId} to ${phone.slice(-4).padStart(phone.length, "*")}`);

      return { sent: true, channel: "whatsapp", message, applicationId };
    } catch (err) {
      console.error(`[proactive] Error sending notification for ${applicationId}:`, err.message);
      return { sent: false, reason: err.message };
    }
  }

  async function sendSLAWarning({ applicationId }) {
    return sendStatusNotification({ applicationId, newStatus: "sla_warning" });
  }

  async function sendDocumentReminder({ applicationId }) {
    return sendStatusNotification({ applicationId, newStatus: "document_reminder" });
  }

  // Check all pending cases and send SLA warnings / document reminders
  async function runScheduledChecks() {
    if (!c1LiveStore) return { checked: 0, warned: 0 };

    try {
      const applications = c1LiveStore.readStore("applications");
      const now = Date.now();
      let warned = 0;

      for (const app of applications) {
        const ageMs = now - new Date(app.updatedAt || app.createdAt).getTime();
        const ageHours = ageMs / (1000 * 60 * 60);

        // SLA warning: case stuck in assessment/review >48h
        if (ageHours > 48 && ["waiting_for_assessment", "human_review_required", "trustgate_pending"].includes(app.status)) {
          await sendSLAWarning({ applicationId: app.applicationId });
          warned++;
        }

        // Document reminder: documents_required >24h
        if (ageHours > 24 && app.status === "documents_required") {
          await sendDocumentReminder({ applicationId: app.applicationId });
          warned++;
        }
      }

      return { checked: applications.length, warned };
    } catch (err) {
      console.error("[proactive] Scheduled check error:", err.message);
      return { checked: 0, warned: 0, error: err.message };
    }
  }

  async function sendCSATSurvey({ applicationId, phone, lang }) {
    try {
      const resolvedPhone = phone || (() => {
        if (!c1LiveStore) return null;
        const app = c1LiveStore.readStore("applications").find((a) => a.applicationId === applicationId);
        return app ? resolvePhone(app) : null;
      })();

      if (!resolvedPhone) return { sent: false, reason: "no_phone" };

      const message = lang === "ar"
        ? `شكراً لتعاملكم معنا! كيف تقيّمون خدمة إعادة جدولة المتأخرات؟\n\nأرسل رقماً:\n1 — ممتاز\n2 — جيد\n3 — مقبول\n4 — ضعيف`
        : `Thank you for using MOEI's housing arrears rescheduling service! How would you rate your experience?\n\nReply with a number:\n1 — Excellent\n2 — Good\n3 — Fair\n4 — Poor`;

      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!phoneNumberId || !sendWhatsApp) return { sent: false, reason: "whatsapp_not_configured", message };

      await sendWhatsApp(phoneNumberId, resolvedPhone, message);
      console.log(`[csat-survey] Sent CSAT survey for ${applicationId}`);
      return { sent: true, message };
    } catch (err) {
      console.error(`[csat-survey] Error for ${applicationId}:`, err.message);
      return { sent: false, reason: err.message };
    }
  }

  return {
    sendStatusNotification,
    sendSLAWarning,
    sendDocumentReminder,
    sendCSATSurvey,
    runScheduledChecks,
    buildMessage
  };
}

module.exports = { createProactiveNotificationService };
