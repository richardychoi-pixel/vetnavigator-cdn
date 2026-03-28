/*!
 * VetNavigator AI — Embeddable Chatbot Widget v4.1
 * CDN: https://cdn.vetnavigator.ai/chatbot/v1/widget.js
 * © 2026 VetNavigator AI · Veteran-Made & Veteran-Owned
 *
 * INSTALL — paste before </body> on any website:
 *
 *   ONE-LINE INSTALL (recommended — config loaded from server):
 *   <script src="https://cdn.vetnavigator.ai/chatbot/v1/widget.js?key=VN-BASIC-XXXXX-XXXXX" defer></script>
 *
 *   MANUAL CONFIG (alternative — config inline):
 *   <script>
 *     window.VetNavigatorConfig = {
 *       licenseKey:  "VN-BASIC-XXXXX-XXXXX",
 *       orgName:     "VFW Post 1234",
 *       orgCity:     "Springfield, IL",
 *       orgPhone:    "(555) 123-4567",
 *       orgEmail:    "post1234@vfw.org"
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

  // ── CONFIG VARIABLES (populated by loadConfig) ────────────────────────────
  var LICENSE_KEY, ORG_NAME, ORG_CITY, ORG_ADDR, ORG_PHONE, ORG_EMAIL;
  var ORG_WEB, ORG_HOURS, ORG_MISSION, ORG_EVENTS, ORG_LEADERS;
  var TIER_MAP = { DEMO: 4, PREMIUM: 4, STANDARD: 3, STARTER: 2, BASIC: 1 };
  var TIER_STR, TIER_LVL, IS_DEMO, HAS_ML, HAS_MIC, HAS_ADMIN;
  var CONV_LIMIT, WARN_AT;

  // ── APPLY CONFIG (shared by both inline and fetched paths) ────────────────
  function applyConfig(cfg) {
    LICENSE_KEY = ((cfg.licenseKey || 'VN-DEMO') + '').toUpperCase().trim();
    ORG_NAME    = cfg.orgName    || 'Your VSO';
    ORG_CITY    = cfg.orgCity    || '';
    ORG_ADDR    = cfg.orgAddress || '';
    ORG_PHONE   = cfg.orgPhone   || '';
    ORG_EMAIL   = cfg.orgEmail   || '';
    ORG_WEB     = cfg.orgWeb     || '';
    ORG_HOURS   = cfg.orgHours   || '';
    ORG_MISSION = cfg.orgMission || '';
    ORG_EVENTS  = Array.isArray(cfg.events)  ? cfg.events  : [];
    ORG_LEADERS = Array.isArray(cfg.leaders) ? cfg.leaders : [];

    var _parts = LICENSE_KEY.split('-');
    TIER_STR   = _parts.length >= 2 ? _parts[1] : 'BASIC';
    TIER_LVL   = TIER_MAP[TIER_STR] !== undefined ? TIER_MAP[TIER_STR] : 1;
    IS_DEMO    = TIER_STR === 'DEMO';
    HAS_ML     = TIER_LVL >= 3 || IS_DEMO;
    HAS_MIC    = TIER_LVL >= 3 || IS_DEMO;
    HAS_ADMIN  = TIER_LVL >= 2 || IS_DEMO;
    CONV_LIMIT = (IS_DEMO || TIER_LVL >= 3) ? 999 : (TIER_LVL >= 2 ? 20 : 10);
    WARN_AT    = Math.ceil(CONV_LIMIT * 0.8);
  }

  // ── DETECT KEY FROM SCRIPT TAG URL ────────────────────────────────────────
  function getKeyFromScript() {
    var scripts = document.querySelectorAll('script[src*="widget.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      var match = src.match(/[?&]key=([^&]+)/i);
      if (match) return match[1].toUpperCase().trim();
    }
    return null;
  }

  // ── LOAD CONFIG (async fetch from Worker, or inline fallback) ─────────────
  function loadConfig(callback) {
    var inlineCfg = window.VetNavigatorConfig || {};
    var scriptKey = getKeyFromScript();

    // If inline config has org data, use it immediately (backward compatible)
    if (inlineCfg.orgName && inlineCfg.orgName !== 'Your VSO') {
      applyConfig(inlineCfg);
      callback();
      return;
    }

    // Determine the key to look up
    var key = scriptKey || ((inlineCfg.licenseKey || '') + '').toUpperCase().trim();
    if (!key || !key.startsWith('VN-') || key === 'VN-DEMO') {
      // No key or demo mode — use inline config or defaults
      applyConfig(inlineCfg);
      callback();
      return;
    }

    // Fetch config from Worker
    fetch(VN_API + '/config?key=' + encodeURIComponent(key))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.orgName) {
          // Server config found — use it (but keep license key from URL if provided)
          data.licenseKey = data.licenseKey || key;
          applyConfig(data);
        } else {
          // Server returned empty or error — fall back to inline
          if (!inlineCfg.licenseKey) inlineCfg.licenseKey = key;
          applyConfig(inlineCfg);
        }
        callback();
      })
      .catch(function () {
        // Network error — fall back to inline config
        if (!inlineCfg.licenseKey) inlineCfg.licenseKey = key;
        applyConfig(inlineCfg);
        callback();
      });
  }

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
    surviving_spouse:1, all_benefits:1, feedback:1, empathy_intro:1,
    cat_money:1, cat_healthcare:1, cat_education:1,
    cat_housing:1, cat_family:1, cat_claims:1, org_events:1,
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
    adapted_housing:3, va_records:3,
    // Tier 4 — Premium
    gi_bill_types:4
  };

  function canAccess(key) {
    var req = TOPIC_TIERS[key];
    if (req === undefined || IS_DEMO) return true;
    return TIER_LVL >= req;
  }

  // ── CONVERSATION NODES ─────────────────────────────────────────────────────
  var NODES = {

    welcome: {
      pct: 5,
      bot: null, // built dynamically in buildWelcome()
      cards: [
        { icon: '🎖️', title: 'Veteran',          desc: 'I served in the US military' },
        { icon: '⚔️', title: 'Active Duty',       desc: 'Currently serving' },
        { icon: '💛', title: 'Spouse / Family',   desc: 'Family member of a veteran' },
        { icon: '🕊️', title: 'Surviving Spouse', desc: 'Lost a veteran spouse' }
      ]
    },

    veteran: {
      pct: 18,
      bot: "Thank you for your service. 🇺🇸\n\nWhen did you serve?",
      cards: [
        { icon: '🏜️', title: 'Post-9/11',   desc: '2001 to present' },
        { icon: '🌊', title: 'Gulf War',     desc: '1990–2001' },
        { icon: '🌿', title: 'Vietnam Era', desc: '1964–1975' },
        { icon: '🔵', title: 'Other Era',   desc: 'Korean, Cold War, etc.' }
      ]
    },

    active_duty: {
      pct: 32,
      bot: "Thank you for your service and dedication. 🇺🇸 We honor your commitment to this nation.\n\n<strong>Preparing to separate or transition?</strong>\n\nHere are the key benefits to act on <em>before</em> you leave:\n\n— <strong>TAP Program</strong> — <a href='https://tapevents.mil' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>mandatory transition assistance, job prep</a>\n— <strong>Disability rating</strong> — file BEFORE you separate (<a href='https://va.gov/disability/how-to-file-claim/when-to-file/pre-discharge-claim' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>BDD program</a>)\n— <strong>GI Bill</strong> — education benefit active the day you separate\n— <strong>VA Healthcare</strong> — enroll within 5 years for free care\n— <strong>VA Home Loan</strong> — available immediately after separation\n\nFiling a disability claim before separation can save months of waiting.",
      chips: ['Tell me about the BDD program', 'GI Bill', 'VA Home Loan', 'Find a VSO counselor']
    },

    spouse: {
      pct: 48,
      bot: "Thank you for your support and sacrifice. The strength behind every service member is their family. 🤍\n\n<strong>Benefits available to veteran spouses and dependents:</strong>\n\n— <strong>CHAMPVA</strong> — free VA healthcare for qualifying dependents\n— <strong>DEA (Ch. 35)</strong> — education benefits for dependents\n— <strong>Survivors Pension</strong> — income support for low-income surviving spouses\n— <strong>DIC</strong> — monthly payment if veteran died from service-connected cause\n— <strong>Home Loan</strong> — surviving spouses may be eligible\n\nEligibility depends on the veteran's service and discharge status.",
      chips: ['Tell me about DIC', 'Tell me about CHAMPVA', 'Find a VSO counselor', 'See other benefits']
    },

    surviving_spouse: {
      pct: 48,
      bot: "We are deeply sorry for your loss. 🙏\n\nAs a surviving spouse, you may be eligible for:\n\n— <strong>DIC</strong> — monthly tax-free payment\n— <strong>Survivors Pension</strong> — income-based support\n— <strong>CHAMPVA</strong> — healthcare coverage\n— <strong>VA Home Loan</strong> — may be available\n— <strong>Burial benefits</strong> — reimbursement and honors\n\nA VSO counselor can review your situation at no cost.",
      chips: ['Tell me about DIC', 'Tell me about CHAMPVA', 'Find a VSO counselor', 'See all benefits']
    },

    era: {
      pct: 32,
      bot: "Do you currently have a VA disability rating?",
      cards: [
        { icon: '✅', title: 'Yes — rated',  desc: 'I have a rating %' },
        { icon: '📝', title: 'No — not yet', desc: 'Never filed a claim' },
        { icon: '❌', title: 'Was denied',   desc: 'My claim was denied' },
        { icon: '❓', title: 'Not sure',     desc: 'I need to check' }
      ]
    },

    // ── BENEFITS MENU ──────────────────────────────────────────────────────

    benefits_menu: {
      pct: 48,
      bot: "Here are the top benefits to explore. Which interests you most?",
      cards: [
        { icon: '💰', title: 'Disability Pay', desc: 'Tax-free monthly pay' },
        { icon: '🎓', title: 'GI Bill',         desc: 'Education funding' },
        { icon: '🏠', title: 'VA Home Loan',    desc: 'No down payment' },
        { icon: '☢️', title: 'PACT Act',        desc: 'Toxic exposure' },
        { icon: '🏥', title: 'Healthcare',      desc: 'VA medical care' },
        { icon: '👔', title: 'Voc Rehab',       desc: 'Job training' }
      ]
    },

    all_benefits: {
      pct: 48,
      bot: "Choose a category to explore:",
      chips: ['💰 Money & Pay', '🏥 Healthcare', '🎓 Education & Jobs', '🏠 Housing', '👨‍👩‍👧 Family & Survivors', '⚖️ Claims & Appeals']
    },

    cat_money: {
      pct: 48,
      bot: "Money & Pay benefits:",
      chips: ['VA Disability Pay', 'VA Pension', 'TDIU', 'Travel Pay', 'VA Debt Help', 'Back to Categories']
    },

    cat_healthcare: {
      pct: 48,
      bot: "Healthcare benefits:",
      chips: ['VA Healthcare', 'CHAMPVA', 'Mental Health', 'Community Care', 'Dental & Vision', 'Caregiver Program', 'Back to Categories']
    },

    cat_education: {
      pct: 48,
      bot: "Education & Jobs benefits:",
      chips: ['GI Bill', 'Voc Rehab', 'BDD Program', 'Back to Categories']
    },

    cat_housing: {
      pct: 48,
      bot: "Housing benefits:",
      chips: ['VA Home Loan', 'Adapted Housing', 'Housing Assistance', 'Back to Categories']
    },

    cat_family: {
      pct: 48,
      bot: "Family & Survivors benefits:",
      chips: ['DIC', 'CHAMPVA', 'Survivors Pension', 'Aid & Attendance', 'Life Insurance', 'Burial Benefits', 'Back to Categories']
    },

    cat_claims: {
      pct: 48,
      bot: "Claims & Appeals:",
      chips: ['File a Claim', 'Claim Status', 'Denied Claim', 'Rating Increase', 'C&P Exam', 'TDIU', 'Nexus Letters', 'VA Records', 'Back to Categories']
    },

    // ── TIER 1 TOPICS ──────────────────────────────────────────────────────

    disability: {
      pct: 62,
      bot: "<strong>VA Disability Compensation</strong> — tax-free monthly pay for service-connected conditions.\n\n<strong>Avg payment:</strong> $1,500–$3,800/month\n<strong>Ratings:</strong> 10%–100%\n\nA 30% rating = ~$500/month tax-free for life.\n\n<em style='font-size:11px;color:rgba(255,255,255,0.4);'>Amounts are approximate and updated annually. Verify current rates at <a href='https://va.gov/disability/compensation-rates' target='_blank' rel='noopener noreferrer' style='color:rgba(232,200,74,0.6);'>VA.gov</a>.</em>",
      chips: ['How do I file a claim?', 'What documents do I need?', 'Find a VSO counselor', 'See other benefits']
    },

    gi_bill: {
      pct: 62,
      bot: "<strong>Post-9/11 GI Bill</strong> covers:\n\n<strong>Tuition:</strong> Full at public universities\n<strong>Housing:</strong> ~$1,800–$2,400/month stipend\n<strong>Books:</strong> Up to $1,000/year\n<strong>Duration:</strong> Up to 36 months",
      chips: ['How do I apply?', 'Find a VSO counselor', 'See other benefits']
    },

    home_loan: {
      pct: 62,
      bot: "<strong>VA Home Loan</strong>:\n\n<strong>No down payment required</strong>\n<strong>No PMI (mortgage insurance)</strong>\n<strong>Competitive interest rates</strong>\n<strong>Reusable for life</strong>",
      chips: ['Am I eligible?', 'Find a VSO counselor', 'See other benefits']
    },

    healthcare: {
      pct: 62,
      bot: "<strong>VA Healthcare</strong>:\n\n<strong>Covered:</strong> Primary care, mental health, prescriptions\n<strong>Cost:</strong> Free for many veterans\n\nEnroll at <a href='https://VA.gov' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov</a> or call <a href='tel:+118772228387' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>1-877-222-8387</a>.",
      chips: ['How do I enroll?', 'Find a VSO counselor', 'See other benefits']
    },

    file_claim: {
      pct: 76,
      bot: "<strong>How to file a VA disability claim:</strong>\n\n<strong>Step 1</strong> — Create account at <a href='https://va.gov' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov</a>\n<strong>Step 2</strong> — Complete <a href='https://va.gov/find-forms/about-form-21-526ez' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA Form 21-526EZ</a>\n<strong>Step 3</strong> — Gather DD-214 and medical records\n<strong>Step 4</strong> — Submit online, by mail, or in person\n\n<strong>📬 By mail:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 In person:</strong> <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>Find your nearest VA office →</a>",
      chips: ['What documents do I need?', 'Find a VSO counselor', 'See other benefits', 'Start over']
    },

    documents: {
      pct: 82,
      bot: "<strong>Documents needed:</strong>\n\n— DD-214 (discharge papers)\n— Medical records\n— Social Security number\n— Buddy statements (recommended)\n— Nexus letter from doctor (recommended)\n\nMissing DD-214? Request free at <a href='https://archives.gov/veterans' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>archives.gov/veterans</a>",
      chips: ['Find a VSO counselor', 'See other benefits', 'Start over']
    },

    denied: {
      pct: 76,
      bot: "<strong>A denied claim is not the end.</strong>\n\nMost first-time VA claims are denied — but over 70% of appeals are won with the right help.\n\n<strong>Your options:</strong>\n— Supplemental Claim (new evidence)\n— Board of Veterans Appeals\n— Free VSO rep to fight on your behalf\n\nDon't give up. A VSO counselor can review your denial letter and advise you for free.",
      chips: ['Find a VSO counselor', 'How do I file a claim?', 'See other benefits', 'Start over']
    },

    capabilities: {
      pct: 5,
      bot: "<strong>What I can help you with:</strong>\n\n💰 Disability compensation and ratings\n🏥 VA healthcare enrollment\n🎓 GI Bill and education benefits\n🏠 VA home loans\n⚖️ Claims, appeals, and denials\n👨‍👩‍👧 Benefits for family and survivors\n🌿 PACT Act and toxic exposure\n🧠 Mental health and MST\n💼 Vocational rehabilitation\n🏡 Housing assistance\n📋 Records and documentation\n\nAsk me anything or tap a topic to get started.",
      chips: ['See all benefits', 'How do I file a claim?', 'Find a VSO counselor']
    },

    crisis: {
      pct: 100,
      bot: "<strong>🆘 If you are in crisis right now:</strong>\n\n<strong>Veterans Crisis Line</strong>\n— Dial <strong>988</strong>, then press <strong>1</strong>\n— Text <strong>838255</strong>\n— Chat: <a href='https://veteranscrisisline.net' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VeteransCrisisLine.net</a>\n— Available 24/7 — confidential — staffed by veterans\n\n<strong>Emergency:</strong> Call 911 or go to your nearest emergency room\n\n<strong>VA same-day mental health services:</strong>\nWalk in to any VA medical center — same-day care is available for mental health crises, no appointment needed.\n\n<strong>Vet Centers:</strong> Community-based, less formal, veteran-run counseling centers. Find yours at <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>va.gov/find-locations</a>\n\nYou are not alone. Help is always available. 🇺🇸",
      chips: ['Mental health benefits', 'Find a VSO counselor', 'Start over']
    },

    vso: {
      pct: 92,
      bot: null, // built dynamically in buildVSO()
      chips: ['How do I file a claim?', 'See all benefits', 'Start over']
    },

    feedback: {
      pct: 5,
      bot: "<strong>VetNavigator Support</strong>\n\nFor help with your chatbot, account, or billing:\n\n📧 <strong>support@vetnavigator.ai</strong>\n⏱ We respond within 24 hours\n\nPlease include your organization name and license key in your message.",
      chips: ['See all benefits', 'Start over']
    },

    // ── TIER 2 TOPICS ──────────────────────────────────────────────────────

    pact_act: {
      pct: 62,
      bot: "<strong>PACT Act (2022)</strong> — the biggest VA benefits expansion in decades.\n\n<strong>Covers:</strong> Burn pit exposure, Agent Orange, Gulf War illness\n<strong>Added:</strong> 20+ new presumptive conditions\n\nOver 5 million veterans may now qualify.",
      chips: ['Do I qualify?', 'Find a VSO counselor', 'See other benefits']
    },

    pact_qualify: {
      pct: 76,
      bot: "<strong>You may qualify for PACT Act benefits if you:</strong>\n\n— Served near burn pits in Iraq, Afghanistan, or the Gulf\n— Were exposed to Agent Orange (Vietnam, Thailand, Korea DMZ)\n— Have a Gulf War illness diagnosis\n— Have any of 20+ newly added presumptive conditions\n\n<strong>Key change:</strong> You no longer have to prove your illness was caused by service — VA presumes it.\n\nEven if you were previously denied, you can reapply under PACT Act.",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    rating_explained: {
      pct: 55,
      bot: "<strong>How VA disability ratings work:</strong>\n\nThe VA assigns a rating from <strong>0% to 100%</strong> based on how much your service-connected condition affects your daily life.\n\n<strong>What each level means (approx. monthly pay, veteran only):</strong>\n— 10% → ~$175/mo\n— 30% → ~$524/mo\n— 50% → ~$1,075/mo\n— 70% → ~$1,663/mo\n— 100% → ~$3,737/mo\n\n<strong>Combined ratings</strong> use \"whole person\" math — two 50% ratings don't equal 100%.\n\n<strong>Tip:</strong> A VSO counselor can review your records and identify conditions you may have missed.\n\n<em style='font-size:11px;color:rgba(255,255,255,0.4);'>Rates approximate and updated annually. Verify at <a href='https://va.gov/disability/compensation-rates' target='_blank' rel='noopener noreferrer' style='color:rgba(232,200,74,0.6);'>VA.gov</a>.</em>",
      chips: ['How do I file a claim?', 'How do I increase my rating?', 'What is TDIU?', 'Find a VSO counselor']
    },

    rating_increase: {
      pct: 60,
      bot: "<strong>How to increase your VA disability rating:</strong>\n\n<strong>Step 1</strong> — File a Supplemental Claim with new evidence\n<strong>Step 2</strong> — Request a Higher-Level Review (a senior VA rater re-examines your case)\n<strong>Step 3</strong> — Document worsening symptoms with your doctor\n<strong>Step 4</strong> — Get a Nexus letter linking your condition to service\n\n<strong>Key:</strong> \"New and relevant evidence\" is required for a Supplemental Claim. A buddy statement from someone who witnessed your condition can count.\n\n<strong>Timeline:</strong> 4–6 months average. A VSO counselor can build the strongest case.",
      chips: ['What is a nexus letter?', 'What is TDIU?', 'Find a VSO counselor', 'See other benefits']
    },

    cp_exam: {
      pct: 58,
      bot: "<strong>The C&P Exam (Compensation & Pension):</strong>\n\nAfter you file a disability claim, the VA schedules a C&P exam to evaluate your condition. This exam <strong>heavily influences your rating</strong>.\n\n<strong>How to prepare:</strong>\n— Describe your <em>worst days</em>, not your average days\n— Bring your medical records and service records\n— Don't minimize symptoms — be specific and honest\n— Write down all symptoms before the exam\n\n<strong>After the exam:</strong> The examiner submits a DBQ (Disability Benefits Questionnaire). You can request a copy.\n\n<strong>Tip:</strong> A VSO counselor can attend the exam or help you prepare.",
      chips: ['How do I file a claim?', 'What documents do I need?', 'Find a VSO counselor']
    },

    bdd: {
      pct: 48,
      bot: "<strong>Benefits Delivery at Discharge (BDD):</strong>\n\nFile your VA disability claim 90–180 days BEFORE your separation date — and your rating may be ready the day you leave.\n\n<strong>How it works:</strong>\n— File at <a href='https://va.gov/disability/how-to-file-claim' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov/disability/how-to-file-claim</a>\n— Complete your C&P exam while still on base\n— Rating decision arrives within 30 days of separation\n\n<strong>Why it matters:</strong> Without BDD, average wait is 3–5 months after separation. With BDD, benefits start immediately.",
      chips: ['What documents do I need?', 'Find a VSO counselor', 'See other benefits']
    },

    gi_bill_apply: {
      pct: 76,
      bot: "<strong>How to apply for the Post-9/11 GI Bill:</strong>\n\n<strong>Step 1</strong> — Apply at <a href='https://va.gov/education/apply' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov/education/apply</a>\n<strong>Step 2</strong> — Select Chapter 33 (Post-9/11 GI Bill)\n<strong>Step 3</strong> — Provide your DD-214 and school info\n<strong>Step 4</strong> — VA notifies your school directly\n\n<strong>Timeline:</strong> 4–8 weeks for approval\n<strong>Transferable</strong> to spouse or children if still serving",
      chips: ['What documents do I need?', 'Can I transfer my GI Bill?', 'Find a VSO counselor', 'See other benefits']
    },

    gi_bill_transfer: {
      pct: 82,
      bot: "<strong>Transferring GI Bill benefits:</strong>\n\n— Must be on active duty or Selected Reserve\n— Commit to 4 more years of service\n— Transfer at <a href='https://milconnect.dmdc.osd.mil' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>milConnect.deps.mil</a>\n— Spouse can use immediately; dependents at age 18–26\n\nAlready separated? Benefits cannot be transferred after leaving service.",
      chips: ['Find a VSO counselor', 'See other benefits', 'Start over']
    },

    voc_rehab: {
      pct: 62,
      bot: "<strong>Vocational Rehabilitation (Ch. 31)</strong>:\n\nCovers career counseling, education, job placement, and tools for veterans with a 10%+ disability rating.",
      chips: ['How do I apply?', 'Find a VSO counselor', 'See other benefits']
    },

    voc_rehab_apply: {
      pct: 76,
      bot: "<strong>How to apply for Vocational Rehabilitation (Ch. 31):</strong>\n\n<strong>Step 1</strong> — Apply at <a href='https://va.gov/careers-employment/vocational-rehabilitation' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov/careers-employment/vocational-rehabilitation</a>\n<strong>Step 2</strong> — Meet with a Vocational Rehabilitation Counselor\n<strong>Step 3</strong> — Create a rehabilitation plan together\n\n<strong>You may qualify if you have:</strong>\n— A VA disability rating of 10%+\n— An employment barrier related to your disability\n\n<strong>Covers:</strong> Tuition, books, supplies, job placement support, and more.",
      chips: ['What documents do I need?', 'Find a VSO counselor', 'See other benefits']
    },

    dic: {
      pct: 62,
      bot: "We are deeply grateful for your family\u2019s service and sacrifice. We are here to support you every step of the way. 🇺🇸\n\n<strong>Dependency and Indemnity Compensation (DIC):</strong>\n\nMonthly tax-free payment to surviving spouses and dependents when a veteran dies from a service-connected condition.\n\n<strong>2024 base rate:</strong> $1,612/month\n<strong>Additional amounts</strong> for dependent children, housebound status, and A&A need\n\n<strong>Who qualifies:</strong>\n— Surviving spouse married to veteran for 1+ year\n— Veteran died from service-connected disease or injury\n— Or veteran was 100% P&T rated for 10+ years before death\n\n<em style='font-size:11px;color:rgba(255,255,255,0.4);'>Amounts approximate and updated annually. Verify at <a href='https://va.gov/disability/compensation-rates' target='_blank' rel='noopener noreferrer' style='color:rgba(232,200,74,0.6);'>VA.gov</a>.</em>",
      chips: ['How do I apply for DIC?', 'Find a VSO counselor', 'See other benefits']
    },

    dic_apply: {
      pct: 76,
      bot: "<strong>How to apply for DIC:</strong>\n\n<strong>Step 1</strong> — Complete <a href='https://va.gov/find-forms/about-form-21P-534EZ' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA Form 21P-534EZ</a>\n<strong>Step 2</strong> — Attach veteran's death certificate\n<strong>Step 3</strong> — Include marriage certificate\n<strong>Step 4</strong> — Submit to your VA Pension Management Center\n\n<strong>📬 Mail DIC forms to:</strong>\nDepartment of Veterans Affairs\nPension Intake Center\nPO Box 5365, Janesville, WI 53547-5365\n\n<strong>🏥 In person:</strong> <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>Find your nearest VA office →</a>\n\n<strong>Tip:</strong> A VSO counselor can prepare and submit this paperwork for free — highly recommended given the complexity.",
      chips: ['Find a VSO counselor', 'See other benefits', 'Start over']
    },

    champva: {
      pct: 62,
      bot: "<strong>CHAMPVA — VA Healthcare for Dependents:</strong>\n\nFree healthcare coverage for spouses and children of veterans who are:\n— 100% permanently and totally (P&T) disabled, OR\n— Died from a service-connected condition\n\n<strong>Covers:</strong> Doctor visits, hospital care, prescriptions, mental health\n<strong>Cost:</strong> No premium. Small copays only.\n\nApply with <a href='https://va.gov/find-forms/about-form-10-10d' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA Form 10-10d</a> at <a href='https://va.gov/health-care/family-caregiver-benefits/champva' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov</a>",
      chips: ['Find a VSO counselor', 'See other benefits', 'Start over']
    },

    home_loan_apply: {
      pct: 76,
      bot: "<strong>How to get a VA Home Loan:</strong>\n\n<strong>Step 1</strong> — Get your Certificate of Eligibility (COE) at <a href='https://va.gov/housing-assistance/home-loans/how-to-apply' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov</a>\n<strong>Step 2</strong> — Choose a VA-approved lender\n<strong>Step 3</strong> — Find a home and make an offer\n<strong>Step 4</strong> — VA appraisal + loan closing\n\n<strong>Who qualifies:</strong> 90+ days active duty, or 6 years National Guard/Reserve\n<strong>Tip:</strong> No down payment, no PMI — saves thousands upfront.",
      chips: ['What documents do I need?', 'Find a VSO counselor', 'See other benefits']
    },

    healthcare_enroll: {
      pct: 76,
      bot: "<strong>How to enroll in VA Healthcare:</strong>\n\n<strong>Option 1</strong> — Online: <a href='https://va.gov/health-care/apply' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>VA.gov/health-care/apply</a>\n<strong>Option 2</strong> — Call: <a href='tel:+118772228387' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>1-877-222-8387</a> (Mon–Fri 8am–8pm ET)\n<strong>Option 3</strong> — In person at any VA medical center: <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>Find locations →</a>\n\n<strong>What you need:</strong> DD-214, Social Security number, insurance info (if any)\n\n<strong>Cost:</strong> Free for combat veterans (first 5 years). Most others pay little to nothing.",
      chips: ['Am I eligible for VA Healthcare?', 'Find a VSO counselor', 'See other benefits']
    },

    healthcare_eligibility: {
      pct: 82,
      bot: "<strong>VA Healthcare eligibility:</strong>\n\nYou likely qualify if you:\n— Served 24+ continuous months on active duty\n— Were discharged for a service-connected disability\n— Served in a combat zone after Nov 11, 1998\n\n<strong>Priority groups:</strong> Veterans with higher disability ratings get seen first and pay less.\n\nNot sure? A VSO counselor can check your eligibility in minutes.",
      chips: ['How do I enroll?', 'Find a VSO counselor', 'See other benefits']
    },

    // ── TIER 3 TOPICS ──────────────────────────────────────────────────────

    tdiu: {
      pct: 62,
      bot: "<strong>TDIU — Total Disability Based on Individual Unemployability:</strong>\n\nIf your service-connected disabilities prevent you from working, you may receive <strong>100% disability pay even with a lower rating</strong>.\n\n<strong>General requirements:</strong>\n— One condition rated 60%+ OR\n— Multiple conditions totaling 70%+ (with one at 40%+)\n— Unable to maintain substantially gainful employment\n\n<strong>Pay:</strong> Same as 100% rating (~$3,737/mo)\n\n<strong>Apply with:</strong> VA Form 21-8940 (available at <a href='https://va.gov/find-forms' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>va.gov/find-forms</a>)\n\n<strong>Tip:</strong> Many veterans qualify but don't know about TDIU. A VSO counselor can assess your eligibility.\n\n<em style='font-size:11px;color:rgba(255,255,255,0.4);'>Amounts approximate — verify current rates at <a href='https://va.gov/disability/compensation-rates' target='_blank' rel='noopener noreferrer' style='color:rgba(232,200,74,0.6);'>VA.gov</a>.</em>",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    nexus: {
      pct: 58,
      bot: "<strong>Nexus Letters & Buddy Statements:</strong>\n\n<strong>Nexus letter</strong> — A letter from a doctor stating your condition is \"at least as likely as not\" connected to your military service. This is often the missing link in a denied or low-rated claim.\n\n<strong>Buddy statement (VA Form 21-10210)</strong> — A written statement from someone who witnessed your condition, injury, or in-service event. Can be a fellow veteran, family member, or supervisor.\n\n<strong>Both are powerful evidence</strong> for new claims, appeals, and rating increases.\n\n<strong>Tip:</strong> A VSO counselor can help you identify which doctors to approach and how to frame the request.",
      chips: ['How do I increase my rating?', 'How do I file a claim?', 'Find a VSO counselor']
    },

    mental_health: {
      pct: 52,
      bot: "<strong>VA Mental Health Benefits:</strong>\n\n<strong>Covered services:</strong>\n— PTSD treatment (therapy + medication)\n— Depression, anxiety, MST counseling\n— Substance use treatment\n— Suicide prevention programs\n— Vet Centers (community-based, less formal than VA hospitals)\n\n<strong>Who qualifies:</strong> Any veteran who served on active duty — even without a disability rating.\n\n<strong>How to access:</strong>\n— Call the VA Mental Health helpline: <a href='tel:+18002738255' style='color:var(--gold);text-decoration:underline;'>1-800-273-8255</a> (Press 1)\n— Walk in to any VA medical center — no appointment needed for mental health crisis\n— Find a Vet Center at <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;'>va.gov/find-locations</a>\n\n<strong>Veterans Crisis Line:</strong> Dial 988, then Press 1",
      chips: ['Do I qualify for VA Healthcare?', 'Find a VSO counselor', 'See other benefits']
    },

    pension: {
      pct: 50,
      bot: "<strong>VA Pension — for low-income wartime veterans:</strong>\n\nA needs-based benefit for veterans with limited income and assets who served during a wartime period.\n\n<strong>Basic requirements:</strong>\n— 90+ days active duty (at least 1 day during wartime)\n— Income and assets below VA limits\n— Age 65+ OR permanently disabled\n\n<strong>Maximum annual pension rates (approx.):</strong>\n— Single veteran: ~$16,551/yr\n— With spouse: ~$21,674/yr\n— Aid & Attendance: up to ~$27,609/yr\n\n<strong>Aid & Attendance</strong> adds money if you need help with daily activities (bathing, dressing, meals).\n\n<strong>Apply with:</strong> VA Form 21P-527EZ",
      chips: ['What is Aid & Attendance?', 'Find a VSO counselor', 'See other benefits']
    },

    aid_attendance: {
      pct: 55,
      bot: "<strong>Aid & Attendance (A&A):</strong>\n\nAn enhanced pension benefit for veterans (or surviving spouses) who need help with daily activities.\n\n<strong>You may qualify if you:</strong>\n— Need help bathing, dressing, eating, or using the bathroom\n— Are bedridden or in a nursing home\n— Have severe vision loss\n\n<strong>Additional monthly benefit:</strong>\n— Veteran alone: +~$912/mo above basic pension\n— With spouse: +~$1,176/mo\n— Surviving spouse: +~$589/mo\n\n<strong>Important:</strong> This benefit is significantly underused. Many elderly veterans in care facilities qualify but have never applied.\n\n<strong>Tip:</strong> A VSO counselor can help — this is a complex application.",
      chips: ['What is VA Pension?', 'Find a VSO counselor', 'See other benefits']
    },

    burial: {
      pct: 60,
      bot: "<strong>VA Burial & Memorial Benefits:</strong>\n\nAll honorably discharged veterans are entitled to:\n\n<strong>National Cemetery burial</strong> — Free gravesite, opening/closing, perpetual care, and headstone or marker at any VA national cemetery with space available.\n\n<strong>Burial allowance</strong> — Up to $1,002 for funeral/burial costs (for deaths on or after Oct. 1, 2025). Surviving family or estate can apply.\n\n<strong>Burial flag</strong> — A U.S. flag to drape the casket or accompany the urn — free.\n\n<strong>Presidential Memorial Certificate</strong> — Signed certificate honoring the veteran's service — free.\n\n<strong>Headstones & markers</strong> — Available for private cemetery burials too, at no cost.\n\n<strong>Pre-need eligibility:</strong> Veterans can apply in advance to confirm eligibility for national cemetery burial before it's needed.\n\n<strong>Apply with:</strong> VA Form 21P-530EZ (burial allowance) · 1-800-535-1117 (National Cemetery Scheduling)",
      chips: ['Find a VSO counselor', 'Surviving spouse benefits', 'See other benefits']
    },

    caregiver: {
      pct: 55,
      bot: "<strong>VA Caregiver Support — PCAFC:</strong>\n\nThe <strong>Program of Comprehensive Assistance for Family Caregivers (PCAFC)</strong> supports family members caring for eligible post-9/11 veterans.\n\n<strong>Benefits include:</strong>\n— <strong>Monthly stipend</strong> (based on veteran's care needs and local wages)\n— <strong>Health insurance</strong> through CHAMPVA (if caregiver has no other coverage)\n— <strong>Mental health counseling</strong> and support services\n— <strong>Respite care</strong> — paid temporary relief for the caregiver\n— <strong>Caregiver training</strong> and education\n\n<strong>Who qualifies:</strong>\n— Caring for a veteran who served on or after 9/11/2001\n— Veteran has a serious injury requiring personal care services\n— Caregiver is a family member (spouse, parent, child, etc.) or close friend\n\n<strong>Apply:</strong> VA Form 10-10CG at va.gov/family-member-benefits/comprehensive-assistance-for-family-caregivers/\n\n<strong>Support line:</strong> <a href='tel:+18552603274' style='color:var(--gold);text-decoration:underline;'>1-855-260-3274</a>",
      chips: ['Find a VSO counselor', 'VA Healthcare', 'See other benefits']
    },

    dental_vision: {
      pct: 50,
      bot: "<strong>VA Dental & Vision Benefits:</strong>\n\n<strong>Dental:</strong> Not automatically included in VA healthcare. You qualify for free VA dental if:\n— 100% service-connected disability rating, OR\n— POW, OR\n— Dental condition is service-connected, OR\n— Recently discharged (within 180 days, limited care)\n— Enrolled in Voc Rehab\n\n<strong>Otherwise:</strong> VA Dental Insurance Program (VADIP) offers low-cost dental through Delta Dental or MetLife.\n\n<strong>Vision:</strong> Routine eye care is covered if you have a service-connected eye condition. Otherwise, glasses/contacts are covered at 100% disability rating.\n\n<strong>Hearing aids:</strong> Covered if hearing loss is service-connected — one of the most common VA claims.",
      chips: ['Do I qualify for VA Healthcare?', 'Find a VSO counselor', 'See other benefits']
    },

    claim_status: {
      pct: 55,
      bot: "<strong>How to Check Your VA Claim Status:</strong>\n\n<strong>Online (fastest):</strong>\n— Sign in at <a href='https://va.gov' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;'>VA.gov</a> → My VA → Track Claims\n— Shows real-time status, any requests for information, and estimated decision date\n\n<strong>By phone:</strong>\n— VA Benefits Hotline: <a href='tel:+18008271000' style='color:var(--gold);text-decoration:underline;'>1-800-827-1000</a> (Mon–Fri 8am–9pm ET)\n\n<strong>Claim stages:</strong>\n1. Claim received → 2. Initial review → 3. Evidence gathering → 4. Evidence review → 5. Rating decision → 6. Preparation for notification → 7. Complete\n\n<strong>Tip:</strong> If your claim has been in one stage for 30+ days without movement, contact your VSO for help.",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    va_debt: {
      pct: 55,
      bot: "<strong>VA Debt & Overpayment Help:</strong>\n\nIf VA says you owe money — for education, compensation, or pension overpayments — you have options.\n\n<strong>Your rights:</strong>\n— Request a waiver (ask VA to forgive the debt)\n— Request a compromise (pay less than the full amount)\n— Request an extended repayment plan\n— Request a hearing to dispute the debt\n\n<strong>Act fast:</strong> You have <strong>180 days</strong> from the debt notice to request relief.\n\n<strong>Contact the Debt Management Center:</strong>\n— Phone: <a href='tel:+18008270648' style='color:var(--gold);text-decoration:underline;'>1-800-827-0648</a> (Mon–Fri 7:30am–7pm ET)\n— Online: <a href='https://va.gov/manage-va-debt' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;'>va.gov/manage-va-debt</a>\n\n<strong>Tip:</strong> A VSO counselor can help you write a waiver request — it significantly improves your chances.",
      chips: ['Find a VSO counselor', 'See other benefits', 'Start over']
    },

    mst: {
      pct: 55,
      bot: "<strong>Military Sexual Trauma (MST) Support:</strong>\n\nIf you experienced sexual assault or harassment during military service, VA provides dedicated, free support — regardless of discharge status, disability rating, or whether you reported it at the time.\n\n<strong>Free services available:</strong>\n— Mental health counseling (no copay, ever)\n— Inpatient and outpatient MST treatment\n— Vet Center counseling (community-based, private)\n\n<strong>VA disability:</strong> PTSD, depression, or other conditions related to MST can qualify for disability compensation — and the standard of evidence is lower than for other conditions.\n\n<strong>Contact:</strong>\n— Every VA medical center has an MST Coordinator — you can ask to speak with them directly\n— Crisis line: Dial <strong>988</strong>, then Press 1\n\n<strong>You do not have to prove the incident occurred to receive care.</strong>",
      chips: ['VA Healthcare', 'Mental health benefits', 'Find a VSO counselor']
    },

    travel_pay: {
      pct: 55,
      bot: "<strong>VA Beneficiary Travel Pay:</strong>\n\nVA may reimburse your travel costs to and from VA medical appointments.\n\n<strong>Who qualifies:</strong>\n— 30%+ service-connected disability rating, OR\n— Travel to a VA facility for a service-connected condition, OR\n— Receiving a VA pension, OR\n— Income below the maximum annual pension rate\n\n<strong>What's covered:</strong>\n— Mileage reimbursement (currently ~$0.415/mile)\n— Public transportation costs\n— Lodging and meals for long-distance travel\n\n<strong>How to claim:</strong>\n— Submit online at <a href='https://va.gov/health-care/get-reimbursed-for-travel-pay' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;'>va.gov/travel-pay</a> (BTSSS system)\n— Or submit VA Form 10-3542 at the travel office at your VA facility\n— Must file within 30 days of the appointment",
      chips: ['VA Healthcare', 'Find a VSO counselor', 'See other benefits']
    },

    community_care: {
      pct: 55,
      bot: "<strong>VA Community Care — Get Care Outside VA:</strong>\n\nIf VA cannot provide timely care, you may be eligible to see a community (non-VA) provider at VA's expense.\n\n<strong>You may qualify if:</strong>\n— Wait time exceeds 20 days for primary care or 28 days for specialty\n— Drive time exceeds 30 min for primary or 60 min for specialty\n— VA does not offer the service you need\n— It's in your best medical interest (per your VA provider)\n\n<strong>How to access:</strong>\n— Ask your VA provider for a community care referral\n— Call VA Community Care: <a href='tel:+18666068198' style='color:var(--gold);text-decoration:underline;'>1-866-606-8198</a>\n— Use the MISSION Act provider locator at va.gov/communitycare\n\n<strong>Important:</strong> You must get a VA referral first — don't go to a community provider without one or VA won't pay.",
      chips: ['Find a VSO counselor', 'VA Healthcare', 'See other benefits']
    },

    life_insurance: {
      pct: 55,
      bot: "<strong>VA Life Insurance:</strong>\n\n<strong>SGLI (Servicemembers' Group Life Insurance)</strong>\n— Up to $500,000 coverage while on active duty\n— Must convert within 1 year + 120 days of separation — don't miss this window\n\n<strong>VGLI (Veterans' Group Life Insurance)</strong>\n— Convert your SGLI after separation — no medical exam required if applied within 240 days\n— Coverage up to $500,000, renewable for life\n— Apply at benefits.va.gov/insurance\n\n<strong>S-DVI (Service-Disabled Veterans Life Insurance)</strong>\n— For veterans with a new service-connected disability\n— Up to $10,000 coverage at low rates\n— Must apply within 2 years of your rating decision\n\n<strong>VMLI (Veterans' Mortgage Life Insurance)</strong>\n— Mortgage protection up to $200,000 for severely disabled veterans with adapted housing grants\n\n<strong>Important:</strong> Many veterans lose SGLI coverage without realizing it — act fast after separation.",
      chips: ['Find a VSO counselor', 'See other benefits', 'Start over']
    },

    housing_help: {
      pct: 48,
      bot: "<strong>VA Housing Assistance Programs:</strong>\n\n<strong>HUD-VASH</strong> — Housing vouchers + case management for homeless veterans. Combines HUD Section 8 housing with VA supportive services.\n\n<strong>SSVF (Supportive Services for Veteran Families)</strong> — Rapid rehousing and eviction prevention for at-risk veterans.\n\n<strong>GPD (Grant & Per Diem)</strong> — Transitional housing programs through community organizations.\n\n<strong>How to access:</strong>\n— Call the National Call Center for Homeless Veterans: <a href='tel:+18774243838' style='color:var(--gold);text-decoration:underline;'>1-877-424-3838</a> (24/7)\n— Or walk in to any VA medical center\n\n<strong>You do not need an appointment or a disability rating to get help.</strong>",
      chips: ['Find a VSO counselor', 'VA Home Loan', 'See other benefits']
    },

    women_veterans: {
      pct: 55,
      bot: "<strong>Women Veterans Benefits:</strong>\n\nWomen are the fastest-growing segment of the veteran population. VA has expanded services significantly.\n\n<strong>Health services for women veterans:</strong>\n— Primary care with a designated Women Veterans Program Manager at every VA facility\n— Gynecology and reproductive health care\n— Maternity care (covered by VA)\n— Fertility treatment (IVF covered in some cases)\n— Mammography and cervical cancer screenings\n— MST counseling (Military Sexual Trauma)\n\n<strong>Benefits:</strong>\n— All standard VA disability, education, and housing benefits apply equally\n— Women Veterans who served during wartime may qualify for VA Pension\n\n<strong>Contact:</strong>\n— Women Veterans Call Center: <a href='tel:+18558292838' style='color:var(--gold);text-decoration:underline;'>1-855-829-6636</a> (Mon–Fri 8am–10pm, Sat 8am–6:30pm ET)",
      chips: ['VA Healthcare', 'Mental health benefits', 'Find a VSO counselor']
    },

    guard_reserve: {
      pct: 55,
      bot: "<strong>National Guard & Reserve VA Benefits:</strong>\n\nEligibility for VA benefits depends on whether you were activated under federal orders (Title 10) vs. state orders (Title 32).\n\n<strong>You likely qualify for VA benefits if you:</strong>\n— Were called to active duty under Title 10 federal orders\n— Served 90+ continuous days on active duty\n— Have a service-connected disability from active duty\n— Deployed to a combat zone\n\n<strong>Healthcare:</strong> Generally requires 24 months of active duty or a service-connected condition\n\n<strong>GI Bill:</strong> Chapter 33 (Post-9/11) requires 90+ days active duty. Chapter 1606 (MGIB-SR) for Selected Reserve members.\n\n<strong>Home Loan:</strong> 6 years in Selected Reserve or National Guard qualifies\n\n<strong>Tip:</strong> Guard and Reserve eligibility is complex — a VSO counselor can review your specific service history.",
      chips: ['VA Healthcare', 'GI Bill', 'Find a VSO counselor']
    },

    adapted_housing: {
      pct: 55,
      bot: "<strong>Adapted Housing Grants</strong>\n\n<strong>SAH Grant</strong> — up to $109,986 to build or modify a home\n<strong>SHA Grant</strong> — up to $22,036 for accessibility modifications\n<strong>TRA Grant</strong> — up to $46,496 for temporary adaptations\n\nExamples: wheelchair ramps, roll-in showers, stair lifts.",
      chips: ['VA Home Loan', 'Find a VSO counselor', 'See other benefits']
    },

    va_records: {
      pct: 55,
      bot: "<strong>Requesting Your VA Records:</strong>\n\n<strong>Military Service Records (DD-214):</strong>\n— Request free at <a href='https://archives.gov/veterans/military-service-records' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>archives.gov/veterans</a>\n— Or submit SF-180 by mail to the National Personnel Records Center\n— Allow 10–30 business days\n\n<strong>VA Medical Records:</strong>\n— Access online via <a href='https://myhealth.va.gov' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>My HealtheVet</a>\n— Request copies at your local VA facility\n— Or submit a HIPAA authorization form\n\n<strong>VA Claims File (C-File):</strong>\n— Contains all documents VA used in your claim decisions\n— Request by submitting VA Form 20-10206\n— Crucial for appeals — your VSO can help\n\n<strong>Tip:</strong> Getting your C-File before an appeal can reveal evidence VA overlooked.",
      chips: ['How do I file a claim?', 'Find a VSO counselor', 'See other benefits']
    },

    // ── TIER 4 — PREMIUM ───────────────────────────────────────────────────

    gi_bill_types: {
      pct: 54,
      bot: "<strong>GI Bill — Choosing the right chapter:</strong>\n\n<strong>Chapter 33 — Post-9/11 GI Bill</strong> (most popular)\n— Served 90+ days after 9/10/2001\n— Covers full tuition at public schools, $26,042/yr cap at private\n— Includes monthly housing allowance (BAH rate)\n— Best for full-time students\n\n<strong>Chapter 30 — Montgomery GI Bill</strong>\n— Paid into during service ($1,200 contribution)\n— Monthly stipend paid directly to you (~$2,122/mo full-time)\n— More flexible — can be used for on-the-job training\n\n<strong>Chapter 31 — Voc Rehab</strong> (separate program)\n— For veterans with a service-connected disability\n— Covers school + living expenses + books\n\n<strong>Yellow Ribbon Program:</strong> Covers tuition above the Post-9/11 cap at private schools. School must participate.",
      chips: ['How do I apply for GI Bill?', 'What is Voc Rehab?', 'Find a VSO counselor']
    },

    // ── EMPATHY ENTRY FLOW ─────────────────────────────────────────────────

    empathy_intro: {
      pct: 5,
      bot: "You've come to the right place, and you don't have to figure this out alone. 🇺🇸\n\nMany veterans feel exactly the same way — the VA system is complex and it can be hard to know where to start. That's exactly why this assistant exists.\n\n<strong>Let's start simple.</strong> Which of these best describes what's on your mind?",
      cards: [
        { icon: '💰', title: 'Money & Benefits', desc: 'Disability pay, pension, financial help' },
        { icon: '🏥', title: 'Healthcare',       desc: 'VA medical care, mental health' },
        { icon: '📚', title: 'Education & Jobs', desc: 'GI Bill, career training' },
        { icon: '👥', title: 'Talk to Someone',  desc: 'Connect with a VSO counselor' }
      ]
    }

  }; // end NODES

  // ── MULTILINGUAL NODE OVERRIDES ────────────────────────────────────────────
  // When lang !== 'en', renderNode checks here first, falls back to NODES
  var NODES_I18N = {
    es: {
      welcome: { pct:5, bot:null, cards:[{icon:"🎖️",title:"Veterano",desc:"Serví en el ejército de EE.UU."},{icon:"⚔️",title:"Servicio Activo",desc:"Actualmente sirviendo"},{icon:"💛",title:"Cónyuge / Familia",desc:"Familiar de un veterano"},{icon:"🕊️",title:"Cónyuge Sobreviviente",desc:"Perdió a un cónyuge veterano"}] },
      veteran: { pct:18, bot:null, cards:[{icon:"🏜️",title:"Post-11 de Sep.",desc:"2001 al presente"},{icon:"🌊",title:"Guerra del Golfo",desc:"1990–2001"},{icon:"🌿",title:"Era de Vietnam",desc:"1964–1975"},{icon:"🔵",title:"Otra Era",desc:"Corea, Guerra Fría, etc."}] },
      era: { pct:32, bot:"¿Tiene actualmente una calificación de discapacidad del VA?", cards:[{icon:"✅",title:"Sí — calificado",desc:"Tengo un porcentaje"},{icon:"📝",title:"No — todavía no",desc:"Nunca presenté"},{icon:"❌",title:"Fue denegado",desc:"Mi reclamo fue negado"},{icon:"❓",title:"No estoy seguro",desc:"Necesito verificar"}] },
      benefits_menu: { pct:48, bot:"Estos son los principales beneficios. ¿Cuál le interesa más?", cards:[{icon:"💰",title:"Pago por Discapacidad",desc:"Pago mensual libre de impuestos"},{icon:"🎓",title:"GI Bill",desc:"Financiamiento educativo"},{icon:"🏠",title:"Préstamo VA",desc:"Sin pago inicial"},{icon:"☢️",title:"Ley PACT",desc:"Exposición tóxica"},{icon:"🏥",title:"Atención Médica",desc:"Atención médica del VA"},{icon:"👔",title:"Rehabilitación Voc.",desc:"Capacitación laboral"}] },
      disability: { pct:62, bot:"<strong>Compensación por Discapacidad del VA</strong> — pago mensual libre de impuestos por condiciones relacionadas con el servicio.\n\n<strong>Pago promedio:</strong> $1,500–$3,800/mes\n<strong>Calificaciones:</strong> 10%–100%", chips:["¿Cómo presento un reclamo?","¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios"] },
      gi_bill: { pct:62, bot:"<strong>GI Bill Post-11 de Sep.</strong> cubre:\n\n<strong>Matrícula:</strong> Completa en universidades públicas\n<strong>Vivienda:</strong> ~$1,800–$2,400/mes\n<strong>Libros:</strong> Hasta $1,000/año\n<strong>Duración:</strong> Hasta 36 meses", chips:["¿Cómo solicito?","Buscar consejero VSO","Ver otros beneficios"] },
      home_loan: { pct:62, bot:"<strong>Préstamo para Vivienda VA</strong>:\n\n<strong>Sin pago inicial requerido</strong>\n<strong>Sin seguro hipotecario (PMI)</strong>\n<strong>Tasas de interés competitivas</strong>\n<strong>Reutilizable de por vida</strong>", chips:["¿Soy elegible?","Buscar consejero VSO","Ver otros beneficios"] },
      pact_act: { pct:62, bot:"<strong>Ley PACT (2022)</strong> — la mayor expansión de beneficios del VA en décadas.\n\nCubre: Fosos de quema, Agente Naranja, Enfermedad de la Guerra del Golfo.\n\nMás de 5 millones de veteranos pueden calificar ahora.", chips:["¿Califico?","Buscar consejero VSO","Ver otros beneficios"] },
      healthcare: { pct:62, bot:"<strong>Atención Médica del VA</strong>:\n\nCubre atención primaria, salud mental, medicamentos.\nGratuito para muchos veteranos.\n\nInscríbase en VA.gov o llame al 1-877-222-8387.", chips:["¿Cómo me inscribo?","Buscar consejero VSO","Ver otros beneficios"] },
      voc_rehab: { pct:62, bot:"<strong>Rehabilitación Vocacional (Cap. 31)</strong>:\n\nCubre asesoría profesional, educación, colocación laboral y herramientas para veteranos con calificación de discapacidad del 10%+.", chips:["¿Cómo solicito?","Buscar consejero VSO","Ver otros beneficios"] },
      denied: { pct:76, bot:"<strong>Un reclamo denegado no es el final.</strong>\n\nLa mayoría de los reclamos son denegados la primera vez — pero más del 70% de las apelaciones se ganan con la ayuda correcta.\n\n<strong>Sus opciones:</strong>\n— Reclamo Suplementario (nueva evidencia)\n— Junta de Apelaciones de Veteranos\n— Representante VSO gratuito para luchar por usted\n\nNo se rinda. Un consejero VSO puede revisar su carta de denegación gratis.", chips:["Buscar consejero VSO","¿Cómo presento un reclamo?","Ver otros beneficios","Empezar de nuevo"] },
      file_claim: { pct:76, bot:"<strong>Cómo presentar un reclamo de discapacidad:</strong>\n\n<strong>Paso 1</strong> — Crear cuenta en VA.gov\n<strong>Paso 2</strong> — Completar Formulario VA 21-526EZ\n<strong>Paso 3</strong> — Reunir DD-214 y registros médicos\n<strong>Paso 4</strong> — Presentar en línea, por correo o en persona\n\n<strong>📬 Por correo:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 En persona:</strong> <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>Encontrar su oficina VA más cercana →</a>", chips:["¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"] },
      documents: { pct:82, bot:"<strong>Documentos necesarios:</strong>\n\n— DD-214 (papeles de baja)\n— Registros médicos\n— Número de Seguro Social\n— Declaraciones de compañeros (recomendado)\n— Carta Nexus del doctor (recomendado)\n\n¿Le falta el DD-214? Solicítelo gratis en archives.gov/veterans", chips:["Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"] },
      healthcare_enroll: { pct:76, bot:"<strong>Cómo inscribirse en Atención Médica VA:</strong>\n\n<strong>Opción 1</strong> — En línea: VA.gov/health-care/apply\n<strong>Opción 2</strong> — Llamar: 1-877-222-8387\n<strong>Opción 3</strong> — En persona en cualquier centro médico VA: <a href='https://va.gov/find-locations' target='_blank' rel='noopener noreferrer' style='color:var(--gold);text-decoration:underline;text-underline-offset:2px;'>Encontrar ubicaciones →</a>\n\n<strong>Lo que necesita:</strong> DD-214, número de Seguro Social, info de seguro\n\n<strong>Costo:</strong> Gratis para veteranos de combate (primeros 5 años).", chips:["¿Soy elegible para atención médica VA?","Buscar consejero VSO","Ver otros beneficios"] },
      vso: { pct:92, bot:null, chips:["¿Cómo presento un reclamo?","Ver otros beneficios","Empezar de nuevo"] },
      active_duty: { pct:32, bot:"Gracias por su servicio y dedicación. 🇺🇸\n\n<strong>¿Se prepara para separarse o hacer la transición?</strong>\n\nBeneficios clave para actuar <em>antes</em> de irse:\n\n— <strong>Programa TAP</strong> — asistencia de transición obligatoria\n— <strong>Calificación de discapacidad</strong> — presente ANTES de separarse (programa BDD)\n— <strong>GI Bill</strong> — beneficio educativo activo el día que se separa\n— <strong>Atención Médica VA</strong> — inscríbase dentro de 5 años para atención gratuita\n— <strong>Préstamo VA</strong> — disponible inmediatamente después de la separación", chips:["Cuéntame sobre el programa BDD","GI Bill","Préstamo VA","Buscar consejero VSO"] },
      spouse: { pct:48, bot:"Gracias por su apoyo y sacrificio. La fortaleza detrás de cada miembro del servicio es su familia. 🤍\n\n<strong>Beneficios disponibles para cónyuges y dependientes:</strong>\n\n— <strong>CHAMPVA</strong> — atención médica gratuita del VA\n— <strong>DEA (Cap. 35)</strong> — beneficios educativos para dependientes\n— <strong>Pensión de Sobrevivientes</strong> — apoyo de ingresos\n— <strong>DIC</strong> — pago mensual si el veterano falleció por causa del servicio\n— <strong>Préstamo</strong> — cónyuges sobrevivientes pueden ser elegibles", chips:["Cuéntame sobre DIC","Cuéntame sobre CHAMPVA","Buscar consejero VSO","Ver otros beneficios"] }
    },
    vi: {
      welcome: { pct:5, bot:null, cards:[{icon:"\u{1F396}\uFE0F",title:"C\u1EF1u chi\u1EBFn binh",desc:"T\xF4i \u0111\xE3 ph\u1EE5c v\u1EE5 trong qu\xE2n \u0111\u1ED9i Hoa K\u1EF3"},{icon:"\u2694\uFE0F",title:"T\u1EA1i ng\u0169",desc:"\u0110ang ph\u1EE5c v\u1EE5"},{icon:"\uD83D\uDC9B",title:"V\u1EE3/Ch\u1ED3ng & Gia \u0111\xECnh",desc:"Th\xE0nh vi\xEAn gia \u0111\xECnh c\u1EE7a c\u1EF1u chi\u1EBFn binh"},{icon:"\uD83D\uDD4A\uFE0F",title:"V\u1EE3/Ch\u1ED3ng g\xF3a",desc:"M\u1EA5t v\u1EE3/ch\u1ED3ng c\u1EF1u chi\u1EBFn binh"}] },
      veteran: { pct:18, bot:null, cards:[{icon:"\uD83C\uDFDC\uFE0F",title:"Sau 11/9",desc:"2001 \u0111\u1EBFn nay"},{icon:"\uD83C\uDF0A",title:"Chi\u1EBFn tranh V\xF9ng V\u1ECBnh",desc:"1990\u20132001"},{icon:"\uD83C\uDF3F",title:"Th\u1EDDi k\u1EF3 Vi\u1EC7t Nam",desc:"1964\u20131975"},{icon:"\uD83D\uDD35",title:"Th\u1EDDi k\u1EF3 kh\xE1c",desc:"H\xE0n Qu\u1ED1c, Chi\u1EBFn tranh L\u1EA1nh, v.v."}] },
      era: { pct:32, bot:"B\u1EA1n hi\u1EC7n c\xF3 x\u1EBFp h\u1EA1ng khuy\u1EBFt t\u1EADt VA kh\xF4ng?", cards:[{icon:"\u2705",title:"C\xF3 \u2014 \u0111\xE3 x\u1EBFp h\u1EA1ng",desc:"T\xF4i c\xF3 t\u1EF7 l\u1EC7 %"},{icon:"\uD83D\uDCDD",title:"Ch\u01B0a \u2014 ch\u01B0a n\u1ED9p",desc:"Ch\u01B0a bao gi\u1EDD n\u1ED9p \u0111\u01A1n"},{icon:"\u274C",title:"B\u1ECB t\u1EEB ch\u1ED1i",desc:"\u0110\u01A1n c\u1EE7a t\xF4i b\u1ECB t\u1EEB ch\u1ED1i"},{icon:"\u2753",title:"Kh\xF4ng ch\u1EAFc",desc:"T\xF4i c\u1EA7n ki\u1EC3m tra"}] },
      benefits_menu: { pct:48, bot:"\u0110\xE2y l\xE0 nh\u1EEFng ph\xFAc l\u1EE3i h\xE0ng \u0111\u1EA7u. B\u1EA1n quan t\xE2m \u0111i\u1EC1u n\xE0o nh\u1EA5t?", cards:[{icon:"\uD83D\uDCB0",title:"Tr\u1EE3 c\u1EA5p khuy\u1EBFt t\u1EADt",desc:"Ti\u1EC1n h\xE0ng th\xE1ng mi\u1EC5n thu\u1EBF"},{icon:"\uD83C\uDF93",title:"GI Bill",desc:"T\xE0i tr\u1EE3 gi\xE1o d\u1EE5c"},{icon:"\uD83C\uDFE0",title:"Vay mua nh\xE0 VA",desc:"Kh\xF4ng c\u1EA7n tr\u1EA3 tr\u01B0\u1EDBc"},{icon:"\u2622\uFE0F",title:"\u0110\u1EA1o lu\u1EADt PACT",desc:"Ph\u01A1i nhi\u1EC5m \u0111\u1ED9c h\u1EA1i"},{icon:"\uD83C\uDFE5",title:"Ch\u0103m s\xF3c s\u1EE9c kh\u1ECFe",desc:"Ch\u0103m s\xF3c y t\u1EBF VA"},{icon:"\uD83D\uDC54",title:"Ph\u1EE5c h\u1ED3i ngh\u1EC1 nghi\u1EC7p",desc:"\u0110\xE0o t\u1EA1o vi\u1EC7c l\xE0m"}] },
      disability: { pct:62, bot:"<strong>B\u1ED3i th\u01B0\u1EDDng Khuy\u1EBFt t\u1EADt VA</strong> \u2014 ti\u1EC1n h\xE0ng th\xE1ng mi\u1EC5n thu\u1EBF cho c\xE1c t\xECnh tr\u1EA1ng li\xEAn quan \u0111\u1EBFn ph\u1EE5c v\u1EE5.\n\n<strong>Thanh to\xE1n trung b\xECnh:</strong> $1,500\u2013$3,800/th\xE1ng\n<strong>X\u1EBFp h\u1EA1ng:</strong> 10%\u2013100%", chips:["L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 n\u1ED9p \u0111\u01A1n?","C\u1EA7n nh\u1EEFng gi\u1EA5y t\u1EDD g\xEC?","T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c"] },
      gi_bill: { pct:62, bot:"<strong>GI Bill Sau 11/9</strong> bao g\u1ED3m:\n\n<strong>H\u1ECDc ph\xED:</strong> To\xE0n b\u1ED9 t\u1EA1i tr\u01B0\u1EDDng c\xF4ng\n<strong>Nh\xE0 \u1EDF:</strong> ~$1,800\u2013$2,400/th\xE1ng\n<strong>S\xE1ch:</strong> L\xEAn \u0111\u1EBFn $1,000/n\u0103m\n<strong>Th\u1EDDi h\u1EA1n:</strong> L\xEAn \u0111\u1EBFn 36 th\xE1ng", chips:["L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 \u0111\u0103ng k\xFD?","T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c"] },
      home_loan: { pct:62, bot:"<strong>Vay Mua Nh\xE0 VA</strong>:\n\n<strong>Kh\xF4ng c\u1EA7n tr\u1EA3 tr\u01B0\u1EDBc</strong>\n<strong>Kh\xF4ng b\u1EA3o hi\u1EC3m th\u1EBF ch\u1EA5p (PMI)</strong>\n<strong>L\xE3i su\u1EA5t c\u1EA1nh tranh</strong>\n<strong>S\u1EED d\u1EE5ng \u0111\u01B0\u1EE3c su\u1ED1t \u0111\u1EDDi</strong>", chips:["T\xF4i c\xF3 \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n kh\xF4ng?","T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c"] },
      healthcare: { pct:62, bot:"<strong>Ch\u0103m S\xF3c S\u1EE9c Kh\u1ECFe VA</strong>:\n\nBao g\u1ED3m ch\u0103m s\xF3c ban \u0111\u1EA7u, s\u1EE9c kh\u1ECFe t\xE2m th\u1EA7n, thu\u1ED1c.\nMi\u1EC5n ph\xED cho nhi\u1EC1u c\u1EF1u chi\u1EBFn binh.\n\n\u0110\u0103ng k\xFD t\u1EA1i VA.gov ho\u1EB7c g\u1ECDi 1-877-222-8387.", chips:["L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 \u0111\u0103ng k\xFD?","T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c"] },
      file_claim: { pct:76, bot:"<strong>C\xE1ch n\u1ED9p \u0111\u01A1n y\xEAu c\u1EA7u b\u1ED3i th\u01B0\u1EDDng khuy\u1EBFt t\u1EADt:</strong>\n\n<strong>B\u01B0\u1EDBc 1</strong> \u2014 T\u1EA1o t\xE0i kho\u1EA3n t\u1EA1i VA.gov\n<strong>B\u01B0\u1EDBc 2</strong> \u2014 Ho\xE0n th\xE0nh M\u1EABu VA 21-526EZ\n<strong>B\u01B0\u1EDBc 3</strong> \u2014 Chu\u1EA9n b\u1ECB DD-214 v\xE0 h\u1ED3 s\u01A1 y t\u1EBF\n<strong>B\u01B0\u1EDBc 4</strong> \u2014 N\u1ED9p tr\u1EF1c tuy\u1EBFn, qua \u0111\u01B0\u1EDDng b\u01B0u \u0111i\u1EC7n ho\u1EB7c tr\u1EF1c ti\u1EBFp", chips:["C\u1EA7n nh\u1EEFng gi\u1EA5y t\u1EDD g\xEC?","T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c","B\u1EAFt \u0111\u1EA7u l\u1EA1i"] },
      documents: { pct:82, bot:"<strong>Gi\u1EA5y t\u1EDD c\u1EA7n thi\u1EBFt:</strong>\n\n\u2014 DD-214\n\u2014 H\u1ED3 s\u01A1 y t\u1EBF\n\u2014 S\u1ED1 An sinh X\xE3 h\u1ED9i\n\u2014 L\u1EDDi khai c\u1EE7a \u0111\u1ED3ng \u0111\u1ED9i (khuy\u1EBFn ngh\u1ECB)\n\u2014 Th\u01B0 Nexus t\u1EEB b\xE1c s\u0129 (khuy\u1EBFn ngh\u1ECB)", chips:["T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c","B\u1EAFt \u0111\u1EA7u l\u1EA1i"] },
      vso: { pct:92, bot:null, chips:["L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 n\u1ED9p \u0111\u01A1n?","Xem t\u1EA5t c\u1EA3 ph\xFAc l\u1EE3i","B\u1EAFt \u0111\u1EA7u l\u1EA1i"] },
      spouse: { pct:48, bot:"C\u1EA3m \u01A1n s\u1EF1 h\u1ED7 tr\u1EE3 v\xE0 hy sinh c\u1EE7a b\u1EA1n. S\u1EE9c m\u1EA1nh \u0111\u1EB1ng sau m\u1ED7i qu\xE2n nh\xE2n l\xE0 gia \u0111\xECnh h\u1ECD. \uD83E\uDD0D\n\n<strong>Ph\xFAc l\u1EE3i d\xE0nh cho v\u1EE3/ch\u1ED3ng v\xE0 ng\u01B0\u1EDDi ph\u1EE5 thu\u1ED9c:</strong>\n\n\u2014 <strong>CHAMPVA</strong> \u2014 ch\u0103m s\xF3c s\u1EE9c kh\u1ECFe mi\u1EC5n ph\xED\n\u2014 <strong>DEA (Ch. 35)</strong> \u2014 ph\xFAc l\u1EE3i gi\xE1o d\u1EE5c\n\u2014 <strong>DIC</strong> \u2014 thanh to\xE1n h\xE0ng th\xE1ng\n\u2014 <strong>Vay mua nh\xE0</strong> \u2014 c\xF3 th\u1EC3 \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n", chips:["Cho t\xF4i bi\u1EBFt v\u1EC1 DIC","Cho t\xF4i bi\u1EBFt v\u1EC1 CHAMPVA","T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c"] }
    },
    ko: {
      welcome: { pct:5, bot:null, cards:[{icon:"\u{1F396}\uFE0F",title:"\uCC38\uC804\uC6A9\uC0AC",desc:"\uBBF8\uAD70\uC5D0\uC11C \uBCF5\uBB34\uD588\uC2B5\uB2C8\uB2E4"},{icon:"\u2694\uFE0F",title:"\uD604\uC5ED",desc:"\uD604\uC7AC \uBCF5\uBB34 \uC911"},{icon:"\uD83D\uDC9B",title:"\uBC30\uC6B0\uC790/\uAC00\uC871",desc:"\uCC38\uC804\uC6A9\uC0AC\uC758 \uAC00\uC871"},{icon:"\uD83D\uDD4A\uFE0F",title:"\uC720\uC871 \uBC30\uC6B0\uC790",desc:"\uCC38\uC804\uC6A9\uC0AC \uBC30\uC6B0\uC790\uB97C \uC783\uC740"}] },
      veteran: { pct:18, bot:null, cards:[{icon:"\uD83C\uDFDC\uFE0F",title:"9/11 \uC774\uD6C4",desc:"2001\uB144\uBD80\uD130 \uD604\uC7AC"},{icon:"\uD83C\uDF0A",title:"\uAC78\uD504\uC804",desc:"1990\u20132001"},{icon:"\uD83C\uDF3F",title:"\uBCA0\uD2B8\uB0A8 \uC2DC\uB300",desc:"1964\u20131975"},{icon:"\uD83D\uDD35",title:"\uAE30\uD0C0 \uC2DC\uB300",desc:"\uD55C\uAD6D\uC804, \uB0C9\uC804 \uB4F1"}] },
      era: { pct:32, bot:"\uD604\uC7AC VA \uC7A5\uC560 \uB4F1\uAE09\uC774 \uC788\uC2B5\uB2C8\uAE4C?", cards:[{icon:"\u2705",title:"\uC608 \u2014 \uB4F1\uAE09 \uC788\uC74C",desc:"\uB4F1\uAE09 %\uAC00 \uC788\uC2B5\uB2C8\uB2E4"},{icon:"\uD83D\uDCDD",title:"\uC544\uB2C8\uC624 \u2014 \uC544\uC9C1",desc:"\uCCAD\uAD6C\uD55C \uC801 \uC5C6\uC74C"},{icon:"\u274C",title:"\uAC70\uBD80\uB428",desc:"\uCCAD\uAD6C\uAC00 \uAC70\uBD80\uB428"},{icon:"\u2753",title:"\uC798 \uBAA8\uB984",desc:"\uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4"}] },
      benefits_menu: { pct:48, bot:"\uC8FC\uC694 \uD61C\uD0DD\uC785\uB2C8\uB2E4. \uC5B4\uB5A4 \uAC83\uC774 \uAD00\uC2EC\uC774\uC2ED\uB2C8\uAE4C?", cards:[{icon:"\uD83D\uDCB0",title:"\uC7A5\uC560 \uAE09\uC5EC",desc:"\uBE44\uACFC\uC138 \uC6D4\uBCC4 \uAE09\uC5EC"},{icon:"\uD83C\uDF93",title:"GI Bill",desc:"\uAD50\uC721 \uC790\uAE08"},{icon:"\uD83C\uDFE0",title:"VA \uC8FC\uD0DD \uB300\uCD9C",desc:"\uACC4\uC57D\uAE08 \uC5C6\uC74C"},{icon:"\u2622\uFE0F",title:"PACT\uBC95",desc:"\uB3C5\uC131 \uB178\uCD9C"},{icon:"\uD83C\uDFE5",title:"\uC758\uB8CC \uC11C\uBE44\uC2A4",desc:"VA \uC758\uB8CC"},{icon:"\uD83D\uDC54",title:"\uC9C1\uC5C5 \uC7AC\uD65C",desc:"\uC9C1\uC5C5 \uD6C8\uB828"}] },
      disability: { pct:62, bot:"<strong>VA \uC7A5\uC560 \uBCF4\uC0C1</strong> \u2014 \uBCF5\uBB34 \uAD00\uB828 \uC0C1\uD0DC\uC5D0 \uB300\uD55C \uBE44\uACFC\uC138 \uC6D4\uBCC4 \uAE09\uC5EC.\n\n<strong>\uD3C9\uADE0 \uC9C0\uAE09\uC561:</strong> $1,500\u2013$3,800/\uC6D4\n<strong>\uB4F1\uAE09:</strong> 10%\u2013100%", chips:["\uCCAD\uAD6C \uBC29\uBC95\uC740?","\uC5B4\uB5A4 \uC11C\uB958\uAC00 \uD544\uC694\uD569\uB2C8\uAE4C?","VSO \uC0C1\uB2F4\uC0AC \uCC3E\uAE30","\uB2E4\uB978 \uD61C\uD0DD \uBCF4\uAE30"] },
      file_claim: { pct:76, bot:"<strong>VA \uC7A5\uC560 \uCCAD\uAD6C \uBC29\uBC95:</strong>\n\n<strong>1\uB2E8\uACC4</strong> \u2014 VA.gov\uC5D0\uC11C \uACC4\uC815 \uC0DD\uC131\n<strong>2\uB2E8\uACC4</strong> \u2014 VA \uC591\uC2DD 21-526EZ \uC791\uC131\n<strong>3\uB2E8\uACC4</strong> \u2014 DD-214 \uBC0F \uC758\uB8CC \uAE30\uB85D \uC900\uBE44\n<strong>4\uB2E8\uACC4</strong> \u2014 \uC628\uB77C\uC778, \uC6B0\uD3B8 \uB610\uB294 \uC9C1\uC811 \uC81C\uCD9C", chips:["\uC5B4\uB5A4 \uC11C\uB958\uAC00 \uD544\uC694\uD569\uB2C8\uAE4C?","VSO \uC0C1\uB2F4\uC0AC \uCC3E\uAE30","\uB2E4\uB978 \uD61C\uD0DD \uBCF4\uAE30","\uCC98\uC74C\uC73C\uB85C"] },
      documents: { pct:82, bot:"<strong>\uD544\uC694\uD55C \uC11C\uB958:</strong>\n\n\u2014 DD-214\n\u2014 \uC758\uB8CC \uAE30\uB85D\n\u2014 \uC0AC\uD68C\uBCF4\uC7A5\uBC88\uD638\n\u2014 \uB3D9\uB8CC \uC9C4\uC220\uC11C (\uAD8C\uC7A5)\n\u2014 \uC758\uC0AC\uC758 Nexus \uD3B8\uC9C0 (\uAD8C\uC7A5)", chips:["VSO \uC0C1\uB2F4\uC0AC \uCC3E\uAE30","\uB2E4\uB978 \uD61C\uD0DD \uBCF4\uAE30","\uCC98\uC74C\uC73C\uB85C"] },
      vso: { pct:92, bot:null, chips:["\uCCAD\uAD6C \uBC29\uBC95\uC740?","\uBAA8\uB4E0 \uD61C\uD0DD \uBCF4\uAE30","\uCC98\uC74C\uC73C\uB85C"] },
      spouse: { pct:48, bot:"\uADC0\uD558\uC758 \uC9C0\uC6D0\uACFC \uD76C\uC0DD\uC5D0 \uAC10\uC0AC\uB4DC\uB9BD\uB2C8\uB2E4. \uD83E\uDD0D\n\n<strong>\uBC30\uC6B0\uC790 \uBC0F \uBD80\uC591\uAC00\uC871\uC744 \uC704\uD55C \uD61C\uD0DD:</strong>\n\n\u2014 <strong>CHAMPVA</strong> \u2014 \uBB34\uB8CC VA \uC758\uB8CC\n\u2014 <strong>DEA (Ch. 35)</strong> \u2014 \uAD50\uC721 \uD61C\uD0DD\n\u2014 <strong>DIC</strong> \u2014 \uC6D4\uBCC4 \uC9C0\uAE09\uAE08\n\u2014 <strong>\uC8FC\uD0DD \uB300\uCD9C</strong> \u2014 \uC790\uACA9\uC774 \uB420 \uC218 \uC788\uC74C", chips:["DIC\uC5D0 \uB300\uD574 \uC54C\uB824\uC8FC\uC138\uC694","CHAMPVA\uC5D0 \uB300\uD574 \uC54C\uB824\uC8FC\uC138\uC694","VSO \uC0C1\uB2F4\uC0AC \uCC3E\uAE30","\uB2E4\uB978 \uD61C\uD0DD \uBCF4\uAE30"] }
    },
    tl: {
      welcome: { pct:5, bot:null, cards:[{icon:"\u{1F396}\uFE0F",title:"Beterano",desc:"Naglingkod sa militar ng US"},{icon:"\u2694\uFE0F",title:"Aktibong Serbisyo",desc:"Kasalukuyang naglilingkod"},{icon:"\uD83D\uDC9B",title:"Asawa / Pamilya",desc:"Miyembro ng pamilya ng beterano"},{icon:"\uD83D\uDD4A\uFE0F",title:"Naiwang Asawa",desc:"Nawalan ng asawang beterano"}] },
      veteran: { pct:18, bot:null, cards:[{icon:"\uD83C\uDFDC\uFE0F",title:"Post-9/11",desc:"2001 hanggang kasalukuyan"},{icon:"\uD83C\uDF0A",title:"Digmaang Gulpo",desc:"1990\u20132001"},{icon:"\uD83C\uDF3F",title:"Panahon ng Vietnam",desc:"1964\u20131975"},{icon:"\uD83D\uDD35",title:"Ibang Panahon",desc:"Korea, Cold War, atbp."}] },
      era: { pct:32, bot:"Mayroon ka bang VA disability rating sa kasalukuyan?", cards:[{icon:"\u2705",title:"Oo \u2014 may rating",desc:"Mayroon akong rating %"},{icon:"\uD83D\uDCDD",title:"Hindi \u2014 hindi pa",desc:"Hindi pa nag-file"},{icon:"\u274C",title:"Tinanggihan",desc:"Tinanggihan ang aking claim"},{icon:"\u2753",title:"Hindi sigurado",desc:"Kailangan kong suriin"}] },
      benefits_menu: { pct:48, bot:"Narito ang mga pangunahing benepisyo. Alin ang interesado ka?", cards:[{icon:"\uD83D\uDCB0",title:"Bayad sa Kapansanan",desc:"Buwanang bayad na walang buwis"},{icon:"\uD83C\uDF93",title:"GI Bill",desc:"Pondo sa edukasyon"},{icon:"\uD83C\uDFE0",title:"VA Home Loan",desc:"Walang down payment"},{icon:"\u2622\uFE0F",title:"PACT Act",desc:"Toxic exposure"},{icon:"\uD83C\uDFE5",title:"Pangangalagang Pangkalusugan",desc:"VA medical care"},{icon:"\uD83D\uDC54",title:"Voc Rehab",desc:"Pagsasanay sa trabaho"}] },
      disability: { pct:62, bot:"<strong>VA Disability Compensation</strong> \u2014 buwanang bayad na walang buwis para sa mga kondisyong konektado sa serbisyo.\n\n<strong>Average na bayad:</strong> $1,500\u2013$3,800/buwan\n<strong>Rating:</strong> 10%\u2013100%", chips:["Paano mag-file ng claim?","Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"] },
      file_claim: { pct:76, bot:"<strong>Paano mag-file ng claim sa kapansanan:</strong>\n\n<strong>Hakbang 1</strong> \u2014 Gumawa ng account sa VA.gov\n<strong>Hakbang 2</strong> \u2014 Kumpletuhin ang VA Form 21-526EZ\n<strong>Hakbang 3</strong> \u2014 Tipunin ang DD-214 at mga medikal na rekord\n<strong>Hakbang 4</strong> \u2014 Isumite online, sa pamamagitan ng koreo, o personal", chips:["Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"] },
      documents: { pct:82, bot:"<strong>Mga dokumentong kailangan:</strong>\n\n\u2014 DD-214\n\u2014 Mga medikal na rekord\n\u2014 Social Security number\n\u2014 Buddy statements (inirerekomenda)\n\u2014 Nexus letter mula sa doktor (inirerekomenda)", chips:["Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"] },
      vso: { pct:92, bot:null, chips:["Paano mag-file ng claim?","Tingnan ang lahat ng benepisyo","Magsimula muli"] },
      spouse: { pct:48, bot:"Salamat sa iyong suporta at sakripisyo. Ang lakas sa likod ng bawat sundalo ay ang kanilang pamilya. \uD83E\uDD0D\n\n<strong>Mga benepisyo para sa asawa at dependents:</strong>\n\n\u2014 <strong>CHAMPVA</strong> \u2014 libreng VA healthcare\n\u2014 <strong>DEA (Ch. 35)</strong> \u2014 mga benepisyo sa edukasyon\n\u2014 <strong>DIC</strong> \u2014 buwanang bayad\n\u2014 <strong>Home Loan</strong> \u2014 maaaring maging eligible", chips:["Sabihin sa akin ang tungkol sa DIC","Sabihin sa akin ang tungkol sa CHAMPVA","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"] }
    }
  };

  // ── MULTILINGUAL CHIP ROUTES ───────────────────────────────────────────────
  var CHIP_MAP_I18N = {
    es: {
      "Veterano":"veteran","Servicio Activo":"active_duty","Cónyuge / Familia":"spouse","Cónyuge Sobreviviente":"surviving_spouse",
      "Post-11 de Sep.":"era","Guerra del Golfo":"era","Era de Vietnam":"era","Otra Era":"era",
      "Sí — calificado":"disability","No — todavía no":"file_claim","Fue denegado":"denied","No estoy seguro":"file_claim",
      "Pago por Discapacidad":"disability","GI Bill":"gi_bill","Préstamo VA":"home_loan","Ley PACT":"pact_act",
      "Atención Médica":"healthcare","Rehabilitación Voc.":"voc_rehab",
      "¿Cómo presento un reclamo?":"file_claim","¿Qué documentos necesito?":"documents",
      "Buscar consejero VSO":"vso","Ver otros beneficios":"benefits_menu","Ver todos los beneficios":"all_benefits",
      "¿Califico?":"pact_qualify","¿Soy elegible?":"home_loan_apply","¿Cómo solicito?":"gi_bill_apply",
      "¿Cómo me inscribo?":"healthcare_enroll","¿Soy elegible para atención médica VA?":"healthcare_eligibility",
      "Cuéntame sobre el programa BDD":"bdd","Cuéntame sobre DIC":"dic","Cuéntame sobre CHAMPVA":"champva",
      "¿Cómo solicito DIC?":"dic_apply","¿Puedo transferir mi GI Bill?":"gi_bill_transfer",
      "Empezar de nuevo":"welcome"
    },
    vi: {
      "C\u1EF1u chi\u1EBFn binh":"veteran","T\u1EA1i ng\u0169":"active_duty","V\u1EE3/Ch\u1ED3ng & Gia \u0111\xECnh":"spouse","V\u1EE3/Ch\u1ED3ng g\xF3a":"surviving_spouse",
      "Sau 11/9":"era","Chi\u1EBFn tranh V\xF9ng V\u1ECBnh":"era","Th\u1EDDi k\u1EF3 Vi\u1EC7t Nam":"era","Th\u1EDDi k\u1EF3 kh\xE1c":"era",
      "C\xF3 \u2014 \u0111\xE3 x\u1EBFp h\u1EA1ng":"disability","Ch\u01B0a \u2014 ch\u01B0a n\u1ED9p":"file_claim","B\u1ECB t\u1EEB ch\u1ED1i":"denied","Kh\xF4ng ch\u1EAFc":"file_claim",
      "Tr\u1EE3 c\u1EA5p khuy\u1EBFt t\u1EADt":"disability","GI Bill":"gi_bill","Vay mua nh\xE0 VA":"home_loan","\u0110\u1EA1o lu\u1EADt PACT":"pact_act",
      "Ch\u0103m s\xF3c s\u1EE9c kh\u1ECFe":"healthcare","Ph\u1EE5c h\u1ED3i ngh\u1EC1 nghi\u1EC7p":"voc_rehab",
      "L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 n\u1ED9p \u0111\u01A1n?":"file_claim","C\u1EA7n nh\u1EEFng gi\u1EA5y t\u1EDD g\xEC?":"documents",
      "T\xECm t\u01B0 v\u1EA5n vi\xEAn VSO":"vso","Xem c\xE1c ph\xFAc l\u1EE3i kh\xE1c":"benefits_menu","Xem t\u1EA5t c\u1EA3 ph\xFAc l\u1EE3i":"all_benefits",
      "T\xF4i c\xF3 \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n kh\xF4ng?":"pact_qualify","L\xE0m th\u1EBF n\xE0o \u0111\u1EC3 \u0111\u0103ng k\xFD?":"gi_bill_apply",
      "Cho t\xF4i bi\u1EBFt v\u1EC1 DIC":"dic","Cho t\xF4i bi\u1EBFt v\u1EC1 CHAMPVA":"champva",
      "B\u1EAFt \u0111\u1EA7u l\u1EA1i":"welcome"
    },
    ko: {
      "\uCC38\uC804\uC6A9\uC0AC":"veteran","\uD604\uC5ED":"active_duty","\uBC30\uC6B0\uC790/\uAC00\uC871":"spouse","\uC720\uC871 \uBC30\uC6B0\uC790":"surviving_spouse",
      "9/11 \uC774\uD6C4":"era","\uAC78\uD504\uC804":"era","\uBCA0\uD2B8\uB0A8 \uC2DC\uB300":"era","\uAE30\uD0C0 \uC2DC\uB300":"era",
      "\uC608 \u2014 \uB4F1\uAE09 \uC788\uC74C":"disability","\uC544\uB2C8\uC624 \u2014 \uC544\uC9C1":"file_claim","\uAC70\uBD80\uB428":"denied","\uC798 \uBAA8\uB984":"file_claim",
      "\uC7A5\uC560 \uAE09\uC5EC":"disability","GI Bill":"gi_bill","VA \uC8FC\uD0DD \uB300\uCD9C":"home_loan","PACT\uBC95":"pact_act",
      "\uC758\uB8CC \uC11C\uBE44\uC2A4":"healthcare","\uC9C1\uC5C5 \uC7AC\uD65C":"voc_rehab",
      "\uCCAD\uAD6C \uBC29\uBC95\uC740?":"file_claim","\uC5B4\uB5A4 \uC11C\uB958\uAC00 \uD544\uC694\uD569\uB2C8\uAE4C?":"documents",
      "VSO \uC0C1\uB2F4\uC0AC \uCC3E\uAE30":"vso","\uB2E4\uB978 \uD61C\uD0DD \uBCF4\uAE30":"benefits_menu","\uBAA8\uB4E0 \uD61C\uD0DD \uBCF4\uAE30":"all_benefits",
      "\uC790\uACA9\uC774 \uB418\uB098\uC694?":"pact_qualify","\uB4F1\uB85D \uBC29\uBC95\uC740?":"healthcare_enroll",
      "DIC\uC5D0 \uB300\uD574 \uC54C\uB824\uC8FC\uC138\uC694":"dic","CHAMPVA\uC5D0 \uB300\uD574 \uC54C\uB824\uC8FC\uC138\uC694":"champva",
      "\uCC98\uC74C\uC73C\uB85C":"welcome"
    },
    tl: {
      "Beterano":"veteran","Aktibong Serbisyo":"active_duty","Asawa / Pamilya":"spouse","Naiwang Asawa":"surviving_spouse",
      "Post-9/11":"era","Digmaang Gulpo":"era","Panahon ng Vietnam":"era","Ibang Panahon":"era",
      "Oo \u2014 may rating":"disability","Hindi \u2014 hindi pa":"file_claim","Tinanggihan":"denied","Hindi sigurado":"file_claim",
      "Bayad sa Kapansanan":"disability","GI Bill":"gi_bill","VA Home Loan":"home_loan","PACT Act":"pact_act",
      "Pangangalagang Pangkalusugan":"healthcare","Voc Rehab":"voc_rehab",
      "Paano mag-file ng claim?":"file_claim","Anong mga dokumento ang kailangan?":"documents",
      "Humanap ng VSO counselor":"vso","Tingnan ang ibang benepisyo":"benefits_menu","Tingnan ang lahat ng benepisyo":"all_benefits",
      "Kwalipikado ba ako?":"pact_qualify","Paano mag-apply?":"file_claim","Paano mag-enroll?":"healthcare_enroll",
      "Sabihin sa akin ang tungkol sa DIC":"dic","Sabihin sa akin ang tungkol sa CHAMPVA":"champva",
      "Magsimula muli":"welcome"
    }
  };

  // ── CHIP → NODE MAP ────────────────────────────────────────────────────────
  var CHIP_MAP = {
    'Veteran':'veteran', 'Active Duty':'active_duty', 'Spouse / Family':'spouse',
    'Surviving Spouse':'surviving_spouse', 'Post-9/11':'era', 'Gulf War':'era',
    'Vietnam Era':'era', 'Other Era':'era',
    'Yes — rated':'disability', 'No — not yet':'file_claim',
    'Was denied':'denied', 'Not sure':'file_claim',
    'Disability Pay':'disability', 'VA Disability Pay':'disability',
    'GI Bill':'gi_bill', 'VA Home Loan':'home_loan', 'Healthcare':'healthcare',
    'VA Healthcare':'healthcare', 'PACT Act':'pact_act', 'Voc Rehab':'voc_rehab',
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
    'How do I apply for DIC?':'dic_apply',
    'Tell me about VA Home Loan':'home_loan',
    'Tell me about Voc Rehab':'voc_rehab',
    'Tell me about VA Pension':'pension',
    'What is Aid & Attendance?':'aid_attendance',
    'How do I apply for BDD?':'bdd',
    'Find a VSO counselor':'vso',
    'What is BDD?':'bdd',
    'Tell me about the BDD program':'bdd',
    'GI Bill':'gi_bill',
    'VA Home Loan':'home_loan',
    'VA Healthcare':'healthcare',
    'Mental health benefits':'mental_health',
    'Do I qualify for VA Healthcare?':'healthcare_eligibility',
    'Am I eligible for VA Healthcare?':'healthcare_eligibility',
    'Surviving spouse benefits':'surviving_spouse',
    'What is VA Pension?':'pension',
    'Start over':'welcome', 'Start Fresh →':'welcome',
    'Contact Support':'feedback', 'VetNavigator Support':'feedback',
    // gi_bill_types chips
    'What is Voc Rehab?':'voc_rehab',
    'Can I transfer my GI Bill?':'gi_bill_transfer',
    'Chapter 30 vs 33':'gi_bill_types', 'Montgomery GI Bill':'gi_bill_types',
    'GI Bill types':'gi_bill_types', 'Yellow Ribbon':'gi_bill_types',
    // empathy_intro card routes
    'Money & Benefits':'benefits_menu', 'Talk to Someone':'vso',
    'Education & Jobs':'cat_education',
    // empathy trigger phrases
    "I don't know where to start":'empathy_intro',
    "I need help":'empathy_intro',
    "I'm confused":'empathy_intro',
    "I'm overwhelmed":'empathy_intro'
  };

  // ── KEYWORD ROUTING ────────────────────────────────────────────────────────
  var KW = [
    [/\b(crisis|suicid|harm myself|end my life|don.t want to live|988|crisis line)\b/i, 'crisis'],
    // Ratings & claims
    [/\b(rating|rated|disability rating|how.*rating|rating.*work|percent|percentage)\b/i, 'rating_explained'],
    [/\b(increase.*rating|higher rating|raise.*rating|rating.*increase|re-?rate|rerate)\b/i, 'rating_increase'],
    [/\b(c&?p exam|comp.*pen|compensation.*pension|c and p|dbq)\b/i,        'cp_exam'],
    [/\b(tdiu|total disab|unemployab|can't work|cannot work|unable.*work)\b/i, 'tdiu'],
    [/\b(nexus|buddy statement|lay statement|personal statement|doctor.*letter)\b/i, 'nexus'],
    [/\b(appeal|appealing|board of appeals|bva|cavc|higher.?level review|supplemental claim|new evidence)\b/i, 'denied'],
    [/\b(back pay|retro|retroactive|effective date|past.*benefits)\b/i,     'rating_increase'],
    [/\b(file.*claim|submit.*claim|start.*claim|how.*claim|apply.*disab|526)\b/i, 'file_claim'],
    [/\b(denied|rejection|rejected|claim.*denied|turned down)\b/i,         'denied'],
    // Mental health
    [/\b(ptsd|mental health|counseling|therapy|depression|anxiety|mst|suicide|crisis|vet center|psych)\b/i, 'mental_health'],
    [/\b(mst|military sexual trauma|sexual assault|sexual harassment)\b/i,  'mst'],
    // Healthcare
    [/\b(eligible.*health|qualify.*health|health.*eligib|priority group)\b/i, 'healthcare_eligibility'],
    [/\b(copay|co.?pay|how much.*health|cost.*health|health.*cost)\b/i,    'healthcare_eligibility'],
    [/\b(healthcare|health care|medical|doctor|hospital|enroll.*health|health.*enroll)\b/i, 'healthcare'],
    [/\b(medication|prescription|pharmacy|refill)\b/i,                     'healthcare'],
    // GI Bill
    [/\b(chapter 30|montgomery|mgib|chapter 31|voc.?rehab|vocational)\b/i, 'gi_bill_types'],
    [/\b(bah|housing allowance|yellow ribbon|private school|transfer.*gi|gi.*transfer)\b/i, 'gi_bill_types'],
    [/\b(apply.*gi|gi.*apply|how.*gi bill|education.*apply)\b/i,           'gi_bill_apply'],
    [/\b(gi bill|gibill|chapter 33|post.?9.?11|education benefit|tuition|school)\b/i, 'gi_bill'],
    // Housing
    [/\b(home loan|va loan|house|mortgage|buy.*home|refinanc|irrrl|coe|certificate.*eligib)\b/i, 'home_loan'],
    [/\b(homeless|housing help|hud.?vash|transitional housing|evict|shelter)\b/i, 'housing_help'],
    [/\b(adapted housing|sah grant|sha grant|accessible home|wheelchair.*home)\b/i, 'adapted_housing'],
    // Financial
    [/\b(pension|low income|wartime|aid.*attend|aid and attend|in.?home care|assisted living|nursing home)\b/i, 'pension'],
    [/\b(aid.*attend|attend.*aid|a&a|daily.*activ|help.*bathing|help.*dressing)\b/i, 'aid_attendance'],
    [/\b(debt|owe.*va|va.*owe|overpayment|repay|waiver.*debt|pay back va)\b/i, 'va_debt'],
    [/\b(travel pay|mileage|btsss|beneficiary travel|travel reimburs)\b/i, 'travel_pay'],
    // PACT / toxic exposure
    [/\b(pact act|burn pit|agent orange|radiation|toxic|gulf war|airborne hazard)\b/i, 'pact_act'],
    // Family & survivors
    [/\b(voc rehab|vocational rehab|chapter 31|career|employment.*disab|job.*disab)\b/i, 'voc_rehab'],
    [/\b(dic|dependency indemnity|surviving spouse|widow|widower|spouse.*died|veteran.*died|death.*benefit)\b/i, 'dic'],
    [/\b(champva|champ va|dependent.*health|family.*health|spouse.*insurance)\b/i, 'champva'],
    [/\b(dea|survivors.*edu|dependent.*edu|education.*survivor|fry scholarship)\b/i, 'gi_bill_types'],
    [/\b(bdd|benefits delivery at discharge)\b/i,                          'bdd'],
    // Care & services
    [/\b(community care|mission act|outside va|non.?va|community provider|triwest|optum)\b/i, 'community_care'],
    [/\b(caregiver|pcafc|family.*caregiver|caregiver.*stipend|respite)\b/i, 'caregiver'],
    [/\b(dental|va dental|vision.*va|veteran.*dental)\b/i,                 'dental_vision'],
    [/\b(life.insur|sgli|vgli|s.dvi|vmli|convert.*insur|insurance.*separat)\b/i, 'life_insurance'],
    [/\b(women veteran|female veteran|woman veteran|maternity|fertility|gynecol)\b/i, 'women_veterans'],
    [/\b(national guard|guard.*benefit|reserve.*benefit|title 10|title 32)\b/i, 'guard_reserve'],
    // Records & status
    [/\b(claim status|check.*claim|where.*claim|track.*claim|how long.*claim|pending claim)\b/i, 'claim_status'],
    [/\b(records request|c.file|cfile|service record|dd.?214|military record|medical record.*va|my healthevet)\b/i, 'va_records'],
    [/\b(document|paperwork|records needed)\b/i,                           'documents'],
    // Burial
    [/\b(burial|cemetery|headstone|gravestone|memorial|funeral|interment|pre.need|national.cemetery)\b/i, 'burial'],
    // Navigation
    [/\b(vso|counselor|service officer|speak.*someone|talk.*someone)\b/i,  'vso'],
    [/\b(benefits|what.*benefit|all benefit|other benefit|list.*benefit)\b/i, 'benefits_menu'],
    [/\b(what can you|what do you|what.*cover|what.*help|capabilities|help with what|full list)\b/i, 'capabilities'],
    [/\b(feedback|rate.*service|review.*bot|how.*doing|suggestion)\b/i,    'feedback'],
    // Empathy entry — catches overwhelmed/lost veterans
    [/\b(don.t know where|don.t know what|lost|confused|overwhelmed|struggling|not sure where|where do i start|where to start|help me|i need help|don.t understand|frustrated|give up|no idea)\b/i, 'empathy_intro']
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
    '#vnh{background:linear-gradient(135deg,#b52828,#cc3333);',
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
    'border-top:.5px solid var(--vbd);height:182px;min-height:182px;max-height:182px;',
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

    // Scan tabs
    '.vnsc{flex:1;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;',
    'border:none;background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);',
    'font-family:inherit;transition:all .15s;text-align:center}',
    '.vnsc.act{background:rgba(30,80,160,.55);color:#fff}',
    '.vnsc:hover:not(.act){background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)}',

    // Feedback stars
    '.vnstar{transition:color .1s;user-select:none}',
    '.vnstar.on{color:var(--vg)}',
    '#vnfbtx:focus{border-color:rgba(178,34,52,.5)}',
    '#vnfbsb:hover{background:var(--vrd)}',

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
    var langs = [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' },
      { code: 'vi', label: 'Tiếng Việt' },
      { code: 'ko', label: '한국어' },
      { code: 'tl', label: 'Filipino' }
    ];
    var lbs = langs.map(function (l) {
      var lk  = (!HAS_ML && l.code !== 'en') ? ' lk' : '';
      var act = (l.code === 'en') ? ' act' : '';
      return '<button class="vnlg' + lk + act + '" data-lang="' + l.code + '">' + l.label + '</button>';
    }).join('');

    var tabs = '<div id="vntb">'
      + '<button class="vntb act" data-tab="chat">💬 Veteran Chat</button>'
      + '<button class="vntb" data-tab="feedback">📝 Feedback</button>'
      + '<button class="vntb" data-tab="support">🎧 Support</button>'
      + (HAS_ADMIN ? '<button class="vntb" data-tab="admin">⚙️ Admin Panel</button>' : '')
      + '</div>';

    var adm = HAS_ADMIN
      ? '<div id="vnadp" class="vntp" data-panel="admin">'
        + '<div style="font-size:11px;color:rgba(232,200,74,.85);background:rgba(232,200,74,.07);border:1px solid rgba(232,200,74,.2);border-radius:8px;padding:9px 11px;margin-bottom:12px;line-height:1.5">Update your organization info below. Changes appear instantly in the chat.</div>'
        // Scan tabs
        + '<div id="vnsct" style="display:flex;gap:0;margin-bottom:8px;border-radius:8px;overflow:hidden;border:.5px solid rgba(255,255,255,.1)">'
        + '<button class="vnsc act" data-sc="web">🌐 Website</button>'
        + '<button class="vnsc" data-sc="fb">📘 Facebook</button>'
        + '<button class="vnsc" data-sc="man">✏️ Manual</button>'
        + '</div>'
        // Website scan panel
        + '<div id="vnscw">'
        + '<div style="display:flex;gap:6px;margin-bottom:6px">'
        + '<input id="vnscu" type="text" class="vnai" style="margin-bottom:0" placeholder="https://yourpost.org"/>'
        + '<button id="vnscb" style="padding:6px 10px;border-radius:7px;border:.5px solid rgba(60,120,220,.4);background:rgba(30,80,160,.5);color:#fff;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:inherit">🔍 Scan</button>'
        + '</div>'
        + '<div id="vnscst" style="font-size:11px;min-height:14px;margin-bottom:8px;line-height:1.4"></div>'
        + '</div>'
        // Facebook scan panel
        + '<div id="vnscf" style="display:none">'
        + '<div style="font-size:10.5px;color:rgba(255,255,255,.4);line-height:1.5;margin-bottom:6px">Facebook blocks auto-scanning. Go to your Facebook page → About tab → select all text → copy → paste below.</div>'
        + '<textarea id="vnfbpa" placeholder="Paste your Facebook About page text here…" style="width:100%;height:75px;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.1);border-radius:7px;padding:7px 9px;font-size:11.5px;color:rgba(255,255,255,.85);font-family:inherit;resize:none;outline:none;box-sizing:border-box;margin-bottom:6px"></textarea>'
        + '<button id="vnfbb" style="width:100%;padding:7px;border-radius:7px;border:.5px solid rgba(232,200,74,.3);background:rgba(100,70,0,.4);color:#fff;font-size:11.5px;font-weight:500;cursor:pointer;font-family:inherit">📘 Extract from Facebook Text</button>'
        + '<div id="vnscst2" style="font-size:11px;min-height:14px;margin-top:6px;margin-bottom:4px;line-height:1.4"></div>'
        + '</div>'
        // Manual fields
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

    var fbk = '<div id="vnfbk" class="vntp" data-panel="feedback" style="padding:14px">'
      + '<div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:6px">How was your experience?</div>'
      + '<div style="font-size:11.5px;color:var(--vs);margin-bottom:12px;line-height:1.5">Your feedback helps us improve this service for all veterans.</div>'
      + '<div id="vnstars" style="display:flex;gap:8px;margin-bottom:14px;font-size:24px;cursor:pointer">'
      + '<span class="vnstar" data-v="1">☆</span>'
      + '<span class="vnstar" data-v="2">☆</span>'
      + '<span class="vnstar" data-v="3">☆</span>'
      + '<span class="vnstar" data-v="4">☆</span>'
      + '<span class="vnstar" data-v="5">☆</span>'
      + '</div>'
      + '<textarea id="vnfbtx" placeholder="Share any thoughts, suggestions, or issues (optional)…" '
      + 'style="width:100%;height:80px;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);'
      + 'border-radius:8px;padding:8px 10px;font-size:12px;color:#fff;font-family:inherit;'
      + 'outline:none;resize:none;box-sizing:border-box;margin-bottom:10px"></textarea>'
      + '<button id="vnfbsb" style="width:100%;padding:9px;border-radius:8px;background:var(--vr);'
      + 'border:none;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Submit Feedback</button>'
      + '<div id="vnfbok" style="display:none;text-align:center;font-size:12px;'
      + 'color:rgba(74,222,128,.9);margin-top:10px">✓ Thank you! Your feedback has been received.</div>'
      + '</div>';

    var sup = '<div id="vnsup" class="vntp" data-panel="support" style="padding:14px">'
      + '<div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:6px">Contact Our Team</div>'
      + '<div style="font-size:11.5px;color:var(--vs);margin-bottom:12px;line-height:1.5">Send us a message and we\'ll follow up with you directly.</div>'
      + '<div id="vnsupf">'
      + '<input id="vnsn" type="text" placeholder="Your name" style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;font-size:12px;color:rgba(255,255,255,.85);font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<input id="vnse" type="email" placeholder="Your email address" style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;font-size:12px;color:rgba(255,255,255,.85);font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<select id="vnsy" style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;font-size:12px;color:rgba(255,255,255,.7);font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<option value="">Select topic...</option>'
      + '<option value="benefits">VA Benefits Question</option>'
      + '<option value="claim">Help with my claim</option>'
      + '<option value="appointment">Schedule an appointment</option>'
      + '<option value="documents">Document request</option>'
      + '<option value="other">Other</option>'
      + '</select>'
      + '<textarea id="vnsmsg" placeholder="Describe your question or request…" style="width:100%;height:80px;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;font-size:12px;color:rgba(255,255,255,.85);font-family:inherit;outline:none;resize:none;box-sizing:border-box;margin-bottom:8px"></textarea>'
      + '<div id="vnserr" style="display:none;font-size:11px;color:rgba(255,100,100,.9);margin-bottom:6px"></div>'
      + '<button id="vnssb" style="width:100%;padding:9px;border-radius:8px;background:var(--vr);border:none;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Send Message</button>'
      + '</div>'
      + '<div id="vnstk" style="display:none;text-align:center;padding:12px">'
      + '<div style="font-size:24px;margin-bottom:6px">✅</div>'
      + '<div style="font-size:13px;font-weight:600;color:rgba(255,255,255,.9)">Message sent!</div>'
      + '<div style="font-size:11.5px;color:var(--vs);margin-top:4px;line-height:1.5">Our team will follow up with you by email.</div>'
      + '</div>'
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
      +   tabs
      +   '<div id="vnlb">' + lbs + '</div>'
      +   '<div id="vnpb"><div id="vnpr"></div></div>'
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
      +   adm + fbk + sup
      +   '<div id="vnft">Powered by VetNavigator AI · Veteran-Made &amp; Veteran-Owned</div>'
      + '</div>';
  }

  // ── DOM HELPERS ────────────────────────────────────────────────────────────
  function ge(id) { return document.getElementById(id); }

  function botMsg(html) {
    var row = document.createElement('div'); row.className = 'vnr';
    var av  = document.createElement('div'); av.className  = 'vnav b'; av.textContent = 'VN';
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
    var av  = document.createElement('div'); av.className  = 'vnav b'; av.textContent = 'VN';
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

  // ── WELCOME NODE ───────────────────────────────────────────────────────────
  function buildWelcome() {
    var loc = ORG_CITY ? ' in ' + ORG_CITY : '';
    NODES.welcome.bot = ORG_NAME + ' welcomes you.' + loc + '\n\n'
      + "We're here to help you find and claim every benefit you've earned. This assistant is provided by your VSO — available 24/7 and speaks your language.\n\n"
      + "Let's get started. Which best describes you?";
    NODES.veteran.bot = 'Thank you for your service. 🇺🇸\n\n'
      + ORG_NAME + ' is proud to support you. When did you serve?';
    // Spanish
    if (NODES_I18N.es) {
      var locEs = ORG_CITY ? ' en ' + ORG_CITY : '';
      NODES_I18N.es.welcome.bot = ORG_NAME + ' le da la bienvenida.' + locEs + '\n\nEstamos aqu\xED para ayudarle a encontrar y reclamar cada beneficio que se ha ganado. Este asistente es gratuito, disponible 24/7 y habla su idioma.\n\n\xBFCu\xE1l le describe mejor?';
      NODES_I18N.es.veteran.bot = 'Gracias por su servicio. \uD83C\uDDFA\uD83C\uDDF8\n\n' + ORG_NAME + ' se enorgullece de apoyarle. \xBFCu\xE1ndo sirvi\xF3?';
    }
    // Vietnamese
    if (NODES_I18N.vi) {
      var locVi = ORG_CITY ? ' t\u1EA1i ' + ORG_CITY : '';
      NODES_I18N.vi.welcome.bot = ORG_NAME + ' ch\xE0o \u0111\xF3n b\u1EA1n.' + locVi + '\n\nCh\xFAng t\xF4i \u1EDF \u0111\xE2y \u0111\u1EC3 gi\xFAp b\u1EA1n t\xECm v\xE0 nh\u1EADn m\u1ECDi quy\u1EC1n l\u1EE3i b\u1EA1n \u0111\xE3 x\u1EE9ng \u0111\xE1ng. Tr\u1EE3 l\xFD n\xE0y mi\u1EC5n ph\xED, ho\u1EA1t \u0111\u1ED9ng 24/7 v\xE0 n\xF3i ng\xF4n ng\u1EEF c\u1EE7a b\u1EA1n.\n\n\u0110i\u1EC1u n\xE0o m\xF4 t\u1EA3 \u0111\xFAng nh\u1EA5t v\u1EC1 b\u1EA1n?';
      NODES_I18N.vi.veteran.bot = 'C\u1EA3m \u01A1n b\u1EA1n \u0111\xE3 ph\u1EE5c v\u1EE5 \u0111\u1EA5t n\u01B0\u1EDBc. \uD83C\uDDFA\uD83C\uDDF8\n\n' + ORG_NAME + ' t\u1EF1 h\xE0o \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 b\u1EA1n. B\u1EA1n ph\u1EE5c v\u1EE5 khi n\xE0o?';
    }
    // Korean
    if (NODES_I18N.ko) {
      var locKo = ORG_CITY ? ' (' + ORG_CITY + ')' : '';
      NODES_I18N.ko.welcome.bot = ORG_NAME + '\uC5D0 \uC624\uC2E0 \uAC83\uC744 \uD658\uC601\uD569\uB2C8\uB2E4.' + locKo + '\n\n\uC800\uD76C\uB294 \uADC0\uD558\uAC00 \uBC1B\uC744 \uC790\uACA9\uC774 \uC788\uB294 \uBAA8\uB4E0 \uD61C\uD0DD\uC744 \uCC3E\uACE0 \uC2E0\uCCAD\uD558\uB294 \uB370 \uB3C4\uC6C0\uC744 \uB4DC\uB9AC\uAE30 \uC704\uD574 \uC5EC\uAE30 \uC788\uC2B5\uB2C8\uB2E4. \uC774 \uC548\uB0B4\uC790\uB294 \uBB34\uB8CC\uC774\uBA70 24/7 \uC774\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4.\n\n\uADC0\uD558\uC5D0\uAC8C \uAC00\uC7A5 \uC798 \uB9DE\uB294 \uAC83\uC740 \uBB34\uC5C7\uC785\uB2C8\uAE4C?';
      NODES_I18N.ko.veteran.bot = '\uADC0\uD558\uC758 \uBD09\uC0AC\uC5D0 \uAC10\uC0AC\uB4DC\uB9BD\uB2C8\uB2E4. \uD83C\uDDFA\uD83C\uDDF8\n\n' + ORG_NAME + '\uC740 \uADC0\uD558\uB97C \uC9C0\uC6D0\uD558\uAC8C \uB418\uC5B4 \uC790\uB791\uC2A4\uB7FD\uC2B5\uB2C8\uB2E4. \uC5B8\uC81C \uBCF5\uBB34\uD558\uC168\uC2B5\uB2C8\uAE4C?';
    }
    // Filipino
    if (NODES_I18N.tl) {
      var locTl = ORG_CITY ? ' sa ' + ORG_CITY : '';
      NODES_I18N.tl.welcome.bot = 'Maligayang pagdating sa ' + ORG_NAME + '.' + locTl + '\n\nNandito kami para tulungan kang mahanap at makuha ang bawat benepisyong iyong nakamit. Ang assistant na ito ay libre, available 24/7, at nagsasalita ng iyong wika.\n\nAlin ang pinaka-angkop sa iyo?';
      NODES_I18N.tl.veteran.bot = 'Salamat sa iyong serbisyo. \uD83C\uDDFA\uD83C\uDDF8\n\n' + ORG_NAME + ' ay ipinagmamalaki na suportahan kayo. Kailan kayo naglingkod?';
    }
  }

  // ── VSO NODE ───────────────────────────────────────────────────────────────
  function buildVSO() {
    var c = '';
    if (ORG_MISSION) c += ORG_MISSION + '\n\n';
    if (ORG_ADDR)  c += '📍 ' + ORG_ADDR + (ORG_CITY ? ', ' + ORG_CITY : '') + '\n';
    if (ORG_HOURS) c += '🕐 ' + ORG_HOURS + '\n';
    if (ORG_PHONE) c += '📞 ' + ORG_PHONE + '\n';
    if (ORG_EMAIL) c += '✉️ ' + ORG_EMAIL + '\n';
    if (ORG_WEB)   c += '🌐 ' + ORG_WEB;
    var ld = ORG_LEADERS.length
      ? '\n\n<strong>Leadership:</strong>\n' + ORG_LEADERS.map(function (l) { return '• ' + l; }).join('\n')
      : '';
    var nextEvent = ORG_EVENTS.length ? ORG_EVENTS[0] : null;
    var evLine = nextEvent ? '\n\n📅 <strong>Next event:</strong> ' + nextEvent : '';
    NODES.vso.bot = 'Your VSO counselors are here to help — free of charge.\n\n<strong>'
      + ORG_NAME + '</strong>\n'
      + (c || 'Contact your local VSO office.') + ld + evLine
      + '\n\n100% free. Walk-ins welcome. 🇺🇸';
    NODES.vso.chips = ORG_EVENTS.length
      ? ['Upcoming events', 'How do I file a claim?', 'See all benefits']
      : ['How do I file a claim?', 'See all benefits', 'Start over'];

    // ── org_events node ──────────────────────────────────────────────────────
    if (ORG_EVENTS.length) {
      NODES.org_events = {
        pct: 10,
        bot: '📅 <strong>Upcoming events at ' + ORG_NAME + ':</strong>\n\n'
          + ORG_EVENTS.map(function (e, i) { return (i === 0 ? '⭐ ' : '• ') + e; }).join('\n')
          + '\n\n<strong>All events are open to veterans, family members, and the community.</strong>\n\nStop by — no appointment needed. Our counselors are here to help.',
        chips: ['Find a VSO counselor', 'See all benefits', 'Start over']
      };
      CHIP_MAP['Upcoming events'] = 'org_events';
    }
  }

  // ── RENDER NODE ────────────────────────────────────────────────────────────
  function getNode(key) {
    // Check for language-specific override, fall back to English NODES
    if (lang !== 'en' && NODES_I18N[lang] && NODES_I18N[lang][key]) {
      // Merge: translated node overrides English, but inherit missing fields
      var base = NODES[key] || {};
      var tr   = NODES_I18N[lang][key];
      return {
        pct:   tr.pct   !== undefined ? tr.pct   : base.pct,
        bot:   tr.bot   !== undefined ? tr.bot   : base.bot,
        cards: tr.cards !== undefined ? tr.cards : base.cards,
        chips: tr.chips !== undefined ? tr.chips : base.chips
      };
    }
    return NODES[key];
  }

  function renderNode(key) {
    var node = getNode(key); if (!node) return;
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

  function renderGated(key) {
    var label = key ? topicLabel(key) : 'that topic';
    botMsg("I'd love to help with <strong>" + label + "</strong>.\n\nFor this topic, I'd recommend speaking directly with your VSO counselor — they can give you personalized guidance at no cost and walk you through the details step by step.");
    clearOpts();
    mkChips(['Find a VSO counselor', 'See all benefits', 'Start over']);

    // Silent upsell notification to VetNavigator
    if (BREVO_KEY && ORG_EMAIL) {
      var tierNeeded = TOPIC_TIERS[key] || 2;
      var planNeeded = tierNeeded >= 3 ? 'Standard' : 'Starter';
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
        body: JSON.stringify({
          sender:  { name: 'VetNavigator AI', email: SUPPORT_EMAIL },
          to:      [{ email: SUPPORT_EMAIL }],
          subject: '📊 Upgrade Opportunity — ' + ORG_NAME + ' · ' + label,
          htmlContent: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">'
            + '<div style="background:#1a3a6b;padding:20px 24px;border-radius:10px 10px 0 0;color:#fff;">'
            + '<h2 style="margin:0;font-size:18px;">📊 Veteran Requested Gated Topic</h2></div>'
            + '<div style="padding:20px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">'
            + '<p style="font-size:14px;color:#374151;margin:0 0 12px;"><strong>' + ORG_NAME + '</strong> (License: ' + LICENSE_KEY + ')</p>'
            + '<p style="font-size:14px;color:#374151;margin:0 0 12px;">A veteran on their site asked about <strong>' + label + '</strong>, which requires the <strong>' + planNeeded + '</strong> plan or above.</p>'
            + '<p style="font-size:13px;color:#6b7280;margin:0 0 16px;">Consider reaching out with a friendly note letting them know their visitors are asking about this topic.</p>'
            + '<div style="background:#f9f7f3;border-radius:8px;padding:14px 16px;font-size:13px;color:#374151;border-left:3px solid #e8c84a;">'
            + '<strong>Suggested outreach:</strong><br>"Hi [name], just a quick heads-up — veterans visiting your site have been asking about ' + label + '. Your ' + planNeeded + ' plan would cover this topic and more. Happy to walk you through it if you\'re interested!"'
            + '</div></div></div>'
        })
      }).catch(function () {});
    }
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
    if (IS_DEMO) return null;
    var checks = [
      // Tier 2 — Starter+
      { topic: 'pact_act',              level: 2, re: /pact act|burn pit|agent orange|toxic exposure|gulf war illness/i },
      { topic: 'voc_rehab',             level: 2, re: /voc rehab|vocational rehab|chapter 31|voc.*rehab/i },
      { topic: 'dic',                   level: 2, re: /\bdic\b|dependency.*indemnity|surviving spouse.*compensation/i },
      { topic: 'champva',               level: 2, re: /champva/i },
      { topic: 'bdd',                   level: 2, re: /\bbdd\b|benefits delivery at discharge/i },
      { topic: 'rating_explained',      level: 2, re: /how.*rating.*work|rating.*explained|what.*rating.*mean|disability.*rating.*percent/i },
      { topic: 'rating_increase',       level: 2, re: /increase.*rating|higher rating|appeal.*rating|raise.*rating|improve.*rating/i },
      { topic: 'cp_exam',               level: 2, re: /c&p exam|compensation.*pension exam|c and p exam|cp exam/i },
      { topic: 'gi_bill_apply',         level: 2, re: /apply.*gi bill|gi bill.*application|how.*use gi bill|gi bill.*how/i },
      { topic: 'gi_bill_transfer',      level: 2, re: /transfer.*gi bill|gi bill.*transfer/i },
      { topic: 'home_loan_apply',       level: 2, re: /apply.*va loan|va.*home loan.*apply|how.*get va loan|va loan.*apply/i },
      { topic: 'healthcare_enroll',     level: 2, re: /enroll.*va health|va.*healthcare.*enroll|sign up.*va health|register.*va/i },
      { topic: 'healthcare_eligibility',level: 2, re: /eligible.*va health|qualify.*va health|va health.*eligible|do i qualify.*va/i },
      // Tier 3 — Standard+
      { topic: 'tdiu',                  level: 3, re: /\btdiu\b|total disability|individual unemployability|unemployable/i },
      { topic: 'nexus',                 level: 3, re: /nexus letter|buddy statement|nexus.*letter/i },
      { topic: 'mental_health',         level: 3, re: /ptsd|mental health|counseling|vet center|therapy.*veteran|mst|military sexual/i },
      { topic: 'pension',               level: 3, re: /va pension|wartime.*pension|pension.*veteran/i },
      { topic: 'aid_attendance',        level: 3, re: /aid.*attendance|aid and attendance/i },
      { topic: 'burial',                level: 3, re: /burial benefit|funeral.*va|va.*burial|burial.*allowance/i },
      { topic: 'caregiver',             level: 3, re: /caregiver.*program|va.*caregiver|program of comprehensive/i },
      { topic: 'dental_vision',         level: 3, re: /va dental|veteran.*dental|va vision|veteran.*vision/i },
      { topic: 'claim_status',          level: 3, re: /claim status|where.*my claim|check.*claim|track.*claim/i },
      { topic: 'va_debt',               level: 3, re: /va debt|overpayment.*va|va.*debt|owe.*va/i },
      { topic: 'mst',                   level: 3, re: /\bmst\b|military sexual trauma/i },
      { topic: 'travel_pay',            level: 3, re: /travel pay|mileage.*va|va.*travel reimburs|travel.*reimburs/i },
      { topic: 'community_care',        level: 3, re: /community care|outside.*va.*doctor|non.*va.*care/i },
      { topic: 'life_insurance',        level: 3, re: /sgli|vgli|life insurance.*veteran|veteran.*life insurance/i },
      { topic: 'housing_help',          level: 3, re: /hud.*vash|homeless.*veteran|veteran.*housing.*assist/i },
      { topic: 'women_veterans',        level: 3, re: /women veteran|female veteran|va.*women/i },
      { topic: 'guard_reserve',         level: 3, re: /national guard|reserve.*benefit|guard.*benefit/i },
      { topic: 'va_records',            level: 3, re: /va records|service record|military record|dd214/i }
    ];
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].re.test(text) && TIER_LVL < checks[i].level) return checks[i].topic;
    }
    return null;
  }

  // ── ROUTE TEXT ─────────────────────────────────────────────────────────────
  function route(text) {
    var t = text.trim();
    // Check language-specific chip map first
    if (lang !== 'en' && CHIP_MAP_I18N[lang] && CHIP_MAP_I18N[lang][t]) return CHIP_MAP_I18N[lang][t];
    if (CHIP_MAP[t]) return CHIP_MAP[t];
    for (var i = 0; i < KW.length; i++) {
      if (KW[i][0].test(t)) return KW[i][1];
    }
    return null;
  }

  // ── AI CALL ────────────────────────────────────────────────────────────────
  function removeLookingUp() {
    var msgs = ge('vnms');
    var rows = msgs.querySelectorAll('.vnr');
    for (var i = rows.length - 1; i >= 0; i--) {
      var bub = rows[i].querySelector('.vnbb.b');
      if (bub && bub.textContent === 'Looking that up for you...') { rows[i].remove(); break; }
    }
  }

  function callAI(msg) {
    showTyp();
    botMsg('Looking that up for you...');
    fetch(VN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system:     'You are a warm, knowledgeable VA benefits assistant for ' + ORG_NAME
          + '. Your role is to help veterans understand and access their VA benefits.'
          + '\n\nGuidelines:'
          + '\n- Be empathetic, respectful, and encouraging — many veterans find this process overwhelming'
          + '\n- Give clear, practical answers with specific next steps'
          + '\n- Include relevant dollar amounts, deadlines, or eligibility thresholds when helpful'
          + '\n- Always recommend a free VSO counselor for complex or personalized situations'
          + '\n- If the question involves crisis, mental health, or safety — immediately provide the Veterans Crisis Line: dial 988 press 1'
          + '\n- Keep responses focused but thorough — 4-8 sentences is ideal'
          + '\n- End every response with one short, specific follow-up suggestion the veteran can tap'
          + '\n- Format: answer first, then on a new line starting with Suggested next: followed by the suggestion'
          + '\n- Only answer questions about VA benefits, veteran services, and related topics',
        messages: [{ role: 'user', content: msg }]
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      removeLookingUp();
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
      removeLookingUp();
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
      var gatedTopic = gatedFreeText(text);
      if (gatedTopic) { setTimeout(function () { renderGated(gatedTopic); }, 400); return; }
      callAI(text);
      return;
    }
    if (!canAccess(key)) { setTimeout(function () { renderGated(key); }, 400); return; }
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
      buildWelcome();
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

    // Persist to server if we have a real license key
    if (LICENSE_KEY && LICENSE_KEY.startsWith('VN-') && LICENSE_KEY !== 'VN-DEMO') {
      fetch(VN_API + '/config?key=' + encodeURIComponent(LICENSE_KEY), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName:    ORG_NAME,
          orgCity:    ORG_CITY,
          orgPhone:   ORG_PHONE,
          orgEmail:   ORG_EMAIL,
          orgHours:   ORG_HOURS,
          events:     ORG_EVENTS,
          leaders:    ORG_LEADERS
        })
      }).catch(function () { /* silent — local save still worked */ });
    }
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

    // Admin panel wiring (Starter+)
    if (HAS_ADMIN) {
      ge('vnadde').addEventListener('click', vnAE);
      ge('vnadda').addEventListener('click', vnAL);
      ge('vnsv').addEventListener('click', vnSave);
      populateAdmin();

      // Scan tab switching
      document.querySelectorAll('.vnsc').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var sc = this.getAttribute('data-sc');
          document.querySelectorAll('.vnsc').forEach(function (b) { b.classList.remove('act'); });
          this.classList.add('act');
          ge('vnscw').style.display  = sc === 'web' ? 'block' : 'none';
          ge('vnscf').style.display  = sc === 'fb'  ? 'block' : 'none';
        });
      });

      // Helper: fill scanned data into admin fields
      function fillScanData(data, statusEl) {
        var found = [];
        if (data.orgName) { ge('an').value = data.orgName; found.push('name'); }
        if (data.city)    { ge('ac').value = data.city;    found.push('city'); }
        if (data.phone)   { ge('ap').value = data.phone;   found.push('phone'); }
        if (data.email)   { ge('ae').value = data.email;   found.push('email'); }
        if (data.hours)   { ge('ah').value = data.hours;   found.push('hours'); }
        if (data.events && data.events.length) {
          ge('aev').innerHTML = '';
          data.events.forEach(function (e) {
            if (!e) return;
            var r = document.createElement('div'); r.className = 'vnadr';
            r.innerHTML = '<input class="vnai" type="text" value="' + e.replace(/"/g, '&quot;') + '"/>'
              + '<button class="vnarm" onclick="this.parentNode.remove()">×</button>';
            ge('aev').appendChild(r);
          });
          found.push(data.events.length + ' event(s)');
        }
        if (data.leaders && data.leaders.length) {
          ge('ald').innerHTML = '';
          data.leaders.forEach(function (l) {
            if (!l) return;
            var r = document.createElement('div'); r.className = 'vnadr';
            r.innerHTML = '<input class="vnai" type="text" value="' + l.replace(/"/g, '&quot;') + '"/>'
              + '<button class="vnarm" onclick="this.parentNode.remove()">×</button>';
            ge('ald').appendChild(r);
          });
          found.push(data.leaders.length + ' leader(s)');
        }
        if (found.length) {
          statusEl.style.color = 'rgba(74,222,128,.9)';
          statusEl.textContent = '✓ Found: ' + found.join(', ') + '. Review below and hit Save.';
        } else {
          statusEl.style.color = 'rgba(255,120,120,.85)';
          statusEl.textContent = 'Could not extract details — fill in manually below.';
        }
      }

      // Website scan
      ge('vnscb').addEventListener('click', function () {
        var url = ge('vnscu').value.trim();
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://' + url;
        var btn = this; btn.disabled = true;
        var st  = ge('vnscst');
        st.style.color = 'rgba(232,200,74,.85)';
        st.textContent = '🔍 Fetching your website…';
        fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var pageText = (j.contents || '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s{3,}/g, '  ')
              .substring(0, 6000);
            if (!pageText || pageText.length < 80) {
              st.style.color   = 'rgba(255,120,120,.85)';
              st.textContent   = 'Page had little readable content. Fill in manually.';
              btn.disabled = false; return;
            }
            st.textContent = '🤖 AI is reading your website…';
            return fetch(VN_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 600,
                system: 'Extract VSO organization info from website text. Respond with valid JSON only — no markdown, no explanation. Keys: orgName, city, address, phone, email, hours, events (array max 6), leaders (array max 8). Empty string or [] if not found.',
                messages: [{ role: 'user', content: pageText }]
              })
            });
          })
          .then(function (r) { return r && r.json(); })
          .then(function (d) {
            if (!d) return;
            var txt = ((d.content || [])[0] || {}).text || '';
            txt = txt.replace(/```json|```/g, '').trim();
            try { fillScanData(JSON.parse(txt), ge('vnscst')); }
            catch (e) {
              ge('vnscst').style.color = 'rgba(255,120,120,.85)';
              ge('vnscst').textContent = 'AI scan failed — fill in manually.';
            }
            btn.disabled = false;
          })
          .catch(function () {
            ge('vnscst').style.color = 'rgba(255,120,120,.85)';
            ge('vnscst').textContent = 'Could not reach website — fill in manually.';
            btn.disabled = false;
          });
      });

      // Facebook text scan
      ge('vnfbb').addEventListener('click', function () {
        var paste = ge('vnfbpa').value.trim();
        if (!paste || paste.length < 40) {
          ge('vnscst2').style.color   = 'rgba(255,120,120,.85)';
          ge('vnscst2').textContent   = 'Please paste your Facebook About text first.';
          return;
        }
        var btn = this; btn.disabled = true;
        var st  = ge('vnscst2');
        st.style.color = 'rgba(232,200,74,.85)';
        st.textContent = '📘 AI is reading your Facebook info…';
        fetch(VN_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 600,
            system: 'Extract VSO organization info from pasted Facebook About page text. Respond with valid JSON only — no markdown, no explanation. Keys: orgName, city, address, phone, email, hours, events (array max 6), leaders (array as "Title – Name", max 8). Empty string or [] if not found.',
            messages: [{ role: 'user', content: paste.substring(0, 6000) }]
          })
        })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var txt = ((d.content || [])[0] || {}).text || '';
          txt = txt.replace(/```json|```/g, '').trim();
          try { fillScanData(JSON.parse(txt), ge('vnscst2')); }
          catch (e) {
            st.style.color = 'rgba(255,120,120,.85)';
            st.textContent = 'Could not extract info — fill in manually.';
          }
          btn.disabled = false;
        })
        .catch(function () {
          st.style.color = 'rgba(255,120,120,.85)';
          st.textContent = 'Something went wrong — fill in manually.';
          btn.disabled = false;
        });
      });
    }

    // Star rating
    var starRating = 0;
    document.querySelectorAll('.vnstar').forEach(function (star) {
      star.addEventListener('click', function () {
        starRating = parseInt(this.getAttribute('data-v'));
        document.querySelectorAll('.vnstar').forEach(function (s) {
          var v = parseInt(s.getAttribute('data-v'));
          s.textContent = v <= starRating ? '★' : '☆';
          s.classList.toggle('on', v <= starRating);
        });
      });
    });

    // Feedback submit
    ge('vnfbsb').addEventListener('click', function () {
      var rating = starRating;
      var text   = ge('vnfbtx').value.trim();
      if (!rating && !text) return;
      if (BREVO_KEY) {
        var body = {
          sender:      { name: 'VetNavigator Widget', email: SUPPORT_EMAIL },
          to:          [{ email: SUPPORT_EMAIL }],
          subject:     '⭐ Widget Feedback — ' + ORG_NAME + ' (' + rating + '/5)',
          htmlContent: '<p><strong>Rating:</strong> ' + rating + '/5</p>'
            + '<p><strong>Post:</strong> ' + ORG_NAME + '</p>'
            + '<p><strong>License:</strong> ' + LICENSE_KEY + '</p>'
            + (text ? '<p><strong>Comments:</strong><br>' + text + '</p>' : '<p><em>No written feedback</em></p>')
        };
        fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
          body: JSON.stringify(body)
        });
      }
      ge('vnfbsb').style.display = 'none';
      ge('vnfbok').style.display = 'block';
    });

    // Support form submit
    ge('vnssb').addEventListener('click', function () {
      var name  = ge('vnsn').value.trim();
      var email = ge('vnse').value.trim();
      var topic = ge('vnsy').value;
      var msg   = ge('vnsmsg').value.trim();
      var errEl = ge('vnserr');
      errEl.style.display = 'none';
      if (!name || !email || !msg) {
        errEl.textContent = 'Please fill in your name, email, and message.';
        errEl.style.display = 'block';
        return;
      }
      if (BREVO_KEY) {
        var body = {
          sender:      { name: 'VetNavigator Widget', email: SUPPORT_EMAIL },
          to:          [{ email: SUPPORT_EMAIL }],
          replyTo:     { name: name, email: email },
          subject:     '🎧 Support Request — ' + ORG_NAME + (topic ? ' (' + topic + ')' : ''),
          htmlContent: '<p><strong>From:</strong> ' + name + ' (' + email + ')</p>'
            + '<p><strong>Post:</strong> ' + ORG_NAME + '</p>'
            + '<p><strong>License:</strong> ' + LICENSE_KEY + '</p>'
            + (topic ? '<p><strong>Topic:</strong> ' + topic + '</p>' : '')
            + '<p><strong>Message:</strong><br>' + msg.replace(/\n/g, '<br>') + '</p>'
        };
        fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
          body: JSON.stringify(body)
        });
      }
      ge('vnsupf').style.display = 'none';
      ge('vnstk').style.display  = 'block';
    });

    // Microphone
    initMic();

    // Notif bubble after 4s
    setTimeout(showNotif, 4000);
  }

  // ── BOOT ───────────────────────────────────────────────────────────────────
  function boot() {
    loadConfig(function () {
      init();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
