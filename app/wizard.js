/* ── MOEI C1 Wizard — Mobile PWA View ───────────────────────────────────
   Depends on: wizard-core.js (window.WizardCore)
   Routes:     /app/wizard.html
   Submit:     POST /api/challenge-1/applications
   Redirect:   /app/index.html?applicationId=APP-XXXXXX
   ─────────────────────────────────────────────────────────────────────── */

const WIZ = (() => {
  const core = window.WizardCore;

  // ── State ─────────────────────────────────────────────────────────────
  const state = {
    step:      1,
    lang:      'en',
    confirmed: false,
    submitting: false,
    submittedAppId: null,
    form: {
      name:        'Khalid Al Ketbi',
      emiratesId:  '784-1985-1234567-8',
      mobile:      '+971 50 123 4567',
      email:       '',
      salary:      '',
      obligations: '',
      dependents:  '',
      employment:  'employed',
      hardship:    '',
    },
    docs: {
      salary:  null,  // { base64, mimeType, fileName } | null
      bank:    null,
      support: null,
    }
  };

  function t(key) { return core.t(state.lang, key); }

  // ── Step 1: Start ──────────────────────────────────────────────────────
  function buildStep1() {
    return `
      <div class="wiz-hero">
        <div class="wiz-hero-tag">${t('s1Tag')}</div>
        <h1 class="wiz-hero-title">${t('s1Title')}</h1>
        <p class="wiz-hero-desc">${t('s1Desc')}</p>
        <p class="wiz-section-h">${t('s1NeedH')}</p>
        <ul class="wiz-need-list">
          <li><span class="wiz-need-check">✓</span>${t('s1Need1')}</li>
          <li><span class="wiz-need-check">✓</span>${t('s1Need2')}</li>
          <li><span class="wiz-need-check">✓</span>${t('s1Need3')}</li>
        </ul>
        <div class="wiz-rule-note">${t('s1Rule')}</div>
      </div>`;
  }

  // ── Step 2: Personal details ───────────────────────────────────────────
  function buildStep2() {
    const f = state.form;
    return `
      <div class="wiz-card">
        <div class="wiz-card-title">${t('s2Title')}</div>
        <div class="wiz-card-sub">${t('s2Sub')}</div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s2Name')}</label>
          <input class="wiz-input" id="wf-name" value="${esc(f.name)}" placeholder="${t('s2Name')}" />
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s2Eid')}</label>
          <input class="wiz-input" id="wf-eid" value="${esc(f.emiratesId)}" inputmode="numeric" />
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s2Mobile')}</label>
          <input class="wiz-input" id="wf-mobile" value="${esc(f.mobile)}" inputmode="tel" />
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s2Email')}</label>
          <input class="wiz-input" id="wf-email" value="${esc(f.email)}" type="email" inputmode="email" placeholder="name@example.com" />
        </div>
      </div>`;
  }

  // ── Step 3: Financial details ──────────────────────────────────────────
  function buildStep3() {
    const f = state.form;
    const sal = parseFloat(f.salary);
    const estVal = sal > 0
      ? `AED ${Math.floor(sal * 0.20).toLocaleString()} ${t('s3EstMo')}`
      : t('s3EstV');
    const opts = core.EMPLOYMENT[state.lang].map(o =>
      `<option value="${o.value}" ${f.employment === o.value ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    return `
      <div class="wiz-card">
        <div class="wiz-card-title">${t('s3Title')}</div>
        <div class="wiz-card-sub">${t('s3Sub')}</div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s3Sal')}</label>
          <input class="wiz-input" id="wf-salary" value="${esc(f.salary)}" type="number" min="0" inputmode="numeric" placeholder="0" />
        </div>
        <div class="wiz-estimate">
          <span class="wiz-estimate-label">${t('s3EstL')}</span>
          <span class="wiz-estimate-val" id="wiz-est">${estVal}</span>
        </div>
        <div class="wiz-field" style="margin-top:14px">
          <label class="wiz-label">${t('s3Obl')}</label>
          <input class="wiz-input" id="wf-obl" value="${esc(f.obligations)}" type="number" min="0" inputmode="numeric" placeholder="0" />
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s3Dep')}</label>
          <input class="wiz-input" id="wf-dep" value="${esc(f.dependents)}" type="number" min="0" max="20" inputmode="numeric" placeholder="0" />
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s3Emp')}</label>
          <select class="wiz-select" id="wf-emp">${opts}</select>
        </div>
        <div class="wiz-field">
          <label class="wiz-label">${t('s3Note')}</label>
          <textarea class="wiz-textarea" id="wf-hardship" placeholder="${t('s3NotePh')}">${esc(f.hardship)}</textarea>
        </div>
      </div>`;
  }

  // ── Step 4: Documents ──────────────────────────────────────────────────
  function buildStep4() {
    const demoLabels = {
      salary: { en: 'Use demo salary certificate', ar: 'استخدام شهادة راتب تجريبية' },
      bank:   { en: 'Use demo bank statement',    ar: 'استخدام كشف حساب تجريبي'   },
    };

    function uploadRow(icon, name, sub, id) {
      const doc = state.docs[id];
      const btnLabel  = doc ? '✓' : t('s4UpBtn');
      const statusText  = doc ? t('uploaded') : t('s4TapMsg');
      const statusColor = doc ? 'color:var(--green)' : 'color:var(--muted2)';
      const demoLabel = demoLabels[id]?.[state.lang];
      const demoBtn = demoLabel && !doc
        ? `<button class="wiz-demo-btn" id="demo-btn-${id}">${demoLabel}</button>`
        : '';
      return `
        <div class="wiz-upload-row">
          <div class="wiz-upload-icon">${icon}</div>
          <div class="wiz-upload-info">
            <div class="wiz-upload-name">${name}</div>
            <div class="wiz-upload-sub">${sub}</div>
            <div class="wiz-upload-status" style="${statusColor}">${statusText}</div>
          </div>
          <button class="wiz-upload-btn${doc ? ' uploaded' : ''}" id="doc-btn-${id}">${btnLabel}</button>
          <input type="file" id="doc-file-${id}" accept="image/*,application/pdf" capture="environment" style="display:none" />
        </div>
        ${demoBtn}`;
    }
    return `
      <div class="wiz-card">
        <div class="wiz-card-title">${t('s4Title')}</div>
        <div class="wiz-card-sub">${t('s4Sub')}</div>
        ${uploadRow('📄', t('s4SalN'), t('s4SalS'), 'salary')}
        ${uploadRow('🏦', t('s4BankN'), t('s4BankS'), 'bank')}
        ${uploadRow('📎', t('s4SupN'), t('s4SupS'), 'support')}
      </div>`;
  }

  // ── Step 5: Review summary ─────────────────────────────────────────────
  function buildStep5() {
    const f = state.form;
    const empOpts = core.EMPLOYMENT[state.lang];
    const empDisplay = (empOpts.find(o => o.value === f.employment) || {}).label || f.employment;
    const eidMasked = f.emiratesId
      ? f.emiratesId.slice(0, 7) + '·····' + f.emiratesId.slice(-1)
      : '—';

    function sumRow(label, val) {
      return `<div class="wiz-summary-row">
        <span class="wiz-summary-label">${label}</span>
        <span class="wiz-summary-value">${val || '—'}</span>
      </div>`;
    }
    function checkRow(label, val) {
      return `<div class="wiz-check-row">
        <div class="wiz-check-dot pass">✓</div>
        <span class="wiz-check-label">${label}</span>
        <span class="wiz-check-val">${val}</span>
      </div>`;
    }
    function docRow(label, docKey) {
      const uploaded = !!state.docs[docKey];
      return `<div class="wiz-summary-row">
        <span class="wiz-summary-label">${label}</span>
        <span style="font-size:12px;font-weight:600;${uploaded ? 'color:var(--green)' : 'color:var(--muted2)'}">
          ${uploaded ? t('uploaded') : t('notUploaded')}
        </span>
      </div>`;
    }

    return `
      <div class="wiz-card">
        <div class="wiz-card-title">${t('s5Title')}</div>
        <div class="wiz-card-sub">${t('s5Sub')}</div>

        <p class="wiz-section-h">${t('s5DetH')}</p>
        ${sumRow(t('nameL'),    f.name || '—')}
        ${sumRow(t('eidL'),     eidMasked)}
        ${sumRow(t('mobileL'),  f.mobile || '—')}
        ${sumRow(t('salL'),     f.salary ? `AED ${parseFloat(f.salary).toLocaleString()}` : '—')}
        ${sumRow(t('oblL'),     f.obligations ? `AED ${parseFloat(f.obligations).toLocaleString()}` : '—')}
        ${sumRow(t('depL'),     f.dependents || '—')}
        ${sumRow(t('empL'),     empDisplay)}

        <p class="wiz-section-h">${t('s5DocsH')}</p>
        ${docRow(t('s4SalN'),  'salary')}
        ${docRow(t('s4BankN'), 'bank')}
        ${docRow(t('s4SupN'),  'support')}

        <p class="wiz-section-h">${t('s5PolH')}</p>
        ${checkRow(t('s5CapL'), t('s5CapV'))}
        ${checkRow(t('s5PerL'), t('s5PerV'))}
        ${checkRow(t('s5ActL'), t('s5ActV'))}

        <label class="wiz-confirm-row">
          <input type="checkbox" id="wiz-confirm" ${state.confirmed ? 'checked' : ''} />
          <span class="wiz-confirm-text">${t('s5ConfirmText')}</span>
        </label>
      </div>`;
  }

  // ── Step 6: Submitted ──────────────────────────────────────────────────
  function buildStep6() {
    const appId = state.submittedAppId || 'APP-PENDING';
    return `
      <div class="wiz-card" style="text-align:center;padding:32px 20px">
        <div class="wiz-success-icon">✓</div>
        <div class="wiz-card-title" style="text-align:center;margin-bottom:8px">${t('s6Title')}</div>
        <div class="wiz-card-sub" style="text-align:center">${t('s6Sub')}</div>
        <div style="margin:20px 0">
          <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${t('s6RefL')}</div>
          <div class="wiz-ref-badge">${appId}</div>
        </div>
        <div style="display:flex;justify-content:center;gap:24px;padding:14px 0;border-top:1px solid var(--border2);border-bottom:1px solid var(--border2)">
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${t('s6StatL')}</div>
            <div style="font-size:13px;font-weight:700;color:var(--gold)">${t('s6StatV')}</div>
          </div>
        </div>
      </div>
      <div class="wiz-card">
        <p class="wiz-section-h">${t('s6NextH')}</p>
        <ul class="wiz-next-list">
          <li>${t('s6N1')}</li>
          <li>${t('s6N2')}</li>
          <li>${t('s6N3')}</li>
        </ul>
      </div>`;
  }

  // ── Bottom bar ─────────────────────────────────────────────────────────
  function buildBottomBar() {
    const TOTAL = 6;
    const isLast = state.step === TOTAL;
    let ctaLabel;
    if (state.submitting)       ctaLabel = t('s6Submitting');
    else if (isLast)            ctaLabel = t('s6Cta');
    else if (state.step === 1)  ctaLabel = t('s1Cta');
    else                        ctaLabel = t(`s${state.step}Cta`);

    let dots = '';
    for (let i = 1; i <= TOTAL; i++) {
      if (i > 1) dots += `<div class="wiz-step-line${i <= state.step ? ' done' : ''}"></div>`;
      const cls = i < state.step ? 'done' : i === state.step ? 'active' : '';
      dots += `<div class="wiz-step-dot ${cls}"></div>`;
    }
    return `
      <div class="wiz-bottom-bar">
        <button class="wiz-cta-btn${isLast ? ' green' : ''}" id="wiz-cta" ${state.submitting ? 'disabled' : ''}>${ctaLabel}</button>
        <div class="wiz-steps-row">${dots}</div>
        <div class="wiz-step-counter">${t('stepOf')(state.step)}</div>
      </div>`;
  }

  // ── Header ─────────────────────────────────────────────────────────────
  function buildHeader() {
    const stepName = t('stepLabels')[state.step - 1] || '';
    const langToggle = state.lang === 'en' ? 'العربية' : 'English';
    return `
      <div class="wiz-header">
        <button class="wiz-back" id="wiz-back">${state.step > 1 && !state.submitting ? t('back') : ''}</button>
        <div class="wiz-header-title">MOEI · ${stepName}</div>
        <button class="wiz-lang-btn" id="wiz-lang">${langToggle}</button>
      </div>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function esc(v) {
    if (!v) return '';
    return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function saveStep2() {
    state.form.name       = document.getElementById('wf-name')?.value   || state.form.name;
    state.form.emiratesId = document.getElementById('wf-eid')?.value    || state.form.emiratesId;
    state.form.mobile     = document.getElementById('wf-mobile')?.value || state.form.mobile;
    state.form.email      = document.getElementById('wf-email')?.value  || '';
  }

  function saveStep3() {
    state.form.salary      = document.getElementById('wf-salary')?.value   || '';
    state.form.obligations = document.getElementById('wf-obl')?.value      || '';
    state.form.dependents  = document.getElementById('wf-dep')?.value      || '';
    state.form.employment  = document.getElementById('wf-emp')?.value      || 'employed';
    state.form.hardship    = document.getElementById('wf-hardship')?.value || '';
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function makeDemoDoc(docKey) {
    const names = {
      salary: 'salary-certificate-demo-stamped-official.pdf',
      bank:   'bank-statement-demo-official.pdf'
    };
    return {
      base64: null,
      mimeType: null,
      fileName: names[docKey] || 'supporting-document-demo-official.pdf',
      demo: true
    };
  }

  // ── Phase 2: Submit flow ───────────────────────────────────────────────
  async function submitApplication() {
    state.submitting = true;
    render();

    try {
      // 1. Create application
      const payload = core.buildPayload(state.form, state.lang);
      const appRes  = await fetch('/api/challenge-1/applications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
      if (!appRes.ok) throw new Error('application_create_failed');
      const appData = await appRes.json();
      const applicationId = appData.application?.applicationId;
      if (!applicationId) throw new Error('no_application_id');

      // 2. Upload documents
      const docTypeMap = { salary: 'salary_certificate', bank: 'bank_statement', support: 'supporting_document' };
      for (const [key, doc] of Object.entries(state.docs)) {
        if (!doc) continue;
        await fetch(`/api/challenge-1/applications/${encodeURIComponent(applicationId)}/documents`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            documentType: docTypeMap[key] || key,
            fileBase64:   doc.base64 || null,
            mimeType:     doc.mimeType || null,
            fileName:     doc.fileName,
            source:       doc.demo ? 'pwa_wizard_demo_document' : 'pwa_wizard_upload'
          })
        });
      }

      // 3. Trigger assessment
      await fetch(`/api/challenge-1/applications/${encodeURIComponent(applicationId)}/assess`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({})
      });

      // 4. Show success
      state.submittedAppId = applicationId;
      state.step           = 6;
      state.submitting     = false;
      render();

    } catch (err) {
      console.error('Wizard submit error:', err);
      state.submitting = false;
      render();
      showToast(t('submitErr'));
    }
  }

  function showToast(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:180px;left:50%;transform:translateX(-50%);background:#ff6b75;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;max-width:300px;text-align:center';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  function next() {
    if (state.submitting) return;

    if (state.step === 2) {
      saveStep2();
      const { valid } = core.validate(2, state.form, state.lang);
      if (!valid) return;
    }
    if (state.step === 3) {
      saveStep3();
      const { valid } = core.validate(3, state.form, state.lang);
      if (!valid) return;
    }
    if (state.step === 5) {
      state.confirmed = document.getElementById('wiz-confirm')?.checked || false;
      submitApplication();
      return;
    }
    if (state.step === 6) {
      window.location.href = `./index.html?applicationId=${encodeURIComponent(state.submittedAppId)}&lang=${state.lang}`;
      return;
    }
    state.step = Math.min(state.step + 1, 6);
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    if (state.step <= 1 || state.submitting) return;
    state.step--;
    render();
    window.scrollTo(0, 0);
  }

  function toggleLang() {
    if (state.step === 2) saveStep2();
    if (state.step === 3) saveStep3();
    state.lang = state.lang === 'en' ? 'ar' : 'en';
    render();
  }

  // ── Event attachment ───────────────────────────────────────────────────
  function attachEvents() {
    document.getElementById('wiz-cta')?.addEventListener('click', next);
    document.getElementById('wiz-back')?.addEventListener('click', back);
    document.getElementById('wiz-lang')?.addEventListener('click', toggleLang);

    // Live salary estimate
    document.getElementById('wf-salary')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      const el = document.getElementById('wiz-est');
      if (el) {
        el.textContent = v > 0
          ? `AED ${Math.floor(v * 0.20).toLocaleString()} ${t('s3EstMo')}`
          : t('s3EstV');
      }
    });

    // Document upload — real FileReader
    ['salary', 'bank', 'support'].forEach(id => {
      const btn  = document.getElementById('doc-btn-' + id);
      const file = document.getElementById('doc-file-' + id);
      const demoBtn = document.getElementById('demo-btn-' + id);
      if (!btn || !file) return;

      btn.addEventListener('click', () => {
        if (state.docs[id]) {
          // Already uploaded — tap to re-upload
          state.docs[id] = null;
          render();
        } else {
          file.click();
        }
      });

      file.addEventListener('change', async () => {
        const f = file.files[0];
        if (!f) return;
        try {
          const base64 = await readFileAsBase64(f);
          state.docs[id] = { base64, mimeType: f.type, fileName: f.name };
          render();
        } catch (e) {
          console.error('File read error:', e);
        }
      });

      demoBtn?.addEventListener('click', () => {
        state.docs[id] = makeDemoDoc(id);
        render();
      });
    });

    // Confirm checkbox
    document.getElementById('wiz-confirm')?.addEventListener('change', (e) => {
      state.confirmed = e.target.checked;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function render() {
    const steps = [buildStep1, buildStep2, buildStep3, buildStep4, buildStep5, buildStep6];
    const content = steps[state.step - 1]();

    document.getElementById('wiz-root').innerHTML =
      buildHeader() +
      `<div class="wiz-body">${content}</div>` +
      buildBottomBar();

    document.documentElement.lang = state.lang;
    document.documentElement.dir  = state.lang === 'ar' ? 'rtl' : 'ltr';
    attachEvents();
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init() {
    const p = new URLSearchParams(location.search);
    const s = parseInt(p.get('step'));
    const l = p.get('lang');
    const a = p.get('appId');
    if (s >= 1 && s <= 6) state.step = s;
    if (l === 'ar') state.lang = 'ar';
    if (a) { state.submittedAppId = a; state.step = 6; }
    render();
  }

  return { init };
})();

WIZ.init();
