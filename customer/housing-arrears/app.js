const STORAGE_KEY = "arrearsflow-submissions";
const APPLICANT_MEMORY_FALLBACK_KEY = "arrearsflow-applicant-memory";
const SERVICE_KEY = "housing_arrears_assistance_scheduling";
const DOCUMENT_THREAD_CONTRACT = "document-thread.v1";
const runtimeConfig = window.ArrearsFlowRuntimeConfig || {};
const identityProviderConfig = runtimeConfig.identityProvider || {};
const TRUSTGATE_BASE_URL = identityProviderConfig.baseUrl || runtimeConfig.trustGateBaseUrl || "http://127.0.0.1:9715/";
const AUTH_PROVIDER_NAME = identityProviderConfig.name || "TrustGate";

const shared = window.ArrearsFlowShared || {};
const mockCases = shared.cases || [];
const workflow = shared.workflow || null;
const liveApi = shared.liveApi || null;
const trustGateSessionService = shared.trustGateSessionService || null;
const documentRecognitionService = shared.documentRecognitionService || null;
const programmeLoanService = shared.programmeLoanService || null;

const i18n = {
  ar: {
    "brand.mark": "وزارة",
    "brand.country": "الإمارات العربية المتحدة",
    "brand.ministry": "وزارة الطاقة والبنية التحتية",
    "nav.home": "الرئيسية",
    "nav.services": "الخدمات",
    "nav.media": "المركز الإعلامي",
    "nav.knowledge": "مركز المعرفة",
    "nav.participation": "المشاركة الرقمية",
    "nav.openData": "البيانات المفتوحة",
    "nav.about": "عن الوزارة",
    "nav.ask": "اسألنا",
    "service.breadcrumb": "إعادة جدولة المتأخرات للمساعدة السكنية",
    "wayfinding.customerHome": "العودة إلى بوابة المتعامل",
    "service.program": "برنامج الشيخ زايد للإسكان",
    "service.title": "إعادة جدولة المتأخرات للمساعدة السكنية",
    "service.description": "تتيح هذه الخدمة للمستفيدين من المساعدة السكنية تقديم طلب لإعادة جدولة متأخرات أقساط المساعدة السكنية.",
    "service.descriptionVerified": "اختر من طلباتك أو ابدأ طلب إعادة جدولة جديد لهذه الخدمة.",
    "service.descriptionApplicationOpen": "استكمل نموذج الطلب وتفاصيل القرض والمستندات الداعمة قبل إرسال الطلب.",
    "hero.statusLabel": "حالة الخدمة",
    "hero.statusValue": "متاحة رقمياً",
    "hero.start": "ابدأ الخدمة",
    "hero.requests": "عرض الطلبات",
    "hero.application": "متابعة الطلب",
    "meta.durationLabel": "مدة الإنجاز الرسمية",
    "meta.durationValue": "١٠ أيام عمل",
    "meta.targetLabel": "رسوم الخدمة",
    "meta.targetValue": "لا يوجد",
    "meta.authorityLabel": "الشريك الرسمي",
    "meta.authorityValue": "مصرف الإمارات للتنمية",
    "meta.channelLabel": "قاعدة السداد",
    "meta.channelValue": "لا يتجاوز ٢٠٪ من الراتب",
    "public.processHeading": "إجراءات الخدمة",
    "public.processLogin": "تسجيل الدخول عبر TrustGate.",
    "public.processFields": "تعبئة الحقول المطلوبة",
    "public.processDocuments": "إرفاق المستندات المطلوبة.",
    "public.processObtain": "الحصول على الخدمة",
    "public.requiredDocuments": "المستندات المطلوبة",
    "public.requiredDocumentsWarning": "تتطلب المستندات الصادرة من الجهات المعتمدة وجود ختم، مع الأخذ بعين الاعتبار أن الختم الرقمي مقبول.",
    "public.requiredDocumentsItem": "شهادة راتب تفصيلية أو رسالة عدم عمل من كاتب العدل",
    "public.termsHeading": "الشروط والأحكام",
    "public.termsFinancialStudy": "سداد قيمة المتأخرات وفق الدراسة المالية المعدة من القسم المختص.",
    "public.termsSalaryCap": "يجب ألا يتجاوز القسط الشهري ٢٠٪ من إجمالي الراتب.",
    "public.expectedTime": "الوقت المتوقع",
    "public.tenDays": "١٠ أيام",
    "public.serviceChannels": "قنوات تقديم الخدمة",
    "public.channelWebsite": "موقع وزارة الطاقة والبنية التحتية",
    "public.channelApp": "تطبيق وزارة الطاقة والبنية التحتية",
    "public.channelFujairah": "مركز سعادة المتعاملين - الفجيرة",
    "public.channelRasAlKhaimah": "مركز سعادة المتعاملين - رأس الخيمة",
    "public.channelAjman": "نافذة تقديم الخدمة - عجمان",
    "public.channelDubai": "مركز سعادة المتعاملين - دبي",
    "public.targetAudience": "الجمهور المستهدف",
    "public.audienceIndividuals": "المستفيدون من قروض الإسكان من المواطنين الإماراتيين",
    "public.audienceWomen": "المستفيدون المتراكم لديهم متأخرات يطلبون إعادة الجدولة",
    "public.partners": "الشركاء",
    "public.partnerValue": "مصرف الإمارات للتنمية",
    "public.serviceType": "نوع الخدمة",
    "public.serviceTypeValue": "اجتماعية",
    "public.userGuide": "دليل المستخدم",
    "public.userGuideCopy": "يرجى مراجعة دليل المستخدم لاستخدام النظام والتقديم على الخدمة.",
    "public.download": "تحميل",
    "public.faqHeading": "الأسئلة الشائعة",
    "public.faqPostpone": "هل يمكن تأجيل الأقساط أو تخفيض قيمة القسط في حال قبول الجدولة؟",
    "public.faqPostponeAnswer": "تتم معالجة ذلك عبر خدمة أخرى بعد قبول إعادة جدولة المتأخرات حسب القنوات الرسمية.",
    "public.faqPeriods": "هل يمكن دفع الأقساط المتأخرة على فترات متصلة أو غير متصلة؟",
    "public.faqPeriodsAnswer": "تحدد آلية السداد وفق الدراسة المالية والقواعد المعتمدة.",
    "public.faqDocuments": "ما المستندات المطلوبة لتقديم طلب إعادة الجدولة؟",
    "public.faqDocumentsAnswer": "شهادة راتب تفصيلية أو رسالة عدم عمل من كاتب العدل، مع مستندات شرطية للحالات الخاصة.",
    "dashboard.kicker": "لوحة المتعامل",
    "dashboard.heading": "طلباتي",
    "dashboard.breadcrumb": "الرئيسية / طلباتي",
    "dashboard.categoryLabel": "الخدمات حسب الفئة",
    "dashboard.categoryValue": "برنامج الشيخ زايد للإسكان",
    "dashboard.serviceLabel": "الخدمة",
    "dashboard.serviceValue": "إعادة جدولة المتأخرات للمساعدة السكنية",
    "dashboard.dateRange": "استخدام نطاق التاريخ",
    "dashboard.search": "بحث",
    "dashboard.reset": "إعادة ضبط",
    "steps.heading": "رحلة الطلب",
    "identity.kicker": "خدمة محمية",
    "identity.heading": "تسجيل الدخول عبر TrustGate",
    "identity.copy": "يتحقق TrustGate من بيانات المتعامل ويفتح مساحة الطلبات المحفوظة لهذه الخدمة.",
    "identity.notVerified": "سجّل الدخول للبدء أو متابعة طلب سابق.",
    "identity.manualCreated": "سجّل الدخول للمتابعة.",
    "identity.verified": "تم التحقق من الهوية.",
    "identity.accountCopy": "بعد التحقق تظهر مساحة الطلبات الخاصة بك فقط.",
    "identity.signOut": "تسجيل الخروج",
    "identity.signInWithTrustGate": "تسجيل الدخول عبر TrustGate",
    "identity.createTrustGate": "إنشاء حساب TrustGate",
    "identity.simulationNotice": "TrustGate طبقة ثقة تجريبية للتحقق من الهوية والاعتماد البشري. ليست متصلة بالهوية الرقمية الرسمية.",
    "identity.verifiedBadge": "هوية موثقة",
    "identity.sessionExpires": "تنتهي الجلسة",
    "identity.accountStatus": "حالة الحساب",
    "identity.provider": "نوع الحساب",
    "identity.available": "البيانات المتاحة",
    "identity.missing": "يستكملها المتعامل",
    "identity.login": "تسجيل الدخول",
    "identity.verifiedAt": "آخر دخول",
    "identity.errorMissing": "أكمل بيانات الحساب المطلوبة.",
    "identity.errorExists": "يوجد حساب مسجل بهذه البيانات.",
    "identity.errorInvalid": "بيانات الدخول غير صحيحة.",
    "memory.kicker": "طلباتك",
    "memory.heading": "ابدأ طلباً جديداً أو تابع طلباً سابقاً",
    "memory.empty": "بعد تسجيل الدخول، يمكنك بدء طلب جديد أو متابعة آخر طلب محفوظ.",
    "memory.ready": "يمكنك الآن بدء طلب جديد أو متابعة آخر طلب محفوظ.",
    "memory.recent": "الطلبات الأخيرة",
    "memory.noRecent": "لا توجد خدمات محفوظة بعد.",
    "memory.startNew": "بدء طلب جديد",
    "memory.resume": "متابعة الطلب",
    "memory.resumeDisabled": "لا يوجد طلب محفوظ للمتابعة",
    "memory.applicationActive": "تم فتح الطلب. استكمل بيانات الخدمة والمستندات المطلوبة.",
    "form.kicker": "طلب المتعامل",
    "form.heading": "استكمال طلب الخدمة",
    "submitted.kicker": "تم استلام الطلب",
    "submitted.heading": "تم إرسال الطلب بعد اكتمال الفحص",
    "submitted.copy": "اجتازت بيانات الخدمة والمستندات المطلوبة فحص البوابة، ثم تم إنشاء رقم طلب ومشاركة الحالة مع مساحة عمل الموظف.",
    "submitted.caseLabel": "رقم الطلب",
    "submitted.statusLabel": "الحالة الحالية",
    "submitted.nextLabel": "الخطوة التالية",
    "submitted.nextValue": "تجهيز الدراسة المالية ولقطة الحالة للموظف المختص.",
    "fieldset.applicant": "بيانات المتعامل",
    "fieldset.serviceDetails": "بيانات الخدمة المؤكدة",
    "fieldset.financial": "البيانات المالية",
    "fieldset.documents": "المستندات المطلوبة",
    "field.applicantName": "اسم المتعامل",
    "field.emiratesId": "رقم الهاتف الموثق",
    "field.mobile": "رقم الهاتف المتحرك",
    "field.email": "البريد الإلكتروني",
    "field.currentSalary": "الراتب الحالي",
    "field.remarks": "الملاحظات",
    "field.acknowledgement": "أقر بصحة البيانات والمستندات المقدمة لهذا الطلب.",
    "field.incomeDocumentType": "مستند إثبات الدخل",
    "field.uploadIncomeDocument": "رفع مستند إثبات الدخل",
    "field.incomeDocumentNote": "ملاحظة على مستند إثبات الدخل (اختياري)",
    "field.officialMissionCase": "تراكمت المتأخرات أثناء مهمة رسمية خارج الدولة وتعذر توقيع الخصم المباشر مع مصرف الإمارات للتنمية.",
    "field.uploadMissionLetter": "رفع شهادة المهمة الرسمية",
    "field.missionLetterNote": "ملاحظة على شهادة المهمة الرسمية (اختياري)",
    "field.uploadPassportStamp": "رفع ختم جواز السفر",
    "field.passportStampNote": "ملاحظة على ختم جواز السفر (اختياري)",
    "loan.heading": "تفاصيل القرض",
    "loan.bankName": "اسم بنك القرض",
    "loan.accountNumber": "رقم حساب القرض",
    "loan.totalAmount": "إجمالي مبلغ القرض",
    "loan.arrearsAmount": "إجمالي المتأخرات",
    "loan.currentInstallment": "القسط الشهري الحالي",
    "loan.balanceAmount": "الرصيد المتبقي",
    "loan.emisPending": "عدد الأقساط المتأخرة",
    "loan.autoDda": "الخصم المباشر",
    "loan.enabled": "مفعل",
    "field.arrearsAmount": "قيمة المتأخرات",
    "field.monthsDelayed": "عدد أشهر التأخر",
    "field.monthlyIncome": "الدخل الشهري",
    "field.monthlyObligations": "الالتزامات الشهرية",
    "field.dependents": "عدد أفراد الأسرة",
    "field.employmentStatus": "الحالة الوظيفية",
    "field.existingLoans": "أقر بوجود قروض أو التزامات مالية رئيسية",
    "field.reason": "سبب طلب إعادة الجدولة",
    "field.salaryCertificate": "شهادة الراتب",
    "field.bankStatement": "كشف الحساب البنكي",
    "action.saveDraft": "حفظ المسودة",
    "action.submit": "فحص وإرسال الطلب",
    "action.chooseFile": "اختيار ملف",
    "docs.heading": "المستندات المطلوبة",
    "docs.reviewHeading": "فحص المستندات",
    "docs.fileLabel": "الملف",
    "docs.noFile": "لم يتم رفع ملف بعد.",
    "docs.checkedAt": "وقت الفحص",
    "docs.nextAction": "الإجراء المطلوب",
    "docs.checks": "الفحوصات",
    "docs.historyHeading": "سجل الرفع",
    "docs.historyEmpty": "لا توجد محاولات رفع بعد.",
    "docs.historyAttempt": "محاولة",
    "docs.historyLatest": "الأحدث",
    "status.heading": "حالة الطلب",
    "confirmation.heading": "متابعة الطلب",
    "correction.kicker": "يلزم الاستكمال",
    "correction.heading": "لم يصل الطلب إلى الموظف بعد",
    "correction.copy": "يبقى الطلب محفوظاً حتى تكتمل البيانات والمستندات المطلوبة. استبدل الملف من نفس خانة الرفع عند الحاجة، وسيبقى سجل المحاولات محفوظاً داخل الطلب. لا يتم تمرير طلب غير مكتمل إلى مساحة عمل الموظف.",
    "correction.readyHeading": "جاهز للإرسال",
    "correction.readyCopy": "اكتملت البيانات والمستندات المطلوبة ويمكن إرسال الطلب.",
    "search.placeholder": "البحث في الموقع",
    "language.toggle": "English",
    "aria.search": "البحث",
    "aria.account": "الحساب",
    "aria.mainNav": "التنقل الرئيسي",
    "aria.serviceInfo": "معلومات الخدمة",
    "aria.identityGateway": "تسجيل الدخول وطلبات المتعامل",
    "aria.applicationSteps": "خطوات الطلب",
    "toast.draft": "تم حفظ المسودة.",
    "toast.submit": "اكتمل فحص البوابة وتم إرسال الطلب إلى مساحة عمل الموظف.",
    "toast.correction": "يلزم استكمال البيانات أو المستندات قبل إرسال الطلب.",
    "toast.identity": "تم التحقق من الهوية.",
    "toast.manualAccount": "سجّل الدخول عبر TrustGate قبل بدء الطلب.",
    "toast.accountCreated": "تم إنشاء الحساب وتسجيل الدخول.",
    "toast.signedOut": "تم تسجيل الخروج.",
    "toast.start": "تم فتح طلب الخدمة.",
    "form.submittedMode": "تم إرسال هذا الطلب. يمكن متابعة الحالة من بطاقة متابعة الطلب أو تعديل البيانات وإرسالها مرة أخرى عند الحاجة."
  },
  en: {
    "brand.mark": "MOEI",
    "brand.country": "United Arab Emirates",
    "brand.ministry": "Ministry of Energy & Infrastructure",
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.media": "Media Center",
    "nav.knowledge": "Knowledge Center",
    "nav.participation": "Digital Participation",
    "nav.openData": "Open Data",
    "nav.about": "About Ministry",
    "nav.ask": "Ask MOEI",
    "service.breadcrumb": "Housing Arrears Rescheduling",
    "wayfinding.customerHome": "Back to Customer Portal",
    "service.program": "Sheikh Zayed Housing Program",
    "service.title": "Housing Arrears Rescheduling",
    "service.description": "This service allows beneficiaries of housing assistance to submit a request to reschedule the arrears of housing assistance instalments.",
    "service.descriptionVerified": "Choose from your applications or start a new arrears scheduling request for this service.",
    "service.descriptionApplicationOpen": "Complete the request form, loan details, and supporting documents before submitting.",
    "hero.statusLabel": "Service status",
    "hero.statusValue": "Available online",
    "hero.start": "Start Service",
    "hero.requests": "View Requests",
    "hero.application": "Continue Request",
    "meta.durationLabel": "Official duration",
    "meta.durationValue": "10 working days",
    "meta.targetLabel": "Service fee",
    "meta.targetValue": "No fee",
    "meta.authorityLabel": "Official partner",
    "meta.authorityValue": "Emirates Development Bank",
    "meta.channelLabel": "Repayment rule",
    "meta.channelValue": "Within 20% of salary",
    "public.processHeading": "Service Process",
    "public.processLogin": "Login using TrustGate.",
    "public.processFields": "Fill in the required fields",
    "public.processDocuments": "Attach the required documents.",
    "public.processObtain": "Obtain the service",
    "public.requiredDocuments": "Required Documents",
    "public.requiredDocumentsWarning": "The required documents issued by approved authorities require a stamp, taking into consideration that the digital stamp is acceptable.",
    "public.requiredDocumentsItem": "Detailed salary certificate or non-work letter from the notary public",
    "public.termsHeading": "Terms and Conditions",
    "public.termsFinancialStudy": "Paying the value of the arrears according to the financial study prepared by the department.",
    "public.termsSalaryCap": "The monthly installment should not exceed 20% of the total salary.",
    "public.expectedTime": "Expected Time",
    "public.tenDays": "10 Days",
    "public.serviceChannels": "Service Channels",
    "public.channelWebsite": "Ministry of Energy & Infrastructure Website",
    "public.channelApp": "Ministry of Energy & Infra(MOEI)",
    "public.channelFujairah": "Customer Happiness Center - Fujairah",
    "public.channelRasAlKhaimah": "Customer Happiness Center - RAS Al Khaima",
    "public.channelAjman": "Service delivery window - Ajman",
    "public.channelDubai": "Customer Happiness Center - Dubai",
    "public.targetAudience": "Target Audience",
    "public.audienceIndividuals": "UAE National housing loan beneficiaries",
    "public.audienceWomen": "Beneficiaries with accumulated arrears requesting rescheduling",
    "public.partners": "Partners",
    "public.partnerValue": "Emirates Development Bank",
    "public.serviceType": "Service Type",
    "public.serviceTypeValue": "Social",
    "public.userGuide": "User guide",
    "public.userGuideCopy": "Please check the user guide (PDF) for using the system in order to apply for the service.",
    "public.download": "Download",
    "public.faqHeading": "FAQ's",
    "public.faqPostpone": "Can the installments be postponed or the installment value be reduced if the rescheduling is accepted?",
    "public.faqPostponeAnswer": "This is handled through the related instalment postponement or reduction service after rescheduling is accepted.",
    "public.faqPeriods": "Can the delayed installments be paid over continuous or non-continuous periods?",
    "public.faqPeriodsAnswer": "The repayment approach is determined through the financial study and approved rules.",
    "public.faqDocuments": "What are the documents required to submit a rescheduling request?",
    "public.faqDocumentsAnswer": "A detailed salary certificate or a non-work letter from the notary public, with conditional documents for special cases.",
    "dashboard.kicker": "Dashboard",
    "dashboard.heading": "My Applications",
    "dashboard.breadcrumb": "Home / My Applications",
    "dashboard.categoryLabel": "Services by Category",
    "dashboard.categoryValue": "Sheikh Zayed Housing Programme",
    "dashboard.serviceLabel": "Service",
    "dashboard.serviceValue": "Housing Arrears Rescheduling",
    "dashboard.dateRange": "Use Date Range",
    "dashboard.search": "Search",
    "dashboard.reset": "Reset Filters",
    "steps.heading": "Application Journey",
    "identity.kicker": "Protected service",
    "identity.heading": "Sign in with TrustGate",
    "identity.copy": "TrustGate verifies the customer identity and opens the saved request workspace for this service.",
    "identity.notVerified": "Sign in to start or resume a request.",
    "identity.manualCreated": "Sign in to continue.",
    "identity.verified": "Identity verified.",
    "identity.accountCopy": "After verification, only your request workspace is shown.",
    "identity.signOut": "Sign out",
    "identity.signInWithTrustGate": "Sign in with TrustGate",
    "identity.createTrustGate": "Create TrustGate account",
    "identity.simulationNotice": "TrustGate is a local demo trust layer for verified identity and human approval. It is demo only and not connected to any official national identity provider.",
    "identity.verifiedBadge": "Verified identity",
    "identity.sessionExpires": "Session expires",
    "identity.accountStatus": "Account status",
    "identity.provider": "Account type",
    "identity.available": "Available data",
    "identity.missing": "Completed by customer",
    "identity.login": "Sign In",
    "identity.verifiedAt": "Last sign-in",
    "identity.errorMissing": "Complete the required account details.",
    "identity.errorExists": "An account already exists with these details.",
    "identity.errorInvalid": "The sign-in details are not correct.",
    "memory.kicker": "Your requests",
    "memory.heading": "Start a new request or resume a previous one",
    "memory.empty": "After signing in, you can start a new request or resume the latest saved request.",
    "memory.ready": "You can now start a new request or resume the latest saved request.",
    "memory.recent": "Recent requests",
    "memory.noRecent": "No saved services yet.",
    "memory.startNew": "Start New Application",
    "memory.resume": "Resume Application",
    "memory.resumeDisabled": "No saved application to resume",
    "memory.applicationActive": "The request is open. Complete the service details and required documents.",
    "form.kicker": "Applicant request",
    "form.heading": "Complete service request",
    "submitted.kicker": "Request received",
    "submitted.heading": "Request submitted after checks passed",
    "submitted.copy": "The service details and required documents passed the gateway checks, then a case ID was created and shared with the officer workspace.",
    "submitted.caseLabel": "Case ID",
    "submitted.statusLabel": "Current status",
    "submitted.nextLabel": "Next step",
    "submitted.nextValue": "Prepare the financial study and case snapshot for the assigned officer.",
    "fieldset.applicant": "Applicant details",
    "fieldset.serviceDetails": "Confirmed service details",
    "fieldset.financial": "Financial details",
    "fieldset.documents": "Required documents",
    "field.applicantName": "Applicant name",
    "field.emiratesId": "Verified phone",
    "field.mobile": "Mobile number",
    "field.email": "Email",
    "field.currentSalary": "Current salary",
    "field.remarks": "Remarks",
    "field.acknowledgement": "I confirm the submitted information and documents are correct for this request.",
    "field.incomeDocumentType": "Income proof document",
    "field.uploadIncomeDocument": "Upload income proof document",
    "field.incomeDocumentNote": "Income proof document note (optional)",
    "field.officialMissionCase": "Arrears accumulated during an official mission outside the UAE and direct debit with Emirates Development Bank could not be signed.",
    "field.uploadMissionLetter": "Upload official mission letter",
    "field.missionLetterNote": "Official mission letter note (optional)",
    "field.uploadPassportStamp": "Upload passport stamp",
    "field.passportStampNote": "Passport stamp note (optional)",
    "loan.heading": "Loan Details",
    "loan.bankName": "Loan Bank Name",
    "loan.accountNumber": "Loan Account Number",
    "loan.totalAmount": "Total Loan Amount",
    "loan.arrearsAmount": "Total Arrears Amount",
    "loan.currentInstallment": "Monthly Installment",
    "loan.balanceAmount": "Remaining Balance",
    "loan.emisPending": "Overdue Installments",
    "loan.autoDda": "Auto DDA",
    "loan.enabled": "Enabled",
    "field.arrearsAmount": "Arrears amount",
    "field.monthsDelayed": "Months delayed",
    "field.monthlyIncome": "Monthly income",
    "field.monthlyObligations": "Monthly obligations",
    "field.dependents": "Dependents",
    "field.employmentStatus": "Employment status",
    "field.existingLoans": "I declare existing loans or major financial obligations",
    "field.reason": "Reason for rescheduling",
    "field.salaryCertificate": "Salary certificate",
    "field.bankStatement": "Bank statement",
    "action.saveDraft": "Save Draft",
    "action.submit": "Check And Submit",
    "action.chooseFile": "Choose File",
    "docs.heading": "Required Documents",
    "docs.reviewHeading": "Document Check",
    "docs.fileLabel": "File",
    "docs.noFile": "No file uploaded yet.",
    "docs.checkedAt": "Checked at",
    "docs.nextAction": "Required action",
    "docs.checks": "Checks",
    "docs.historyHeading": "Upload history",
    "docs.historyEmpty": "No upload attempts yet.",
    "docs.historyAttempt": "Attempt",
    "docs.historyLatest": "Latest",
    "status.heading": "Application Status",
    "confirmation.heading": "Track Request",
    "correction.kicker": "Completion required",
    "correction.heading": "The request has not reached the officer yet",
    "correction.copy": "The request stays saved until the required details and documents are complete. Replace the file from the same upload field when needed, and the attempt history stays with the request. An incomplete request is not passed to the officer workspace.",
    "correction.readyHeading": "Ready to submit",
    "correction.readyCopy": "Required details and documents are complete and the request can be submitted.",
    "search.placeholder": "Search in website",
    "language.toggle": "العربية",
    "aria.search": "Search",
    "aria.account": "Account",
    "aria.mainNav": "Main navigation",
    "aria.serviceInfo": "Service information",
    "aria.identityGateway": "Sign in and customer requests",
    "aria.applicationSteps": "Application steps",
    "toast.draft": "Draft saved.",
    "toast.submit": "Gateway checks passed and the request was sent to the officer workspace.",
    "toast.correction": "Complete the required details or documents before submitting.",
    "toast.identity": "Identity verified.",
    "toast.manualAccount": "Sign in with TrustGate before starting the request.",
    "toast.accountCreated": "Account created and signed in.",
    "toast.signedOut": "Signed out.",
    "toast.start": "Service application opened.",
    "form.submittedMode": "This request has been submitted. Track it from the Track Request card, or edit and resubmit if needed."
  }
};

const optionText = {
  incomeDocumentType: {
    ar: [
      ["salary_certificate", "شهادة راتب تفصيلية حديثة"],
      ["non_work_letter", "رسالة عدم عمل من كاتب العدل"]
    ],
    en: [
      ["salary_certificate", "Detailed recent salary certificate"],
      ["non_work_letter", "Non-work letter from notary public"]
    ]
  },
  documentStatus: {
    ar: [
      ["missing", "لم يتم الرفع"],
      ["needs_stamp", "مرفق دون ختم أو ختم رقمي"],
      ["unreadable", "مرفق وغير واضح"],
      ["stale", "مرفق لكنه قديم"],
      ["mismatch", "مرفق ببيانات غير متطابقة"],
      ["salary_conflict", "مرفق مع تعارض في الراتب"],
      ["date_mismatch", "مرفق بتواريخ غير متطابقة"],
      ["passed", "مرفق واجتاز الفحص"]
    ],
    en: [
      ["missing", "Not uploaded"],
      ["needs_stamp", "Uploaded without stamp or digital stamp"],
      ["unreadable", "Uploaded but unclear"],
      ["stale", "Uploaded but stale"],
      ["mismatch", "Uploaded with mismatched details"],
      ["salary_conflict", "Uploaded with salary conflict"],
      ["date_mismatch", "Uploaded with date mismatch"],
      ["passed", "Uploaded and passed checks"]
    ]
  }
};

const steps = {
  ar: [
    ["نموذج الطلب", "إدخال الراتب الحالي والملاحظات وتأكيد الإقرار."],
    ["تفاصيل القرض", "عرض بيانات القرض المتصلة بطلب إعادة الجدولة."],
    ["المستندات الداعمة", "رفع شهادة الراتب أو المستند المطلوب ثم إرسال الطلب."]
  ],
  en: [
    ["Request Form", "Enter current salary, remarks, and confirm the acknowledgement."],
    ["Loan Details", "View the connected loan details for the rescheduling request."],
    ["Supporting Documents", "Upload the salary certificate or required document, then submit."]
  ]
};

let state = {
  lang: new URLSearchParams(window.location.search).get("lang") || localStorage.getItem("arrearsflow-lang") || "ar",
  selectedCase: null,
  applicantMemory: null,
  verifiedSession: null,
  applicationActive: false,
  status: "draft",
  lastSubmission: null,
  submitInProgress: false
};

const $ = (id) => document.getElementById(id);
const t = (key) => i18n[state.lang][key] || key;
const money = (value) => {
  const locale = state.lang === "ar" ? "ar-AE" : "en-AE";
  const amount = Number(value).toLocaleString(locale);
  return state.lang === "ar" ? `${amount} درهم` : `${amount} AED`;
};

function legacyDocumentStatus(status) {
  if (status === "valid") return "passed";
  if (status === "invalid") return "needs_stamp";
  return "missing";
}

function blankCustomerCase() {
  return {
    id: makeApplicationId(),
    applicantName: "",
    applicantNameAr: "",
    emiratesIdMasked: "",
    phoneMasked: "",
    emailMasked: "",
    currentSalary: "",
    monthlyIncome: "",
    monthlyObligations: 0,
    dependents: 0,
    familyMembersCount: 1,
    remarks: "",
    remarksAr: "",
    reason: "",
    reasonAr: "",
    incomeDocumentType: "salary_certificate",
    incomeDocumentStatus: "missing",
    salaryStatus: "missing",
    bankStatus: "missing",
    officialMissionCase: false,
    missionLetterStatus: "missing",
    passportStampStatus: "missing",
    documentUploads: {},
    documentThreads: {},
    acknowledgement: false,
    customerDocumentGate: null,
    status: "draft"
  };
}

function resetCustomerEnteredFields(caseData) {
  return {
    ...blankCustomerCase(),
    ...(caseData || {}),
    currentSalary: "",
    monthlyIncome: "",
    remarks: "",
    reason: "",
    reasonAr: "",
    incomeDocumentType: "salary_certificate",
    incomeDocumentStatus: "missing",
    documentUploads: {},
    documentThreads: {},
    officialMissionCase: false,
    missionLetterStatus: "missing",
    passportStampStatus: "missing",
    acknowledgement: false,
    customerDocumentGate: null
  };
}

function decodeBase64UrlJson(value) {
  if (!value) return null;
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function verifiedPersonFromTrustGate(result) {
  const subject = result?.subject;
  if (!subject || result.status !== "approved" || result.purpose !== "login") return null;
  if (result.assuranceLevel !== "simulated_number_match_and_pin" || !result.pinVerifiedAt) return null;
  return {
    provider: "trustgate",
    providerSubject: subject.subjectId,
    subjectId: subject.subjectId,
    accountLevel: result.assuranceLevel || "simulated_number_match_and_pin",
    claims: {
      fullName: subject.displayName,
      emiratesIdMasked: subject.emiratesId || subject.mobile || subject.subjectId,
      mobileMasked: subject.mobile,
      emailMasked: subject.email,
      nationality: subject.nationality
    },
    availableData: [
      "fullName",
      "emiratesIdMasked",
      "mobileMasked",
      "emailMasked",
      "nationality"
    ],
    missingData: [
      "currentSalary",
      "remarks",
      "requiredDocuments",
      "financialObligations"
    ],
    consent: {
      serviceKey: SERVICE_KEY,
      requestId: result.requestId,
      relyingService: result.relyingService
    }
  };
}

function consumeTrustGateCallback() {
  const query = new URLSearchParams(window.location.search);
  if (query.get("trustGateStatus") !== "approved" || query.get("trustGatePurpose") !== "login") return false;
  if (!trustGateSessionService?.createSessionFromVerifiedPerson) return false;

  const verifiedPerson = verifiedPersonFromTrustGate(decodeBase64UrlJson(query.get("trustGateResult")));
  if (!verifiedPerson) return false;

  const session = trustGateSessionService.createSessionFromVerifiedPerson({
    verifiedPerson,
    serviceKey: SERVICE_KEY
  });
  trustGateSessionService.saveSession(session);
  trustGateSessionService.ensureApplicantMemory(session);
  localStorage.setItem("arrearsflow-lang", state.lang);

  const cleanUrl = new URL(window.location.href);
  [
    "trustGateRequestId",
    "trustGateStatus",
    "trustGatePurpose",
    "trustGateResult"
  ].forEach((key) => cleanUrl.searchParams.delete(key));
  window.history.replaceState(null, "", cleanUrl.toString());
  return true;
}

function init() {
  state.selectedCase = resetCustomerEnteredFields({});
  consumeTrustGateCallback();
  state.verifiedSession = readVerifiedSession();
  state.applicantMemory = readApplicantMemory();
  if (state.applicantMemory) {
    state.selectedCase = mergeApplicantMemoryIntoCase(state.selectedCase, state.applicantMemory);
  }
  state.applicationActive = false;
  bindEvents();
  applyLanguage();
  fillForm(state.selectedCase);
  renderAll();
}

function bindEvents() {
  $("languageToggle").addEventListener("click", () => {
    if (state.applicationActive) syncFormToState();
    state.lang = state.lang === "ar" ? "en" : "ar";
    localStorage.setItem("arrearsflow-lang", state.lang);
    applyLanguage();
    fillForm(state.selectedCase);
    renderAll();
  });

  $("customerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    syncFormToState();
    submitApplication();
  });

  $("officialMissionCase").addEventListener("change", () => {
    syncFormToState();
    updateCustomerDocumentGate();
    renderAll();
  });

  $("incomeDocumentType").addEventListener("change", () => {
    syncFormToState();
    rerunDocumentRecognition("income_proof");
    renderAll();
  });

  [
    ["incomeDocumentFile", "income_proof"],
    ["missionLetterFile", "official_mission_letter"],
    ["passportStampFile", "passport_stamp"]
  ].forEach(([inputId, slot]) => {
    $(inputId).addEventListener("change", (event) => {
      handleDocumentUpload(slot, event.target.files?.[0] || null);
    });
  });

  [
    ["currentSalary", "input"],
    ["remarks", "input"],
    ["acknowledgement", "change"]
  ].forEach(([inputId, eventName]) => {
    $(inputId).addEventListener(eventName, () => {
      syncFormToState();
      updateCustomerDocumentGate();
      renderSteps();
      renderDocumentWorkspace();
      renderDocuments();
      renderCorrectionNotice();
      renderStatus();
      renderConfirmation();
    });
  });

  [
    ["incomeDocumentNote", "income_proof"],
    ["missionLetterNote", "official_mission_letter"],
    ["passportStampNote", "passport_stamp"]
  ].forEach(([inputId, slot]) => {
    $(inputId).addEventListener("input", () => updateDocumentNote(slot, $(inputId).value));
  });

  $("saveDraftBtn").addEventListener("click", () => {
    syncFormToState();
    state.status = "draft";
    state.selectedCase.status = "draft";
    state.lastSubmission = null;
    showToast(t("toast.draft"));
    renderAll();
  });

  $("heroActionButton").addEventListener("click", () => {
    if (!isCustomerSignedIn()) {
      const loginUrl = new URL("/", TRUSTGATE_BASE_URL);
      loginUrl.searchParams.set("service", "housing-arrears");
      loginUrl.searchParams.set("client", "moei");
      loginUrl.searchParams.set("purpose", "login");
      loginUrl.searchParams.set("lang", state.lang);
      const returnUrl = new URL("/customer/housing-arrears/", window.location.origin);
      returnUrl.searchParams.set("lang", state.lang);
      loginUrl.searchParams.set("returnUrl", returnUrl.toString());
      window.location.assign(loginUrl.toString());
      return;
    }
    const targetId = state.applicationActive ? "applicationPanel" : "identityGateway";
    $(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(button.dataset.scrollTarget);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function readApplicantMemory() {
  if (state.verifiedSession && trustGateSessionService) {
    const existing = trustGateSessionService.readCustomerMemory(state.verifiedSession.subjectId);
    if (existing) return existing;
    return trustGateSessionService.ensureApplicantMemory(state.verifiedSession);
  }
  if (trustGateSessionService) return null;
  return null;
}

function saveApplicantMemory(memory) {
  if (trustGateSessionService && state.verifiedSession) {
    const previous = trustGateSessionService.readCustomerMemory(state.verifiedSession.subjectId) || {};
    const next = {
      contractVersion: "applicant-memory.v1",
      ...previous,
      ...memory,
      profile: {
        ...(previous.profile || {}),
        ...(memory.profile || {})
      },
      availableData: Array.isArray(memory.availableData) ? memory.availableData : previous.availableData || [],
      missingData: Array.isArray(memory.missingData) ? memory.missingData : previous.missingData || [],
      recentServices: Array.isArray(memory.recentServices) ? memory.recentServices : previous.recentServices || [],
      applicationIds: Array.from(new Set([...(previous.applicationIds || []), ...(memory.applicationIds || [])])),
      currentApplicationId: memory.currentApplicationId || previous.currentApplicationId || null,
      customerAccount: memory.customerAccount || previous.customerAccount,
      createdAt: previous.createdAt || memory.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return trustGateSessionService.saveCustomerMemory(next);
  }
  return memory;
}

function readVerifiedSession() {
  return trustGateSessionService?.readSession ? trustGateSessionService.readSession() : null;
}

function isCustomerSignedIn() {
  return Boolean(
    state.verifiedSession
    && trustGateSessionService?.isSessionValid?.(state.verifiedSession)
    && state.applicantMemory?.verification?.status === "verified"
  );
}

function signOutCustomer() {
  trustGateSessionService?.clearSession?.();
  state.verifiedSession = null;
  state.applicantMemory = null;
  state.applicationActive = false;
  state.selectedCase = resetCustomerEnteredFields({});
  state.status = "draft";
  state.lastSubmission = null;
  fillForm(state.selectedCase);
  renderAll();
  showToast(t("toast.signedOut"));
}

function makeApplicationId() {
  const year = new Date().getFullYear();
  const randomPart = () => {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const parts = crypto.getRandomValues(new Uint16Array(2));
      return Array.from(parts).map((part) => part.toString(36).padStart(3, "0")).join("").toUpperCase();
    }
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  };
  return `MOEI-HOUSING-${year}-${Date.now().toString(36).toUpperCase()}-${randomPart()}`;
}

function createApplicationShell() {
  const profile = state.applicantMemory?.profile || {};
  return {
    ...resetCustomerEnteredFields({}),
    id: makeApplicationId(),
    applicantName: profile.fullName || "",
    applicantNameAr: profile.fullNameAr || profile.fullName || "",
    emiratesIdMasked: profile.emiratesIdMasked || "",
    phoneMasked: profile.mobileMasked || "",
    emailMasked: profile.emailMasked || "",
    applicantMemoryId: state.applicantMemory?.applicantId || null,
    identityProvider: state.applicantMemory?.identityProvider || "trustgate",
    status: "draft"
  };
}

function accountSubmissions() {
  return [];
}

function findLatestSubmissionForAccount(preferredId = null) {
  return null;
}

function mergeApplicantMemoryIntoCase(caseData, memory) {
  const profile = memory?.profile || {};
  return {
    ...caseData,
    applicantName: profile.fullName || caseData.applicantName,
    applicantNameAr: profile.fullNameAr || caseData.applicantNameAr,
    emiratesIdMasked: profile.emiratesIdMasked || caseData.emiratesIdMasked,
    phoneMasked: profile.mobileMasked || caseData.phoneMasked,
    emailMasked: profile.emailMasked || caseData.emailMasked,
    identityProvider: memory?.identityProvider || caseData.identityProvider,
    applicantMemoryId: memory?.applicantId || caseData.applicantMemoryId
  };
}

function labelDataKey(key) {
  const labels = {
    fullName: { ar: "الاسم باللغة الإنجليزية", en: "Full name" },
    fullNameAr: { ar: "الاسم باللغة العربية", en: "Arabic full name" },
    emiratesIdMasked: { ar: "رقم الهاتف الموثق", en: "Verified phone" },
    mobileMasked: { ar: "رقم الهاتف المتحرك", en: "Mobile number" },
    emailMasked: { ar: "البريد الإلكتروني", en: "Email" },
    nationality: { ar: "الجنسية", en: "Nationality" },
    currentSalary: { ar: "الراتب الحالي", en: "Current salary" },
    remarks: { ar: "الملاحظات", en: "Remarks" },
    requiredDocuments: { ar: "المستندات المطلوبة", en: "Required documents" },
    financialObligations: { ar: "الالتزامات المالية", en: "Financial obligations" }
  };
  return labels[key]?.[state.lang] || key;
}

function formatDataKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return state.lang === "ar" ? "لا توجد" : "None";
  }
  return keys.map(labelDataKey).join(state.lang === "ar" ? "، " : ", ");
}

function labelAccountStatus(status) {
  const labels = {
    active: {
      ar: "نشط",
      en: "Active"
    },
    signed_out: {
      ar: "تم تسجيل الخروج",
      en: "Signed out"
    },
    account_active: {
      ar: "تم تسجيل الدخول",
      en: "Signed in"
    }
  };
  return labels[status]?.[state.lang] || status || (state.lang === "ar" ? "غير محدد" : "Not set");
}

function labelIdentityProvider(provider) {
  const labels = {
    "trustgate-demo": {
      ar: "TrustGate",
      en: "TrustGate"
    },
    "trustgate": {
      ar: "TrustGate",
      en: "TrustGate"
    }
  };
  return labels[provider]?.[state.lang] || provider || (state.lang === "ar" ? "غير محدد" : "Not set");
}

function openApplication(mode) {
  if (!isCustomerSignedIn()) {
    showToast(t("toast.manualAccount"));
    return;
  }

  state.selectedCase = createApplicationShell();
  state.status = "draft";
  state.lastSubmission = null;

  state.applicationActive = true;
  fillForm(state.selectedCase);
  renderAll();
  showToast(t("toast.start"));
  window.setTimeout(() => $("applicationPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

function rememberCurrentApplication(applicationId) {
  if (!state.applicantMemory) return;
  const serviceLabel = state.lang === "ar"
    ? "إعادة جدولة المتأخرات للمساعدة السكنية"
    : "Housing Arrears Rescheduling";
  state.applicantMemory = saveApplicantMemory({
    ...state.applicantMemory,
    currentApplicationId: applicationId,
    applicationIds: Array.from(new Set([...(state.applicantMemory.applicationIds || []), applicationId])),
    recentServices: [
      {
        serviceKey: SERVICE_KEY,
        applicationId,
        label: serviceLabel,
        status: state.status,
        updatedAt: new Date().toISOString()
      },
      ...(state.applicantMemory.recentServices || []).filter((item) => item.applicationId !== applicationId)
    ]
  });
}

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.body.dataset.lang = state.lang;
  document.title = t("service.title");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });

  $("searchInput").value = "";
  $("searchInput").placeholder = t("search.placeholder");
  $("languageToggle").textContent = t("language.toggle");
  populateOptions();
}

function populateOptions() {
  fillOptions($("incomeDocumentType"), optionText.incomeDocumentType[state.lang]);
}

function fillOptions(select, options) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (current) select.value = current;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function documentSlotConfig(slot, caseData = state.selectedCase) {
  const incomeKey = caseData.incomeDocumentType === "non_work_letter"
    ? "non_work_letter"
    : "salary_certificate";
  const configs = {
    income_proof: {
      documentKey: incomeKey,
      statusField: "incomeDocumentStatus",
      noteField: "incomeDocumentNote"
    },
    official_mission_letter: {
      documentKey: "official_mission_letter",
      statusField: "missionLetterStatus",
      noteField: "missionLetterNote"
    },
    passport_stamp: {
      documentKey: "passport_stamp",
      statusField: "passportStampStatus",
      noteField: "passportStampNote"
    }
  };
  return configs[slot];
}

function normalizeFileMetadata(file) {
  if (!file) return null;
  return {
    name: file.name || file.fileName || "",
    type: file.type || file.mimeType || "application/octet-stream",
    size: Number(file.size || file.fileSize || 0),
    lastModified: file.lastModified || null
  };
}

function localDocumentRecognitionFallback(request) {
  const file = request.document?.file || null;
  const documentKey = request.document?.key || "document";
  const fileName = file?.name || "";
  if (!fileName) {
    return {
      contractVersion: "document-recognition-result.v1",
      status: "blocked_missing_document",
      customerStatus: "missing",
      decision: "needs_customer_action",
      confidence: null,
      aiUsed: false,
      reviewMode: "local_filename_check",
      checkedAt: new Date().toISOString(),
      document: {
        key: documentKey,
        label: documentTitle(documentKey),
        arLabel: documentTitle(documentKey),
        file: null,
        checks: [],
        customerMessage: "Upload the required document before submitting.",
        customerMessageAr: "ارفع المستند المطلوب قبل إرسال الطلب."
      }
    };
  }
  const unreadable = /(blur|blurry|unclear|unreadable|low[-_ ]?quality|bad[-_ ]?scan)/i.test(fileName);
  const dateMismatch = /(date[-_ ]?gap|date[-_ ]?mismatch|period[-_ ]?mismatch)/i.test(fileName);
  const salaryConflict = /(salary[-_ ]?conflict|income[-_ ]?conflict)/i.test(fileName);
  const mismatch = /(mismatch|wrong[-_ ]?person|identity[-_ ]?mismatch|salary[-_ ]?mismatch)/i.test(fileName);
  const stale = /(old|stale|expired|outdated|six[-_ ]?month)/i.test(fileName);
  const missingStampSignal = /(no[-_ ]?stamp|missing[-_ ]?stamp|without[-_ ]?stamp|no[-_ ]?seal|missing[-_ ]?seal|not[-_ ]?notarized)/i.test(fileName);
  const stamped = !missingStampSignal && (documentKey === "passport_stamp" || /(stamp|stamped|digital|seal|sealed|notary|signed)/i.test(fileName));

  // Detect wrong document type — e.g. mission letter uploaded to income proof slot, or vice versa
  const fileHintsMissionLetter = /mission[-_ ]?letter|official[-_ ]?mission/i.test(fileName);
  const fileHintsSalaryCert = /salary[-_ ]?cert|payslip|payroll/i.test(fileName);
  const fileHintsNonWork = /non[-_ ]?work[-_ ]?letter/i.test(fileName);
  const isWrongDocType = (
    (documentKey === "salary_certificate" || documentKey === "non_work_letter") && fileHintsMissionLetter
  ) || (
    documentKey === "official_mission_letter" && (fileHintsSalaryCert || fileHintsNonWork)
  );

  const customerStatus = isWrongDocType ? "mismatch" : unreadable
    ? "unreadable"
    : dateMismatch
      ? "date_mismatch"
      : salaryConflict
        ? "salary_conflict"
        : mismatch
          ? "mismatch"
          : stale
            ? "stale"
            : stamped
              ? "passed"
              : "needs_stamp";
  const customerMessages = {
    passed: ["Document passed the gateway checks.", "اجتاز المستند فحص البوابة."],
    unreadable: ["Upload a clearer copy so the details can be read.", "أعد رفع نسخة أوضح حتى يمكن قراءة البيانات."],
    stale: ["Upload a recent copy of the document.", "أعد رفع نسخة حديثة من المستند."],
    mismatch: ["The uploaded document details do not match the application. Upload the correct document.", "بيانات المستند لا تطابق الطلب. أعد رفع المستند الصحيح."],
    salary_conflict: ["The document conflicts with the salary details in the form. Correct the salary or upload the right document.", "بيانات المستند تتعارض مع الراتب في الطلب. صحح الراتب أو أعد رفع المستند الصحيح."],
    date_mismatch: ["Upload a document where the dates support the stated case.", "أعد رفع مستند تكون تواريخه مطابقة للحالة المذكورة."],
    needs_stamp: ["Upload the document with the authority stamp or digital stamp.", "أعد رفع المستند بختم الجهة أو الختم الرقمي."]
  };
  return {
    contractVersion: "document-recognition-result.v1",
    status: "local_review_complete",
    customerStatus,
    decision: customerStatus === "passed" ? "accepted_for_gateway" : "needs_customer_action",
    confidence: null,
    aiUsed: false,
    reviewMode: "local_filename_check",
    checkedAt: new Date().toISOString(),
    document: {
      key: documentKey,
      label: documentTitle(documentKey),
      arLabel: documentTitle(documentKey),
      file,
      checks: [],
      customerMessage: customerMessages[customerStatus][0],
      customerMessageAr: customerMessages[customerStatus][1]
    }
  };
}

function inspectDocument(slot, fileMetadata, note) {
  const config = documentSlotConfig(slot);
  const request = documentRecognitionService?.buildRecognitionRequest
    ? documentRecognitionService.buildRecognitionRequest({
      caseId: state.selectedCase.id,
      applicantId: state.applicantMemory?.applicantId || state.selectedCase.applicantMemoryId || null,
      serviceKey: SERVICE_KEY,
      documentKey: config.documentKey,
      file: fileMetadata,
      customerNote: note
    })
    : {
      contractVersion: "document-recognition-request.v1",
      caseId: state.selectedCase.id,
      applicantId: state.applicantMemory?.applicantId || null,
      serviceKey: SERVICE_KEY,
      document: {
        key: config.documentKey,
        label: documentTitle(config.documentKey),
        arLabel: documentTitle(config.documentKey),
        file: fileMetadata,
        customerNote: note
      },
      requestedAt: new Date().toISOString()
    };
  return documentRecognitionService?.inspectDocument
    ? documentRecognitionService.inspectDocument(request)
    : localDocumentRecognitionFallback(request);
}

function setDocumentUpload(slot, fileMetadata, note = "") {
  const config = documentSlotConfig(slot);
  const recognition = inspectDocument(slot, fileMetadata, note);
  const now = new Date().toISOString();
  const upload = {
    slot,
    documentKey: config.documentKey,
    status: recognition.customerStatus || "missing",
    file: fileMetadata,
    note,
    recognition,
    updatedAt: now
  };
  const attempt = buildDocumentAttempt(slot, upload, now);
  upload.attemptId = attempt.id;
  state.selectedCase.documentUploads = {
    ...(state.selectedCase.documentUploads || {}),
    [slot]: upload
  };
  state.selectedCase.documentThreads = appendDocumentAttempt(state.selectedCase, slot, attempt);
  state.selectedCase[config.statusField] = upload.status;
  state.selectedCase.customerDocumentGate = buildCustomerReadiness(state.selectedCase);
  return upload;
}

function updateCustomerDocumentGate() {
  state.selectedCase.customerDocumentGate = buildCustomerReadiness(state.selectedCase);
}

function buildDocumentAttempt(slot, upload, at) {
  return {
    id: `${state.selectedCase.id}-${slot}-${Date.now()}`,
    at,
    source: "customer_upload",
    actor: "customer",
    slot,
    documentKey: upload.documentKey,
    status: upload.status,
    decision: upload.recognition?.decision || "needs_customer_action",
    file: upload.file,
    note: upload.note || "",
    recognition: upload.recognition
  };
}

function appendDocumentAttempt(caseData, slot, attempt) {
  const previousThreads = caseData.documentThreads || {};
  const previous = previousThreads[slot] || {};
  const attempts = Array.isArray(previous.attempts) ? previous.attempts : [];
  return {
    ...previousThreads,
    [slot]: {
      contractVersion: DOCUMENT_THREAD_CONTRACT,
      caseId: caseData.id,
      slot,
      documentKey: attempt.documentKey,
      latestAttemptId: attempt.id,
      attempts: [...attempts, attempt],
      createdAt: previous.createdAt || attempt.at,
      updatedAt: attempt.at
    }
  };
}

function updateLatestDocumentAttemptNote(slot, note) {
  const threads = state.selectedCase.documentThreads || {};
  const thread = threads[slot];
  if (!thread?.latestAttemptId) return;
  const attempts = (thread.attempts || []).map((attempt) => (
    attempt.id === thread.latestAttemptId ? { ...attempt, note } : attempt
  ));
  state.selectedCase.documentThreads = {
    ...threads,
    [slot]: {
      ...thread,
      attempts,
      updatedAt: new Date().toISOString()
    }
  };
}

function persistWorkspaceState(reason = "workspace_update") {
  if (!state.selectedCase?.id) return null;
  state.selectedCase = {
    ...state.selectedCase,
    status: state.status || state.selectedCase.status || "draft",
    language: state.lang,
    workspaceSavedAt: new Date().toISOString(),
    workspaceSaveReason: reason,
    channel: state.selectedCase.channel || "customer_web",
    source: state.selectedCase.source || "customer"
  };
  return state.selectedCase;
}

function handleDocumentUpload(slot, file) {
  syncFormToState();
  const config = documentSlotConfig(slot);
  const note = $(config.noteField)?.value || "";
  setDocumentUpload(slot, normalizeFileMetadata(file), note);
  persistWorkspaceState("document_upload");
  renderSelectedFileNames();
  renderDocumentWorkspace();
  renderDocuments();
  renderCorrectionNotice();
  renderStatus();
}

function updateDocumentNote(slot, note) {
  const uploads = state.selectedCase.documentUploads || {};
  const current = uploads[slot];
  if (!current) return;
  const updated = {
    ...current,
    note,
    updatedAt: new Date().toISOString()
  };
  state.selectedCase.documentUploads = {
    ...uploads,
    [slot]: updated
  };
  updateLatestDocumentAttemptNote(slot, note);
  persistWorkspaceState("document_note_update");
  renderDocumentWorkspace();
  renderDocuments();
}

function rerunDocumentRecognition(slot) {
  const current = state.selectedCase.documentUploads?.[slot];
  if (!current) {
    const config = documentSlotConfig(slot);
    state.selectedCase[config.statusField] = "missing";
    return;
  }
  setDocumentUpload(slot, current.file, current.note || "");
  persistWorkspaceState("document_recognition_refresh");
}

function renderSelectedFileNames() {
  [
    ["incomeDocumentFileName", "income_proof"],
    ["missionLetterFileName", "official_mission_letter"],
    ["passportStampFileName", "passport_stamp"]
  ].forEach(([elementId, slot]) => {
    const node = $(elementId);
    if (!node) return;
    node.textContent = state.selectedCase.documentUploads?.[slot]?.file?.name || t("docs.noFile");
  });
}

function fillForm(caseData) {
  $("applicantName").value = state.lang === "ar" ? caseData.applicantNameAr || caseData.applicantName : caseData.applicantName;
  $("emiratesIdMasked").value = caseData.emiratesIdMasked;
  $("phoneMasked").value = caseData.phoneMasked || "";
  $("emailMasked").value = caseData.emailMasked || "";
  ["applicantName", "emiratesIdMasked", "phoneMasked", "emailMasked"].forEach((id) => {
    $(id).readOnly = isCustomerSignedIn();
  });
  $("currentSalary").value = caseData.currentSalary ?? "";
  $("remarks").value = state.lang === "ar" ? caseData.remarksAr || caseData.remarks || "" : caseData.remarks || caseData.remarksAr || "";
  $("acknowledgement").checked = Boolean(caseData.acknowledgement);
  $("incomeDocumentType").value = caseData.incomeDocumentType || "salary_certificate";
  $("incomeDocumentNote").value = caseData.documentUploads?.income_proof?.note || "";
  $("incomeDocumentFile").value = "";
  $("officialMissionCase").checked = Boolean(caseData.officialMissionCase);
  $("missionLetterNote").value = caseData.documentUploads?.official_mission_letter?.note || "";
  $("missionLetterFile").value = "";
  $("passportStampNote").value = caseData.documentUploads?.passport_stamp?.note || "";
  $("passportStampFile").value = "";
  $("missionDocumentFields").hidden = !Boolean(caseData.officialMissionCase);
  renderSelectedFileNames();
}

function syncFormToState() {
  const applicantName = $("applicantName").value;
  const remarks = $("remarks").value;
  const currentSalary = Number($("currentSalary").value || 0);
  const officialMissionCase = $("officialMissionCase").checked;
  state.selectedCase = {
    ...state.selectedCase,
    applicantName: state.lang === "en" ? applicantName : state.selectedCase.applicantName,
    applicantNameAr: state.lang === "ar" ? applicantName : state.selectedCase.applicantNameAr,
    emiratesIdMasked: $("emiratesIdMasked").value,
    phoneMasked: $("phoneMasked").value,
    emailMasked: $("emailMasked").value,
    currentSalary,
    monthlyIncome: currentSalary,
    remarks: state.lang === "en" ? remarks : state.selectedCase.remarks,
    remarksAr: state.lang === "ar" ? remarks : state.selectedCase.remarksAr,
    reason: state.selectedCase.reason || "",
    reasonAr: state.selectedCase.reasonAr || "",
    acknowledgement: $("acknowledgement").checked,
    incomeDocumentType: $("incomeDocumentType").value,
    incomeDocumentStatus: state.selectedCase.documentUploads?.income_proof?.status || state.selectedCase.incomeDocumentStatus || "missing",
    officialMissionCase,
    missionLetterStatus: officialMissionCase ? state.selectedCase.documentUploads?.official_mission_letter?.status || state.selectedCase.missionLetterStatus || "missing" : "missing",
    passportStampStatus: officialMissionCase ? state.selectedCase.documentUploads?.passport_stamp?.status || state.selectedCase.passportStampStatus || "missing" : "missing",
    documentUploads: {
      ...(state.selectedCase.documentUploads || {}),
      income_proof: state.selectedCase.documentUploads?.income_proof
        ? { ...state.selectedCase.documentUploads.income_proof, note: $("incomeDocumentNote").value }
        : undefined,
      official_mission_letter: state.selectedCase.documentUploads?.official_mission_letter
        ? { ...state.selectedCase.documentUploads.official_mission_letter, note: $("missionLetterNote").value }
        : undefined,
      passport_stamp: state.selectedCase.documentUploads?.passport_stamp
        ? { ...state.selectedCase.documentUploads.passport_stamp, note: $("passportStampNote").value }
        : undefined
    },
    applicantMemoryId: state.applicantMemory?.applicantId || state.selectedCase.applicantMemoryId,
    identityProvider: state.applicantMemory?.identityProvider || state.selectedCase.identityProvider
  };
  $("missionDocumentFields").hidden = !officialMissionCase;
}

function documentTypeForUpload(upload) {
  if (!upload) return "salary_certificate";
  if (upload.slot === "income_proof") {
    return state.selectedCase.incomeDocumentType || "salary_certificate";
  }
  return upload.documentKey || upload.slot;
}

function buildLiveApplicationPayload() {
  const displayName = state.lang === "ar"
    ? state.selectedCase.applicantNameAr || state.selectedCase.applicantName
    : state.selectedCase.applicantName || state.selectedCase.applicantNameAr;
  return {
    language: state.lang,
    channel: "customer_web",
    customer: {
      displayName,
      displayNameAr: state.selectedCase.applicantNameAr || displayName,
      identityRef: state.applicantMemory?.applicantId || state.verifiedSession?.subjectId || state.selectedCase.applicantMemoryId || null,
      emiratesIdMasked: state.selectedCase.emiratesIdMasked,
      phoneMasked: state.selectedCase.phoneMasked,
      emailMasked: state.selectedCase.emailMasked
    },
    financial: {
      currentSalary: Number(state.selectedCase.currentSalary || state.selectedCase.monthlyIncome || 0),
      monthlyObligations: Number(state.selectedCase.monthlyObligations || 0),
      existingLoans: Boolean(state.selectedCase.existingLoans || Number(state.selectedCase.monthlyObligations || 0) > 0)
    },
    family: {
      dependentsCount: Number(state.selectedCase.dependents || state.selectedCase.dependentsCount || 0),
      familyMembersCount: Number(state.selectedCase.familyMembersCount || Number(state.selectedCase.dependents || 0) + 1 || 1)
    },
    specialCases: {
      officialMissionCase: Boolean(state.selectedCase.officialMissionCase)
    },
    remarks: state.lang === "ar" ? state.selectedCase.remarksAr || state.selectedCase.remarks || "" : state.selectedCase.remarks || state.selectedCase.remarksAr || "",
    acknowledgement: Boolean(state.selectedCase.acknowledgement)
  };
}

function buildLiveDocumentPayload(upload) {
  return {
    documentType: documentTypeForUpload(upload),
    fileName: upload.file?.name || "",
    uploadStatus: upload.file ? "received" : "missing",
    recognitionStatus: upload.status || "missing",
    authenticityRiskStatus: upload.status === "passed" ? "low_risk" : "needs_review",
    notes: upload.note || upload.recognition?.document?.customerMessage || ""
  };
}

async function saveLiveSubmission() {
  if (!liveApi?.createApplication) throw new Error("Live application API is unavailable.");
  const created = await liveApi.createApplication(buildLiveApplicationPayload());
  const application = created.application;
  const applicationId = application.applicationId;
  const uploads = Object.values(state.selectedCase.documentUploads || {}).filter(Boolean);
  for (const upload of uploads) {
    await liveApi.addDocument(applicationId, buildLiveDocumentPayload(upload));
  }
  try {
    await liveApi.assess(applicationId);
  } catch (error) {
    if (error.statusCode !== 409) throw error;
  }
  const submission = {
    ...state.selectedCase,
    id: applicationId,
    applicationId,
    status: application.status || "application_submitted",
    liveApiBacked: true,
    source: "customer",
    channel: "customer_web",
    submittedAt: application.submittedAt || new Date().toISOString()
  };
  state.selectedCase = submission;
  state.lastSubmission = submission;
  rememberCurrentApplication(applicationId);
  return submission;
}

async function submitApplication() {
  if (state.submitInProgress) return;
  if (!isCustomerSignedIn()) {
    showToast(t("toast.manualAccount"));
    return;
  }
  const readiness = buildCustomerReadiness(state.selectedCase);
  state.selectedCase.customerDocumentGate = readiness;
  if (!readiness.ready) {
    state.status = "draft";
    state.lastSubmission = null;
    showToast(t("toast.correction"));
    renderAll();
    window.setTimeout(() => $("correctionNotice")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    return;
  }
  state.submitInProgress = true;
  try {
    const submission = await saveLiveSubmission();
    state.status = submission.status || "application_submitted";
    state.lastSubmission = submission;
    showToast(t("toast.submit"));
    renderAll();
    guideToSubmittedState();
  } catch (error) {
    showToast(error.message || t("toast.correction"));
  } finally {
    state.submitInProgress = false;
  }
}

function saveSubmission(status) {
  const submission = {
    ...state.selectedCase,
    status,
    language: state.lang,
    submittedAt: new Date().toISOString(),
    channel: "customer_web"
  };
  state.lastSubmission = submission;
  return submission;
}

function readSubmissions() {
  return [];
}

function customerAssessmentResult(caseData = state.selectedCase) {
  if (!workflow?.buildReview || !caseData?.id) return null;
  try {
    return workflow.buildReview(caseData, {
      locale: state.lang === "ar" ? "ar-AE" : "en-AE"
    }).assessmentResult || null;
  } catch {
    return null;
  }
}

function documentTitle(key) {
  const labels = {
    salary_certificate: {
      ar: "شهادة راتب تفصيلية حديثة",
      en: "Detailed recent salary certificate"
    },
    non_work_letter: {
      ar: "رسالة عدم عمل من كاتب العدل",
      en: "Non-work letter from notary public"
    },
    official_mission_letter: {
      ar: "شهادة لمن يهمه الأمر للمهمة الرسمية",
      en: "Official mission letter"
    },
    passport_stamp: {
      ar: "ختم جواز السفر",
      en: "Passport stamp"
    }
  };
  return labels[key]?.[state.lang] || key;
}

function statusLabel(status) {
  const labels = {
    missing: { ar: "غير مرفق", en: "Missing" },
    needs_stamp: { ar: "يحتاج إلى ختم أو ختم رقمي", en: "Needs stamp or digital stamp" },
    unreadable: { ar: "غير واضح", en: "Unreadable" },
    stale: { ar: "قديم", en: "Stale" },
    mismatch: { ar: "غير مطابق", en: "Mismatch" },
    salary_conflict: { ar: "تعارض في الراتب", en: "Salary conflict" },
    date_mismatch: { ar: "تعارض في التواريخ", en: "Date mismatch" },
    passed: { ar: "اجتاز الفحص", en: "Passed checks" }
  };
  return labels[status]?.[state.lang] || status;
}

function documentCorrectionMessage(doc) {
  if (doc.status === "passed") {
    return state.lang === "ar"
      ? "مكتمل ومقبول لفحص البوابة."
      : "Complete and accepted by the gateway check.";
  }
  if (doc.status === "needs_stamp") {
    return state.lang === "ar"
      ? "أعد رفع المستند بختم الجهة أو الختم الرقمي."
      : "Upload the document with the authority stamp or digital stamp.";
  }
  if (doc.status === "unreadable") {
    return state.lang === "ar"
      ? "أعد رفع نسخة أوضح حتى يمكن قراءة البيانات."
      : "Upload a clearer copy so the details can be read.";
  }
  if (doc.status === "stale") {
    return state.lang === "ar"
      ? "أعد رفع نسخة حديثة من المستند."
      : "Upload a recent copy of the document.";
  }
  if (doc.status === "mismatch") {
    return state.lang === "ar"
      ? "بيانات المستند لا تطابق الطلب. أعد رفع المستند الصحيح."
      : "The uploaded document details do not match the application. Upload the correct document.";
  }
  if (doc.status === "salary_conflict") {
    return state.lang === "ar"
      ? "بيانات المستند تتعارض مع الراتب في الطلب. صحح الراتب أو أعد رفع المستند الصحيح."
      : "The document conflicts with the salary details in the form. Correct the salary or upload the right document.";
  }
  if (doc.status === "date_mismatch") {
    return state.lang === "ar"
      ? "أعد رفع مستند تكون تواريخه مطابقة للحالة المذكورة."
      : "Upload a document where the dates support the stated case.";
  }
  return state.lang === "ar"
    ? "ارفع المستند المطلوب قبل إرسال الطلب."
    : "Upload the required document before submitting.";
}

function documentHelpCopy(key) {
  const copy = {
    ar: {
      salary_certificate: "بديل إثبات الدخل للمتعاملين العاملين. يجب أن يكون حديثاً ومفصلاً ومختوماً أو بختم رقمي.",
      non_work_letter: "بديل إثبات الدخل للمتعاملين غير العاملين. تصدر الرسالة من كاتب العدل.",
      official_mission_letter: "مطلوبة فقط عند تراكم المتأخرات أثناء مهمة رسمية خارج الدولة.",
      passport_stamp: "مطلوب مع حالة المهمة الرسمية خارج الدولة."
    },
    en: {
      salary_certificate: "Income proof for employed customers. It should be recent, detailed, and stamped or digitally stamped.",
      non_work_letter: "Income proof alternative for non-working customers. It is issued by the notary public.",
      official_mission_letter: "Required only when arrears accumulated during an official mission outside the UAE.",
      passport_stamp: "Required with the official-mission outside-UAE condition."
    }
  }[state.lang];
  return copy[key] || "";
}

function requiredDocumentsForCase(caseData) {
  const primaryKey = caseData.incomeDocumentType === "non_work_letter"
    ? "non_work_letter"
    : "salary_certificate";
  const uploads = caseData.documentUploads || {};
  const incomeUpload = uploads.income_proof;
  const docs = [
    {
      key: primaryKey,
      title: documentTitle(primaryKey),
      copy: documentHelpCopy(primaryKey),
      status: incomeUpload?.status || caseData.incomeDocumentStatus || "missing",
      required: true,
      upload: incomeUpload || null,
      recognition: incomeUpload?.recognition || null,
      thread: caseData.documentThreads?.income_proof || null
    }
  ];

  if (caseData.officialMissionCase) {
    const missionUpload = uploads.official_mission_letter;
    const passportUpload = uploads.passport_stamp;
    docs.push(
      {
        key: "official_mission_letter",
        title: documentTitle("official_mission_letter"),
        copy: documentHelpCopy("official_mission_letter"),
        status: missionUpload?.status || caseData.missionLetterStatus || "missing",
        required: true,
        upload: missionUpload || null,
        recognition: missionUpload?.recognition || null,
        thread: caseData.documentThreads?.official_mission_letter || null
      },
      {
        key: "passport_stamp",
        title: documentTitle("passport_stamp"),
        copy: documentHelpCopy("passport_stamp"),
        status: passportUpload?.status || caseData.passportStampStatus || "missing",
        required: true,
        upload: passportUpload || null,
        recognition: passportUpload?.recognition || null,
        thread: caseData.documentThreads?.passport_stamp || null
      }
    );
  }
  return docs;
}

function buildCustomerReadiness(caseData) {
  const issues = [];
  const currentSalary = Number(caseData.currentSalary || caseData.monthlyIncome || 0);
  const remarks = state.lang === "ar" ? caseData.remarksAr || caseData.remarks : caseData.remarks || caseData.remarksAr;
  if (!currentSalary || currentSalary <= 0) {
    issues.push({
      key: "currentSalary",
      text: state.lang === "ar" ? "أدخل الراتب الحالي." : "Enter the current salary."
    });
  }
  if (!remarks || !remarks.trim()) {
    issues.push({
      key: "remarks",
      text: state.lang === "ar" ? "أدخل الملاحظات الخاصة بالطلب." : "Enter the request remarks."
    });
  }
  if (!caseData.acknowledgement) {
    issues.push({
      key: "acknowledgement",
      text: state.lang === "ar" ? "فعّل الإقرار قبل إرسال الطلب." : "Confirm the acknowledgement before submitting."
    });
  }

  const documents = requiredDocumentsForCase(caseData);
  documents.forEach((doc) => {
    if (doc.status !== "passed") {
      issues.push({
        key: doc.key,
        text: `${doc.title}: ${documentCorrectionMessage(doc)}`
      });
    }
  });

  return {
    ready: issues.length === 0,
    issues,
    documents,
    checkedAt: new Date().toISOString()
  };
}

function renderAll() {
  document.body.classList.toggle("signed-in", isCustomerSignedIn());
  document.body.classList.toggle("application-open", state.applicationActive);
  const floatLabel = document.getElementById("floatSmartLabel");
  if (floatLabel) floatLabel.textContent = state.lang === "en" ? "Try Smart Service" : "جرّب الخدمة الذكية";
  renderHeaderAccount();
  renderHeroState();
  renderIdentityGateway();
  renderPublicServiceDetails();
  renderApplicationVisibility();
  renderSteps();
  renderLoanDetails();
  renderDocumentWorkspace();
  renderDocuments();
  renderCorrectionNotice();
  renderSubmissionNotice();
  renderStatus();
  renderConfirmation();
  checkProactiveNotifications().catch(() => {});
}

function renderLoanDetails() {
  const grid = $("loanDetailsGrid");
  if (!grid) return;
  const programmeLoan = programmeLoanService
    ? programmeLoanService.buildFromCase(state.selectedCase)
    : null;
  const dash = "—";
  const rows = [
    [t("loan.bankName"), t("public.partnerValue")],
    [t("loan.accountNumber"), programmeLoan?.loanId || dash],
    [t("loan.totalAmount"), programmeLoan ? money(programmeLoan.originalLoanAmount) : dash],
    [t("loan.arrearsAmount"), programmeLoan ? money(programmeLoan.totalArrearsAmount) : dash],
    [t("loan.currentInstallment"), programmeLoan ? money(programmeLoan.currentMonthlyInstallment) : dash],
    [t("loan.balanceAmount"), programmeLoan ? money(programmeLoan.remainingLoanBalance) : dash],
    [t("loan.emisPending"), programmeLoan ? String(programmeLoan.unpaidInstallmentsCount) : dash],
    [t("loan.autoDda"), t("loan.enabled")]
  ];
  grid.innerHTML = rows
    .map(([label, value]) => `
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `)
    .join("");
}

function renderHeaderAccount() {
  const account = $("accountHeader");
  if (!account) return;
  if (!isCustomerSignedIn()) {
    account.hidden = true;
    account.innerHTML = "";
    return;
  }
  const profile = state.applicantMemory?.profile || {};
  const fullName = state.lang === "ar"
    ? profile.fullNameAr || profile.fullName || ""
    : profile.fullName || profile.fullNameAr || "";
  const shortName = fullName || (state.lang === "ar" ? "المتعامل" : "Customer");
  account.hidden = false;
  account.innerHTML = `
    <button id="headerAccountButton" class="header-account-button" type="button">
      <span class="avatar" aria-hidden="true"></span>
      <span>${escapeHtml(shortName)}</span>
      <span aria-hidden="true">⌄</span>
    </button>
  `;
  $("headerAccountButton")?.addEventListener("click", signOutCustomer);
}

function renderPublicServiceDetails() {
  const details = $("publicServiceDetails");
  if (!details) return;
  details.hidden = isCustomerSignedIn();
}

function renderHeroState() {
  const description = $("serviceDescription");
  const action = $("heroActionButton");
  if (!description || !action) return;

  if (!isCustomerSignedIn()) {
    description.textContent = t("service.description");
    action.textContent = t("hero.start");
    action.dataset.scrollTarget = "identityGateway";
    return;
  }

  if (state.applicationActive) {
    description.textContent = t("service.descriptionApplicationOpen");
    action.textContent = t("hero.application");
    action.dataset.scrollTarget = "applicationPanel";
    return;
  }

  description.textContent = t("service.descriptionVerified");
  action.textContent = t("hero.requests");
  action.dataset.scrollTarget = "identityGateway";
}

function renderIdentityGateway() {
  const statusCard = $("identityStatusCard");
  const actionCard = $("memoryActionCard");
  if (!statusCard || !actionCard) return;
  const gateway = $("identityGateway");

  if (!isCustomerSignedIn()) {
    gateway.hidden = true;
    statusCard.innerHTML = "";
    actionCard.innerHTML = "";
    return;
  }

  gateway.hidden = state.applicationActive;
  gateway.classList.add("authenticated");
  const recent = state.applicantMemory.recentServices || [];
  const hasResume = Boolean(state.applicantMemory.currentApplicationId || accountSubmissions().length);

  statusCard.innerHTML = `
    <div class="dashboard-breadcrumb">${t("dashboard.breadcrumb")}</div>
    <div class="dashboard-filter-grid">
      <label>
        <span>${t("dashboard.categoryLabel")}</span>
        <select>
          <option>${t("dashboard.categoryValue")}</option>
          <option>${state.lang === "ar" ? "خدمات البنية التحتية" : "Infrastructure Services"}</option>
          <option>${state.lang === "ar" ? "خدمات النقل البري" : "Land Transport Services"}</option>
        </select>
      </label>
      <label>
        <span>${t("dashboard.serviceLabel")}</span>
        <select>
          <option>${t("dashboard.serviceValue")}</option>
        </select>
      </label>
      <label class="dashboard-check-row">
        <input type="checkbox" />
        <span>${t("dashboard.dateRange")}</span>
      </label>
    </div>
    <div class="dashboard-buttons">
      <button id="dashboardSearchBtn" class="primary-action" type="button">${t("dashboard.search")}</button>
      <button class="secondary-action" type="button">${t("dashboard.reset")}</button>
    </div>
  `;

  actionCard.innerHTML = `
    <strong>${state.applicationActive ? t("memory.applicationActive") : t("memory.ready")}</strong>
    <div class="memory-actions">
      <button id="startNewApplicationBtn" class="primary-action" type="button">${t("memory.startNew")}</button>
      <button id="resumeApplicationBtn" class="secondary-action" type="button" ${hasResume ? "" : "disabled"}>${hasResume ? t("memory.resume") : t("memory.resumeDisabled")}</button>
    </div>
    <div class="recent-services">
      <span>${t("memory.recent")}</span>
      ${recent.length ? recent.map((item) => `<p>${item.label} · ${item.applicationId}</p>`).join("") : `<p>${t("memory.noRecent")}</p>`}
    </div>
  `;

  $("startNewApplicationBtn")?.addEventListener("click", () => openApplication("new"));
  $("resumeApplicationBtn")?.addEventListener("click", () => openApplication("resume"));
  $("dashboardSearchBtn")?.addEventListener("click", () => {
    if (!state.applicationActive) openApplication(hasResume ? "resume" : "new");
  });
}

function renderApplicationVisibility() {
  const layout = $("journeyLayout");
  if (!layout) return;
  layout.hidden = !state.applicationActive || !isCustomerSignedIn();
}

function renderSubmissionNotice() {
  const notice = $("submissionNotice");
  const form = $("customerForm");
  const submission = state.lastSubmission || readSubmissions().find((item) => item.id === state.selectedCase.id);
  const submitted = Boolean(submission && submission.status !== "draft");

  if (!submitted) {
    notice.hidden = true;
    notice.innerHTML = "";
    form.classList.remove("submitted-mode");
    form.removeAttribute("aria-describedby");
    return;
  }

  const statusText = workflow
    ? workflow.labelStatus(submission.status, state.lang)
    : ((shared.statusLabels?.[submission.status] || shared.statusLabels?.draft || { en: "Draft", ar: "مسودة" })[state.lang] || submission.status);
  const assessment = customerAssessmentResult({ ...state.selectedCase, ...submission });
  const citizenStatus = assessment
    ? state.lang === "ar" ? assessment.citizenFacingStatusAr : assessment.citizenFacingStatus
    : statusText;
  const nextStep = t("submitted.nextValue");

  notice.hidden = false;
  form.classList.add("submitted-mode");
  form.setAttribute("aria-describedby", "submissionNotice");
  notice.innerHTML = `
    <p class="kicker">${t("submitted.kicker")}</p>
    <h3>${t("submitted.heading")}</h3>
    <p>${t("submitted.copy")}</p>
    <dl>
      <div><dt>${t("submitted.caseLabel")}</dt><dd>${state.selectedCase.id}</dd></div>
      <div><dt>${t("submitted.statusLabel")}</dt><dd>${citizenStatus}</dd></div>
      <div><dt>${t("submitted.nextLabel")}</dt><dd>${nextStep}</dd></div>
    </dl>
  `;
}

function guideToSubmittedState() {
  window.setTimeout(() => {
    const notice = $("submissionNotice");
    if (!notice || notice.hidden) return;
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
    notice.classList.add("pulse");
    window.setTimeout(() => notice.classList.remove("pulse"), 1200);
  }, 80);
}

function renderSteps() {
  const gate = state.selectedCase.customerDocumentGate;
  const activeStep = state.status !== "draft" ? 3 : gate && !gate.ready ? 3 : state.applicationActive ? 1 : 1;

  $("stepList").innerHTML = steps[state.lang]
    .map(([title, copy], index) => {
      const number = index + 1;
      const className = number < activeStep ? "step-item done" : number === activeStep ? "step-item active" : "step-item";
      return `
        <li class="${className}">
          <span class="step-number">${number}</span>
          <span>
            <span class="step-title">${title}</span>
            <span class="step-copy">${copy}</span>
          </span>
        </li>
      `;
    })
    .join("");
}

function localizedRecognitionMessage(recognition) {
  if (!recognition?.document) {
    return state.lang === "ar" ? "لم يتم فحص المستند بعد." : "Document has not been checked yet.";
  }
  return state.lang === "ar"
    ? recognition.document.customerMessageAr || recognition.document.customerMessage
    : recognition.document.customerMessage || recognition.document.customerMessageAr;
}

function renderDocumentWorkspace() {
  const workspace = $("documentWorkspace");
  if (!workspace) return;
  const docs = requiredDocumentsForCase(state.selectedCase);
  workspace.innerHTML = `
    <div class="document-workspace-heading">
      <strong>${t("docs.reviewHeading")}</strong>
    </div>
    <div class="document-review-grid">
      ${docs.map((doc) => renderDocumentReviewCard(doc)).join("")}
    </div>
  `;
}

function renderDocumentReviewCard(doc) {
  const upload = doc.upload || {};
  const recognition = upload.recognition;
  const fileName = upload.file?.name ? escapeHtml(upload.file.name) : t("docs.noFile");
  const checkedAt = recognition?.checkedAt
    ? new Date(recognition.checkedAt).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-AE")
    : "";
  const checks = recognition?.document?.checks || [];
  return `
    <article class="document-review-card status-${doc.status}">
      <div>
        <strong>${escapeHtml(doc.title)}</strong>
        <span class="doc-status">${statusLabel(doc.status)}</span>
      </div>
      <p>${escapeHtml(doc.copy || "")}</p>
      <dl>
        <div><dt>${t("docs.fileLabel")}</dt><dd>${fileName}</dd></div>
        ${checkedAt ? `<div><dt>${t("docs.checkedAt")}</dt><dd>${checkedAt}</dd></div>` : ""}
        <div><dt>${t("docs.nextAction")}</dt><dd>${escapeHtml(localizedRecognitionMessage(recognition))}</dd></div>
      </dl>
      ${checks.length ? `
        <div class="document-check-list">
          <span>${t("docs.checks")}</span>
          ${checks.map((check) => `
            <p class="check-${check.status}">
              ${state.lang === "ar" ? escapeHtml(check.arLabel || check.label) : escapeHtml(check.label || check.arLabel)}
            </p>
          `).join("")}
        </div>
      ` : ""}
      ${renderDocumentThread(doc)}
    </article>
  `;
}

function renderDocumentThread(doc) {
  const attempts = doc.thread?.attempts || [];
  if (!attempts.length) {
    return `
      <div class="document-thread-list empty">
        <span>${t("docs.historyHeading")}</span>
        <p>${t("docs.historyEmpty")}</p>
      </div>
    `;
  }
  const visibleAttempts = attempts.slice(-3).reverse();
  return `
    <div class="document-thread-list">
      <span>${t("docs.historyHeading")}</span>
      ${visibleAttempts.map((attempt, index) => {
        const at = attempt.at
          ? new Date(attempt.at).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-AE")
          : "";
        const latest = attempt.id === doc.thread.latestAttemptId;
        return `
          <p>
            <strong>${latest ? t("docs.historyLatest") : `${t("docs.historyAttempt")} ${attempts.length - index}`}</strong>
            <span>${statusLabel(attempt.status)} · ${escapeHtml(attempt.file?.name || t("docs.noFile"))}${at ? ` · ${at}` : ""}</span>
          </p>
        `;
      }).join("")}
    </div>
  `;
}

function renderDocuments() {
  const docs = getDocumentChecklist(state.selectedCase);
  $("documentList").innerHTML = docs
    .map((doc) => `
      <li class="doc-item">
        <strong>${doc.title}</strong>
        <span>${doc.copy}</span>
        <span class="doc-status">${doc.status}</span>
        ${doc.file ? `<span class="doc-file">${doc.file}</span>` : ""}
      </li>
    `)
    .join("");
}

function getDocumentChecklist(caseData) {
  return requiredDocumentsForCase(caseData).map((doc) => ({
    title: doc.title,
    copy: doc.copy,
    status: statusLabel(doc.status),
    file: doc.upload?.file?.name ? `${t("docs.fileLabel")}: ${escapeHtml(doc.upload.file.name)}` : ""
  }));
}

function renderProactiveAlert(notification) {
  const banner = $("proactiveAlertBanner");
  if (!banner) return;

  if (!notification) {
    banner.hidden = true;
    banner.innerHTML = "";
    return;
  }

  const sentAt = new Date(notification.sentAt || notification.createdAt || Date.now());
  const minutesAgo = Math.round((Date.now() - sentAt.getTime()) / 60000);
  const timeLabel = minutesAgo < 60
    ? (state.lang === "ar" ? `منذ ${minutesAgo} دقيقة` : `${minutesAgo} minutes ago`)
    : (state.lang === "ar" ? `منذ ${Math.round(minutesAgo / 60)} ساعة` : `${Math.round(minutesAgo / 60)} hours ago`);

  const alertLabel = state.lang === "ar" ? "إشعار من وزارة الطاقة والبنية التحتية" : "Notification from MOEI";
  const message = notification.message || "";

  banner.hidden = false;
  banner.innerHTML = `
    <span class="alert-icon">🔔</span>
    <div class="alert-body">
      <span class="alert-label">${alertLabel}</span>
      <p class="alert-message">${escapeHtml(message)}</p>
      <span class="alert-time">${timeLabel}</span>
    </div>
  `;
}

async function checkProactiveNotifications() {
  const applicationId = state.applicantMemory?.currentApplicationId;
  if (!applicationId) return;

  try {
    const res = await fetch("/api/challenge-3/notifications");
    if (!res.ok) return;
    const data = await res.json();
    const notifications = Array.isArray(data) ? data : (data.notifications || []);

    // Find most recent notification for this application (within 48 hours)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const matching = notifications
      .filter((n) => n.applicationId === applicationId && new Date(n.sentAt || n.createdAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime());

    renderProactiveAlert(matching[0] || null);
  } catch {
    // silent — non-critical
  }
}

function renderCorrectionNotice() {
  const notice = $("correctionNotice");
  if (!notice) return;
  const readiness = state.selectedCase.customerDocumentGate;
  if (!readiness || (state.lastSubmission && state.lastSubmission.status !== "draft")) {
    notice.hidden = true;
    notice.innerHTML = "";
    return;
  }

  notice.hidden = false;
  if (readiness.ready) {
    notice.className = "correction-notice ready";
    notice.innerHTML = `
      <p class="kicker">${t("correction.kicker")}</p>
      <h3>${t("correction.readyHeading")}</h3>
      <p>${t("correction.readyCopy")}</p>
    `;
    return;
  }

  notice.className = "correction-notice";
  notice.innerHTML = `
    <p class="kicker">${t("correction.kicker")}</p>
    <h3>${t("correction.heading")}</h3>
    <p>${t("correction.copy")}</p>
    <ul>
      ${readiness.issues.map((issue) => `<li>${issue.text}</li>`).join("")}
    </ul>
  `;
}

function renderStatus() {
  const labels = shared.statusLabels || {};
  const submission = state.lastSubmission || readSubmissions().find((item) => item.id === state.selectedCase.id);
  const currentStatus = submission?.status || state.status;
  const label = labels[currentStatus] || labels.draft || { en: "Draft", ar: "مسودة" };
  const currentSalary = Number(state.selectedCase.currentSalary || 0) > 0
    ? money(state.selectedCase.currentSalary)
    : (state.lang === "ar" ? "لم يدخل بعد" : "Not entered yet");
  const statusText = state.lang === "ar" ? label.ar : label.en;
  const caseLabel = state.lang === "ar" ? "رقم الطلب" : "Case ID";
  const salaryLabel = state.lang === "ar" ? "الراتب الحالي" : "Current salary";
  const docsLabel = state.lang === "ar" ? "فحص المستندات" : "Document check";
  const updatedLabel = state.lang === "ar" ? "آخر تحديث" : "Last update";
  const draftStartedLabel = state.lang === "ar" ? "تاريخ البدء" : "Draft started";
  const auditLabel = state.lang === "ar" ? "آخر إجراء" : "Latest action";
  const latestAudit = submission?.auditTrail?.[submission.auditTrail.length - 1];
  const readiness = state.selectedCase.customerDocumentGate || buildCustomerReadiness(state.selectedCase);
  const sharedWithOffice = Boolean(submission && submission.status !== "draft");
  const assessment = sharedWithOffice ? customerAssessmentResult({ ...state.selectedCase, ...submission }) : null;
  const citizenStatus = assessment
    ? state.lang === "ar" ? assessment.citizenFacingStatusAr : assessment.citizenFacingStatus
    : statusText;
  const handoff = state.lang === "ar"
    ? sharedWithOffice ? "تمت مشاركة الطلب مع مساحة عمل الموظف." : "لم يتم إرسال الطلب بعد."
    : sharedWithOffice ? "Shared with officer workspace." : "Not submitted yet.";

  $("statusCard").innerHTML = `
    <strong>${citizenStatus}</strong>
    <p>${caseLabel}: ${state.selectedCase.id}</p>
    <p>${salaryLabel}: ${currentSalary}</p>
    <p>${docsLabel}: ${readiness.ready ? (state.lang === "ar" ? "مكتمل" : "Complete") : (state.lang === "ar" ? "يلزم الاستكمال" : "Needs completion")}</p>
    <p>${handoff}</p>
    ${sharedWithOffice && submission?.updatedAt ? `<p>${updatedLabel}: ${new Date(submission.updatedAt).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-AE")}</p>` : ""}
    ${!sharedWithOffice && (submission?.createdAt || state.selectedCase?.createdAt) ? `<p>${draftStartedLabel}: ${new Date(submission?.createdAt || state.selectedCase.createdAt).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-AE")}</p>` : ""}
    ${latestAudit ? `<p>${auditLabel}: ${state.lang === "ar" ? latestAudit.actionAr : latestAudit.action}</p>` : ""}
  `;
}

function renderConfirmation() {
  const submission = state.lastSubmission || readSubmissions().find((item) => item.id === state.selectedCase.id);
  const isSubmitted = Boolean(submission && submission.status !== "draft");
  const status = submission?.status || state.status;
  const statusText = workflow
    ? workflow.labelStatus(status, state.lang)
    : ((shared.statusLabels?.[status] || shared.statusLabels?.draft || { en: "Draft", ar: "مسودة" })[state.lang] || status);
  const latestAudit = submission?.auditTrail?.[submission.auditTrail.length - 1];
  const assessment = isSubmitted ? customerAssessmentResult({ ...state.selectedCase, ...submission }) : null;
  const copy = state.lang === "ar"
    ? {
      pending: "أكمل بيانات الخدمة والمستندات المطلوبة قبل إرسال الطلب.",
      submitted: "تم إنشاء رقم طلب ومشاركة الحالة مع مساحة عمل الموظف للمراجعة.",
      current: "الحالة الحالية",
      next: "الخطوة التالية",
      action: "آخر إجراء",
      nextDraft: "فحص الراتب والملاحظات والمستندات المطلوبة.",
      nextSystem: "تجهيز لقطة الحالة ثم تحويلها إلى الموظف.",
      nextOfficer: "ينتظر الطلب قرار الموظف المعتمد.",
      nextInfo: "يرجى استكمال المعلومات أو المستندات المطلوبة.",
      nextApproved: "تم اعتماد الطلب ويمكن الرجوع إلى سجل الاعتماد."
    }
    : {
      pending: "Complete the service details and required documents before submitting.",
      submitted: "A case ID has been created and shared with the officer workspace for review.",
      current: "Current status",
      next: "Next step",
      action: "Latest action",
      nextDraft: "Check current salary, remarks, and required documents.",
      nextSystem: "Prepare the case snapshot and send it to the officer.",
      nextOfficer: "The request is waiting for verified officer action.",
      nextInfo: "Please complete the requested information or documents.",
      nextApproved: "The request has been approved and the approval record is available."
    };
  const nextStep = assessment
    ? state.lang === "ar" ? assessment.citizenFacingStatusAr : assessment.citizenFacingStatus
    : {
    draft: copy.nextDraft,
    system_review: copy.nextSystem,
    submitted: copy.nextSystem,
    officer_review: copy.nextOfficer,
    more_information: copy.nextInfo,
    approved: copy.nextApproved
  }[status] || copy.nextOfficer;

  $("confirmationCard").innerHTML = `
    <strong>${isSubmitted ? copy.submitted : copy.pending}</strong>
    <dl>
      <div><dt>${state.lang === "ar" ? "رقم الطلب" : "Case ID"}</dt><dd>${state.selectedCase.id}</dd></div>
      <div><dt>${copy.current}</dt><dd>${statusText}</dd></div>
      <div><dt>${copy.next}</dt><dd>${nextStep}</dd></div>
      ${latestAudit ? `<div><dt>${copy.action}</dt><dd>${state.lang === "ar" ? latestAudit.actionAr : latestAudit.action}</dd></div>` : ""}
    </dl>
  `;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 3800);
}

init();
