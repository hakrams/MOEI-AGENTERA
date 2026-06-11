const { assert, requestJson, withServer } = require("./challenge1-live-api-test-client");
const {
  closeBrowser,
  createPage,
  evalPage,
  launchChromium,
  navigate: navigateTo,
  waitForCondition
} = require("./challenge1-browser-test-client");

const port = Number(process.env.TEST_PORT || 9741);
const baseUrl = `http://127.0.0.1:${port}`;

async function navigate(session, pathname) {
  await navigateTo(session, `${baseUrl}${pathname}`);
}

async function seedCustomerSession(session, unique) {
  await evalPage(session, `
    (() => {
      const service = window.ArrearsFlowShared?.trustGateSessionService;
      if (!service) throw new Error('TrustGate session service missing');
      const trustSession = service.createSessionFromVerifiedPerson({
        serviceKey: 'housing_arrears_assistance_scheduling',
        verifiedPerson: {
          provider: 'trustgate',
          subjectId: 'LIVE-UI-${unique}',
          providerSubject: 'LIVE-UI-${unique}',
          accountLevel: 'simulated_number_match_and_pin',
          claims: {
            fullName: 'Live UI Customer ${unique}',
            fullNameAr: 'متعامل اختبار مباشر ${unique}',
            emiratesIdMasked: '784-1990-XXXXXXX-7',
            mobileMasked: '+971 50 XXX ${String(unique).slice(-4)}',
            emailMasked: 'live-ui-${unique}@example.test',
            nationality: 'United Arab Emirates'
          }
        }
      });
      service.saveSession(trustSession);
      service.ensureApplicantMemory(trustSession);
      return true;
    })()
  `);
}

async function submitCustomerApplication(session, unique) {
  await waitForCondition(session, "Boolean(document.getElementById('startNewApplicationBtn'))");
  await evalPage(session, "document.getElementById('startNewApplicationBtn').click(); true");
  await waitForCondition(session, "Boolean(document.getElementById('customerForm')) && !document.getElementById('journeyLayout').hidden");
  await evalPage(session, `
    (() => {
      document.getElementById('currentSalary').value = '18000';
      document.getElementById('remarks').value = 'Live browser verifier submission ${unique}';
      document.getElementById('acknowledgement').checked = true;
      for (const element of ['currentSalary', 'remarks']) {
        document.getElementById(element).dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.getElementById('acknowledgement').dispatchEvent(new Event('change', { bubbles: true }));
      const fileInput = document.getElementById('incomeDocumentFile');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['verified salary certificate'], 'salary-stamped-${unique}.pdf', { type: 'application/pdf' }));
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('customerForm').requestSubmit();
      return true;
    })()
  `);
  await waitForCondition(session, `
    (() => {
      const text = document.getElementById('confirmationCard')?.textContent || '';
      return /APP-|تم إنشاء رقم طلب|case ID|قائمة العمل|officer/i.test(text + document.body.textContent);
    })()
  `);
  return evalPage(session, `
    (() => ({
      confirmation: document.getElementById('confirmationCard')?.textContent.trim() || '',
      bodyText: document.body.textContent.replace(/\\s+/g, ' ').trim().slice(0, 1500)
    }))()
  `);
}

async function main() {
  const unique = Date.now();
  const launched = await launchChromium();
  const browserPort = new URL(launched.endpoint).port;
  let session = null;

  try {
    await withServer(port, async () => {
      const reset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
      assert(reset.statusCode === 200, `reset failed with ${reset.statusCode}`);

      session = await createPage(browserPort);
      await navigate(session, "/customer/housing-arrears/?lang=ar");
      await seedCustomerSession(session, unique);
      await navigate(session, "/customer/housing-arrears/?lang=ar");
      const snapshot = await submitCustomerApplication(session, unique);

      const queue = await requestJson(port, "GET", "/api/challenge-1/office/queue");
      assert(queue.statusCode === 200, `office queue failed with ${queue.statusCode}`);
      const match = queue.body.applications.find((item) => item.customer?.displayName?.includes(String(unique)) || item.remarks?.includes(String(unique)));
      assert(match, "Visible customer UI submission did not reach the live office queue", { snapshot, queue: queue.body });
      assert(match.status === "waiting_for_programme_data" || match.status === "application_submitted" || match.status === "waiting_for_assessment", `unexpected live application status: ${match.status}`);

      const finalReset = await requestJson(port, "POST", "/api/challenge-1/test/reset", {});
      assert(finalReset.statusCode === 200, `final reset failed with ${finalReset.statusCode}`);
      const empty = await requestJson(port, "GET", "/api/challenge-1/test/empty-state");
      assert(empty.statusCode === 200 && empty.body.empty === true, "stores were not wiped after live UI verifier");
    });
  } finally {
    if (session) session.close();
    closeBrowser(launched);
  }

  console.log("Challenge 1 live UI customer-submission verifier passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
