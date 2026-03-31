import { useState } from "react";
import { Caduceus } from "./illustrations";
import { Button } from "./ui/button";

export default function TopNav({ user, onLogout, onNav, page, dark, toggle }) {
  const [menu, setMenu] = useState(false);
  const initials = (user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || user?.username?.slice(0, 2) || "?").toUpperCase();
  const isProvider = user?.role === "provider";
  const navItems = isProvider
    ? [{ id: "provider", l: "Dashboard" }, { id: "history", l: "History" }]
    : [{ id: "input", l: "Consult" }, { id: "patients", l: "Patients" }, { id: "history", l: "History" }, { id: "eval", l: "MedQA" }];

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", height: 56, borderBottom: "1px solid rgba(22,15,6,0.09)" }}>
      <div style={{padding: "0 28px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => onNav(isProvider ? "provider" : "input")} style={{ display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,var(--rose),var(--roseB))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(184,56,48,0.38)", color: "var(--paper)" }}>
            <Caduceus size={22} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: -0.3, lineHeight: 1.1 }}>MediChain</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.16em", lineHeight: 1 }}>CLINICAL AI v4.0</div>
          </div>
        </button>

        {user && (
          <div style={{ display: "flex", gap: 2 }}>
            {navItems.map(({ id, l }) => (
              <button key={id} className={`nav-lnk${page === id ? " on" : ""}`} onClick={() => onNav(id)}>{l}</button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Button onClick={toggle} variant="outline" className="h-9 px-5 text-[13px]" style={{ paddingLeft: 20, paddingRight: 20 }}>{dark ? "☀ Light" : "◐ Dark"}</Button>
          {user ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenu(v => !v)} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--paper3)", border: "1.5px solid rgba(22,15,6,0.13)", borderRadius: 28, padding: "5px 14px 5px 6px", cursor: "pointer", transition: "all 0.18s" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,var(--rose),var(--roseB))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)" }}>{initials}</div>
                <span style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink2)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name || user.username}</span>
                <span style={{ fontSize: 9, color: "var(--ink4)" }}>{menu ? "▲" : "▼"}</span>
              </button>
              {menu && (
                <div className="card scale-in" style={{ position: "absolute", right: 0, top: 48, width: 234, boxShadow: "var(--shadow-xl)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(22,15,6,0.08)", background: "var(--paper3)" }}>
                    <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink)" }}>{user.full_name || user.username}</p>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", marginTop: 2 }}>{user.email}</p>
                  </div>
                  {navItems.map(({ id, l }) => (
                    <button
                      key={id}
                      onClick={() => { onNav(id); setMenu(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid rgba(22,15,6,0.06)", padding: "11px 18px", color: "var(--ink2)", fontSize: 14, fontFamily: "var(--body)", cursor: "pointer", transition: "background 0.14s" }}
                      onMouseEnter={e => e.target.style.background = "var(--paper3)"}
                      onMouseLeave={e => e.target.style.background = "none"}
                    >
                      {l}
                    </button>
                  ))}
                  <button onClick={() => { onLogout(); setMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "11px 18px", color: "var(--rose)", fontSize: 14, fontFamily: "var(--body)", cursor: "pointer" }}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => onNav("auth")} className="h-9 px-5 text-sm">Sign in</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
