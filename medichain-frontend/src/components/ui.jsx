import { AGENTS, SEV } from "../core/constants";

export function AgentBadge({ k, sm }) {
  const a = AGENTS[k];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: a.bg, color: a.c, border: `1px solid ${a.b}50`, borderRadius: 20, padding: sm ? "3px 10px" : "4px 14px", fontSize: sm ? 10 : 11, fontFamily: "var(--mono)", fontWeight: 500, letterSpacing: "0.1em" }}>
      {a.icon} {a.label}
    </span>
  );
}

export function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ink4)", display: "inline-block", animation: `dotPulse 1.3s ${i * 0.22}s ease infinite` }} />
      ))}
    </span>
  );
}

export function SevBadge({ n }) {
  const s = SEV(n);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bg, color: s.c, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontFamily: "var(--mono)", letterSpacing: "0.1em", fontWeight: 500 }}>
      {s.l} · {n}/10
    </span>
  );
}

export function InkDivider({ style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", ...style }}>
      <div style={{ flex: 1, height: 1, background: "rgba(22,15,6,0.14)" }} />
      <svg width="22" height="14" viewBox="0 0 22 14">
        <circle cx="11" cy="7" r="3" fill="var(--rose)" opacity="0.55" />
        <circle cx="2" cy="7" r="1.5" fill="var(--ink4)" opacity="0.35" />
        <circle cx="20" cy="7" r="1.5" fill="var(--ink4)" opacity="0.35" />
      </svg>
      <div style={{ flex: 1, height: 1, background: "rgba(22,15,6,0.14)" }} />
    </div>
  );
}

export function FormField({ label, type = "text", value, onChange, placeholder, error, rows, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <label className="ink-label">{label}</label>}
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`field${error ? " err" : ""}`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`field${error ? " err" : ""}`} />}
      {error && <p style={{ marginTop: 5, fontSize: 12, color: "var(--roseB)", fontFamily: "var(--mono)", letterSpacing: "0.08em" }}>{error}</p>}
    </div>
  );
}

export function Banner({ type = "info", children, style }) {
  const conf = {
    info: { bg: "var(--navyPale)", border: "var(--navy)50", icon: "ℹ" },
    success: { bg: "var(--sagePale)", border: "var(--sage)50", icon: "✓" },
    warn: { bg: "var(--amberPale)", border: "var(--amber)50", icon: "⚠" },
    error: { bg: "var(--rosePale)", border: "var(--rose)50", icon: "✗" },
  }[type];

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", background: conf.bg, border: `1.5px solid ${conf.border}`, borderRadius: 4, ...style }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{conf.icon}</span>
      <div style={{ fontFamily: "var(--body)", fontSize: 14, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}
