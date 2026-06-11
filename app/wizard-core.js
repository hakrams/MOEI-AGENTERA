/* ── MOEI C1 Wizard — Core (shared between mobile and web views) ─────── */
/* Exports: window.WizardCore                                             */
/* Never import translation APIs. All labels are static.                  */

window.WizardCore = (() => {

  // ── i18n dictionary — UI labels only, never citizen data ─────────────
  const T = {
    en: {
      stepLabels: ['Start','Details','Finance','Docs','Review','Submit'],
      stepOf:     (n) => `Step ${n} of 6`,
      back:       '‹',

      s1Tag:    'Sheikh Zayed Housing Programme',
      s1Title:  'Housing Arrears Rescheduling',
      s1Desc:   'Restructure your outstanding housing arrears into manageable monthly instalments.',
      s1NeedH:  'What you need',
      s1Need1:  'Emirates ID — verified via TrustGate',
      s1Need2:  'Salary certificate (max 30 days old)',
      s1Need3:  'Recent bank statement (optional)',
      s1Rule:   '⚖ Monthly instalment will not exceed 20% of your gross salary.',
      s1Cta:    'Start Request',

      s2Title:  'Personal Details',
      s2Sub:    'Verified from your TrustGate account. You may edit if needed.',
      s2Name:   'Full name',
      s2Eid:    'Emirates ID',
      s2Mobile: 'Mobile number',
      s2Email:  'Email address (optional)',
      s2Cta:    'Continue',

      s3Title:  'Financial Details',
      s3Sub:    'Used to calculate your safe monthly repayment.',
      s3Sal:    'Monthly salary (AED)',
      s3Obl:    'Monthly obligations (AED)',
      s3Dep:    'No. of dependents',
      s3Emp:    'Employment status',
      s3Note:   'Hardship note (optional)',
      s3NotePh: 'Briefly describe your financial situation...',
      s3Emp1:   'Employed',
      s3Emp2:   'Self-employed',
      s3Emp3:   'Retired',
      s3Emp4:   'Not employed',
      s3EstL:   'Est. safe monthly repayment',
      s3EstV:   'Enter salary to calculate',
      s3EstMo:  '/ mo',
      s3Cta:    'Continue',

      s4Title:  'Documents',
      s4Sub:    'Upload supporting documents for your request.',
      s4SalN:   'Salary certificate',
      s4SalS:   'Within 30 days · Stamped · Required',
      s4BankN:  'Bank statement',
      s4BankS:  'Recommended for instant assessment',
      s4SupN:   'Supporting document',
      s4SupS:   'Hardship letter, medical report · Optional',
      s4UpBtn:  'Upload',
      s4TapMsg: 'Not uploaded',
      s4Cta:    'Continue',

      s5Title:  'Review Request',
      s5Sub:    'Confirm your information before submitting.',
      s5DetH:   'Your details',
      s5DocsH:  'Documents',
      s5PolH:   'Policy pre-check',
      s5CapL:   '20% salary cap',
      s5CapV:   'Within limit',
      s5PerL:   'Arrears period',
      s5PerV:   'Eligible for rescheduling',
      s5ActL:   'Existing requests',
      s5ActV:   'No conflicts found',
      s5ConfirmText: 'I confirm the above information is correct and complete.',
      s5Cta:    'Submit Request',

      s6Title:     'Request Submitted',
      s6Sub:       'Your request has been received and is under review.',
      s6RefL:      'Reference',
      s6StatL:     'Status',
      s6StatV:     'Under Review',
      s6NextH:     'What happens next',
      s6N1:        'Your documents will be reviewed within 2 working days.',
      s6N2:        'An officer will be assigned once the financial study is complete.',
      s6N3:        'Track your case status in the Case Cockpit.',
      s6Cta:       'View Case Status',
      s6Submitting:'Submitting...',

      nameL:       'Name',
      eidL:        'Emirates ID',
      mobileL:     'Mobile',
      salL:        'Monthly salary',
      oblL:        'Obligations',
      depL:        'Dependents',
      empL:        'Employment',
      notUploaded: 'Not uploaded',
      uploaded:    '✓ Uploaded',
      errRequired: 'This field is required',
      errSalary:   'Enter a valid salary',
      submitErr:   'Unable to submit — check your connection',
    },
    ar: {
      stepLabels: ['البدء','البيانات','المالية','المستندات','المراجعة','التقديم'],
      stepOf:     (n) => `الخطوة ${n} من 6`,
      back:       '›',

      s1Tag:    'برنامج الشيخ زايد للإسكان',
      s1Title:  'إعادة جدولة متأخرات الإسكان',
      s1Desc:   'أعد جدولة متأخراتك السكنية المتراكمة على أقساط شهرية ميسّرة.',
      s1NeedH:  'ما ستحتاجه',
      s1Need1:  'هوية إماراتية — موثقة عبر TrustGate',
      s1Need2:  'شهادة راتب حديثة (أقل من 30 يوماً)',
      s1Need3:  'كشف حساب بنكي حديث (اختياري)',
      s1Rule:   '⚖ لا يتجاوز القسط الشهري 20% من إجمالي الراتب.',
      s1Cta:    'ابدأ الطلب',

      s2Title:  'البيانات الشخصية',
      s2Sub:    'مؤكدة من حسابك في TrustGate. يمكنك التعديل عند الحاجة.',
      s2Name:   'الاسم الكامل',
      s2Eid:    'رقم الهوية الإماراتية',
      s2Mobile: 'رقم الهاتف المتحرك',
      s2Email:  'البريد الإلكتروني (اختياري)',
      s2Cta:    'متابعة',

      s3Title:  'التفاصيل المالية',
      s3Sub:    'تُستخدم لحساب القسط الشهري الآمن المقدّر.',
      s3Sal:    'الراتب الشهري (درهم)',
      s3Obl:    'الالتزامات الشهرية (درهم)',
      s3Dep:    'عدد المعالين',
      s3Emp:    'الحالة الوظيفية',
      s3Note:   'ملاحظة الصعوبة (اختياري)',
      s3NotePh: 'صف باختصار وضعك المالي...',
      s3Emp1:   'موظف',
      s3Emp2:   'أعمال حرة',
      s3Emp3:   'متقاعد',
      s3Emp4:   'غير موظف',
      s3EstL:   'القسط الشهري الآمن المقدّر',
      s3EstV:   'أدخل الراتب للحساب',
      s3EstMo:  '/ شهرياً',
      s3Cta:    'متابعة',

      s4Title:  'المستندات',
      s4Sub:    'ارفع المستندات الداعمة لطلبك.',
      s4SalN:   'شهادة الراتب',
      s4SalS:   'خلال 30 يوماً · بختم رسمي · إلزامي',
      s4BankN:  'كشف الحساب البنكي',
      s4BankS:  'يوصى به لإتمام التقييم الفوري',
      s4SupN:   'مستند داعم',
      s4SupS:   'رسالة صعوبة، تقرير طبي · اختياري',
      s4UpBtn:  'رفع',
      s4TapMsg: 'لم يُرفع بعد',
      s4Cta:    'متابعة',

      s5Title:  'مراجعة الطلب',
      s5Sub:    'أكّد بياناتك قبل تقديم الطلب.',
      s5DetH:   'بياناتك',
      s5DocsH:  'المستندات',
      s5PolH:   'الفحص المسبق للسياسة',
      s5CapL:   'حد 20% من الراتب',
      s5CapV:   'ضمن الحد المسموح',
      s5PerL:   'فترة المتأخرات',
      s5PerV:   'مؤهل لإعادة الجدولة',
      s5ActL:   'الطلبات النشطة',
      s5ActV:   'لا توجد تعارضات',
      s5ConfirmText: 'أؤكد صحة واكتمال البيانات والمستندات المقدمة.',
      s5Cta:    'تقديم الطلب',

      s6Title:     'تم تقديم الطلب',
      s6Sub:       'استُلم طلبك وهو قيد المراجعة.',
      s6RefL:      'رقم الطلب',
      s6StatL:     'الحالة',
      s6StatV:     'قيد المراجعة',
      s6NextH:     'ما الذي سيحدث بعد ذلك',
      s6N1:        'ستُراجع مستنداتك خلال يومَي عمل.',
      s6N2:        'سيُسند طلبك لموظف مختص بعد اكتمال الدراسة المالية.',
      s6N3:        'تابع حالة طلبك عبر بوابة الطلب.',
      s6Cta:       'عرض حالة الطلب',
      s6Submitting:'جارٍ التقديم...',

      nameL:       'الاسم',
      eidL:        'الهوية',
      mobileL:     'الهاتف',
      salL:        'الراتب الشهري',
      oblL:        'الالتزامات',
      depL:        'المعالون',
      empL:        'الوظيفة',
      notUploaded: 'لم يُرفع بعد',
      uploaded:    '✓ تم الرفع',
      errRequired: 'هذا الحقل إلزامي',
      errSalary:   'أدخل راتباً صحيحاً',
      submitErr:   'تعذّر التقديم — يرجى التأكد من الاتصال',
    }
  };

  function t(lang, key) {
    return T[lang] && T[lang][key] !== undefined ? T[lang][key] : key;
  }

  // ── Employment options ────────────────────────────────────────────────
  const EMPLOYMENT = {
    en: [
      { value: 'employed',      label: 'Employed'       },
      { value: 'self_employed', label: 'Self-employed'  },
      { value: 'retired',       label: 'Retired'        },
      { value: 'not_employed',  label: 'Not employed'   },
    ],
    ar: [
      { value: 'employed',      label: 'موظف'       },
      { value: 'self_employed', label: 'أعمال حرة'  },
      { value: 'retired',       label: 'متقاعد'     },
      { value: 'not_employed',  label: 'غير موظف'   },
    ]
  };

  // ── Validation — returns { valid, errors: { field: message } } ────────
  function validate(step, form, lang) {
    const errors = {};
    const required = t(lang, 'errRequired');
    if (step === 2) {
      if (!form.name?.trim())       errors.name       = required;
      if (!form.emiratesId?.trim()) errors.emiratesId = required;
      if (!form.mobile?.trim())     errors.mobile     = required;
    }
    if (step === 3) {
      const sal = parseFloat(form.salary);
      if (!form.salary || isNaN(sal) || sal <= 0) errors.salary = t(lang, 'errSalary');
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  // ── Payload builder — maps wizard form state → server body ────────────
  // Rule: citizen-entered values (name, EID, salary) are NEVER translated.
  // Only the channel/language metadata is set from state.lang.
  function buildPayload(form, lang) {
    return {
      language:           lang || 'en',
      channel:            'pwa_wizard',
      source:             'live_customer_api',
      applicantName:      form.name        || null,
      emiratesId:         form.emiratesId  || null,
      phone:              form.mobile      || null,
      email:              form.email       || null,
      currentSalary:      parseFloat(form.salary)      || 0,
      monthlyObligations: parseFloat(form.obligations) || 0,
      dependentsCount:    parseInt(form.dependents)    || 0,
      familyMembersCount: Math.max(1, (parseInt(form.dependents) || 0) + 1),
      employmentStatus:   form.employment  || 'employed',
      remarks:            form.hardship    || '',
      acknowledgement:    true,
      financial: {
        currentSalary:      parseFloat(form.salary)      || 0,
        monthlyObligations: parseFloat(form.obligations) || 0,
      },
      family: {
        dependentsCount:    parseInt(form.dependents) || 0,
        familyMembersCount: Math.max(1, (parseInt(form.dependents) || 0) + 1),
      },
      customer: {
        displayName:      form.name       || null,
        emiratesId:       form.emiratesId || null,
        phone:            form.mobile     || null,
        email:            form.email      || null,
      }
    };
  }

  return { T, t, EMPLOYMENT, validate, buildPayload };
})();
