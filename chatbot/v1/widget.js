/*!
 * VetNavigator AI — Embeddable Chatbot Widget
 * Version: 1.0.0
 * URL: https://cdn.vetnavigator.ai/chatbot/v1/widget.js
 * © 2026 VetNavigator AI · Veteran-Made & Veteran-Owned
 *
 * Usage:
 *   <script>
 *     window.VetNavigatorConfig = {
 *       orgId:      "vn-post-1234-abc1",
 *       plan:       "standard",
 *       orgName:    "VFW Post 1234",
 *       orgCity:    "Riverside, CA",
 *       orgAddr:    "1234 Veterans Blvd",
 *       orgPhone:   "(951) 555-0100",
 *       orgEmail:   "contact@vfwpost1234.org",
 *       orgWeb:     "https://vfwpost1234.org",
 *       orgHours:   "Mon-Fri 9am-5pm",
 *       orgMission: "Serving Riverside County veterans since 1946.",
 *       orgEvents:  ["Monthly Meeting — 1st Tuesday 7:00 PM"],
 *       orgLeaders: ["Commander John Martinez"],
 *       lang:       "en",
 *       webhook:    "https://services.leadconnectorhq.com/hooks/..."
 *     };
 *   </script>
 *   <script src="https://cdn.vetnavigator.ai/chatbot/v1/widget.js" defer></script>
 */

(function() {
  'use strict';

  // ── Guard: don't load twice ────────────────────────────────────────────────
  if (window.__vnLoaded) return;
  window.__vnLoaded = true;

  // ── API Proxy (Cloudflare Worker) ──────────────────────────────────────────
  var VN_API_URL = 'https://vetnavigator-chat.richard-y-choi.workers.dev';

  // ── Read client config ─────────────────────────────────────────────────────
  var cfg = window.VetNavigatorConfig || {};

  // ── Apply config to global org vars (used throughout chatbot engine) ───────
  var cwOrgName    = cfg.orgName    || 'VetNavigator';
  var cwOrgCity    = cfg.orgCity    || '';
  var cwOrgAddr    = cfg.orgAddr    || '';
  var cwOrgPhone   = cfg.orgPhone   || '';
  var cwOrgEmail   = cfg.orgEmail   || '';
  var cwOrgWeb     = cfg.orgWeb     || '';
  var cwOrgHours   = cfg.orgHours   || '';
  var cwOrgEvents  = cfg.orgEvents  || [];
  var cwOrgLeaders = cfg.orgLeaders || [];
  var cwOrgMission = cfg.orgMission || '';
  var cwLang       = cfg.lang       || 'en';
  var GHL_WEBHOOK  = cfg.webhook    || '';

  // ── Inject CSS ─────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.id  = 'vn-widget-styles';
  style.textContent = '\n:root{--navy:#0a1628;--red:#B22234;--red-dark:#8b1a26;--gold:#e8c84a;--white:#ffffff;--off-white:#f4f1eb;--gray:#6b7280;--light:#f9f7f3;}\n*{box-sizing:border-box;margin:0;padding:0;}\nhtml{scroll-behavior:smooth;}\nbody{font-family:\'DM Sans\',sans-serif;background:var(--off-white);color:var(--navy);overflow-x:hidden;}\n\n/* NAV */\nnav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:16px 48px;background:rgba(10,22,40,0.97);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.06);}\n.nav-logo{display:flex;align-items:center;gap:10px;}\n.nav-logo .logo-icon{width:34px;height:34px;background:var(--red);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;}\n.nav-logo .logo-text{font-family:\'Playfair Display\',serif;font-size:18px;color:#fff;font-weight:700;}\n.nav-links{display:flex;align-items:center;gap:32px;}\n.nav-links a{color:rgba(255,255,255,0.6);text-decoration:none;font-size:14px;transition:color 0.2s;}\n.nav-links a:hover{color:#fff;}\n.nav-right{display:flex;align-items:center;gap:10px;}\n.nav-cta{background:var(--red);color:#fff;padding:9px 22px;border-radius:8px;font-size:13.5px;font-weight:500;text-decoration:none;transition:background 0.2s;}\n.nav-cta:hover{background:var(--red-dark);}\n#hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;background:none;border:none;cursor:pointer;padding:6px;width:38px;height:38px;}\n#hamburger span{display:block;height:2px;width:22px;background:#fff;border-radius:2px;transition:all 0.25s;}\n#hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}\n#hamburger.open span:nth-child(2){opacity:0;transform:scaleX(0);}\n#hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}\n#mobile-nav{display:none;position:fixed;top:58px;left:0;right:0;z-index:199;background:rgba(10,22,40,0.99);border-bottom:1px solid rgba(255,255,255,0.08);}\n#mobile-nav.open{display:block;}\n#mobile-nav a{display:block;padding:15px 24px;color:rgba(255,255,255,0.85);text-decoration:none;font-size:16px;border-bottom:1px solid rgba(255,255,255,0.05);}\n#mobile-nav a:active{background:rgba(255,255,255,0.05);}\n\n/* HERO */\n#hero{min-height:100vh;background:var(--navy);position:relative;overflow:hidden;display:flex;align-items:center;padding:120px 48px 80px;}\n.hero-flag{position:absolute;inset:0;background:repeating-linear-gradient(180deg,#B22234 0,#B22234 32px,rgba(255,255,255,0.03) 32px,rgba(255,255,255,0.03) 64px);opacity:0.07;}\n.hero-glow-r{position:absolute;top:-20%;right:-10%;width:600px;height:600px;background:radial-gradient(circle,rgba(178,34,52,0.18) 0%,transparent 70%);pointer-events:none;}\n.hero-glow-b{position:absolute;bottom:-20%;left:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(30,60,120,0.3) 0%,transparent 70%);pointer-events:none;}\n.hero-inner{max-width:1200px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 520px;gap:60px;align-items:center;position:relative;z-index:2;}\n.hero-tag{display:inline-flex;align-items:center;gap:8px;background:rgba(232,200,74,0.1);border:1px solid rgba(232,200,74,0.25);color:var(--gold);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:7px 14px;border-radius:20px;margin-bottom:28px;}\n.tag-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);}\nh1{font-family:\'Playfair Display\',serif;font-size:clamp(36px,4.5vw,58px);font-weight:900;color:#fff;line-height:1.1;margin-bottom:22px;letter-spacing:-1px;}\nh1 em{color:var(--gold);font-style:normal;}\n.hero-sub{font-size:17px;color:rgba(255,255,255,0.55);line-height:1.75;max-width:480px;margin-bottom:36px;}\n.hero-btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:48px;}\n.btn-primary{background:var(--red);color:#fff;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:500;text-decoration:none;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px;}\n.btn-primary:hover{background:var(--red-dark);transform:translateY(-2px);}\n.btn-secondary{background:transparent;color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);padding:14px 28px;border-radius:10px;font-size:15px;text-decoration:none;transition:all 0.2s;}\n.btn-secondary:hover{border-color:rgba(255,255,255,0.5);color:#fff;}\n.hero-stats{display:flex;gap:40px;flex-wrap:wrap;}\n.stat .num{font-family:\'Playfair Display\',serif;font-size:28px;font-weight:900;color:#fff;}\n.stat .lbl{font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px;}\n.browser-chrome{background:#1e2d45;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 40px 100px rgba(0,0,0,0.5);}\n.browser-bar{background:#152030;padding:10px 14px;display:flex;align-items:center;gap:10px;}\n.browser-dots{display:flex;gap:5px;}\n.browser-dots span{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.12);}\n.browser-url{flex:1;background:rgba(255,255,255,0.06);border-radius:5px;padding:4px 10px;font-size:11px;color:rgba(255,255,255,0.3);font-family:monospace;}\n.mini-site-hdr{background:#0a1628;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;}\n.mini-site-hdr .org{color:#fff;font-size:12px;font-weight:600;}\n.mini-site-hdr .links{display:flex;gap:12px;}\n.mini-site-hdr .links span{color:rgba(255,255,255,0.5);font-size:10px;}\n.mini-hero{background:linear-gradient(135deg,#0a1628,#1a3060);padding:18px 14px;}\n.mini-hero h3{color:#fff;font-size:14px;font-weight:700;margin-bottom:4px;}\n.mini-hero p{color:rgba(255,255,255,0.5);font-size:11px;}\n.mini-chat-wrap{background:rgba(10,22,40,0.95);border-top:1px solid rgba(255,255,255,0.08);padding:12px;}\n.mini-chat-hdr{display:flex;align-items:center;gap:8px;background:var(--red);border-radius:8px 8px 0 0;padding:8px 12px;}\n.mini-chat-hdr .ico{width:26px;height:26px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;}\n.mini-chat-hdr .ttl{color:#fff;font-size:11px;font-weight:500;}\n.mini-chat-hdr .onl{color:rgba(255,255,255,0.6);font-size:10px;display:flex;align-items:center;gap:4px;}\n.mini-dot{width:5px;height:5px;border-radius:50%;background:#4ade80;}\n.mini-msgs{background:rgba(8,18,36,0.9);padding:10px;min-height:100px;display:flex;flex-direction:column;gap:7px;}\n.mini-msg{display:flex;gap:6px;align-items:flex-end;}\n.mini-msg.u{flex-direction:row-reverse;}\n.mini-av{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:600;}\n.mini-av.b{background:var(--red);color:#fff;}\n.mini-av.u{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);}\n.mini-bub{padding:6px 9px;border-radius:9px;font-size:10px;line-height:1.5;max-width:80%;}\n.mini-bub.b{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);border-bottom-left-radius:2px;}\n.mini-bub.u{background:var(--red);color:#fff;border-bottom-right-radius:2px;}\n.mini-chips{display:flex;flex-wrap:wrap;gap:4px;padding:7px 10px;background:rgba(0,0,0,0.3);}\n.mini-chip{font-size:9px;padding:3px 8px;border-radius:10px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.75);}\n\n/* SECTIONS */\n#how{background:var(--off-white);padding:100px 48px;}\n.section-inner{max-width:1100px;margin:0 auto;}\n.section-tag{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--red);margin-bottom:12px;}\n.section-title{font-family:\'Playfair Display\',serif;font-size:clamp(28px,3.5vw,44px);font-weight:900;color:var(--navy);line-height:1.15;margin-bottom:16px;letter-spacing:-0.5px;}\n.section-sub{font-size:16px;color:var(--gray);line-height:1.7;max-width:540px;margin-bottom:60px;}\n.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;}\n.step-card{background:#fff;border-radius:16px;padding:32px 28px;border:1px solid rgba(10,22,40,0.08);transition:transform 0.2s,box-shadow 0.2s;position:relative;overflow:hidden;}\n.step-card::before{content:\'\';position:absolute;top:0;left:0;right:0;height:3px;background:var(--red);}\n.step-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(10,22,40,0.1);}\n.step-num{font-family:\'Playfair Display\',serif;font-size:48px;font-weight:900;color:rgba(178,34,52,0.1);line-height:1;margin-bottom:16px;}\n.step-icon{font-size:28px;margin-bottom:14px;}\n.step-title{font-size:17px;font-weight:600;color:var(--navy);margin-bottom:8px;}\n.step-desc{font-size:14px;color:var(--gray);line-height:1.7;}\n\n/* DEMO */\n#demo{background:var(--navy);padding:100px 48px;position:relative;overflow:hidden;}\n#demo::before{content:\'\';position:absolute;inset:0;background:repeating-linear-gradient(180deg,#B22234 0,#B22234 30px,transparent 30px,transparent 60px);opacity:0.05;}\n.demo-inner{max-width:1100px;margin:0 auto;position:relative;z-index:2;}\n.demo-header{text-align:center;margin-bottom:60px;}\n.demo-header .section-tag{color:var(--gold);}\n.demo-header .section-title{color:#fff;}\n.demo-header .section-sub{color:rgba(255,255,255,0.5);margin:0 auto;}\n.demo-layout{display:grid;grid-template-columns:1fr minmax(0,440px);gap:48px;align-items:start;}\n.demo-info h3{font-family:\'Playfair Display\',serif;font-size:26px;color:#fff;font-weight:700;margin-bottom:16px;line-height:1.3;}\n.demo-info p{font-size:15px;color:rgba(255,255,255,0.55);line-height:1.75;margin-bottom:24px;}\n.feature-list{display:flex;flex-direction:column;gap:14px;}\n.feature-item{display:flex;gap:14px;align-items:flex-start;}\n.feature-icon{width:36px;height:36px;border-radius:8px;background:rgba(232,200,74,0.1);border:1px solid rgba(232,200,74,0.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;margin-top:2px;}\n.feature-text .ft-title{font-size:14px;font-weight:500;color:#fff;margin-bottom:3px;}\n.feature-text .ft-desc{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;}\n.multilang-badge{display:inline-flex;align-items:center;background:rgba(232,200,74,0.12);border:1px solid rgba(232,200,74,0.3);color:var(--gold);font-size:10px;font-weight:600;padding:3px 8px;border-radius:10px;margin-left:6px;}\n\n/* CHATBOT WIDGET */\n#chatbot-widget{background:rgba(8,18,36,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,0.4);}\n#cw-header{background:linear-gradient(135deg,#9b1c2e,#B22234);padding:14px 18px;display:flex;align-items:center;gap:11px;}\n#cw-header-icon{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}\n#cw-org-name{color:#fff;font-size:14px;font-weight:500;}\n#cw-status{color:rgba(255,255,255,0.55);font-size:11px;margin-top:2px;display:flex;align-items:center;gap:4px;}\n.cw-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;flex-shrink:0;}\n#cw-tabs{display:flex;background:rgba(0,0,0,0.35);border-bottom:1px solid rgba(255,255,255,0.07);}\n.cw-tab{flex:1;padding:9px 6px;font-size:12px;font-weight:500;font-family:\'DM Sans\',sans-serif;background:transparent;border:none;color:rgba(255,255,255,0.45);cursor:pointer;transition:all 0.15s;border-bottom:2px solid transparent;}\n.cw-tab:hover{color:rgba(255,255,255,0.8);}\n.cw-tab.active{color:#fff;border-bottom-color:#B22234;}\n#cw-lang-bar{display:flex;align-items:center;gap:5px;padding:7px 12px;background:rgba(0,0,0,0.35);border-bottom:0.5px solid rgba(255,255,255,0.07);overflow-x:auto;}\n#cw-lang-bar::-webkit-scrollbar{display:none;}\n.cw-lang-btn{font-size:10.5px;padding:3px 9px;border-radius:12px;border:0.5px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);cursor:pointer;white-space:nowrap;transition:all 0.15s;font-family:\'DM Sans\',sans-serif;}\n.cw-lang-btn:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);}\n.cw-lang-btn.active{background:rgba(178,34,52,0.4);border-color:rgba(178,34,52,0.7);color:#fff;}\n#cw-prog-bar{height:2px;background:rgba(255,255,255,0.08);}\n#cw-prog{height:100%;background:linear-gradient(90deg,#B22234,#ffd700);transition:width 0.5s;width:0%;}\n#cw-msgs{padding:14px 12px;min-height:260px;max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:11px;scroll-behavior:smooth;}\n#cw-msgs::-webkit-scrollbar{width:3px;}\n#cw-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px;}\n.cw-row{display:flex;gap:8px;align-items:flex-end;}\n.cw-row.user{flex-direction:row-reverse;}\n.cw-av{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;}\n.cw-av.bot{background:var(--red);color:#fff;}\n.cw-av.user{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1);}\n.cw-bub{max-width:82%;padding:9px 12px;font-size:12.5px;line-height:1.65;border-radius:13px;}\n.cw-bub.bot{background:rgba(255,255,255,0.07);border:0.5px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.9);border-bottom-left-radius:3px;}\n.cw-bub.user{background:linear-gradient(135deg,#9b1c2e,#B22234);color:#fff;border-bottom-right-radius:3px;}\n#cw-options{padding:10px 12px 12px;background:rgba(0,0,0,0.25);border-top:0.5px solid rgba(255,255,255,0.07);}\n#cw-opt-label{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;}\n#cw-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px;}\n.cw-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:9px;padding:9px 10px;cursor:pointer;transition:all 0.15s;text-align:left;}\n.cw-card:hover{background:rgba(178,34,52,0.25);border-color:rgba(178,34,52,0.5);transform:translateY(-1px);}\n.cw-card .cc-icon{font-size:16px;line-height:1;margin-bottom:3px;}\n.cw-card .cc-title{font-size:11.5px;font-weight:500;color:#fff;}\n.cw-card .cc-desc{font-size:10px;color:rgba(255,255,255,0.38);line-height:1.3;}\n#cw-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}\n.cw-chip{font-size:11.5px;padding:5px 11px;border-radius:20px;border:0.5px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8);cursor:pointer;transition:all 0.15s;font-family:\'DM Sans\',sans-serif;}\n.cw-chip:hover{background:rgba(178,34,52,0.4);border-color:rgba(178,34,52,0.6);color:#fff;}\n#cw-input-row{display:flex;gap:7px;padding:9px 12px;background:rgba(0,0,0,0.3);border-top:0.5px solid rgba(255,255,255,0.07);}\n#cw-txt{flex:1;font-size:12px;padding:7px 11px;border-radius:20px;border:0.5px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.9);font-family:\'DM Sans\',sans-serif;outline:none;}\n#cw-txt::placeholder{color:rgba(255,255,255,0.28);}\n#cw-txt:focus{border-color:rgba(178,34,52,0.55);}\n#cw-send{width:33px;height:33px;border-radius:50%;background:var(--red);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.15s;}\n#cw-send:hover{background:var(--red-dark);}\n#cw-send svg{width:12px;height:12px;fill:white;}\n#cw-mic{width:33px;height:33px;border-radius:50%;background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.15);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}\n#cw-mic:hover{background:rgba(255,255,255,0.15);}\n#cw-mic svg{width:14px;height:14px;fill:rgba(255,255,255,0.7);transition:fill 0.15s;}\n#cw-mic.listening{background:rgba(178,34,52,0.6);border-color:rgba(178,34,52,0.8);animation:micpulse 1s infinite;}\n#cw-mic.listening svg{fill:#fff;}\n#cw-mic.unsupported{opacity:0.3;cursor:not-allowed;}\n@keyframes micpulse{0%,100%{box-shadow:0 0 0 0 rgba(178,34,52,0.5);}50%{box-shadow:0 0 0 6px rgba(178,34,52,0);}}\n\n#cw-footer-bar{text-align:center;padding:5px;font-size:10px;color:rgba(255,255,255,0.2);background:rgba(0,0,0,0.2);}\n#cw-lead-gate{position:absolute;inset:0;background:linear-gradient(160deg,rgba(10,20,50,0.97) 0%,rgba(30,10,10,0.97) 100%);border-radius:inherit;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 24px;text-align:center;gap:0;}\n#cw-lead-gate .gate-icon{font-size:36px;margin-bottom:10px;}\n#cw-lead-gate .gate-title{font-size:17px;font-weight:700;color:#fff;margin-bottom:6px;line-height:1.3;}\n#cw-lead-gate .gate-sub{font-size:12.5px;color:rgba(255,255,255,0.55);margin-bottom:18px;line-height:1.5;}\n#cw-lead-gate .gate-field{width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 12px;font-size:13px;color:#fff;font-family:\'DM Sans\',sans-serif;outline:none;box-sizing:border-box;margin-bottom:8px;}\n#cw-lead-gate .gate-field:focus{border-color:rgba(232,200,74,0.5);}\n#cw-lead-gate .gate-field::placeholder{color:rgba(255,255,255,0.3);}\n#cw-lead-gate .gate-btn{width:100%;padding:11px;background:var(--red);border:none;border-radius:9px;color:#fff;font-size:13.5px;font-weight:700;font-family:\'DM Sans\',sans-serif;cursor:pointer;transition:background 0.15s;margin-bottom:10px;}\n#cw-lead-gate .gate-btn:hover{background:var(--red-dark);}\n#cw-lead-gate .gate-btn:disabled{opacity:0.5;cursor:not-allowed;}\n#cw-lead-gate .gate-privacy{font-size:10px;color:rgba(255,255,255,0.25);line-height:1.5;}\n#cw-lead-gate .gate-stars{color:var(--gold);font-size:13px;margin-bottom:8px;letter-spacing:1px;}\n#cw-lead-gate .gate-err{font-size:11.5px;color:rgba(255,120,120,0.9);margin:-4px 0 6px;}\n#cw-session-wall{display:none;padding:20px 16px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);}\n#cw-session-wall .sw-icon{font-size:28px;margin-bottom:8px;}\n#cw-session-wall .sw-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:6px;}\n#cw-session-wall .sw-sub{font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px;line-height:1.5;}\n#cw-session-wall .sw-btn{display:inline-block;padding:10px 20px;background:var(--red);border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;font-family:\'DM Sans\',sans-serif;cursor:pointer;text-decoration:none;transition:background 0.15s;}\n#cw-session-wall .sw-btn:hover{background:var(--red-dark);}\n#cw-session-wall .sw-restart{display:block;margin-top:10px;font-size:11px;color:rgba(255,255,255,0.25);cursor:pointer;text-decoration:underline;}\n#cw-session-wall .sw-restart:hover{color:rgba(255,255,255,0.5);}\n.cw-msg-count{font-size:10px;color:rgba(255,255,255,0.2);text-align:right;padding:2px 8px 0;}\n\n.vet-owned-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(232,200,74,0.10);border:1px solid rgba(232,200,74,0.35);color:var(--gold);font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;letter-spacing:0.04em;text-transform:uppercase;}\n.vet-owned-badge svg{width:13px;height:13px;fill:var(--gold);flex-shrink:0;}\n.trust-strip{background:rgba(232,200,74,0.06);border-top:1px solid rgba(232,200,74,0.12);border-bottom:1px solid rgba(232,200,74,0.12);padding:14px 48px;display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;}\n.trust-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.65);letter-spacing:0.02em;}\n.trust-item svg{width:15px;height:15px;fill:var(--gold);flex-shrink:0;}\n.trust-item strong{color:var(--gold);}\n.footer-vet-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:rgba(232,200,74,0.6);font-weight:600;letter-spacing:0.03em;}\n.footer-vet-badge svg{width:11px;height:11px;fill:rgba(232,200,74,0.6);}\n@media(max-width:700px){.trust-strip{gap:20px;padding:14px 20px;}.trust-item{font-size:11px;}}\n\n.cw-typ{background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.1);border-radius:13px;border-bottom-left-radius:3px;padding:9px 13px;display:flex;gap:4px;align-items:center;}\n.cw-typ span{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.35);animation:cwpulse 1.3s infinite;}\n.cw-typ span:nth-child(2){animation-delay:.2s;}\n.cw-typ span:nth-child(3){animation-delay:.4s;}\n@keyframes cwpulse{0%,60%,100%{opacity:.2;transform:scale(.8);}30%{opacity:1;transform:scale(1);}}\n\n/* ADMIN */\n#admin-scroll{overflow-y:auto;max-height:480px;padding:14px 14px 6px;}\n#admin-scroll::-webkit-scrollbar{width:3px;}\n#admin-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px;}\n.admin-note{font-size:11.5px;color:rgba(232,200,74,0.85);background:rgba(232,200,74,0.07);border:1px solid rgba(232,200,74,0.2);border-radius:8px;padding:9px 11px;margin-bottom:14px;line-height:1.5;}\n.admin-section-label{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.35);margin:14px 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}\n.admin-add-btn{font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid rgba(178,34,52,0.4);background:rgba(178,34,52,0.15);color:rgba(255,100,100,0.9);cursor:pointer;font-family:\'DM Sans\',sans-serif;transition:all 0.15s;}\n.admin-add-btn:hover{background:rgba(178,34,52,0.3);}\n.admin-scan-row{display:flex;gap:6px;margin-bottom:8px;}\n.admin-scan-row input{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:7px 10px;font-size:12px;color:rgba(255,255,255,0.9);font-family:\'DM Sans\',sans-serif;outline:none;min-width:0;}\n.admin-scan-row input:focus{border-color:rgba(178,34,52,0.55);}\n#admin-scan-btn{padding:7px 12px;border-radius:7px;border:1px solid rgba(60,120,220,0.35);background:rgba(30,80,160,0.5);color:#fff;font-size:11.5px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:\'DM Sans\',sans-serif;transition:all 0.15s;}\n#admin-scan-btn:hover{background:rgba(30,80,160,0.75);}\n#admin-scan-btn:disabled{opacity:0.5;cursor:not-allowed;}\n#admin-scan-status{font-size:11.5px;min-height:16px;margin-bottom:6px;line-height:1.5;}\n.scan-scanning{color:rgba(232,200,74,0.85);}\n.scan-tabs{display:flex;gap:0;margin-bottom:8px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);}\n.scan-tab{flex:1;padding:7px 10px;font-size:11.5px;font-weight:600;cursor:pointer;border:none;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45);font-family:\'DM Sans\',sans-serif;transition:all 0.15s;text-align:center;}\n.scan-tab.active{background:rgba(30,80,160,0.55);color:#fff;}\n.scan-tab:hover:not(.active){background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);}\n#fb-scan-panel{display:none;}\n#fb-paste-area{width:100%;height:90px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:8px 10px;font-size:11.5px;color:rgba(255,255,255,0.85);font-family:\'DM Sans\',sans-serif;resize:vertical;outline:none;box-sizing:border-box;margin-bottom:6px;}\n#fb-paste-area:focus{border-color:rgba(232,200,74,0.4);}\n#fb-scan-btn{padding:7px 12px;border-radius:7px;border:1px solid rgba(232,200,74,0.3);background:rgba(100,70,0,0.4);color:#fff;font-size:11.5px;font-weight:500;cursor:pointer;width:100%;font-family:\'DM Sans\',sans-serif;transition:all 0.15s;}\n#fb-scan-btn:hover{background:rgba(100,70,0,0.65);}\n#fb-scan-btn:disabled{opacity:0.5;cursor:not-allowed;}\n.fb-hint{font-size:10.5px;color:rgba(255,255,255,0.35);line-height:1.5;margin-bottom:8px;}\n.fb-hint a{color:rgba(232,200,74,0.6);text-decoration:underline;}\n\n.scan-success{color:rgba(74,222,128,0.9);}\n.scan-error{color:rgba(255,120,120,0.85);}\n.admin-field{display:flex;flex-direction:column;gap:4px;margin-bottom:9px;}\n.admin-field label{font-size:11px;color:rgba(255,255,255,0.4);}\n.admin-field input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:7px 10px;font-size:12px;color:rgba(255,255,255,0.9);font-family:\'DM Sans\',sans-serif;outline:none;width:100%;}\n.admin-field input::placeholder{color:rgba(255,255,255,0.22);}\n.admin-field input:focus{border-color:rgba(178,34,52,0.55);}\n.admin-repeater-row{display:flex;gap:6px;margin-bottom:6px;align-items:center;}\n.admin-repeater-row input{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:6px 9px;font-size:11.5px;color:rgba(255,255,255,0.9);font-family:\'DM Sans\',sans-serif;outline:none;min-width:0;}\n.admin-repeater-row input:focus{border-color:rgba(178,34,52,0.5);}\n.admin-remove-btn{width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;font-size:14px;line-height:1;flex-shrink:0;transition:all 0.15s;}\n.admin-remove-btn:hover{background:rgba(178,34,52,0.3);color:#fff;}\n#admin-save-btn{width:100%;margin:14px 0 6px;padding:11px;background:var(--red);border:none;border-radius:9px;color:#fff;font-size:13px;font-weight:600;font-family:\'DM Sans\',sans-serif;cursor:pointer;transition:background 0.15s;}\n#admin-save-btn:hover{background:var(--red-dark);}\n#admin-saved-msg{display:none;text-align:center;font-size:12px;color:rgba(74,222,128,0.9);padding:0 0 12px;}\n\n/* PRICING */\n#pricing{background:var(--light);padding:100px 48px;}\n.pricing-note{text-align:center;font-size:13px;color:var(--gray);margin-top:24px;}\n.pricing-note span{color:var(--red);font-weight:600;}\n.pricing-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;align-items:start;}\n.price-card{background:#fff;border-radius:16px;padding:30px 24px;border:1px solid rgba(10,22,40,0.08);position:relative;transition:transform 0.2s,box-shadow 0.2s;}\n.price-card.featured{border:2px solid var(--red);transform:scale(1.03);}\n.price-card:not(.featured):hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(10,22,40,0.1);}\n.popular-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--red);color:#fff;padding:5px 16px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;}\n.price-tier{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--gray);margin-bottom:8px;}\n.price-amount{font-family:\'Playfair Display\',serif;font-size:36px;font-weight:900;color:var(--navy);line-height:1;}\n.price-amount span{font-size:13px;font-weight:400;font-family:\'DM Sans\',sans-serif;color:var(--gray);}\n.price-billing{font-size:11.5px;color:var(--gray);margin:2px 0 6px;}\n.price-monthly{font-size:12px;color:var(--gray);margin-bottom:6px;}\n.price-monthly s{color:#aab;}\n.price-save{display:inline-block;font-size:11px;font-weight:600;color:#166534;background:#dcfce7;border-radius:20px;padding:2px 9px;margin-bottom:12px;}\n.price-toggle{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:28px;}\n.price-toggle span{font-size:13px;color:var(--gray);}\n.price-toggle span.active{color:var(--navy);font-weight:600;}\n.toggle-wrap{position:relative;width:44px;height:24px;background:var(--navy);border-radius:12px;cursor:pointer;flex-shrink:0;transition:background 0.2s;}\n.toggle-wrap.monthly{background:#aab;}\n.toggle-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform 0.2s;}\n.toggle-wrap.monthly .toggle-knob{transform:translateX(0);}\n.toggle-wrap:not(.monthly) .toggle-knob{transform:translateX(20px);}\n.price-setup{font-size:12px;color:var(--gray);margin:4px 0 16px;padding-bottom:16px;border-bottom:1px solid rgba(10,22,40,0.08);}\n.price-features{display:flex;flex-direction:column;gap:9px;margin-bottom:16px;}\n.price-feat{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#374151;line-height:1.45;}\n.price-feat::before{content:\'✓\';color:var(--red);font-weight:700;flex-shrink:0;}\n.price-addon{margin-bottom:18px;padding:10px 12px;background:#fef9ec;border:1px solid rgba(232,200,74,0.4);border-radius:10px;}\n.price-addon-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#b8860b;margin-bottom:5px;}\n.price-addon-feat{display:flex;gap:7px;align-items:flex-start;font-size:12px;color:#6b5000;line-height:1.4;}\n.price-addon-feat::before{content:"＋";font-weight:700;flex-shrink:0;}\n.price-addon.included{background:#f0faf5;border-color:rgba(22,163,74,0.3);}\n.price-addon.included .price-addon-label{color:#166534;}\n.price-addon.included .price-addon-feat{color:#14532d;}\n.price-btn{width:100%;padding:11px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;border:none;font-family:\'DM Sans\',sans-serif;}\n.price-btn.outline{background:transparent;border:1.5px solid rgba(10,22,40,0.2);color:var(--navy);}\n.price-btn.outline:hover{border-color:var(--red);color:var(--red);}\n.price-btn.filled{background:var(--red);color:#fff;}\n.price-btn.filled:hover{background:var(--red-dark);}\n\n\n\n/* ── FLOATING CHAT WIDGET ──────────────────────────────────────────────── */\n#float-btn{\n  position:fixed;bottom:24px;right:24px;z-index:900;\n  width:58px;height:58px;border-radius:50%;\n  background:var(--red);border:none;cursor:pointer;\n  box-shadow:0 6px 24px rgba(178,34,52,0.5);\n  display:flex;align-items:center;justify-content:center;\n  transition:transform 0.2s,box-shadow 0.2s;\n}\n#float-btn:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(178,34,52,0.6);}\n#float-btn svg{width:26px;height:26px;fill:#fff;transition:opacity 0.2s;}\n#float-btn .icon-chat{position:absolute;}\n#float-btn .icon-close{position:absolute;opacity:0;transform:rotate(-90deg);transition:opacity 0.2s,transform 0.2s;}\n#float-btn.open .icon-chat{opacity:0;}\n#float-btn.open .icon-close{opacity:1;transform:rotate(0deg);}\n#float-notif{\n  position:fixed;bottom:92px;right:24px;z-index:899;\n  background:var(--navy);color:#fff;\n  padding:10px 16px 10px 14px;border-radius:12px 12px 4px 12px;\n  font-size:13px;font-weight:500;max-width:220px;line-height:1.4;\n  box-shadow:0 4px 20px rgba(0,0,0,0.35);\n  display:flex;align-items:flex-start;gap:8px;\n  animation:notifPop 0.35s cubic-bezier(.34,1.56,.64,1) both;\n  cursor:pointer;\n}\n#float-notif.hide{animation:notifFade 0.25s ease forwards;}\n#float-notif-close{\n  background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.6);\n  width:18px;height:18px;border-radius:50%;cursor:pointer;\n  font-size:11px;display:flex;align-items:center;justify-content:center;\n  flex-shrink:0;margin-top:1px;\n}\n#float-notif-close:hover{background:rgba(255,255,255,0.2);}\n@keyframes notifPop{from{opacity:0;transform:scale(0.8) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}}\n@keyframes notifFade{to{opacity:0;transform:translateY(8px);}}\n#float-panel{\n  position:fixed;bottom:94px;right:24px;z-index:898;\n  width:370px;\n  background:rgba(8,18,36,0.97);\n  border:1px solid rgba(255,255,255,0.1);\n  border-radius:18px;overflow:hidden;\n  box-shadow:0 20px 60px rgba(0,0,0,0.55);\n  transform:scale(0.92) translateY(16px);\n  transform-origin:bottom right;\n  opacity:0;pointer-events:none;\n  transition:transform 0.25s cubic-bezier(.34,1.3,.64,1),opacity 0.2s;\n}\n#float-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}\n/* Float panel inner — reuse chatbot CSS but scoped inside float-panel */\n#float-panel #fcw-header{background:linear-gradient(135deg,#9b1c2e,#B22234);padding:12px 16px;display:flex;align-items:center;gap:10px;}\n#float-panel #fcw-header-icon{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}\n#float-panel #fcw-org-name{color:#fff;font-size:13px;font-weight:500;}\n#float-panel #fcw-status{color:rgba(255,255,255,0.55);font-size:10.5px;margin-top:2px;display:flex;align-items:center;gap:4px;}\n#float-panel .fcw-dot{width:5px;height:5px;border-radius:50%;background:#4ade80;display:inline-block;}\n#float-panel #fcw-prog-bar{height:2px;background:rgba(255,255,255,0.08);}\n#float-panel #fcw-prog{height:100%;background:linear-gradient(90deg,#B22234,#ffd700);transition:width 0.5s;width:0%;}\n#float-panel #fcw-msgs{padding:12px 11px;min-height:200px;max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}\n#float-panel #fcw-msgs::-webkit-scrollbar{width:3px;}\n#float-panel #fcw-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px;}\n#float-panel .fcw-row{display:flex;gap:7px;align-items:flex-start;}\n#float-panel .fcw-av{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;}\n#float-panel .fcw-av.bot{background:var(--red);}\n#float-panel .fcw-av.usr{background:rgba(255,255,255,0.12);}\n#float-panel .fcw-bub{padding:8px 11px;border-radius:12px;font-size:12.5px;line-height:1.5;max-width:88%;}\n#float-panel .fcw-bub.bot{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.88);border-bottom-left-radius:3px;}\n#float-panel .fcw-bub.usr{background:var(--red);color:#fff;border-bottom-right-radius:3px;margin-left:auto;}\n#float-panel .fcw-typing{display:flex;gap:4px;align-items:center;padding:8px 11px;}\n#float-panel .fcw-typing span{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.35);animation:fcwdot 1.2s infinite;}\n#float-panel .fcw-typing span:nth-child(2){animation-delay:.2s;}\n#float-panel .fcw-typing span:nth-child(3){animation-delay:.4s;}\n@keyframes fcwdot{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}\n#float-panel #fcw-options{padding:8px 11px 10px;background:rgba(0,0,0,0.25);border-top:0.5px solid rgba(255,255,255,0.07);}\n#float-panel #fcw-cards{display:grid;grid-template-columns:1fr 1fr;gap:5px;}\n#float-panel .fcw-card{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);border-radius:9px;padding:8px 9px;cursor:pointer;transition:background 0.15s;text-align:left;}\n#float-panel .fcw-card:hover{background:rgba(255,255,255,0.1);}\n#float-panel .fcc-icon{font-size:16px;margin-bottom:3px;}\n#float-panel .fcc-title{font-size:11.5px;font-weight:600;color:#fff;}\n#float-panel .fcc-desc{font-size:10px;color:rgba(255,255,255,0.45);margin-top:2px;}\n#float-panel #fcw-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;}\n#float-panel .fcw-chip{font-size:11px;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.75);cursor:pointer;transition:background 0.15s;}\n#float-panel .fcw-chip:hover{background:rgba(255,255,255,0.12);}\n#float-panel #fcw-input-row{display:flex;gap:6px;padding:8px 11px;background:rgba(0,0,0,0.3);border-top:0.5px solid rgba(255,255,255,0.07);}\n#float-panel #fcw-txt{flex:1;font-size:11.5px;padding:6px 10px;border-radius:18px;border:0.5px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.9);font-family:\'DM Sans\',sans-serif;outline:none;}\n#float-panel #fcw-txt::placeholder{color:rgba(255,255,255,0.28);}\n#float-panel #fcw-txt:focus{border-color:rgba(178,34,52,0.55);}\n#float-panel #fcw-send{width:30px;height:30px;border-radius:50%;background:var(--red);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n#float-panel #fcw-send:hover{background:var(--red-dark);}\n#float-panel #fcw-send svg{width:11px;height:11px;fill:white;}\n#float-panel #fcw-footer{font-size:10px;color:rgba(255,255,255,0.18);text-align:center;padding:5px 0 7px;}\n@media(max-width:420px){#float-panel{width:calc(100vw - 24px);right:12px;bottom:80px;} #float-btn{right:12px;bottom:12px;} #float-notif{right:12px;}}\n/* CHECKOUT BUTTONS & MODAL */\n.price-btn.buy{background:var(--navy);color:#fff;margin-top:6px;}\n.price-btn.buy:hover{background:#0f2240;}\n.price-btn.buy-featured{background:var(--red);color:#fff;margin-top:6px;}\n.price-btn.buy-featured:hover{background:var(--red-dark);}\n.price-btn-demo{width:100%;padding:9px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.2s;border:none;font-family:\'DM Sans\',sans-serif;background:transparent;border:1.5px solid rgba(10,22,40,0.15);color:var(--gray);margin-top:4px;}\n.price-btn-demo:hover{border-color:var(--red);color:var(--red);}\n/* Modal overlay */\n.checkout-overlay{display:none;position:fixed;inset:0;background:rgba(5,12,26,0.75);z-index:500;align-items:center;justify-content:center;padding:20px;}\n.checkout-overlay.open{display:flex;}\n.checkout-modal{background:#fff;border-radius:20px;width:100%;max-width:520px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,0.35);}\n.checkout-modal-hdr{background:var(--navy);padding:28px 32px 24px;color:#fff;}\n.checkout-modal-hdr .cm-tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(232,200,74,0.8);font-weight:600;margin-bottom:6px;}\n.checkout-modal-hdr h3{font-size:22px;font-weight:700;margin-bottom:4px;}\n.checkout-modal-hdr .cm-price{font-size:15px;color:rgba(255,255,255,0.6);}\n.checkout-modal-hdr .cm-price strong{color:#fff;font-size:18px;}\n.checkout-modal-body{padding:28px 32px;}\n.checkout-modal-body .cm-includes{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gray);margin-bottom:14px;}\n.cm-feat-list{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;}\n.cm-feat{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:#374151;}\n.cm-feat::before{content:\'✓\';color:var(--red);font-weight:700;flex-shrink:0;margin-top:1px;}\n.cm-note{background:#f8f9fc;border-radius:10px;padding:14px 16px;font-size:12.5px;color:#555;line-height:1.6;margin-bottom:24px;border-left:3px solid var(--navy);}\n.cm-actions{display:flex;flex-direction:column;gap:10px;}\n.cm-btn-pay{background:var(--red);color:#fff;padding:14px;border-radius:10px;font-size:15px;font-weight:600;border:none;cursor:pointer;width:100%;font-family:\'DM Sans\',sans-serif;transition:background 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}\n.cm-btn-pay:hover{background:var(--red-dark);}\n.cm-btn-cancel{background:transparent;color:var(--gray);padding:10px;border-radius:10px;font-size:13px;font-weight:500;border:1px solid rgba(10,22,40,0.12);cursor:pointer;width:100%;font-family:\'DM Sans\',sans-serif;transition:all 0.2s;}\n.cm-btn-cancel:hover{border-color:var(--navy);color:var(--navy);}\n.cm-secure{text-align:center;font-size:11px;color:var(--gray);margin-top:10px;display:flex;align-items:center;justify-content:center;gap:5px;}\n/* TESTIMONIALS */\n#impact{background:var(--navy);padding:100px 48px;}\n.impact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}\n.impact-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:32px 24px;text-align:center;transition:transform 0.2s,border-color 0.2s;}\n.impact-card:hover{transform:translateY(-3px);border-color:rgba(232,200,74,0.3);}\n.impact-number{font-size:42px;font-weight:800;color:var(--gold);font-family:\'Playfair Display\',serif;line-height:1;margin-bottom:8px;}\n.impact-number sup{font-size:22px;vertical-align:super;}\n.impact-label{font-size:14px;font-weight:600;color:#fff;margin-bottom:8px;}\n.impact-source{font-size:11px;color:rgba(255,255,255,0.3);line-height:1.5;}\n.impact-divider{width:32px;height:2px;background:var(--gold);opacity:0.4;margin:12px auto;}\n.impact-wide{background:rgba(232,200,74,0.07);border:1px solid rgba(232,200,74,0.2);border-radius:16px;padding:28px 32px;margin-top:24px;display:flex;align-items:center;gap:24px;text-align:left;}\n.impact-wide-num{font-size:52px;font-weight:800;color:var(--gold);font-family:\'Playfair Display\',serif;white-space:nowrap;flex-shrink:0;}\n.impact-wide-text{}\n.impact-wide-label{font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;}\n.impact-wide-sub{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;}\n\n/* CTA */\n#cta{background:var(--navy);padding:100px 48px;text-align:center;position:relative;overflow:hidden;}\n#cta::before{content:\'\';position:absolute;inset:0;background:repeating-linear-gradient(180deg,#B22234 0,#B22234 28px,transparent 28px,transparent 56px);opacity:0.06;}\n.cta-inner{position:relative;z-index:2;max-width:680px;margin:0 auto;}\n.cta-inner h2{font-family:\'Playfair Display\',serif;font-size:clamp(30px,4vw,50px);color:#fff;font-weight:900;margin:12px 0 18px;}\n.cta-inner p{font-size:16px;color:rgba(255,255,255,0.5);line-height:1.7;margin-bottom:36px;}\n.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}\nfooter{background:#060d1a;padding:32px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;border-top:1px solid rgba(255,255,255,0.05);}\n.footer-logo{font-family:\'Playfair Display\',serif;font-size:16px;color:rgba(255,255,255,0.6);}\n.footer-note{font-size:12px;color:rgba(255,255,255,0.25);}\n.footer-stars{color:rgba(255,215,0,0.4);font-size:12px;letter-spacing:3px;}\n\n/* ANIMATIONS */\n.fade-up{opacity:0;transform:translateY(24px);transition:opacity 0.6s ease,transform 0.6s ease;}\n.fade-up.visible{opacity:1;transform:translateY(0);}\n.fade-up:nth-child(2){transition-delay:0.1s;}\n.fade-up:nth-child(3){transition-delay:0.2s;}\n.fade-up:nth-child(4){transition-delay:0.3s;}\n\n/* TABLET */\n@media(max-width:1000px){\n  nav{padding:14px 20px;}\n  #hamburger{display:flex;}\n  .nav-links{display:none;}\n  .nav-cta{font-size:12.5px;padding:8px 16px;}\n  #hero{padding:100px 20px 60px;}\n  .hero-inner{grid-template-columns:1fr;}\n  .hero-right{display:none;}\n  .steps-grid,.impact-grid{grid-template-columns:repeat(2,1fr);}\n  .pricing-grid{grid-template-columns:repeat(2,1fr);}\n  .price-card.featured{transform:scale(1);}\n  .demo-layout{grid-template-columns:1fr;}\n  #how,#demo,#pricing,#impact,#cta{padding:70px 24px;}\n  footer{padding:24px 20px;}\n}\n\n/* MOBILE */\n@media(max-width:600px){\n  nav{padding:12px 16px;}\n  .nav-logo .logo-text{font-size:15px;}\n  .nav-cta{padding:7px 14px;font-size:12px;}\n  #hero{padding:86px 16px 50px;}\n  h1{font-size:30px;}\n  .hero-sub{font-size:15px;}\n  .hero-btns{flex-direction:column;}\n  .btn-primary,.btn-secondary{width:100%;justify-content:center;text-align:center;padding:13px 20px;}\n  .hero-stats{gap:20px;}\n  .stat .num{font-size:22px;}\n  #how,#demo,#pricing,#impact,#cta{padding:56px 16px;}\n  .section-title{font-size:26px;}\n  .section-sub{margin-bottom:40px;}\n  .steps-grid,.impact-grid,.pricing-grid{grid-template-columns:1fr;gap:16px;}\n  .step-card{padding:24px 20px;}\n  #chatbot-widget{border-radius:12px;}\n  #cw-msgs{min-height:200px;max-height:240px;}\n  #cw-cards{grid-template-columns:1fr 1fr;gap:5px;}\n  .cw-card{padding:7px 8px;}\n  .cw-card .cc-title{font-size:11px;}\n  .cw-card .cc-desc{font-size:9px;}\n  .admin-scan-row{flex-direction:column;}\n  #admin-scan-btn{width:100%;padding:10px;font-size:13px;}\n  .admin-field input{font-size:13px;padding:9px 10px;}\n  .admin-repeater-row input{font-size:13px;}\n  #admin-scroll{max-height:400px;}\n  .price-card{padding:22px 18px;}\n  .price-card.featured{transform:none;}\n  .impact-card{padding:20px 18px;}\n  .cta-btns{flex-direction:column;align-items:center;}\n  .cta-btns a{width:100%;max-width:320px;text-align:center;justify-content:center;}\n  footer{flex-direction:column;text-align:center;padding:20px 16px;}\n  .footer-stars{display:none;}\n  .multilang-badge{display:none;}\n}\n';
  document.head.appendChild(style);

  // ── Inject HTML (float button + panel + checkout modal) ───────────────────
  var container = document.createElement('div');
  container.id  = 'vn-widget-container';
  container.innerHTML = '<!-- ── FLOATING CHAT WIDGET ──────────────────────────────────────────────── -->\n<!-- Prompt bubble — appears after 4s, dismissable -->\n<div id="float-notif" style="display:none;">\n  <span style="font-size:16px;flex-shrink:0;">🎖️</span>\n  <span>Need help with VA benefits? I\'m here — 24/7, no cost to you.</span>\n  <button id="float-notif-close" onclick="dismissNotif(event)" title="Dismiss">✕</button>\n</div>\n\n<!-- FAB toggle button -->\n<button id="float-btn" onclick="toggleFloat()" aria-label="Open VA Benefits Assistant">\n  <!-- Chat icon -->\n  <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>\n  <!-- Close icon -->\n  <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>\n</button>\n\n<!-- Floating panel -->\n<div id="float-panel">\n  <!-- Header -->\n  <div id="fcw-header">\n    <div id="fcw-header-icon">🎖️</div>\n    <div style="flex:1">\n      <div id="fcw-org-name">VetNavigator — Benefits Assistant</div>\n      <div id="fcw-status"><span class="fcw-dot"></span> Online · Free · 24/7</div>\n    </div>\n  </div>\n  <!-- Progress bar -->\n  <div id="fcw-prog-bar"><div id="fcw-prog"></div></div>\n  <!-- Messages -->\n  <div id="fcw-msgs"></div>\n  <!-- Options / cards / chips -->\n  <div id="fcw-options">\n    <div id="fcw-opt-label" style="font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1px;text-transform:uppercase;margin-bottom:7px;display:none;">Choose an option</div>\n    <div id="fcw-cards"></div>\n    <div id="fcw-chips"></div>\n  </div>\n  <!-- Input -->\n  <div id="fcw-input-row">\n    <input id="fcw-txt" type="text" placeholder="Type a question or tap an option…" autocomplete="off"/>\n    <button id="fcw-send" onclick="fcwSend()">\n      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>\n    </button>\n  </div>\n  <div id="fcw-footer">Powered by VetNavigator AI · Veteran-Made &amp; Veteran-Owned</div>\n</div>\n\n<!-- CHECKOUT MODAL -->\n<div class="checkout-overlay" id="checkout-overlay" onclick="if(event.target===this)closeCheckout()">\n  <div class="checkout-modal">\n    <div class="checkout-modal-hdr">\n      <div class="cm-tag">VetNavigator AI — Annual Plan</div>\n      <h3 id="cm-plan-name">Standard Plan</h3>\n      <div class="cm-price" id="cm-plan-price">Billed annually — <strong>$4,150/yr</strong> &nbsp;·&nbsp; 2 months free</div>\n    </div>\n    <div class="checkout-modal-body">\n      <div class="cm-includes">What\'s included</div>\n      <div class="cm-feat-list" id="cm-feat-list"></div>\n      <div class="cm-note" id="cm-note">Setup and onboarding are included. Your chatbot will be live within 2 weeks. No technical skills needed on your end.</div>\n      <div class="cm-actions">\n        <button class="cm-btn-pay" id="cm-pay-btn" onclick="goToCheckout()">Proceed to Secure Checkout →</button>\n        <button class="cm-btn-cancel" onclick="closeCheckout()">← Go back</button>\n      </div>\n      <div class="cm-secure">🔒 Secure payment powered by Stripe &nbsp;·&nbsp; Annual billing &nbsp;·&nbsp; Cancel before renewal</div>\n    </div>\n  </div>\n</div>\n\n<!-- ── FLOATING CHAT WIDGET ──────────────────────────────────────────────── -->\n<!-- Prompt bubble — appears after 4s, dismissable -->\n<div id="float-notif" style="display:none;">\n  <span style="font-size:16px;flex-shrink:0;">🎖️</span>\n  <span>Need help with VA benefits? I\'m here — 24/7, no cost to you.</span>\n  <button id="float-notif-close" onclick="dismissNotif(event)" title="Dismiss">✕</button>\n</div>\n\n<!-- FAB toggle button -->\n<button id="float-btn" onclick="toggleFloat()" aria-label="Open VA Benefits Assistant">\n  <!-- Chat icon -->\n  <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>\n  <!-- Close icon -->\n  <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>\n</button>\n\n<!-- Floating panel -->\n<div id="float-panel">\n  <!-- Header -->\n  <div id="fcw-header">\n    <div id="fcw-header-icon">🎖️</div>\n    <div style="flex:1">\n      <div id="fcw-org-name">VetNavigator — Benefits Assistant</div>\n      <div id="fcw-status"><span class="fcw-dot"></span> Online · Free · 24/7</div>\n    </div>\n  </div>\n  <!-- Progress bar -->\n  <div id="fcw-prog-bar"><div id="fcw-prog"></div></div>\n  <!-- Messages -->\n  <div id="fcw-msgs"></div>\n  <!-- Options / cards / chips -->\n  <div id="fcw-options">\n    <div id="fcw-opt-label" style="font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1px;text-transform:uppercase;margin-bottom:7px;display:none;">Choose an option</div>\n    <div id="fcw-cards"></div>\n    <div id="fcw-chips"></div>\n  </div>\n  <!-- Input -->\n  <div id="fcw-input-row">\n    <input id="fcw-txt" type="text" placeholder="Type a question or tap an option…" autocomplete="off"/>\n    <button id="fcw-send" onclick="fcwSend()">\n      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>\n    </button>\n  </div>\n  <div id="fcw-footer">Powered by VetNavigator AI · Veteran-Made &amp; Veteran-Owned</div>\n</div>';
  document.body.appendChild(container);

  // ── Patch org vars into window scope for chatbot engine ───────────────────
  window.cwOrgName    = cwOrgName;
  window.cwOrgCity    = cwOrgCity;
  window.cwOrgAddr    = cwOrgAddr;
  window.cwOrgPhone   = cwOrgPhone;
  window.cwOrgEmail   = cwOrgEmail;
  window.cwOrgWeb     = cwOrgWeb;
  window.cwOrgHours   = cwOrgHours;
  window.cwOrgEvents  = cwOrgEvents;
  window.cwOrgLeaders = cwOrgLeaders;
  window.cwOrgMission = cwOrgMission;
  window.cwLang       = cwLang;
  window.GHL_WEBHOOK  = GHL_WEBHOOK;

  // ── CHECKOUT URLS (client can override via config) ─────────────────────────
  var CHECKOUT_URLS = cfg.checkoutUrls || {
    basic:    'https://vetnavigator.ai/checkout/basic',
    starter:  'https://vetnavigator.ai/checkout/starter',
    standard: 'https://vetnavigator.ai/checkout/standard',
    premium:  'https://vetnavigator.ai/checkout/premium'
  };
  window.CHECKOUT_URLS = CHECKOUT_URLS;

  // ── AI config ──────────────────────────────────────────────────────────────
  var AI_DAILY_CAP = 20;
  window.AI_DAILY_CAP = AI_DAILY_CAP;


document.addEventListener('DOMContentLoaded', function() {

// ── SCROLL ANIMATIONS ────────────────────────────────────────────────────────
var obs = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.fade-up').forEach(function(el) { obs.observe(el); });

// ── HAMBURGER ────────────────────────────────────────────────────────────────
var hamburger = document.getElementById('hamburger');
var mobileNav = document.getElementById('mobile-nav');
hamburger.addEventListener('click', function(e) {
  e.stopPropagation();
  hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open');
});
mobileNav.querySelectorAll('a').forEach(function(a) {
  a.addEventListener('click', function() {
    hamburger.classList.remove('open');
    mobileNav.classList.remove('open');
  });
});
document.addEventListener('click', function(e) {
  if (!mobileNav.contains(e.target) && !hamburger.contains(e.target)) {
    hamburger.classList.remove('open');
    mobileNav.classList.remove('open');
  }
});

// ── PRICE BUTTONS SCROLL ─────────────────────────────────────────────────────
document.querySelectorAll('[data-scroll]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var target = document.getElementById(btn.getAttribute('data-scroll'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── CHATBOT ──────────────────────────────────────────────────────────────────
var cwLang = 'en';
var translations={
  en:{
    welcome:{pct:5,bot:"Welcome! I'm your VA benefits guide.\n\nLet's find your benefits. Which best describes you?",
      cards:[{icon:"🎖️",title:"Veteran",desc:"I served in the US military"},{icon:"⚔️",title:"Active Duty",desc:"Currently serving"},{icon:"💛",title:"Spouse / Family",desc:"Family member of a veteran"},{icon:"🕊️",title:"Surviving Spouse",desc:"Lost a veteran spouse"}]},
    veteran:{pct:18,bot:"Thank you for your service. 🇺🇸\n\nWhen did you serve?",
      cards:[{icon:"🏜️",title:"Post-9/11",desc:"2001 to present"},{icon:"🌊",title:"Gulf War",desc:"1990–2001"},{icon:"🌿",title:"Vietnam Era",desc:"1964–1975"},{icon:"🔵",title:"Other Era",desc:"Korean, Cold War, etc."}]},
    era:{pct:32,bot:"Do you currently have a VA disability rating?",
      cards:[{icon:"✅",title:"Yes — rated",desc:"I have a rating %"},{icon:"📝",title:"No — not yet",desc:"Never filed a claim"},{icon:"❌",title:"Was denied",desc:"My claim was denied"},{icon:"❓",title:"Not sure",desc:"I need to check"}]},
    benefits_menu:{pct:48,bot:"Here are the top benefits to explore. Which interests you most?",
      cards:[{icon:"💰",title:"Disability Pay",desc:"Tax-free monthly pay"},{icon:"🎓",title:"GI Bill",desc:"Education funding"},{icon:"🏠",title:"VA Home Loan",desc:"No down payment"},{icon:"☢️",title:"PACT Act",desc:"Toxic exposure"},{icon:"🏥",title:"Healthcare",desc:"VA medical care"},{icon:"👔",title:"Voc Rehab",desc:"Job training"}]},
    disability:{pct:62,bot:"<strong>VA Disability Compensation</strong> — tax-free monthly pay for service-connected conditions.\n\n<strong>Avg payment:</strong> $1,500–$3,800/month\n<strong>Ratings:</strong> 10%–100%\n\nA 30% rating = ~$500/month tax-free for life.",chips:["How do I file a claim?","What documents do I need?","Find a VSO counselor","See other benefits"]},
    gi_bill:{pct:62,bot:"<strong>Post-9/11 GI Bill</strong> covers:\n\n<strong>Tuition:</strong> Full at public universities\n<strong>Housing:</strong> ~$1,800–$2,400/month stipend\n<strong>Books:</strong> Up to $1,000/year\n<strong>Duration:</strong> Up to 36 months",chips:["How do I apply?","Find a VSO counselor","See other benefits"]},
    home_loan:{pct:62,bot:"<strong>VA Home Loan</strong>:\n\n<strong>No down payment required</strong>\n<strong>No PMI (mortgage insurance)</strong>\n<strong>Competitive interest rates</strong>\n<strong>Reusable for life</strong>",chips:["Am I eligible?","Find a VSO counselor","See other benefits"]},
    pact_act:{pct:62,bot:"<strong>PACT Act (2022)</strong> — the biggest VA benefits expansion in decades.\n\n<strong>Covers:</strong> Burn pit exposure, Agent Orange, Gulf War illness\n<strong>Added:</strong> 20+ new presumptive conditions\n\nOver 5 million veterans may now qualify.",chips:["Do I qualify?","Find a VSO counselor","See other benefits"]},
    healthcare:{pct:62,bot:"<strong>VA Healthcare</strong>:\n\n<strong>Covered:</strong> Primary care, mental health, prescriptions\n<strong>Cost:</strong> Free for many veterans\n\nEnroll at <a href=&quot;https://VA.gov&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov</a> or call <a href=&quot;tel:+118772228387&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>1-877-222-8387</a>.",chips:["How do I enroll?","Find a VSO counselor","See other benefits"]},
    voc_rehab:{pct:62,bot:"<strong>Vocational Rehabilitation (Ch. 31)</strong>:\n\nCovers career counseling, education, job placement, and tools for veterans with a 10%+ disability rating.",chips:["How do I apply?","Find a VSO counselor","See other benefits"]},
    denied:{pct:76,bot:"<strong>A denied claim is not the end.</strong>\n\nMost first-time VA claims are denied — but over 70% of appeals are won with the right help.\n\n<strong>Your options:</strong>\n— Supplemental Claim (new evidence)\n— Board of Veterans Appeals\n— Free VSO rep to fight on your behalf\n\nDon't give up. A VSO counselor can review your denial letter and advise you for free.",chips:["Find a VSO counselor","How do I file a claim?","See other benefits","Start over"]},
    file_claim:{pct:76,bot:"<strong>How to file a VA disability claim:</strong>\n\n<strong>Step 1</strong> — Create account at <a href=&quot;https://va.gov&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov</a>\n<strong>Step 2</strong> — Complete <a href=&quot;https://va.gov/find-forms/about-form-21-526ez&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA Form 21-526EZ</a>\n<strong>Step 3</strong> — Gather DD-214 and medical records\n<strong>Step 4</strong> — Submit online, by mail, or in person\n\n<strong>📬 By mail:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 In person:</strong> <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Find your nearest VA office →</a>",chips:["What documents do I need?","Find a VSO counselor","See other benefits","Start over"]},
    documents:{pct:82,bot:"<strong>Documents needed:</strong>\n\n— DD-214 (discharge papers)\n— Medical records\n— Social Security number\n— Buddy statements (recommended)\n— Nexus letter from doctor (recommended)\n\nMissing DD-214? Request free at <a href=&quot;https://archives.gov/veterans&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>archives.gov/veterans</a>",chips:["Find a VSO counselor","See other benefits","Start over"]},
    gi_bill_apply:{pct:76,bot:"<strong>How to apply for the Post-9/11 GI Bill:</strong>\n\n<strong>Step 1</strong> — Apply at <a href=&quot;https://va.gov/education/apply&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov/education/apply</a>\n<strong>Step 2</strong> — Select Chapter 33 (Post-9/11 GI Bill)\n<strong>Step 3</strong> — Provide your DD-214 and school info\n<strong>Step 4</strong> — VA notifies your school directly\n\n<strong>Timeline:</strong> 4–8 weeks for approval\n<strong>Transferable</strong> to spouse or children if still serving",chips:["What documents do I need?","Can I transfer my GI Bill?","Find a VSO counselor","See other benefits"]},
    gi_bill_transfer:{pct:82,bot:"<strong>Transferring GI Bill benefits:</strong>\n\n— Must be on active duty or Selected Reserve\n— Commit to 4 more years of service\n— Transfer at <a href=&quot;https://milconnect.dmdc.osd.mil&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>milConnect.deps.mil</a>\n— Spouse can use immediately; dependents at age 18–26\n\nAlready separated? Benefits cannot be transferred after leaving service.",chips:["Find a VSO counselor","See other benefits","Start over"]},
    home_loan_apply:{pct:76,bot:"<strong>How to get a VA Home Loan:</strong>\n\n<strong>Step 1</strong> — Get your Certificate of Eligibility (COE) at <a href=&quot;https://va.gov/housing-assistance/home-loans/how-to-apply&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov</a>\n<strong>Step 2</strong> — Choose a VA-approved lender\n<strong>Step 3</strong> — Find a home and make an offer\n<strong>Step 4</strong> — VA appraisal + loan closing\n\n<strong>Who qualifies:</strong> 90+ days active duty, or 6 years National Guard/Reserve\n<strong>Tip:</strong> No down payment, no PMI — saves thousands upfront.",chips:["What documents do I need?","Find a VSO counselor","See other benefits"]},
    healthcare_enroll:{pct:76,bot:"<strong>How to enroll in VA Healthcare:</strong>\n\n<strong>Option 1</strong> — Online: <a href=&quot;https://va.gov/health-care/apply&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov/health-care/apply</a>\n<strong>Option 2</strong> — Call: <a href=&quot;tel:+118772228387&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>1-877-222-8387</a> (Mon–Fri 8am–8pm ET)\n<strong>Option 3</strong> — In person at any VA medical center: <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Find locations →</a>\n\n<strong>What you need:</strong> DD-214, Social Security number, insurance info (if any)\n\n<strong>Cost:</strong> Free for combat veterans (first 5 years). Most others pay little to nothing.",chips:["Am I eligible for VA Healthcare?","Find a VSO counselor","See other benefits"]},
    healthcare_eligibility:{pct:82,bot:"<strong>VA Healthcare eligibility:</strong>\n\nYou likely qualify if you:\n— Served 24+ continuous months on active duty\n— Were discharged for a service-connected disability\n— Served in a combat zone after Nov 11, 1998\n\n<strong>Priority groups:</strong> Veterans with higher disability ratings get seen first and pay less.\n\nNot sure? A VSO counselor can check your eligibility in minutes.",chips:["How do I enroll?","Find a VSO counselor","See other benefits"]},
    voc_rehab_apply:{pct:76,bot:"<strong>How to apply for Vocational Rehabilitation (Ch. 31):</strong>\n\n<strong>Step 1</strong> — Apply at <a href=&quot;https://va.gov/careers-employment/vocational-rehabilitation&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov/careers-employment/vocational-rehabilitation</a>\n<strong>Step 2</strong> — Meet with a Vocational Rehabilitation Counselor\n<strong>Step 3</strong> — Create a rehabilitation plan together\n\n<strong>You may qualify if you have:</strong>\n— A VA disability rating of 10%+\n— An employment barrier related to your disability\n\n<strong>Covers:</strong> Tuition, books, supplies, job placement support, and more.",chips:["What documents do I need?","Find a VSO counselor","See other benefits"]},
    pact_qualify:{pct:76,bot:"<strong>You may qualify for PACT Act benefits if you:</strong>\n\n— Served near burn pits in Iraq, Afghanistan, or the Gulf\n— Were exposed to Agent Orange (Vietnam, Thailand, Korea DMZ)\n— Have a Gulf War illness diagnosis\n— Have any of 20+ newly added presumptive conditions\n\n<strong>Key change:</strong> You no longer have to prove your illness was caused by service — VA presumes it.\n\nEven if you were previously denied, you can reapply under PACT Act.",chips:["How do I file a claim?","Find a VSO counselor","See other benefits"]},
    spouse:{pct:48,bot:"Thank you for your support and sacrifice. The strength behind every service member is their family. \uD83E\uDD0D\n\n<strong>Benefits available to veteran spouses and dependents:</strong>\n\n— <strong>CHAMPVA</strong> — free VA healthcare for qualifying dependents\n— <strong>DEA (Ch. 35)</strong> — education benefits for dependents\n— <strong>Survivors Pension</strong> — income support for low-income surviving spouses\n— <strong>DIC</strong> — monthly payment if veteran died from service-connected cause\n— <strong>Home Loan</strong> — surviving spouses may be eligible\n\nEligibility depends on the veteran's service and discharge status.",chips:["Tell me about DIC","Tell me about CHAMPVA","Find a VSO counselor","See other benefits"]},
    dic:{pct:62,bot:"We are deeply grateful for your family\u2019s service and sacrifice. We are here to support you every step of the way. \uD83C\uDDFA\uD83C\uDDF8\n\n<strong>Dependency and Indemnity Compensation (DIC):</strong>\n\nMonthly tax-free payment to surviving spouses and dependents when a veteran dies from a service-connected condition.\n\n<strong>2024 base rate:</strong> $1,612/month\n<strong>Additional amounts</strong> for dependent children, housebound status, and A&A need\n\n<strong>Who qualifies:</strong>\n— Surviving spouse married to veteran for 1+ year\n— Veteran died from service-connected disease or injury\n— Or veteran was 100% P&T rated for 10+ years before death",chips:["How do I apply for DIC?","Find a VSO counselor","See other benefits"]},
    dic_apply:{pct:76,bot:"<strong>How to apply for DIC:</strong>\n\n<strong>Step 1</strong> — Complete <a href=&quot;https://va.gov/find-forms/about-form-21P-534EZ&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA Form 21P-534EZ</a>\n<strong>Step 2</strong> — Attach veteran's death certificate\n<strong>Step 3</strong> — Include marriage certificate\n<strong>Step 4</strong> — Submit to your VA Pension Management Center\n\n<strong>📬 Mail DIC forms to:</strong>\nDepartment of Veterans Affairs\nPension Intake Center\nPO Box 5365, Janesville, WI 53547-5365\n\n<strong>🏥 In person:</strong> <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Find your nearest VA office →</a>\n\n<strong>Tip:</strong> A VSO counselor can prepare and submit this paperwork for free — highly recommended given the complexity.",chips:["Find a VSO counselor","See other benefits","Start over"]},
    champva:{pct:62,bot:"<strong>CHAMPVA — VA Healthcare for Dependents:</strong>\n\nFree healthcare coverage for spouses and children of veterans who are:\n— 100% permanently and totally (P&T) disabled, OR\n— Died from a service-connected condition\n\n<strong>Covers:</strong> Doctor visits, hospital care, prescriptions, mental health\n<strong>Cost:</strong> No premium. Small copays only.\n\nApply with <a href=&quot;https://va.gov/find-forms/about-form-10-10d&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA Form 10-10d</a> at <a href=&quot;https://va.gov/health-care/family-caregiver-benefits/champva&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov</a>",chips:["Find a VSO counselor","See other benefits","Start over"]},
    active_duty:{pct:32,bot:"Thank you for your service and dedication. \uD83C\uDDFA\uD83C\uDDF8 We honor your commitment to this nation.\n\n<strong>Preparing to separate or transition?</strong>\n\nHere are the key benefits to act on <em>before</em> you leave:\n\n— <strong>TAP Program</strong> — <a href=&quot;https://tapevents.mil&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>mandatory transition assistance, job prep</a>\n— <strong>Disability rating</strong> — file BEFORE you separate (<a href=&quot;https://va.gov/disability/how-to-file-claim/when-to-file/pre-discharge-claim&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>BDD program</a>)\n— <strong>GI Bill</strong> — education benefit active the day you separate\n— <strong>VA Healthcare</strong> — enroll within 5 years for free care\n— <strong>VA Home Loan</strong> — available immediately after separation\n\nFiling a disability claim before separation can save months of waiting.",chips:["Tell me about the BDD program","GI Bill","VA Home Loan","Find a VSO counselor"]},
    bdd:{pct:48,bot:"<strong>Benefits Delivery at Discharge (BDD):</strong>\n\nFile your VA disability claim 90–180 days BEFORE your separation date — and your rating may be ready the day you leave.\n\n<strong>How it works:</strong>\n— File at <a href=&quot;https://va.gov/disability/how-to-file-claim&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>VA.gov/disability/how-to-file-claim</a>\n— Complete your C&P exam while still on base\n— Rating decision arrives within 30 days of separation\n\n<strong>Why it matters:</strong> Without BDD, average wait is 3–5 months after separation. With BDD, benefits start immediately.",chips:["What documents do I need?","Find a VSO counselor","See other benefits"]},
    vso:{pct:92,bot:"Your VSO counselors are here to help — free of charge.\n\n<strong>Demo mode:</strong> On your organization\'s site, veterans see your name, address, phone, and hours here instead.\n\nFor a referral now:\n<strong>DAV</strong> — <a href=&quot;https://dav.org&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>dav.org</a>\n<strong>VFW</strong> — <a href=&quot;https://vfw.org&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>vfw.org</a>\n<strong>American Legion</strong> — <a href=&quot;https://legion.org&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>legion.org</a>\n\n100% free. Walk-ins welcome. 🇺🇸",chips:["Start over","See all benefits"]},
    placeholder:"Type a question or choose above...",
    chooseOption:"Choose an option",
    footer:"VetNavigator AI · Demo · Not official VA advice",

    rating_explained:{pct:55,bot:"<strong>How VA disability ratings work:</strong>\n\nThe VA assigns a rating from <strong>0% to 100%</strong> based on how much your service-connected condition affects your daily life.\n\n<strong>What each level means (approx. monthly pay, veteran only):</strong>\n— 10% → ~$175/mo\n— 30% → ~$524/mo\n— 50% → ~$1,075/mo\n— 70% → ~$1,663/mo\n— 100% → ~$3,737/mo\n\n<strong>Combined ratings</strong> use \"whole person\" math — two 50% ratings don't equal 100%.\n\n<strong>Tip:</strong> A VSO counselor can review your records and identify conditions you may have missed.",chips:["How do I file a claim?","How do I increase my rating?","What is TDIU?","Find a VSO counselor"]},
    rating_increase:{pct:60,bot:"<strong>How to increase your VA disability rating:</strong>\n\n<strong>Step 1</strong> — File a Supplemental Claim with new evidence\n<strong>Step 2</strong> — Request a Higher-Level Review (a senior VA rater re-examines your case)\n<strong>Step 3</strong> — Document worsening symptoms with your doctor\n<strong>Step 4</strong> — Get a Nexus letter linking your condition to service\n\n<strong>Key:</strong> \"New and relevant evidence\" is required for a Supplemental Claim. A buddy statement from someone who witnessed your condition can count.\n\n<strong>Timeline:</strong> 4–6 months average. A VSO counselor can build the strongest case.",chips:["What is a nexus letter?","What is TDIU?","Find a VSO counselor","See other benefits"]},
    cp_exam:{pct:58,bot:"<strong>The C&P Exam (Compensation & Pension):</strong>\n\nAfter you file a disability claim, the VA schedules a C&P exam to evaluate your condition. This exam <strong>heavily influences your rating</strong>.\n\n<strong>How to prepare:</strong>\n— Describe your <em>worst days</em>, not your average days\n— Bring your medical records and service records\n— Don't minimize symptoms — be specific and honest\n— Write down all symptoms before the exam\n\n<strong>After the exam:</strong> The examiner submits a DBQ (Disability Benefits Questionnaire). You can request a copy.\n\n<strong>Tip:</strong> A VSO counselor can attend the exam or help you prepare.",chips:["How do I file a claim?","What documents do I need?","Find a VSO counselor"]},
    tdiu:{pct:62,bot:"<strong>TDIU — Total Disability Based on Individual Unemployability:</strong>\n\nIf your service-connected disabilities prevent you from working, you may receive <strong>100% disability pay even with a lower rating</strong>.\n\n<strong>General requirements:</strong>\n— One condition rated 60%+ OR\n— Multiple conditions totaling 70%+ (with one at 40%+)\n— Unable to maintain substantially gainful employment\n\n<strong>Pay:</strong> Same as 100% rating (~$3,737/mo)\n\n<strong>Apply with:</strong> VA Form 21-8940 (available at " + 'va.gov/find-forms' + ")\n\n<strong>Tip:</strong> Many veterans qualify but don't know about TDIU. A VSO counselor can assess your eligibility.",chips:["How do I file a claim?","Find a VSO counselor","See other benefits"]},
    nexus:{pct:58,bot:"<strong>Nexus Letters & Buddy Statements:</strong>\n\n<strong>Nexus letter</strong> — A letter from a doctor stating your condition is \"at least as likely as not\" connected to your military service. This is often the missing link in a denied or low-rated claim.\n\n<strong>Buddy statement (VA Form 21-10210)</strong> — A written statement from someone who witnessed your condition, injury, or in-service event. Can be a fellow veteran, family member, or supervisor.\n\n<strong>Both are powerful evidence</strong> for new claims, appeals, and rating increases.\n\n<strong>Tip:</strong> A VSO counselor can help you identify which doctors to approach and how to frame the request.",chips:["How do I increase my rating?","How do I file a claim?","Find a VSO counselor"]},
    mental_health:{pct:52,bot:"<strong>VA Mental Health Benefits:</strong>\n\n<strong>Covered services:</strong>\n— PTSD treatment (therapy + medication)\n— Depression, anxiety, MST counseling\n— Substance use treatment\n— Suicide prevention programs\n— Vet Centers (community-based, less formal than VA hospitals)\n\n<strong>Who qualifies:</strong> Any veteran who served on active duty — even without a disability rating.\n\n<strong>How to access:</strong>\n— Call the VA Mental Health helpline: <a href=\"tel:+18002738255\" style=\"color:var(--gold);text-decoration:underline;\">1-800-273-8255</a> (Press 1)\n— Walk in to any VA medical center — no appointment needed for mental health crisis\n— Find a Vet Center at <a href=\"https://va.gov/find-locations\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:var(--gold);text-decoration:underline;\">va.gov/find-locations</a>\n\n<strong>Veterans Crisis Line:</strong> Dial 988, then Press 1",chips:["Do I qualify for VA Healthcare?","Find a VSO counselor","See other benefits"]},
    pension:{pct:50,bot:"<strong>VA Pension — for low-income wartime veterans:</strong>\n\nA needs-based benefit for veterans with limited income and assets who served during a wartime period.\n\n<strong>Basic requirements:</strong>\n— 90+ days active duty (at least 1 day during wartime)\n— Income and assets below VA limits\n— Age 65+ OR permanently disabled\n\n<strong>Maximum annual pension rates (approx.):</strong>\n— Single veteran: ~$16,551/yr\n— With spouse: ~$21,674/yr\n— Aid & Attendance: up to ~$27,609/yr\n\n<strong>Aid & Attendance</strong> adds money if you need help with daily activities (bathing, dressing, meals).\n\n<strong>Apply with:</strong> VA Form 21P-527EZ",chips:["What is Aid & Attendance?","Find a VSO counselor","See other benefits"]},
    aid_attendance:{pct:55,bot:"<strong>Aid & Attendance (A&A):</strong>\n\nAn enhanced pension benefit for veterans (or surviving spouses) who need help with daily activities.\n\n<strong>You may qualify if you:</strong>\n— Need help bathing, dressing, eating, or using the bathroom\n— Are bedridden or in a nursing home\n— Have severe vision loss\n\n<strong>Additional monthly benefit:</strong>\n— Veteran alone: +~$912/mo above basic pension\n— With spouse: +~$1,176/mo\n— Surviving spouse: +~$589/mo\n\n<strong>Important:</strong> This benefit is significantly underused. Many elderly veterans in care facilities qualify but have never applied.\n\n<strong>Tip:</strong> A VSO counselor can help — this is a complex application.",chips:["What is VA Pension?","Find a VSO counselor","See other benefits"]},
    housing_help:{pct:48,bot:"<strong>VA Housing Assistance Programs:</strong>\n\n<strong>HUD-VASH</strong> — Housing vouchers + case management for homeless veterans. Combines HUD Section 8 housing with VA supportive services.\n\n<strong>SSVF (Supportive Services for Veteran Families)</strong> — Rapid rehousing and eviction prevention for at-risk veterans.\n\n<strong>GPD (Grant & Per Diem)</strong> — Transitional housing programs through community organizations.\n\n<strong>How to access:</strong>\n— Call the National Call Center for Homeless Veterans: <a href=\"tel:+18774243838\" style=\"color:var(--gold);text-decoration:underline;\">1-877-424-3838</a> (24/7)\n— Or walk in to any VA medical center\n\n<strong>You do not need an appointment or a disability rating to get help.</strong>",chips:["Find a VSO counselor","VA Home Loan","See other benefits"]},
    gi_bill_types:{pct:54,bot:"<strong>GI Bill — Choosing the right chapter:</strong>\n\n<strong>Chapter 33 — Post-9/11 GI Bill</strong> (most popular)\n— Served 90+ days after 9/10/2001\n— Covers full tuition at public schools, $26,042/yr cap at private\n— Includes monthly housing allowance (BAH rate)\n— Best for full-time students\n\n<strong>Chapter 30 — Montgomery GI Bill</strong>\n— Paid into during service ($1,200 contribution)\n— Monthly stipend paid directly to you (~$2,122/mo full-time)\n— More flexible — can be used for on-the-job training\n\n<strong>Chapter 31 — Voc Rehab</strong> (separate program)\n— For veterans with a service-connected disability\n— Covers school + living expenses + books\n\n<strong>Yellow Ribbon Program:</strong> Covers tuition above the Post-9/11 cap at private schools. School must participate.",chips:["How do I apply for GI Bill?","What is Voc Rehab?","Find a VSO counselor"]},
    dental_vision:{pct:50,bot:"<strong>VA Dental & Vision Benefits:</strong>\n\n<strong>Dental:</strong> Not automatically included in VA healthcare. You qualify for free VA dental if:\n— 100% service-connected disability rating, OR\n— POW, OR\n— Dental condition is service-connected, OR\n— Recently discharged (within 180 days, limited care)\n— Enrolled in Voc Rehab\n\n<strong>Otherwise:</strong> VA Dental Insurance Program (VADIP) offers low-cost dental through Delta Dental or MetLife.\n\n<strong>Vision:</strong> Routine eye care is covered if you have a service-connected eye condition. Otherwise, glasses/contacts are covered at 100% disability rating.\n\n<strong>Hearing aids:</strong> Covered if hearing loss is service-connected — one of the most common VA claims.",chips:["Do I qualify for VA Healthcare?","Find a VSO counselor","See other benefits"]},
    fallback:"Great question! I'd recommend speaking with a free VSO counselor for personalized guidance.",
    fallbackChips:["Find a VSO counselor","See all benefits","Start over"]
  },
  es:{
    welcome:{pct:5,bot:"¡Bienvenido! Soy su guía gratuita de beneficios del VA.\n\nEncontremos sus beneficios. ¿Cuál le describe mejor?",
      cards:[{icon:"🎖️",title:"Veterano",desc:"Serví en el ejército de EE.UU."},{icon:"⚔️",title:"Servicio Activo",desc:"Actualmente sirviendo"},{icon:"💛",title:"Cónyuge / Familia",desc:"Familiar de un veterano"},{icon:"🕊️",title:"Cónyuge Sobreviviente",desc:"Perdió a un cónyuge veterano"}]},
    veteran:{pct:18,bot:"Gracias por su servicio. 🇺🇸\n\n¿Cuándo sirvió?",
      cards:[{icon:"🏜️",title:"Post-11 de Sep.",desc:"2001 al presente"},{icon:"🌊",title:"Guerra del Golfo",desc:"1990–2001"},{icon:"🌿",title:"Era de Vietnam",desc:"1964–1975"},{icon:"🔵",title:"Otra Era",desc:"Corea, Guerra Fría, etc."}]},
    era:{pct:32,bot:"¿Tiene actualmente una calificación de discapacidad del VA?",
      cards:[{icon:"✅",title:"Sí — calificado",desc:"Tengo un porcentaje"},{icon:"📝",title:"No — todavía no",desc:"Nunca presenté"},{icon:"❌",title:"Fue denegado",desc:"Mi reclamo fue negado"},{icon:"❓",title:"No estoy seguro",desc:"Necesito verificar"}]},
    benefits_menu:{pct:48,bot:"Estos son los principales beneficios. ¿Cuál le interesa más?",
      cards:[{icon:"💰",title:"Pago por Discapacidad",desc:"Pago mensual libre de impuestos"},{icon:"🎓",title:"GI Bill",desc:"Financiamiento educativo"},{icon:"🏠",title:"Préstamo VA",desc:"Sin pago inicial"},{icon:"☢️",title:"Ley PACT",desc:"Exposición tóxica"},{icon:"🏥",title:"Atención Médica",desc:"Atención médica del VA"},{icon:"👔",title:"Rehabilitación Voc.",desc:"Capacitación laboral"}]},
    disability:{pct:62,bot:"<strong>Compensación por Discapacidad del VA</strong> — pago mensual libre de impuestos por condiciones relacionadas con el servicio.\n\n<strong>Pago promedio:</strong> $1,500–$3,800/mes\n<strong>Calificaciones:</strong> 10%–100%",chips:["¿Cómo presento un reclamo?","¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios"]},
    gi_bill:{pct:62,bot:"<strong>GI Bill Post-11 de Sep.</strong> cubre:\n\n<strong>Matrícula:</strong> Completa en universidades públicas\n<strong>Vivienda:</strong> ~$1,800–$2,400/mes\n<strong>Libros:</strong> Hasta $1,000/año\n<strong>Duración:</strong> Hasta 36 meses",chips:["¿Cómo solicito?","Buscar consejero VSO","Ver otros beneficios"]},
    home_loan:{pct:62,bot:"<strong>Préstamo para Vivienda VA</strong>:\n\n<strong>Sin pago inicial requerido</strong>\n<strong>Sin seguro hipotecario (PMI)</strong>\n<strong>Tasas de interés competitivas</strong>\n<strong>Reutilizable de por vida</strong>",chips:["¿Soy elegible?","Buscar consejero VSO","Ver otros beneficios"]},
    pact_act:{pct:62,bot:"<strong>Ley PACT (2022)</strong> — la mayor expansión de beneficios del VA en décadas.\n\nCubre: Fosos de quema, Agente Naranja, Enfermedad de la Guerra del Golfo.\n\nMás de 5 millones de veteranos pueden calificar ahora.",chips:["¿Califico?","Buscar consejero VSO","Ver otros beneficios"]},
    healthcare:{pct:62,bot:"<strong>Atención Médica del VA</strong>:\n\nCubre atención primaria, salud mental, medicamentos.\nGratuito para muchos veteranos.\n\nInscríbase en VA.gov o llame al 1-877-222-8387.",chips:["¿Cómo me inscribo?","Buscar consejero VSO","Ver otros beneficios"]},
    voc_rehab:{pct:62,bot:"<strong>Rehabilitación Vocacional (Cap. 31)</strong>:\n\nCubre orientación profesional, educación y colocación laboral para veteranos con una calificación de discapacidad del 10% o más.",chips:["¿Cómo solicito?","Buscar consejero VSO","Ver otros beneficios"]},
    denied:{pct:76,bot:"<strong>Un reclamo denegado no es el final.</strong>\n\nLa mayoría de los primeros reclamos del VA son denegados — pero más del 70% de las apelaciones se ganan con la ayuda correcta.\n\n<strong>Sus opciones:</strong>\n— Reclamo Suplementario (nueva evidencia)\n— Junta de Apelaciones de Veteranos\n— Representante VSO gratuito para luchar por usted\n\nNo se rinda. Un consejero VSO puede revisar su carta de denegación y asesorarle gratis.",chips:["Buscar consejero VSO","¿Cómo presento un reclamo?","Ver otros beneficios","Empezar de nuevo"]},
    file_claim:{pct:76,bot:"<strong>Cómo presentar un reclamo de discapacidad:</strong>\n\n<strong>Paso 1</strong> — Crear cuenta en VA.gov\n<strong>Paso 2</strong> — Completar Formulario VA 21-526EZ\n<strong>Paso 3</strong> — Reunir DD-214 y registros médicos\n<strong>Paso 4</strong> — Presentar en línea, por correo o en persona\n\n<strong>📬 Por correo:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 En persona:</strong> <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Encontrar su oficina VA más cercana →</a>",chips:["¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"]},
    documents:{pct:82,bot:"<strong>Documentos necesarios:</strong>\n\n— DD-214 (papeles de baja)\n— Registros médicos\n— Número de Seguro Social\n— Declaraciones de compañeros (recomendado)\n\n¿No tiene su DD-214? Solicítelo gratis en archives.gov/veterans",chips:["Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"]},
    gi_bill_apply:{pct:76,bot:"<strong>Cómo solicitar el GI Bill Post-9/11:</strong>\n\n<strong>Paso 1</strong> — Solicite en VA.gov/education/apply\n<strong>Paso 2</strong> — Seleccione el Capítulo 33 (GI Bill Post-9/11)\n<strong>Paso 3</strong> — Proporcione su DD-214 e información de la escuela\n<strong>Paso 4</strong> — El VA notifica a su escuela directamente\n\n<strong>Plazo:</strong> 4–8 semanas para aprobación\n<strong>Transferible</strong> a cónyuge o hijos si aún está en servicio",chips:["¿Qué documentos necesito?","¿Puedo transferir mi GI Bill?","Buscar consejero VSO","Ver otros beneficios"]},
    gi_bill_transfer:{pct:82,bot:"<strong>Transferencia de beneficios del GI Bill:</strong>\n\n— Debe estar en servicio activo o Reserva Seleccionada\n— Comprométase a 4 años más de servicio\n— Transfiera en milConnect.deps.mil\n— El cónyuge puede usarlo de inmediato; dependientes entre 18–26 años\n\n¿Ya separado? Los beneficios no se pueden transferir después de salir del servicio.",chips:["Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"]},
    home_loan_apply:{pct:76,bot:"<strong>Cómo obtener un Préstamo VA:</strong>\n\n<strong>Paso 1</strong> — Obtenga su Certificado de Elegibilidad (COE) en VA.gov\n<strong>Paso 2</strong> — Elija un prestamista aprobado por el VA\n<strong>Paso 3</strong> — Encuentre una casa y haga una oferta\n<strong>Paso 4</strong> — Tasación VA + cierre del préstamo\n\n<strong>Quién califica:</strong> 90+ días de servicio activo, o 6 años en Guardia Nacional/Reserva\n<strong>Consejo:</strong> Sin pago inicial, sin PMI.",chips:["¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios"]},
    healthcare_enroll:{pct:76,bot:"<strong>Cómo inscribirse en Atención Médica VA:</strong>\n\n<strong>Opción 1</strong> — En línea: VA.gov/health-care/apply\n<strong>Opción 2</strong> — Llamar: 1-877-222-8387\n<strong>Opción 3</strong> — En persona en cualquier centro médico VA: <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Encontrar ubicaciones →</a>\n\n<strong>Lo que necesita:</strong> DD-214, número de Seguro Social, info de seguro\n\n<strong>Costo:</strong> Gratis para veteranos de combate (primeros 5 años).",chips:["¿Soy elegible para atención médica VA?","Buscar consejero VSO","Ver otros beneficios"]},
    healthcare_eligibility:{pct:82,bot:"<strong>Elegibilidad para Atención Médica VA:</strong>\n\nProbablemente califica si:\n— Sirvió 24+ meses continuos en servicio activo\n— Fue dado de baja por discapacidad relacionada con el servicio\n— Sirvió en zona de combate después del 11 de nov. de 1998\n\n¿No está seguro? Un consejero VSO puede verificar su elegibilidad en minutos.",chips:["¿Cómo me inscribo?","Buscar consejero VSO","Ver otros beneficios"]},
    voc_rehab_apply:{pct:76,bot:"<strong>Cómo solicitar Rehabilitación Vocacional (Cap. 31):</strong>\n\n<strong>Paso 1</strong> — Solicite en VA.gov/careers-employment/vocational-rehabilitation\n<strong>Paso 2</strong> — Reúnase con un Consejero de Rehabilitación Vocacional\n<strong>Paso 3</strong> — Creen un plan de rehabilitación juntos\n\n<strong>Puede calificar si tiene:</strong>\n— Calificación de discapacidad VA del 10%+\n— Barrera de empleo relacionada con su discapacidad",chips:["¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios"]},
    pact_qualify:{pct:76,bot:"<strong>Puede calificar para los beneficios de la Ley PACT si:</strong>\n\n— Sirvió cerca de fosos de quema en Iraq, Afganistán o el Golfo\n— Estuvo expuesto al Agente Naranja\n— Tiene diagnóstico de enfermedad de la Guerra del Golfo\n— Tiene alguna de las 20+ condiciones presuntivas nuevas\n\n<strong>Cambio clave:</strong> Ya no tiene que probar que su enfermedad fue causada por el servicio.",chips:["¿Cómo presento un reclamo?","Buscar consejero VSO","Ver otros beneficios"]},
    spouse:{pct:48,bot:"Gracias por su apoyo y sacrificio. La fortaleza detrás de cada miembro del servicio es su familia. \uD83E\uDD0D\n\n<strong>Beneficios para cónyuges y dependientes de veteranos:</strong>\n\n— <strong>CHAMPVA</strong> — atención médica VA gratuita para dependientes calificados\n— <strong>DEA (Cap. 35)</strong> — beneficios educativos para dependientes\n— <strong>Pensión de Sobrevivientes</strong> — apoyo de ingresos para cónyuges sobrevivientes\n— <strong>DIC</strong> — pago mensual si el veterano murió por causa relacionada con el servicio\n— <strong>Préstamo VA</strong> — los cónyuges sobrevivientes pueden ser elegibles",chips:["Cuéntame sobre DIC","Cuéntame sobre CHAMPVA","Buscar consejero VSO","Ver otros beneficios"]},
    dic:{pct:62,bot:"Estamos profundamente agradecidos por el servicio y sacrificio de su familia. Estamos aquí para apoyarle en cada paso del camino. \uD83C\uDDFA\uD83C\uDDF8\n\n<strong>Compensación de Dependencia e Indemnización (DIC):</strong>\n\nPago mensual libre de impuestos para cónyuges y dependientes sobrevivientes cuando un veterano muere por una condición relacionada con el servicio.\n\n<strong>Tasa base 2024:</strong> $1,612/mes\n\n<strong>Quién califica:</strong>\n— Cónyuge sobreviviente casado con el veterano por 1+ año\n— El veterano murió por enfermedad o lesión relacionada con el servicio\n— O el veterano tenía calificación P&T del 100% por 10+ años antes de morir",chips:["¿Cómo solicito DIC?","Buscar consejero VSO","Ver otros beneficios"]},
    dic_apply:{pct:76,bot:"<strong>Cómo solicitar DIC:</strong>\n\n<strong>Paso 1</strong> — Complete el Formulario VA 21P-534EZ\n<strong>Paso 2</strong> — Adjunte el certificado de defunción del veterano\n<strong>Paso 3</strong> — Incluya el certificado de matrimonio\n<strong>Paso 4</strong> — Envíe a su Centro de Gestión de Pensiones VA\n\n<strong>Consejo:</strong> Un consejero VSO puede preparar y enviar este papeleo de forma gratuita.",chips:["Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"]},
    champva:{pct:62,bot:"<strong>CHAMPVA — Atención Médica VA para Dependientes:</strong>\n\nCobertura de atención médica gratuita para cónyuges e hijos de veteranos que son:\n— 100% permanente y totalmente (P&T) discapacitados, O\n— Fallecieron por una condición relacionada con el servicio\n\n<strong>Cubre:</strong> Visitas médicas, hospitalización, medicamentos, salud mental\n<strong>Costo:</strong> Sin prima. Solo pequeños copagos.",chips:["Buscar consejero VSO","Ver otros beneficios","Empezar de nuevo"]},
    active_duty:{pct:32,bot:"Gracias por su servicio y dedicación. \uD83C\uDDFA\uD83C\uDDF8 Honramos su compromiso con esta nación.\n\n<strong>¿Preparándose para separarse o hacer la transición?</strong>\n\nBeneficios clave en los que actuar <em>antes</em> de salir:\n\n— <strong>Programa TAP</strong> — asistencia de transición obligatoria\n— <strong>Calificación de discapacidad</strong> — presente ANTES de separarse (programa BDD)\n— <strong>GI Bill</strong> — beneficio educativo activo el día que se separa\n— <strong>Atención Médica VA</strong> — inscríbase dentro de 5 años para atención gratuita\n— <strong>Préstamo VA</strong> — disponible inmediatamente después de la separación",chips:["Cuéntame sobre el programa BDD","GI Bill","Préstamo VA","Buscar consejero VSO"]},
    bdd:{pct:48,bot:"<strong>Entrega de Beneficios al Momento del Alta (BDD):</strong>\n\nPresente su reclamo de discapacidad VA 90–180 días ANTES de su fecha de separación.\n\n<strong>Cómo funciona:</strong>\n— Presente en VA.gov/disability/how-to-file-claim\n— Complete su examen C&P mientras aún está en la base\n— La decisión de calificación llega dentro de 30 días de la separación\n\n<strong>Por qué importa:</strong> Sin BDD, la espera promedio es de 3–5 meses.",chips:["¿Qué documentos necesito?","Buscar consejero VSO","Ver otros beneficios"]},
    vso:{pct:92,bot:"Sus consejeros VSO están aquí para ayudarle — sin costo.\n\n<strong>Modo demo:</strong> En el sitio de su organización, los veteranos verán su información de contacto aquí.\n\nPara una referencia ahora:\n<strong>DAV</strong> — <a href=&quot;https://dav.org&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>dav.org</a>\n<strong>VFW</strong> — <a href=&quot;https://vfw.org&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>vfw.org</a>\n<strong>American Legion</strong> — <a href=&quot;https://legion.org&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>legion.org</a>\n\n100% gratuito. 🇺🇸",chips:["Empezar de nuevo","Ver todos los beneficios"]},
    placeholder:"Escriba una pregunta o elija arriba...",
    chooseOption:"Elige una opción",
    footer:"VetNavigator AI · Demo · No es consejo oficial del VA",
    fallback:"¡Buena pregunta! Le recomiendo hablar con un consejero VSO gratuito para orientación personalizada.",
    fallbackChips:["Buscar consejero VSO","Ver todos los beneficios","Empezar de nuevo"]
  },
  vi:{
    welcome:{pct:5,bot:"Chào mừng! Tôi là hướng dẫn viên phúc lợi VA miễn phí của bạn.\n\nHãy tìm phúc lợi của bạn. Điều nào mô tả đúng nhất về bạn?",
      cards:[{icon:"🎖️",title:"Cựu chiến binh",desc:"Tôi đã phục vụ trong quân đội Hoa Kỳ"},{icon:"⚔️",title:"Tại ngũ",desc:"Đang phục vụ"},{icon:"💛",title:"Vợ/Chồng & Gia đình",desc:"Thành viên gia đình cựu chiến binh"},{icon:"🕊️",title:"Vợ/Chồng góa",desc:"Mất người bạn đời là cựu chiến binh"}]},
    veteran:{pct:18,bot:"Cảm ơn bạn đã phục vụ đất nước. 🇺🇸\n\nBạn phục vụ khi nào?",
      cards:[{icon:"🏜️",title:"Sau 11/9",desc:"2001 đến nay"},{icon:"🌊",title:"Chiến tranh Vùng Vịnh",desc:"1990–2001"},{icon:"🌿",title:"Thời kỳ Việt Nam",desc:"1964–1975"},{icon:"🔵",title:"Thời kỳ khác",desc:"Hàn Quốc, Chiến tranh Lạnh..."}]},
    era:{pct:32,bot:"Bạn có xếp hạng khuyết tật VA hiện tại không?",
      cards:[{icon:"✅",title:"Có — đã xếp hạng",desc:"Tôi có tỷ lệ phần trăm"},{icon:"📝",title:"Chưa — chưa nộp",desc:"Chưa từng nộp hồ sơ"},{icon:"❌",title:"Bị từ chối",desc:"Đơn khiếu nại bị từ chối"},{icon:"❓",title:"Không chắc",desc:"Cần kiểm tra"}]},
    benefits_menu:{pct:48,bot:"Đây là các phúc lợi hàng đầu cần khám phá. Bạn quan tâm đến điều gì nhất?",
      cards:[{icon:"💰",title:"Trợ cấp khuyết tật",desc:"Thanh toán hàng tháng miễn thuế"},{icon:"🎓",title:"GI Bill",desc:"Tài trợ giáo dục"},{icon:"🏠",title:"Vay mua nhà VA",desc:"Không cần đặt cọc"},{icon:"☢️",title:"Đạo luật PACT",desc:"Phơi nhiễm độc hại"},{icon:"🏥",title:"Chăm sóc sức khỏe",desc:"Chăm sóc y tế VA"},{icon:"👔",title:"Phục hồi nghề nghiệp",desc:"Đào tạo việc làm"}]},
    disability:{pct:62,bot:"<strong>Bồi thường khuyết tật VA</strong> — thanh toán hàng tháng miễn thuế cho các tình trạng liên quan đến dịch vụ.\n\n<strong>Thanh toán trung bình:</strong> $1,500–$3,800/tháng\n<strong>Xếp hạng:</strong> 10%–100%",chips:["Làm thế nào để nộp đơn?","Cần những giấy tờ gì?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    gi_bill:{pct:62,bot:"<strong>GI Bill sau 11/9</strong> bao gồm:\n\n<strong>Học phí:</strong> Đầy đủ tại các trường đại học công lập\n<strong>Nhà ở:</strong> ~$1,800–$2,400/tháng\n<strong>Sách:</strong> Tới $1,000/năm\n<strong>Thời gian:</strong> Tới 36 tháng",chips:["Làm thế nào để đăng ký?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    home_loan:{pct:62,bot:"<strong>Vay mua nhà VA</strong>:\n\n<strong>Không cần đặt cọc</strong>\n<strong>Không có bảo hiểm thế chấp PMI</strong>\n<strong>Lãi suất cạnh tranh</strong>\n<strong>Có thể dùng nhiều lần</strong>",chips:["Tôi có đủ điều kiện không?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    pact_act:{pct:62,bot:"<strong>Đạo luật PACT (2022)</strong> — mở rộng phúc lợi VA lớn nhất trong nhiều thập kỷ.\n\nBao gồm: Hố đốt rác, Chất độc màu da cam, Bệnh Chiến tranh Vùng Vịnh.\n\nHơn 5 triệu cựu chiến binh có thể đủ điều kiện.",chips:["Tôi có đủ điều kiện không?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    healthcare:{pct:62,bot:"<strong>Chăm sóc sức khỏe VA</strong>:\n\nBao gồm chăm sóc chính, sức khỏe tâm thần, thuốc theo toa.\nMiễn phí cho nhiều cựu chiến binh.\n\nĐăng ký tại VA.gov hoặc gọi 1-877-222-8387.",chips:["Làm thế nào để đăng ký?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    voc_rehab:{pct:62,bot:"<strong>Phục hồi nghề nghiệp (Ch. 31)</strong>:\n\nBao gồm tư vấn nghề nghiệp, giáo dục và giới thiệu việc làm cho cựu chiến binh có xếp hạng khuyết tật từ 10% trở lên.",chips:["Làm thế nào để đăng ký?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    denied:{pct:76,bot:"<strong>Đơn bị từ chối không phải là kết thúc.</strong>\n\nHầu hết các đơn VA lần đầu bị từ chối — nhưng hơn 70% kháng cáo được thắng với sự giúp đỡ đúng đắn.\n\n<strong>Các lựa chọn của bạn:</strong>\n— Khiếu nại bổ sung (bằng chứng mới)\n— Hội đồng Kháng cáo Cựu chiến binh\n— Đại diện VSO miễn phí để bảo vệ quyền lợi của bạn\n\nĐừng bỏ cuộc. Cố vấn VSO có thể xem xét thư từ chối của bạn miễn phí.",chips:["Tìm tư vấn viên VSO","Làm thế nào để nộp đơn?","Xem các phúc lợi khác","Bắt đầu lại"]},
    file_claim:{pct:76,bot:"<strong>Cách nộp đơn khiếu nại khuyết tật:</strong>\n\n<strong>Bước 1</strong> — Tạo tài khoản tại VA.gov\n<strong>Bước 2</strong> — Điền Mẫu VA 21-526EZ\n<strong>Bước 3</strong> — Thu thập DD-214 và hồ sơ y tế\n<strong>Bước 4</strong> — Nộp trực tuyến, qua thư hoặc trực tiếp\n\n<strong>📬 Qua thư:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 Trực tiếp:</strong> <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Tìm văn phòng VA gần nhất →</a>",chips:["Cần những giấy tờ gì?","Tìm tư vấn viên VSO","Xem các phúc lợi khác","Bắt đầu lại"]},
    documents:{pct:82,bot:"<strong>Giấy tờ cần thiết:</strong>\n\n— DD-214 (giấy tờ xuất ngũ)\n— Hồ sơ y tế\n— Số an sinh xã hội\n— Tuyên bố của đồng đội (khuyến nghị)\n\nMất DD-214? Yêu cầu miễn phí tại archives.gov/veterans",chips:["Tìm tư vấn viên VSO","Xem các phúc lợi khác","Bắt đầu lại"]},
    gi_bill_apply:{pct:76,bot:"<strong>Cách đăng ký GI Bill Sau 11/9:</strong>\n\n<strong>Bước 1</strong> — Đăng ký tại VA.gov/education/apply\n<strong>Bước 2</strong> — Chọn Chương 33 (GI Bill Sau 11/9)\n<strong>Bước 3</strong> — Cung cấp DD-214 và thông tin trường học\n<strong>Bước 4</strong> — VA thông báo trực tiếp cho trường của bạn\n\n<strong>Thời gian:</strong> 4–8 tuần để phê duyệt",chips:["Cần những giấy tờ gì?","Tôi có thể chuyển GI Bill không?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    gi_bill_transfer:{pct:82,bot:"<strong>Chuyển nhượng quyền lợi GI Bill:</strong>\n\n— Phải đang tại ngũ hoặc trong Lực lượng Dự bị\n— Cam kết thêm 4 năm phục vụ\n— Chuyển nhượng tại milConnect.deps.mil\n— Vợ/chồng có thể dùng ngay; người phụ thuộc từ 18–26 tuổi\n\nĐã xuất ngũ? Không thể chuyển nhượng quyền lợi sau khi rời quân đội.",chips:["Tìm tư vấn viên VSO","Xem các phúc lợi khác","Bắt đầu lại"]},
    home_loan_apply:{pct:76,bot:"<strong>Cách vay mua nhà VA:</strong>\n\n<strong>Bước 1</strong> — Lấy Giấy chứng nhận đủ điều kiện (COE) tại VA.gov\n<strong>Bước 2</strong> — Chọn người cho vay được VA chấp thuận\n<strong>Bước 3</strong> — Tìm nhà và đặt cọc\n<strong>Bước 4</strong> — Thẩm định VA + đóng cửa khoản vay\n\n<strong>Ai đủ điều kiện:</strong> 90+ ngày tại ngũ, hoặc 6 năm Vệ binh Quốc gia/Dự bị\n<strong>Mẹo:</strong> Không cần đặt cọc, không cần PMI.",chips:["Cần những giấy tờ gì?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    healthcare_enroll:{pct:76,bot:"<strong>Cách đăng ký Chăm sóc Sức khỏe VA:</strong>\n\n<strong>Tùy chọn 1</strong> — Trực tuyến: VA.gov/health-care/apply\n<strong>Tùy chọn 2</strong> — Gọi: 1-877-222-8387\n<strong>Tùy chọn 3</strong> — Trực tiếp tại trung tâm y tế VA: <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Tìm địa điểm →</a>\n\n<strong>Bạn cần:</strong> DD-214, số an sinh xã hội, thông tin bảo hiểm\n\n<strong>Chi phí:</strong> Miễn phí cho cựu chiến binh chiến đấu (5 năm đầu).",chips:["Tôi có đủ điều kiện không?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    healthcare_eligibility:{pct:82,bot:"<strong>Điều kiện Chăm sóc Sức khỏe VA:</strong>\n\nBạn có thể đủ điều kiện nếu:\n— Phục vụ 24+ tháng liên tục tại ngũ\n— Bị xuất ngũ vì khuyết tật liên quan đến dịch vụ\n— Phục vụ trong vùng chiến đấu sau ngày 11/11/1998\n\nKhông chắc? Cố vấn VSO có thể kiểm tra điều kiện của bạn trong vài phút.",chips:["Làm thế nào để đăng ký?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    voc_rehab_apply:{pct:76,bot:"<strong>Cách đăng ký Phục hồi Nghề nghiệp (Ch. 31):</strong>\n\n<strong>Bước 1</strong> — Đăng ký tại VA.gov/careers-employment/vocational-rehabilitation\n<strong>Bước 2</strong> — Gặp Cố vấn Phục hồi Nghề nghiệp\n<strong>Bước 3</strong> — Cùng nhau tạo kế hoạch phục hồi\n\n<strong>Bạn có thể đủ điều kiện nếu có:</strong>\n— Xếp hạng khuyết tật VA 10%+\n— Rào cản việc làm liên quan đến khuyết tật",chips:["Cần những giấy tờ gì?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    pact_qualify:{pct:76,bot:"<strong>Bạn có thể đủ điều kiện cho quyền lợi Đạo luật PACT nếu:</strong>\n\n— Phục vụ gần hầm đốt ở Iraq, Afghanistan hoặc Vùng Vịnh\n— Tiếp xúc với Chất độc da cam\n— Được chẩn đoán bệnh Chiến tranh Vùng Vịnh\n— Có bất kỳ trong 20+ tình trạng giả định mới được thêm vào\n\n<strong>Thay đổi quan trọng:</strong> Bạn không còn phải chứng minh bệnh của bạn do phục vụ gây ra.",chips:["Làm thế nào để nộp đơn?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    spouse:{pct:48,bot:"Cảm ơn sự ủng hộ và hy sinh của bạn. Sức mạnh đằng sau mỗi quân nhân chính là gia đình của họ. \uD83E\uDD0D\n\n<strong>Quyền lợi dành cho vợ/chồng và người phụ thuộc của cựu chiến binh:</strong>\n\n— <strong>CHAMPVA</strong> — chăm sóc sức khỏe VA miễn phí cho người phụ thuộc đủ điều kiện\n— <strong>DEA (Ch. 35)</strong> — quyền lợi giáo dục cho người phụ thuộc\n— <strong>Lương hưu Người sống sót</strong> — hỗ trợ thu nhập cho vợ/chồng góa\n— <strong>DIC</strong> — thanh toán hàng tháng nếu cựu chiến binh chết vì nguyên nhân liên quan đến dịch vụ\n— <strong>Vay mua nhà VA</strong> — vợ/chồng góa có thể đủ điều kiện",chips:["Cho tôi biết về DIC","Cho tôi biết về CHAMPVA","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    dic:{pct:62,bot:"Chúng tôi vô cùng biết ơn sự phục vụ và hy sinh của gia đình bạn. Chúng tôi ở đây để hỗ trợ bạn từng bước. \uD83C\uDDFA\uD83C\uDDF8\n\n<strong>Bồi thường Phụ thuộc và Bồi thường (DIC):</strong>\n\nThanh toán hàng tháng miễn thuế cho vợ/chồng và người phụ thuộc còn sống khi cựu chiến binh chết vì tình trạng liên quan đến dịch vụ.\n\n<strong>Mức cơ sở 2024:</strong> $1,612/tháng\n\n<strong>Ai đủ điều kiện:</strong>\n— Vợ/chồng góa đã kết hôn với cựu chiến binh 1+ năm\n— Cựu chiến binh chết vì bệnh hoặc chấn thương liên quan đến dịch vụ\n— Hoặc cựu chiến binh có xếp hạng P&T 100% trong 10+ năm trước khi chết",chips:["Làm thế nào để đăng ký DIC?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    dic_apply:{pct:76,bot:"<strong>Cách đăng ký DIC:</strong>\n\n<strong>Bước 1</strong> — Điền Mẫu VA 21P-534EZ\n<strong>Bước 2</strong> — Đính kèm giấy chứng tử của cựu chiến binh\n<strong>Bước 3</strong> — Bao gồm giấy chứng nhận kết hôn\n<strong>Bước 4</strong> — Nộp cho Trung tâm Quản lý Lương hưu VA\n\n<strong>Mẹo:</strong> Cố vấn VSO có thể chuẩn bị và nộp hồ sơ này miễn phí.",chips:["Tìm tư vấn viên VSO","Xem các phúc lợi khác","Bắt đầu lại"]},
    champva:{pct:62,bot:"<strong>CHAMPVA — Chăm sóc Sức khỏe VA cho Người phụ thuộc:</strong>\n\nBảo hiểm y tế miễn phí cho vợ/chồng và con của cựu chiến binh:\n— 100% vĩnh viễn và hoàn toàn (P&T) khuyết tật, HOẶC\n— Đã chết vì tình trạng liên quan đến dịch vụ\n\n<strong>Bao gồm:</strong> Khám bác sĩ, nhập viện, thuốc, sức khỏe tâm thần\n<strong>Chi phí:</strong> Không có phí bảo hiểm. Chỉ đồng thanh toán nhỏ.",chips:["Tìm tư vấn viên VSO","Xem các phúc lợi khác","Bắt đầu lại"]},
    active_duty:{pct:32,bot:"Cảm ơn bạn vì sự phục vụ và cống hiến. \uD83C\uDDFA\uD83C\uDDF8 Chúng tôi trân trọng sự tận tâm của bạn với đất nước này.\n\n<strong>Chuẩn bị xuất ngũ hoặc chuyển đổi?</strong>\n\nQuyền lợi chính cần thực hiện <em>trước khi</em> rời quân đội:\n\n— <strong>Chương trình TAP</strong> — hỗ trợ chuyển đổi bắt buộc\n— <strong>Xếp hạng khuyết tật</strong> — nộp TRƯỚC khi xuất ngũ (chương trình BDD)\n— <strong>GI Bill</strong> — quyền lợi giáo dục có hiệu lực ngay ngày xuất ngũ\n— <strong>Chăm sóc Sức khỏe VA</strong> — đăng ký trong 5 năm để được chăm sóc miễn phí\n— <strong>Vay mua nhà VA</strong> — có sẵn ngay sau khi xuất ngũ",chips:["Cho tôi biết về chương trình BDD","GI Bill","Vay mua nhà VA","Tìm tư vấn viên VSO"]},
    bdd:{pct:48,bot:"<strong>Phân phối Quyền lợi khi Xuất ngũ (BDD):</strong>\n\nNộp đơn khiếu nại khuyết tật VA 90–180 ngày TRƯỚC ngày xuất ngũ.\n\n<strong>Cách thức:</strong>\n— Nộp tại VA.gov/disability/how-to-file-claim\n— Hoàn thành kỳ thi C&P khi còn ở căn cứ\n— Quyết định xếp hạng đến trong vòng 30 ngày sau xuất ngũ\n\n<strong>Tại sao quan trọng:</strong> Không có BDD, thời gian chờ trung bình là 3–5 tháng.",chips:["Cần những giấy tờ gì?","Tìm tư vấn viên VSO","Xem các phúc lợi khác"]},
    vso:{pct:92,bot:"Các cố vấn VSO sẵn sàng giúp đỡ — miễn phí.\n\n<strong>Chế độ demo:</strong> Trên trang web thực tế, cựu chiến binh sẽ thấy thông tin liên hệ của tổ chức bạn.\n\n<strong>DAV</strong> — dav.org\n<strong>VFW</strong> — vfw.org\n\n100% miễn phí. 🇺🇸",chips:["Bắt đầu lại","Xem tất cả phúc lợi"]},
    placeholder:"Nhập câu hỏi hoặc chọn bên trên...",
    chooseOption:"Chọn một tùy chọn",
    footer:"VetNavigator AI · Demo · Không phải lời khuyên chính thức của VA",
    fallback:"Câu hỏi hay! Tôi khuyên bạn nên nói chuyện với tư vấn viên VSO miễn phí để được hướng dẫn cá nhân.",
    fallbackChips:["Tìm tư vấn viên VSO","Xem tất cả phúc lợi","Bắt đầu lại"]
  },
  ko:{
    welcome:{pct:5,bot:"환영합니다! 저는 무료 VA 혜택 안내자입니다. 귀하가 받을 수 있는 혜택을 찾아드리겠습니다.\n\n귀하는 누구십니까?",
      cards:[{icon:"🎖️",title:"참전용사",desc:"미군에서 복무했습니다"},{icon:"⚔️",title:"현역",desc:"현재 복무 중"},{icon:"💛",title:"배우자/가족",desc:"참전용사의 가족"},{icon:"🕊️",title:"유족 배우자",desc:"참전용사 배우자를 잃었습니다"}]},
    veteran:{pct:18,bot:"귀하의 봉사에 감사드립니다. 🇺🇸\n\n언제 복무하셨습니까?",
      cards:[{icon:"🏜️",title:"9/11 이후",desc:"2001년~현재"},{icon:"🌊",title:"걸프전",desc:"1990–2001"},{icon:"🌿",title:"베트남 시대",desc:"1964–1975"},{icon:"🔵",title:"기타 시대",desc:"한국전쟁, 냉전 등"}]},
    era:{pct:32,bot:"현재 VA 장애 등급을 받고 계십니까?",
      cards:[{icon:"✅",title:"예 — 등급 있음",desc:"장애 비율이 있습니다"},{icon:"📝",title:"아니오 — 아직",desc:"신청한 적 없음"},{icon:"❌",title:"거부됨",desc:"청구가 거부되었습니다"},{icon:"❓",title:"잘 모름",desc:"확인 필요"}]},
    benefits_menu:{pct:48,bot:"주요 혜택 목록입니다. 어떤 것이 가장 관심 있으십니까?",
      cards:[{icon:"💰",title:"장애 급여",desc:"비과세 월 지급금"},{icon:"🎓",title:"GI Bill",desc:"교육 지원금"},{icon:"🏠",title:"VA 주택 대출",desc:"계약금 불필요"},{icon:"☢️",title:"PACT법",desc:"독성 노출"},{icon:"🏥",title:"의료 서비스",desc:"VA 의료 서비스"},{icon:"👔",title:"직업 재활",desc:"직업 훈련"}]},
    disability:{pct:62,bot:"<strong>VA 장애 보상</strong> — 복무 관련 질환에 대한 비과세 월 지급금.\n\n<strong>평균 지급액:</strong> $1,500–$3,800/월\n<strong>등급:</strong> 10%–100%",chips:["청구 방법은?","어떤 서류가 필요합니까?","VSO 상담사 찾기","다른 혜택 보기"]},
    gi_bill:{pct:62,bot:"<strong>9/11 이후 GI Bill</strong> 혜택:\n\n<strong>학비:</strong> 공립대학교 전액\n<strong>주거비:</strong> 월 ~$1,800–$2,400\n<strong>도서비:</strong> 연 최대 $1,000\n<strong>기간:</strong> 최대 36개월",chips:["신청 방법은?","VSO 상담사 찾기","다른 혜택 보기"]},
    home_loan:{pct:62,bot:"<strong>VA 주택 담보 대출</strong>:\n\n<strong>계약금 불필요</strong>\n<strong>PMI(주택담보보험) 없음</strong>\n<strong>경쟁력 있는 이자율</strong>\n<strong>평생 재사용 가능</strong>",chips:["자격이 되나요?","VSO 상담사 찾기","다른 혜택 보기"]},
    pact_act:{pct:62,bot:"<strong>PACT법 (2022)</strong> — 수십 년 만의 최대 VA 혜택 확대.\n\n소각 구덩이, 에이전트 오렌지, 걸프전 질환 포함.\n\n500만 명 이상의 참전용사가 새로 자격을 얻을 수 있습니다.",chips:["자격이 되나요?","VSO 상담사 찾기","다른 혜택 보기"]},
    healthcare:{pct:62,bot:"<strong>VA 의료 서비스</strong>:\n\n1차 진료, 정신 건강, 처방약 포함.\n많은 참전용사에게 무료.\n\nVA.gov에서 등록하거나 1-877-222-8387로 전화하세요.",chips:["등록 방법은?","VSO 상담사 찾기","다른 혜택 보기"]},
    voc_rehab:{pct:62,bot:"<strong>직업 재활 (Ch. 31)</strong>:\n\n장애 등급 10% 이상인 참전용사를 위한 직업 상담, 교육, 취업 지원.",chips:["신청 방법은?","VSO 상담사 찾기","다른 혜택 보기"]},
    denied:{pct:76,bot:"<strong>거부된 청구는 끝이 아닙니다.</strong>\n\n대부분의 첫 VA 청구는 거부됩니다 — 하지만 올바른 도움을 받으면 70% 이상의 항소가 승인됩니다.\n\n<strong>선택 사항:</strong>\n— 추가 청구 (새 증거)\n— 재향군인 항소 위원회\n— 무료 VSO 대리인\n\n포기하지 마세요. VSO 상담사가 거부 통지를 무료로 검토해 드립니다.",chips:["VSO 상담사 찾기","청구 방법은?","다른 혜택 보기","처음으로"]},
    file_claim:{pct:76,bot:"<strong>장애 청구 제출 방법:</strong>\n\n<strong>1단계</strong> — VA.gov 계정 생성\n<strong>2단계</strong> — VA 양식 21-526EZ 작성\n<strong>3단계</strong> — DD-214 및 의료 기록 수집\n<strong>4단계</strong> — 온라인, 우편 또는 직접 제출\n\n<strong>📬 우편:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 직접 방문:</strong> <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>가장 가까운 VA 사무소 찾기 →</a>",chips:["어떤 서류가 필요합니까?","VSO 상담사 찾기","다른 혜택 보기","처음으로"]},
    documents:{pct:82,bot:"<strong>필요한 서류:</strong>\n\n— DD-214 (전역 서류)\n— 의료 기록\n— 사회보장번호\n— 전우 진술서 (권장)\n\nDD-214 분실? archives.gov/veterans에서 무료 요청",chips:["VSO 상담사 찾기","다른 혜택 보기","처음으로"]},
    gi_bill_apply:{pct:76,bot:"<strong>Post-9/11 GI Bill 신청 방법:</strong>\n\n<strong>1단계</strong> — VA.gov/education/apply에서 신청\n<strong>2단계</strong> — 33장 (Post-9/11 GI Bill) 선택\n<strong>3단계</strong> — DD-214 및 학교 정보 제공\n<strong>4단계</strong> — VA가 직접 학교에 통보\n\n<strong>기간:</strong> 승인까지 4–8주",chips:["어떤 서류가 필요합니까?","GI Bill을 이전할 수 있나요?","VSO 상담사 찾기","다른 혜택 보기"]},
    gi_bill_transfer:{pct:82,bot:"<strong>GI Bill 혜택 이전:</strong>\n\n— 현역 또는 선택 예비군이어야 함\n— 4년 추가 복무 약속\n— milConnect.deps.mil에서 이전\n— 배우자는 즉시 사용 가능; 부양가족은 18–26세\n\n이미 전역? 전역 후에는 혜택 이전 불가.",chips:["VSO 상담사 찾기","다른 혜택 보기","처음으로"]},
    home_loan_apply:{pct:76,bot:"<strong>VA 주택 대출 받는 방법:</strong>\n\n<strong>1단계</strong> — VA.gov에서 자격 증명서(COE) 취득\n<strong>2단계</strong> — VA 승인 대출 기관 선택\n<strong>3단계</strong> — 주택 찾기 및 제안\n<strong>4단계</strong> — VA 감정 + 대출 마감\n\n<strong>자격:</strong> 현역 90일 이상, 또는 방위군/예비군 6년\n<strong>팁:</strong> 계약금 불필요, PMI 없음.",chips:["어떤 서류가 필요합니까?","VSO 상담사 찾기","다른 혜택 보기"]},
    healthcare_enroll:{pct:76,bot:"<strong>VA 의료 서비스 등록 방법:</strong>\n\n<strong>옵션 1</strong> — 온라인: VA.gov/health-care/apply\n<strong>옵션 2</strong> — 전화: 1-877-222-8387\n<strong>옵션 3</strong> — 직접 VA 의료 센터 방문: <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>위치 찾기 →</a>\n\n<strong>필요한 것:</strong> DD-214, 주민등록번호, 보험 정보\n\n<strong>비용:</strong> 전투 참전용사 무료 (첫 5년).",chips:["VA 의료 서비스 자격이 됩니까?","VSO 상담사 찾기","다른 혜택 보기"]},
    healthcare_eligibility:{pct:82,bot:"<strong>VA 의료 서비스 자격:</strong>\n\n다음에 해당하면 자격이 있을 수 있습니다:\n— 현역으로 24개월 이상 연속 복무\n— 복무 관련 장애로 전역\n— 1998년 11월 11일 이후 전투 지역 복무\n\n확실하지 않으세요? VSO 상담사가 몇 분 안에 자격을 확인해 드릴 수 있습니다.",chips:["등록 방법은?","VSO 상담사 찾기","다른 혜택 보기"]},
    voc_rehab_apply:{pct:76,bot:"<strong>직업 재활 (31장) 신청 방법:</strong>\n\n<strong>1단계</strong> — VA.gov/careers-employment/vocational-rehabilitation에서 신청\n<strong>2단계</strong> — 직업 재활 상담사와 면담\n<strong>3단계</strong> — 함께 재활 계획 수립\n\n<strong>자격 조건:</strong>\n— VA 장애 등급 10%+\n— 장애로 인한 취업 장벽",chips:["어떤 서류가 필요합니까?","VSO 상담사 찾기","다른 혜택 보기"]},
    pact_qualify:{pct:76,bot:"<strong>다음에 해당하면 PACT법 혜택을 받을 수 있습니다:</strong>\n\n— 이라크, 아프가니스탄 또는 걸프 지역의 소각 구덩이 근처에서 복무\n— 고엽제 노출\n— 걸프전 질병 진단\n— 20개 이상 새로 추가된 추정 질환 중 하나\n\n<strong>주요 변경 사항:</strong> 더 이상 질병이 복무로 인한 것임을 증명할 필요가 없습니다.",chips:["청구 방법은?","VSO 상담사 찾기","다른 혜택 보기"]},
    spouse:{pct:48,bot:"귀하의 지원과 희생에 감사드립니다. 모든 군인의 힘은 그 가족에게서 나옵니다. \uD83E\uDD0D\n\n<strong>참전용사 배우자 및 부양가족을 위한 혜택:</strong>\n\n— <strong>CHAMPVA</strong> — 자격을 갖춘 부양가족을 위한 무료 VA 의료\n— <strong>DEA (35장)</strong> — 부양가족을 위한 교육 혜택\n— <strong>유족 연금</strong> — 저소득 유족 배우자를 위한 소득 지원\n— <strong>DIC</strong> — 참전용사가 복무 관련 원인으로 사망한 경우 월 지급금\n— <strong>VA 주택 대출</strong> — 유족 배우자도 자격이 될 수 있음",chips:["DIC에 대해 알려주세요","CHAMPVA에 대해 알려주세요","VSO 상담사 찾기","다른 혜택 보기"]},
    dic:{pct:62,bot:"<strong>의존성 및 배상 보상 (DIC):</strong>\n\n참전용사가 복무 관련 질환으로 사망한 경우 유족 배우자와 부양가족에게 지급되는 월간 비과세 지급금.\n\n<strong>2024 기본 요율:</strong> $1,612/월\n\n<strong>자격:</strong>\n— 참전용사와 1년 이상 결혼한 유족 배우자\n— 참전용사가 복무 관련 질병 또는 부상으로 사망\n— 또는 참전용사가 사망 전 10년 이상 100% P&T 등급 보유",chips:["DIC 신청 방법은?","VSO 상담사 찾기","다른 혜택 보기"]},
    dic_apply:{pct:76,bot:"<strong>DIC 신청 방법:</strong>\n\n<strong>1단계</strong> — VA 양식 21P-534EZ 작성\n<strong>2단계</strong> — 참전용사 사망 증명서 첨부\n<strong>3단계</strong> — 혼인 증명서 포함\n<strong>4단계</strong> — VA 연금 관리 센터에 제출\n\n<strong>팁:</strong> VSO 상담사가 무료로 이 서류를 준비하고 제출할 수 있습니다.",chips:["VSO 상담사 찾기","다른 혜택 보기","처음으로"]},
    champva:{pct:62,bot:"<strong>CHAMPVA — 부양가족을 위한 VA 의료:</strong>\n\n다음에 해당하는 참전용사의 배우자와 자녀를 위한 무료 의료 보험:\n— 100% 영구 전체 (P&T) 장애, 또는\n— 복무 관련 질환으로 사망\n\n<strong>포함:</strong> 의사 방문, 입원 치료, 처방약, 정신 건강\n<strong>비용:</strong> 보험료 없음. 소액 본인 부담금만.",chips:["VSO 상담사 찾기","다른 혜택 보기","처음으로"]},
    active_duty:{pct:32,bot:"복무와 헌신에 감사드립니다. \uD83C\uDDFA\uD83C\uDDF8 이 나라를 위한 귀하의 희생을 기립니다.\n\n<strong>전역 또는 전환 준비 중이신가요?</strong>\n\n떠나기 <em>전에</em> 해야 할 주요 혜택:\n\n— <strong>TAP 프로그램</strong> — 의무적 전환 지원\n— <strong>장애 등급</strong> — 전역 전에 신청하세요 (BDD 프로그램)\n— <strong>GI Bill</strong> — 전역 당일부터 교육 혜택 활성화\n— <strong>VA 의료</strong> — 5년 이내에 등록하면 무료 진료\n— <strong>VA 주택 대출</strong> — 전역 직후 이용 가능",chips:["BDD 프로그램에 대해 알려주세요","GI Bill","VA 주택 대출","VSO 상담사 찾기"]},
    bdd:{pct:48,bot:"<strong>전역 시 혜택 제공 (BDD):</strong>\n\n전역일 90–180일 전에 VA 장애 청구를 제출하세요.\n\n<strong>작동 방식:</strong>\n— VA.gov/disability/how-to-file-claim에서 신청\n— 기지에 있는 동안 C&P 검사 완료\n— 전역 후 30일 이내에 등급 결정 도착\n\n<strong>중요한 이유:</strong> BDD 없이는 평균 대기 시간이 3–5개월입니다.",chips:["어떤 서류가 필요합니까?","VSO 상담사 찾기","다른 혜택 보기"]},
    vso:{pct:92,bot:"무료 VSO 상담사가 도와드리겠습니다.\n\n<strong>데모 모드:</strong> 실제 설치 시 조직 정보가 여기에 표시됩니다.\n\n<strong>DAV</strong> — dav.org\n<strong>VFW</strong> — vfw.org\n\n100% 무료. 예약 없이 방문 가능. 🇺🇸",chips:["처음으로","모든 혜택 보기"]},
    placeholder:"질문을 입력하거나 위에서 선택하세요...",
    chooseOption:"옵션을 선택하세요",
    footer:"VetNavigator AI · 데모 · 공식 VA 조언이 아닙니다",
    fallback:"좋은 질문입니다! 개인 맞춤형 안내를 위해 무료 VSO 상담사와 상담하는 것을 권장합니다.",
    fallbackChips:["VSO 상담사 찾기","모든 혜택 보기","처음으로"]
  },
  tl:{
    welcome:{pct:5,bot:"Maligayang pagdating! Ako ang iyong libreng gabay sa mga benepisyo ng VA.\n\nHanapin natin ang iyong mga benepisyo. Alin ang pinaka-angkop sa iyo?",
      cards:[{icon:"🎖️",title:"Beterano",desc:"Nagsilbi sa militar ng US"},{icon:"⚔️",title:"Aktibong Serbisyo",desc:"Kasalukuyang naglilingkod"},{icon:"💛",title:"Asawa / Pamilya",desc:"Miyembro ng pamilya ng beterano"},{icon:"🕊️",title:"Naiwang Asawa",desc:"Nawalan ng asawang beterano"}]},
    veteran:{pct:18,bot:"Salamat sa iyong serbisyo. 🇺🇸\n\nKailan ka nagsilbi?",
      cards:[{icon:"🏜️",title:"Post-9/11",desc:"2001 hanggang kasalukuyan"},{icon:"🌊",title:"Digmaang Gulpo",desc:"1990–2001"},{icon:"🌿",title:"Panahon ng Vietnam",desc:"1964–1975"},{icon:"🔵",title:"Ibang Panahon",desc:"Korea, Cold War, atbp."}]},
    era:{pct:32,bot:"Mayroon ka bang kasalukuyang rating ng kapansanan mula sa VA?",
      cards:[{icon:"✅",title:"Oo — may rating",desc:"Mayroon akong porsyento"},{icon:"📝",title:"Hindi — hindi pa",desc:"Hindi pa nag-apply"},{icon:"❌",title:"Tinanggihan",desc:"Ang claim ay tinanggihan"},{icon:"❓",title:"Hindi sigurado",desc:"Kailangang suriin"}]},
    benefits_menu:{pct:48,bot:"Narito ang mga pangunahing benepisyo. Alin ang pinaka-interesado ka?",
      cards:[{icon:"💰",title:"Bayad sa Kapansanan",desc:"Buwanang bayad na walang buwis"},{icon:"🎓",title:"GI Bill",desc:"Pagpopondo sa edukasyon"},{icon:"🏠",title:"VA Home Loan",desc:"Walang down payment"},{icon:"☢️",title:"PACT Act",desc:"Pagkakalantad sa lason"},{icon:"🏥",title:"Pangangalagang Pangkalusugan",desc:"Medikal ng VA"},{icon:"👔",title:"Voc Rehab",desc:"Pagsasanay sa trabaho"}]},
    disability:{pct:62,bot:"<strong>Kabayarang VA para sa Kapansanan</strong> — buwanang bayad na walang buwis para sa mga kondisyong may kaugnayan sa serbisyo.\n\n<strong>Karaniwang bayad:</strong> $1,500–$3,800/buwan\n<strong>Mga rating:</strong> 10%–100%",chips:["Paano mag-file ng claim?","Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    gi_bill:{pct:62,bot:"<strong>Post-9/11 GI Bill</strong> saklaw:\n\n<strong>Matrikula:</strong> Buo sa mga pampublikong unibersidad\n<strong>Pabahay:</strong> ~$1,800–$2,400/buwan\n<strong>Mga libro:</strong> Hanggang $1,000/taon\n<strong>Tagal:</strong> Hanggang 36 buwan",chips:["Paano mag-apply?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    home_loan:{pct:62,bot:"<strong>VA Home Loan</strong>:\n\n<strong>Walang kinakailangang down payment</strong>\n<strong>Walang PMI (mortgage insurance)</strong>\n<strong>Mapagkumpetensyang mga rate ng interes</strong>\n<strong>Magagamit muli habambuhay</strong>",chips:["Kwalipikado ba ako?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    pact_act:{pct:62,bot:"<strong>PACT Act (2022)</strong> — pinakamalaking pagpapalawak ng mga benepisyo ng VA sa loob ng maraming dekada.\n\nSaklaw: Burn pits, Agent Orange, Gulf War illness.\n\nMahigit 5 milyong beterano ang maaaring kwalipikado na ngayon.",chips:["Kwalipikado ba ako?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    healthcare:{pct:62,bot:"<strong>Pangangalagang Pangkalusugan ng VA</strong>:\n\nPangunahing pag-aalaga, kalusugang pangkaisipan, mga reseta.\nLibre para sa maraming beterano.\n\nMag-enroll sa VA.gov o tumawag sa 1-877-222-8387.",chips:["Paano mag-enroll?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    voc_rehab:{pct:62,bot:"<strong>Vocational Rehabilitation (Ch. 31)</strong>:\n\nSaklaw ang career counseling, edukasyon, at paghahanap ng trabaho para sa mga beteranong may rating na kapansanan na 10% pataas.",chips:["Paano mag-apply?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    denied:{pct:76,bot:"<strong>Ang tinanggihang claim ay hindi katapusan.</strong>\n\nKaramihan sa mga unang VA claim ay tinatanggihan — ngunit higit sa 70% ng mga apela ay nananalo sa tamang tulong.\n\n<strong>Ang iyong mga pagpipilian:</strong>\n— Supplemental Claim (bagong ebidensya)\n— Board of Veterans Appeals\n— Libreng VSO rep\n\nHuwag sumuko. Maaaring suriin ng VSO counselor ang iyong liham ng pagtanggi nang libre.",chips:["Humanap ng VSO counselor","Paano mag-file ng claim?","Tingnan ang ibang benepisyo","Magsimula muli"]},
    file_claim:{pct:76,bot:"<strong>Paano mag-file ng claim sa kapansanan:</strong>\n\n<strong>Hakbang 1</strong> — Gumawa ng account sa VA.gov\n<strong>Hakbang 2</strong> — Kumpletuhin ang VA Form 21-526EZ\n<strong>Hakbang 3</strong> — Tipunin ang DD-214 at mga medikal na rekord\n<strong>Hakbang 4</strong> — Isumite online, sa pamamagitan ng koreo, o personal\n\n<strong>📬 Sa pamamagitan ng koreo:</strong>\nDepartment of Veterans Affairs\nClaims Intake Center\nPO Box 4444, Janesville, WI 53547-4444\n\n<strong>🏥 Personal:</strong> <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Hanapin ang pinakamalapit na VA office →</a>",chips:["Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"]},
    documents:{pct:82,bot:"<strong>Mga kinakailangang dokumento:</strong>\n\n— DD-214 (mga papeles ng paglabas)\n— Mga medikal na rekord\n— Numero ng Social Security\n— Mga pahayag ng kasama (inirerekomenda)\n\nNawala ang DD-214? Hilingin nang libre sa archives.gov/veterans",chips:["Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"]},
    gi_bill_apply:{pct:76,bot:"<strong>Paano mag-apply para sa Post-9/11 GI Bill:</strong>\n\n<strong>Hakbang 1</strong> — Mag-apply sa VA.gov/education/apply\n<strong>Hakbang 2</strong> — Piliin ang Kabanata 33 (Post-9/11 GI Bill)\n<strong>Hakbang 3</strong> — Ibigay ang iyong DD-214 at impormasyon ng paaralan\n<strong>Hakbang 4</strong> — Direktang aabisuhan ng VA ang iyong paaralan\n\n<strong>Takdang panahon:</strong> 4–8 linggo para sa pag-apruba",chips:["Anong mga dokumento ang kailangan?","Maaari ko bang ilipat ang aking GI Bill?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    gi_bill_transfer:{pct:82,bot:"<strong>Paglilipat ng mga benepisyo ng GI Bill:</strong>\n\n— Dapat ay nasa aktibong serbisyo o Selected Reserve\n— Mag-commit ng 4 pang taon ng serbisyo\n— Maglipat sa milConnect.deps.mil\n— Maaaring gamitin ng asawa kaagad; mga dependent sa edad 18–26\n\nNaghiwalay na? Hindi na maaaring ilipat ang mga benepisyo pagkatapos umalis sa serbisyo.",chips:["Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"]},
    home_loan_apply:{pct:76,bot:"<strong>Paano makakuha ng VA Home Loan:</strong>\n\n<strong>Hakbang 1</strong> — Kumuha ng Certificate of Eligibility (COE) sa VA.gov\n<strong>Hakbang 2</strong> — Pumili ng VA-approved na nagpapahiram\n<strong>Hakbang 3</strong> — Maghanap ng bahay at gumawa ng alok\n<strong>Hakbang 4</strong> — VA appraisal + pagsasara ng pautang\n\n<strong>Sino ang kwalipikado:</strong> 90+ araw aktibong serbisyo, o 6 taon National Guard/Reserve\n<strong>Tip:</strong> Walang down payment, walang PMI.",chips:["Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    healthcare_enroll:{pct:76,bot:"<strong>Paano mag-enroll sa VA Healthcare:</strong>\n\n<strong>Opsyon 1</strong> — Online: VA.gov/health-care/apply\n<strong>Opsyon 2</strong> — Tumawag: 1-877-222-8387\n<strong>Opsyon 3</strong> — Personal sa anumang VA medical center: <a href=&quot;https://va.gov/find-locations&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot; style=&quot;color:var(--gold);text-decoration:underline;text-underline-offset:2px;&quot;>Hanapin ang mga lokasyon →</a>\n\n<strong>Kailangan mo:</strong> DD-214, Social Security number, impormasyon ng insurance\n\n<strong>Gastos:</strong> Libre para sa mga combat veteran (unang 5 taon).",chips:["Kwalipikado ba ako para sa VA Healthcare?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    healthcare_eligibility:{pct:82,bot:"<strong>Pagiging karapat-dapat sa VA Healthcare:</strong>\n\nMalamang na kwalipikado ka kung:\n— Naglingkod ng 24+ tuluy-tuloy na buwan sa aktibong tungkulin\n— Napalabas dahil sa kapansanang may kaugnayan sa serbisyo\n— Naglingkod sa combat zone pagkatapos ng Nov 11, 1998\n\nHindi sigurado? Maaaring suriin ng VSO counselor ang iyong pagiging karapat-dapat sa loob ng ilang minuto.",chips:["Paano mag-enroll?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    voc_rehab_apply:{pct:76,bot:"<strong>Paano mag-apply para sa Vocational Rehabilitation (Ch. 31):</strong>\n\n<strong>Hakbang 1</strong> — Mag-apply sa VA.gov/careers-employment/vocational-rehabilitation\n<strong>Hakbang 2</strong> — Makipagpulong sa Vocational Rehabilitation Counselor\n<strong>Hakbang 3</strong> — Sama-samang lumikha ng rehabilitation plan\n\n<strong>Maaaring kwalipikado ka kung mayroon kang:</strong>\n— VA disability rating na 10%+\n— Hadlang sa trabaho na may kaugnayan sa kapansanan",chips:["Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    pact_qualify:{pct:76,bot:"<strong>Maaaring kwalipikado ka para sa mga benepisyo ng PACT Act kung:</strong>\n\n— Naglingkod malapit sa mga burn pit sa Iraq, Afghanistan, o Gulf\n— Na-expose sa Agent Orange\n— May diagnosis na Gulf War illness\n— Mayroon kang alinman sa 20+ bagong idinagdag na presumptive condition\n\n<strong>Pangunahing pagbabago:</strong> Hindi na kailangang patunayan na ang iyong sakit ay dulot ng serbisyo.",chips:["Paano mag-file ng claim?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    spouse:{pct:48,bot:"<strong>Mga benepisyo para sa mga asawa at dependent ng beterano:</strong>\n\n— <strong>CHAMPVA</strong> — libreng VA healthcare para sa mga kwalipikadong dependent\n— <strong>DEA (Ch. 35)</strong> — mga benepisyo sa edukasyon para sa mga dependent\n— <strong>Survivors Pension</strong> — suporta sa kita para sa mga surviving spouse na may mababang kita\n— <strong>DIC</strong> — buwanang bayad kung namatay ang beterano dahil sa sanhi na may kaugnayan sa serbisyo\n— <strong>VA Home Loan</strong> — maaaring kwalipikado ang mga surviving spouse",chips:["Sabihin sa akin ang tungkol sa DIC","Sabihin sa akin ang tungkol sa CHAMPVA","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    dic:{pct:62,bot:"<strong>Dependency and Indemnity Compensation (DIC):</strong>\n\nBuwanang bayad na walang buwis para sa mga surviving spouse at dependent kapag namatay ang beterano dahil sa kondisyong may kaugnayan sa serbisyo.\n\n<strong>Base rate 2024:</strong> $1,612/buwan\n\n<strong>Sino ang kwalipikado:</strong>\n— Surviving spouse na kasal sa beterano ng 1+ taon\n— Namatay ang beterano dahil sa sakit o pinsalang may kaugnayan sa serbisyo\n— O ang beterano ay may 100% P&T rating sa loob ng 10+ taon bago mamatay",chips:["Paano mag-apply para sa DIC?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    dic_apply:{pct:76,bot:"<strong>Paano mag-apply para sa DIC:</strong>\n\n<strong>Hakbang 1</strong> — Kumpletuhin ang VA Form 21P-534EZ\n<strong>Hakbang 2</strong> — Ilakip ang death certificate ng beterano\n<strong>Hakbang 3</strong> — Isama ang marriage certificate\n<strong>Hakbang 4</strong> — Isumite sa VA Pension Management Center\n\n<strong>Tip:</strong> Maaaring ihanda at isumite ng VSO counselor ang mga papeles na ito nang libre.",chips:["Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"]},
    champva:{pct:62,bot:"<strong>CHAMPVA — VA Healthcare para sa mga Dependent:</strong>\n\nLibreng healthcare coverage para sa mga asawa at anak ng mga beteranong:\n— 100% permanente at ganap (P&T) na may kapansanan, O\n— Namatay dahsa kondisyong may kaugnayan sa serbisyo\n\n<strong>Sinasaklaw:</strong> Pagbisita sa doktor, pag-ospital, reseta, kalusugang pang-isip\n<strong>Gastos:</strong> Walang premium. Maliliit na copay lamang.",chips:["Humanap ng VSO counselor","Tingnan ang ibang benepisyo","Magsimula muli"]},
    active_duty:{pct:32,bot:"<strong>Naghahanda bang maghiwalay o mag-transition?</strong>\n\nMga pangunahing benepisyo na dapat gawin <em>bago</em> ka umalis:\n\n— <strong>TAP Program</strong> — mandatory na tulong sa transition\n— <strong>Disability rating</strong> — mag-file BAGO ka maghiwalay (BDD program)\n— <strong>GI Bill</strong> — benepisyo sa edukasyon na aktibo sa araw ng paghihiwalay\n— <strong>VA Healthcare</strong> — mag-enroll sa loob ng 5 taon para sa libreng pag-aalaga\n— <strong>VA Home Loan</strong> — available kaagad pagkatapos ng paghihiwalay",chips:["Sabihin sa akin ang tungkol sa BDD program","GI Bill","VA Home Loan","Humanap ng VSO counselor"]},
    bdd:{pct:48,bot:"<strong>Benefits Delivery at Discharge (BDD):</strong>\n\nMag-file ng iyong VA disability claim 90–180 araw BAGO ang iyong petsa ng paghihiwalay.\n\n<strong>Paano ito gumagana:</strong>\n— Mag-file sa VA.gov/disability/how-to-file-claim\n— Kumpletuhin ang iyong C&P exam habang nasa base pa\n— Ang desisyon sa rating ay darating sa loob ng 30 araw pagkatapos ng paghihiwalay\n\n<strong>Bakit mahalaga:</strong> Kung wala ang BDD, ang average na oras ng paghihintay ay 3–5 buwan.",chips:["Anong mga dokumento ang kailangan?","Humanap ng VSO counselor","Tingnan ang ibang benepisyo"]},
    vso:{pct:92,bot:"Ang inyong mga VSO counselor ay handang tumulong — libre.\n\n<strong>Demo mode:</strong> Sa totoong site, makikita ng mga beterano ang impormasyon ng inyong organisasyon dito.\n\n<strong>DAV</strong> — dav.org\n<strong>VFW</strong> — vfw.org\n\n100% libre. Tinatanggap ang mga walk-in. 🇺🇸",chips:["Magsimula muli","Tingnan ang lahat ng benepisyo"]},
    placeholder:"Mag-type ng tanong o pumili sa itaas...",
    chooseOption:"Pumili ng opsyon",
    footer:"VetNavigator AI · Demo · Hindi opisyal na payo ng VA",
    fallback:"Magandang tanong! Inirerekomenda kong makipag-usap sa isang libreng VSO counselor para sa personalized na gabay.",
    fallbackChips:["Humanap ng VSO counselor","Tingnan ang lahat ng benepisyo","Magsimula muli"]
  }
};
;
var cwOrgName    = "VFW Post 1234"; // updated by admin save
var cwOrgCity    = "";
var cwOrgAddr    = "";
var cwOrgPhone   = "";
var cwOrgEmail   = "";
var cwOrgWeb     = "";
var cwOrgHours   = "";
var cwOrgEvents  = ["Monthly Meeting — 1st Tuesday 7:00 PM", "Veterans Day Ceremony — Nov 11, 10:00 AM"];
var cwOrgLeaders = [];   // array of strings
var cwOrgMission = "";   // set manually via admin
var routeMaps={
  en:{"Veteran":"veteran","Active Duty":"active_duty","Spouse / Family":"spouse","Surviving Spouse":"dic","Post-9/11":"era","Gulf War":"era","Vietnam Era":"era","Other Era":"era","Yes — rated":"disability","No — not yet":"file_claim","Was denied":"denied","Not sure":"file_claim","Disability Pay":"disability","GI Bill":"gi_bill","VA Home Loan":"home_loan","PACT Act":"pact_act","Healthcare":"healthcare","Voc Rehab":"voc_rehab","How do I file a claim?":"file_claim","What documents do I need?":"documents","Find a VSO counselor":"vso","See other benefits":"benefits_menu","See all benefits":"benefits_menu","All benefits":"benefits_menu","Do I qualify?":"pact_qualify","Am I eligible?":"home_loan_apply","How do I apply?":"gi_bill_apply","How do I enroll?":"healthcare_enroll","Can I transfer my GI Bill?":"gi_bill_transfer","Tell me about the BDD program":"bdd","Tell me about DIC":"dic","Tell me about CHAMPVA":"champva","How do I apply for DIC?":"dic_apply","Am I eligible for VA Healthcare?":"healthcare_eligibility","How do I enroll?":"healthcare_enroll","Start over":"welcome",
"What is a disability rating?":"rating_explained","How does rating work?":"rating_explained","Disability rating":"rating_explained",
"How do I increase my rating?":"rating_increase","Increase my rating":"rating_increase","Higher rating":"rating_increase",
"C&P exam":"cp_exam","What is a C&P exam?":"cp_exam","Comp and pen":"cp_exam","Compensation and pension exam":"cp_exam",
"What is TDIU?":"tdiu","TDIU":"tdiu","Total disability":"tdiu","Unemployability":"tdiu",
"What is a nexus letter?":"nexus","Nexus letter":"nexus","Buddy statement":"nexus",
"Mental health":"mental_health","PTSD":"mental_health","I need counseling":"mental_health","Depression":"mental_health","Anxiety":"mental_health","Vet Center":"mental_health","Veterans Crisis Line":"mental_health",
"What is VA Pension?":"pension","VA pension":"pension","Low income":"pension","Pension":"pension",
"What is Aid & Attendance?":"aid_attendance","Aid and Attendance":"aid_attendance","Aid & Attendance":"aid_attendance","In-home care":"aid_attendance",
"Housing help":"housing_help","I'm homeless":"housing_help","HUD-VASH":"housing_help","Emergency housing":"housing_help",
"Chapter 30 vs 33":"gi_bill_types","Montgomery GI Bill":"gi_bill_types","GI Bill types":"gi_bill_types","Yellow Ribbon":"gi_bill_types","BAH in school":"gi_bill_types","Housing allowance school":"gi_bill_types",
"Dental":"dental_vision","Vision":"dental_vision","Hearing aids":"dental_vision","VA dental":"dental_vision","VA vision":"dental_vision"
},
  es:{"Veterano":"veteran","Servicio Activo":"active_duty","Cónyuge / Familia":"spouse","Cónyuge Sobreviviente":"dic","Post-11 de Sep.":"era","Guerra del Golfo":"era","Era de Vietnam":"era","Otra Era":"era","Sí — calificado":"disability","No — todavía no":"file_claim","Fue denegado":"denied","No estoy seguro":"file_claim","Pago por Discapacidad":"disability","GI Bill":"gi_bill","Préstamo VA":"home_loan","Ley PACT":"pact_act","Atención Médica":"healthcare","Rehabilitación Voc.":"voc_rehab","¿Cómo presento un reclamo?":"file_claim","¿Qué documentos necesito?":"documents","Buscar consejero VSO":"vso","Ver otros beneficios":"benefits_menu","Ver todos los beneficios":"benefits_menu","¿Califico?":"pact_qualify","¿Soy elegible?":"home_loan_apply","¿Cómo solicito?":"gi_bill_apply","¿Cómo me inscribo?":"healthcare_enroll","¿Puedo transferir mi GI Bill?":"gi_bill_transfer","Cuéntame sobre el programa BDD":"bdd","Cuéntame sobre DIC":"dic","Cuéntame sobre CHAMPVA":"champva","¿Cómo solicito DIC?":"dic_apply","¿Soy elegible para atención médica VA?":"healthcare_eligibility","Empezar de nuevo":"welcome"},
  vi:{"Cựu chiến binh":"veteran","Tại ngũ":"active_duty","Vợ/Chồng & Gia đình":"spouse","Vợ/Chồng góa":"dic","Sau 11/9":"era","Chiến tranh Vùng Vịnh":"era","Thời kỳ Việt Nam":"era","Thời kỳ khác":"era","Có — đã xếp hạng":"disability","Chưa — chưa nộp":"file_claim","Bị từ chối":"denied","Không chắc":"file_claim","Trợ cấp khuyết tật":"disability","GI Bill":"gi_bill","Vay mua nhà VA":"home_loan","Đạo luật PACT":"pact_act","Chăm sóc sức khỏe":"healthcare","Phục hồi nghề nghiệp":"voc_rehab","Làm thế nào để nộp đơn?":"file_claim","Cần những giấy tờ gì?":"documents","Tìm tư vấn viên VSO":"vso","Xem các phúc lợi khác":"benefits_menu","Xem tất cả phúc lợi":"benefits_menu","Tôi có đủ điều kiện không?":"file_claim","Làm thế nào để đăng ký?":"gi_bill_apply","Tôi có thể chuyển GI Bill không?":"gi_bill_transfer","Cho tôi biết về chương trình BDD":"bdd","Cho tôi biết về DIC":"dic","Cho tôi biết về CHAMPVA":"champva","Làm thế nào để đăng ký DIC?":"dic_apply","Tôi có đủ điều kiện không?":"pact_qualify","Làm thế nào để đăng ký?":"healthcare_enroll","Bắt đầu lại":"welcome"},
  ko:{"참전용사":"veteran","현역":"active_duty","배우자/가족":"spouse","유족 배우자":"dic","9/11 이후":"era","걸프전":"era","베트남 시대":"era","기타 시대":"era","예 — 등급 있음":"disability","아니오 — 아직":"file_claim","거부됨":"denied","잘 모름":"file_claim","장애 급여":"disability","GI Bill":"gi_bill","VA 주택 대출":"home_loan","PACT법":"pact_act","의료 서비스":"healthcare","직업 재활":"voc_rehab","청구 방법은?":"file_claim","어떤 서류가 필요합니까?":"documents","VSO 상담사 찾기":"vso","다른 혜택 보기":"benefits_menu","모든 혜택 보기":"benefits_menu","자격이 되나요?":"pact_qualify","등록 방법은?":"healthcare_enroll","GI Bill을 이전할 수 있나요?":"gi_bill_transfer","BDD 프로그램에 대해 알려주세요":"bdd","DIC에 대해 알려주세요":"dic","CHAMPVA에 대해 알려주세요":"champva","DIC 신청 방법은?":"dic_apply","VA 의료 서비스 자격이 됩니까?":"healthcare_eligibility","등록 방법은?":"healthcare_enroll","처음으로":"welcome"},
  tl:{"Beterano":"veteran","Aktibong Serbisyo":"active_duty","Asawa / Pamilya":"spouse","Naiwang Asawa":"dic","Post-9/11":"era","Digmaang Gulpo":"era","Panahon ng Vietnam":"era","Ibang Panahon":"era","Oo — may rating":"disability","Hindi — hindi pa":"file_claim","Tinanggihan":"denied","Hindi sigurado":"file_claim","Bayad sa Kapansanan":"disability","GI Bill":"gi_bill","VA Home Loan":"home_loan","PACT Act":"pact_act","Pangangalagang Pangkalusugan":"healthcare","Voc Rehab":"voc_rehab","Paano mag-file ng claim?":"file_claim","Anong mga dokumento ang kailangan?":"documents","Humanap ng VSO counselor":"vso","Tingnan ang ibang benepisyo":"benefits_menu","Tingnan ang lahat ng benepisyo":"benefits_menu","Kwalipikado ba ako?":"pact_qualify","Paano mag-apply?":"file_claim","Paano mag-enroll?":"healthcare_enroll","Maaari ko bang ilipat ang aking GI Bill?":"gi_bill_transfer","Sabihin sa akin ang tungkol sa BDD program":"bdd","Sabihin sa akin ang tungkol sa DIC":"dic","Sabihin sa akin ang tungkol sa CHAMPVA":"champva","Paano mag-apply para sa DIC?":"dic_apply","Kwalipikado ba ako para sa VA Healthcare?":"healthcare_eligibility","Paano mag-enroll?":"healthcare_enroll","Magsimula muli":"welcome"}
};
;

var cwMsgs    = document.getElementById('cw-msgs');
var cwCards   = document.getElementById('cw-cards');
var cwChips   = document.getElementById('cw-chips');
var cwOptLabel= document.getElementById('cw-opt-label');
var cwProg    = document.getElementById('cw-prog');
var cwTxt     = document.getElementById('cw-txt');
var cwSend    = document.getElementById('cw-send');

function tStr(key) { return (translations[cwLang] && translations[cwLang][key]) || (translations.en[key]) || ''; }
function nodes() { return translations[cwLang] || translations.en; }

function cwToHTML(s) {
  return s.replace(/\n/g, '<br>')
          .replace(/<strong>(.*?)<\/strong>/g, '<strong style="color:#ffd700;font-weight:500">$1</strong>');
}
function cwAddBot(text) {
  var row = document.createElement('div'); row.className = 'cw-row';
  var av  = document.createElement('div'); av.className  = 'cw-av bot'; av.textContent = 'VN';
  var bub = document.createElement('div'); bub.className = 'cw-bub bot'; bub.innerHTML = cwToHTML(text);
  row.appendChild(av); row.appendChild(bub);
  cwMsgs.appendChild(row); cwMsgs.scrollTop = cwMsgs.scrollHeight;
}
function cwAddUser(text) {
  var row = document.createElement('div'); row.className = 'cw-row user';
  var av  = document.createElement('div'); av.className  = 'cw-av user'; av.textContent = 'You';
  var bub = document.createElement('div'); bub.className = 'cw-bub user'; bub.textContent = text;
  row.appendChild(av); row.appendChild(bub);
  cwMsgs.appendChild(row); cwMsgs.scrollTop = cwMsgs.scrollHeight;
}
function cwTyping() {
  var row = document.createElement('div'); row.className = 'cw-row'; row.id = 'cwtyp';
  var av  = document.createElement('div'); av.className  = 'cw-av bot'; av.textContent = 'VN';
  var bub = document.createElement('div'); bub.className = 'cw-typ';
  bub.innerHTML = '<span></span><span></span><span></span>';
  row.appendChild(av); row.appendChild(bub);
  cwMsgs.appendChild(row); cwMsgs.scrollTop = cwMsgs.scrollHeight;
}
function cwRemoveTyping() { var el = document.getElementById('cwtyp'); if (el) el.remove(); }

// ── ORG INFO & EVENTS NODES ───────────────────────────────────────────────────
function cwBuildOrgNodes() {
  var org  = cwOrgName || 'your VSO';
  var hasEvents = cwOrgEvents && cwOrgEvents.length > 0;
  var nextEvent = hasEvents ? cwOrgEvents[0] : null;

  // ── org_info node ──────────────────────────────────────────────────────────
  var infoLines = [];
  if (cwOrgMission) infoLines.push(cwOrgMission + '\n');
  if (cwOrgAddr)    infoLines.push('\uD83D\uDCCD ' + cwOrgAddr + (cwOrgCity ? ', ' + cwOrgCity : ''));
  if (cwOrgHours)   infoLines.push('\uD83D\uDD50 ' + cwOrgHours);
  if (cwOrgPhone)   infoLines.push('\uD83D\uDCDE ' + cwOrgPhone);
  if (cwOrgEmail)   infoLines.push('\u2709\uFE0F ' + cwOrgEmail);
  if (cwOrgWeb)     infoLines.push('\uD83C\uDF10 ' + cwOrgWeb);
  if (cwOrgLeaders && cwOrgLeaders.length) {
    infoLines.push('\n<strong>Leadership:</strong>\n' + cwOrgLeaders.map(function(l){ return '\u2022 ' + l; }).join('\n'));
  }

  var infoBot = '<strong>' + org + '</strong>\n\n' +
    (infoLines.length ? infoLines.join('\n') : 'Contact a counselor for more information about this organization.') +
    (nextEvent ? '\n\n\uD83D\uDCC5 <strong>Next event:</strong> ' + nextEvent : '');

  if (translations.en)  translations.en.org_info  = { pct:10, bot: infoBot, chips: hasEvents ? ['Upcoming events','Find a VSO counselor','See all benefits'] : ['Find a VSO counselor','See all benefits','Start over'] };
  if (translations.es)  translations.es.org_info  = { pct:10, bot: infoBot, chips: hasEvents ? ['Pr\u00f3ximos eventos','Buscar consejero VSO','Ver otros beneficios'] : ['Buscar consejero VSO','Ver otros beneficios','Empezar de nuevo'] };
  if (translations.vi)  translations.vi.org_info  = { pct:10, bot: infoBot, chips: hasEvents ? ['S\u1ef1 ki\u1ec7n s\u1eafp t\u1edbi','T\u00ecm t\u01b0 v\u1ea5n vi\u00ean VSO','Xem c\u00e1c ph\u00fac l\u1ee3i kh\u00e1c'] : ['T\u00ecm t\u01b0 v\u1ea5n vi\u00ean VSO','Xem c\u00e1c ph\u00fac l\u1ee3i kh\u00e1c','B\u1eaft \u0111\u1ea7u l\u1ea1i'] };
  if (translations.ko)  translations.ko.org_info  = { pct:10, bot: infoBot, chips: hasEvents ? ['\uc608\uc815\ub41c \ud589\uc0ac','VSO \uc0c1\ub2f4\uc0ac \ucc3e\uae30','\ub2e4\ub978 \ud61c\ud0dd \ubcf4\uae30'] : ['VSO \uc0c1\ub2f4\uc0ac \ucc3e\uae30','\ubaa8\ub4e0 \ud61c\ud0dd \ubcf4\uae30','\ucc98\uc74c\uc73c\ub85c'] };
  if (translations.tl)  translations.tl.org_info  = { pct:10, bot: infoBot, chips: hasEvents ? ['Mga paparating na kaganapan','Humanap ng VSO counselor','Tingnan ang ibang benepisyo'] : ['Humanap ng VSO counselor','Tingnan ang lahat ng benepisyo','Magsimula muli'] };

  // ── org_events node ────────────────────────────────────────────────────────
  var evtBot;
  if (hasEvents) {
    evtBot = '\uD83D\uDCC5 <strong>Upcoming events at ' + org + ':</strong>\n\n' +
      cwOrgEvents.map(function(e, i){ return (i===0 ? '\u2B50 ' : '\u2022 ') + e; }).join('\n') +
      '\n\n<strong>All events are open to veterans, family members, and the community.</strong>\n\nStop by — no appointment needed. Our counselors are here to help.';
  } else {
    evtBot = 'We\u2019re updating our events calendar. Contact ' + org + ' directly for upcoming events:\n\n' +
      (cwOrgPhone ? '\uD83D\uDCDE ' + cwOrgPhone + '\n' : '') +
      (cwOrgEmail ? '\u2709\uFE0F ' + cwOrgEmail + '\n' : '') +
      (cwOrgHours ? '\uD83D\uDD50 ' + cwOrgHours : '');
  }

  if (translations.en)  translations.en.org_events = { pct:10, bot: evtBot, chips: ['Find a VSO counselor','See all benefits','Start over'] };
  if (translations.es)  translations.es.org_events = { pct:10, bot: evtBot, chips: ['Buscar consejero VSO','Ver otros beneficios','Empezar de nuevo'] };
  if (translations.vi)  translations.vi.org_events = { pct:10, bot: evtBot, chips: ['T\u00ecm t\u01b0 v\u1ea5n vi\u00ean VSO','Xem c\u00e1c ph\u00fac l\u1ee3i kh\u00e1c','B\u1eaft \u0111\u1ea7u l\u1ea1i'] };
  if (translations.ko)  translations.ko.org_events = { pct:10, bot: evtBot, chips: ['VSO \uc0c1\ub2f4\uc0ac \ucc3e\uae30','\ubaa8\ub4e0 \ud61c\ud0dd \ubcf4\uae30','\ucc98\uc74c\uc73c\ub85c'] };
  if (translations.tl)  translations.tl.org_events = { pct:10, bot: evtBot, chips: ['Humanap ng VSO counselor','Tingnan ang lahat ng benepisyo','Magsimula muli'] };

  // ── Route new chips ────────────────────────────────────────────────────────
  ['en','es','vi','ko','tl'].forEach(function(lang) {
    var rm = routeMaps[lang];
    if (!rm) return;
    rm['About this organization']   = 'org_info';
    rm['About ' + org]              = 'org_info';
    rm['Upcoming events']           = 'org_events';
    rm['Pr\u00f3ximos eventos']     = 'org_events';
    rm['S\u1ef1 ki\u1ec7n s\u1eafp t\u1edbi'] = 'org_events';
    rm['\uc608\uc815\ub41c \ud589\uc0ac']      = 'org_events';
    rm['Mga paparating na kaganapan'] = 'org_events';
  });
}

// ── NEXT EVENT INVITE — appended to every VSO node ───────────────────────────
function cwNextEventInvite() {
  if (!cwOrgEvents || !cwOrgEvents.length) return '';
  var next = cwOrgEvents[0];
  return '\n\n\u2014\n\uD83D\uDCC5 <strong>Join us:</strong> ' + next + '\nAll veterans and families welcome.';
}

function cwBuildWelcome() {
  var org = cwOrgName || 'VFW Post 1234';
  var loc = cwOrgCity ? ' in ' + cwOrgCity : '';
  var welcomeText = {
    en: org + ' welcomes you.' + loc + '\n\nWe\'re here to help you find and claim every benefit you\'ve earned. This assistant is provided by your VSO — available 24/7 and speaks your language.\n\nLet\'s get started. Which best describes you?',
    es: org + ' le da la bienvenida.' + (cwOrgCity ? ' en ' + cwOrgCity : '') + '\n\nEstamos aquí para ayudarle a encontrar y reclamar cada beneficio que se ha ganado. Este asistente es gratuito, disponible 24/7 y habla su idioma.\n\n¿Cuál le describe mejor?',
    vi: org + ' chào đón bạn.' + (cwOrgCity ? ' tại ' + cwOrgCity : '') + '\n\nChúng tôi ở đây để giúp bạn tìm và nhận mọi quyền lợi bạn đã xứng đáng. Trợ lý này miễn phí, hoạt động 24/7 và nói ngôn ngữ của bạn.\n\nĐiều nào mô tả đúng nhất về bạn?',
    ko: org + '에 오신 것을 환영합니다.' + (cwOrgCity ? ' (' + cwOrgCity + ')' : '') + '\n\n저희는 귀하가 받을 자격이 있는 모든 혜택을 찾고 신청하는 데 도움을 드리기 위해 여기 있습니다. 이 안내자는 무료이며 24/7 이용 가능합니다.\n\n귀하에게 가장 잘 맞는 것은 무엇입니까?',
    tl: 'Maligayang pagdating sa ' + org + '.' + (cwOrgCity ? ' sa ' + cwOrgCity : '') + '\n\nNandito kami para tulungan kang mahanap at makuha ang bawat benepisyong iyong nakamit. Ang assistant na ito ay libre, available 24/7, at nagsasalita ng iyong wika.\n\nAlin ang pinaka-angkop sa iyo?'
  };
  var veteranText = {
    en: 'Thank you for your service. 🇺🇸\n\n' + org + ' is proud to support you. When did you serve?',
    es: 'Gracias por su servicio. 🇺🇸\n\n' + org + ' se enorgullece de apoyarle. ¿Cuándo sirvió?',
    vi: 'Cảm ơn bạn đã phục vụ đất nước. 🇺🇸\n\n' + org + ' tự hào được hỗ trợ bạn. Bạn phục vụ khi nào?',
    ko: '귀하의 봉사에 감사드립니다. 🇺🇸\n\n' + org + '은 귀하를 지원하게 되어 자랑스럽습니다. 언제 복무하셨습니까?',
    tl: 'Salamat sa iyong serbisyo. 🇺🇸\n\n' + org + ' ay ipinagmamalaki na suportahan kayo. Kailan kayo naglingkod?'
  };
  Object.keys(translations).forEach(function(lang) {
    if (translations[lang].welcome) {
      translations[lang].welcome.bot = welcomeText[lang] || welcomeText.en;
    }
    if (translations[lang].veteran) {
      translations[lang].veteran.bot = veteranText[lang] || veteranText.en;
    }
  });
}

function cwRender(key) {
  if (key === 'welcome') cwBuildWelcome();
  var n = nodes()[key]; if (!n) return;
  // Deep-copy so we never mutate the translations object
  n = { pct: n.pct, bot: n.bot || '', cards: n.cards, chips: (n.chips || []).slice() };
  // Append next-event invite to benefit endpoint nodes
  var endNodes = ['vso','file_claim','denied','gi_bill_apply','home_loan_apply',
    'healthcare_enroll','voc_rehab_apply','dic_apply','mental_health','pension',
    'aid_attendance','housing_help','dental_vision','tdiu','cp_exam','rating_increase'];
  if (endNodes.indexOf(key) !== -1 && cwOrgEvents && cwOrgEvents.length) {
    n.bot += '\n\n\u2014\n\uD83D\uDCC5 <strong>Join us at our next event:</strong> ' + cwOrgEvents[0] + '\nAll veterans and families are welcome.';
    if (n.chips.indexOf('Upcoming events') === -1) n.chips.push('Upcoming events');
  }
  cwProg.style.width = n.pct + '%';
  if (n.bot) cwAddBot(n.bot);
  cwCards.innerHTML = ''; cwChips.innerHTML = '';
  if (n.cards && n.cards.length) {
    cwOptLabel.style.display = 'block';
    n.cards.forEach(function(c) {
      var el = document.createElement('div'); el.className = 'cw-card';
      el.innerHTML = '<div class="cc-icon">' + c.icon + '</div><div class="cc-title">' + c.title + '</div><div class="cc-desc">' + c.desc + '</div>';
      el.addEventListener('click', function() { cwHandle(c.title); });
      cwCards.appendChild(el);
    });
  } else { cwOptLabel.style.display = 'none'; }
  if (n.chips && n.chips.length) {
    n.chips.forEach(function(ch) {
      var el = document.createElement('button'); el.className = 'cw-chip'; el.textContent = ch;
      el.addEventListener('click', function() { cwHandle(ch); });
      cwChips.appendChild(el);
    });
  }
}

// ── KEYWORD MATCHER ───────────────────────────────────────────────────────────
var kwMap = [
  // Disability & rating
  [/\b(rating|rated|disability rating|how.*rating|rating.*work|percent|percentage)\b/i, 'rating_explained'],
  [/\b(increase.*rating|higher rating|raise.*rating|rating.*increase|re-?rate|rerate)\b/i, 'rating_increase'],
  [/\b(c&?p exam|comp.*pen|compensation.*pension|c and p|dbq)\b/i, 'cp_exam'],
  [/\b(tdiu|total disab|unemployab|can't work|cannot work|unable.*work)\b/i, 'tdiu'],
  [/\b(nexus|buddy statement|lay statement|personal statement|doctor.*letter)\b/i, 'nexus'],
  [/\b(appeal|appealing|board of appeals|bva|cavc|higher.?level review|supplemental claim|new evidence)\b/i, 'denied'],
  [/\b(back pay|retro|retroactive|effective date|past.*benefits)\b/i, 'rating_increase'],
  [/\b(file.*claim|submit.*claim|start.*claim|how.*claim|apply.*disab|526)\b/i, 'file_claim'],
  [/\b(denied|rejection|rejected|claim.*denied|turned down)\b/i, 'denied'],
  // Mental health
  [/\b(ptsd|mental health|counseling|therapy|depression|anxiety|mst|suicide|crisis|vet center|community care|psych)\b/i, 'mental_health'],
  // Healthcare
  [/\b(healthcare|health care|medical|doctor|hospital|enroll.*health|health.*enroll)\b/i, 'healthcare'],
  [/\b(dental|teeth|vision|eyes|glasses|hearing|hearing aid|audiolog)\b/i, 'dental_vision'],
  [/\b(eligible.*health|qualify.*health|health.*eligib|priority group)\b/i, 'healthcare_eligibility'],
  [/\b(copay|co.?pay|how much.*health|cost.*health|health.*cost)\b/i, 'healthcare_eligibility'],
  [/\b(caregiver|care.*giver|program.*comprehensive|pcafc)\b/i, 'mental_health'],
  // Education
  [/\b(gi bill|gibill|chapter 33|post.?9.?11|education benefit|tuition|school)\b/i, 'gi_bill'],
  [/\b(chapter 30|montgomery|mgib|chapter 31|voc.?rehab|vocational)\b/i, 'gi_bill_types'],
  [/\b(bah|housing allowance|yellow ribbon|private school|transfer.*gi|gi.*transfer)\b/i, 'gi_bill_types'],
  [/\b(apply.*gi|gi.*apply|how.*gi bill|education.*apply)\b/i, 'gi_bill_apply'],
  // Home loan
  [/\b(home loan|va loan|house|mortgage|buy.*home|refinanc|irrrl|coe|certificate.*eligib)\b/i, 'home_loan'],
  [/\b(homeless|housing help|hud.?vash|transitional housing|evict|shelter)\b/i, 'housing_help'],
  // Pension & financial
  [/\b(pension|low income|wartime|aid.*attend|aid and attend|in.?home care|assisted living|nursing home)\b/i, 'pension'],
  [/\b(aid.*attend|attend.*aid|a&a|daily.*activ|help.*bathing|help.*dressing)\b/i, 'aid_attendance'],
  // PACT Act
  [/\b(pact act|burn pit|agent orange|radiation|toxic|gulf war|airborne hazard)\b/i, 'pact_act'],
  // Voc rehab
  [/\b(voc rehab|vocational rehab|chapter 31|career|employment.*disab|job.*disab)\b/i, 'voc_rehab'],
  // Survivors
  [/\b(dic|dependency indemnity|surviving spouse|widow|widower|spouse.*died|veteran.*died|death.*benefit)\b/i, 'dic'],
  [/\b(champva|dependent.*health|family.*health|spouse.*insurance)\b/i, 'champva'],
  [/\b(dea|survivors.*edu|dependent.*edu|education.*survivor|fry scholarship)\b/i, 'gi_bill_types'],
  // Documents
  [/\b(dd.?214|discharge papers|service record|military record|document)\b/i, 'documents'],
  // Org info & events
  [/\b(about.*org|who are you|history|founded|established|mission|community|what is this|about this|about you)\b/i, 'org_info'],
  [/\b(event|meeting|gathering|ceremony|fundrais|schedule|calendar|next.*event|when.*meet|when.*open|social)\b/i, 'org_events'],
  [/\b(location|address|where are you|directions|how to get|find you|visit|come in|walk.?in)\b/i, 'org_info'],
  [/\b(hours|open|close|when.*open|office hours|available)\b/i, 'org_info'],
  // VSO
  [/\b(counselor|vso|help|speak.*someone|talk.*someone|contact|office)\b/i, 'vso'],
  // General navigation
  [/\b(benefits|what.*benefit|all benefit|other benefit|list.*benefit)\b/i, 'benefits_menu'],
];

function kwMatch(val) {
  var v = val.toLowerCase();
  for (var i = 0; i < kwMap.length; i++) {
    if (kwMap[i][0].test(v)) return kwMap[i][1];
  }
  return null;
}

// ── AI FALLBACK WITH DAILY CAP ────────────────────────────────────────────────
var AI_DAILY_CAP = 20;   // max AI calls per day across all users on this demo
var AI_STORAGE_KEY = 'vn_ai_usage';

function getAiUsage() {
  try {
    var raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return { date: '', count: 0 };
    return JSON.parse(raw);
  } catch(e) { return { date: '', count: 0 }; }
}

function incAiUsage() {
  var today = new Date().toISOString().slice(0, 10);
  var usage = getAiUsage();
  if (usage.date !== today) usage = { date: today, count: 0 };
  usage.count++;
  try { localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(usage)); } catch(e) {}
  return usage.count;
}

function aiCapReached() {
  var today = new Date().toISOString().slice(0, 10);
  var usage = getAiUsage();
  return usage.date === today && usage.count >= AI_DAILY_CAP;
}

function cwAiFallback(userMsg) {
  // If cap reached, use static fallback
  if (aiCapReached()) {
    cwTyping();
    setTimeout(function() {
      cwRemoveTyping();
      cwAddBot(tStr('fallback'));
      var fchips = tStr('fallbackChips');
      if (Array.isArray(fchips)) fchips.forEach(function(ch) {
        var el = document.createElement('button'); el.className = 'cw-chip'; el.textContent = ch;
        el.addEventListener('click', function() { cwHandle(ch); });
        cwChips.appendChild(el);
      });
    }, 800);
    return;
  }

  // Increment counter and call AI
  incAiUsage();
  cwTyping();

  var systemPrompt = "You are a VA benefits assistant for a veteran service organization. Answer briefly (3-5 sentences max). Focus only on VA benefits, veteran services, and related topics. If the question is off-topic, say you can only help with VA benefits. End every response with one short follow-up suggestion the veteran can tap. Format: answer, then on a new line starting with 'Suggested next:' followed by the suggestion.";

  fetch(VN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    cwRemoveTyping();
    var text = ((data.content || [])[0] || {}).text || tStr('fallback');
    // Parse out suggested next
    var parts = text.split(/Suggested next:/i);
    var answer = parts[0].trim();
    var suggestion = parts[1] ? parts[1].trim() : null;
    cwAddBot(answer);
    // Add fallback chips + AI suggestion chip
    var chips = ['Find a VSO counselor', 'See all benefits', 'Start over'];
    if (suggestion) chips.unshift(suggestion.replace(/^["']|["']$/g,''));
    chips.forEach(function(ch) {
      var el = document.createElement('button'); el.className = 'cw-chip'; el.textContent = ch;
      el.addEventListener('click', function() { cwHandle(ch); });
      cwChips.appendChild(el);
    });
  })
  .catch(function() {
    cwRemoveTyping();
    cwAddBot(tStr('fallback'));
    var fchips = tStr('fallbackChips');
    if (Array.isArray(fchips)) fchips.forEach(function(ch) {
      var el = document.createElement('button'); el.className = 'cw-chip'; el.textContent = ch;
      el.addEventListener('click', function() { cwHandle(ch); });
      cwChips.appendChild(el);
    });
  });
}

function cwHandle(val) {
  if (!cwUnlocked) return;
  cwMsgCount++;
  updateMsgCounter();
  if (cwMsgCount > SESSION_LIMIT) { showSessionWall(); return; }
  cwAddUser(val); cwCards.innerHTML = ''; cwChips.innerHTML = '';
  cwOptLabel.style.display = 'none'; cwTxt.value = '';
  var rm  = routeMaps[cwLang] || routeMaps.en;
  var key = rm[val];
  if (!key) {
    key = kwMatch(val);
  }
  if (!key) {
    cwAiFallback(val);
    return;
  }
  cwTyping();
  setTimeout(function() { cwRemoveTyping(); cwRender(key); }, 700 + Math.random() * 300);
}

// Language buttons
document.querySelectorAll('.cw-lang-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.cw-lang-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    cwLang = btn.getAttribute('data-lang');
    cwMsgs.innerHTML = ''; cwCards.innerHTML = ''; cwChips.innerHTML = '';
    cwProg.style.width = '0%';
    var micPlaceholders = { en:'Type or speak your question...', es:'Escriba o hable su pregunta...', vi:'Nhập hoặc nói câu hỏi của bạn...', ko:'질문을 입력하거나 말씀해 주세요...', tl:'I-type o sabihin ang iyong tanong...' };
    document.getElementById('cw-txt').placeholder = micPlaceholders[cwLang] || 'Type or speak your question...';
    if (recognition) recognition.lang = langCodeMap[cwLang] || 'en-US';
    setTimeout(function() { cwRender('welcome'); }, 200);
  });
});

// Send

// ── SPEECH TO TEXT ────────────────────────────────────────────────────────────
var cwMic = document.getElementById('cw-mic');
var langCodeMap = { en: 'en-US', es: 'es-US', vi: 'vi-VN', ko: 'ko-KR', tl: 'fil-PH' };
var recognition = null;
var isListening = false;

if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = function() {
    isListening = true;
    cwMic.classList.add('listening');
    cwTxt.placeholder = 'Listening...';
  };
  recognition.onresult = function(e) {
    var transcript = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    cwTxt.value = transcript;
    // If final result, auto-send
    if (e.results[e.results.length - 1].isFinal) {
      setTimeout(function() {
        var v = cwTxt.value.trim();
        if (v) cwHandle(v);
      }, 400);
    }
  };
  recognition.onerror = function(e) {
    isListening = false;
    cwMic.classList.remove('listening');
    var placeholders = { en:'Type or speak your question...', es:'Escriba o hable su pregunta...', vi:'Nhập hoặc nói câu hỏi của bạn...', ko:'질문을 입력하거나 말씀해 주세요...', tl:'I-type o sabihin ang iyong tanong...' };
    cwTxt.placeholder = placeholders[cwLang] || placeholders.en;
    if (e.error !== 'no-speech') {
      cwTxt.placeholder = 'Mic error — try typing instead';
    }
  };
  recognition.onend = function() {
    isListening = false;
    cwMic.classList.remove('listening');
    var placeholders = { en:'Type or speak your question...', es:'Escriba o hable su pregunta...', vi:'Nhập hoặc nói câu hỏi của bạn...', ko:'질문을 입력하거나 말씀해 주세요...', tl:'I-type o sabihin ang iyong tanong...' };
    cwTxt.placeholder = placeholders[cwLang] || placeholders.en;
  };

  cwMic.addEventListener('click', function() {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.lang = langCodeMap[cwLang] || 'en-US';
      cwTxt.value = '';
      try { recognition.start(); } catch(e) {}
    }
  });

} else {
  // Browser doesn't support speech recognition
  cwMic.classList.add('unsupported');
  cwMic.title = 'Speech not supported in this browser — use Chrome for voice input';
}

cwSend.addEventListener('click', function() {
  if (!cwUnlocked) return; var v = cwTxt.value.trim(); if (v) cwHandle(v); });
cwTxt.addEventListener('keypress', function(e) { if (e.key === 'Enter') { var v = cwTxt.value.trim(); if (v) cwHandle(v); } });

// Init chat
// welcome rendered after gate unlock — see gateSubmit()

// ── TABS ─────────────────────────────────────────────────────────────────────
document.getElementById('tab-chat').addEventListener('click', function() {
  this.classList.add('active');
  document.getElementById('tab-admin').classList.remove('active');
  document.getElementById('cw-chat-panel').style.display = '';
  document.getElementById('cw-admin-panel').style.display = 'none';
});
document.getElementById('tab-admin').addEventListener('click', function() {
  this.classList.add('active');
  document.getElementById('tab-chat').classList.remove('active');
  document.getElementById('cw-admin-panel').style.display = '';
  document.getElementById('cw-chat-panel').style.display = 'none';
});

// ── ADMIN ────────────────────────────────────────────────────────────────────
function addRepeaterRow(listId, placeholder, val) {
  var list = document.getElementById(listId);
  var row  = document.createElement('div'); row.className = 'admin-repeater-row';
  var inp  = document.createElement('input'); inp.type = 'text'; inp.placeholder = placeholder; inp.value = val || '';
  var btn  = document.createElement('button'); btn.className = 'admin-remove-btn'; btn.textContent = '×';
  btn.addEventListener('click', function() { row.remove(); });
  row.appendChild(inp); row.appendChild(btn); list.appendChild(row);
}

document.getElementById('btn-add-event').addEventListener('click', function() {
  addRepeaterRow('adm-events-list', 'e.g. Monthly Meeting – 1st Tuesday 7pm', '');
});
document.getElementById('btn-add-leader').addEventListener('click', function() {
  addRepeaterRow('adm-leaders-list', 'e.g. Commander – John Smith', '');
});

// Scan website



// ── FLOATING WIDGET ───────────────────────────────────────────────────────────
var floatOpen       = false;
var floatStarted    = false;
var floatMsgCount   = 0;
var floatNotifTimer = null;
var floatScrollTimer= null;
var userScrolled    = false;
var inDemoSection   = false;

// Show notif bubble after 4s on page load — hide when near demo section
floatNotifTimer = setTimeout(function() {
  if (!floatOpen && !userScrolled && !inDemoSection) showNotif();
}, 4000);

// Track scroll — hide panel when user scrolls away (unless chatting), hide notif when near demo
window.addEventListener('scroll', function() {
  userScrolled = true;

  // Detect if user is in the demo section — suppress float there
  var demoEl = document.getElementById('demo');
  if (demoEl) {
    var rect = demoEl.getBoundingClientRect();
    inDemoSection = rect.top < window.innerHeight && rect.bottom > 0;
    if (inDemoSection) {
      hideNotif();
      // Collapse float panel if open and not mid-conversation
      if (floatOpen && floatMsgCount === 0) collapseFloat();
    } else {
      // Re-show notif bubble if they scroll away and haven't engaged yet
      if (!floatOpen && floatMsgCount === 0 && !document.getElementById('float-notif').dataset.dismissed) {
        clearTimeout(floatScrollTimer);
        floatScrollTimer = setTimeout(showNotif, 1500);
      }
    }
  }

  // Auto-collapse panel if scrolling fast and no conversation started
  if (floatOpen && floatMsgCount === 0) {
    clearTimeout(floatScrollTimer);
    floatScrollTimer = setTimeout(collapseFloat, 2000);
  }
}, { passive: true });

function showNotif() {
  var n = document.getElementById('float-notif');
  if (n.dataset.dismissed) return;
  n.style.display = 'flex';
  n.classList.remove('hide');
}

function hideNotif() {
  var n = document.getElementById('float-notif');
  if (n.style.display === 'none') return;
  n.classList.add('hide');
  setTimeout(function() { n.style.display = 'none'; }, 250);
}

function dismissNotif(e) {
  if (e) e.stopPropagation();
  var n = document.getElementById('float-notif');
  n.dataset.dismissed = '1';
  hideNotif();
}

// Clicking the notif bubble opens the panel
document.getElementById('float-notif').addEventListener('click', function(e) {
  if (e.target.id === 'float-notif-close') return;
  dismissNotif();
  openFloat();
});

function toggleFloat() {
  if (floatOpen) collapseFloat(); else openFloat();
}

function openFloat() {
  floatOpen = true;
  document.getElementById('float-btn').classList.add('open');
  document.getElementById('float-panel').classList.add('open');
  hideNotif();
  if (!floatStarted) {
    floatStarted = true;
    setTimeout(fcwInit, 180);
  }
}

function collapseFloat() {
  floatOpen = false;
  document.getElementById('float-btn').classList.remove('open');
  document.getElementById('float-panel').classList.remove('open');
}

// ── FLOAT CHAT ENGINE ─────────────────────────────────────────────────────────
function fcwInit() {
  // Sync org name from main widget
  document.getElementById('fcw-org-name').textContent =
    (cwOrgName || 'VetNavigator') + ' — Benefits Assistant';
  fcwRender('welcome');
}

function fcwAddBot(html) {
  var msgs = document.getElementById('fcw-msgs');
  var row  = document.createElement('div'); row.className = 'fcw-row';
  var av   = document.createElement('div'); av.className  = 'fcw-av bot'; av.textContent = '🎖';
  var bub  = document.createElement('div'); bub.className = 'fcw-bub bot'; bub.innerHTML  = html.replace(/\n/g,'<br>');
  row.appendChild(av); row.appendChild(bub);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function fcwAddUser(text) {
  var msgs = document.getElementById('fcw-msgs');
  var row  = document.createElement('div'); row.className = 'fcw-row'; row.style.justifyContent = 'flex-end';
  var bub  = document.createElement('div'); bub.className = 'fcw-bub usr'; bub.textContent = text;
  row.appendChild(bub);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function fcwTyping() {
  var msgs = document.getElementById('fcw-msgs');
  var row  = document.createElement('div'); row.className = 'fcw-row'; row.id = 'fcw-typing-row';
  var av   = document.createElement('div'); av.className  = 'fcw-av bot'; av.textContent = '🎖';
  var bub  = document.createElement('div'); bub.className = 'fcw-bub bot fcw-typing';
  bub.innerHTML = '<span></span><span></span><span></span>';
  row.appendChild(av); row.appendChild(bub);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

function fcwRemoveTyping() {
  var t = document.getElementById('fcw-typing-row');
  if (t) t.remove();
}

function fcwRender(key) {
  // Use same translations + routeMaps as main chatbot
  var node = (translations[cwLang] || translations.en)[key];
  if (!node) return;

  // Deep-copy + inject event invite for endpoint nodes
  node = { pct: node.pct, bot: node.bot || '', cards: node.cards, chips: (node.chips || []).slice() };
  var endNodes = ['vso','file_claim','denied','gi_bill_apply','home_loan_apply',
    'healthcare_enroll','voc_rehab_apply','dic_apply','mental_health','pension',
    'aid_attendance','housing_help','dental_vision','tdiu','cp_exam','rating_increase'];
  if (endNodes.indexOf(key) !== -1 && cwOrgEvents && cwOrgEvents.length) {
    node.bot += '\n\n—\n\uD83D\uDCC5 <strong>Join us:</strong> ' + cwOrgEvents[0] + '\nAll veterans and families welcome.';
    if (node.chips.indexOf('Upcoming events') === -1) node.chips.push('Upcoming events');
  }

  document.getElementById('fcw-prog').style.width = node.pct + '%';
  if (node.bot) fcwAddBot(node.bot);

  var cards   = document.getElementById('fcw-cards');
  var chips   = document.getElementById('fcw-chips');
  var optLbl  = document.getElementById('fcw-opt-label');
  cards.innerHTML = ''; chips.innerHTML = '';

  if (node.cards && node.cards.length) {
    optLbl.style.display = 'block';
    node.cards.forEach(function(c) {
      var el = document.createElement('div'); el.className = 'fcw-card';
      el.innerHTML = '<div class="fcc-icon">' + c.icon + '</div><div class="fcc-title">' + c.title + '</div><div class="fcc-desc">' + c.desc + '</div>';
      el.addEventListener('click', function() { fcwHandle(c.title); });
      cards.appendChild(el);
    });
  } else {
    optLbl.style.display = 'none';
  }

  if (node.chips && node.chips.length) {
    node.chips.forEach(function(ch) {
      var el = document.createElement('button'); el.className = 'fcw-chip'; el.textContent = ch;
      el.addEventListener('click', function() { fcwHandle(ch); });
      chips.appendChild(el);
    });
  }

  if (key === 'welcome') {
    document.getElementById('fcw-prog').style.width = '0%';
  }
}

function fcwHandle(val) {
  floatMsgCount++;
  fcwAddUser(val);
  document.getElementById('fcw-cards').innerHTML = '';
  document.getElementById('fcw-chips').innerHTML = '';
  document.getElementById('fcw-opt-label').style.display = 'none';

  // Reuse same routing: routeMaps → kwMatch → aiFallback
  var rm  = routeMaps[cwLang] || routeMaps.en;
  var key = rm[val] || kwMatch(val);

  fcwTyping();
  if (key) {
    setTimeout(function() { fcwRemoveTyping(); fcwRender(key); }, 700 + Math.random() * 300);
  } else {
    // AI fallback — reuse same function, just redirect output to float panel
    setTimeout(function() {
      fcwRemoveTyping();
      // Simple static fallback for float (AI fallback tied to main widget)
      fcwAddBot(tStr('fallback'));
      var fchips = tStr('fallbackChips');
      if (Array.isArray(fchips)) fchips.forEach(function(ch) {
        var el = document.createElement('button'); el.className = 'fcw-chip'; el.textContent = ch;
        el.addEventListener('click', function() { fcwHandle(ch); });
        document.getElementById('fcw-chips').appendChild(el);
      });
    }, 900);
  }
}

function fcwSend() {
  var txt = document.getElementById('fcw-txt');
  var val = txt.value.trim();
  if (!val) return;
  txt.value = '';
  fcwHandle(val);
}

document.getElementById('fcw-txt').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') fcwSend();
});

// Keep float panel org name in sync when admin saves
var origAdminSave = typeof adminSaveHandler === 'function' ? adminSaveHandler : null;
document.addEventListener('vn-admin-saved', function() {
  document.getElementById('fcw-org-name').textContent =
    (cwOrgName || 'VetNavigator') + ' — Benefits Assistant';
});


  var toggle = document.getElementById('billing-toggle');
  var isMonthly = toggle.classList.contains('monthly');
  toggle.classList.toggle('monthly', !isMonthly);
  var showAnn = isMonthly;
  document.querySelectorAll('.ann-val').forEach(function(el) {
    el.style.display = showAnn ? '' : 'none';
  });
  document.querySelectorAll('.mo-val').forEach(function(el) {
    el.style.display = showAnn ? 'none' : '';
  });
  document.getElementById('lbl-annual').classList.toggle('active', showAnn);
  document.getElementById('lbl-monthly').classList.toggle('active', !showAnn);
}
// ── CHECKOUT URLS — paste your GHL/Stripe links here ─────────────────────────
// To activate: replace each placeholder with your real GHL order form or Stripe checkout URL
var CHECKOUT_URLS = {
  basic:    'https://YOUR-GHL-CHECKOUT-LINK/basic',    // ← paste Basic plan URL
  starter:  'https://YOUR-GHL-CHECKOUT-LINK/starter',  // ← paste Starter plan URL
  standard: 'https://YOUR-GHL-CHECKOUT-LINK/standard', // ← paste Standard plan URL
  premium:  'https://YOUR-GHL-CHECKOUT-LINK/premium'   // ← paste Premium plan URL
};

var PLAN_DATA = {
  basic: {
    name: 'Basic Plan',
    annualPrice: '$1,490/yr',
    monthlyPrice: '$149/mo',
    features: [
      'All VA benefit categories covered',
      '5-language chatbot (EN, ES, VI, KO, TL)',
      'Branded to your org — name, hours, events',
      'VSO counselor handoff',
      'Mobile-friendly website embed',
      'Setup & onboarding included'
    ],
    note: 'Best for small rural posts and chapters. Your chatbot will be live within 2 weeks — no tech skills needed.'
  },
  starter: {
    name: 'Starter Plan',
    annualPrice: '$2,490/yr',
    monthlyPrice: '$249/mo',
    features: [
      'Everything in Basic',
      'Facebook page scanner — auto-imports org info',
      'Website auto-import tool',
      'Admin panel for your team',
      'Up to 500 veteran conversations/mo',
      'Email support (48-hr response)'
    ],
    note: 'Great for active local chapters managing their own content. Includes admin panel so your team stays in control.'
  },
  standard: {
    name: 'Standard Plan',
    annualPrice: '$4,150/yr',
    monthlyPrice: '$415/mo',
    features: [
      'Everything in Starter',
      'Unlimited veteran conversations',
      'Speech-to-text voice input',
      'VA office locator built in',
      'Dedicated onboarding call',
      'Priority support (24-hr response)'
    ],
    note: 'Our most popular plan for mid-size VSOs. Unlimited conversations means no caps during high-demand periods like Veterans Day or benefits enrollment season.'
  },
  premium: {
    name: 'Premium Plan',
    annualPrice: '$6,640/yr',
    monthlyPrice: '$664/mo',
    features: [
      'Everything in Standard',
      'Deploy on up to 3 chapter sites',
      'Multilingual support included free (5 languages)',
      'Quarterly strategy check-in call',
      'Same-day support',
      'Quarterly benefit content updates'
    ],
    note: 'Built for large multi-chapter organizations. Covers up to 3 sites under one plan — and multilingual support is included at no extra cost.'
  }
};

var currentPlan = null;

function openCheckout(planKey) {
  currentPlan = planKey;
  var plan = PLAN_DATA[planKey];
  document.getElementById('cm-plan-name').textContent = plan.name;
  document.getElementById('cm-plan-price').innerHTML =
    'Billed annually &mdash; <strong>' + plan.annualPrice + '</strong> &nbsp;&middot;&nbsp; 2 months free' +
    '<br><span style="font-size:12px;color:rgba(255,255,255,0.4);">or ' + plan.monthlyPrice + ' billed monthly</span>';
  var featList = document.getElementById('cm-feat-list');
  featList.innerHTML = '';
  plan.features.forEach(function(f) {
    var el = document.createElement('div');
    el.className = 'cm-feat';
    el.textContent = f;
    featList.appendChild(el);
  });
  document.getElementById('cm-note').textContent = plan.note;
  document.getElementById('checkout-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
  document.body.style.overflow = '';
  currentPlan = null;
}

function goToCheckout() {
  if (!currentPlan) return;
  var url = CHECKOUT_URLS[currentPlan];
  if (url.indexOf('YOUR-GHL') !== -1) {
    // Placeholder — show friendly message
    document.getElementById('cm-pay-btn').textContent = '⚠ Checkout URL not configured yet';
    document.getElementById('cm-pay-btn').style.background = '#b8860b';
    setTimeout(function() {
      document.getElementById('cm-pay-btn').textContent = 'Proceed to Secure Checkout →';
      document.getElementById('cm-pay-btn').style.background = '';
    }, 2500);
    return;
  }
  window.open(url, '_blank');
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeCheckout();
});

// ── LEAD GATE + SESSION CAP ───────────────────────────────────────────────────
var SESSION_LIMIT = 10;          // max AI turns per session
var cwMsgCount    = 0;           // turns used
var cwUnlocked    = false;       // gate cleared?
var GHL_WEBHOOK   = '';          // paste your GHL webhook URL here

function gateSubmit() {
  var name  = document.getElementById('gate-name').value.trim();
  var email = document.getElementById('gate-email').value.trim();
  var org   = document.getElementById('gate-org').value.trim();
  var err   = document.getElementById('gate-err');
  if (!name)  { err.textContent = 'Please enter your name.';  err.style.display=''; return; }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    err.textContent = 'Please enter a valid email.'; err.style.display=''; return;
  }
  err.style.display = 'none';
  var btn = document.getElementById('gate-submit-btn');
  btn.disabled = true; btn.textContent = 'Unlocking...';

  // Fire to GHL webhook if configured
  if (GHL_WEBHOOK) {
    fetch(GHL_WEBHOOK, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name: name, email: email, organization: org,
        source: 'VetNavigator Demo', page: window.location.href,
        timestamp: new Date().toISOString() })
    }).catch(function(){});
  }

  // Unlock chat
  cwUnlocked = true;
  document.getElementById('cw-lead-gate').style.opacity = '0';
  document.getElementById('cw-lead-gate').style.transition = 'opacity 0.4s';
  setTimeout(function() {
    document.getElementById('cw-lead-gate').style.display = 'none';
  }, 420);
  cwRender('welcome');
  updateMsgCounter();
}

// Allow Enter key in gate fields
['gate-name','gate-email','gate-org'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') gateSubmit();
  });
});

function updateMsgCounter() {
  var remaining = SESSION_LIMIT - cwMsgCount;
  var footer = document.getElementById('cw-footer-bar');
  if (remaining <= 3 && remaining > 0) {
    footer.textContent = 'VetNavigator AI · Demo · ' + remaining + ' message' + (remaining === 1 ? '' : 's') + ' remaining';
    footer.style.color = 'rgba(232,200,74,0.6)';
  } else if (remaining <= 0) {
    footer.textContent = 'VetNavigator AI · Demo · Not official VA advice';
    footer.style.color = '';
  } else {
    footer.textContent = 'VetNavigator AI · Demo · Not official VA advice';
    footer.style.color = '';
  }
}

function showSessionWall() {
  document.getElementById('cw-options').style.display    = 'none';
  document.getElementById('cw-input-row').style.display  = 'none';
  document.getElementById('cw-session-wall').style.display = 'block';
  document.getElementById('cw-footer-bar').style.display = 'none';
}

function cwResetSession() {
  cwMsgCount = 0;
  cwUnlocked = true;
  document.getElementById('cw-session-wall').style.display = 'none';
  document.getElementById('cw-options').style.display    = '';
  document.getElementById('cw-input-row').style.display  = '';
  document.getElementById('cw-footer-bar').style.display = '';
  cwMsgs.innerHTML = ''; cwCards.innerHTML = ''; cwChips.innerHTML = '';
  cwProg.style.width = '0%';
  updateMsgCounter();
  cwBuildOrgNodes();
  cwRender('welcome');
}

// ── SCAN TAB SWITCHING ────────────────────────────────────────────────────────
document.getElementById('tab-website').addEventListener('click', function() {
  document.querySelectorAll('.scan-tab').forEach(function(t){t.classList.remove('active');});
  this.classList.add('active');
  document.getElementById('web-scan-panel').style.display = '';
  document.getElementById('fb-scan-panel').style.display = 'none';
});
document.getElementById('tab-facebook').addEventListener('click', function() {
  document.querySelectorAll('.scan-tab').forEach(function(t){t.classList.remove('active');});
  this.classList.add('active');
  document.getElementById('web-scan-panel').style.display = 'none';
  document.getElementById('fb-scan-panel').style.display = '';
});
document.getElementById('tab-manual').addEventListener('click', function() {
  document.querySelectorAll('.scan-tab').forEach(function(t){t.classList.remove('active');});
  this.classList.add('active');
  document.getElementById('web-scan-panel').style.display = 'none';
  document.getElementById('fb-scan-panel').style.display = 'none';
  setStatus('Fill in your details manually below.', 'scan-success');
});

// ── FACEBOOK PASTE SCAN ───────────────────────────────────────────────────────
document.getElementById('fb-scan-btn').addEventListener('click', async function() {
  var pasteText = document.getElementById('fb-paste-area').value.trim();
  if (!pasteText || pasteText.length < 40) {
    setStatus('Please paste your Facebook About page text first.', 'scan-error'); return;
  }
  var btn = this; btn.disabled = true;
  setStatus('📘 AI is reading your Facebook info...', 'scan-scanning');
  try {
    var aiRes = await fetch(VN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'Extract VSO organization info from pasted Facebook About page text. Respond with valid JSON only — no markdown, no explanation.',
        messages: [{ role: 'user', content: 'Extract info and return ONLY a JSON object with: orgName, city, address, phone, email, hours, events (array, max 6), leaders (array as "Title – Name", max 8). Empty string or [] if not found.\n\n' + pasteText.substring(0, 6000) }]
      })
    });
    var aiJson = await aiRes.json();
    var raw = ((aiJson.content || [])[0] || {}).text || '';
    raw = raw.replace(/```json|```/g, '').trim();
    var data = JSON.parse(raw);
    var found = [];
    if (data.orgName)  { document.getElementById('adm-name').value  = data.orgName;  found.push('org name'); }
    if (data.city)     { document.getElementById('adm-city').value   = data.city;     found.push('city'); }
    if (data.address)  { document.getElementById('adm-addr').value   = data.address;  found.push('address'); }
    if (data.phone)    { document.getElementById('adm-phone').value  = data.phone;    found.push('phone'); }
    if (data.email)    { document.getElementById('adm-email').value  = data.email;    found.push('email'); }
    if (data.hours)    { document.getElementById('adm-hours').value  = data.hours;    found.push('hours'); }
    if (data.events && data.events.length) {
      var el = document.getElementById('adm-events-list'); el.innerHTML = '';
      data.events.forEach(function(ev) {
        var d = document.createElement('div'); d.className = 'admin-list-item';
        d.innerHTML = '<input type="text" value="' + ev.replace(/"/g,'&quot;') + '"/><button class="admin-rm-btn" onclick="this.parentNode.remove()">×</button>';
        el.appendChild(d);
      });
      found.push('events');
    }
    if (data.leaders && data.leaders.length) {
      var ll = document.getElementById('adm-leaders-list'); ll.innerHTML = '';
      data.leaders.forEach(function(ldr) {
        var d = document.createElement('div'); d.className = 'admin-list-item';
        d.innerHTML = '<input type="text" value="' + ldr.replace(/"/g,'&quot;') + '"/><button class="admin-rm-btn" onclick="this.parentNode.remove()">×</button>';
        ll.appendChild(d);
      });
      found.push('leadership');
    }
    if (found.length) {
      setStatus('✓ Found: ' + found.join(', ') + '. Review below and hit Save.', 'scan-success');
    } else {
      setStatus('Could not extract details — try filling in manually below.', 'scan-error');
    }
  } catch(e) {
    setStatus('Something went wrong — fill in manually below.', 'scan-error');
  }
  btn.disabled = false;
});

document.getElementById('admin-scan-btn').addEventListener('click', async function() {
  var url = document.getElementById('adm-scan-url').value.trim();
  if (!url) { setStatus('Please enter a website URL first.', 'scan-error'); return; }
  if (!url.startsWith('http')) url = 'https://' + url;
  var btn = this; btn.disabled = true;
  setStatus('🔍 Fetching your website...', 'scan-scanning');
  var pageText = '';
  try {
    var res  = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url));
    var json = await res.json();
    pageText = (json.contents || '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '  ')
      .substring(0, 6000);
  } catch(e) {
    setStatus('Could not fetch the page — fill in details manually below.', 'scan-error');
    btn.disabled = false; return;
  }
  if (!pageText || pageText.length < 80) {
    setStatus('Page had little readable content. Please fill in manually.', 'scan-error');
    btn.disabled = false; return;
  }
  setStatus('🤖 AI is reading your website...', 'scan-scanning');
  try {
    var aiRes = await fetch(VN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'Extract VSO info from website text. Respond with valid JSON only — no markdown, no explanation.',
        messages: [{ role: 'user', content: 'Extract info and return ONLY a JSON object with: orgName, city, address, phone, email, hours, events (array, max 6), leaders (array as "Title – Name", max 8). Empty string or [] if not found.\n\n' + pageText }]
      })
    });
    var aiJson = await aiRes.json();
    var raw = ((aiJson.content || [])[0] || {}).text || '';
    raw = raw.replace(/```json|```/g, '').trim();
    var data = JSON.parse(raw);
    if (data.orgName)  document.getElementById('adm-name').value  = data.orgName;
    if (data.city)     document.getElementById('adm-city').value  = data.city;
    if (data.address)  document.getElementById('adm-addr').value  = data.address;
    if (data.phone)    document.getElementById('adm-phone').value = data.phone;
    if (data.email)    document.getElementById('adm-email').value = data.email;
    if (data.hours)    document.getElementById('adm-hours').value = data.hours;
    document.getElementById('adm-web').value = url.replace(/^https?:\/\//, '');
    document.getElementById('adm-events-list').innerHTML = '';
    (data.events || []).forEach(function(e) { if (e) addRepeaterRow('adm-events-list', 'Event', e); });
    document.getElementById('adm-leaders-list').innerHTML = '';
    (data.leaders || []).forEach(function(l) { if (l) addRepeaterRow('adm-leaders-list', 'Leader', l); });
    var found = [];
    if (data.orgName) found.push('org name');
    if (data.phone || data.email) found.push('contact info');
    if (data.hours) found.push('hours');
    if ((data.events||[]).length) found.push(data.events.length + ' event' + (data.events.length > 1 ? 's' : ''));
    if ((data.leaders||[]).length) found.push(data.leaders.length + ' leader' + (data.leaders.length > 1 ? 's' : ''));
    setStatus('✓ Found: ' + (found.join(', ') || 'some info') + '. Review and hit Save.', 'scan-success');
  } catch(e) {
    setStatus('AI scan failed — please fill in details manually.', 'scan-error');
  }
  btn.disabled = false;
});

function setStatus(msg, cls) {
  var el = document.getElementById('admin-scan-status');
  el.textContent = msg; el.className = cls;
}

// Save admin
document.getElementById('admin-save-btn').addEventListener('click', function() {
  var name  = document.getElementById('adm-name').value.trim();
  var city  = document.getElementById('adm-city').value.trim();
  var addr  = document.getElementById('adm-addr').value.trim();
  var phone = document.getElementById('adm-phone').value.trim();
  var email = document.getElementById('adm-email').value.trim();
  var web   = document.getElementById('adm-web').value.trim();
  var hours   = document.getElementById('adm-hours').value.trim();
  var mission = document.getElementById('adm-mission') ? document.getElementById('adm-mission').value.trim() : '';
  var events = [], leaders = [];
  document.querySelectorAll('#adm-events-list input').forEach(function(i) { if (i.value.trim()) events.push(i.value.trim()); });
  document.querySelectorAll('#adm-leaders-list input').forEach(function(i) { if (i.value.trim()) leaders.push(i.value.trim()); });

  // Update header + global org name
  cwOrgName    = name    || 'VFW Post 1234';
  cwOrgCity    = city    || '';
  cwOrgAddr    = addr    || '';
  cwOrgPhone   = phone   || '';
  cwOrgEmail   = email   || '';
  cwOrgWeb     = web     || '';
  cwOrgMission = mission || '';
  cwOrgHours   = hours   || '';
  cwOrgEvents  = events;
  cwOrgLeaders = leaders;
  cwBuildOrgNodes();
  document.getElementById('cw-org-name').textContent = cwOrgName + ' — Benefits Assistant';

  // Build org contact block
  var contactBlock = '';
  if (addr)  contactBlock += '\uD83D\uDCCD ' + addr + (city ? ', ' + city : '') + '\n';
  else if (city) contactBlock += '\uD83D\uDCCD ' + city + '\n';
  if (hours) contactBlock += '\uD83D\uDD50 ' + hours + '\n';
  if (phone) contactBlock += '\uD83D\uDCDE ' + phone + '\n';
  if (email) contactBlock += '\u2709\uFE0F ' + email + '\n';
  if (web)   contactBlock += '\uD83C\uDF10 ' + web + '\n';

  // Language-specific intro lines
  var vsoIntros = {
    en: { h: 'Your VSO counselors are here to help \u2014 free of charge.', cta: '100% free. Walk-ins welcome.', evt: 'Upcoming Events', ldr: 'Your Counselors' },
    es: { h: 'Sus consejeros VSO est\u00e1n aqu\u00ed para ayudarle \u2014 sin costo.', cta: '100% gratuito. Se aceptan visitas sin cita.', evt: 'Pr\u00f3ximos Eventos', ldr: 'Sus Consejeros' },
    vi: { h: 'C\u00e1c c\u1ed1 v\u1ea5n VSO s\u1eb5n s\u00e0ng gi\u00fap \u0111\u1ee1 \u2014 mi\u1ec5n ph\u00ed.', cta: '100% mi\u1ec5n ph\u00ed. Kh\u00f4ng c\u1ea7n h\u1eb9n tr\u01b0\u1edbc.', evt: 'S\u1ef1 Ki\u1ec7n S\u1eafp T\u1edbi', ldr: 'C\u1ed1 V\u1ea5n C\u1ee7a B\u1ea1n' },
    ko: { h: '\ubb34\ub8cc VSO \uc0c1\ub2f4\uc0ac\uac00 \ub3c4\uc640\ub4dc\ub9ac\uaca0\uc2b5\ub2c8\ub2e4.', cta: '100% \ubb34\ub8cc. \uc608\uc57d \uc5c6\uc774 \ubc29\ubb38 \uac00\ub2a5.', evt: '\uc608\uc815\ub41c \ud589\uc0ac', ldr: '\uc0c1\ub2f4\uc0ac \uc548\ub0b4' },
    tl: { h: 'Ang inyong mga VSO counselor ay handang tumulong \u2014 libre.', cta: '100% libre. Tinatanggap ang mga walk-in.', evt: 'Mga Paparating na Kaganapan', ldr: 'Inyong mga Counselor' }
  };
  var genericFallback = '<strong>DAV</strong> \u2014 dav.org\n<strong>VFW</strong> \u2014 vfw.org\n<strong>American Legion</strong> \u2014 legion.org\n';

  Object.keys(translations).forEach(function(lang) {
    if (!translations[lang].vso) return;
    var i = vsoIntros[lang] || vsoIntros.en;
    var orgName = name || 'your local VSO';
    var evtLang = events.length ? '\n<strong>' + i.evt + ':</strong>\n' + events.map(function(e){return '\u2022 '+e;}).join('\n') : '';
    var ldrLang = leaders.length ? '\n<strong>' + i.ldr + ':</strong>\n' + leaders.map(function(l){return '\u2022 '+l;}).join('\n') : '';
    translations[lang].vso.bot =
      i.h + '\n\n' +
      '<strong>' + orgName + '</strong>\n' +
      (contactBlock || genericFallback) +
      evtLang + ldrLang +
      '\n\n' + i.cta + ' \uD83C\uDDFA\uD83C\uDDF8';
  });

  var msg = document.getElementById('admin-saved-msg');
  msg.style.display = 'block';
  setTimeout(function() { msg.style.display = 'none'; }, 3000);

  // Reset chat with new branding
  cwBuildOrgNodes();
  cwBuildWelcome();
  cwMsgs.innerHTML = ''; cwCards.innerHTML = ''; cwChips.innerHTML = '';
  cwProg.style.width = '0%';
});

}); // end DOMContentLoaded


  // ── Init on DOM ready ──────────────────────────────────────────────────────
  function vnInit() {
    if (typeof cwBuildOrgNodes === 'function') cwBuildOrgNodes();
    if (document.getElementById('fcw-org-name')) {
      document.getElementById('fcw-org-name').textContent = cwOrgName + ' — Benefits Assistant';
    }
    if (document.getElementById('cw-org-name')) {
      document.getElementById('cw-org-name').textContent = cwOrgName;
    }
    // Dispatch event so page can listen
    window.dispatchEvent(new CustomEvent('vn-ready', { detail: { orgId: cfg.orgId } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vnInit);
  } else {
    vnInit();
  }

})();
