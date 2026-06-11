#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertNotIncludes(relPath, needle, message) {
  const source = read(relPath);
  assert(!source.includes(needle), `${relPath}: ${message}`);
}

function assertIncludes(relPath, needle, message) {
  const source = read(relPath);
  assert(source.includes(needle), `${relPath}: ${message}`);
}

function assertRegex(relPath, regex, message) {
  const source = read(relPath);
  assert(regex.test(source), `${relPath}: ${message}`);
}

// /app must not default to demo or fall back to demo from unknown live IDs.
assertIncludes("app/app.js", 'viewMode:        "entry"', "Case Cockpit should open in live entry mode.");
assertNotIncludes("app/app.js", 'demoKey:         "missing_document"', "Case Cockpit must not default to missing_document demo.");
assertNotIncludes("app/app.js", "MOCK_CASES[state.demoKey] || MOCK_CASES.missing_document", "Case Cockpit must not fall back to a mock case.");
assertRegex("server.js", /requestUrl\.searchParams\.get\("debug"\) === "1"[\s\S]*APP_CITIZEN_MAP/, "Demo case API must be gated behind debug=1.");
assertNotIncludes("server.js", 'APP_CITIZEN_MAP[key.toLowerCase()] || "missing_document"', "Unknown case IDs must not fall back to missing_document.");
assertIncludes("server.js", 'sendJson(res, 404, { error: "application_not_found"', "Unknown cockpit cases should return 404.");

// C1 customer live route must not seed/resume application data from mock or local workflow state.
assertNotIncludes("customer/housing-arrears/app.js", "resetCustomerEnteredFields(mockCases[0]", "Customer route must not initialize from mockCases[0].");
assertNotIncludes("customer/housing-arrears/app.js", "workflow.saveWorkspaceState", "Customer live workspace must not persist application bodies to workflow localStorage.");
assertNotIncludes("customer/housing-arrears/app.js", "workflow.saveSubmission", "Customer live submission must not use workflow localStorage.");
assertNotIncludes("customer/housing-arrears/app.js", "localStorage.setItem(STORAGE_KEY", "Customer live route must not write application submissions to localStorage.");
assertRegex("customer/housing-arrears/app.js", /async function saveLiveSubmission\(\)[\s\S]*throw new Error\("Live application API is unavailable\."\)/, "Customer live submit should fail if live API is unavailable.");
assertRegex("customer/housing-arrears/app.js", /function readSubmissions\(\) \{\s*return \[\];\s*\}/, "Customer live route should not read browser submissions.");

// C1 office must render server queue only.
assertNotIncludes("office/housing-arrears/app.js", "selectedCase: mockCases[0]", "Office route must not default to mockCases[0].");
assertRegex("office/housing-arrears/app.js", /function getOfficeCases\(\) \{\s*return state\.liveOfficeCases;\s*\}/, "Office queue should use server live cases only.");
assertRegex("office/housing-arrears/app.js", /function readCustomerSubmissions\(\) \{\s*return \[\];\s*\}/, "Office route should not read browser submissions.");
assertNotIncludes("office/housing-arrears/app.js", "remainingMocks", "Office live queue must not merge mock cases.");

// C3 intake must submit the C1 nested payload contract and track returned applicationId.
assertIncludes("challenge-3/customer/omnichannel-intake/app.js", "customer: {", "C3 intake payload should include nested customer object.");
assertIncludes("challenge-3/customer/omnichannel-intake/app.js", "financial: {", "C3 intake payload should include nested financial object.");
assertIncludes("challenge-3/customer/omnichannel-intake/app.js", "data.application?.applicationId", "C3 intake should use returned applicationId.");
assertNotIncludes("challenge-3/customer/omnichannel-intake/app.js", "/api/challenge-1/applications?customerId=", "C3 intake should not call unsupported collection query.");

// C3 bridge must locate C1 records through the live store schema.
assertIncludes("challenge-3/shared/services/challenge1-bridge-service.js", "a.customer?.identityRef === customerId", "C3 bridge should match C1 customer.identityRef.");
assertIncludes("challenge-3/shared/services/challenge1-bridge-service.js", "const applicationId = application.applicationId", "C3 bridge should normalize application.applicationId.");
assertNotIncludes("challenge-3/shared/services/challenge1-bridge-service.js", "application.id", "C3 bridge must not use stale application.id.");
assertNotIncludes("challenge-3/shared/services/challenge1-bridge-service.js", "a.emiratesId === customerId || a.customerId === customerId", "C3 bridge must not use stale flat customer fields.");

// Demo programme data must be opt-in.
assertRegex("server.js", /MOEI_ENABLE_DEMO_PROGRAMME_SEED[\s\S]*demoProgrammeData/, "Programme-data demo seed must require explicit opt-in.");
assertNotIncludes("server.js", 'if (!programmeLoan && application.channel === "pwa_wizard") {', "Programme data must not auto-seed for normal live wizard submissions.");

if (failures.length) {
  console.error("Live runtime purification verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Live runtime purification verifier passed.");
