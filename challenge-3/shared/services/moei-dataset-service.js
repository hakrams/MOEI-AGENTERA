"use strict";

// MOEI official omnichannel dataset — 2024-2025
// Imported from Challenge 3 Excel: 300 WhatsApp + 400 Voice + 350 Web + 200 CRM + 250 Cases

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "../../data/moei-dataset");

let _cache = null;

function loadDataset() {
  if (_cache) return _cache;

  function readJson(file) {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf8"));
  }

  _cache = {
    whatsapp: readJson("whatsapp-logs.json"),
    voice: readJson("voice-logs.json"),
    web: readJson("web-sessions.json"),
    crm: readJson("crm-profiles.json"),
    cases: readJson("service-cases.json"),
    services: readJson("ministry-services.json"),
  };

  return _cache;
}

function countBy(arr, keyFn) {
  const counts = {};
  arr.forEach((item) => {
    const k = keyFn(item);
    if (k) counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

function topN(countMap, n = 8) {
  return Object.entries(countMap)
    .filter(([k]) => k && k !== "None" && k !== "null" && k !== "undefined")
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function avg(arr, keyFn) {
  const vals = arr.map(keyFn).filter((v) => v != null && !isNaN(v));
  return vals.length ? Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 10) / 10 : null;
}

function getOverviewStats() {
  const ds = loadDataset();

  const totalInteractions = ds.whatsapp.length + ds.voice.length + ds.web.length;
  const uniqueCustomers = new Set([
    ...ds.whatsapp.map((r) => r["Customer ID"]),
    ...ds.voice.map((r) => r["Customer ID"]),
    ...ds.web.map((r) => r["Customer ID"]),
  ]).size;

  // Channel breakdown
  const channelBreakdown = {
    whatsapp: ds.whatsapp.length,
    voice: ds.voice.length,
    web: ds.web.length,
  };

  // Sentiment across WhatsApp
  const waSentiment = countBy(ds.whatsapp, (r) => r["Sentiment Label"]);
  // Sentiment across voice
  const voiceSentiment = countBy(ds.voice, (r) => r["Overall Sentiment Label"]);
  // Merge
  const sentimentBreakdown = {};
  [waSentiment, voiceSentiment].forEach((s) => {
    Object.entries(s).forEach(([k, v]) => {
      const norm = k.toLowerCase();
      sentimentBreakdown[norm] = (sentimentBreakdown[norm] || 0) + v;
    });
  });

  // Top intents from WhatsApp
  const waIntents = countBy(ds.whatsapp, (r) => r["Bot Intent Detected"]);
  const topIntents = topN(waIntents, 8);

  // Top service categories across channels
  const waCats = countBy(ds.whatsapp, (r) => r["Service Category"]);
  const voiceCats = countBy(ds.voice, (r) => r["Service Category"]);
  const casesCats = countBy(ds.cases, (r) => r["Service Category"]);
  const allCats = {};
  [waCats, voiceCats, casesCats].forEach((c) =>
    Object.entries(c).forEach(([k, v]) => {
      allCats[k] = (allCats[k] || 0) + v;
    })
  );
  const topServiceCategories = topN(allCats, 8);

  // Escalation rate (WhatsApp)
  const escalatedWa = ds.whatsapp.filter((r) => r["Escalated to Human"] === "Yes").length;
  const escalationRate = ds.whatsapp.length
    ? Math.round((escalatedWa / ds.whatsapp.length) * 100)
    : 0;

  // CSAT averages
  const waCsat = avg(ds.whatsapp, (r) => r["CSAT Score (1-5)"]);
  const voiceCsat = avg(ds.voice, (r) => r["CSAT Score (1-5)"]);
  const webCsat = avg(ds.web, (r) => r["CSAT Score (1-5)"]);
  const csatAvg =
    [waCsat, voiceCsat, webCsat].filter(Boolean).reduce((a, b) => a + b, 0) /
    [waCsat, voiceCsat, webCsat].filter(Boolean).length || null;

  // Emirate breakdown
  const emirateBreakdown = countBy(ds.crm, (r) => r["Emirate"]);
  const topEmirates = topN(emirateBreakdown, 7);

  // FCR from voice
  const fcrYes = ds.voice.filter((r) => r["First Contact Resolution"] === "Yes").length;
  const fcrRate = ds.voice.length ? Math.round((fcrYes / ds.voice.length) * 100) : 0;

  // Language preference
  const langBreakdown = countBy(ds.crm, (r) => r["Language Preference"]);

  // Total cases
  const openCases = ds.cases.filter((r) => r["Status"] && !r["Status"].toLowerCase().includes("closed")).length;
  const closedCases = ds.cases.filter((r) => r["Status"] && r["Status"].toLowerCase().includes("closed")).length;

  return {
    source: "MOEI Official Omnichannel Dataset 2024-2025",
    datasetVersion: "1.0",
    importedAt: new Date(fs.statSync(path.join(DATA_DIR, "whatsapp-logs.json")).mtimeMs).toISOString(),
    totals: {
      totalInteractions,
      uniqueCustomers,
      crmProfiles: ds.crm.length,
      totalCases: ds.cases.length,
      openCases,
      closedCases,
      ministryServices: ds.services.length,
    },
    channelBreakdown,
    sentimentBreakdown,
    topIntents,
    topServiceCategories,
    escalationRate,
    fcrRate,
    csatAvg: csatAvg ? Math.round(csatAvg * 10) / 10 : null,
    csat: { whatsapp: waCsat, voice: voiceCsat, web: webCsat },
    topEmirates,
    langBreakdown,
  };
}

function lookupCustomerHistory(customerId) {
  if (!customerId) return null;
  const ds = loadDataset();

  const crmProfile = ds.crm.find((r) => r["Customer ID"] === customerId) || null;
  const waHistory = ds.whatsapp.filter((r) => r["Customer ID"] === customerId);
  const voiceHistory = ds.voice.filter((r) => r["Customer ID"] === customerId);
  const webHistory = ds.web.filter((r) => r["Customer ID"] === customerId);
  const caseHistory = ds.cases.filter((r) => r["Customer ID"] === customerId);

  if (!crmProfile && !waHistory.length && !voiceHistory.length && !caseHistory.length) {
    return null;
  }

  return {
    customerId,
    crmProfile,
    interactions: {
      whatsapp: waHistory.length,
      voice: voiceHistory.length,
      web: webHistory.length,
    },
    recentCases: caseHistory.slice(-3).map((c) => ({
      caseId: c["Case ID"],
      category: c["Service Category"],
      subService: c["Sub-Service"],
      status: c["Status"],
      priority: c["Priority"],
      opened: c["Date Opened"],
      descriptionEn: c["Issue Description (EN)"],
    })),
    lastWhatsappIntent:
      waHistory.length ? waHistory[waHistory.length - 1]["Bot Intent Detected"] : null,
    preferredChannel: crmProfile ? crmProfile["Preferred Channel"] : null,
    riskFlag: crmProfile ? crmProfile["Risk Flag"] : null,
    vipTier: crmProfile ? crmProfile["VIP Tier"] : null,
  };
}

module.exports = { getOverviewStats, lookupCustomerHistory, loadDataset };
