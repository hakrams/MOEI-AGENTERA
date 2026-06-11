const path = require("path");
const { assert, withServer } = require("./challenge1-live-api-test-client");
const {
  capturePng,
  closeBrowser,
  createPage,
  evalPage,
  launchChromium,
  navigate,
  waitForCondition
} = require("./challenge1-browser-test-client");

const port = Number(process.env.TEST_PORT || 9743);
const baseUrl = `http://127.0.0.1:${port}`;

async function officeLockedSnapshot(session) {
  return evalPage(session, `(() => {
    function isVisible(element) {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return element.getClientRects().length > 0;
    }
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    const gate = document.getElementById('officeAuthGate');
    return {
      locked: document.body.classList.contains('office-auth-locked'),
      sidebarVisible: isVisible(sidebar),
      gateVisible: isVisible(gate),
      loginButtonVisible: isVisible(document.getElementById('officeTrustGateLoginBtn')),
      languageButtonVisible: isVisible(document.getElementById('officeAuthLanguageBtn')),
      navVisible: isVisible(document.querySelector('.nav-list')),
      topbarVisible: isVisible(document.querySelector('.topbar')),
      caseQueueVisible: isVisible(document.getElementById('caseQueue')),
      approveButtonVisible: isVisible(document.getElementById('approveBtn')),
      appShellDisplay: getComputedStyle(document.querySelector('.app-shell')).display,
      mainMinHeight: getComputedStyle(main).minHeight,
      bodyText: document.body.textContent.replace(/\\s+/g, ' ').trim().slice(0, 1000)
    };
  })()`);
}

async function main() {
  const launched = await launchChromium();
  const browserPort = new URL(launched.endpoint).port;
  let session = null;

  try {
    await withServer(port, async () => {
      session = await createPage(browserPort, { width: 1440, height: 1000 });
      await navigate(session, `${baseUrl}/office/housing-arrears/?lang=en`);
      await waitForCondition(session, "document.body.classList.contains('office-auth-locked') && Boolean(document.getElementById('officeAuthGate'))", 10000);

      const locked = await officeLockedSnapshot(session);
      assert(locked.locked, "Office route did not enter locked mode", locked);
      assert(locked.gateVisible && locked.loginButtonVisible, "Office login gate or TrustGate button is not visible", locked);
      assert(locked.languageButtonVisible, "Locked login screen should keep language switching available", locked);
      assert(!locked.sidebarVisible, "Sidebar must be hidden before officer login", locked);
      assert(!locked.navVisible && !locked.topbarVisible, "Dashboard navigation/header must be hidden before officer login", locked);
      assert(!locked.caseQueueVisible && !locked.approveButtonVisible, "Case queue/actions must be hidden before officer login", locked);
      assert(locked.appShellDisplay === "block", "Locked app shell should not use the dashboard grid", locked);
      assert(locked.bodyText.includes("Sign in to officer workspace"), "Locked login copy is missing", locked);

      await capturePng(
        session,
        path.join(__dirname, "..", "planning", "01-references", "challenge-1-live-ui-2026-06-06", "office-auth-locked-screen.png")
      );
    });
  } finally {
    if (session) session.close();
    closeBrowser(launched);
  }

  console.log("Challenge 1 office auth locked-screen verifier passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
