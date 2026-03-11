import { useState, useEffect, useRef, createContext, useContext } from "react";

const BACKEND = "http://localhost:8000";

/* ═══════════════════════════════════════════════════════════
   GLOBAL STYLES injected once
═══════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&family=JetBrains+Mono:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --bg:         #f6f2ec;
  --bg2:        #edeae2;
  --bg3:        #e4e0d6;
  --card:       rgba(255,255,255,0.78);
  --card2:      rgba(255,255,255,0.55);
  --glass:      rgba(255,255,255,0.35);
  --border:     rgba(0,0,0,0.07);
  --border2:    rgba(0,0,0,0.12);
  --text:       #1a1410;
  --text2:      #3d3530;
  --text3:      #7a7068;
  --text4:      #b0a898;
  --teal:       #00b894;
  --teal2:      #00cfaa;
  --tealDim:    rgba(0,184,148,0.12);
  --tealGlow:   rgba(0,184,148,0.25);
  --violet:     #6c63ff;
  --violetDim:  rgba(108,99,255,0.1);
  --amber:      #f59f00;
  --amberDim:   rgba(245,159,0,0.1);
  --rose:       #ff4d6d;
  --roseDim:    rgba(255,77,109,0.1);
  --green:      #20bf6b;
  --greenDim:   rgba(32,191,107,0.1);
  --shadow:     0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06);
  --shadow2:    0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
  --nav:        rgba(246,242,236,0.92);
  --radius:     16px;
  --serif:      'Fraunces', Georgia, serif;
  --mono:       'JetBrains Mono', monospace;
  --sans:       'DM Sans', sans-serif;
}

[data-theme="dark"] {
  --bg:         #0d1117;
  --bg2:        #131920;
  --bg3:        #1a2332;
  --card:       rgba(255,255,255,0.04);
  --card2:      rgba(255,255,255,0.025);
  --glass:      rgba(255,255,255,0.06);
  --border:     rgba(255,255,255,0.06);
  --border2:    rgba(255,255,255,0.1);
  --text:       #e8e0d4;
  --text2:      #b8b0a4;
  --text3:      #7a7268;
  --text4:      #4a4440;
  --teal:       #00cfaa;
  --teal2:      #00e8bf;
  --tealDim:    rgba(0,207,170,0.1);
  --tealGlow:   rgba(0,207,170,0.2);
  --violet:     #a394ff;
  --violetDim:  rgba(163,148,255,0.1);
  --amber:      #fbbf24;
  --amberDim:   rgba(251,191,36,0.1);
  --rose:       #ff6b84;
  --roseDim:    rgba(255,107,132,0.1);
  --green:      #34d399;
  --greenDim:   rgba(52,211,153,0.1);
  --shadow:     0 4px 24px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3);
  --shadow2:    0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4);
  --nav:        rgba(13,17,23,0.94);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { background: var(--bg); }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s, color 0.3s;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }

input, select, textarea, button { font-family: var(--sans); }

/* ── Animations ── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pulse-dot {
  0%,100% { opacity: 0.4; transform: scale(0.8); }
  50%     { opacity: 1;   transform: scale(1); }
}
@keyframes scan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(400%); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 20px var(--tealGlow); }
  50%     { box-shadow: 0 0 40px var(--tealGlow), 0 0 80px var(--tealDim); }
}
@keyframes bounce-dot {
  0%,100% { transform: translateY(0); opacity: 0.5; }
  50%     { transform: translateY(-5px); opacity: 1; }
}

.animate-fadeUp  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
.animate-fadeIn  { animation: fadeIn 0.4s ease both; }
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.1s; }
.stagger-3 { animation-delay: 0.15s; }
.stagger-4 { animation-delay: 0.2s; }
.stagger-5 { animation-delay: 0.25s; }

/* ── Glass Card ── */
.glass-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* ── Noise texture overlay ── */
.noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.4;
}

/* ── Button ── */
.btn-primary {
  background: linear-gradient(135deg, var(--teal), var(--teal2));
  color: #0d1117;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-family: var(--sans);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
  position: relative;
  overflow: hidden;
}
.btn-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}
.btn-primary:hover::after { opacity: 1; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px var(--tealGlow); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

.btn-ghost {
  background: var(--card);
  color: var(--text2);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: var(--sans);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ghost:hover { background: var(--glass); border-color: var(--border2); color: var(--text); }

/* ── Input ── */
.field {
  width: 100%;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--text);
  font-family: var(--sans);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.field:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--tealDim); }
.field::placeholder { color: var(--text4); }
.field.error { border-color: var(--rose); box-shadow: 0 0 0 3px var(--roseDim); }

/* ── Mono label ── */
.mono-label {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text3);
  display: block;
  margin-bottom: 8px;
}

/* ── Agent scan line ── */
.scanning-bar {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--teal), transparent);
  animation: scan 2s linear infinite;
  pointer-events: none;
}

/* ── Tabs ── */
.tab-group {
  display: flex;
  gap: 2px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 3px;
}
.tab-item {
  border: none;
  border-radius: 9px;
  padding: 8px 16px;
  font-size: 13px;
  font-family: var(--sans);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text3);
  background: transparent;
  white-space: nowrap;
}
.tab-item.active {
  background: var(--card);
  color: var(--text);
  box-shadow: var(--shadow);
}
.tab-item:hover:not(.active) { color: var(--text2); background: var(--glass); }

/* ── Severity track ── */
input[type=range] {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg3);
  outline: none;
  cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--teal);
  border: 3px solid var(--bg);
  box-shadow: 0 0 0 2px var(--tealGlow), 0 2px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: transform 0.15s;
}
input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }

/* ── Chat bubbles ── */
.bubble-ai {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px 18px 18px 18px;
}
.bubble-user {
  background: linear-gradient(135deg, var(--teal), var(--teal2));
  color: #0d1117;
  border-radius: 18px 4px 18px 18px;
  font-weight: 500;
}

/* ── Status badge ── */
.status-dot::before {
  content: '';
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 6px;
  animation: pulse-dot 1.8s ease infinite;
}

/* ── Page transitions ── */
.page-enter { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }

/* ── Nav link ── */
.nav-link {
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text3);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--sans);
  transition: all 0.15s;
}
.nav-link:hover { color: var(--text); background: var(--glass); }
.nav-link.active { color: var(--teal); background: var(--tealDim); font-weight: 600; }

/* ── Card hover ── */
.card-hover {
  transition: transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow2);
}

/* ── Progress bar ── */
.progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--bg3);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
}
`;

/* ═══════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════ */
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("mc_theme") !== "light");

  useEffect(() => {
    // Inject global CSS once
    const id = "mc-global-css";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark(v => {
    localStorage.setItem("mc_theme", v ? "light" : "dark");
    return !v;
  });

  return <ThemeCtx.Provider value={{ dark, toggle }}>{children}</ThemeCtx.Provider>;
}

/* ═══════════════════════════════════════════════════════════
   AUTH + API
═══════════════════════════════════════════════════════════ */
function useAuth() {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("mc_token") || "");
  const [ready, setReady] = useState(false);
  useEffect(() => { token ? fetchMe() : setReady(true); }, []);
  async function fetchMe() {
    try {
      const r = await fetch(BACKEND + "/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setUser(await r.json()); else logout();
    } catch { logout(); }
    setReady(true);
  }
  const login  = (t, u) => { setToken(t); setUser(u); localStorage.setItem("mc_token", t); };
  const logout = ()     => { setToken(""); setUser(null); localStorage.removeItem("mc_token"); };
  return { user, token, ready, login, logout };
}

function makeApi(token) {
  const h = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const get  = async p => { const r = await fetch(BACKEND + p, { headers: h }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  const post = async (p, b) => { const r = await fetch(BACKEND + p, { method: "POST", headers: h, body: JSON.stringify(b) }); if (!r.ok) { const e = await r.json().catch(() => ({ detail: r.status })); throw new Error(e.detail || r.status); } return r.json(); };
  const put  = async (p, b) => { const r = await fetch(BACKEND + p, { method: "PUT",  headers: h, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  const del  = async p => { const r = await fetch(BACKEND + p, { method: "DELETE", headers: h }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  return {
    register:        b       => post("/api/auth/register", b),
    loginJson:       b       => post("/api/auth/login/json", b),
    patients:        ()      => get("/api/patients"),
    createPatient:   b       => post("/api/patients", b),
    updatePatient:   (id, b) => put(`/api/patients/${id}`, b),
    deletePatient:   id      => del(`/api/patients/${id}`),
    patientSessions: id      => get(`/api/patients/${id}/sessions`),
    start:     s  => post("/api/session/start", s),
    chat:      b  => post("/api/session/chat", b),
    diagnose:  b  => post("/api/session/diagnose", b),
    sessions:  () => get("/api/sessions"),
    session:   id => get(`/api/session/${id}`),
    questions: () => get("/api/eval/questions"),
    evalRun:   b  => post("/api/eval/run", b),
    evalHist:  () => get("/api/eval/history"),
    exportUrl: (id, t) => `${BACKEND}/api/session/${id}/export/${t}`,
  };
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const sev = n => n <= 3 ? { label: "Mild",         color: "var(--green)",  dim: "var(--greenDim)"  }
                : n <= 5 ? { label: "Moderate",     color: "var(--amber)",  dim: "var(--amberDim)"  }
                : n <= 7 ? { label: "Significant",  color: "#fb923c",       dim: "rgba(251,146,60,0.1)" }
                : n <= 9 ? { label: "Severe",        color: "var(--rose)",   dim: "var(--roseDim)"   }
                :          { label: "Critical",      color: "#dc2626",       dim: "rgba(220,38,38,0.1)"  };

const fmtTime = d => d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
const fmtDate = s => new Date(s).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

const AGENTS = {
  interviewer:   { icon: "🩺", label: "Interviewer",   color: "var(--teal)",   dim: "var(--tealDim)",   border: "rgba(0,207,170,0.2)"  },
  diagnostician: { icon: "🔬", label: "Diagnostician", color: "var(--violet)", dim: "var(--violetDim)", border: "rgba(108,99,255,0.2)" },
  critic:        { icon: "⚖️", label: "Critic",        color: "var(--amber)",  dim: "var(--amberDim)",  border: "rgba(245,159,0,0.2)"  },
};

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════════════ */
function AgentBadge({ k, sm }) {
  const a = AGENTS[k];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: a.dim, color: a.color, border: `1px solid ${a.border}`, borderRadius: 20, padding: sm ? "2px 10px" : "4px 12px", fontSize: sm ? 11 : 12, fontFamily: "var(--mono)", fontWeight: 500 }}>
      {a.icon} {a.label}
    </span>
  );
}

function TypingDots({ color = "var(--teal)" }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: `bounce-dot 1.2s ${i * 0.18}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

function Divider({ style }) {
  return <div style={{ height: 1, background: "var(--border)", ...style }} />;
}

function FieldLabel({ children }) {
  return <label className="mono-label">{children}</label>;
}

function FormField({ label, type = "text", value, onChange, placeholder, error, multiline, rows = 4, style }) {
  const [focused, setFocused] = useState(false);
  const cls = `field${error ? " error" : ""}`;
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className={cls} style={{ resize: "vertical" }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className={cls} />
      }
      {error && <p style={{ marginTop: 5, fontSize: 11, color: "var(--rose)", fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: 4 }}>⚠ {error}</p>}
    </div>
  );
}

function StatusPill({ phase }) {
  const map = {
    interviewing: { color: "var(--teal)",   bg: "var(--tealDim)",   label: "History Taking" },
    analyzing:    { color: "var(--violet)", bg: "var(--violetDim)", label: "Analyzing"      },
    done:         { color: "var(--green)",  bg: "var(--greenDim)",  label: "Complete"       },
  };
  const s = map[phase] || map.interviewing;
  return (
    <span className="status-dot" style={{ display: "inline-flex", alignItems: "center", background: s.bg, color: s.color, border: `1px solid ${s.color}30`, borderRadius: 20, padding: "4px 14px", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 500 }}>
      {s.label}
    </span>
  );
}

function ExportButtons({ url, sm }) {
  const p = sm ? "6px 12px" : "9px 18px";
  const fs = sm ? 12 : 13;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => window.open(url("pdf"), "_blank")} className="btn-primary" style={{ padding: p, fontSize: fs }}>📄 PDF Report</button>
      <button onClick={() => window.open(url("json"), "_blank")} className="btn-ghost" style={{ padding: p, fontSize: fs }}>{"{ }"} JSON</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════════════ */
function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} className="btn-ghost" style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
      <span style={{ fontSize: 15 }}>{dark ? "☀️" : "🌙"}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)" }}>{dark ? "LIGHT" : "DARK"}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOP NAV
═══════════════════════════════════════════════════════════ */
function TopNav({ user, onLogout, onNav, page }) {
  const [menu, setMenu] = useState(false);
  const initials = (user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || user?.username?.slice(0, 2) || "?").toUpperCase();
  const navItems = [
    { id: "input",    icon: "⚕",  label: "Consult"  },
    { id: "patients", icon: "👤", label: "Patients" },
    { id: "history",  icon: "📋", label: "History"  },
    { id: "eval",     icon: "📊", label: "MedQA"    },
  ];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "var(--nav)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", height: 56 }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <button onClick={() => onNav("input")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: "linear-gradient(135deg, var(--teal), var(--teal2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚕️</div>
            <span style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--text)", letterSpacing: -0.4 }}>MediChain</span>
          </button>
          {user && (
            <div style={{ display: "flex", gap: 2 }}>
              {navItems.map(({ id, label }) => (
                <button key={id} className={`nav-link${page === id ? " active" : ""}`} onClick={() => onNav(id)}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle />
          {user ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenu(v => !v)}
                className="btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 12px" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, var(--teal), var(--violet))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{initials}</div>
                <span style={{ fontSize: 13, color: "var(--text2)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name || user.username}</span>
                <span style={{ fontSize: 9, color: "var(--text3)" }}>{menu ? "▲" : "▼"}</span>
              </button>
              {menu && (
                <div className="glass-card" style={{ position: "absolute", right: 0, top: 46, width: 220, boxShadow: "var(--shadow2)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{user.full_name || user.username}</p>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{user.email}</p>
                    <span style={{ display: "inline-block", marginTop: 8, background: "var(--tealDim)", color: "var(--teal)", border: "1px solid var(--tealGlow)", borderRadius: 8, padding: "2px 8px", fontSize: 9, fontFamily: "var(--mono)" }}>● SESSION ACTIVE</span>
                  </div>
                  {navItems.map(({ id, icon, label }) => (
                    <button key={id} onClick={() => { onNav(id); setMenu(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 16px", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}>
                      {icon} {label}
                    </button>
                  ))}
                  <Divider />
                  <button onClick={() => { onLogout(); setMenu(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 16px", color: "var(--rose)", fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => onNav("auth")} className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>
              Sign In →
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH PAGE
═══════════════════════════════════════════════════════════ */
function AuthPage({ api, onLogin, onSkip }) {
  const [mode, setMode]       = useState("login");
  const [form, setForm]       = useState({ username: "", email: "", password: "", confirm: "", full_name: "" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr]   = useState("");
  const [ok, setOk]           = useState("");
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
      if (form.confirm !== form.password) e.confirm = "Passwords don't match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setApiErr(""); setLoading(true);
    try {
      const data = mode === "login"
        ? await api.loginJson({ username: form.username, password: form.password })
        : await api.register(form);
      setOk(mode === "login" ? "Welcome back!" : "Account created!");
      setTimeout(() => onLogin(data.token || data.access_token, data.user), 700);
    } catch (e) { setApiErr(e.message || "Something went wrong"); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 40px" }}>
      {/* Background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, var(--tealDim) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "8%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, var(--violetDim) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }} className="animate-fadeUp">
          <div style={{ width: 68, height: 68, borderRadius: 22, background: "linear-gradient(135deg, var(--teal), var(--teal2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 18px", boxShadow: "0 12px 40px var(--tealGlow), 0 4px 16px rgba(0,0,0,0.15)" }}>⚕️</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 400, color: "var(--text)", marginBottom: 6, letterSpacing: -0.8 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em" }}>MEDICHAIN · AI DIAGNOSTICS</p>
        </div>

        <div className="glass-card animate-fadeUp stagger-1" style={{ padding: "36px 40px", boxShadow: "var(--shadow2)" }}>
          {/* Mode switcher */}
          <div className="tab-group" style={{ marginBottom: 28 }}>
            {[{ id: "login", label: "Sign In" }, { id: "register", label: "Register" }].map(m => (
              <button key={m.id} className={`tab-item${mode === m.id ? " active" : ""}`} onClick={() => { setMode(m.id); setErrors({}); setApiErr(""); setOk(""); }}>
                {m.label}
              </button>
            ))}
          </div>

          {ok && (
            <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center", background: "var(--greenDim)", border: "1px solid rgba(32,191,107,0.25)", borderRadius: 12, padding: "12px 16px" }}>
              <span>✅</span><span style={{ color: "var(--green)", fontSize: 13 }}>{ok}</span>
            </div>
          )}
          {apiErr && (
            <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center", background: "var(--roseDim)", border: "1px solid rgba(255,77,109,0.25)", borderRadius: 12, padding: "12px 16px" }}>
              <span>⚠️</span><span style={{ color: "var(--rose)", fontSize: 13 }}>{apiErr}</span>
            </div>
          )}

          {mode === "register" && <FormField label="Full Name" value={form.full_name} onChange={f("full_name")} placeholder="Dr. Jane Smith" />}
          <FormField label="Username" value={form.username} onChange={f("username")} placeholder="your_username" error={errors.username} />
          {mode === "register" && <FormField label="Email" type="email" value={form.email} onChange={f("email")} placeholder="you@hospital.com" error={errors.email} />}
          <FormField label="Password" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" error={errors.password} />
          {mode === "register" && <FormField label="Confirm Password" type="password" value={form.confirm} onChange={f("confirm")} placeholder="••••••••" error={errors.confirm} />}

          <button onClick={submit} disabled={loading || !!ok} className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 4 }}>
            {loading ? "⏳ Loading…" : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

          <p style={{ textAlign: "center", marginTop: 18, color: "var(--text3)", fontSize: 13 }}>
            {mode === "login" ? "New to MediChain? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); setApiErr(""); }}
              style={{ background: "none", border: "none", color: "var(--teal)", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "var(--sans)" }}>
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }} className="animate-fadeUp stagger-2">
          <button onClick={onSkip} className="btn-ghost" style={{ padding: "9px 24px", fontSize: 13 }}>
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PATIENTS PAGE
═══════════════════════════════════════════════════════════ */
function PatientsPage({ api, onStartConsult }) {
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editP, setEditP]         = useState(null);
  const [blank]                   = useState({ name: "", dob: "", gender: "", blood_type: "", allergies: "", medications: "", conditions: "", notes: "" });
  const [form, setForm]           = useState(blank);
  const [saving, setSaving]       = useState(false);
  const [selP, setSelP]           = useState(null);
  const [pSess, setPSess]         = useState([]);
  const ff = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); try { setPatients(await api.patients()); } catch { } setLoading(false); }
  async function save() {
    setSaving(true);
    try {
      if (editP) await api.updatePatient(editP.id, form);
      else await api.createPatient(form);
      await load(); setShowForm(false); setEditP(null); setForm(blank);
    } catch (e) { alert(e.message); }
    setSaving(false);
  }
  async function del(id) { if (!confirm("Delete this patient profile?")) return; await api.deletePatient(id); load(); }
  async function pick(p) {
    if (selP?.id === p.id) { setSelP(null); setPSess([]); return; }
    setSelP(p); try { setPSess(await api.patientSessions(p.id)); } catch { }
  }
  function startEdit(p) { setEditP(p); setForm({ name: p.name, dob: p.dob || "", gender: p.gender || "", blood_type: p.blood_type || "", allergies: p.allergies || "", medications: p.medications || "", conditions: p.conditions || "", notes: p.notes || "" }); setShowForm(true); }

  const bloodColors = { "A+": "#f87171", "A-": "#fca5a5", "B+": "#fb923c", "B-": "#fdba74", "O+": "#34d399", "O-": "#6ee7b7", "AB+": "#a78bfa", "AB-": "#c4b5fd" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 72, paddingBottom: 48 }} className="page-enter">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="mono-label" style={{ marginBottom: 6 }}>PATIENT MANAGEMENT</p>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: "var(--text)", letterSpacing: -0.8 }}>Patient Profiles</h2>
            <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>{patients.length} profiles registered</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditP(null); setForm(blank); }} className="btn-primary" style={{ padding: "11px 22px", fontSize: 14 }}>
            + New Profile
          </button>
        </div>

        {/* Modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div className="glass-card" style={{ width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow2)", padding: "32px 36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <p className="mono-label" style={{ marginBottom: 2 }}>{editP ? "EDIT PROFILE" : "NEW PROFILE"}</p>
                  <h3 style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--text)", fontWeight: 400 }}>
                    {editP ? "Update patient information" : "Create patient profile"}
                  </h3>
                </div>
                <button onClick={() => setShowForm(false)} className="btn-ghost" style={{ width: 34, height: 34, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
              <Divider style={{ marginBottom: 24 }} />
              <FormField label="Full Name *" value={form.name} onChange={ff("name")} placeholder="Patient full name" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel>Date of Birth</FieldLabel>
                  <input type="date" value={form.dob} onChange={e => ff("dob")(e.target.value)} className="field" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel>Gender</FieldLabel>
                  <select value={form.gender} onChange={e => ff("gender")(e.target.value)} className="field" style={{ background: "var(--bg2)", cursor: "pointer" }}>
                    <option value="">Select</option>
                    {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <FormField label="Blood Type" value={form.blood_type} onChange={ff("blood_type")} placeholder="A+, B-, O+, AB+…" />
              <FormField label="Known Allergies" value={form.allergies} onChange={ff("allergies")} placeholder="Penicillin, shellfish, latex…" />
              <FormField label="Current Medications" value={form.medications} onChange={ff("medications")} placeholder="Metformin 500mg, Aspirin 100mg…" />
              <FormField label="Chronic Conditions" value={form.conditions} onChange={ff("conditions")} placeholder="Type 2 Diabetes, Hypertension…" />
              <FormField label="Clinical Notes" value={form.notes} onChange={ff("notes")} placeholder="Additional clinical notes…" />
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} className="btn-ghost" style={{ flex: 1, padding: "12px" }}>Cancel</button>
                <button onClick={save} disabled={!form.name.trim() || saving} className="btn-primary" style={{ flex: 2, padding: "12px", fontSize: 14 }}>
                  {saving ? "Saving…" : editP ? "Save Changes" : "Create Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 12 }}>Loading patients…</div>
        ) : patients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--card)", border: "1px dashed var(--border2)", borderRadius: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
            <p style={{ color: "var(--text2)", fontFamily: "var(--serif)", fontSize: 18, marginBottom: 6 }}>No patient profiles yet</p>
            <p style={{ color: "var(--text3)", fontSize: 13 }}>Create a profile to track consultations per patient</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {patients.map((p, i) => (
              <div key={p.id} className={`glass-card card-hover animate-fadeUp`} style={{ animationDelay: `${i * 0.04}s`, overflow: "hidden", border: selP?.id === p.id ? "1px solid var(--teal)" : "1px solid var(--border)" }}>
                <div onClick={() => pick(p)} style={{ padding: "18px 20px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, var(--tealDim), var(--violetDim))", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {p.gender === "Male" ? "👨" : p.gender === "Female" ? "👩" : "🧑"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{p.name}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.gender && <span style={{ color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)" }}>{p.gender}</span>}
                        {p.blood_type && (
                          <span style={{ background: bloodColors[p.blood_type] ? `${bloodColors[p.blood_type]}20` : "var(--roseDim)", color: bloodColors[p.blood_type] || "var(--rose)", border: `1px solid ${bloodColors[p.blood_type] || "var(--rose)"}40`, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 500 }}>
                            {p.blood_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {p.conditions && (
                    <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 3 }}>
                      <span style={{ color: "var(--text4)", fontFamily: "var(--mono)", fontSize: 10 }}>CONDITIONS </span>{p.conditions.slice(0, 60)}{p.conditions.length > 60 ? "…" : ""}
                    </p>
                  )}
                  {p.allergies && (
                    <p style={{ fontSize: 12, color: "var(--text3)" }}>
                      <span style={{ color: "var(--text4)", fontFamily: "var(--mono)", fontSize: 10 }}>ALLERGIES </span>{p.allergies.slice(0, 50)}
                    </p>
                  )}
                </div>
                <Divider />
                <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
                  <button onClick={() => onStartConsult(p)} className="btn-primary" style={{ flex: 1, padding: "8px", fontSize: 12 }}>+ Consult</button>
                  <button onClick={() => startEdit(p)} className="btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }}>✏️</button>
                  <button onClick={() => del(p.id)} className="btn-ghost" style={{ padding: "8px 12px", fontSize: 12, color: "var(--rose)", borderColor: "var(--roseDim)" }}>🗑️</button>
                </div>
                {selP?.id === p.id && (
                  <div style={{ padding: "12px 16px", background: "var(--bg2)", borderTop: "1px solid var(--border)" }}>
                    <p className="mono-label" style={{ marginBottom: 8 }}>PAST SESSIONS ({pSess.length})</p>
                    {pSess.length === 0
                      ? <p style={{ color: "var(--text4)", fontFamily: "var(--mono)", fontSize: 11 }}>No sessions yet</p>
                      : pSess.slice(0, 3).map(s => (
                        <div key={s.id} style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</p>
                          <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)" }}>{fmtDate(s.created_at)}</p>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INPUT PAGE
═══════════════════════════════════════════════════════════ */
function InputPage({ api, onSubmit, onEval, selectedPatient, onClearPatient }) {
  const [form, setForm] = useState({ description: "", bodyPart: "General", duration: "1–3 days", severity: 5, notes: selectedPatient?.conditions || "" });
  useEffect(() => { if (selectedPatient) setForm(f => ({ ...f, notes: selectedPatient.conditions || "" })); }, [selectedPatient]);

  const bodyParts = ["General", "Head / Face", "Neck", "Chest", "Abdomen", "Back", "Arm / Shoulder", "Leg / Hip", "Skin", "Multiple Areas"];
  const durations = ["< 24 hours", "1–3 days", "4–7 days", "1–2 weeks", "2–4 weeks", "> 1 month", "Chronic (> 3 months)"];
  const valid = form.description.trim().length > 15;
  const severity = sev(form.severity);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px 48px", position: "relative", overflow: "hidden" }}>
      {/* Ambient BG */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "5%", right: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, var(--tealDim) 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, var(--violetDim) 0%, transparent 65%)", filter: "blur(60px)" }} />
      </div>

      <div style={{ maxWidth: 640, width: "100%", position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 40 }} className="animate-fadeUp">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--tealDim)", border: "1px solid var(--tealGlow)", borderRadius: 40, padding: "6px 18px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", animation: "pulse-dot 1.8s infinite" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--teal)", letterSpacing: "0.15em" }}>3 AI AGENTS READY</span>
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(38px,6vw,58px)", fontWeight: 300, color: "var(--text)", letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 12 }}>
            Describe your{" "}
            <em style={{ fontStyle: "italic", background: "linear-gradient(90deg, var(--teal), var(--teal2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>symptoms</em>
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 15, lineHeight: 1.6 }}>
            An Interviewer, Diagnostician & Critic will collaborate to analyze your case
          </p>
        </div>

        {/* Patient banner */}
        {selectedPatient && (
          <div className="animate-fadeUp stagger-1" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--tealDim)", border: "1px solid var(--tealGlow)", borderRadius: 14, padding: "12px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{selectedPatient.gender === "Male" ? "👨" : selectedPatient.gender === "Female" ? "👩" : "🧑"}</span>
              <div>
                <p style={{ fontWeight: 600, color: "var(--teal)", fontSize: 13 }}>{selectedPatient.name}</p>
                <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>Patient profile linked</p>
              </div>
            </div>
            <button onClick={onClearPatient} className="btn-ghost" style={{ width: 30, height: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Form */}
        <div className="glass-card animate-fadeUp stagger-2" style={{ padding: "32px 36px", boxShadow: "var(--shadow2)" }}>
          {/* Main symptom */}
          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Primary Complaint *</FieldLabel>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your symptoms in detail — onset, nature, what makes it better or worse…"
              rows={4} className={`field${valid ? "" : ""}`}
              style={{ resize: "vertical", borderColor: valid ? "var(--teal)" : undefined, boxShadow: valid ? "0 0 0 3px var(--tealDim)" : undefined }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: valid ? "var(--green)" : "var(--text4)" }}>{valid ? "✓ Ready" : `${form.description.length} / 15 min`}</span>
            </div>
          </div>

          {/* Body + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[{ label: "Body Area", key: "bodyPart", opts: bodyParts }, { label: "Duration", key: "duration", opts: durations }].map(({ label, key, opts }) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <select value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="field" style={{ background: "var(--bg2)", cursor: "pointer" }}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Severity */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <FieldLabel style={{ margin: 0 }}>Severity</FieldLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: severity.dim, color: severity.color, border: `1px solid ${severity.color}40`, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 500 }}>
                  {severity.label}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600, color: severity.color }}>{form.severity}/10</span>
              </div>
            </div>
            <input type="range" min={1} max={10} value={form.severity} onChange={e => setForm({ ...form, severity: Number(e.target.value) })}
              style={{ accentColor: severity.color }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {["1", "3", "5", "7", "10"].map(n => <span key={n} style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--text4)" }}>{n}</span>)}
            </div>
          </div>

          {/* Medical history */}
          <FormField label="Medical History (Optional)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Known conditions, allergies, current medications…" />

          {/* Disclaimer */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22, padding: "12px 14px", background: "var(--amberDim)", border: "1px solid rgba(245,159,0,0.2)", borderRadius: 12 }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.6 }}>
              <strong>Educational use only.</strong> This tool is not a substitute for professional medical consultation. Always consult a qualified physician for medical concerns.
            </p>
          </div>

          <button onClick={() => valid && onSubmit({ ...form, patient_id: selectedPatient?.id || null })} disabled={!valid} className="btn-primary" style={{ width: "100%", padding: "15px", fontSize: 15, marginBottom: 10 }}>
            Begin AI Consultation →
          </button>
          <button onClick={onEval} className="btn-ghost" style={{ width: "100%", padding: "11px", fontSize: 13, color: "var(--violet)", borderColor: "var(--violetDim)" }}>
            📊 MedQA Evaluation Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHAT PAGE
═══════════════════════════════════════════════════════════ */
function ChatPage({ api, symptoms, onComplete, onBack }) {
  const [msgs, setMsgs]         = useState([]);
  const [logs, setLogs]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [phase, setPhase]       = useState("interviewing");
  const [sessionId, setSessionId] = useState(null);
  const [showPanel, setShowPanel] = useState(true);
  const msgEnd = useRef(null); const logEnd = useRef(null);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { init(); }, []);

  function addLog(ag, text, time = new Date()) {
    setLogs(p => [...p, { id: Math.random().toString(36).slice(2), agent: ag, text, time }]);
  }
  async function init() {
    setLoading(true);
    try {
      const d = await api.start(symptoms);
      setSessionId(d.session_id);
      setMsgs([{ role: "ai", agent: "interviewer", text: d.reply, time: new Date() }]);
      addLog("interviewer", "Session initialized. Beginning SOCRATES-based history taking.");
    } catch (e) { addLog("interviewer", `⚠️ Connection error: ${e.message}`); }
    setLoading(false);
  }
  async function send() {
    if (!input.trim() || loading || phase !== "interviewing" || !sessionId) return;
    const txt = input.trim(); setInput("");
    setMsgs(p => [...p, { role: "user", text: txt, time: new Date() }]);
    setLoading(true);
    try {
      const d = await api.chat({ session_id: sessionId, user_message: txt });
      setMsgs(p => [...p, { role: "ai", agent: "interviewer", text: d.reply, time: new Date() }]);
      addLog("interviewer", `Recorded. ${d.trigger_diagnose ? "Sufficient data — triggering diagnosis pipeline." : "Gathering more information."}`);
      if (d.trigger_diagnose) {
        setPhase("analyzing");
        addLog("diagnostician", "📥 Retrieving relevant literature from ChromaDB (PubMed corpus)…");
        await new Promise(r => setTimeout(r, 600));
        const dd = await api.diagnose({ session_id: sessionId });
        addLog("diagnostician", dd.diagnosis, new Date());
        if (dd.refs?.length > 0) addLog("diagnostician", `📚 ${dd.refs.length} supporting articles retrieved`, new Date());
        addLog("critic", "📥 Initiating senior clinical review…");
        await new Promise(r => setTimeout(r, 400));
        addLog("critic", dd.review, new Date());
        setPhase("done");
        setTimeout(() => onComplete({ symptoms, date: new Date(), sessionId, transcript: msgs.concat([{ role: "user", text: txt }]), diagnosis: dd.diagnosis, review: dd.review, refs: dd.refs || [] }), 1500);
      }
    } catch (e) { addLog("interviewer", `⚠️ ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ height: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 56 }}>
      {/* Sub-bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: "1px solid var(--border)", background: "var(--nav)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>← Back</button>
          {sessionId && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text4)" }}>SESSION {sessionId.slice(0, 8).toUpperCase()}</span>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <StatusPill phase={phase} />
          <button onClick={() => setShowPanel(v => !v)} className="btn-ghost"
            style={{ padding: "6px 14px", fontSize: 12, fontFamily: "var(--mono)", color: showPanel ? "var(--violet)" : "var(--text3)", borderColor: showPanel ? "var(--violetDim)" : undefined, background: showPanel ? "var(--violetDim)" : undefined }}>
            {showPanel ? "Hide" : "Show"} Panel
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat column */}
        <div style={{ flex: showPanel ? "0 0 52%" : "1", display: "flex", flexDirection: "column", borderRight: showPanel ? "1px solid var(--border)" : "none" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {/* Active case card */}
            <div style={{ marginBottom: 20, padding: "14px 18px", background: "var(--tealDim)", border: "1px solid var(--tealGlow)", borderRadius: 14 }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>ACTIVE CASE</p>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>{symptoms.description}</span>
                <span style={{ color: "var(--text4)", marginLeft: 8 }}>· {symptoms.bodyPart} · {symptoms.duration} · {symptoms.severity}/10</span>
              </p>
            </div>

            {/* Messages */}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10, marginBottom: 14, alignItems: "flex-end" }} className="animate-fadeIn">
                {m.role !== "user" && (
                  <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: AGENTS.interviewer.dim, border: `1px solid ${AGENTS.interviewer.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🩺</div>
                )}
                <div style={{ maxWidth: "76%" }}>
                  {m.role !== "user" && <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--teal)", marginBottom: 4, letterSpacing: "0.1em" }}>INTERVIEWER · {fmtTime(m.time)}</p>}
                  <div className={m.role === "user" ? "bubble-user" : "bubble-ai"} style={{ padding: "10px 16px", fontSize: 14, lineHeight: 1.65, color: m.role !== "user" ? "var(--text)" : undefined }}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing */}
            {loading && phase === "interviewing" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: AGENTS.interviewer.dim, border: `1px solid ${AGENTS.interviewer.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🩺</div>
                <div className="bubble-ai" style={{ padding: "10px 16px" }}><TypingDots /></div>
              </div>
            )}

            {phase === "analyzing" && (
              <div style={{ textAlign: "center", padding: "28px", background: "var(--violetDim)", border: "1px solid rgba(108,99,255,0.2)", borderRadius: 16, marginTop: 16, position: "relative", overflow: "hidden" }}>
                <div className="scanning-bar" />
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔬</div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--violet)", letterSpacing: "0.1em" }}>MULTI-AGENT ANALYSIS IN PROGRESS</p>
                <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>Querying literature · Generating diagnosis · Peer review…</p>
              </div>
            )}
            {phase === "done" && (
              <div style={{ textAlign: "center", padding: "28px", background: "var(--greenDim)", border: "1px solid rgba(32,191,107,0.25)", borderRadius: 16, marginTop: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--green)" }}>ANALYSIS COMPLETE · Loading results…</p>
              </div>
            )}
            <div ref={msgEnd} />
          </div>

          {/* Input bar */}
          {phase === "interviewing" && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, background: "var(--nav)", flexShrink: 0 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Describe your symptoms or answer the question…" disabled={loading}
                className="field" style={{ flex: 1 }} />
              <button onClick={send} disabled={!input.trim() || loading} className="btn-primary" style={{ padding: "0 22px", fontSize: 14, whiteSpace: "nowrap", flexShrink: 0 }}>
                Send →
              </button>
            </div>
          )}
        </div>

        {/* Agent panel */}
        {showPanel && (
          <div style={{ flex: "0 0 48%", display: "flex", flexDirection: "column", background: "var(--bg2)" }}>
            <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <p className="mono-label">AGENT REASONING LOG</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
              {logs.length === 0 && (
                <p style={{ color: "var(--text4)", textAlign: "center", paddingTop: 48, fontFamily: "var(--mono)", fontSize: 11 }}>Awaiting agent activity…</p>
              )}
              {logs.map(log => (
                <div key={log.id} className="animate-fadeIn" style={{ marginBottom: 18, paddingLeft: 14, borderLeft: `2px solid ${AGENTS[log.agent].color}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <AgentBadge k={log.agent} sm />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text4)" }}>{fmtTime(log.time)}</span>
                  </div>
                  <p style={{ color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</p>
                </div>
              ))}
              <div ref={logEnd} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESULTS PAGE
═══════════════════════════════════════════════════════════ */
function ResultsPage({ api, result, onNew, onHistory, onFlow }) {
  const [tab, setTab] = useState("diagnosis");
  const tabs = [
    { id: "diagnosis", label: "🔬 Diagnosis"  },
    { id: "review",    label: "⚖️ Critic Review" },
    { id: "refs",      label: `📚 Literature (${result.refs.length})` },
    { id: "transcript",label: "💬 Transcript" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 72, paddingBottom: 48 }} className="page-enter">
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="mono-label" style={{ marginBottom: 4 }}>DIAGNOSTIC REPORT · {result.date.toLocaleDateString("en-AU")}</p>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: "var(--text)", letterSpacing: -0.8, marginBottom: 6 }}>Diagnostic Results</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ background: "var(--tealDim)", color: "var(--teal)", border: "1px solid var(--tealGlow)", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontFamily: "var(--mono)" }}>{symptoms?.bodyPart || result.symptoms?.bodyPart || "General"}</span>
              <span style={{ background: (() => { const s = sev(result.symptoms?.severity || 5); return s.dim; })(), color: (() => { const s = sev(result.symptoms?.severity || 5); return s.color; })(), borderRadius: 20, padding: "3px 12px", fontSize: 11, fontFamily: "var(--mono)" }}>
                Severity {result.symptoms?.severity}/10
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {result.sessionId && <ExportButtons url={t => api.exportUrl(result.sessionId, t)} />}
            <button onClick={onFlow}    className="btn-ghost" style={{ padding: "9px 16px", fontSize: 13, color: "var(--teal)", borderColor: "var(--tealGlow)" }}>🔀 Flow View</button>
            <button onClick={onHistory} className="btn-ghost" style={{ padding: "9px 16px", fontSize: 13 }}>📋 History</button>
            <button onClick={onNew}     className="btn-primary" style={{ padding: "9px 18px", fontSize: 13 }}>+ New</button>
          </div>
        </div>

        {/* Case summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 24, background: "var(--border)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
          {[
            { l: "Complaint", v: (result.symptoms?.description || "").slice(0, 40) + ((result.symptoms?.description || "").length > 40 ? "…" : "") },
            { l: "Location",  v: result.symptoms?.bodyPart || "—" },
            { l: "Duration",  v: result.symptoms?.duration || "—" },
            { l: "Severity",  v: `${result.symptoms?.severity || 0}/10 — ${sev(result.symptoms?.severity || 5).label}` },
          ].map(({ l, v }) => (
            <div key={l} style={{ padding: "14px 18px", background: "var(--card)" }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>{l}</p>
              <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tab-group" style={{ marginBottom: 18, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card" style={{ padding: "28px 32px", boxShadow: "var(--shadow)" }}>
          {(tab === "diagnosis" || tab === "review") && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
                <AgentBadge k={tab === "diagnosis" ? "diagnostician" : "critic"} />
                <span style={{ fontSize: 13, color: "var(--text3)" }}>{tab === "diagnosis" ? "RAG-grounded differential analysis" : "Clinical safety review & evidence assessment"}</span>
              </div>
              <p style={{ color: "var(--text2)", fontSize: 14, fontFamily: "var(--mono)", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {tab === "diagnosis" ? result.diagnosis : result.review}
              </p>
            </>
          )}
          {tab === "refs" && result.refs.map((r, i) => (
            <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < result.refs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6, alignItems: "flex-start" }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", lineHeight: 1.5 }}>[{i + 1}] {r.title}</p>
                <span style={{ background: "var(--violetDim)", color: "var(--violet)", borderRadius: 8, padding: "2px 10px", fontSize: 10, fontFamily: "var(--mono)", whiteSpace: "nowrap", flexShrink: 0 }}>{r.score}</span>
              </div>
              <p style={{ color: "var(--text3)", fontSize: 12, marginBottom: 6 }}>{r.authors} · {r.year}</p>
              <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "var(--teal)", fontSize: 12, textDecoration: "none", fontFamily: "var(--mono)" }}>→ View on PubMed ↗</a>
            </div>
          ))}
          {tab === "transcript" && result.transcript.map((m, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <p className="mono-label" style={{ color: m.role === "user" ? "var(--teal)" : "var(--text3)" }}>{m.role === "user" ? "PATIENT" : "INTERVIEWER"}</p>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>{m.text}</p>
              {i < result.transcript.length - 1 && <Divider style={{ marginTop: 16 }} />}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 14, display: "flex", gap: 10, padding: "12px 16px", background: "var(--amberDim)", border: "1px solid rgba(245,159,0,0.2)", borderRadius: 12 }}>
          <span>⚠️</span>
          <p style={{ fontSize: 11, color: "var(--amber)", lineHeight: 1.6 }}><strong>Disclaimer:</strong> Educational use only. Not a substitute for professional medical advice.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOW PAGE
═══════════════════════════════════════════════════════════ */
function FlowPage({ result, onBack }) {
  const [active, setActive] = useState(null);
  const nodes = [
    { id: "input",    x: 65,  y: 30,  w: 175, h: 60,  icon: "📋", title: "PATIENT INPUT",    color: "#64748b", info: result.symptoms.description.slice(0, 80) },
    { id: "interview",x: 65,  y: 150, w: 195, h: 110, icon: "🩺", title: "INTERVIEWER",      color: "#00cfaa", info: `${result.transcript.length} exchanges\nSOCRATES framework\nHistory taking` },
    { id: "rag",      x: 290, y: 150, w: 175, h: 110, icon: "📚", title: "RAG · CHROMADB",   color: "#38bdf8", info: `${result.refs.length} PubMed docs\nall-MiniLM-L6-v2\nVector search` },
    { id: "diag",     x: 175, y: 320, w: 195, h: 100, icon: "🔬", title: "DIAGNOSTICIAN",    color: "#a394ff", info: result.diagnosis.slice(0, 200) + "…" },
    { id: "critic",   x: 175, y: 478, w: 195, h: 100, icon: "⚖️", title: "CRITIC AGENT",     color: "#f59f00", info: result.review.slice(0, 200) + "…" },
    { id: "report",   x: 175, y: 636, w: 195, h: 56,  icon: "✅", title: "FINAL REPORT",     color: "#20bf6b", info: `PDF · JSON · Session ${result.sessionId?.slice(0, 8)}` },
  ];
  const an = nodes.find(n => n.id === active);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 72, paddingBottom: 48 }} className="page-enter">
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ marginBottom: 26 }}>
          <button onClick={onBack} className="btn-ghost" style={{ padding: "7px 14px", fontSize: 13, marginBottom: 12 }}>← Back to Results</button>
          <p className="mono-label">PROJ-13 · PIPELINE VISUALIZATION</p>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: "var(--text)", letterSpacing: -0.8 }}>Reasoning Flow</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "500px 1fr", gap: 20 }}>
          {/* Flow diagram */}
          <div className="glass-card" style={{ height: 760, position: "relative", overflow: "hidden", padding: 24, boxShadow: "var(--shadow)" }}>
            <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {[["153","88","153","148"],["153","258","265","318"],["377","258","265","318"],["265","418","265","476"],["265","576","265","634"]].map(([x1,y1,x2,y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border2)" strokeWidth="1.5" strokeDasharray="5 4" />
              ))}
            </svg>
            {nodes.map(n => (
              <div key={n.id} onClick={() => setActive(active === n.id ? null : n.id)}
                style={{ position: "absolute", left: n.x, top: n.y, width: n.w, height: n.h, borderRadius: 14, padding: "12px 14px", cursor: "pointer", transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)", background: active === n.id ? `${n.color}10` : "var(--card)", border: `${active === n.id ? 2 : 1}px solid ${active === n.id ? n.color : `${n.color}35`}`, boxShadow: active === n.id ? `0 0 24px ${n.color}25` : "none", transform: active === n.id ? "scale(1.02)" : "scale(1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 15 }}>{n.icon}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: n.color, letterSpacing: "0.1em" }}>{n.title}</span>
                </div>
                <p style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.info.split("\n")[0]}</p>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="glass-card" style={{ padding: 20, minHeight: 220 }}>
              {an ? (
                <>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: an.color, letterSpacing: "0.12em", marginBottom: 12 }}>{an.title}</p>
                  <p style={{ color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{an.info}</p>
                </>
              ) : (
                <div style={{ textAlign: "center", paddingTop: 60 }}>
                  <p style={{ color: "var(--text4)", fontFamily: "var(--mono)", fontSize: 11 }}>Click a node to inspect details</p>
                </div>
              )}
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <p className="mono-label" style={{ marginBottom: 14 }}>PIPELINE STATS</p>
              {[
                { l: "Interview turns",  v: result.transcript.length,  c: "var(--teal)"   },
                { l: "RAG docs retrieved", v: result.refs.length,      c: "#38bdf8"       },
                { l: "Agents active",    v: "3",                       c: "var(--violet)" },
                { l: "Safety status",    v: result.review.includes("CRITICAL") ? "⚠ CRITICAL" : "✓ Clear", c: result.review.includes("CRITICAL") ? "var(--rose)" : "var(--green)" },
                { l: "Session ID",       v: result.sessionId?.slice(0, 12) + "…", c: "var(--text4)" },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>{l}</span>
                  <span style={{ fontSize: 12, color: c, fontFamily: "var(--mono)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY PAGE
═══════════════════════════════════════════════════════════ */
function HistoryPage({ api, onNew }) {
  const [sessions, setSessions] = useState([]); const [loading, setLoading] = useState(true);
  const [sel, setSel]           = useState(null); const [detail, setDetail] = useState(null);
  useEffect(() => { load(); }, []);
  async function load() { setLoading(true); try { setSessions(await api.sessions()); } catch { } setLoading(false); }
  async function loadDetail(id) { if (sel === id) { setSel(null); setDetail(null); return; } setSel(id); try { setDetail(await api.session(id)); } catch { } }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 72, paddingBottom: 48 }} className="page-enter">
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="mono-label">CONSULTATION RECORDS</p>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: "var(--text)", letterSpacing: -0.8 }}>Session History</h2>
            <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>{loading ? "Loading…" : `${sessions.length} consultations stored`}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={load}  className="btn-ghost" style={{ padding: "10px 18px", fontSize: 13 }}>↻ Refresh</button>
            <button onClick={onNew} className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}>+ New Consult</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text4)", fontFamily: "var(--mono)", fontSize: 11 }}>Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--card)", border: "1px dashed var(--border2)", borderRadius: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--text2)", marginBottom: 6 }}>No sessions yet</p>
            <p style={{ color: "var(--text3)", fontSize: 13 }}>Start a consultation to see records here</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions.map((s, i) => (
              <div key={s.id} className="animate-fadeUp" style={{ animationDelay: `${i * 0.03}s` }}>
                <div onClick={() => loadDetail(s.id)}
                  className="glass-card card-hover"
                  style={{ padding: "16px 22px", cursor: "pointer", borderRadius: sel === s.id ? "14px 14px 0 0" : 14, borderColor: sel === s.id ? "var(--teal)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</p>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)" }}>{fmtDate(s.created_at)}</span>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: s.status === "done" ? "var(--green)" : "var(--amber)" }}>● {s.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <span style={{ color: "var(--text4)", fontSize: 11, marginLeft: 16 }}>{sel === s.id ? "▲" : "▼"}</span>
                  </div>
                </div>
                {sel === s.id && detail && (
                  <div style={{ background: "var(--bg2)", border: "1px solid var(--teal)", borderTop: "none", borderRadius: "0 0 14px 14px", padding: "16px 22px" }}>
                    {detail.status === "done" && <div style={{ marginBottom: 14 }}><ExportButtons url={t => api.exportUrl(s.id, t)} sm /></div>}
                    <p style={{ color: "var(--text3)", fontSize: 12, fontFamily: "var(--mono)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                      {detail.diagnosis?.slice(0, 400)}{detail.diagnosis?.length > 400 ? "\n…" : ""}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EVAL PAGE
═══════════════════════════════════════════════════════════ */
function EvalPage({ api }) {
  const [questions, setQuestions] = useState([]);
  const [history, setHistory]     = useState({ records: [], stats: { total: 0, single_accuracy: 0, multi_accuracy: 0, improvement: 0 } });
  const [running, setRunning]     = useState(null);
  const [results, setResults]     = useState({});
  const [selQ, setSelQ]           = useState(null);
  useEffect(() => { loadData(); }, []);
  async function loadData() {
    try {
      const [qs, hist] = await Promise.all([api.questions(), api.evalHist()]);
      setQuestions(qs.questions || []); setHistory(hist);
      const rm = {};
      for (const r of hist.records || []) { if (!rm[r.question_id]) rm[r.question_id] = { single: { answer: r.single_answer, reasoning: r.single_reasoning }, multi: { answer: r.multi_answer, reasoning: r.multi_reasoning }, single_correct: !!r.single_correct, multi_correct: !!r.multi_correct }; }
      setResults(rm);
    } catch { }
  }
  async function runQ(qid) {
    setRunning(qid);
    try { const d = await api.evalRun({ question_id: qid, mode: "both" }); setResults(p => ({ ...p, [qid]: d })); await loadData(); }
    catch (e) { alert(e.message); }
    setRunning(null);
  }
  async function runAll() { for (const q of questions) { await runQ(q.id); await new Promise(r => setTimeout(r, 500)); } }
  const st = history.stats;
  const catStyle = { "Cardiology": { c: "var(--rose)", d: "var(--roseDim)", b: "rgba(255,77,109,0.2)" }, "Neurology": { c: "var(--violet)", d: "var(--violetDim)", b: "rgba(108,99,255,0.2)" }, "Endocrinology": { c: "var(--amber)", d: "var(--amberDim)", b: "rgba(245,159,0,0.2)" }, "Pulmonology": { c: "#38bdf8", d: "rgba(56,189,248,0.1)", b: "rgba(56,189,248,0.2)" } };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingTop: 72, paddingBottom: 48 }} className="page-enter">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="mono-label">PROJ-14 · ACCURACY BENCHMARK</p>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, color: "var(--text)", letterSpacing: -0.8 }}>MedQA Evaluation</h2>
            <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>Multi-Agent vs Single-LLM on USMLE-style questions</p>
          </div>
          <button onClick={runAll} disabled={!!running} className="btn-primary"
            style={{ padding: "11px 24px", fontSize: 14, background: "linear-gradient(135deg, var(--violet), #7c3aed)", opacity: running ? 0.5 : 1 }}>
            {running ? "⏳ Running…" : "▶ Run All Questions"}
          </button>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { l: "TOTAL RUNS",   v: st.total,            c: "var(--text2)",   s: ""  },
            { l: "SINGLE LLM",   v: st.single_accuracy,  c: "#38bdf8",        s: "%" },
            { l: "MULTI-AGENT",  v: st.multi_accuracy,   c: "var(--violet)",  s: "%" },
            { l: "IMPROVEMENT",  v: (st.improvement >= 0 ? "+" : "") + st.improvement, c: st.improvement >= 0 ? "var(--green)" : "var(--rose)", s: "%" },
          ].map(({ l, v, c, s }) => (
            <div key={l} className="glass-card" style={{ padding: "18px 20px" }}>
              <p className="mono-label" style={{ marginBottom: 6 }}>{l}</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: c, fontFamily: "var(--mono)" }}>{v}{s}</p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        {st.total > 0 && (
          <div className="glass-card" style={{ padding: "20px 24px", marginBottom: 20 }}>
            {[{ l: "Single LLM", c: "#38bdf8", v: st.single_accuracy }, { l: "Multi-Agent", c: "var(--violet)", v: st.multi_accuracy }].map(({ l, c, v }) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text3)" }}>{l}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: c, fontWeight: 600 }}>{v}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${v}%`, background: c }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Questions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {questions.map((q, qi) => {
            const r = results[q.id]; const isRun = running === q.id;
            const cs = catStyle[q.category] || { c: "var(--text3)", d: "var(--bg2)", b: "var(--border)" };
            return (
              <div key={q.id} className="glass-card animate-fadeUp" style={{ animationDelay: `${qi * 0.04}s`, overflow: "hidden", borderColor: selQ === q.id ? "var(--violet)" : undefined }}>
                <div onClick={() => setSelQ(selQ === q.id ? null : q.id)} style={{ padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ background: cs.d, color: cs.c, border: `1px solid ${cs.b}`, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontFamily: "var(--mono)" }}>{q.category}</span>
                      {r && (
                        <>
                          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: r.single_correct ? "var(--green)" : "var(--rose)" }}>Single: {r.single?.answer} {r.single_correct ? "✓" : "✗"}</span>
                          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: r.multi_correct ? "var(--green)" : "var(--rose)" }}>Multi: {r.multi?.answer} {r.multi_correct ? "✓" : "✗"}</span>
                        </>
                      )}
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65 }}>{q.question}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); runQ(q.id); }} disabled={isRun || !!running}
                    className={r ? "btn-ghost" : "btn-primary"}
                    style={{ padding: "8px 16px", fontSize: 12, flexShrink: 0, opacity: isRun || running ? 0.5 : 1, whiteSpace: "nowrap", color: r ? "var(--violet)" : undefined, borderColor: r ? "var(--violetDim)" : undefined, background: r ? "var(--violetDim)" : undefined }}>
                    {isRun ? "⏳…" : r ? "↻ Re-run" : "▶ Run"}
                  </button>
                </div>
                {selQ === q.id && (
                  <div style={{ padding: "0 22px 20px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16, marginBottom: r ? 16 : 0 }}>
                      {Object.entries(q.options).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", borderRadius: 12, background: k === q.correct ? "var(--greenDim)" : "var(--bg2)", border: `1px solid ${k === q.correct ? "rgba(32,191,107,0.25)" : "var(--border)"}` }}>
                          <span style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: k === q.correct ? "var(--green)" : "var(--text3)", flexShrink: 0 }}>{k}.</span>
                          <span style={{ fontSize: 12, color: k === q.correct ? "var(--text)" : "var(--text3)", flex: 1, lineHeight: 1.5 }}>{v}</span>
                          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                            {r?.single?.answer === k && <span style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontFamily: "var(--mono)" }}>S</span>}
                            {r?.multi?.answer  === k && <span style={{ background: "var(--violetDim)", color: "var(--violet)", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontFamily: "var(--mono)" }}>M</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {r && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {[{ l: "Single LLM", c: "#38bdf8", d: "rgba(56,189,248,0.08)", b: "rgba(56,189,248,0.2)", ag: r.single, ok: r.single_correct }, { l: "Multi-Agent", c: "var(--violet)", d: "var(--violetDim)", b: "rgba(108,99,255,0.2)", ag: r.multi, ok: r.multi_correct }].map(({ l, c, d, b, ag, ok }) => (
                          <div key={l} style={{ background: d, border: `1px solid ${b}`, borderRadius: 14, padding: "14px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: c, fontWeight: 600 }}>{l}</span>
                              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: ok ? "var(--green)" : "var(--rose)", fontWeight: 600 }}>{ag?.answer} {ok ? "✓" : "✗"}</span>
                            </div>
                            <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", lineHeight: 1.7 }}>{ag?.reasoning?.slice(0, 160)}{ag?.reasoning?.length > 160 ? "…" : ""}</p>
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

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
function AppInner() {
  const auth = useAuth();
  const [page, setPage]             = useState("input");
  const [symptoms, setSymptoms]     = useState(null);
  const [result, setResult]         = useState(null);
  const [selPatient, setSelPatient] = useState(null);
  const api = makeApi(auth.token);

  if (!auth.ready) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg, var(--teal), var(--teal2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px", animation: "glow-pulse 2s infinite" }}>⚕️</div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text3)", letterSpacing: "0.15em" }}>LOADING MEDICHAIN…</p>
      </div>
    </div>
  );

  const goNew = () => { setSymptoms(null); setResult(null); setPage("input"); };

  return (
    <>
      <TopNav user={auth.user} onLogout={() => { auth.logout(); setPage("input"); }} onNav={setPage} page={page} />
      {page === "auth"     && <AuthPage api={api} onLogin={(t, u) => { auth.login(t, u); setPage("input"); }} onSkip={() => setPage("input")} />}
      {page === "input"    && <InputPage api={api} onSubmit={f => { setSymptoms(f); setPage("chat"); }} onEval={() => setPage("eval")} selectedPatient={selPatient} onClearPatient={() => setSelPatient(null)} />}
      {page === "patients" && (auth.user ? <PatientsPage api={api} onStartConsult={p => { setSelPatient(p); setPage("input"); }} /> : <AuthPage api={api} onLogin={(t, u) => { auth.login(t, u); setPage("patients"); }} onSkip={() => setPage("input")} />)}
      {page === "chat"     && symptoms && <ChatPage api={api} symptoms={symptoms} onBack={() => setPage("input")} onComplete={r => { setResult(r); setPage("result"); }} />}
      {page === "result"   && result   && <ResultsPage api={api} result={result} onNew={goNew} onHistory={() => setPage("history")} onFlow={() => setPage("flow")} />}
      {page === "flow"     && result   && <FlowPage result={result} onBack={() => setPage("result")} />}
      {page === "history"  && <HistoryPage api={api} onNew={goNew} />}
      {page === "eval"     && <EvalPage api={api} />}
    </>
  );
}

export default function MediChainApp() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
