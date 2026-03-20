import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";

const BACKEND = "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=JetBrains+Mono:wght@300;400;500&display=swap');

/* ─── Palette ─── */
:root {
  --paper:    #faf4e8;
  --paper2:   #f2e8d2;
  --paper3:   #e8dcc0;
  --paper4:   #d8ccaa;
  --ink:      #160f06;
  --ink2:     #2e2008;
  --ink3:     #5a4422;
  --ink4:     #8a6e40;
  --ink5:     #b89a68;
  --rose:     #b83830;
  --roseB:    #e04838;
  --roseC:    #f06858;
  --roseDim:  rgba(184,56,48,0.09);
  --rosePale: #fce8e6;
  --sage:     #2e6838;
  --sageB:    #3e8848;
  --sageDim:  rgba(46,104,56,0.09);
  --sagePale: #dceedd;
  --amber:    #a05808;
  --amberB:   #d07818;
  --amberDim: rgba(160,88,8,0.10);
  --amberPale:#fdebd0;
  --navy:     #163268;
  --navyB:    #2050a8;
  --navyDim:  rgba(22,50,104,0.09);
  --navyPale: #d8e2f8;
  --gold:     #c08000;
  --goldPale: #fdf0c8;
  --plum:     #7a2868;
  --plumDim:  rgba(122,40,104,0.09);
  --plumPale: #f4d8f0;
  --shadow-sm:  0 2px 8px rgba(22,15,6,0.08);
  --shadow:     0 4px 24px rgba(22,15,6,0.11), 0 1px 6px rgba(22,15,6,0.07);
  --shadow-lg:  0 12px 52px rgba(22,15,6,0.16), 0 4px 14px rgba(22,15,6,0.10);
  --shadow-xl:  0 28px 80px rgba(22,15,6,0.22), 0 8px 24px rgba(22,15,6,0.12);
  --nav-bg:     rgba(250,244,232,0.94);
  --serif:  'Playfair Display', Georgia, serif;
  --body:   'Crimson Pro', Georgia, serif;
  --mono:   'JetBrains Mono', monospace;
}

[data-theme="dark"] {
  --paper:    #110c06;
  --paper2:   #1a1409;
  --paper3:   #231c10;
  --paper4:   #2e2416;
  --ink:      #f8f0e0;
  --ink2:     #e0d0b0;
  --ink3:     #a08860;
  --ink4:     #705c38;
  --ink5:     #4a3c24;
  --rose:     #e05040;
  --roseB:    #f06050;
  --roseC:    #f88070;
  --roseDim:  rgba(224,80,64,0.13);
  --rosePale: rgba(224,80,64,0.16);
  --sage:     #48a058;
  --sageB:    #58c068;
  --sageDim:  rgba(72,160,88,0.12);
  --sagePale: rgba(72,160,88,0.16);
  --amber:    #d08020;
  --amberB:   #e0a030;
  --amberDim: rgba(208,128,32,0.13);
  --amberPale:rgba(208,128,32,0.16);
  --navy:     #5080d0;
  --navyB:    #6898e8;
  --navyDim:  rgba(80,128,208,0.12);
  --navyPale: rgba(80,128,208,0.16);
  --gold:     #e0a020;
  --goldPale: rgba(224,160,32,0.16);
  --plum:     #c058b0;
  --plumDim:  rgba(192,88,176,0.12);
  --plumPale: rgba(192,88,176,0.16);
  --shadow-sm:  0 2px 8px rgba(0,0,0,0.4);
  --shadow:     0 4px 24px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.3);
  --shadow-lg:  0 12px 52px rgba(0,0,0,0.65), 0 4px 14px rgba(0,0,0,0.4);
  --shadow-xl:  0 28px 80px rgba(0,0,0,0.78), 0 8px 24px rgba(0,0,0,0.5);
  --nav-bg:     rgba(17,12,6,0.97);
}

/* ─── Base ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--paper); scroll-behavior: smooth; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--body);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  transition: background 0.4s, color 0.4s;
  overflow-x: hidden;
}
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: var(--ink5); border-radius: 10px; }

/* ─── Keyframes ─── */
@keyframes fadeUp    { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
@keyframes scaleIn   { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
@keyframes slideR    { from { opacity:0; transform:translateX(-14px) } to { opacity:1; transform:translateX(0) } }
@keyframes slideUp   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
@keyframes float1    { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-16px) rotate(4deg)} }
@keyframes float2    { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-10px) rotate(-5deg)} 66%{transform:translateY(-18px) rotate(3deg)} }
@keyframes float3    { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(-3deg)} }
@keyframes drift     { 0%{transform:translate(0,0) rotate(0)} 25%{transform:translate(8px,-6px) rotate(2deg)} 50%{transform:translate(-4px,-10px) rotate(-1deg)} 75%{transform:translate(-8px,4px) rotate(2deg)} 100%{transform:translate(0,0) rotate(0)} }
@keyframes pulse     { 0%,100%{transform:scale(1)} 15%{transform:scale(1.14)} 30%{transform:scale(1)} 45%{transform:scale(1.07)} 60%{transform:scale(1)} }
@keyframes pulseRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.4);opacity:0} }
@keyframes drawLine  { from{stroke-dashoffset:1200} to{stroke-dashoffset:0} }
@keyframes drawLine2 { 0%{stroke-dashoffset:1200} 50%{stroke-dashoffset:0} 100%{stroke-dashoffset:-1200} }
@keyframes spin      { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes dotPulse  { 0%,100%{opacity:0.25;transform:scale(0.65)} 50%{opacity:1;transform:scale(1)} }
@keyframes inkBloom  { 0%{transform:scale(0) rotate(-15deg);opacity:0} 60%{transform:scale(1.1) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes glowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(184,56,48,0.18)} 50%{box-shadow:0 0 0 14px rgba(184,56,48,0)} }
@keyframes borderFlow{ 0%{background-position:0 0} 100%{background-position:300% 0} }
@keyframes stampIn   { 0%{transform:scale(1.8) rotate(-8deg);opacity:0} 60%{transform:scale(0.96) rotate(1deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes marquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes ripple    { 0%{transform:scale(0);opacity:0.5} 100%{transform:scale(4);opacity:0} }
@keyframes wobble    { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-2deg)} 75%{transform:rotate(2deg)} }
@keyframes shine     { 0%{left:-100%} 100%{left:200%} }

.fade-up  { animation: fadeUp  0.55s cubic-bezier(0.22,1,0.36,1) both; }
.fade-in  { animation: fadeIn  0.4s ease both; }
.scale-in { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
.slide-r  { animation: slideR  0.38s ease both; }
.ink-bloom{ animation: inkBloom 0.5s cubic-bezier(0.22,1,0.36,1) both; }
.s1{animation-delay:.07s}.s2{animation-delay:.14s}.s3{animation-delay:.21s}
.s4{animation-delay:.28s}.s5{animation-delay:.35s}.s6{animation-delay:.42s}

/* ─── Paper texture ─── */
.paper-texture::after {
  content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  opacity: 0.7;
}

/* ─── Ambient blobs ─── */
.blob {
  position: fixed; border-radius: 50%; filter: blur(80px);
  pointer-events: none; z-index: 0; opacity: 0.55;
  transition: opacity 0.4s;
}
[data-theme="dark"] .blob { opacity: 0.3; }

/* ─── Card ─── */
.card {
  background: var(--paper2);
  border: 1.5px solid rgba(22,15,6,0.13);
  border-radius: 6px;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s, border-color 0.2s;
  overflow: hidden;
}
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
[data-theme="dark"] .card { border-color: rgba(248,240,224,0.10); }

/* Corner accents */
.card::before, .card::after {
  content:''; position:absolute; width:20px; height:20px;
  border-color: var(--rose); border-style: solid; opacity: 0.4;
  transition: opacity 0.25s, width 0.25s, height 0.25s;
  z-index: 1; pointer-events: none;
}
.card::before { top:8px; left:8px;  border-width:1.5px 0 0 1.5px; }
.card::after  { bottom:8px; right:8px; border-width:0 1.5px 1.5px 0; }
.card:hover::before, .card:hover::after { opacity:0.9; width:26px; height:26px; }

/* Shine effect */
.card .shine {
  position:absolute; inset:0; pointer-events:none; z-index:2;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
  background-size: 200% 100%;
  opacity: 0; transition: opacity 0.3s;
}
.card:hover .shine { opacity: 1; animation: shine 0.6s ease; }

/* ─── Stat card ─── */
.stat-card {
  background: var(--paper2);
  border: 1.5px solid rgba(22,15,6,0.12);
  border-radius: 6px;
  padding: 20px 22px;
  position: relative;
  overflow: hidden;
  transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s;
}
.stat-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: var(--shadow-lg); }
.stat-card .accent-bar {
  position: absolute; top:0; left:0; right:0; height: 3px;
  border-radius: 6px 6px 0 0;
}

/* ─── Buttons ─── */
.btn-rose {
  font-family: var(--body); font-size: 15px; font-weight: 600;
  padding: 11px 26px; cursor: pointer; letter-spacing: 0.02em;
  border-radius: 4px; position: relative; overflow: hidden;
  border: 2px solid var(--rose);
  background: linear-gradient(135deg, var(--rose), var(--roseB));
  color: #fff;
  box-shadow: 0 4px 16px rgba(184,56,48,0.3);
  transition: all 0.22s cubic-bezier(0.22,1,0.36,1);
}
.btn-rose::before {
  content:''; position:absolute; inset:0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
  opacity:0; transition: opacity 0.2s;
}
.btn-rose:hover { transform:translateY(-2px); box-shadow: 0 8px 28px rgba(184,56,48,0.42); }
.btn-rose:hover::before { opacity:1; }
.btn-rose:active { transform:translateY(0); }
.btn-rose:disabled { opacity:0.38; cursor:not-allowed; transform:none; box-shadow:none; }

.btn-ink {
  font-family: var(--body); font-size: 15px; font-weight: 600;
  padding: 11px 26px; cursor: pointer; letter-spacing: 0.02em;
  border-radius: 4px; position: relative; overflow: hidden;
  border: 2px solid var(--ink2);
  background: var(--ink); color: var(--paper);
  transition: all 0.22s cubic-bezier(0.22,1,0.36,1);
  box-shadow: var(--shadow-sm);
}
.btn-ink:hover { transform:translateY(-2px); box-shadow: var(--shadow); }
.btn-ink:disabled { opacity:0.35; cursor:not-allowed; transform:none; }

.btn-outline {
  font-family: var(--body); font-size: 14px; font-weight: 400;
  padding: 9px 22px; cursor: pointer;
  border-radius: 4px; border: 1.5px solid rgba(22,15,6,0.2);
  background: transparent; color: var(--ink2);
  transition: all 0.2s;
}
.btn-outline:hover { border-color: var(--rose); color: var(--rose); background: var(--roseDim); transform:translateY(-1px); }
[data-theme="dark"] .btn-outline { border-color: rgba(248,240,224,0.18); color: var(--ink2); }

/* ─── Field ─── */
.field {
  width: 100%; background: var(--paper);
  border: 1.5px solid rgba(22,15,6,0.16);
  border-radius: 4px; padding: 11px 16px;
  font-family: var(--body); font-size: 15px; color: var(--ink);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s;
}
.field:focus { border-color: var(--rose); box-shadow: 0 0 0 3px var(--roseDim); }
.field::placeholder { color: var(--ink5); font-style: italic; }
.field.err { border-color: var(--roseB); box-shadow: 0 0 0 3px var(--roseDim); }
[data-theme="dark"] .field { border-color: rgba(248,240,224,0.13); }
textarea.field { resize: vertical; min-height: 80px; }

/* ─── Label ─── */
.ink-label {
  display: block; font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.17em; text-transform: uppercase;
  color: var(--ink4); margin-bottom: 7px;
}

/* ─── Tag ─── */
.tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
  padding: 3px 12px; border-radius: 20px;
  border: 1px solid rgba(22,15,6,0.16); color: var(--ink3); background: var(--paper3);
  transition: all 0.15s;
}
.tag.rose  { border-color:var(--rose)60;  color:var(--rose);  background:var(--roseDim);  }
.tag.sage  { border-color:var(--sage)60;  color:var(--sage);  background:var(--sageDim);  }
.tag.amber { border-color:var(--amber)60; color:var(--amber); background:var(--amberDim); }
.tag.navy  { border-color:var(--navy)60;  color:var(--navy);  background:var(--navyDim);  }
.tag.gold  { border-color:var(--gold)60;  color:var(--gold);  background:rgba(192,128,0,0.1); }
.tag.plum  { border-color:var(--plum)60;  color:var(--plum);  background:var(--plumDim);  }

/* ─── Eyebrow ─── */
.eyebrow {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--ink4);
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.eyebrow::after { content:''; flex:0 0 36px; height:2px; background:linear-gradient(90deg,var(--rose),transparent); border-radius:1px; }

/* ─── Nav link ─── */
.nav-lnk {
  font-family: var(--body); font-size: 14.5px; font-weight: 400;
  padding: 5px 16px; color: var(--ink3); background: transparent;
  border: none; cursor: pointer; border-radius: 20px; transition: all 0.15s;
}
.nav-lnk:hover { color: var(--ink); background: var(--paper3); }
.nav-lnk.on { color: var(--rose); font-weight: 600; }

/* ─── Tabs ─── */
.tab-row { display: flex; border-bottom: 2px solid rgba(22,15,6,0.1); }
.tab-btn {
  font-family: var(--body); font-size: 14.5px; font-weight: 500;
  padding: 10px 22px; border: none; border-bottom: 2.5px solid transparent;
  background: transparent; color: var(--ink4); cursor: pointer;
  margin-bottom: -2px; transition: all 0.15s;
}
.tab-btn:hover { color: var(--ink2); }
.tab-btn.on { color: var(--rose); border-bottom-color: var(--rose); }

/* ─── Mode pill ─── */
.mode-pill { display: flex; border: 1.5px solid rgba(22,15,6,0.16); border-radius: 30px; overflow: hidden; background: var(--paper3); }
.mode-opt  {
  font-family: var(--body); font-size: 14px; flex:1; text-align:center;
  padding: 9px 22px; border: none; background: transparent; color: var(--ink4);
  cursor: pointer; transition: all 0.2s; border-radius: 30px;
}
.mode-opt.on { background: linear-gradient(135deg,var(--rose),var(--roseB)); color: #fff; font-weight: 600; }

/* ─── Slider ─── */
input[type=range] {
  -webkit-appearance: none; width: 100%; height: 5px;
  background: var(--paper3); border-radius: 3px; outline: none; cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
  background: var(--paper); border: 2.5px solid var(--rose);
  box-shadow: 0 2px 10px rgba(184,56,48,0.35); cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.22); box-shadow: 0 4px 16px rgba(184,56,48,0.45); }

/* ─── Progress ─── */
.prog-track { height: 6px; background: var(--paper3); border-radius: 4px; overflow: hidden; }
.prog-fill  { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.22,1,0.36,1); }

/* ─── Chat bubbles ─── */
.bubble-ai {
  background: var(--paper);
  border: 1.5px solid rgba(22,15,6,0.11);
  border-radius: 4px 18px 18px 18px;
  padding: 13px 18px; font-family: var(--body); font-size: 15px;
  line-height: 1.74; color: var(--ink); max-width: 78%;
  box-shadow: var(--shadow-sm);
  animation: slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.bubble-user {
  background: linear-gradient(135deg, var(--rose), var(--roseB));
  color: #fff; border-radius: 18px 4px 18px 18px;
  padding: 13px 18px; font-family: var(--body); font-size: 15px;
  line-height: 1.74; max-width: 78%;
  box-shadow: 0 4px 20px rgba(184,56,48,0.3);
  animation: slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both;
}

/* ─── Data row ─── */
.data-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 9px 0; border-bottom: 1px dashed rgba(22,15,6,0.09);
}
.data-row:last-child { border-bottom: none; }

/* ─── Gradient heading ─── */
.grad-heading {
  background: linear-gradient(135deg, var(--rose), var(--plum), var(--amber));
  background-size: 200% 200%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradShift 6s ease infinite;
}

/* ─── Gold rule ─── */
.gold-rule {
  height: 2px; margin: 0;
  background: linear-gradient(90deg, transparent, var(--gold), var(--amber), transparent);
  opacity: 0.6; border-radius: 2px;
}

/* ─── Live badge ─── */
.live-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 16px; border-radius: 24px;
  border: 1px solid rgba(46,104,56,0.5); background: var(--sageDim);
}
.live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--sage);
  position: relative; animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 6px var(--sage);
}
.live-dot::after {
  content:''; position:absolute; inset:-4px; border-radius:50%;
  background: var(--sage); opacity:0.3; animation: pulseRing 2s ease-out infinite;
}

/* ─── Stamp ─── */
.stamp {
  display: inline-flex; align-items: center; justify-content: center;
  border: 2.5px solid; border-radius: 50%; padding: 12px;
  animation: stampIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
}

/* ─── Floating particles ─── */
.particle {
  position: absolute; border-radius: 50%; pointer-events: none;
  animation: drift 12s ease-in-out infinite;
}

/* ─── Scroll ticker ─── */
.ticker-inner { display: flex; animation: marquee 22s linear infinite; white-space: nowrap; }

/* ─── Flow node ─── */
.flow-node {
  position: absolute; border: 1.5px solid rgba(22,15,6,0.14);
  border-radius: 6px; background: var(--paper2);
  padding: 12px 16px; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
}
.flow-node:hover { transform: scale(1.04) translateY(-2px); box-shadow: var(--shadow); border-color: var(--rose); }
.flow-node.on { border-color: var(--rose); background: var(--roseDim); box-shadow: var(--shadow-lg); transform: scale(1.05); }

/* ─── ECG ─── */
.ecg-path { stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: drawLine2 4s linear infinite; }

/* ─── Hover lift ─── */
.lift { transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s; }
.lift:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
`;

/* ═══════════════════════════════════════════════════════════════════
   SVG ILLUSTRATIONS
═══════════════════════════════════════════════════════════════════ */
function Caduceus({ size = 40, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={style}>
      <line x1="24" y1="44" x2="24" y2="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M15 34 C7 28 7 19 15 13 C23 7 23 5 24 4" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M33 34 C41 28 41 19 33 13 C25 7 25 5 24 4" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="24" cy="4" r="3.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <path d="M16 7 L24 4 L32 7" stroke="var(--gold)" strokeWidth="1.2" opacity="0.9"/>
      <circle cx="24" cy="4" r="1.2" fill="var(--gold)" opacity="0.8"/>
    </svg>
  );
}

function IllustLeaf({ w = 100, h = 150, style, color = "#2e6838", opacity = 0.3 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 150" fill="none" style={{ ...style, opacity }}>
      <path d="M50 145 C50 145 8 120 6 78 C4 42 22 8 50 5 C78 8 96 42 94 78 C92 120 50 145 50 145Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.07"/>
      <path d="M50 145 L50 5" stroke={color} strokeWidth="1" strokeDasharray="3 5" opacity="0.7"/>
      <path d="M50 110 C33 100 25 82 30 62" stroke={color} strokeWidth="1" opacity="0.8"/>
      <path d="M50 110 C67 100 75 82 70 62" stroke={color} strokeWidth="1" opacity="0.8"/>
      <path d="M50 85 C36 77 31 62 36 46" stroke={color} strokeWidth="0.9" opacity="0.7"/>
      <path d="M50 85 C64 77 69 62 64 46" stroke={color} strokeWidth="0.9" opacity="0.7"/>
      <path d="M50 60 C40 54 37 44 41 32" stroke={color} strokeWidth="0.8" opacity="0.6"/>
      <path d="M50 60 C60 54 63 44 59 32" stroke={color} strokeWidth="0.8" opacity="0.6"/>
      <circle cx="50" cy="5" r="2.5" fill={color} opacity="0.6"/>
      <circle cx="50" cy="145" r="3" fill={color} opacity="0.4"/>
    </svg>
  );
}

function IllustFlower({ size = 90, style, color = "#b83830", opacity = 0.25 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ ...style, opacity }}>
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = (i / 8) * Math.PI * 2;
        const a2 = ((i + 0.5) / 8) * Math.PI * 2;
        const r1 = 38, r2 = 26;
        const x1 = 50 + Math.cos(a) * r1, y1 = 50 + Math.sin(a) * r1;
        const cx = 50 + Math.cos(a2) * r2, cy = 50 + Math.sin(a2) * r2;
        const a3 = ((i - 0.5) / 8) * Math.PI * 2;
        const cx2 = 50 + Math.cos(a3) * r2, cy2 = 50 + Math.sin(a3) * r2;
        return (
          <path key={i} d={`M50,50 Q${cx2},${cy2} ${x1},${y1} Q${cx},${cy} 50,50`}
            stroke={color} strokeWidth="1.1" fill={color} fillOpacity="0.1"/>
        );
      })}
      <circle cx="50" cy="50" r="10" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.15"/>
      <circle cx="50" cy="50" r="4"  fill={color} opacity="0.55"/>
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 38} cy={50 + Math.sin(a) * 38} r="2" fill={color} opacity="0.4"/>;
      })}
    </svg>
  );
}

function IllustBranch({ w = 200, h = 130, style, opacity = 0.22 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 200 130" fill="none" style={{ ...style, opacity }}>
      <path d="M10 120 C50 90 90 72 130 52 C160 36 185 20 198 6" stroke="var(--sage)" strokeWidth="1.6"/>
      {[[35,100],[60,85],[85,70],[110,57],[135,45],[158,33]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x},${y} C${x-14},${y-22} ${x-7},${y-38} ${x},${y-32}`}
            stroke="var(--sage)" strokeWidth="1.1" fill="var(--sage)" fillOpacity="0.08"/>
          <path d={`M${x},${y} C${x+16},${y-18} ${x+12},${y-35} ${x+5},${y-30}`}
            stroke="var(--sage)" strokeWidth="1.1" fill="var(--sage)" fillOpacity="0.08"/>
          <circle cx={x} cy={y-32 + (i%2)*4} r="1.5" fill="var(--rose)" opacity="0.45"/>
        </g>
      ))}
    </svg>
  );
}

function IllustWreath({ size = 220, style, opacity = 0.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" style={{ ...style, opacity }}>
      <circle cx="110" cy="110" r="88" stroke="var(--rose)" strokeWidth="0.8" strokeDasharray="4 6"/>
      <circle cx="110" cy="110" r="74" stroke="var(--amber)" strokeWidth="0.6" strokeDasharray="2 7"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i / 12) * Math.PI * 2;
        const rx = 110 + Math.cos(a) * 74, ry = 110 + Math.sin(a) * 74;
        const ex = 110 + Math.cos(a) * 90, ey = 110 + Math.sin(a) * 90;
        return (
          <g key={i}>
            <line x1={rx} y1={ry} x2={ex} y2={ey} stroke="var(--rose)" strokeWidth="0.9" opacity="0.7"/>
            <circle cx={ex} cy={ey} r="2.5" fill={i%3===0?"var(--rose)":i%3===1?"var(--amber)":"var(--sage)"} opacity="0.5"/>
          </g>
        );
      })}
      <text x="110" y="114" textAnchor="middle" fontFamily="'Playfair Display',serif"
        fontSize="14" fill="var(--rose)" fontStyle="italic" opacity="0.7">MediChain</text>
    </svg>
  );
}

function IllustCross({ size = 60, style, opacity = 0.3 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" style={{ ...style, opacity }}>
      <circle cx="30" cy="30" r="26" stroke="var(--navy)" strokeWidth="1"/>
      <rect x="24" y="14" width="12" height="32" rx="2" stroke="var(--rose)" strokeWidth="1.2" fill="var(--rose)" fillOpacity="0.1"/>
      <rect x="14" y="24" width="32" height="12" rx="2" stroke="var(--rose)" strokeWidth="1.2" fill="var(--rose)" fillOpacity="0.1"/>
    </svg>
  );
}

function ECGLine({ style, color = "var(--rose)", opacity = 0.45 }) {
  return (
    <svg viewBox="0 0 600 50" preserveAspectRatio="none" style={{ width: "100%", height: 40, ...style }}>
      <path className="ecg-path"
        d="M0,25 L70,25 L85,25 L92,6 L99,44 L106,12 L113,25 L190,25 L205,25 L212,6 L219,44 L226,12 L233,25 L310,25 L325,25 L332,6 L339,44 L346,12 L353,25 L430,25 L445,25 L452,6 L459,44 L466,12 L473,25 L550,25 L565,25 L572,6 L579,44 L586,12 L593,25"
        fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity={opacity}/>
    </svg>
  );
}

/* ─── Floating Particles Background ─── */
function ParticleField({ count = 16, style }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      color: ["var(--rose)","var(--sage)","var(--amber)","var(--navy)","var(--plum)","var(--gold)"][Math.floor(Math.random() * 6)],
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 8,
      shape: Math.random() > 0.5 ? "circle" : "leaf",
    }))
  ).current;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", ...style }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.shape === "leaf" ? p.size * 1.5 : p.size,
          borderRadius: p.shape === "leaf" ? "50% 0 50% 0" : "50%",
          background: p.color,
          opacity: 0.18,
          animation: `float${(p.id % 3) + 1} ${p.duration}s ${p.delay}s ease-in-out infinite`,
        }}/>
      ))}
    </div>
  );
}

/* ─── Ambient colour blobs ─── */
function AmbientBlobs() {
  return (
    <>
      <div className="blob" style={{ width:500, height:500, top:"-12%", right:"-8%", background:"radial-gradient(circle, rgba(184,56,48,0.22) 0%, transparent 70%)", animation:"drift 18s ease-in-out infinite" }}/>
      <div className="blob" style={{ width:380, height:380, bottom:"-10%", left:"-6%", background:"radial-gradient(circle, rgba(46,104,56,0.2) 0%, transparent 70%)", animation:"drift 22s 3s ease-in-out infinite" }}/>
      <div className="blob" style={{ width:300, height:300, top:"40%", left:"40%", background:"radial-gradient(circle, rgba(160,88,8,0.13) 0%, transparent 70%)", animation:"drift 15s 6s ease-in-out infinite" }}/>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════════ */
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("mc_theme") !== "light");
  useEffect(() => {
    const id = "mc-css";
    if (!document.getElementById(id)) {
      const s = document.createElement("style"); s.id = id; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  const toggle = () => setDark(v => { localStorage.setItem("mc_theme", v ? "light" : "dark"); return !v; });
  return <ThemeCtx.Provider value={{ dark, toggle }}>{children}</ThemeCtx.Provider>;
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH + API
═══════════════════════════════════════════════════════════════════ */
function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("mc_token") || "");
  const [ready, setReady] = useState(false);
  useEffect(() => { token ? me() : setReady(true); }, []);
  async function me() {
    try { const r = await fetch(BACKEND + "/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }); if (r.ok) setUser(await r.json()); else logout(); } catch { logout(); }
    setReady(true);
  }
  const login = (t, u) => { setToken(t); setUser(u); localStorage.setItem("mc_token", t); };
  const logout = () => { setToken(""); setUser(null); localStorage.removeItem("mc_token"); };
  return { user, token, ready, login, logout };
}

function makeApi(token) {
  const h = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const get  = async p => { const r = await fetch(BACKEND + p, { headers: h }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  const post = async (p, b) => { const r = await fetch(BACKEND + p, { method: "POST", headers: h, body: JSON.stringify(b) }); if (!r.ok) { const e = await r.json().catch(() => ({ detail: r.status })); throw new Error(e.detail || r.status); } return r.json(); };
  const put  = async (p, b) => { const r = await fetch(BACKEND + p, { method: "PUT",  headers: h, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  const del  = async p => { const r = await fetch(BACKEND + p, { method: "DELETE", headers: h }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  return {
    register: b => post("/api/auth/register", b), loginJson: b => post("/api/auth/login/json", b),
    patients: () => get("/api/patients"), createPatient: b => post("/api/patients", b),
    updatePatient: (id, b) => put(`/api/patients/${id}`, b), deletePatient: id => del(`/api/patients/${id}`),
    patientSessions: id => get(`/api/patients/${id}/sessions`),
    start: s => post("/api/session/start", s), chat: b => post("/api/session/chat", b),
    diagnose: b => post("/api/session/diagnose", b), sessions: () => get("/api/sessions"),
    session: id => get(`/api/session/${id}`), questions: () => get("/api/eval/questions"),
    evalRun: b => post("/api/eval/run", b), evalHist: () => get("/api/eval/history"),
    exportUrl: (id, t) => `${BACKEND}/api/session/${id}/export/${t}`,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
const SEV = n => n <= 3 ? { l: "Mild",     c: "var(--sage)",  bg: "var(--sagePale)"  }
               : n <= 5 ? { l: "Moderate", c: "var(--amber)", bg: "var(--amberPale)" }
               : n <= 7 ? { l: "Elevated", c: "#b06840",      bg: "rgba(176,104,64,0.12)" }
               : n <= 9 ? { l: "Severe",   c: "var(--rose)",  bg: "var(--rosePale)"  }
               :          { l: "Critical", c: "var(--rose)",  bg: "var(--rosePale)"  };

const AGENTS = {
  interviewer:   { icon: "🩺", label: "Interviewer",   c: "var(--sage)",  bg: "var(--sagePale)",  b: "var(--sage)"  },
  diagnostician: { icon: "🔬", label: "Diagnostician", c: "var(--navy)",  bg: "var(--navyPale)",  b: "var(--navy)"  },
  critic:        { icon: "⚖️", label: "Critic Agent",  c: "var(--amber)", bg: "var(--amberPale)", b: "var(--amber)" },
};

const fmtT = d => d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
const fmtD = s => new Date(s).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

/* ─── Shared micro-components ─── */
function AgentBadge({ k, sm }) {
  const a = AGENTS[k];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:a.bg, color:a.c, border:`1px solid ${a.b}50`, borderRadius:20, padding: sm ? "3px 10px" : "4px 14px", fontSize: sm ? 10 : 11, fontFamily:"var(--mono)", fontWeight:500, letterSpacing:"0.1em" }}>
      {a.icon} {a.label}
    </span>
  );
}

function TypingDots() {
  return (
    <span style={{ display:"inline-flex", gap:5, alignItems:"center", padding:"2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width:7, height:7, borderRadius:"50%", background:"var(--ink4)", display:"inline-block", animation:`dotPulse 1.3s ${i * 0.22}s ease infinite` }}/>
      ))}
    </span>
  );
}

function SevBadge({ n }) {
  const s = SEV(n);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:s.bg, color:s.c, padding:"4px 14px", borderRadius:20, fontSize:12, fontFamily:"var(--mono)", letterSpacing:"0.1em", fontWeight:500 }}>
      {s.l} · {n}/10
    </span>
  );
}

function InkDivider({ style }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0", ...style }}>
      <div style={{ flex:1, height:1, background:"rgba(22,15,6,0.14)" }}/>
      <svg width="22" height="14" viewBox="0 0 22 14">
        <circle cx="11" cy="7" r="3" fill="var(--rose)" opacity="0.55"/>
        <circle cx="2"  cy="7" r="1.5" fill="var(--ink4)" opacity="0.35"/>
        <circle cx="20" cy="7" r="1.5" fill="var(--ink4)" opacity="0.35"/>
      </svg>
      <div style={{ flex:1, height:1, background:"rgba(22,15,6,0.14)" }}/>
    </div>
  );
}

function FormField({ label, type = "text", value, onChange, placeholder, error, rows, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <label className="ink-label">{label}</label>}
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`field${error ? " err" : ""}`}/>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`field${error ? " err" : ""}`}/>
      }
      {error && <p style={{ marginTop:5, fontSize:12, color:"var(--roseB)", fontFamily:"var(--mono)", letterSpacing:"0.08em" }}>{error}</p>}
    </div>
  );
}

/* ─── Info banner ─── */
function Banner({ type = "info", children, style }) {
  const conf = {
    info:    { bg:"var(--navyPale)",   border:"var(--navy)50",  icon:"ℹ" },
    success: { bg:"var(--sagePale)",   border:"var(--sage)50",  icon:"✓" },
    warn:    { bg:"var(--amberPale)",  border:"var(--amber)50", icon:"⚠" },
    error:   { bg:"var(--rosePale)",   border:"var(--rose)50",  icon:"✗" },
  }[type];
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 16px", background:conf.bg, border:`1.5px solid ${conf.border}`, borderRadius:4, ...style }}>
      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{conf.icon}</span>
      <div style={{ fontFamily:"var(--body)", fontSize:14, lineHeight:1.65 }}>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TOP NAV
═══════════════════════════════════════════════════════════════════ */
function TopNav({ user, onLogout, onNav, page }) {
  const { dark, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const initials = (user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || user?.username?.slice(0, 2) || "?").toUpperCase();
  const navItems = [{ id: "input", l: "Consult" }, { id: "patients", l: "Patients" }, { id: "history", l: "History" }, { id: "eval", l: "MedQA" }];
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"var(--nav-bg)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)", height:56, borderBottom:"1px solid rgba(22,15,6,0.09)" }}>
      <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 28px", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {/* Logo */}
        <button onClick={() => onNav("input")} style={{ display:"flex", alignItems:"center", gap:11, background:"none", border:"none", cursor:"pointer" }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,var(--rose),var(--roseB))", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(184,56,48,0.38)", color:"var(--paper)" }}>
            <Caduceus size={22}/>
          </div>
          <div>
            <div style={{ fontFamily:"var(--serif)", fontSize:17, fontWeight:700, color:"var(--ink)", letterSpacing:-0.3, lineHeight:1.1 }}>MediChain</div>
            <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--ink5)", letterSpacing:"0.16em", lineHeight:1 }}>CLINICAL AI v4.0</div>
          </div>
        </button>
        {/* Links */}
        {user && (
          <div style={{ display:"flex", gap:2 }}>
            {navItems.map(({ id, l }) => (
              <button key={id} className={`nav-lnk${page === id ? " on" : ""}`} onClick={() => onNav(id)}>{l}</button>
            ))}
          </div>
        )}
        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <button onClick={toggle} className="btn-outline" style={{ padding:"5px 14px", fontSize:13 }}>{dark ? "☀ Light" : "◐ Dark"}</button>
          {user ? (
            <div style={{ position:"relative" }}>
              <button onClick={() => setMenu(v => !v)} style={{ display:"flex", alignItems:"center", gap:9, background:"var(--paper3)", border:"1.5px solid rgba(22,15,6,0.13)", borderRadius:28, padding:"5px 14px 5px 6px", cursor:"pointer", transition:"all 0.18s" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,var(--rose),var(--roseB))", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10, fontWeight:700, fontFamily:"var(--mono)" }}>{initials}</div>
                <span style={{ fontFamily:"var(--body)", fontSize:14, color:"var(--ink2)", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.full_name || user.username}</span>
                <span style={{ fontSize:9, color:"var(--ink4)" }}>{menu ? "▲" : "▼"}</span>
              </button>
              {menu && (
                <div className="card scale-in" style={{ position:"absolute", right:0, top:48, width:234, boxShadow:"var(--shadow-xl)", zIndex:200, overflow:"hidden" }}>
                  <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(22,15,6,0.08)", background:"var(--paper3)" }}>
                    <p style={{ fontFamily:"var(--serif)", fontSize:15, fontStyle:"italic", color:"var(--ink)" }}>{user.full_name || user.username}</p>
                    <p style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--ink5)", marginTop:2 }}>{user.email}</p>
                  </div>
                  {navItems.map(({ id, l }) => (
                    <button key={id} onClick={() => { onNav(id); setMenu(false); }}
                      style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none", borderBottom:"1px solid rgba(22,15,6,0.06)", padding:"11px 18px", color:"var(--ink2)", fontSize:14, fontFamily:"var(--body)", cursor:"pointer", transition:"background 0.14s" }}
                      onMouseEnter={e => e.target.style.background = "var(--paper3)"} onMouseLeave={e => e.target.style.background = "none"}>
                      {l}
                    </button>
                  ))}
                  <button onClick={() => { onLogout(); setMenu(false); }} style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none", padding:"11px 18px", color:"var(--rose)", fontSize:14, fontFamily:"var(--body)", cursor:"pointer" }}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => onNav("auth")} className="btn-rose" style={{ padding:"7px 22px", fontSize:14 }}>Sign in</button>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AUTH PAGE
═══════════════════════════════════════════════════════════════════ */
function AuthPage({ api, onLogin, onSkip }) {
  const [mode, setMode]     = useState("login");
  const [form, setForm]     = useState({ username:"", email:"", password:"", confirm:"", full_name:"" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [ok, setOk]         = useState("");
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    else if (form.username.length < 3) e.username = "Min 3 characters";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 6) e.password = "Min 6 characters";
    if (mode === "register") {
      if (!form.email.trim()) e.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
      if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    }
    setErrors(e); return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setApiErr(""); setLoading(true);
    try {
      const data = mode === "login"
        ? await api.loginJson({ username: form.username, password: form.password })
        : await api.register(form);
      setOk(mode === "login" ? "Welcome back." : "Account created.");
      setTimeout(() => onLogin(data.token || data.access_token, data.user), 700);
    } catch (e) { setApiErr(e.message || "An error occurred."); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 20px 48px", position:"relative", zIndex:1, overflow:"hidden" }}>
      <AmbientBlobs/>
      {/* Botanical decorations */}
      <IllustLeaf w={160} h={240} style={{ position:"fixed", top:"-3%", right:"2%", animation:"float1 8s ease-in-out infinite", pointerEvents:"none" }} color="var(--sage)" opacity={0.22}/>
      <IllustFlower size={130} style={{ position:"fixed", bottom:"6%", left:"2%", animation:"float2 10s ease-in-out infinite", pointerEvents:"none" }} color="var(--rose)" opacity={0.2}/>
      <IllustLeaf w={100} h={150} style={{ position:"fixed", top:"35%", left:"0%", animation:"float3 7s ease-in-out infinite", transform:"rotate(25deg)", pointerEvents:"none" }} color="var(--amber)" opacity={0.16}/>
      <ParticleField count={12} style={{ position:"fixed", inset:0 }}/>

      <div style={{ width:"100%", maxWidth:460, position:"relative", zIndex:1 }}>
        {/* Hero logo */}
        <div className="fade-up" style={{ textAlign:"center", marginBottom:36 }}>
          <div className="ink-bloom" style={{ display:"inline-flex", width:80, height:80, borderRadius:22, background:"linear-gradient(135deg,var(--paper2),var(--paper3))", border:"2px solid rgba(22,15,6,0.1)", alignItems:"center", justifyContent:"center", marginBottom:20, boxShadow:"var(--shadow-lg)", animation:"glowPulse 3s ease-in-out infinite", color:"var(--rose)" }}>
            <Caduceus size={48}/>
          </div>
          <h1 style={{ fontFamily:"var(--serif)", fontSize:42, fontWeight:400, fontStyle:"italic", color:"var(--ink)", letterSpacing:-0.5, lineHeight:1.05, marginBottom:6 }}>
            {mode === "login" ? "Welcome back" : "Join MediChain"}
          </h1>
          <p style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--ink5)", letterSpacing:"0.2em" }}>CLINICAL AI · THREE-AGENT SYSTEM</p>
          <ECGLine style={{ marginTop:14, opacity:0.55 }}/>
        </div>

        <div className="card fade-up s1" style={{ padding:"38px 42px", boxShadow:"var(--shadow-xl)" }}>
          <div className="shine"/>
          <div className="mode-pill" style={{ marginBottom:28, width:"100%" }}>
            {[{ id:"login", l:"Sign In" }, { id:"register", l:"Register" }].map(m => (
              <button key={m.id} className={`mode-opt${mode === m.id ? " on" : ""}`} onClick={() => { setMode(m.id); setErrors({}); setApiErr(""); setOk(""); }}>{m.l}</button>
            ))}
          </div>

          {ok    && <Banner type="success" style={{ marginBottom:16, animation:"slide-r 0.35s ease both" }}><span style={{ color:"var(--sage)" }}>{ok}</span></Banner>}
          {apiErr && <Banner type="error"   style={{ marginBottom:16, animation:"slide-r 0.35s ease both" }}><span style={{ color:"var(--rose)" }}>{apiErr}</span></Banner>}

          {mode === "register" && <FormField label="Full Name" value={form.full_name} onChange={f("full_name")} placeholder="Dr. Jane Smith"/>}
          <FormField label="Username" value={form.username} onChange={f("username")} placeholder="your_username" error={errors.username}/>
          {mode === "register" && <FormField label="Email Address" type="email" value={form.email} onChange={f("email")} placeholder="you@hospital.com" error={errors.email}/>}
          <FormField label="Password" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" error={errors.password}/>
          {mode === "register" && <FormField label="Confirm Password" type="password" value={form.confirm} onChange={f("confirm")} placeholder="••••••••" error={errors.confirm}/>}

          <button onClick={submit} disabled={loading || !!ok} className="btn-rose" style={{ width:"100%", padding:"14px", fontSize:16, marginTop:4 }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
          </button>

          <InkDivider style={{ margin:"20px 0 16px" }}/>
          <p style={{ textAlign:"center", fontFamily:"var(--body)", fontSize:14, color:"var(--ink3)" }}>
            {mode === "login" ? "New to MediChain? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); setApiErr(""); }}
              style={{ background:"none", border:"none", color:"var(--rose)", fontFamily:"var(--body)", fontSize:14, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}>
              {mode === "login" ? "Register here" : "Sign in"}
            </button>
          </p>
        </div>

        <div className="fade-up s3" style={{ textAlign:"center", marginTop:20 }}>
          <button onClick={onSkip} className="btn-outline" style={{ padding:"9px 28px", fontSize:14 }}>Continue as guest →</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INPUT PAGE
═══════════════════════════════════════════════════════════════════ */
function InputPage({ api, onSubmit, onEval, selectedPatient, onClearPatient }) {
  const [form, setForm] = useState({ description:"", bodyPart:"General", duration:"1–3 days", severity:5, notes: selectedPatient?.conditions || "" });
  useEffect(() => { if (selectedPatient) setForm(f => ({ ...f, notes: selectedPatient.conditions || "" })); }, [selectedPatient]);
  const bodyParts = ["General","Head / Face","Neck","Chest","Abdomen","Back","Arm / Shoulder","Leg / Hip","Skin","Multiple Areas"];
  const durations = ["< 24 hours","1–3 days","4–7 days","1–2 weeks","2–4 weeks","> 1 month","Chronic (> 3 months)"];
  const valid = form.description.trim().length > 15;
  const s = SEV(form.severity);

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", paddingTop:72, paddingBottom:56, position:"relative", zIndex:1, overflow:"hidden" }}>
      <AmbientBlobs/>
      <ParticleField count={14} style={{ position:"fixed", inset:0, opacity:0.7 }}/>
      {/* Botanicals */}
      <IllustLeaf w={200} h={300} style={{ position:"fixed", top:"-5%", right:"-2%", animation:"float1 9s ease-in-out infinite", pointerEvents:"none" }} color="var(--sage)" opacity={0.14}/>
      <IllustBranch w={230} h={150} style={{ position:"fixed", bottom:"8%", left:"-2%", animation:"float2 11s ease-in-out infinite", pointerEvents:"none" }} opacity={0.16}/>
      <IllustFlower size={110} style={{ position:"fixed", top:"30%", right:"1%", animation:"float3 8s ease-in-out infinite", pointerEvents:"none" }} color="var(--rose)" opacity={0.12}/>
      <IllustLeaf w={110} h={165} style={{ position:"fixed", bottom:"22%", right:"7%", animation:"float1 10s 3s ease-in-out infinite", transform:"rotate(-35deg)", pointerEvents:"none" }} color="var(--amber)" opacity={0.12}/>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 28px 0", position:"relative", zIndex:1 }}>
        {/* Hero header */}
        <div className="fade-up" style={{ marginBottom:40 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:24 }}>
            <div style={{ flex:1, minWidth:300 }}>
              <div className="eyebrow">Consultation Intake</div>
              <h1 style={{ fontFamily:"var(--serif)", fontSize:"clamp(48px,5.5vw,76px)", fontWeight:400, color:"var(--ink)", lineHeight:0.9, letterSpacing:-2, marginBottom:20 }}>
                Describe your<br/>
                <span className="grad-heading">symptoms</span>
              </h1>
              <p style={{ fontFamily:"var(--body)", fontSize:17, color:"var(--ink3)", maxWidth:520, lineHeight:1.75 }}>
                Three specialist AI agents — an Interviewer, a Diagnostician, and a Critic — collaborate to build a comprehensive clinical picture.
              </p>
              <div style={{ display:"flex", gap:12, marginTop:22, flexWrap:"wrap", alignItems:"center" }}>
                <div className="live-badge">
                  <div className="live-dot"/>
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--sage)", letterSpacing:"0.14em" }}>3 AGENTS ONLINE</span>
                </div>
                <button onClick={onEval} className="btn-outline" style={{ fontSize:13, padding:"7px 18px" }}>📊 MedQA Eval →</button>
              </div>
            </div>
            {/* Decorative wreath */}
            <div className="fade-up s2" style={{ flexShrink:0, animation:"drift 16s ease-in-out infinite" }}>
              <IllustWreath size={200} opacity={0.4}/>
            </div>
          </div>
          <div className="gold-rule" style={{ marginTop:28 }}/>
          <ECGLine style={{ opacity:0.38 }}/>
        </div>

        {/* Patient banner */}
        {selectedPatient && (
          <div className="slide-r" style={{ marginBottom:20, padding:"13px 20px", background:"var(--sagePale)", border:"1.5px solid rgba(46,104,56,0.4)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 2px 14px rgba(46,104,56,0.14)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:13 }}>
              <span style={{ fontSize:28, animation:"pulse 2s ease-in-out infinite" }}>{selectedPatient.gender === "Male" ? "👨" : selectedPatient.gender === "Female" ? "👩" : "🧑"}</span>
              <div>
                <p style={{ fontFamily:"var(--serif)", fontSize:16, fontStyle:"italic", color:"var(--ink)" }}>{selectedPatient.name}</p>
                <p style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--sage)", letterSpacing:"0.12em" }}>Profile linked</p>
              </div>
            </div>
            <button onClick={onClearPatient} className="btn-outline" style={{ padding:"5px 14px", fontSize:13 }}>Unlink</button>
          </div>
        )}

        {/* Two-column form */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:18 }}>
          {/* Left */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Main complaint */}
            <div className="card fade-up s1" style={{ padding:"26px 30px" }}>
              <div className="shine"/>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,var(--rosePale),var(--amberPale))", border:"1px solid var(--rose)30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🩺</div>
                <p style={{ fontFamily:"var(--serif)", fontSize:20, fontWeight:600, color:"var(--ink)" }}>Primary complaint</p>
              </div>
              <label className="ink-label">Describe your symptoms in detail</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your main symptom — when it started, where it is, what it feels like, what makes it better or worse…"
                rows={6} className="field"
                style={{ borderColor: valid ? "var(--sage)" : undefined, boxShadow: valid ? "0 0 0 3px var(--sageDim)" : undefined }}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:9, alignItems:"center" }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:10, color: valid ? "var(--sage)" : "var(--ink5)", transition:"color 0.3s" }}>
                  {valid ? "✓  Sufficient detail" : `${form.description.length} / 15 min characters`}
                </span>
                {valid && <span className="tag sage scale-in">Ready ✓</span>}
              </div>
            </div>

            {/* Parameters */}
            <div className="card fade-up s2" style={{ padding:"22px 30px" }}>
              <div className="shine"/>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,var(--amberPale),var(--goldPale))", border:"1px solid var(--amber)30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📋</div>
                <p style={{ fontFamily:"var(--serif)", fontSize:20, fontWeight:600, color:"var(--ink)" }}>Case parameters</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[{ label:"Body location", key:"bodyPart", opts:bodyParts }, { label:"Duration", key:"duration", opts:durations }].map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className="ink-label">{label}</label>
                    <select value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="field" style={{ background:"var(--paper)" }}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Severity */}
            <div className="card fade-up s2" style={{ padding:"22px 24px" }}>
              <div className="shine"/>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:s.bg, border:`1px solid ${s.c}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, transition:"background 0.3s" }}>⚡</div>
                <p style={{ fontFamily:"var(--serif)", fontSize:18, fontWeight:600, color:"var(--ink)" }}>Severity</p>
              </div>
              <div style={{ textAlign:"center", margin:"8px 0 16px", padding:"18px 12px", background:"var(--paper3)", borderRadius:4, border:"1px solid rgba(22,15,6,0.07)" }}>
                <span style={{ fontFamily:"var(--serif)", fontSize:72, fontWeight:400, color:s.c, lineHeight:1, display:"block", transition:"color 0.3s", animation: form.severity >= 8 ? "pulse 1.5s ease-in-out infinite" : "none" }}>{form.severity}</span>
                <span style={{ fontFamily:"var(--body)", fontSize:18, color:"var(--ink4)", fontStyle:"italic" }}>/10</span>
                <div style={{ marginTop:10 }}><SevBadge n={form.severity}/></div>
              </div>
              <input type="range" min={1} max={10} value={form.severity} onChange={e => setForm({ ...form, severity: Number(e.target.value) })}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                {["1","3","5","7","10"].map(n => <span key={n} style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--ink5)" }}>{n}</span>)}
              </div>
            </div>

            {/* History */}
            <div className="card fade-up s3" style={{ padding:"20px 24px" }}>
              <div className="shine"/>
              <p style={{ fontFamily:"var(--serif)", fontSize:18, fontWeight:600, color:"var(--ink)", marginBottom:12 }}>
                Medical history <em style={{ fontStyle:"italic", fontWeight:300, fontSize:13, color:"var(--ink4)" }}>(optional)</em>
              </p>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Known conditions, allergies, current medications…" rows={3} className="field" style={{ resize:"none" }}/>
            </div>

            {/* Notice */}
            <Banner type="warn" style={{ animation:"none" }}>
              <strong style={{ color:"var(--amber)" }}>Educational use only.</strong>
              <span style={{ color:"var(--ink3)" }}> This system does not replace professional medical consultation.</span>
            </Banner>

            <button onClick={() => valid && onSubmit({ ...form, patient_id: selectedPatient?.id || null })}
              disabled={!valid} className="btn-rose fade-up s4"
              style={{ width:"100%", padding:"15px", fontSize:16 }}>
              Begin consultation →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CHAT PAGE
═══════════════════════════════════════════════════════════════════ */
function ChatPage({ api, symptoms, onComplete, onBack }) {
  const [msgs, setMsgs]       = useState([]);
  const [logs, setLogs]       = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase]     = useState("interviewing");
  const [sid, setSid]         = useState(null);
  const [panel, setPanel]     = useState(true);
  const msgEnd = useRef(null); const logEnd = useRef(null);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [logs]);
  useEffect(() => { init(); }, []);

  function addLog(ag, text, time = new Date()) { setLogs(p => [...p, { id: Math.random().toString(36).slice(2), agent: ag, text, time }]); }

  async function init() {
    setLoading(true);
    try {
      const d = await api.start(symptoms); setSid(d.session_id);
      setMsgs([{ role:"ai", agent:"interviewer", text:d.reply, time:new Date() }]);
      addLog("interviewer", "Session opened. Structured history-taking active.");
    } catch(e) { addLog("interviewer", `Connection error: ${e.message}`); }
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading || phase !== "interviewing" || !sid) return;
    const txt = input.trim(); setInput("");
    setMsgs(p => [...p, { role:"user", text:txt, time:new Date() }]); setLoading(true);
    try {
      const d = await api.chat({ session_id: sid, user_message: txt });
      setMsgs(p => [...p, { role:"ai", agent:"interviewer", text:d.reply, time:new Date() }]);
      addLog("interviewer", d.trigger_diagnose ? "Sufficient history collected. Initiating multi-agent pipeline." : "Continuing structured intake.");
      if (d.trigger_diagnose) {
        setPhase("analyzing");
        addLog("diagnostician", "Querying ChromaDB vector store (PubMed corpus)…");
        await new Promise(r => setTimeout(r, 700));
        const dd = await api.diagnose({ session_id: sid });
        addLog("diagnostician", dd.diagnosis);
        if (dd.refs?.length > 0) addLog("diagnostician", `Retrieved ${dd.refs.length} supporting references.`);
        addLog("critic", "Initiating senior peer review…");
        await new Promise(r => setTimeout(r, 400));
        addLog("critic", dd.review);
        setPhase("done");
        const safeRefs = Array.isArray(dd.refs) ? dd.refs : Array.isArray(dd.references) ? dd.references : [];
        setTimeout(() => onComplete({ symptoms, date: new Date(), sessionId: sid, transcript: msgs.concat([{ role:"user", text:txt }]), diagnosis: dd.diagnosis || dd.result || JSON.stringify(dd), review: dd.review || dd.critique || "", refs: safeRefs }), 1500);
      }
    } catch(e) { addLog("interviewer", `Error: ${e.message}`); }
    setLoading(false);
  }

  const phaseConf = {
    interviewing: { label:"Taking history…", c:"var(--sage)",  bg:"var(--sagePale)"  },
    analyzing:    { label:"Analysing…",      c:"var(--amber)", bg:"var(--amberPale)" },
    done:         { label:"Complete ✓",      c:"var(--navy)",  bg:"var(--navyPale)"  },
  }[phase];

  return (
    <div style={{ height:"100vh", background:"var(--paper)", display:"flex", flexDirection:"column", overflow:"hidden", paddingTop:56, position:"relative", zIndex:1 }}>
      {/* Sub-header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", height:42, borderBottom:"1px solid rgba(22,15,6,0.09)", background:"var(--paper2)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} className="btn-outline" style={{ padding:"4px 13px", fontSize:13 }}>← Back</button>
          {sid && <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--ink5)", letterSpacing:"0.12em" }}>Session {sid.slice(0, 8).toUpperCase()}</span>}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontFamily:"var(--body)", fontSize:13, fontStyle:"italic", color:phaseConf.c, background:phaseConf.bg, padding:"3px 12px", borderRadius:20, border:`1px solid ${phaseConf.c}40` }}>{phaseConf.label}</span>
          <button onClick={() => setPanel(v => !v)} className="btn-outline" style={{ padding:"4px 13px", fontSize:13 }}>{panel ? "Hide" : "Show"} reasoning</button>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Chat column */}
        <div style={{ flex: panel ? "0 0 54%" : 1, display:"flex", flexDirection:"column", borderRight: panel ? "1px solid rgba(22,15,6,0.09)" : "none" }}>
          {/* Case bar */}
          <div style={{ padding:"9px 18px", borderBottom:"1px solid rgba(22,15,6,0.07)", background:"var(--sagePale)", flexShrink:0, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span className="tag sage" style={{ fontSize:9 }}>Active case</span>
            <span style={{ fontFamily:"var(--body)", fontSize:14, fontStyle:"italic", color:"var(--ink2)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{symptoms.description}</span>
            <SevBadge n={symptoms.severity}/>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"22px 22px" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:"flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap:10, marginBottom:16, alignItems:"flex-end" }}>
                {m.role !== "user" && (
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,var(--sagePale),var(--sageDim))", border:"1.5px solid var(--sage)40", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, boxShadow:"0 2px 8px rgba(46,104,56,0.15)" }}>🩺</div>
                )}
                <div style={{ maxWidth:"78%" }}>
                  {m.role !== "user" && <p style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--sage)", marginBottom:4, letterSpacing:"0.12em" }}>INTERVIEWER · {fmtT(m.time)}</p>}
                  <div className={m.role === "user" ? "bubble-user" : "bubble-ai"}>{m.text}</div>
                </div>
              </div>
            ))}
            {loading && phase === "interviewing" && (
              <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,var(--sagePale),var(--sageDim))", border:"1.5px solid var(--sage)40", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🩺</div>
                <div className="bubble-ai"><TypingDots/></div>
              </div>
            )}
            {phase === "analyzing" && (
              <div className="scale-in" style={{ margin:"20px 0", padding:"26px 24px", background:"var(--amberPale)", border:"1.5px solid var(--amber)40", borderRadius:6, textAlign:"center", position:"relative", overflow:"hidden", boxShadow:"0 4px 28px rgba(160,88,8,0.15)" }}>
                <ParticleField count={8} style={{ opacity:0.4 }}/>
                <IllustFlower size={60} style={{ position:"absolute", top:-10, right:-10, animation:"float3 4s infinite", pointerEvents:"none" }} color="var(--amber)" opacity={0.3}/>
                <div style={{ fontSize:38, marginBottom:10, animation:"pulse 1.5s ease-in-out infinite" }}>🔬</div>
                <p style={{ fontFamily:"var(--serif)", fontSize:19, fontStyle:"italic", color:"var(--amber)", marginBottom:4, position:"relative", zIndex:1 }}>Multi-agent analysis in progress…</p>
                <p style={{ fontFamily:"var(--body)", fontSize:13, color:"var(--ink4)", position:"relative", zIndex:1 }}>Querying literature · Generating diagnosis · Peer review</p>
                <ECGLine style={{ marginTop:14, opacity:0.5 }} color="var(--amber)"/>
              </div>
            )}
            {phase === "done" && (
              <div className="scale-in" style={{ margin:"18px 0", padding:"18px 22px", background:"var(--sagePale)", border:"1.5px solid var(--sage)40", borderRadius:6, textAlign:"center" }}>
                <p style={{ fontFamily:"var(--serif)", fontSize:19, fontStyle:"italic", color:"var(--sage)" }}>✓ Analysis complete — loading your report…</p>
              </div>
            )}
            <div ref={msgEnd}/>
          </div>

          {/* Input */}
          {phase === "interviewing" && (
            <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(22,15,6,0.09)", display:"flex", gap:10, background:"var(--paper2)", flexShrink:0 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type your response…" disabled={loading} className="field" style={{ flex:1, fontSize:15 }}/>
              <button onClick={send} disabled={!input.trim() || loading} className="btn-rose" style={{ padding:"0 22px", fontSize:14, flexShrink:0 }}>Send →</button>
            </div>
          )}
        </div>

        {/* Reasoning panel */}
        {panel && (
          <div style={{ flex:"0 0 46%", display:"flex", flexDirection:"column", background:"var(--paper2)", position:"relative", overflow:"hidden" }}>
            <IllustLeaf w={70} h={105} style={{ position:"absolute", bottom:-10, right:-5, opacity:0.1, pointerEvents:"none", animation:"float1 9s infinite" }} color="var(--sage)"/>
            <div style={{ padding:"11px 20px", borderBottom:"1px solid rgba(22,15,6,0.09)", flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontFamily:"var(--serif)", fontSize:15, fontStyle:"italic", color:"var(--ink2)" }}>Agent reasoning log</p>
              <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--ink5)" }}>{logs.length} entries</span>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"14px 20px" }}>
              {logs.length === 0 && <p style={{ fontFamily:"var(--body)", fontSize:14, fontStyle:"italic", color:"var(--ink5)", paddingTop:40, textAlign:"center" }}>Awaiting agent activity…</p>}
              {logs.map((log, i) => (
                <div key={log.id} className="slide-r" style={{ marginBottom:18, paddingBottom:14, borderBottom: i < logs.length - 1 ? "1px dashed rgba(22,15,6,0.09)" : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <AgentBadge k={log.agent} sm/>
                    <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--ink5)" }}>{fmtT(log.time)}</span>
                  </div>
                  <p style={{ fontFamily:"var(--body)", fontSize:13, color:"var(--ink3)", lineHeight:1.8, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{log.text}</p>
                </div>
              ))}
              <div ref={logEnd}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RESULTS PAGE
═══════════════════════════════════════════════════════════════════ */
function ResultsPage({ api, result, onNew, onHistory, onFlow }) {
  const [tab, setTab] = useState("diagnosis");
  const symptoms   = result.symptoms   || {};
  const refs       = Array.isArray(result.refs) ? result.refs : [];
  const diagnosis  = result.diagnosis  || "";
  const review     = result.review     || "";
  const transcript = Array.isArray(result.transcript) ? result.transcript : [];
  const tabs = [
    { id:"diagnosis",  l:"🔬 Diagnosis" },
    { id:"review",     l:"⚖️ Critic Review" },
    { id:"refs",       l:`📚 Literature (${refs.length})` },
    { id:"transcript", l:"💬 Transcript" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", paddingTop:72, paddingBottom:56, position:"relative", zIndex:1, overflow:"hidden" }}>
      <AmbientBlobs/>
      <IllustLeaf w={180} h={270} style={{ position:"fixed", top:"6%", right:"-1%", animation:"float1 9s ease-in-out infinite", pointerEvents:"none" }} color="var(--sage)" opacity={0.12}/>
      <IllustBranch w={210} h={140} style={{ position:"fixed", bottom:"4%", left:"-2%", animation:"float2 11s ease-in-out infinite", pointerEvents:"none" }} opacity={0.12}/>

      <div style={{ maxWidth:950, margin:"0 auto", padding:"28px 28px 0", position:"relative", zIndex:1 }}>
        <div className="fade-up">
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:18, marginBottom:26 }}>
            <div>
              <div className="eyebrow">Diagnostic Report · {(result.date ? new Date(result.date).toLocaleDateString("en-AU") : "")}</div>
              <h2 style={{ fontFamily:"var(--serif)", fontSize:"clamp(44px,5vw,68px)", fontWeight:400, color:"var(--ink)", letterSpacing:-1.2, lineHeight:0.9, marginBottom:16 }}>
                Diagnostic<br/><span className="grad-heading">Results</span>
              </h2>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span className="tag">{symptoms.bodyPart || "General"}</span>
                <span className="tag">{symptoms.duration || "—"}</span>
                <SevBadge n={symptoms.severity || 5}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" }}>
              {result.sessionId && <>
                <button onClick={() => window.open(api.exportUrl(result.sessionId, "pdf"), "_blank")} className="btn-rose" style={{ padding:"9px 20px", fontSize:14 }}>📄 PDF</button>
                <button onClick={() => window.open(api.exportUrl(result.sessionId, "json"), "_blank")} className="btn-outline" style={{ padding:"9px 16px", fontSize:14 }}>JSON</button>
              </>}
              <button onClick={onFlow}    className="btn-outline" style={{ padding:"9px 16px", fontSize:14 }}>Flow →</button>
              <button onClick={onHistory} className="btn-outline" style={{ padding:"9px 16px", fontSize:14 }}>History</button>
              <button onClick={onNew}     className="btn-ink"     style={{ padding:"9px 20px", fontSize:14 }}>+ New</button>
            </div>
          </div>
          <div className="gold-rule"/>
          <ECGLine style={{ opacity:0.35 }}/>
        </div>

        {/* Stats bar */}
        <div className="card fade-up s1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", marginBottom:22, overflow:"hidden" }}>
          {[
            { l:"Complaint", v:(symptoms.description || "").slice(0, 44) + "…" },
            { l:"Location",  v: symptoms.bodyPart || "—" },
            { l:"Duration",  v: symptoms.duration || "—" },
            { l:"Severity",  v:`${symptoms.severity || 0}/10`, c: SEV(symptoms.severity || 5).c },
          ].map(({ l, v, c }, i) => (
            <div key={l} style={{ padding:"14px 20px", borderRight: i < 3 ? "1px solid rgba(22,15,6,0.09)" : undefined }}>
              <p className="ink-label" style={{ marginBottom:4 }}>{l}</p>
              <p style={{ fontFamily:"var(--body)", fontSize:14, fontWeight:500, color: c || "var(--ink)", lineHeight:1.45 }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="fade-up s2">
          <div className="tab-row">{tabs.map(t => <button key={t.id} className={`tab-btn${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>{t.l}</button>)}</div>
          <div className="card" style={{ borderTopLeftRadius:0, borderTopRightRadius:0, borderTop:"none" }}>
            <div className="shine"/>
            <div style={{ padding:"30px 34px" }}>
              {(tab === "diagnosis" || tab === "review") && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22, paddingBottom:16, borderBottom:"1px dashed rgba(22,15,6,0.09)" }}>
                    <AgentBadge k={tab === "diagnosis" ? "diagnostician" : "critic"}/>
                    <span style={{ fontFamily:"var(--body)", fontSize:14, fontStyle:"italic", color:"var(--ink4)" }}>
                      {tab === "diagnosis" ? "RAG-grounded differential analysis" : "Clinical safety and evidence review"}
                    </span>
                  </div>
                  <p style={{ fontFamily:"var(--body)", fontSize:15.5, color:"var(--ink2)", lineHeight:1.9, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                    {tab === "diagnosis" ? diagnosis : review}
                  </p>
                </>
              )}
              {tab === "refs" && refs.map((r, i) => (
                <div key={i} className="lift" style={{ padding:"14px 18px", background:"var(--paper3)", borderRadius:4, marginBottom:10, border:"1px solid rgba(22,15,6,0.08)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:6 }}>
                    <div style={{ display:"flex", gap:10 }}>
                      <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--rose)", flexShrink:0, fontWeight:500 }}>[{String(i + 1).padStart(2, "0")}]</span>
                      <p style={{ fontFamily:"var(--serif)", fontSize:15, color:"var(--ink)", lineHeight:1.5 }}>{r.title}</p>
                    </div>
                    <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--ink5)", flexShrink:0 }}>{r.score}</span>
                  </div>
                  <p style={{ fontFamily:"var(--body)", fontSize:13, color:"var(--ink4)", marginBottom:6, paddingLeft:26, fontStyle:"italic" }}>{r.authors} · {r.year}</p>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontFamily:"var(--body)", fontSize:13, color:"var(--rose)", textDecoration:"none", paddingLeft:26, fontWeight:600 }}>View on PubMed →</a>
                </div>
              ))}
              {tab === "transcript" && transcript.map((m, i) => (
                <div key={i} style={{ marginBottom:22 }}>
                  <p className="ink-label" style={{ color: m.role === "user" ? "var(--rose)" : "var(--sage)" }}>{m.role === "user" ? "Patient" : "Interviewer"}</p>
                  <p style={{ fontFamily:"var(--body)", fontSize:15.5, color:"var(--ink2)", lineHeight:1.78 }}>{m.text}</p>
                  {i < transcript.length - 1 && <InkDivider/>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Banner type="warn" style={{ marginTop:14 }}>
          <strong style={{ color:"var(--amber)" }}>Educational use only.</strong>
          <span style={{ color:"var(--ink3)" }}> Not a substitute for professional medical advice.</span>
        </Banner>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FLOW PAGE
═══════════════════════════════════════════════════════════════════ */
function FlowPage({ result, onBack }) {
  const [active, setActive] = useState(null);
  const refs       = Array.isArray(result.refs) ? result.refs : [];
  const diagnosis  = result.diagnosis  || "";
  const review     = result.review     || "";
  const transcript = Array.isArray(result.transcript) ? result.transcript : [];
  const nodes = [
    { id:"input",    x:58,  y:22,  w:190, h:54,  icon:"📋", title:"Patient Input",    c:"var(--ink4)",  info: (result.symptoms?.description || "").slice(0, 90) },
    { id:"interview",x:58,  y:140, w:200, h:108, icon:"🩺", title:"Interviewer",      c:"var(--sage)",  info: `${transcript.length} exchanges\nSOCRATES framework\nStructured history-taking` },
    { id:"rag",      x:290, y:140, w:182, h:108, icon:"📚", title:"ChromaDB RAG",     c:"var(--navy)",  info: `${refs.length} docs retrieved\nall-MiniLM-L6-v2\nPubMed corpus` },
    { id:"diag",     x:172, y:308, w:196, h:100, icon:"🔬", title:"Diagnostician",    c:"var(--navy)",  info: diagnosis.slice(0, 200) + "…" },
    { id:"critic",   x:172, y:466, w:196, h:100, icon:"⚖️", title:"Critic Agent",     c:"var(--amber)", info: review.slice(0, 200) + "…" },
    { id:"report",   x:172, y:624, w:196, h:54,  icon:"✅", title:"Final Report",     c:"var(--sage)",  info: `PDF · JSON · Session ${result.sessionId?.slice(0, 8)}` },
  ];
  const an = nodes.find(n => n.id === active);

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", paddingTop:72, paddingBottom:56, position:"relative", zIndex:1 }}>
      <AmbientBlobs/>
      <IllustWreath size={220} style={{ position:"fixed", top:"8%", right:"0%", pointerEvents:"none", animation:"drift 16s infinite" }} opacity={0.11}/>
      <div style={{ maxWidth:990, margin:"0 auto", padding:"28px 28px 0", position:"relative", zIndex:1 }}>
        <div style={{ marginBottom:28 }}>
          <button onClick={onBack} className="btn-outline" style={{ fontSize:13, padding:"6px 16px", marginBottom:16 }}>← Back to results</button>
          <div className="eyebrow">PROJ-13 · Reasoning Pipeline</div>
          <h2 style={{ fontFamily:"var(--serif)", fontSize:52, fontWeight:400, fontStyle:"italic", color:"var(--ink)", letterSpacing:-0.8 }}>Reasoning Flow</h2>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"520px 1fr", gap:20 }}>
          <div className="card" style={{ height:755, position:"relative", overflow:"hidden" }}>
            <div className="shine"/>
            <div style={{ padding:"10px 18px", borderBottom:"1px solid rgba(22,15,6,0.09)", background:"var(--paper3)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ fontFamily:"var(--serif)", fontSize:13, fontStyle:"italic", color:"var(--ink3)" }}>Click any node to inspect</p>
              <ECGLine style={{ width:90, height:22, opacity:0.4 }}/>
            </div>
            <div style={{ position:"relative", height:"calc(100% - 38px)" }}>
              <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
                {[["152","74","152","138"],["152","246","275","306"],["380","246","275","306"],["275","406","275","464"],["275","564","275","622"]].map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--rose)" strokeWidth="1.3" strokeDasharray="4 5" opacity="0.35"/>
                ))}
              </svg>
              {nodes.map(n => (
                <div key={n.id} className={`flow-node${active === n.id ? " on" : ""}`}
                  onClick={() => setActive(active === n.id ? null : n.id)}
                  style={{ left:n.x, top:n.y, width:n.w, height:n.h }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                    <span style={{ fontSize:15 }}>{n.icon}</span>
                    <span style={{ fontFamily:"var(--serif)", fontSize:12.5, fontStyle:"italic", color:n.c, fontWeight:600 }}>{n.title}</span>
                  </div>
                  <p style={{ fontFamily:"var(--body)", fontSize:11, color:"var(--ink4)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.info.split("\n")[0]}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ flex:1 }}>
              <div className="shine"/>
              <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(22,15,6,0.09)", background:"var(--paper3)" }}>
                <p style={{ fontFamily:"var(--serif)", fontSize:14, fontStyle:"italic", color:"var(--ink3)" }}>{an ? an.title : "Node inspector"}</p>
              </div>
              <div style={{ padding:"16px 18px" }}>
                {an
                  ? <p style={{ fontFamily:"var(--body)", fontSize:13.5, color:"var(--ink3)", lineHeight:1.84, whiteSpace:"pre-wrap" }}>{an.info}</p>
                  : <div style={{ paddingTop:36, textAlign:"center" }}>
                      <IllustFlower size={64} opacity={0.28} color="var(--rose)" style={{ margin:"0 auto 14px" }}/>
                      <p style={{ fontFamily:"var(--body)", fontSize:14, fontStyle:"italic", color:"var(--ink5)" }}>Click a node to inspect</p>
                    </div>
                }
              </div>
            </div>
            <div className="card" style={{ padding:"18px 20px" }}>
              <div className="shine"/>
              <p style={{ fontFamily:"var(--serif)", fontSize:15, fontStyle:"italic", color:"var(--ink2)", marginBottom:14 }}>Pipeline metrics</p>
              {[
                { l:"Interview turns",      v: transcript.length, c:"var(--sage)"  },
                { l:"Literature retrieved", v: refs.length,       c:"var(--navy)"  },
                { l:"Active agents",        v: "3 / 3",                  c:"var(--ink2)"  },
                { l:"Safety status",        v: review.includes("CRITICAL") ? "⚠ Critical" : "✓ Clear", c: review.includes("CRITICAL") ? "var(--rose)" : "var(--sage)" },
              ].map(({ l, v, c }) => (
                <div key={l} className="data-row">
                  <span style={{ fontFamily:"var(--body)", fontSize:13, fontStyle:"italic", color:"var(--ink4)" }}>{l}</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:12, color:c, fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HISTORY PAGE
═══════════════════════════════════════════════════════════════════ */
function HistoryPage({ api, onNew }) {
  const [sessions, setSessions] = useState([]); const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null); const [detail, setDetail] = useState(null);
  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); try { setSessions(await api.sessions()); } catch {} setLoading(false); }
  async function loadDetail(id) { if (sel === id) { setSel(null); setDetail(null); return; } setSel(id); try { setDetail(await api.session(id)); } catch {} }

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", paddingTop:72, paddingBottom:56, position:"relative", zIndex:1, overflow:"hidden" }}>
      <AmbientBlobs/>
      <IllustLeaf w={150} h={225} style={{ position:"fixed", top:"12%", right:"0%", animation:"float1 9s ease-in-out infinite", pointerEvents:"none" }} color="var(--amber)" opacity={0.13}/>
      <div style={{ maxWidth:910, margin:"0 auto", padding:"28px 28px 0", position:"relative", zIndex:1 }}>
        <div className="fade-up" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:18 }}>
          <div>
            <div className="eyebrow">Consultation Records</div>
            <h2 style={{ fontFamily:"var(--serif)", fontSize:56, fontWeight:400, color:"var(--ink)", letterSpacing:-1.2, lineHeight:0.9 }}>
              Session<br/><span className="grad-heading">History</span>
            </h2>
            <p style={{ fontFamily:"var(--body)", fontSize:15, color:"var(--ink4)", marginTop:10 }}>
              {loading ? "Loading…" : `${sessions.length} consultations on record`}
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={load}  className="btn-outline" style={{ padding:"9px 20px", fontSize:14 }}>↻ Refresh</button>
            <button onClick={onNew} className="btn-rose"    style={{ padding:"9px 24px", fontSize:14 }}>+ New consult</button>
          </div>
        </div>
        <div className="gold-rule"/>
        <ECGLine style={{ opacity:0.32, marginBottom:22 }}/>

        {loading
          ? <div style={{ textAlign:"center", padding:80, fontFamily:"var(--body)", fontStyle:"italic", color:"var(--ink4)", fontSize:17 }}>Loading records…</div>
          : sessions.length === 0
            ? (
              <div style={{ textAlign:"center", padding:"80px 40px", border:"1.5px dashed rgba(22,15,6,0.18)", borderRadius:6 }}>
                <IllustFlower size={90} opacity={0.28} color="var(--rose)" style={{ margin:"0 auto 18px" }}/>
                <p style={{ fontFamily:"var(--serif)", fontSize:26, fontStyle:"italic", color:"var(--ink3)", marginBottom:8 }}>No records yet</p>
                <p style={{ fontFamily:"var(--body)", fontSize:16, color:"var(--ink4)" }}>Start a consultation to build your history.</p>
              </div>
            )
            : (
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {sessions.map((s, i) => (
                  <div key={s.id} className="fade-up" style={{ animationDelay:`${i * 0.04}s` }}>
                    <div onClick={() => loadDetail(s.id)} className="card lift"
                      style={{ padding:"16px 24px", cursor:"pointer", borderColor: sel === s.id ? "var(--rose)" : undefined, borderRadius: sel === s.id ? "6px 6px 0 0" : 6, transition:"all 0.25s" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontFamily:"var(--serif)", fontSize:16, fontStyle:"italic", color:"var(--ink)", marginBottom:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.description}</p>
                          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--ink5)" }}>{fmtD(s.created_at)}</span>
                            <span style={{ fontFamily:"var(--mono)", fontSize:9, color: s.status === "done" ? "var(--sage)" : "var(--amber)", letterSpacing:"0.1em" }}>● {s.status}</span>
                          </div>
                        </div>
                        <span style={{ fontSize:20, color:"var(--ink5)", marginLeft:16, transition:"transform 0.25s", display:"inline-block", transform: sel === s.id ? "rotate(180deg)" : "none" }}>↓</span>
                      </div>
                    </div>
                    {sel === s.id && detail && (
                      <div className="scale-in" style={{ background:"var(--paper3)", border:"1.5px solid var(--rose)40", borderTop:"none", borderRadius:"0 0 6px 6px", padding:"18px 24px" }}>
                        {detail.status === "done" && (
                          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                            <button onClick={() => window.open(api.exportUrl(s.id, "pdf"), "_blank")} className="btn-rose" style={{ padding:"6px 16px", fontSize:13 }}>📄 PDF</button>
                            <button onClick={() => window.open(api.exportUrl(s.id, "json"), "_blank")} className="btn-outline" style={{ padding:"6px 12px", fontSize:13 }}>JSON</button>
                          </div>
                        )}
                        <p style={{ fontFamily:"var(--body)", fontSize:14, color:"var(--ink3)", lineHeight:1.84 }}>
                          {detail.diagnosis?.slice(0, 450)}{detail.diagnosis?.length > 450 ? "\n…" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PATIENTS PAGE
═══════════════════════════════════════════════════════════════════ */
function PatientsPage({ api, onStartConsult }) {
  const [patients, setPatients] = useState([]); const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false); const [editP, setEditP] = useState(null);
  const blank = { name:"", dob:"", gender:"", blood_type:"", allergies:"", medications:"", conditions:"", notes:"" };
  const [form, setForm] = useState(blank); const [saving, setSaving] = useState(false);
  const [selP, setSelP] = useState(null); const [pSess, setPSess] = useState([]);
  const ff = k => v => setForm(p => ({ ...p, [k]: v }));
  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); try { setPatients(await api.patients()); } catch {} setLoading(false); }
  async function save() { setSaving(true); try { if (editP) await api.updatePatient(editP.id, form); else await api.createPatient(form); await load(); setShowForm(false); setEditP(null); setForm(blank); } catch(e) { alert(e.message); } setSaving(false); }
  async function del(id) { if (!confirm("Delete this patient profile?")) return; await api.deletePatient(id); load(); }
  async function pick(p) { if (selP?.id === p.id) { setSelP(null); setPSess([]); return; } setSelP(p); try { setPSess(await api.patientSessions(p.id)); } catch {} }
  function startEdit(p) { setEditP(p); setForm({ name:p.name, dob:p.dob||"", gender:p.gender||"", blood_type:p.blood_type||"", allergies:p.allergies||"", medications:p.medications||"", conditions:p.conditions||"", notes:p.notes||"" }); setShowForm(true); }

  const genderEmoji = g => g === "Male" ? "👨" : g === "Female" ? "👩" : "🧑";
  const bgColors = ["linear-gradient(135deg,var(--rosePale),var(--amberPale))", "linear-gradient(135deg,var(--sagePale),var(--navyPale))", "linear-gradient(135deg,var(--amberPale),var(--goldPale))", "linear-gradient(135deg,var(--navyPale),var(--plumPale))"];

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", paddingTop:72, paddingBottom:56, position:"relative", zIndex:1, overflow:"hidden" }}>
      <AmbientBlobs/>
      <IllustBranch w={190} h={124} style={{ position:"fixed", bottom:"6%", right:"-1%", animation:"float3 10s ease-in-out infinite", pointerEvents:"none", transform:"scaleX(-1)" }} opacity={0.13}/>
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"28px 28px 0", position:"relative", zIndex:1 }}>
        <div className="fade-up" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:18 }}>
          <div>
            <div className="eyebrow">Patient Registry</div>
            <h2 style={{ fontFamily:"var(--serif)", fontSize:56, fontWeight:400, color:"var(--ink)", letterSpacing:-1.2, lineHeight:0.9 }}>
              Patient<br/><span className="grad-heading">Profiles</span>
            </h2>
            <p style={{ fontFamily:"var(--body)", fontSize:15, color:"var(--ink4)", marginTop:10 }}>{patients.length} profiles in registry</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditP(null); setForm(blank); }} className="btn-rose" style={{ padding:"12px 26px", fontSize:15 }}>+ New profile</button>
        </div>
        <div className="gold-rule" style={{ marginBottom:24 }}/>

        {/* Modal */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, background:"rgba(22,15,6,0.62)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24, backdropFilter:"blur(6px)" }}
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div className="card scale-in" style={{ width:"100%", maxWidth:530, maxHeight:"90vh", overflowY:"auto", boxShadow:"var(--shadow-xl)", padding:"34px 38px" }}>
              <div className="shine"/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <div>
                  <p style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--ink5)", letterSpacing:"0.16em", marginBottom:5 }}>{editP ? "EDIT PROFILE" : "NEW PROFILE"}</p>
                  <h3 style={{ fontFamily:"var(--serif)", fontSize:24, fontWeight:400, fontStyle:"italic", color:"var(--ink)" }}>{editP ? "Update information" : "Create patient profile"}</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="btn-outline" style={{ width:34, height:34, padding:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, borderRadius:"50%", flexShrink:0 }}>×</button>
              </div>
              <InkDivider style={{ margin:"0 0 18px" }}/>
              <FormField label="Full Name *" value={form.name} onChange={ff("name")} placeholder="Patient full name"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ marginBottom:16 }}>
                  <label className="ink-label">Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => ff("dob")(e.target.value)} className="field"/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label className="ink-label">Gender</label>
                  <select value={form.gender} onChange={e => ff("gender")(e.target.value)} className="field" style={{ background:"var(--paper)" }}>
                    <option value="">—</option>
                    {["Male","Female","Other"].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <FormField label="Blood Type" value={form.blood_type} onChange={ff("blood_type")} placeholder="A+, B-, O+, AB+…"/>
              <FormField label="Known Allergies" value={form.allergies} onChange={ff("allergies")} placeholder="Penicillin, latex, NSAIDs…"/>
              <FormField label="Current Medications" value={form.medications} onChange={ff("medications")} placeholder="Metformin 500mg bd…"/>
              <FormField label="Chronic Conditions" value={form.conditions} onChange={ff("conditions")} placeholder="Type 2 Diabetes, Hypertension…"/>
              <FormField label="Clinical Notes" value={form.notes} onChange={ff("notes")} placeholder="Additional clinical notes…"/>
              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                <button onClick={() => setShowForm(false)} className="btn-outline" style={{ flex:1, padding:"12px" }}>Cancel</button>
                <button onClick={save} disabled={!form.name.trim() || saving} className="btn-rose" style={{ flex:2, padding:"12px", fontSize:15 }}>
                  {saving ? "Saving…" : editP ? "Save changes" : "Create profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading
          ? <div style={{ textAlign:"center", padding:80, fontFamily:"var(--body)", fontStyle:"italic", color:"var(--ink4)", fontSize:17 }}>Loading registry…</div>
          : patients.length === 0
            ? <div style={{ textAlign:"center", padding:"80px 40px", border:"1.5px dashed rgba(22,15,6,0.18)", borderRadius:6 }}>
                <IllustFlower size={90} opacity={0.28} color="var(--rose)" style={{ margin:"0 auto 18px" }}/>
                <p style={{ fontFamily:"var(--serif)", fontSize:24, fontStyle:"italic", color:"var(--ink3)" }}>No profiles yet</p>
              </div>
            : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(294px,1fr))", gap:13 }}>
                {patients.map((p, i) => (
                  <div key={p.id} className="card fade-up" style={{ animationDelay:`${i * 0.05}s`, overflow:"hidden", borderColor: selP?.id === p.id ? "var(--rose)" : undefined }}>
                    <div className="shine"/>
                    {/* Coloured header */}
                    <div style={{ height:8, background: bgColors[i % bgColors.length] }}/>
                    <div onClick={() => pick(p)} style={{ padding:"18px 20px", cursor:"pointer" }}>
                      <div style={{ display:"flex", gap:13, marginBottom:12 }}>
                        <div style={{ width:50, height:50, borderRadius:14, background: bgColors[i % bgColors.length], border:"1px solid rgba(22,15,6,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0, boxShadow:"var(--shadow-sm)", animation: selP?.id === p.id ? "pulse 2s ease-in-out infinite" : "none" }}>
                          {genderEmoji(p.gender)}
                        </div>
                        <div>
                          <p style={{ fontFamily:"var(--serif)", fontSize:17, fontStyle:"italic", color:"var(--ink)", fontWeight:400 }}>{p.name}</p>
                          <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap" }}>
                            {p.gender     && <span className="tag"      style={{ fontSize:9, padding:"2px 8px" }}>{p.gender}</span>}
                            {p.blood_type && <span className="tag rose" style={{ fontSize:9, padding:"2px 8px" }}>{p.blood_type}</span>}
                            {p.dob        && <span className="tag"      style={{ fontSize:9, padding:"2px 8px" }}>{new Date(p.dob).getFullYear()}</span>}
                          </div>
                        </div>
                      </div>
                      {p.conditions && <p style={{ fontFamily:"var(--body)", fontSize:12.5, color:"var(--ink4)", fontStyle:"italic", lineHeight:1.5 }}>{p.conditions.slice(0, 72)}{p.conditions.length > 72 ? "…" : ""}</p>}
                    </div>
                    <div style={{ borderTop:"1px solid rgba(22,15,6,0.08)", padding:"9px 16px", display:"flex", gap:7 }}>
                      <button onClick={() => onStartConsult(p)} className="btn-rose" style={{ flex:1, padding:"7px", fontSize:13 }}>+ Consult</button>
                      <button onClick={() => startEdit(p)} className="btn-outline" style={{ padding:"7px 13px", fontSize:13 }}>Edit</button>
                      <button onClick={() => del(p.id)} style={{ padding:"7px 13px", fontSize:13, border:"1.5px solid var(--rose)45", color:"var(--rose)", background:"var(--roseDim)", borderRadius:4, cursor:"pointer", fontFamily:"var(--body)", transition:"all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="var(--rosePale)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="var(--roseDim)"; }}>Del</button>
                    </div>
                    {selP?.id === p.id && pSess.length > 0 && (
                      <div className="scale-in" style={{ borderTop:"1px solid rgba(22,15,6,0.08)", padding:"12px 18px", background:"var(--paper3)" }}>
                        <p className="ink-label" style={{ marginBottom:8 }}>Past sessions ({pSess.length})</p>
                        {pSess.slice(0, 3).map(s => (
                          <div key={s.id} style={{ marginBottom:8 }}>
                            <p style={{ fontFamily:"var(--body)", fontSize:12.5, color:"var(--ink3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontStyle:"italic" }}>{s.description}</p>
                            <p style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--ink5)" }}>{fmtD(s.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EVAL PAGE
═══════════════════════════════════════════════════════════════════ */
function EvalPage({ api }) {
  const [questions, setQuestions] = useState([]);
  const [history, setHistory] = useState({ records:[], stats:{ total:0, single_accuracy:0, multi_accuracy:0, improvement:0 } });
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});
  const [selQ, setSelQ] = useState(null);
  useEffect(() => { loadData(); }, []);
  async function loadData() {
    try {
      const [qs, hist] = await Promise.all([api.questions(), api.evalHist()]);
      setQuestions(qs.questions || []); setHistory(hist);
      const rm = {};
      for (const r of hist.records || []) { if (!rm[r.question_id]) rm[r.question_id] = { single: { answer:r.single_answer, reasoning:r.single_reasoning }, multi: { answer:r.multi_answer, reasoning:r.multi_reasoning }, single_correct:!!r.single_correct, multi_correct:!!r.multi_correct }; }
      setResults(rm);
    } catch {}
  }
  async function runQ(qid) { setRunning(qid); try { const d = await api.evalRun({ question_id:qid, mode:"both" }); setResults(p => ({ ...p, [qid]: d })); await loadData(); } catch(e) { alert(e.message); } setRunning(null); }
  async function runAll() { for (const q of questions) { await runQ(q.id); await new Promise(r => setTimeout(r, 500)); } }
  const st = history.stats;
  const catClass = { "Cardiology":"rose", "Neurology":"navy", "Endocrinology":"amber", "Pulmonology":"sage" };

  return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", paddingTop:72, paddingBottom:56, position:"relative", zIndex:1, overflow:"hidden" }}>
      <AmbientBlobs/>
      <IllustFlower size={150} style={{ position:"fixed", top:"4%", left:"0%", animation:"float3 9s ease-in-out infinite", pointerEvents:"none" }} color="var(--navy)" opacity={0.1}/>
      <ParticleField count={10} style={{ position:"fixed", inset:0, opacity:0.5 }}/>
      <div style={{ maxWidth:1060, margin:"0 auto", padding:"28px 28px 0", position:"relative", zIndex:1 }}>
        <div className="fade-up" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:18 }}>
          <div>
            <div className="eyebrow">PROJ-14 · USMLE Accuracy Benchmark</div>
            <h2 style={{ fontFamily:"var(--serif)", fontSize:56, fontWeight:400, color:"var(--ink)", letterSpacing:-1.2, lineHeight:0.9 }}>
              MedQA<br/><span className="grad-heading">Evaluation</span>
            </h2>
            <p style={{ fontFamily:"var(--body)", fontSize:16, color:"var(--ink3)", marginTop:10 }}>Multi-agent vs single-LLM on clinical reasoning tasks</p>
          </div>
          <button onClick={runAll} disabled={!!running} className="btn-rose" style={{ padding:"12px 28px", fontSize:15 }}>
            {running ? "Running…" : "▶ Run all questions"}
          </button>
        </div>
        <div className="gold-rule"/>
        <ECGLine style={{ opacity:0.32, marginBottom:22 }}/>

        {/* Stats cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
          {[
            { l:"Total Runs",    v: st.total,           c:"var(--ink2)",  bar:"var(--ink4)",  pct: null },
            { l:"Single LLM",   v: st.single_accuracy, c:"var(--navy)",  bar:"var(--navyB)", pct: st.total > 0 ? st.single_accuracy : null },
            { l:"Multi-Agent",  v: st.multi_accuracy,  c:"var(--rose)",  bar:"var(--roseB)", pct: st.total > 0 ? st.multi_accuracy : null },
            { l:"Improvement",  v: (st.improvement >= 0 ? "+" : "") + st.improvement, c: st.improvement >= 0 ? "var(--sage)" : "var(--rose)", bar: st.improvement >= 0 ? "var(--sageB)" : "var(--roseB)", pct: null },
          ].map(({ l, v, c, bar, pct }, i) => (
            <div key={l} className="stat-card fade-up" style={{ animationDelay:`${i * 0.08}s` }}>
              <div className="accent-bar" style={{ background:`linear-gradient(90deg,${bar},transparent)` }}/>
              <p className="ink-label" style={{ marginBottom:6, marginTop:2 }}>{l}</p>
              <p style={{ fontFamily:"var(--serif)", fontSize:44, fontWeight:400, color:c, lineHeight:1, marginBottom: pct !== null ? 10 : 0 }}>{v}{pct !== null ? "%" : ""}</p>
              {pct !== null && (
                <div className="prog-track"><div className="prog-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${c},${bar})` }}/></div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {questions.map((q, qi) => {
            const r = results[q.id]; const isR = running === q.id;
            return (
              <div key={q.id} className="card fade-up" style={{ animationDelay:`${qi * 0.05}s`, overflow:"hidden", borderColor: selQ === q.id ? "var(--rose)" : undefined }}>
                <div className="shine"/>
                <div onClick={() => setSelQ(selQ === q.id ? null : q.id)} style={{ padding:"16px 24px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
                      <span className={`tag ${catClass[q.category] || ""}`} style={{ fontSize:9 }}>{q.category}</span>
                      {r && <>
                        <span style={{ fontFamily:"var(--mono)", fontSize:10, color: r.single_correct ? "var(--sage)" : "var(--rose)" }}>Single: {r.single?.answer} {r.single_correct ? "✓" : "✗"}</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:10, color: r.multi_correct  ? "var(--sage)" : "var(--rose)" }}>Multi: {r.multi?.answer} {r.multi_correct ? "✓" : "✗"}</span>
                      </>}
                    </div>
                    <p style={{ fontFamily:"var(--body)", fontSize:15, color:"var(--ink)", lineHeight:1.66 }}>{q.question}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); runQ(q.id); }} disabled={isR || !!running}
                    className={r ? "btn-outline" : "btn-rose"}
                    style={{ padding:"8px 18px", fontSize:13, flexShrink:0, whiteSpace:"nowrap" }}>
                    {isR ? "Running…" : r ? "↻ Re-run" : "▶ Run"}
                  </button>
                </div>
                {selQ === q.id && (
                  <div className="scale-in" style={{ padding:"0 24px 20px", borderTop:"1px dashed rgba(22,15,6,0.09)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:14, marginBottom: r ? 14 : 0 }}>
                      {Object.entries(q.options).map(([k, v]) => (
                        <div key={k} style={{ display:"flex", gap:8, padding:"11px 15px", borderRadius:4, background: k === q.correct ? "var(--sagePale)" : "var(--paper3)", border:`1.5px solid ${k === q.correct ? "rgba(46,104,56,0.4)" : "rgba(22,15,6,0.09)"}`, alignItems:"flex-start", transition:"all 0.15s" }}>
                          <span style={{ fontFamily:"var(--mono)", fontSize:10, fontWeight:600, color: k === q.correct ? "var(--sage)" : "var(--ink5)", flexShrink:0 }}>{k}.</span>
                          <span style={{ fontFamily:"var(--body)", fontSize:13.5, color: k === q.correct ? "var(--ink)" : "var(--ink3)", flex:1, lineHeight:1.56 }}>{v}</span>
                          <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                            {r?.single?.answer === k && <span style={{ fontSize:8, background:"var(--navyPale)", color:"var(--navy)", padding:"1px 5px", borderRadius:3, fontFamily:"var(--mono)" }}>S</span>}
                            {r?.multi?.answer  === k && <span style={{ fontSize:8, background:"var(--rosePale)", color:"var(--rose)", padding:"1px 5px", borderRadius:3, fontFamily:"var(--mono)" }}>M</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {r && (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        {[{ l:"Single LLM", c:"var(--navy)", bg:"var(--navyPale)", d:r.single, ok:r.single_correct }, { l:"Multi-agent", c:"var(--rose)", bg:"var(--rosePale)", d:r.multi, ok:r.multi_correct }].map(({ l, c, bg, d, ok }) => (
                          <div key={l} style={{ background:bg, border:`1.5px solid ${c}30`, borderRadius:4, padding:"14px 16px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                              <span style={{ fontFamily:"var(--body)", fontSize:13, fontStyle:"italic", color:c }}>{l}</span>
                              <span style={{ fontFamily:"var(--mono)", fontSize:11, color: ok ? "var(--sage)" : "var(--rose)", fontWeight:600 }}>{d?.answer} {ok ? "✓" : "✗"}</span>
                            </div>
                            <p style={{ fontFamily:"var(--body)", fontSize:12.5, color:"var(--ink3)", lineHeight:1.78 }}>{d?.reasoning?.slice(0, 165)}{d?.reasoning?.length > 165 ? "…" : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════ */
function AppInner() {
  const auth = useAuth();
  const [page, setPage]     = useState("input");
  const [symptoms, setSymp] = useState(null);
  const [result, setResult] = useState(null);
  const [selPat, setSelPat] = useState(null);
  const api = makeApi(auth.token);

  if (!auth.ready) return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1 }}>
      <AmbientBlobs/>
      <IllustWreath size={280} style={{ position:"absolute", opacity:0.14, animation:"drift 14s infinite" }}/>
      <div style={{ textAlign:"center", position:"relative", zIndex:1 }}>
        <div className="ink-bloom" style={{ display:"inline-flex", width:80, height:80, borderRadius:22, background:"linear-gradient(135deg,var(--paper2),var(--paper3))", border:"2px solid rgba(22,15,6,0.1)", alignItems:"center", justifyContent:"center", marginBottom:22, boxShadow:"var(--shadow-lg)", animation:"glowPulse 2.5s infinite", color:"var(--rose)" }}>
          <Caduceus size={48}/>
        </div>
        <p style={{ fontFamily:"var(--serif)", fontSize:24, fontStyle:"italic", color:"var(--ink3)" }}>Loading MediChain…</p>
        <ECGLine style={{ marginTop:16, opacity:0.45, maxWidth:240, margin:"16px auto 0" }}/>
      </div>
    </div>
  );

  const goNew = () => { setSymp(null); setResult(null); setPage("input"); };
  return (
    <>
      <TopNav user={auth.user} onLogout={() => { auth.logout(); setPage("input"); }} onNav={setPage} page={page}/>
      {page === "auth"     && <AuthPage api={api} onLogin={(t, u) => { auth.login(t, u); setPage("input"); }} onSkip={() => setPage("input")}/>}
      {page === "input"    && <InputPage api={api} onSubmit={f => { setSymp(f); setPage("chat"); }} onEval={() => setPage("eval")} selectedPatient={selPat} onClearPatient={() => setSelPat(null)}/>}
      {page === "patients" && (auth.user ? <PatientsPage api={api} onStartConsult={p => { setSelPat(p); setPage("input"); }}/> : <AuthPage api={api} onLogin={(t, u) => { auth.login(t, u); setPage("patients"); }} onSkip={() => setPage("input")}/>)}
      {page === "chat"     && symptoms && <ChatPage api={api} symptoms={symptoms} onBack={() => setPage("input")} onComplete={r => { setResult(r); setPage("result"); }}/>}
      {page === "result"   && result   && <ResultsPage api={api} result={result} onNew={goNew} onHistory={() => setPage("history")} onFlow={() => setPage("flow")}/>}
      {page === "flow"     && result   && <FlowPage result={result} onBack={() => setPage("result")}/>}
      {page === "history"  && <HistoryPage api={api} onNew={goNew}/>}
      {page === "eval"     && <EvalPage api={api}/>}
    </>
  );
}

export default function MediChainApp() {
  return <ThemeProvider><AppInner/></ThemeProvider>;
}
