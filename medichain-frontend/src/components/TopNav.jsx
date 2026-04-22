import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Caduceus } from "./illustrations";
import { Button } from "./ui/button";

const LANGS = [
  { code: "en", label: "EN", full: "English" },
  { code: "zh", label: "中", full: "中文" },
  { code: "ja", label: "日", full: "日本語" },
];

export default function TopNav({ user, onLogout, onNav, page, dark, toggle, forceDark }) {
  const { t, i18n } = useTranslation();
  const [menu, setMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);

  const initials = (user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || user?.username?.slice(0, 2) || "?").toUpperCase();
  const isProvider = user?.role === "provider";
  const navItems = isProvider
    ? [{ id: "provider", l: t("nav.dashboard") }, { id: "history", l: t("nav.history") }]
    : [{ id: "input", l: t("nav.consult") }, { id: "patients", l: t("nav.patients") }, { id: "history", l: t("nav.history") }, { id: "eval", l: t("nav.medqa") }];

  const currentLang = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  const navBg = forceDark ? "rgba(8,15,26,0.97)" : "var(--nav-bg)";
  const navBorder = forceDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(127,99,21,0.12)";
  const textColor = forceDark ? "rgba(255,255,255,0.85)" : "var(--ink2)";
  const subColor = forceDark ? "rgba(255,255,255,0.4)" : "var(--ink5)";

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: navBg, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", height: 56, borderBottom: navBorder }}>
      <div className="brand-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
      <div style={{ padding: "0 28px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => onNav(isProvider ? "provider" : "input")} style={{ display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,var(--rose),var(--roseB))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(184,56,48,0.38)", color: "var(--paper)" }}>
            <Caduceus size={22} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 700, color: textColor, letterSpacing: -0.3, lineHeight: 1.1 }}>MediChain</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: subColor, letterSpacing: "0.16em", lineHeight: 1 }}>{t("nav.subtitle")}</div>
          </div>
        </button>

        {user && (
          <div style={{ display: "flex", gap: 2 }}>
            {navItems.map(({ id, l }) => (
              <button key={id} className={`nav-lnk${page === id ? " on" : ""}`} onClick={() => onNav(id)}>{l}</button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Language switcher */}
          <div style={{ position: "relative" }}>
            <Button
              onClick={() => { setLangMenu(v => !v); setMenu(false); }}
              variant="outline"
              size="sm"
              style={{ fontFamily: "var(--mono)", minWidth: 44 }}
            >
              {currentLang.label}
            </Button>
            {langMenu && (
              <div className="card scale-in" style={{ position: "absolute", right: 0, top: 42, width: 130, boxShadow: "var(--shadow-xl)", zIndex: 200, overflow: "hidden" }}>
                {LANGS.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangMenu(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      textAlign: "left", background: lang.code === i18n.language ? "var(--paper3)" : "none",
                      border: "none", borderBottom: "1px solid rgba(22,15,6,0.06)",
                      padding: "10px 14px", cursor: "pointer", transition: "background 0.14s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--paper3)"}
                    onMouseLeave={e => e.currentTarget.style.background = lang.code === i18n.language ? "var(--paper3)" : "none"}
                  >
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--rose)", fontWeight: 700, width: 18 }}>{lang.label}</span>
                    <span style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink2)" }}>{lang.full}</span>
                    {lang.code === i18n.language && <span style={{ marginLeft: "auto", color: "var(--rose)", fontSize: 10 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={toggle} variant="outline" size="sm">
            {dark ? t("nav.light") : t("nav.dark")}
          </Button>

          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setMenu(v => !v); setLangMenu(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--paper3)", border: "1.5px solid rgba(22,15,6,0.13)", borderRadius: 30, padding: "5px 16px 5px 6px", cursor: "pointer", transition: "all 0.18s" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: isProvider ? "linear-gradient(135deg,var(--navy),#2050a8)" : "linear-gradient(135deg,var(--rose),var(--roseB))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)" }}>{initials}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink2)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{user.full_name || user.username}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: isProvider ? "var(--navy)" : "var(--rose)", letterSpacing: "0.1em", lineHeight: 1 }}>{isProvider ? t("nav.provider_badge") : t("nav.patient_badge")}</span>
                </div>
                <span style={{ fontSize: 9, color: "var(--ink4)", marginLeft: 2 }}>{menu ? "▲" : "▼"}</span>
              </button>
              {menu && (
                <div className="card scale-in" style={{ position: "absolute", right: 0, top: 52, width: 240, boxShadow: "var(--shadow-xl)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(22,15,6,0.08)", background: "var(--paper3)" }}>
                    <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink)" }}>{user.full_name || user.username}</p>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", marginTop: 2 }}>{user.email}</p>
                    <div style={{ display: "inline-block", marginTop: 6, background: isProvider ? "var(--navyPale)" : "rgba(184,56,48,0.08)", borderRadius: 4, padding: "2px 8px" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: isProvider ? "var(--navy)" : "var(--rose)", letterSpacing: "0.1em" }}>{isProvider ? t("nav.provider_full") : t("nav.patient_badge")}</span>
                    </div>
                  </div>
                  {navItems.map(({ id, l }) => (
                    <button
                      key={id}
                      onClick={() => { onNav(id); setMenu(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid rgba(22,15,6,0.06)", padding: "12px 18px", color: "var(--ink2)", fontSize: 14, fontFamily: "var(--body)", cursor: "pointer", transition: "background 0.14s" }}
                      onMouseEnter={e => e.target.style.background = "var(--paper3)"}
                      onMouseLeave={e => e.target.style.background = "none"}
                    >
                      {l}
                    </button>
                  ))}
                  <button onClick={() => { onLogout(); setMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "12px 18px", color: "var(--rose)", fontSize: 14, fontFamily: "var(--body)", cursor: "pointer" }}>{t("nav.signout")}</button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={() => onNav("auth")} size="sm">{t("nav.signin")}</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
