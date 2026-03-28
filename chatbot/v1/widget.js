/*!
 * VetNavigator AI — Embeddable Chatbot Widget v3.0
 * CDN: https://cdn.vetnavigator.ai/chatbot/v1/widget.js
 * © 2026 VetNavigator AI · Veteran-Made & Veteran-Owned
 *
 * INSTALL — paste before </body> on any website:
 *
 *   <script>
 *     window.VetNavigatorConfig = {
 *       licenseKey:  "VN-BASIC-XXXXX-XXXXX",
 *       orgName:     "VFW Post 1234",
 *       orgCity:     "Springfield, IL",
 *       orgAddress:  "123 Main St",
 *       orgPhone:    "(555) 123-4567",
 *       orgEmail:    "post1234@vfw.org",
 *       orgWeb:      "vfwpost1234.org",
 *       orgHours:    "Mon–Fri 9am–5pm",
 *       orgMission:  "Serving veterans since 1920",
 *       events:      ["Monthly Meeting — 1st Tuesday 7pm"],
 *       leaders:     ["Commander Jane Smith — (555) 999-0000"]
 *     };
 *   </script>
 *   <script src="https://cdn.vetnavigator.ai/chatbot/v1/widget.js" defer></script>
 */

(function () {
  'use strict';

  // ── GUARD: prevent double-load ─────────────────────────────────────────────
  if (window.__vnLoaded) return;
  window.__vnLoaded = true;

  // ── CONSTANTS ──────────────────────────────────────────────────────────────
  var VN_API        = 'https://vetnavigator-chat.richard-y-choi.workers.dev';
  var SUPPORT_EMAIL = 'support@vetnavigator.ai';
  var BREVO_KEY     = (window.VN_CONFIG && window.VN_CONFIG.BREVO_API_KEY) || '';

  // ── READ CUSTOMER CONFIG ───────────────────────────────────────────────────
  var cfg         = window.VetNavigatorConfig || {};
  var LICENSE_KEY = ((cfg.licenseKey || 'VN-DEMO') + '').toUpperCase().trim();
  var ORG_NAME    = cfg.orgName    || 'Your VSO';
  var ORG_CITY    = cfg.orgCity    || '';
  var ORG_ADDR    = cfg.orgAddress || '';
  var ORG_PHONE   = cfg.orgPhone   || '';
  var ORG_EMAIL   = cfg.orgEmail   || '';
  var ORG_WEB     = cfg.orgWeb     || '';
  var ORG_HOURS   = cfg.orgHours   || '';
  var ORG_MISSION = cfg.orgMission || '';
  var ORG_EVENTS  = Array.isArray(cfg.events)  ? cfg.events  : [];
  var ORG_LEADERS = Array.isArray(cfg.leaders) ? cfg.leaders : [];

  // ── LICENSE / TIER ─────────────────────────────────────────────────────────
  var TIER_MAP = { DEMO: 4, PREMIUM: 4, STANDARD: 3, STARTER: 2, BASIC: 1 };
  var _parts   = LICENSE_KEY.split('-');
  var TIER_STR = _parts.length >= 2 ? _parts[1] : 'BASIC';
  var TIER_LVL = TIER_MAP[TIER_STR] !== undefined ? TIER_MAP[TIER_STR] : 1;
  var IS_DEMO  = TIER_STR === 'DEMO';
  var HAS_ML   = TIER_LVL >= 3 || IS_DEMO;   // Standard+: multilingual
  var HAS_MIC  = TIER_LVL >= 3 || IS_DEMO;   // Standard+: microphone
  var HAS_ADMIN = TIER_LVL >= 2 || IS_DEMO;  // Starter+: admin panel

  // Session limits
  var CONV_LIMIT = (IS_DEMO || TIER_LVL >= 3) ? 999 : (TIER_LVL >= 2 ? 20 : 10);
  var WARN_AT    = Math.ceil(CONV_LIMIT * 0.8);

  // ── SESSION STATE ──────────────────────────────────────────────────────────
  var lang        = 'en';
  var turnCount   = 0;
  var chatHistory = [];
  var panelOpen   = false;
  var chatStarted = false;

  // ── TOPIC TIER GATES ───────────────────────────────────────────────────────
  var TOPIC_TIERS = {
    // Tier 1 — all plans
    crisis:1, vso:1, file_claim:1, documents:1, disability:1, gi_bill:1,
    home_loan:1, healthcare:1, benefits_menu:1, welcome:1, veteran:1,
    era:1, spouse:1, active_duty:1, denied:1, capabilities:1,
    surviving_spouse:1, all_benefits:1, feedback:1,
    cat_money:1, cat_healthcare:1, cat_education:1,
    cat_housing:1, cat_family:1, cat_claims:1,
    // Tier 2 — Starter+
    pact_act:2, pact_qualify:2, voc_rehab:2, voc_rehab_apply:2, dic:2,
    dic_apply:2, champva:2, bdd:2, rating_explained:2, rating_increase:2,
    cp_exam:2, gi_bill_apply:2, gi_bill_transfer:2, home_loan_apply:2,
    healthcare_enroll:2, healthcare_eligibility:2,
    // Tier 3 — Standard+
    tdiu:3, nexus:3, mental_health:3, pension:3, aid_attendance:3,
    housing_help:3, dental_vision:3, burial:3, caregiver:3,
    life_insurance:3, community_care:3, claim_status:3, va_debt:3,
    mst:3, travel_pay:3, women_veterans:3, guard_reserve:3,
    adapted_housing:3, va_records:3
  };

  function canAccess(key) {
    var req = TOPIC_TIERS[key];
    if (req === undefined || IS_DEMO) return true;
    return TIER_LVL >= req;
  }

  // ── CONVERSATION NODES ─────────────────────────────────────────────────────
  var NODES = {

    welcome: {
      bot: "Welcome! I'm your VA benefits guide. 🎖️\n\nI can help you understand benefits, file claims, and connect with your VSO counselor — all free.\n\nWhich best describes you?",
      cards: [
        { icon: '🎖️', title: 'Veteran',          desc: 'I served in the US military' },
        { icon: '⚔️', title: 'Active Duty',       desc: 'Currently serving' },
        { icon: '💛', title: 'Spouse / Family',   desc: 'Family member of a veteran' },
        { icon: '🕊️', title: 'Surviving Spouse', desc: 'Lost a veteran spouse' }
      ]
    },

    veteran: {
      bot: "Thank you for your service. 🇺🇸\n\nWhen did you serve?",
      cards: [
        { icon: '🏜️', title: 'Post-9/11',   desc: '2001 to present' },
        { icon: '🌊', title: 'Gulf War',     desc: '1990–2001' },
        { icon: '🌿', title: 'Vietnam Era', desc: '1964–1975' },
        { icon: '🔵', title: 'Other Era',   desc: 'Korean, Cold War, etc.' }
      ]
    },

    active_duty: {
      bot: "Thank you for your service! 🇺🇸\n\nActive duty service members have access to VA programs before separation.\n\n<strong>Benefits Delivery at Discharge (BDD)</strong> — file your claim 90–180 days before you separate.\n\n<strong>TAP Program</strong> — free transition assistance for you and your family.",
      chips: ['What is BDD?', 'See all benefits', 'Find a VSO counselor']
    },

    spouse: {
      bot: "Thank you for your support and sacrifice. 🤍\n\n<strong>Benefits available to veteran spouses and dependents:</strong>\n\n— <strong>CHAMPVA</strong> — free VA healthcare for qualifying dependents\n— <strong>DEA (Ch. 35)</strong> — education benefits\n— <strong>Survivors Pension</strong> — income support\n— <strong>DIC</strong> — monthly payment if veteran died from service-connected cause\n— <strong>VA Home Loan</strong> — surviving spouses may be eligible",
      chips: ['Tell me about DIC', 'Tell me about CHAMPVA', 'Find a VSO counselor', 'See all benefits']
    },

    surviving_spouse: {
      bot: "We are deeply sorry for your loss. 🙏\n\nAs a surviving spouse, you may be eligible for:\n\n— <strong>DIC</strong> — monthly tax-free payment\n— <strong>Survivors Pension</strong> — income-based support\n— <strong>CHAMPVA</strong> — healthcare coverage\n— <strong>VA Home Loan</strong> — may be available\n— <strong>Burial benefits</strong> — reimbursement and honors\n\nA VSO counselor can review your situation at no cost.",
      chips: ['Tell me about DIC', 'Tell me about CHAMPVA', 'Find a VSO counselor', 'See all benefits']
    },

    era: {
      bot: "Every era of service counts. 🇺🇸\n\nDo you currently have a VA disability rating?",
      cards: [
        { icon: '✅', title: 'Yes — rated',  desc: 'I have a rating %' },
        { icon: '📝', title: 'No — not yet', desc: 'Never filed a claim' },
        { icon: '❌', title: 'Was denied',   desc: 'My claim was denied' },
        { icon: '❓', title: 'Not sure',     desc: 'I need to check' }
      ]
    },

    // ── BENEFITS MENU ──────────────────────────────────────────────────────

    benefits_menu: {
      bot: "Here are the most common VA benefits. Tap a topic or see all benefits to explore everything I can help with.",
      cards: [
        { icon: '💰', title: 'Disability Pay', desc: 'Tax-free monthly pay' },
        { icon: '🎓', title: 'GI Bill',         desc: 'Education funding' },
        { icon: '🏠', title: 'VA Home Loan',    desc: 'No down payment' },
        { icon: '🏥', title: 'Healthcare',      desc: 'VA medical care' }
      ],
      chips: ['See All Benefits →']
    },

    all_benefits: {
      bot: "Choose a category to explore:",
      chips: ['💰 Money & Pay', '🏥 Healthcare', '🎓 Education & Jobs', '🏠 Housing', '👨‍👩‍👧 Family & Survivors', '⚖️ Claims & Appeals']
    },

    cat_money: {
      bot: "Money & Pay benefits:",
      chips: ['VA Disability Pay', 'VA Pension', 'TDIU', 'Travel Pay', 'VA Debt Help', 'Back to Categories']
    },

    cat_healthcare: {
      bot: "Healthcare benefits:",
      chips: ['VA Healthcare', 'CHAMPVA', 'Mental Health', 'Community Care', 'Dental & Vision', 'Caregiver Program', 'Back to Categories']
    },

    cat_education: {
      bot: "Education & Jobs benefits:",
      chips: ['GI Bill', 'Voc Rehab', 'BDD Program', 'Back to Categories']
    },

    cat_housing: {
      bot: "Housing benefits:",
      chips: ['VA Home Loan', 'Adapted Housing', 'Housing Assistance', 'Back to Categories']
    },

    cat_family: {
      bot: "Family & Survivors benefits:",
      chips: ['DIC', 'CHAMPVA', 'Survivors Pension', 'Aid & Attendance', 'Life Insurance', 'Burial Benefits', 'Back to Categories']
    },

    cat_claims: {
      bot: "Claims & Appeals:",
      chips: ['File a Claim', 'Claim Status', 'Denied Claim', 'Rating Increase', 'C&P Exam', 'TDIU', 'Nexus Letters', 'VA Records', 'Back to Categories']
    },

    // ── TIER 1 TOPICS ──────────────────────────────────────────────────────

    disability: {
      bot: "<strong>VA Disability Compensation</strong>\n\nTax-free monthly pay for veterans with service-connected conditions.\n\n<strong>Approximate monthly pay:</strong>\n— 10% → ~$175/mo\n— 30% → ~$524/mo\n— 50% → ~$1,075/mo\n— 70% → ~$1,663/mo\n— 100% → ~$3,737/mo\n\nAny condition that started or worsened during service may qualify — including mental health, hearing loss, and chronic pain.",
      chips: ['How do I file a claim?', 'How do I increase my rating?', 'What documents do I need?', 'Find a VSO counselor']
    },

    gi_bill: {
      bot: "<strong>Post-9/11 GI Bill (Ch. 33)</strong>\n\n<strong>Tuition:</strong> Full at public universities\n<strong>Housing:</strong> ~$1,800–$2,400/mo stipend\n<strong>Books:</strong> Up to $1,000/year\n<strong>Duration:</strong> Up to 36 months\n\nMust have 90+ days of active duty after 9/10/2001.",
      chips: ['How do I apply for GI Bill?', 'Can I transfer to my family?', 'Other education benefits', 'Find a VSO counselor']
    },

    home_loan: {
      bot: "<strong>VA Home Loan</strong>\n\n<strong>No down payment required</strong>\n<strong>No private mortgage insurance (PMI)</strong>\n<strong>Competitive interest rates</strong>\n<strong>Reusable for life</strong>\n\nOne of the most powerful benefits available. Most veterans with honorable discharge qualify.",
      chips: ['Am I eligible?', 'How do I apply?', 'Find a VSO counselor', 'See other benefits']
    },

    healthcare: {
      bot: "<strong>VA Healthcare</strong>\n\nComprehensive care including primary care, mental health, specialty care, and prescriptions.\n\n<strong>You likely qualify if you:</strong>\n— Served 24+ continuous months\n— Were discharged for a service-connected disability\n— Served in a combat zone after Nov 11, 1998",
      chips: ['How do I enroll?', 'Am I eligible?', 'Mental health services', 'Find a VSO counselor']
    },

    file_claim: {
      bot: "<strong>How to File a VA Disability Claim</strong>\n\n<strong>Step 1</strong> — Gather: DD-214, medical records, buddy statements\n<strong>Step 2</strong> — List every condition connected to your service\n<strong>Step 3</strong> — File at va.gov/disability or with a VSO (free)\n<strong>Step 4</strong> — Attend your C&P exam — describe your worst days\n<strong>Step 5</strong> — Wait for your rating decision (avg. 3–6 months)\n\nA VSO counselor files for free and significantly improves outcomes.",
      chips: ['What documents do I need?', 'What is a C&P exam?', 'Find a VSO counselor', 'See all benefits']
    },

    documents: {
      bot: "<strong>Documents Needed for a VA Claim</strong>\n\n<strong>Required:</strong>\n— DD-214 (discharge papers)\n— Military service records\n— Medical records showing your condition\n\n<strong>Strongly recommended:</strong>\n— Buddy statements from fellow veterans\n— Personal statement describing daily impact\n— Nexus letter from a doctor\n\nDon't have your DD-214? Request it free at archives.gov/veterans",
      chips: ['How do I file a claim?', 'What is a nexus letter?', 'Find a VSO counselor']
    },

    denied: {
      bot: "<strong>A denied claim is not the end.</strong>\n\nMost first-time VA claims are denied — but over 70% of appeals are won with the right help.\n\n<strong>Your options:</strong>\n— <strong>Supplemental Claim</strong> — new or relevant evidence\n— <strong>Higher-Level Review</strong> — senior VA rater re-examines your case\n— <strong>Board of Veterans' Appeals</strong> — formal appeal\n\nA VSO counselor can review your denial letter — for free.",
      chips: ['Find a VSO counselor', 'How do I file a claim?', 'See all benefits', 'Start over']
    },

    capabilities: {
      bot: "<strong>What I can help you with:</strong>\n\n💰 Disability compensation and ratings\n🏥 VA healthcare enrollment\n🎓 GI Bill and education benefits\n🏠 VA home loans\n⚖️ Claims, appeals, and denials\n👨‍👩‍👧 Benefits for family and survivors\n🌿 PACT Act and toxic exposure\n🧠 Mental health and MST\n💼 Vocational rehabilitation\n🏡 Housing assistance\n📋 Records and documentation\n\nAsk me anything or tap a topic to get started.",
      chips: ['See all benefits', 'How do I file a claim?', 'Find a VSO counselor']
    },

    crisis: {
      bot: "🚨 <strong>If you or someone is in crisis:</strong>\n\n<strong>Veterans Crisis Line</strong>\n📞 Dial <strong>988</strong>, Press <strong>1</strong>\n💬 Text <strong>838255</strong>\n🌐 veteranscrisisline.net\n\nConfidential support available 24/7 — free.\n\nYou are not alone. 🇺🇸",
      chips: ['Mental health services', 'Find a VSO counselor', 'Start over']
    },

    vso: {
      bot: null, // built dynamically in buildVSO()
      chips: ['How do I file a claim?', 'See all benefits', 'Start over']
    },

    feedback: {
      bot: "<strong>VetNavigator Support</strong>\n\nFor help with your chatbot, account, or billing:\n\n📧 <strong>support@vetnavigator.ai</strong>\n⏱ We respond within 24 hours\n\nPlease include your organization name and license key in your message.",
      chips: ['See all benefits', 'Start over']
    },

    // ── TIER 2 TOPICS ──────────────────────────────────────────────────────

    pact_act: {
      bot: "<strong>PACT Act (2022)</strong> — the biggest VA benefits expansion in decades.\n\n<strong>Covers:</strong> Burn pit exposure, Agent Orange, Gulf War illness\n<strong>Added:</strong> 20+ new presumptive conditions\n\nOver 5 million veterans may now qualify who were previously denied.",
      chips: ['Do I qualify?', 'How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    pact_qualify: {
      bot: "<strong>You may qualify for PACT Act benefits if you:</strong>\n\n— Served near burn pits in Iraq, Afghanistan, or the Gulf\n— Were exposed to Agent Orange\n— Have a Gulf War illness diagnosis\n— Have any of 20+ newly added presumptive conditions\n\nYou no longer have to prove your illness was caused by service — VA presumes it.",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    rating_explained: {
      bot: "<strong>How VA Disability Ratings Work</strong>\n\nThe VA assigns a rating from <strong>0% to 100%</strong> based on how much your condition affects daily life.\n\n<strong>Combined ratings</strong> use 'whole person' math — two 50% ratings don't equal 100%.\n\nList every condition — each one can add to your overall rating.",
      chips: ['How do I increase my rating?', 'What is TDIU?', 'How do I file a claim?', 'Find a VSO counselor']
    },

    rating_increase: {
      bot: "<strong>How to Increase Your VA Disability Rating</strong>\n\n<strong>Step 1</strong> — File a Supplemental Claim with new evidence\n<strong>Step 2</strong> — Request a Higher-Level Review\n<strong>Step 3</strong> — Document worsening symptoms with your doctor\n<strong>Step 4</strong> — Get a Nexus letter\n\nTimeline: 4–6 months average.",
      chips: ['What is a nexus letter?', 'What is TDIU?', 'Find a VSO counselor', 'See other benefits']
    },

    cp_exam: {
      bot: "<strong>The C&P Exam</strong>\n\nAfter filing a disability claim, VA schedules this exam. It <strong>heavily influences your rating</strong>.\n\n<strong>How to prepare:</strong>\n— Describe your <em>worst days</em>, not your average days\n— Don't minimize symptoms — be specific\n— Write down all symptoms before the exam",
      chips: ['How do I file a claim?', 'What documents do I need?', 'Find a VSO counselor']
    },

    bdd: {
      bot: "<strong>Benefits Delivery at Discharge (BDD)</strong>\n\nFile your VA disability claim <strong>90 to 180 days before separation</strong> and get your rating before you're out.\n\n<strong>Requirements:</strong>\n— Active duty with a known separation date\n— At least 90 days remaining\n— Available for VA exams before discharge",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See all benefits']
    },

    gi_bill_apply: {
      bot: "<strong>How to Apply for GI Bill</strong>\n\n<strong>Step 1</strong> — Apply at va.gov/education/apply-for-education-benefits\n<strong>Step 2</strong> — Get your Certificate of Eligibility (COE)\n<strong>Step 3</strong> — Provide COE to your school\n\nApply early — before your semester starts.",
      chips: ['Can I transfer to my family?', 'Find a VSO counselor', 'See other benefits']
    },

    gi_bill_transfer: {
      bot: "<strong>Transferring GI Bill to Dependents</strong>\n\nActive duty members can transfer unused GI Bill to a spouse or child.\n\n<strong>Requirements:</strong>\n— 6+ years of service\n— Agree to serve 4 more years\n— Must transfer while still on active duty",
      chips: ['How do I apply for GI Bill?', 'Find a VSO counselor', 'See other benefits']
    },

    voc_rehab: {
      bot: "<strong>Vocational Rehabilitation (Ch. 31)</strong>\n\nFor veterans with a <strong>10%+ disability rating</strong>.\n\n<strong>Includes:</strong> Tuition, books, monthly allowance, job coaching, and placement support.\n\nCan be used in addition to or instead of the GI Bill.",
      chips: ['How do I apply?', 'Find a VSO counselor', 'See other benefits']
    },

    voc_rehab_apply: {
      bot: "<strong>How to Apply for Voc Rehab</strong>\n\n<strong>Step 1</strong> — Apply at va.gov/careers-employment/vocational-rehabilitation\n<strong>Step 2</strong> — Schedule an intake appointment\n<strong>Step 3</strong> — Create a rehabilitation plan\n\nMust have a 10%+ disability rating and an employment barrier.",
      chips: ['Tell me about Voc Rehab', 'Find a VSO counselor', 'See other benefits']
    },

    dic: {
      bot: "<strong>Dependency & Indemnity Compensation (DIC)</strong>\n\nMonthly tax-free payment for surviving spouses of veterans who died from a service-connected condition.\n\n<strong>2024 base rate:</strong> ~$1,612/mo for surviving spouse",
      chips: ['How do I apply?', 'Tell me about CHAMPVA', 'Find a VSO counselor', 'See other benefits']
    },

    dic_apply: {
      bot: "<strong>How to Apply for DIC</strong>\n\n<strong>Step 1</strong> — Complete VA Form 21P-534EZ\n<strong>Step 2</strong> — Gather: DD-214, death certificate, marriage certificate, medical records\n<strong>Step 3</strong> — Submit at va.gov or through your VSO counselor",
      chips: ['Tell me about DIC', 'Find a VSO counselor', 'See other benefits']
    },

    champva: {
      bot: "<strong>CHAMPVA</strong>\n\nFree healthcare for qualifying dependents of veterans who are:\n— Permanently and totally disabled due to service\n— Died from a service-connected condition\n\n<strong>Covers:</strong> Doctor visits, prescriptions, hospital care, mental health.",
      chips: ['How do I apply?', 'Find a VSO counselor', 'See other benefits']
    },

    home_loan_apply: {
      bot: "<strong>How to Get a VA Home Loan</strong>\n\n<strong>Step 1</strong> — Get your Certificate of Eligibility at va.gov\n<strong>Step 2</strong> — Find a VA-approved lender\n<strong>Step 3</strong> — Get pre-approved, find your home, close\n\nNo down payment, no PMI.",
      chips: ['Tell me about VA Home Loan', 'Find a VSO counselor', 'See other benefits']
    },

    healthcare_enroll: {
      bot: "<strong>How to Enroll in VA Healthcare</strong>\n\n<strong>Step 1</strong> — Apply at va.gov/health-care/apply or call 1-877-222-8387\n<strong>Step 2</strong> — Provide DD-214, income, and insurance info\n<strong>Step 3</strong> — Schedule your first appointment\n\nMost veterans are eligible.",
      chips: ['Am I eligible?', 'Mental health services', 'Find a VSO counselor']
    },

    healthcare_eligibility: {
      bot: "<strong>VA Healthcare Eligibility</strong>\n\nYou likely qualify if you:\n— Served 24+ continuous months on active duty\n— Were discharged for a service-connected disability\n— Served in a combat zone after Nov 11, 1998\n— Receive VA disability compensation",
      chips: ['How do I enroll?', 'Find a VSO counselor', 'See other benefits']
    },

    // ── TIER 3 TOPICS ──────────────────────────────────────────────────────

    tdiu: {
      bot: "<strong>Total Disability Individual Unemployability (TDIU)</strong>\n\nIf your service-connected disabilities prevent you from working, you may receive compensation at the <strong>100% rate</strong> — even with a lower rating.\n\nTDIU pays ~$3,737/mo — same as 100% rating.",
      chips: ['How do I apply for TDIU?', 'How do I increase my rating?', 'Find a VSO counselor']
    },

    nexus: {
      bot: "<strong>Nexus Letters & Buddy Statements</strong>\n\n<strong>Nexus letter</strong> — A doctor's letter stating your condition is 'at least as likely as not' connected to service. Often the missing link in denied claims.\n\n<strong>Buddy statement</strong> — A written statement from someone who witnessed your condition. Counts as evidence.",
      chips: ['How do I increase my rating?', 'How do I file a claim?', 'Find a VSO counselor']
    },

    mental_health: {
      bot: "<strong>VA Mental Health Services</strong>\n\nAvailable to all enrolled veterans:\n— PTSD treatment and counseling\n— Depression and anxiety care\n— Substance use treatment\n— MST-related care\n— Vet Centers (community-based)\n\n<strong>Veterans Crisis Line: Dial 988, Press 1</strong>\n\nMental health care is available even without a disability rating.",
      chips: ['How do I enroll in VA healthcare?', 'Find a VSO counselor', 'See other benefits']
    },

    pension: {
      bot: "<strong>VA Pension</strong>\n\nIncome-based benefit for wartime veterans with limited income.\n\n<strong>2024 maximum annual rate:</strong> ~$14,753 (single veteran)\n\nAid & Attendance add-on available if you need help with daily activities.",
      chips: ['What is Aid & Attendance?', 'Find a VSO counselor', 'See other benefits']
    },

    aid_attendance: {
      bot: "<strong>Aid & Attendance</strong>\n\nAdditional pension payment for veterans who need help with daily activities — eating, bathing, dressing.\n\n<strong>Adds up to ~$2,714/mo</strong> on top of base pension.",
      chips: ['Tell me about VA Pension', 'Find a VSO counselor', 'See other benefits']
    },

    burial: {
      bot: "<strong>VA Burial & Memorial Benefits</strong>\n\n— Burial in a national cemetery (free)\n— Grave marker or headstone (free)\n— Presidential Memorial Certificate\n— Burial allowance up to $2,000 (service-connected death)",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    caregiver: {
      bot: "<strong>VA Caregiver Support Program (PCAFC)</strong>\n\nFor caregivers of seriously injured post-9/11 veterans:\n— Monthly stipend\n— Health insurance (if not otherwise covered)\n— Mental health counseling\n— Respite care (up to 30 days/year)",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    dental_vision: {
      bot: "<strong>VA Dental & Vision</strong>\n\n<strong>Dental:</strong> Available to veterans with 100% disability rating, POWs, and those with service-connected dental conditions.\n\n<strong>Vision:</strong> Covered under VA healthcare for service-connected eye conditions.",
      chips: ['How do I enroll in VA healthcare?', 'Find a VSO counselor', 'See other benefits']
    },

    claim_status: {
      bot: "<strong>Checking Your VA Claim Status</strong>\n\n<strong>Online:</strong> va.gov → 'Check your VA claim or appeal status'\n<strong>Phone:</strong> 1-800-827-1000\n\nAverage processing time: 3–6 months.",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    va_debt: {
      bot: "<strong>VA Debt Help</strong>\n\nIf you've received a VA overpayment notice:\n— <strong>Waiver</strong> — request forgiveness if repayment causes hardship\n— <strong>Compromise</strong> — offer reduced amount\n— <strong>Extended payment plan</strong>\n\nContact VA Debt Management Center: 1-800-827-0648",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    mst: {
      bot: "<strong>Military Sexual Trauma (MST) Benefits</strong>\n\nVeterans who experienced MST may receive free VA mental health treatment — regardless of discharge status or whether the MST was reported.\n\nYou do not need a disability rating to receive MST-related care.\n\n<strong>Veterans Crisis Line: Dial 988, Press 1</strong>",
      chips: ['Mental health services', 'Find a VSO counselor', 'See other benefits']
    },

    travel_pay: {
      bot: "<strong>VA Travel Pay</strong>\n\nReimbursement for travel to VA-approved medical care.\n\n<strong>Rate:</strong> ~$0.41/mile, minus deductible\n\nFile for reimbursement at the facility or online through AccessVA Travel Claim.",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    community_care: {
      bot: "<strong>VA Community Care</strong>\n\nAllows care from non-VA providers when:\n— VA cannot provide the care\n— VA wait time exceeds 20 days or 60 minutes drive\n— You live in a highly rural area",
      chips: ['How do I enroll in VA healthcare?', 'Find a VSO counselor', 'See other benefits']
    },

    life_insurance: {
      bot: "<strong>VA Life Insurance</strong>\n\n<strong>SGLI</strong> — Up to $500K (active duty)\n<strong>VGLI</strong> — Post-separation (apply within 1 year and 120 days of separation)\n<strong>S-DVI</strong> — Service-Disabled Veterans' Life Insurance\n\n<strong>Key:</strong> Don't miss the VGLI application window.",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    housing_help: {
      bot: "<strong>VA Housing Assistance for Homeless Veterans</strong>\n\n<strong>HUD-VASH</strong> — Housing vouchers + case management\n<strong>SSVF</strong> — Rapid rehousing\n<strong>GPD</strong> — Transitional housing\n\nIf a veteran you know is homeless:\n<strong>Call 1-877-4AID-VET (1-877-424-3838)</strong>",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    women_veterans: {
      bot: "<strong>Women Veterans Benefits</strong>\n\nAll VA benefits are available equally. Additionally:\n— Women's Health Program — gender-specific primary care\n— MST treatment — free, no service connection required\n— Maternity care\n\n<strong>Women Veterans Call Center: 1-855-VA-WOMEN</strong>",
      chips: ['Mental health services', 'Find a VSO counselor', 'See other benefits']
    },

    guard_reserve: {
      bot: "<strong>National Guard & Reserve Benefits</strong>\n\n<strong>Federally activated (Title 10):</strong> Full VA benefits\n<strong>State activated (Title 32):</strong> Limited — case by case\n\nKey threshold: 90+ days of active federal service generally qualifies for VA healthcare.",
      chips: ['Find a VSO counselor', 'See other benefits']
    },

    adapted_housing: {
      bot: "<strong>Adapted Housing Grants</strong>\n\n<strong>SAH Grant</strong> — up to $109,986 to build or modify a home\n<strong>SHA Grant</strong> — up to $22,036 for accessibility modifications\n<strong>TRA Grant</strong> — up to $46,496 for temporary adaptations\n\nExamples: wheelchair ramps, roll-in showers, stair lifts.",
      chips: ['VA Home Loan', 'Find a VSO counselor', 'See other benefits']
    },

    va_records: {
      bot: "<strong>Requesting VA & Military Records</strong>\n\n<strong>DD-214:</strong> archives.gov/veterans — free\n<strong>Military records:</strong> milConnect or National Archives\n<strong>VA medical records:</strong> va.gov/records or MyHealtheVet\n\nBlue Button on MyHealtheVet lets you download your complete VA health record.",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    }

  }; // end NODES

  // ── CHIP → NODE MAP ────────────────────────────────────────────────────────
  var CHIP_MAP = {
    'Veteran':'veteran', 'Active Duty':'active_duty', 'Spouse / Family':'spouse',
    'Surviving Spouse':'surviving_spouse', 'Post-9/11':'era', 'Gulf War':'era',
    'Vietnam Era':'era', 'Other Era':'era',
    'Yes — rated':'benefits_menu', 'No — not yet':'file_claim',
    'Was denied':'denied', 'Not sure':'capabilities',
    'Disability Pay':'disability', 'VA Disability Pay':'disability',
    'GI Bill':'gi_bill', 'VA Home Loan':'home_loan', 'Healthcare':'healthcare',
    'VA Healthcare':'healthcare',
    'See All Benefits →':'all_benefits', 'See all benefits':'all_benefits',
    'See other benefits':'all_benefits', 'Back to Categories':'all_benefits',
    '💰 Money & Pay':'cat_money', '🏥 Healthcare':'cat_healthcare',
    '🎓 Education & Jobs':'cat_education', '🏠 Housing':'cat_housing',
    '👨‍👩‍👧 Family & Survivors':'cat_family', '⚖️ Claims & Appeals':'cat_claims',
    'VA Pension':'pension', 'TDIU':'tdiu', 'Travel Pay':'travel_pay',
    'VA Debt Help':'va_debt', 'CHAMPVA':'champva', 'Mental Health':'mental_health',
    'Mental health services':'mental_health',
    'Community Care':'community_care', 'Dental & Vision':'dental_vision',
    'Caregiver Program':'caregiver', 'Voc Rehab':'voc_rehab',
    'BDD Program':'bdd', 'Adapted Housing':'adapted_housing',
    'Housing Assistance':'housing_help', 'DIC':'dic', 'Survivors Pension':'pension',
    'Aid & Attendance':'aid_attendance', 'Life Insurance':'life_insurance',
    'Burial Benefits':'burial', 'File a Claim':'file_claim',
    'Claim Status':'claim_status', 'Denied Claim':'denied',
    'Rating Increase':'rating_increase', 'C&P Exam':'cp_exam',
    'Nexus Letters':'nexus', 'VA Records':'va_records',
    'How do I file a claim?':'file_claim',
    'How do I increase my rating?':'rating_increase',
    'What is a C&P exam?':'cp_exam', 'What is a nexus letter?':'nexus',
    'What is TDIU?':'tdiu', 'What documents do I need?':'documents',
    'Am I eligible?':'healthcare_eligibility',
    'How do I enroll?':'healthcare_enroll',
    'How do I enroll in VA healthcare?':'healthcare_enroll',
    'How do I apply for GI Bill?':'gi_bill_apply',
    'Can I transfer to my family?':'gi_bill_transfer',
    'Other education benefits':'cat_education',
    'How do I apply?':'home_loan_apply',
    'How do I apply for TDIU?':'tdiu',
    'Do I qualify?':'pact_qualify',
    'Tell me about DIC':'dic', 'Tell me about CHAMPVA':'champva',
    'Tell me about VA Home Loan':'home_loan',
    'Tell me about Voc Rehab':'voc_rehab',
    'Tell me about VA Pension':'pension',
    'What is Aid & Attendance?':'aid_attendance',
    'How do I apply for BDD?':'bdd',
    'Find a VSO counselor':'vso',
    'What is BDD?':'bdd',
    'Start over':'welcome', 'Start Fresh →':'welcome',
    'Contact Support':'feedback', 'VetNavigator Support':'feedback'
  };

  // ── KEYWORD ROUTING ────────────────────────────────────────────────────────
  var KW = [
    [/\b(crisis|suicid|kill myself|end it all|hopeless)\b/i,           'crisis'],
    [/\b(champva|champ va)\b/i,                                         'champva'],
    [/\b(pact act|burn pit|agent orange|toxic exposure)\b/i,           'pact_act'],
    [/\b(tdiu|individual unemployability|unemployable)\b/i,            'tdiu'],
    [/\b(nexus letter|buddy statement)\b/i,                            'nexus'],
    [/\b(c&p exam|c and p exam|compensation.*pension exam)\b/i,        'cp_exam'],
    [/\b(voc rehab|vocational rehab|chapter 31)\b/i,                   'voc_rehab'],
    [/\b(\bdic\b|dependency.*indemnity)\b/i,                           'dic'],
    [/\b(bdd|benefits delivery at discharge)\b/i,                      'bdd'],
    [/\b(ptsd|mental health|counseling|vet center)\b/i,                'mental_health'],
    [/\b(mst|military sexual trauma)\b/i,                              'mst'],
    [/\b(travel pay|mileage.*va)\b/i,                                  'travel_pay'],
    [/\b(community care|outside.*va.*doctor)\b/i,                      'community_care'],
    [/\b(caregiver|pcafc)\b/i,                                         'caregiver'],
    [/\b(dental|vision.*va)\b/i,                                       'dental_vision'],
    [/\b(claim status|where.*my claim|check.*claim)\b/i,               'claim_status'],
    [/\b(va debt|overpayment|owe.*va)\b/i,                             'va_debt'],
    [/\b(aid.*attendance)\b/i,                                         'aid_attendance'],
    [/\b(pension|wartime.*pension)\b/i,                                'pension'],
    [/\b(burial|funeral.*va)\b/i,                                      'burial'],
    [/\b(life insurance|sgli|vgli)\b/i,                                'life_insurance'],
    [/\b(housing.*assist|homeless.*vet|hud.*vash)\b/i,                 'housing_help'],
    [/\b(women veteran|female veteran)\b/i,                            'women_veterans'],
    [/\b(national guard|reserve.*benefit)\b/i,                         'guard_reserve'],
    [/\b(adapted housing|wheelchair.*home|accessibility.*grant)\b/i,   'adapted_housing'],
    [/\b(military record|service record|dd.?214)\b/i,                  'va_records'],
    [/\b(disability|compensation|rating|file.*claim|how.*claim)\b/i,   'disability'],
    [/\b(gi bill|chapter 33|post.9.11 education|education benefit)\b/i,'gi_bill'],
    [/\b(home loan|va loan|mortgage|house.*va)\b/i,                    'home_loan'],
    [/\b(healthcare|health care|medical.*va|enroll.*va)\b/i,           'healthcare'],
    [/\b(document|dd214|paperwork|records needed)\b/i,                 'documents'],
    [/\b(denied|denial|appeal|rejected)\b/i,                           'denied'],
    [/\b(vso|counselor|service officer)\b/i,                           'vso'],
    [/\b(what can you|capabilities|what do you help)\b/i,              'capabilities'],
    [/\b(benefits|all benefits|see more)\b/i,                          'benefits_menu'],
    [/\b(increase.*rating|higher rating|improve.*rating)\b/i,          'rating_increase'],
    [/\b(how.*rating.*work|rating.*explain)\b/i,                       'rating_explained'],
    [/\b(feedback|contact.*support|vetnav.*support|issue.*chatbot)\b/i,'feedback']
  ];

  // ── i18n ───────────────────────────────────────────────────────────────────
  var I18N = {
    en: {
      ph: 'Type a question or tap an option…',
      online: 'Online · Free · 24/7',
      choose: 'Choose an option',
      warn: function (r) { return 'You have ' + r + ' question' + (r === 1 ? '' : 's') + ' remaining this session.'; },
      limitTitle: 'Session Complete',
      limitMsg: "You've covered a lot of ground. Your VSO counselor can help you continue — free.",
      limitTopics: 'Topics you explored:',
      sumPrompt: 'Want a summary sent to your email?',
      sumPH: 'your@email.com',
      sendSum: 'Send My Summary →',
      sumSent: '✓ Summary sent! Check your inbox.',
      contVSO: 'Continue with your VSO counselor:',
      startFresh: 'Start Fresh →',
      gated: 'This topic is available on Starter plans and above. Contact your VSO counselor for personalized help — free.',
      fallback: "Great question. For the most accurate guidance I'd recommend speaking with a free VSO counselor.",
      fallbackChips: ['Find a VSO counselor', 'See all benefits', 'Start over']
    },
    es: {
      ph: 'Escriba una pregunta o toque una opción…',
      online: 'En línea · Gratuito · 24/7',
      choose: 'Elija una opción',
      warn: function (r) { return 'Le quedan ' + r + ' pregunta' + (r === 1 ? '' : 's') + ' en esta sesión.'; },
      limitTitle: 'Sesión Completa',
      limitMsg: 'Ha cubierto mucho terreno. Su consejero VSO puede ayudarle a continuar — gratis.',
      limitTopics: 'Temas que exploró:',
      sumPrompt: '¿Desea recibir un resumen por correo?',
      sumPH: 'su@correo.com',
      sendSum: 'Enviar Mi Resumen →',
      sumSent: '✓ ¡Resumen enviado!',
      contVSO: 'Continúe con su consejero VSO:',
      startFresh: 'Comenzar de Nuevo →',
      gated: 'Este tema está disponible en planes Starter y superiores.',
      fallback: '¡Buena pregunta! Recomiendo hablar con un consejero VSO gratuito.',
      fallbackChips: ['Buscar consejero VSO', 'Ver todos los beneficios', 'Empezar de nuevo']
    },
    vi: {
      ph: 'Nhập câu hỏi hoặc chọn tùy chọn…',
      online: 'Trực tuyến · Miễn phí · 24/7',
      choose: 'Chọn một tùy chọn',
      warn: function (r) { return 'Bạn còn ' + r + ' câu hỏi trong phiên này.'; },
      limitTitle: 'Phiên Hoàn Thành',
      limitMsg: 'Bạn đã tìm hiểu được nhiều. Cố vấn VSO có thể giúp tiếp tục — miễn phí.',
      limitTopics: 'Chủ đề bạn đã khám phá:',
      sumPrompt: 'Bạn có muốn nhận tóm tắt qua email?',
      sumPH: 'email@cua-ban.com',
      sendSum: 'Gửi Tóm Tắt →',
      sumSent: '✓ Đã gửi tóm tắt!',
      contVSO: 'Tiếp tục với cố vấn VSO:',
      startFresh: 'Bắt Đầu Lại →',
      gated: 'Chủ đề này có sẵn trên các gói Starter trở lên.',
      fallback: 'Câu hỏi hay! Tôi khuyên nên nói chuyện với cố vấn VSO miễn phí.',
      fallbackChips: ['Tìm cố vấn VSO', 'Xem tất cả phúc lợi', 'Bắt đầu lại']
    },
    ko: {
      ph: '질문을 입력하거나 옵션을 탭하세요…',
      online: '온라인 · 무료 · 24/7',
      choose: '옵션 선택',
      warn: function (r) { return '이 세션에서 질문 ' + r + '개가 남았습니다.'; },
      limitTitle: '세션 완료',
      limitMsg: '많은 것을 알아보셨습니다. VSO 상담사가 무료로 도움을 드릴 수 있습니다.',
      limitTopics: '탐색한 주제:',
      sumPrompt: '이메일로 요약을 받으시겠습니까?',
      sumPH: '이메일@주소.com',
      sendSum: '요약 보내기 →',
      sumSent: '✓ 요약이 전송되었습니다!',
      contVSO: 'VSO 상담사와 계속하기:',
      startFresh: '처음으로 →',
      gated: '이 주제는 Starter 이상 플랜에서 이용 가능합니다.',
      fallback: '좋은 질문입니다! 무료 VSO 상담사와 상담하시기를 권장합니다.',
      fallbackChips: ['VSO 상담사 찾기', '모든 혜택 보기', '처음으로']
    },
    tl: {
      ph: 'Mag-type ng tanong o mag-tap ng opsyon…',
      online: 'Online · Libre · 24/7',
      choose: 'Pumili ng opsyon',
      warn: function (r) { return 'Mayroon kang ' + r + ' tanong na natitira.'; },
      limitTitle: 'Kumpleto ang Session',
      limitMsg: 'Marami kang natuklas. Ang iyong VSO counselor ay makakatulong nang libre.',
      limitTopics: 'Mga paksang iyong tiningnan:',
      sumPrompt: 'Gusto mo bang magpadala ng buod sa email?',
      sumPH: 'iyong@email.com',
      sendSum: 'Ipadala ang Buod →',
      sumSent: '✓ Naipadala na ang buod!',
      contVSO: 'Magpatuloy sa iyong VSO counselor:',
      startFresh: 'Magsimula Muli →',
      gated: 'Ang paksang ito ay available sa mga Starter plan at mas mataas.',
      fallback: 'Magandang tanong! Inirerekomenda ang pakikipag-usap sa libreng VSO counselor.',
      fallbackChips: ['Humanap ng VSO counselor', 'Tingnan ang lahat ng benepisyo', 'Magsimula muli']
    }
  };

  function s(key) {
    var d = I18N[lang] || I18N.en;
    return d[key] !== undefined ? d[key] : (I18N.en[key] || '');
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  var CSS = [
    ':root{--vr:#B22234;--vrd:#8b1a26;--vn:#0a1628;--vg:#e8c84a;',
    '--vbg:rgba(8,18,36,.97);--vbd:rgba(255,255,255,.1);',
    '--vt:rgba(255,255,255,.88);--vs:rgba(255,255,255,.45)}',

    // FAB button
    '#vnb{position:fixed;bottom:24px;right:24px;z-index:2147483640;',
    'width:58px;height:58px;border-radius:50%;background:var(--vr);border:none;',
    'cursor:pointer;box-shadow:0 6px 24px rgba(178,34,52,.5);',
    'display:flex;align-items:center;justify-content:center;',
    'transition:transform .2s,box-shadow .2s}',
    '#vnb:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(178,34,52,.65)}',
    '#vnb svg{width:26px;height:26px;fill:#fff;position:absolute;',
    'transition:opacity .2s,transform .2s}',
    '#vnb .vnc{opacity:1;transform:rotate(0)}',
    '#vnb .vnx{opacity:0;transform:rotate(-90deg)}',
    '#vnb.open .vnc{opacity:0;transform:rotate(90deg)}',
    '#vnb.open .vnx{opacity:1;transform:rotate(0)}',

    // Notification bubble
    '#vnn{position:fixed;bottom:92px;right:24px;z-index:2147483639;',
    'background:var(--vn);color:#fff;padding:10px 16px 10px 14px;',
    'border-radius:12px 12px 4px 12px;font-size:13px;font-weight:500;',
    'max-width:220px;line-height:1.4;box-shadow:0 4px 20px rgba(0,0,0,.35);',
    'display:flex;align-items:flex-start;gap:8px;cursor:pointer;',
    'font-family:"DM Sans",system-ui,sans-serif;',
    'animation:vnP .35s cubic-bezier(.34,1.56,.64,1) both}',
    '#vnn.hide{animation:vnF .25s ease forwards}',
    '#vnnx{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);',
    'width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:11px;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '@keyframes vnP{from{opacity:0;transform:scale(.8) translateY(10px)}',
    'to{opacity:1;transform:scale(1) translateY(0)}}',
    '@keyframes vnF{to{opacity:0;transform:translateY(8px)}}',

    // Panel
    '#vnp{position:fixed;bottom:94px;right:24px;z-index:2147483638;width:370px;',
    'background:var(--vbg);border:1px solid var(--vbd);border-radius:18px;',
    'overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.55);',
    'transform:scale(.92) translateY(16px);transform-origin:bottom right;',
    'opacity:0;pointer-events:none;',
    'transition:transform .25s cubic-bezier(.34,1.3,.64,1),opacity .2s;',
    'font-family:"DM Sans",system-ui,sans-serif}',
    '#vnp.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}',

    // Header
    '#vnh{background:linear-gradient(135deg,#9b1c2e,var(--vr));',
    'padding:12px 16px;display:flex;align-items:center;gap:10px}',
    '#vnhi{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);',
    'border:1px solid rgba(255,255,255,.2);display:flex;align-items:center;',
    'justify-content:center;font-size:15px;flex-shrink:0}',
    '#vnon{color:#fff;font-size:13px;font-weight:600;line-height:1.2}',
    '#vnst{color:rgba(255,255,255,.6);font-size:10.5px;margin-top:2px;',
    'display:flex;align-items:center;gap:4px}',
    '.vnd{width:5px;height:5px;border-radius:50%;background:#4ade80;display:inline-block}',

    // Progress bar
    '#vnpb{height:2px;background:rgba(255,255,255,.08)}',
    '#vnpr{height:100%;background:linear-gradient(90deg,var(--vr),var(--vg));',
    'transition:width .5s;width:0%}',

    // Language bar
    '#vnlb{display:flex;align-items:center;gap:4px;padding:6px 12px;',
    'background:rgba(0,0,0,.3);border-bottom:.5px solid var(--vbd);overflow-x:auto}',
    '#vnlb::-webkit-scrollbar{display:none}',
    '.vnlg{font-size:10px;padding:3px 8px;border-radius:10px;',
    'border:.5px solid rgba(255,255,255,.15);background:transparent;',
    'color:rgba(255,255,255,.5);cursor:pointer;white-space:nowrap;',
    'transition:all .15s;font-family:inherit}',
    '.vnlg:hover:not(.lk){background:rgba(255,255,255,.08);color:rgba(255,255,255,.85)}',
    '.vnlg.act{background:rgba(178,34,52,.45);border-color:rgba(178,34,52,.7);color:#fff}',
    '.vnlg.lk{opacity:.35;cursor:default}',

    // Tabs
    '#vntb{display:flex;background:rgba(0,0,0,.3);border-bottom:.5px solid var(--vbd)}',
    '.vntb{flex:1;padding:8px 4px;font-size:11.5px;font-weight:500;',
    'background:transparent;border:none;color:rgba(255,255,255,.4);cursor:pointer;',
    'border-bottom:2px solid transparent;transition:all .15s;font-family:inherit}',
    '.vntb:hover{color:rgba(255,255,255,.8)}',
    '.vntb.act{color:#fff;border-bottom-color:var(--vr)}',
    '.vntp{display:none}.vntp.act{display:block}',

    // Chat messages
    '#vnms{padding:12px 11px;height:300px;min-height:300px;max-height:300px;',
    'overflow-y:auto;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
    '#vnms::-webkit-scrollbar{width:2px}',
    '#vnms::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}',
    '.vnr{display:flex;gap:7px;align-items:flex-start}',
    '.vnav{width:24px;height:24px;border-radius:50%;flex-shrink:0;',
    'display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600}',
    '.vnav.b{background:var(--vr);color:#fff}',
    '.vnav.u{background:rgba(255,255,255,.12);color:rgba(255,255,255,.7)}',
    '.vnbb{padding:8px 11px;border-radius:12px;font-size:12.5px;',
    'line-height:1.6;max-width:88%}',
    '.vnbb.b{background:rgba(255,255,255,.07);color:var(--vt);',
    'border-bottom-left-radius:3px;border:.5px solid var(--vbd)}',
    '.vnbb.u{background:var(--vr);color:#fff;border-bottom-right-radius:3px;margin-left:auto}',
    '.vnbb strong{color:#ffd700;font-weight:600}',
    '.vnbb em{font-style:italic;color:rgba(255,255,255,.75)}',

    // Typing indicator
    '.vnty{display:flex;gap:4px;align-items:center;padding:8px 11px;',
    'background:rgba(255,255,255,.06);border:.5px solid var(--vbd);',
    'border-radius:12px;border-bottom-left-radius:3px}',
    '.vnty span{width:5px;height:5px;border-radius:50%;',
    'background:rgba(255,255,255,.35);animation:vnD 1.2s infinite}',
    '.vnty span:nth-child(2){animation-delay:.2s}',
    '.vnty span:nth-child(3){animation-delay:.4s}',
    '@keyframes vnD{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}',

    // Options area
    '#vnop{padding:8px 11px 10px;background:rgba(0,0,0,.25);',
    'border-top:.5px solid var(--vbd);height:160px;min-height:160px;max-height:160px;',
    'overflow-y:auto}',
    '#vnop::-webkit-scrollbar{width:2px}',
    '#vnop::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}',
    '#vnol{font-size:10px;color:rgba(255,255,255,.3);letter-spacing:1px;',
    'text-transform:uppercase;margin-bottom:7px;display:none}',
    '#vncd{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:6px}',
    '.vnca{background:rgba(255,255,255,.05);border:.5px solid rgba(255,255,255,.12);',
    'border-radius:9px;padding:8px 9px;cursor:pointer;transition:background .15s;text-align:left}',
    '.vnca:hover{background:rgba(178,34,52,.25);border-color:rgba(178,34,52,.5)}',
    '.vnci{font-size:16px;margin-bottom:3px}',
    '.vnct{font-size:11.5px;font-weight:600;color:#fff}',
    '.vncd{font-size:10px;color:var(--vs);margin-top:2px}',
    '#vnch{display:flex;flex-wrap:wrap;gap:4px}',
    '.vncp{font-size:11px;padding:4px 10px;border-radius:12px;',
    'background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);',
    'color:rgba(255,255,255,.75);cursor:pointer;transition:background .15s;font-family:inherit}',
    '.vncp:hover{background:rgba(178,34,52,.3);border-color:rgba(178,34,52,.5);color:#fff}',

    // Input row
    '#vnir{display:flex;gap:6px;padding:8px 11px;',
    'background:rgba(0,0,0,.3);border-top:.5px solid var(--vbd)}',
    '#vntx{flex:1;font-size:11.5px;padding:6px 10px;border-radius:18px;',
    'border:.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);',
    'color:rgba(255,255,255,.9);font-family:inherit;outline:none}',
    '#vntx::placeholder{color:rgba(255,255,255,.28)}',
    '#vntx:focus{border-color:rgba(178,34,52,.55)}',
    '#vnsd,#vnmc{width:30px;height:30px;border-radius:50%;border:none;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    'transition:background .15s}',
    '#vnsd{background:var(--vr)}#vnsd:hover{background:var(--vrd)}',
    '#vnsd svg{width:11px;height:11px;fill:#fff}',
    '#vnmc{background:rgba(255,255,255,.08);border:.5px solid rgba(255,255,255,.15)}',
    '#vnmc:hover{background:rgba(255,255,255,.15)}',
    '#vnmc svg{width:13px;height:13px;fill:rgba(255,255,255,.7)}',
    '#vnmc.on{background:rgba(178,34,52,.6);animation:vnM 1s infinite}',
    '#vnmc.on svg{fill:#fff}',
    '@keyframes vnM{0%,100%{box-shadow:0 0 0 0 rgba(178,34,52,.5)}',
    '50%{box-shadow:0 0 0 6px rgba(178,34,52,0)}}',

    // Session warning
    '#vnwn{display:none;padding:6px 12px;background:rgba(232,200,74,.1);',
    'border-top:.5px solid rgba(232,200,74,.2);font-size:11px;',
    'color:rgba(232,200,74,.9);text-align:center}',

    // Limit screen
    '#vnlm{display:none;padding:16px;overflow-y:auto;max-height:460px}',
    '#vnlm h3{font-size:15px;font-weight:700;color:#fff;margin-bottom:6px}',
    '#vnlm p{font-size:12px;color:var(--vs);margin-bottom:12px;line-height:1.5}',
    '#vnlm ul{list-style:none;margin-bottom:14px}',
    '#vnlm ul li{font-size:12px;color:var(--vt);padding:3px 0;',
    'border-bottom:.5px solid rgba(255,255,255,.06)}',
    '#vnlm ul li::before{content:"• ";color:var(--vg)}',
    '#vnser{display:flex;gap:6px;margin-bottom:10px}',
    '#vnsem{flex:1;font-size:12px;padding:7px 10px;border-radius:8px;',
    'border:.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);',
    'color:#fff;font-family:inherit;outline:none}',
    '#vnsem::placeholder{color:rgba(255,255,255,.3)}',
    '#vnseb{padding:7px 12px;border-radius:8px;background:var(--vr);border:none;',
    'color:#fff;font-size:11.5px;font-weight:600;cursor:pointer;',
    'white-space:nowrap;font-family:inherit}',
    '#vnset{display:none;font-size:12px;color:rgba(74,222,128,.9);',
    'margin-bottom:10px;text-align:center}',
    '.vnvb{background:rgba(255,255,255,.05);border:.5px solid var(--vbd);',
    'border-radius:9px;padding:10px 12px;margin-bottom:10px;',
    'font-size:12px;color:var(--vt);line-height:1.6}',
    '.vnvb strong{color:#fff;display:block;margin-bottom:4px}',
    '#vnrs{width:100%;padding:9px;border-radius:9px;',
    'border:.5px solid rgba(255,255,255,.2);background:transparent;',
    'color:rgba(255,255,255,.7);font-size:12px;font-weight:600;',
    'cursor:pointer;font-family:inherit}',
    '#vnrs:hover{background:rgba(255,255,255,.06)}',

    // Admin panel
    '#vnadp{padding:12px;overflow-y:auto;max-height:460px}',
    '#vnadp::-webkit-scrollbar{width:2px}',
    '#vnadp::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}',
    '.vnal{font-size:10px;color:rgba(255,255,255,.35);letter-spacing:1.5px;',
    'text-transform:uppercase;margin:10px 0 6px;display:block}',
    '.vnai{width:100%;background:rgba(255,255,255,.06);',
    'border:.5px solid rgba(255,255,255,.12);border-radius:7px;',
    'padding:6px 9px;font-size:12px;color:rgba(255,255,255,.9);',
    'font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:6px}',
    '.vnai:focus{border-color:rgba(178,34,52,.5)}',
    '.vnadr{display:flex;gap:5px;margin-bottom:5px}',
    '.vnadr .vnai{margin-bottom:0;flex:1}',
    '.vnarm{width:22px;height:22px;border-radius:50%;',
    'border:.5px solid rgba(255,255,255,.15);background:transparent;',
    'color:rgba(255,255,255,.3);cursor:pointer;font-size:14px;line-height:1;flex-shrink:0}',
    '.vnarm:hover{background:rgba(178,34,52,.3);color:#fff}',
    '.vnadd{font-size:11px;padding:4px 10px;border-radius:8px;',
    'border:.5px solid rgba(178,34,52,.4);background:rgba(178,34,52,.12);',
    'color:rgba(255,120,120,.9);cursor:pointer;font-family:inherit;margin-bottom:10px}',
    '#vnsv{width:100%;margin-top:10px;padding:10px;background:var(--vr);',
    'border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;',
    'cursor:pointer;font-family:inherit}',
    '#vnsv:hover{background:var(--vrd)}',
    '#vnsvd{display:none;text-align:center;font-size:12px;',
    'color:rgba(74,222,128,.9);padding:6px 0}',

    // Support tab
    '#vnsup{padding:14px}',

    // Footer
    '#vnft{text-align:center;padding:5px 0 6px;font-size:10px;color:rgba(255,255,255,.18)}',

    // Mobile
    '@media(max-width:420px){',
    '#vnp{width:calc(100vw - 24px);right:12px;bottom:80px}',
    '#vnb{right:12px;bottom:12px}',
    '#vnn{right:12px}}'
  ].join('');

  // ── BUILD HTML ─────────────────────────────────────────────────────────────
  function buildHTML() {
    var langs = ['en', 'es', 'vi', 'ko', 'tl'];
    var lbs = langs.map(function (c) {
      var lk  = (!HAS_ML && c !== 'en') ? ' lk' : '';
      var act = (c === 'en') ? ' act' : '';
      return '<button class="vnlg' + lk + act + '" data-lang="' + c + '">' + c.toUpperCase() + '</button>';
    }).join('');

    var tabs = '<div id="vntb">'
      + '<button class="vntb act" data-tab="chat">Benefits Chat</button>'
      + (HAS_ADMIN ? '<button class="vntb" data-tab="admin">Admin Panel</button>' : '')
      + '<button class="vntb" data-tab="sup">Support</button>'
      + '</div>';

    var adm = HAS_ADMIN
      ? '<div id="vnadp" class="vntp" data-panel="admin">'
        + '<span class="vnal">Organization Name</span><input class="vnai" id="an" type="text"/>'
        + '<span class="vnal">City</span><input class="vnai" id="ac" type="text"/>'
        + '<span class="vnal">Phone</span><input class="vnai" id="ap" type="text"/>'
        + '<span class="vnal">Email</span><input class="vnai" id="ae" type="email"/>'
        + '<span class="vnal">Office Hours</span><input class="vnai" id="ah" type="text"/>'
        + '<span class="vnal">Upcoming Events</span><div id="aev"></div>'
        + '<button class="vnadd" id="vnadde">+ Add Event</button>'
        + '<span class="vnal">Leadership & Counselors</span><div id="ald"></div>'
        + '<button class="vnadd" id="vnadda">+ Add Person</button>'
        + '<button id="vnsv">Save Changes</button>'
        + '<div id="vnsvd">✓ Saved!</div>'
        + '</div>'
      : '';

    var sup = '<div id="vnsup" class="vntp" data-panel="sup">'
      + '<div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:8px">VetNavigator Support</div>'
      + '<div style="font-size:12px;color:var(--vs);line-height:1.6;margin-bottom:12px">For help with your chatbot, account, or billing — contact our team directly.</div>'
      + '<div style="font-size:12px;color:var(--vt);margin-bottom:6px">📧 <a href="mailto:' + SUPPORT_EMAIL + '" style="color:var(--vg);text-decoration:none">' + SUPPORT_EMAIL + '</a></div>'
      + '<div style="font-size:12px;color:var(--vs)">⏱ Response within 24 hours</div>'
      + '<div style="font-size:11px;color:rgba(255,255,255,.25);margin-top:14px">License: ' + LICENSE_KEY.substring(0, 14) + '…</div>'
      + '</div>';

    var mic = HAS_MIC
      ? '<button id="vnmc" title="Voice input"><svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 3.57-3.38 6-5.91 6s-5.42-2.43-5.91-6H4c.49 4.12 3.73 7.38 7.75 7.9V21h.5v-2.1C16.27 18.38 19.51 15.12 20 11h-2.09z"/></svg></button>'
      : '';

    return '<style id="vns">' + CSS + '</style>'
      + '<button id="vnb" aria-label="Open VA Benefits Assistant">'
      + '<svg class="vnc" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>'
      + '<svg class="vnx" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      + '</button>'
      + '<div id="vnn" style="display:none"><span style="font-size:15px;flex-shrink:0">🎖️</span>'
      + '<span>Need help with VA benefits? I\'m here — 24/7, free.</span>'
      + '<button id="vnnx">✕</button></div>'
      + '<div id="vnp">'
      +   '<div id="vnh"><div id="vnhi">🎖️</div>'
      +   '<div style="flex:1"><div id="vnon">' + ORG_NAME + '</div>'
      +   '<div id="vnst"><span class="vnd"></span> <span id="vnstx">Online · Free · 24/7</span></div></div></div>'
      +   '<div id="vnpb"><div id="vnpr"></div></div>'
      +   '<div id="vnlb">' + lbs + '</div>'
      +   tabs
      +   '<div id="vnchat" class="vntp act" data-panel="chat">'
      +     '<div id="vnms"></div>'
      +     '<div id="vnwn"></div>'
      +     '<div id="vnlm">'
      +       '<h3>🎖️ <span id="vnlt"></span></h3>'
      +       '<p id="vnlmg"></p>'
      +       '<p id="vnltl" style="font-size:11px;color:var(--vg);font-weight:600;margin-bottom:4px"></p>'
      +       '<ul id="vnltp"></ul>'
      +       '<p id="vnsp" style="font-size:12px;color:var(--vs);margin-bottom:8px"></p>'
      +       '<div id="vnser"><input id="vnsem" type="email"/><button id="vnseb"></button></div>'
      +       '<div id="vnset"></div>'
      +       '<p id="vnvl" style="font-size:11px;color:var(--vg);font-weight:600;margin-bottom:6px"></p>'
      +       '<div class="vnvb" id="vnvb"></div>'
      +       '<button id="vnrs"></button>'
      +     '</div>'
      +     '<div id="vnop"><div id="vnol"></div><div id="vncd"></div><div id="vnch"></div></div>'
      +     '<div id="vnir">'
      +       '<input id="vntx" type="text" autocomplete="off"/>'
      +       mic
      +       '<button id="vnsd"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>'
      +     '</div>'
      +   '</div>'
      +   adm + sup
      +   '<div id="vnft">Powered by VetNavigator AI · Veteran-Made &amp; Veteran-Owned</div>'
      + '</div>';
  }

  // ── DOM HELPERS ────────────────────────────────────────────────────────────
  function ge(id) { return document.getElementById(id); }

  function botMsg(html) {
    var row = document.createElement('div'); row.className = 'vnr';
    var av  = document.createElement('div'); av.className  = 'vnav b'; av.textContent = '🎖';
    var bb  = document.createElement('div'); bb.className  = 'vnbb b';
    bb.innerHTML = html.replace(/\n/g, '<br>');
    row.appendChild(av); row.appendChild(bb);
    ge('vnms').appendChild(row);
    ge('vnms').scrollTop = row.offsetTop - ge('vnms').offsetTop;
    return bb.textContent || bb.innerText || '';
  }

  function userMsg(text) {
    var row = document.createElement('div'); row.className = 'vnr';
    row.style.justifyContent = 'flex-end';
    var bb = document.createElement('div'); bb.className = 'vnbb u'; bb.textContent = text;
    row.appendChild(bb);
    ge('vnms').appendChild(row);
    ge('vnms').scrollTop = ge('vnms').scrollHeight;
  }

  function showTyp() {
    var row = document.createElement('div'); row.className = 'vnr'; row.id = 'vntyp';
    var av  = document.createElement('div'); av.className  = 'vnav b'; av.textContent = '🎖';
    var ty  = document.createElement('div'); ty.className  = 'vnty';
    ty.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(av); row.appendChild(ty);
    ge('vnms').appendChild(row);
    ge('vnms').scrollTop = ge('vnms').scrollHeight;
  }

  function hideTyp() { var t = ge('vntyp'); if (t) t.remove(); }

  function clearOpts() {
    ge('vncd').innerHTML = '';
    ge('vnch').innerHTML = '';
    ge('vnol').style.display = 'none';
  }

  function mkCards(cards) {
    clearOpts();
    if (!cards || !cards.length) return;
    ge('vnol').style.display = 'block';
    ge('vnol').textContent = s('choose');
    cards.forEach(function (c) {
      var d = document.createElement('div'); d.className = 'vnca';
      d.innerHTML = '<div class="vnci">' + c.icon + '</div>'
        + '<div class="vnct">' + c.title + '</div>'
        + (c.desc ? '<div class="vncd">' + c.desc + '</div>' : '');
      d.addEventListener('click', function () { handle(c.title); });
      ge('vncd').appendChild(d);
    });
  }

  function mkChips(chips) {
    if (!chips || !chips.length) return;
    chips.forEach(function (ch) {
      var b = document.createElement('button'); b.className = 'vncp'; b.textContent = ch;
      b.addEventListener('click', function () { handle(ch); });
      ge('vnch').appendChild(b);
    });
  }

  function setProg(pct) { ge('vnpr').style.width = (pct || 0) + '%'; }

  // ── VSO NODE ───────────────────────────────────────────────────────────────
  function buildVSO() {
    var c = '';
    if (ORG_PHONE) c += '📞 ' + ORG_PHONE + '\n';
    if (ORG_EMAIL) c += '✉️ ' + ORG_EMAIL + '\n';
    if (ORG_ADDR)  c += '📍 ' + ORG_ADDR + (ORG_CITY ? ', ' + ORG_CITY : '') + '\n';
    if (ORG_HOURS) c += '🕐 ' + ORG_HOURS;
    var ev = ORG_EVENTS.length
      ? '\n\n<strong>Upcoming Events:</strong>\n' + ORG_EVENTS.map(function (e) { return '• ' + e; }).join('\n')
      : '';
    var ld = ORG_LEADERS.length
      ? '\n\n<strong>Your Counselors:</strong>\n' + ORG_LEADERS.map(function (l) { return '• ' + l; }).join('\n')
      : '';
    NODES.vso.bot = 'Your VSO counselors are here to help — free of charge.\n\n<strong>'
      + ORG_NAME + '</strong>\n'
      + (c || 'Contact your local VSO office.') + ev + ld
      + '\n\n100% free. Walk-ins welcome. 🇺🇸';
  }

  // ── RENDER NODE ────────────────────────────────────────────────────────────
  function renderNode(key) {
    var node = NODES[key]; if (!node) return;
    if (node.bot) {
      var plain = botMsg(node.bot);
      chatHistory.push({ topic: key, text: plain.substring(0, 120) });
    }
    clearOpts();
    if (node.cards && node.cards.length) {
      mkCards(node.cards);
      if (node.chips && node.chips.length) mkChips(node.chips);
    } else if (node.chips && node.chips.length) {
      mkChips(node.chips);
    }
    if (node.pct !== undefined) setProg(node.pct);
  }

  function renderGated() {
    botMsg(s('gated'));
    clearOpts();
    mkChips(['Find a VSO counselor', 'See all benefits']);
  }

  // ── TOPIC LABEL ────────────────────────────────────────────────────────────
  function topicLabel(k) {
    var m = {
      disability:'VA Disability Pay', gi_bill:'GI Bill', home_loan:'VA Home Loan',
      healthcare:'VA Healthcare', file_claim:'Filing a Claim', documents:'Required Documents',
      denied:'Denied Claims', vso:'VSO Counselors', pact_act:'PACT Act', tdiu:'TDIU',
      nexus:'Nexus Letters', mental_health:'Mental Health', pension:'VA Pension',
      voc_rehab:'Vocational Rehab', rating_increase:'Rating Increase', cp_exam:'C&P Exam',
      dic:'DIC Benefits', champva:'CHAMPVA', burial:'Burial Benefits',
      caregiver:'Caregiver Program', claim_status:'Claim Status', va_records:'VA Records',
      mst:'Military Sexual Trauma', travel_pay:'Travel Pay', community_care:'Community Care',
      life_insurance:'Life Insurance', housing_help:'Housing Assistance',
      women_veterans:'Women Veterans', guard_reserve:'Guard & Reserve',
      adapted_housing:'Adapted Housing', va_debt:'VA Debt Help',
      aid_attendance:'Aid & Attendance'
    };
    return m[k] || k.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // ── SESSION WARNING ────────────────────────────────────────────────────────
  function checkWarn() {
    var rem = CONV_LIMIT - turnCount;
    if (rem === CONV_LIMIT - WARN_AT || (rem <= 2 && rem > 0)) {
      ge('vnwn').style.display = 'block';
      ge('vnwn').textContent = s('warn')(rem);
    }
  }

  // ── LIMIT SCREEN ───────────────────────────────────────────────────────────
  function showLimit() {
    ge('vnms').style.display = 'none';
    ge('vnwn').style.display = 'none';
    ge('vnop').style.display = 'none';
    ge('vnir').style.display  = 'none';
    ge('vnlm').style.display  = 'block';
    ge('vnlt').textContent    = s('limitTitle');
    ge('vnlmg').textContent   = s('limitMsg');
    ge('vnltl').textContent   = s('limitTopics');
    ge('vnsp').textContent    = s('sumPrompt');
    ge('vnseb').textContent   = s('sendSum');
    ge('vnsem').placeholder   = s('sumPH');
    ge('vnset').textContent   = s('sumSent');
    ge('vnvl').textContent    = s('contVSO');
    ge('vnrs').textContent    = s('startFresh');

    // Topics list
    var ul = ge('vnltp'); ul.innerHTML = '';
    var seen = {};
    chatHistory.forEach(function (h) {
      if (!seen[h.topic] && h.topic !== 'welcome') {
        seen[h.topic] = true;
        var li = document.createElement('li');
        li.textContent = topicLabel(h.topic);
        ul.appendChild(li);
      }
    });

    // VSO contact box
    var vb = '<strong>' + ORG_NAME + '</strong>';
    if (ORG_PHONE) vb += ORG_PHONE + '<br>';
    if (ORG_EMAIL) vb += ORG_EMAIL + '<br>';
    if (ORG_HOURS) vb += ORG_HOURS;
    ge('vnvb').innerHTML = vb;
  }

  // ── SEND SUMMARY EMAIL ─────────────────────────────────────────────────────
  function sendSummary(email) {
    if (!BREVO_KEY) return;
    var topics = [];
    var seen   = {};
    chatHistory.forEach(function (h) {
      if (!seen[h.topic] && h.topic !== 'welcome') {
        seen[h.topic] = true;
        topics.push(topicLabel(h.topic));
      }
    });

    var html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
      + '<div style="background:#0a1628;padding:24px 28px;border-radius:12px 12px 0 0;text-align:center">'
      + '<div style="font-size:24px;margin-bottom:8px">🎖️</div>'
      + '<h2 style="color:#fff;margin:0;font-size:20px">Your VA Benefits Session Summary</h2>'
      + '<p style="color:rgba(255,255,255,.6);margin:6px 0 0;font-size:13px">From your session with ' + ORG_NAME + '</p>'
      + '</div>'
      + '<div style="padding:24px 28px;background:#f9f7f3">'
      + '<h3 style="color:#0a1628;font-size:15px;margin-bottom:12px">Topics You Explored</h3>'
      + '<ul style="padding-left:18px">'
      + topics.map(function (l) { return '<li style="font-size:13px;color:#374151;margin-bottom:6px">' + l + '</li>'; }).join('')
      + '</ul>'
      + '<div style="background:#fff;border-radius:10px;padding:16px;margin-top:16px;border:1px solid #e5e7eb">'
      + '<strong style="color:#0a1628;font-size:13px">Your VSO Counselor</strong>'
      + '<p style="font-size:13px;color:#374151;margin:8px 0 0;line-height:1.6">'
      + ORG_NAME + (ORG_PHONE ? ' · ' + ORG_PHONE : '') + (ORG_HOURS ? '<br>' + ORG_HOURS : '')
      + '</p></div>'
      + '<p style="font-size:12px;color:#9ca3af;margin-top:16px;text-align:center">'
      + 'Powered by VetNavigator AI · <a href="https://vetnavigator.ai" style="color:#B22234">vetnavigator.ai</a>'
      + '</p></div></div>';

    var payload = {
      sender:      { name: 'VetNavigator AI', email: SUPPORT_EMAIL },
      htmlContent: html
    };

    // Send to veteran
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify(Object.assign({}, payload, {
        to: [{ email: email }],
        subject: '🎖️ Your VA Benefits Session Summary — ' + ORG_NAME
      }))
    });

    // CC to support
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify(Object.assign({}, payload, {
        to: [{ email: SUPPORT_EMAIL }],
        subject: '📋 Session Summary CC — ' + ORG_NAME + ' · ' + email
      }))
    });
  }

  // ── TIER GATE FREE TEXT ────────────────────────────────────────────────────
  function gatedFreeText(text) {
    if (IS_DEMO) return false;
    var l2 = /pact act|burn pit|agent orange|voc rehab|vocational|chapter 31|\bdic\b|champva|\bbdd\b|benefits delivery|rating.*explain|increase.*rating|c&p exam|cp exam|apply.*gi bill|gi bill.*apply|transfer.*gi bill|apply.*va loan|enroll.*va health|eligible.*va health/i;
    var l3 = /\btdiu\b|total disability|unemploy|nexus letter|buddy statement|ptsd|mental health|\bmst\b|military sexual|va pension|wartime pension|aid.*attendance|burial|caregiver|va dental|claim status|va debt|overpayment|travel pay|community care|sgli|vgli|life insurance.*vet|housing.*assist|homeless.*vet|women veteran|national guard|reserve.*benefit|adapted housing|military record|dd.?214/i;
    if (l2.test(text) && TIER_LVL < 2) return true;
    if (l3.test(text) && TIER_LVL < 3) return true;
    return false;
  }

  // ── ROUTE TEXT ─────────────────────────────────────────────────────────────
  function route(text) {
    var t = text.trim();
    if (CHIP_MAP[t]) return CHIP_MAP[t];
    for (var i = 0; i < KW.length; i++) {
      if (KW[i][0].test(t)) return KW[i][1];
    }
    return null;
  }

  // ── AI CALL ────────────────────────────────────────────────────────────────
  function callAI(msg) {
    showTyp();
    fetch(VN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:     'You are a warm, knowledgeable VA benefits assistant for ' + ORG_NAME
          + '. Help veterans understand their VA benefits clearly and compassionately.'
          + ' Keep responses to 4–6 sentences. End with "Suggested next:" and one short follow-up question.',
        messages: [{ role: 'user', content: msg }]
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      hideTyp();
      var txt  = ((d.content || [])[0] || {}).text || s('fallback');
      var pts  = txt.split(/Suggested next:/i);
      var ans  = pts[0].trim();
      var sug  = pts[1] ? pts[1].trim().replace(/^["']|["']$/g, '') : null;
      botMsg(ans);
      chatHistory.push({ topic: 'ai', text: ans.substring(0, 120) });
      clearOpts();
      var chips = s('fallbackChips').slice();
      if (sug) chips.unshift(sug);
      mkChips(chips);
    })
    .catch(function () {
      hideTyp();
      botMsg(s('fallback'));
      clearOpts();
      mkChips(s('fallbackChips'));
    });
  }

  // ── MAIN HANDLE ────────────────────────────────────────────────────────────
  function handle(text) {
    if (turnCount >= CONV_LIMIT) { showLimit(); return; }
    var key = route(text);
    userMsg(text);
    turnCount++;
    checkWarn();
    if (turnCount >= CONV_LIMIT) { setTimeout(showLimit, 600); return; }
    if (!key) {
      if (gatedFreeText(text)) { setTimeout(renderGated, 400); return; }
      callAI(text);
      return;
    }
    if (!canAccess(key)) { setTimeout(renderGated, 400); return; }
    setTimeout(function () { renderNode(key); }, 400);
  }

  // ── SEND TEXT ──────────────────────────────────────────────────────────────
  function send() {
    var tx = ge('vntx');
    var v  = tx.value.trim();
    if (!v) return;
    tx.value = '';
    handle(v);
  }

  // ── MICROPHONE ─────────────────────────────────────────────────────────────
  var rec = null;
  function initMic() {
    if (!HAS_MIC) return;
    var m  = ge('vnmc'); if (!m) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { m.style.display = 'none'; return; }
    rec = new SR();
    rec.continuous     = false;
    rec.interimResults = false;
    rec.onresult = function (e) {
      ge('vntx').value = e.results[0][0].transcript;
      m.classList.remove('on');
    };
    rec.onend = function () { m.classList.remove('on'); };
    m.addEventListener('click', function () {
      if (m.classList.contains('on')) {
        rec.stop(); m.classList.remove('on');
      } else {
        var langMap = { es:'es-ES', vi:'vi-VN', ko:'ko-KR', tl:'tl-PH' };
        rec.lang = langMap[lang] || 'en-US';
        rec.start(); m.classList.add('on');
      }
    });
  }

  // ── LANGUAGE ───────────────────────────────────────────────────────────────
  function setLang(code) {
    if (!HAS_ML && code !== 'en') return; // silently ignore locked languages
    lang = code;
    ge('vntx').placeholder = s('ph');
    ge('vnstx').textContent = s('online');
    document.querySelectorAll('.vnlg').forEach(function (b) {
      b.classList.toggle('act', b.getAttribute('data-lang') === code);
    });
  }

  // ── TABS ───────────────────────────────────────────────────────────────────
  function setTab(name) {
    document.querySelectorAll('.vntb').forEach(function (t) {
      t.classList.toggle('act', t.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('.vntp').forEach(function (p) {
      p.classList.toggle('act', p.getAttribute('data-panel') === name);
    });
  }

  // ── PANEL ──────────────────────────────────────────────────────────────────
  function openPanel() {
    panelOpen = true;
    ge('vnb').classList.add('open');
    ge('vnp').classList.add('open');
    hideNotif();
    if (!chatStarted) {
      chatStarted = true;
      buildVSO();
      setTimeout(function () { renderNode('welcome'); }, 180);
    }
  }

  function closePanel() {
    panelOpen = false;
    ge('vnb').classList.remove('open');
    ge('vnp').classList.remove('open');
  }

  // ── NOTIFICATION ───────────────────────────────────────────────────────────
  function showNotif() {
    var n = ge('vnn'); if (n) n.style.display = 'flex';
  }
  function hideNotif() {
    var n = ge('vnn'); if (!n) return;
    n.classList.add('hide');
    setTimeout(function () { n.style.display = 'none'; n.classList.remove('hide'); }, 300);
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  function vnAE() {
    var r = document.createElement('div'); r.className = 'vnadr';
    r.innerHTML = '<input class="vnai" type="text" placeholder="e.g. Monthly Meeting — 1st Tuesday 7pm"/>'
      + '<button class="vnarm" onclick="this.parentNode.remove()">×</button>';
    ge('aev').appendChild(r);
  }
  function vnAL() {
    var r = document.createElement('div'); r.className = 'vnadr';
    r.innerHTML = '<input class="vnai" type="text" placeholder="e.g. Commander John Smith"/>'
      + '<button class="vnarm" onclick="this.parentNode.remove()">×</button>';
    ge('ald').appendChild(r);
  }
  function vnSave() {
    ORG_NAME   = ge('an').value.trim() || ORG_NAME;
    ORG_CITY   = ge('ac').value.trim() || ORG_CITY;
    ORG_PHONE  = ge('ap').value.trim() || ORG_PHONE;
    ORG_EMAIL  = ge('ae').value.trim() || ORG_EMAIL;
    ORG_HOURS  = ge('ah').value.trim() || ORG_HOURS;
    ORG_EVENTS  = Array.from(ge('aev').querySelectorAll('input')).map(function (i) { return i.value.trim(); }).filter(Boolean);
    ORG_LEADERS = Array.from(ge('ald').querySelectorAll('input')).map(function (i) { return i.value.trim(); }).filter(Boolean);
    ge('vnon').textContent = ORG_NAME;
    buildVSO();
    ge('vnsvd').style.display = 'block';
    setTimeout(function () { ge('vnsvd').style.display = 'none'; }, 2500);
  }

  function populateAdmin() {
    if (!HAS_ADMIN) return;
    ge('an').value = ORG_NAME;
    ge('ac').value = ORG_CITY;
    ge('ap').value = ORG_PHONE;
    ge('ae').value = ORG_EMAIL;
    ge('ah').value = ORG_HOURS;
    ORG_EVENTS.forEach(function (e) {
      var r = document.createElement('div'); r.className = 'vnadr';
      r.innerHTML = '<input class="vnai" type="text" value="' + e.replace(/"/g, '&quot;') + '"/>'
        + '<button class="vnarm" onclick="this.parentNode.remove()">×</button>';
      ge('aev').appendChild(r);
    });
    ORG_LEADERS.forEach(function (l) {
      var r = document.createElement('div'); r.className = 'vnadr';
      r.innerHTML = '<input class="vnai" type="text" value="' + l.replace(/"/g, '&quot;') + '"/>'
        + '<button class="vnarm" onclick="this.parentNode.remove()">×</button>';
      ge('ald').appendChild(r);
    });
  }

  // ── RESTART ────────────────────────────────────────────────────────────────
  function restart() {
    turnCount   = 0;
    chatHistory = [];
    ge('vnlm').style.display  = 'none';
    ge('vnms').style.display  = 'flex';
    ge('vnop').style.display  = 'block';
    ge('vnir').style.display  = 'flex';
    ge('vnwn').style.display  = 'none';
    ge('vnms').innerHTML      = '';
    ge('vnser').style.display = 'flex';
    ge('vnset').style.display = 'none';
    ge('vnsem').value         = '';
    renderNode('welcome');
  }

  // ── INIT ───────────────────────────────────────────────────────────────────
  function init() {
    // Build and inject widget HTML
    var root = document.createElement('div');
    root.id  = 'vn-root';
    root.innerHTML = buildHTML();
    document.body.appendChild(root);

    // Set initial text
    ge('vntx').placeholder  = s('ph');
    ge('vnstx').textContent = s('online');
    ge('vnon').textContent  = ORG_NAME;

    // FAB + panel toggle
    ge('vnb').addEventListener('click', function () {
      panelOpen ? closePanel() : openPanel();
    });

    // Notification bubble
    ge('vnn').addEventListener('click', function (e) {
      if (e.target.id === 'vnnx') { hideNotif(); return; }
      openPanel();
    });
    ge('vnnx').addEventListener('click', function (e) {
      e.stopPropagation(); hideNotif();
    });

    // Tabs
    document.querySelectorAll('.vntb').forEach(function (t) {
      t.addEventListener('click', function () { setTab(this.getAttribute('data-tab')); });
    });

    // Language buttons
    document.querySelectorAll('.vnlg').forEach(function (b) {
      b.addEventListener('click', function () { setLang(this.getAttribute('data-lang')); });
    });

    // Send
    ge('vnsd').addEventListener('click', send);
    ge('vntx').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

    // Email summary
    ge('vnseb').addEventListener('click', function () {
      var em = ge('vnsem').value.trim();
      if (!em || !em.includes('@')) return;
      sendSummary(em);
      ge('vnser').style.display = 'none';
      ge('vnset').style.display = 'block';
    });

    // Restart
    ge('vnrs').addEventListener('click', restart);

    // Admin buttons (event listeners instead of inline onclick)
    if (HAS_ADMIN) {
      ge('vnadde').addEventListener('click', vnAE);
      ge('vnadda').addEventListener('click', vnAL);
      ge('vnsv').addEventListener('click', vnSave);
      populateAdmin();
    }

    // Microphone
    initMic();

    // Notif bubble after 4s
    setTimeout(showNotif, 4000);
  }

  // ── BOOT ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
