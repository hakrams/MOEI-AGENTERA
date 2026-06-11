(function attachMoeiTrustGateWorkspaceAuth(root) {
  "use strict";

  const RESULT_VERSION = "trustgate-result.v1";
  const DEFAULT_TTL_MINUTES = 30;

  const strings = {
    ar: {
      signIn: "الدخول عبر TrustGate",
      lockedTitle: "تسجيل الدخول مطلوب",
      lockedCopy: "هذه المساحة محمية. استخدم TrustGate للتحقق من صلاحيتك قبل عرض البيانات.",
      privilege: "الصلاحية المطلوبة",
      failed: "لم يكتمل تسجيل الدخول عبر TrustGate.",
      badPrivilege: "حساب TrustGate لا يملك الصلاحية المطلوبة.",
      signedIn: "تم الدخول عبر TrustGate",
      logout: "تسجيل الخروج"
    },
    en: {
      signIn: "Sign in with TrustGate",
      lockedTitle: "Sign in required",
      lockedCopy: "This workspace is protected. Use TrustGate to verify your access before viewing data.",
      privilege: "Required privilege",
      failed: "TrustGate sign-in was not completed.",
      badPrivilege: "This TrustGate account does not have the required privilege.",
      signedIn: "Signed in with TrustGate",
      logout: "Logout"
    }
  };

  function lang() {
    const query = new URLSearchParams(root.location.search);
    const htmlLang = document.documentElement.lang;
    return query.get("lang") === "en" || htmlLang === "en" ? "en" : "ar";
  }

  function t(key) {
    return (strings[lang()] || strings.ar)[key] || strings.en[key] || key;
  }

  function runtimeIdentityProvider() {
    const config = root.ArrearsFlowRuntimeConfig || {};
    return config.identityProvider || {};
  }

  function trustGateBaseUrl() {
    const provider = runtimeIdentityProvider();
    const base = provider.baseUrl || "http://127.0.0.1:9715/";
    return base.endsWith("/") ? base : `${base}/`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function decodeBase64UrlJson(value) {
    if (!value) throw new Error("Missing TrustGate result payload.");
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function storageKey(options) {
    return options.storageKey || `moei-trustgate-workspace-session:${options.service || "workspace"}`;
  }

  function readSession(options) {
    try {
      const session = JSON.parse(sessionStorage.getItem(storageKey(options)) || "null");
      if (!session || session.sessionVersion !== "moei-trustgate-workspace-session.v1") return null;
      if (new Date(session.expiresAt || 0).getTime() <= Date.now()) {
        clearSession(options);
        return null;
      }
      if (options.requiredPrivilege && !session.privileges.includes(options.requiredPrivilege)) {
        clearSession(options);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function saveSession(options, result) {
    const subject = result.subject || {};
    const privileges = normalizePrivileges(result);
    const createdAt = new Date(result.approvedAt || Date.now());
    const ttl = Number(options.ttlMinutes || DEFAULT_TTL_MINUTES);
    const session = {
      sessionVersion: "moei-trustgate-workspace-session.v1",
      subjectId: subject.subjectId,
      displayName: subject.displayName || "Verified user",
      role: subject.officialRole || subject.role || "Verified user",
      groups: Array.isArray(subject.groups) ? subject.groups : [],
      privileges,
      trustGateRequestId: result.requestId,
      service: result.service || options.service || "workspace",
      loggedInAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + ttl * 60 * 1000).toISOString()
    };
    sessionStorage.setItem(storageKey(options), JSON.stringify(session));
    return session;
  }

  function clearSession(options) {
    sessionStorage.removeItem(storageKey(options));
  }

  function normalizePrivileges(result) {
    const subjectPrivileges = Array.isArray(result.subject?.privileges) ? result.subject.privileges : [];
    const resultPrivileges = Array.isArray(result.subjectPrivileges) ? result.subjectPrivileges : [];
    return Array.from(new Set([...subjectPrivileges, ...resultPrivileges].filter(Boolean)));
  }

  function cleanUrl() {
    const url = new URL(root.location.href);
    ["trustGateRequestId", "trustGateStatus", "trustGatePurpose", "trustGateResult"].forEach((key) => {
      url.searchParams.delete(key);
    });
    root.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function returnUrlForCurrentPage() {
    const url = new URL(root.location.href);
    ["trustGateRequestId", "trustGateStatus", "trustGatePurpose", "trustGateResult"].forEach((key) => {
      url.searchParams.delete(key);
    });
    return url.toString();
  }

  function consumeCallback(options) {
    const query = new URLSearchParams(root.location.search);
    if (query.get("trustGatePurpose") !== "login") return { consumed: false, session: readSession(options), error: "" };

    if (query.get("trustGateStatus") !== "approved") {
      clearSession(options);
      cleanUrl();
      return { consumed: true, session: null, error: t("failed") };
    }

    try {
      const result = decodeBase64UrlJson(query.get("trustGateResult"));
      const privileges = normalizePrivileges(result);
      const checks = [
        [result.resultVersion === RESULT_VERSION, "Unexpected TrustGate result contract."],
        [result.status === "approved", t("failed")],
        [result.purpose === "login", t("failed")],
        [query.get("trustGateRequestId") === result.requestId, "TrustGate request IDs did not match."],
        [!options.requiredPrivilege || privileges.includes(options.requiredPrivilege), t("badPrivilege")]
      ];
      const failed = checks.find(([passed]) => !passed);
      if (failed) {
        clearSession(options);
        cleanUrl();
        return { consumed: true, session: null, error: failed[1] };
      }
      const session = saveSession(options, result);
      cleanUrl();
      return { consumed: true, session, error: "" };
    } catch (error) {
      clearSession(options);
      cleanUrl();
      return { consumed: true, session: null, error: error.message || t("failed") };
    }
  }

  function startLogin(options) {
    const loginUrl = new URL("/", trustGateBaseUrl());
    loginUrl.searchParams.set("client", "moei");
    loginUrl.searchParams.set("purpose", "login");
    loginUrl.searchParams.set("service", options.service || "workspace");
    loginUrl.searchParams.set("lang", lang());
    if (options.requiredPrivilege) loginUrl.searchParams.set("requiredPrivilege", options.requiredPrivilege);
    loginUrl.searchParams.set("returnUrl", returnUrlForCurrentPage());
    root.location.href = loginUrl.toString();
  }

  function injectStyles() {
    if (document.getElementById("moeiTrustGateWorkspaceAuthStyles")) return;
    const style = document.createElement("style");
    style.id = "moeiTrustGateWorkspaceAuthStyles";
    style.textContent = `
      body.moei-auth-locked > :not(.moei-auth-gate) { display: none !important; }
      .moei-auth-gate {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 28px;
        background: #f8f5ef;
        color: #101828;
        font-family: "Segoe UI", system-ui, sans-serif;
      }
      .moei-auth-card {
        width: min(520px, 100%);
        background: #fff;
        border: 1px solid #d8c7a3;
        box-shadow: 0 24px 70px rgba(16, 24, 40, 0.12);
        padding: 32px;
      }
      .moei-auth-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
      }
      .moei-auth-mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        background: #8a650d;
        color: #fff;
        font-weight: 800;
      }
      .moei-auth-card h1 {
        margin: 0 0 10px;
        font-size: 28px;
        line-height: 1.15;
      }
      .moei-auth-card p {
        color: #667085;
        line-height: 1.7;
        margin: 0 0 18px;
      }
      .moei-auth-privilege {
        display: inline-flex;
        border: 1px solid #d8c7a3;
        color: #8a650d;
        font-size: 12px;
        font-weight: 700;
        padding: 6px 10px;
        margin-bottom: 14px;
      }
      .moei-auth-error {
        border-inline-start: 4px solid #c1121f;
        background: #fff5f5;
        color: #8a1c1c;
        padding: 10px 12px;
        margin-bottom: 16px;
      }
      .moei-auth-button {
        border: 0;
        background: #8a650d;
        color: #fff;
        padding: 13px 20px;
        font-weight: 800;
        cursor: pointer;
      }
      .moei-session-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-bottom: 1px solid rgba(138, 101, 13, 0.25);
        background: #fffaf0;
        color: #101828;
        font: 13px "Segoe UI", system-ui, sans-serif;
      }
      .moei-session-bar strong { color: #8a650d; }
      .moei-session-bar button {
        margin-inline-start: auto;
        border: 1px solid #d8c7a3;
        background: transparent;
        color: #8a650d;
        padding: 5px 10px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function renderGate(options, error) {
    injectStyles();
    document.body.classList.add("moei-auth-locked");
    let gate = document.getElementById("moeiTrustGateAuthGate");
    if (!gate) {
      gate = document.createElement("main");
      gate.id = "moeiTrustGateAuthGate";
      gate.className = "moei-auth-gate";
      document.body.prepend(gate);
    }
    gate.innerHTML = `
      <section class="moei-auth-card" aria-labelledby="moeiAuthTitle">
        <div class="moei-auth-brand">
          <div class="moei-auth-mark">TG</div>
          <div>
            <strong>TrustGate</strong>
            <div>${escapeHtml(options.productName || "MOEI protected workspace")}</div>
          </div>
        </div>
        <span class="moei-auth-privilege">${escapeHtml(t("privilege"))}: ${escapeHtml(options.requiredPrivilege || "verified login")}</span>
        <h1 id="moeiAuthTitle">${escapeHtml(options.title || t("lockedTitle"))}</h1>
        <p>${escapeHtml(options.copy || t("lockedCopy"))}</p>
        ${error ? `<div class="moei-auth-error" role="alert">${escapeHtml(error)}</div>` : ""}
        <button class="moei-auth-button" id="moeiTrustGateLoginButton" type="button">${escapeHtml(t("signIn"))}</button>
      </section>
    `;
    document.getElementById("moeiTrustGateLoginButton").addEventListener("click", () => startLogin(options));
  }

  function renderSessionBar(options, session) {
    injectStyles();
    document.body.classList.remove("moei-auth-locked");
    document.getElementById("moeiTrustGateAuthGate")?.remove();
    if (document.getElementById("moeiTrustGateSessionBar")) return;
    const bar = document.createElement("div");
    bar.id = "moeiTrustGateSessionBar";
    bar.className = "moei-session-bar";
    bar.innerHTML = `
      <span>${escapeHtml(t("signedIn"))}</span>
      <strong>${escapeHtml(session.displayName)}</strong>
      <span>${escapeHtml(session.role)}</span>
      <button type="button">${escapeHtml(t("logout"))}</button>
    `;
    bar.querySelector("button").addEventListener("click", () => {
      clearSession(options);
      root.location.href = returnUrlForCurrentPage();
    });
    document.body.prepend(bar);
  }

  function requireAccess(options = {}) {
    const result = consumeCallback(options);
    const session = result.session || readSession(options);
    if (!session) {
      renderGate(options, result.error);
      return null;
    }
    renderSessionBar(options, session);
    return session;
  }

  root.MoeiTrustGateAuth = {
    clearSession,
    readSession,
    requireAccess,
    startLogin
  };
})(window);
