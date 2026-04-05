import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AmbientBlobs, ECGLine, IllustBranch, IllustLeaf } from "../components/illustrations";
import { AgentBadge, Banner, InkDivider, SevBadge } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { SEV } from "../core/constants";

function CotPanel({ title, agentKey, thinking }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!thinking) return null;
  const agentColors = {
    diagnostician: { accent: "var(--plum, #7c3aed)", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.18)" },
    critic: { accent: "var(--amber)", bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.18)" },
  };
  const c = agentColors[agentKey] || agentColors.diagnostician;
  return (
    <div style={{ marginBottom: 18, border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", padding: "13px 18px", background: c.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{agentKey === "diagnostician" ? "🔬" : "⚖️"}</span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, color: c.accent }}>{title}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: c.accent, letterSpacing: "0.1em", opacity: 0.7 }}>
            {t("results.cot_words", { count: thinking.split(" ").length })}
          </span>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: c.accent, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: "18px 20px", background: "var(--paper3)", borderTop: `1px solid ${c.border}` }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink3)", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
            {thinking}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage({ api, result, onNew, onHistory, onFlow }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("diagnosis");
  const symptoms = result.symptoms || {};
  const severityValue = symptoms.severity_level || symptoms.severity || "moderate";
  const refs = Array.isArray(result.refs) ? result.refs : [];
  const diagnosis = result.diagnosis || "";
  const review = result.review || "";
  const transcript = Array.isArray(result.transcript) ? result.transcript : [];
  const cot = result.cot || null;
  const hasCot = cot && (cot.diagnostician || cot.critic);
  const tabs = [
    { id: "diagnosis", l: t("results.tab_diagnosis") },
    { id: "review", l: t("results.tab_review") },
    ...(hasCot ? [{ id: "cot", l: t("results.tab_cot") }] : []),
    { id: "refs", l: t("results.tab_refs", { count: refs.length }) },
    { id: "transcript", l: t("results.tab_transcript") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingTop: 72, paddingBottom: 56, position: "relative", zIndex: 1, overflow: "hidden" }}>
      <AmbientBlobs />
      <IllustLeaf w={180} h={270} style={{ position: "fixed", top: "6%", right: "-1%", animation: "float1 9s ease-in-out infinite", pointerEvents: "none" }} color="var(--sage)" opacity={0.12} />
      <IllustBranch w={210} h={140} style={{ position: "fixed", bottom: "4%", left: "-2%", animation: "float2 11s ease-in-out infinite", pointerEvents: "none" }} opacity={0.12} />

      <div style={{ maxWidth: 950, margin: "0 auto", padding: "28px 28px 0", position: "relative", zIndex: 1 }}>
        <div className="fade-up">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 18, marginBottom: 26 }}>
            <div>
              <div className="eyebrow">{t("results.eyebrow")} · {(result.date ? new Date(result.date).toLocaleDateString() : "")}</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(44px,5vw,68px)", fontWeight: 400, color: "var(--ink)", letterSpacing: -1.2, lineHeight: 0.9, marginBottom: 16 }}>
                {t("results.title_line1")}<br /><span className="grad-heading">{t("results.title_line2")}</span>
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge>{symptoms.bodyPart || "General"}</Badge>
                <Badge>{symptoms.duration || "—"}</Badge>
                <SevBadge n={severityValue} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
              {result.sessionId && <>
                <Button onClick={() => window.open(api.exportUrl(result.sessionId, "pdf"), "_blank")} size="sm">{t("results.pdf")}</Button>
                <Button onClick={() => window.open(api.exportUrl(result.sessionId, "json"), "_blank")} variant="outline" size="sm">{t("results.json")}</Button>
              </>}
              <Button onClick={onFlow} variant="outline" size="sm">{t("results.flow")}</Button>
              <Button onClick={onHistory} variant="outline" size="sm">{t("results.history")}</Button>
              <Button onClick={onNew} variant="secondary" size="sm">{t("results.new")}</Button>
            </div>
          </div>
          <div className="gold-rule" />
          <ECGLine style={{ opacity: 0.35 }} />
        </div>

        <div className="card fade-up s1" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", marginBottom: 22, overflow: "hidden" }}>
          {[
            { l: t("results.complaint"), v: (symptoms.description || "").slice(0, 44) + "…" },
            { l: t("results.location"), v: symptoms.bodyPart || "—" },
            { l: t("results.duration"), v: symptoms.duration || "—" },
            { l: t("results.severity"), v: `${symptoms.severity || 0}/10`, c: SEV(symptoms.severity || 5).c },
          ].map(({ l, v, c }, i) => (
            <div key={l} style={{ padding: "14px 20px", borderRight: i < 3 ? "1px solid rgba(22,15,6,0.09)" : undefined }}>
              <p className="ink-label" style={{ marginBottom: 4 }}>{l}</p>
              <p style={{ fontFamily: "var(--body)", fontSize: 14, fontWeight: 500, color: c || "var(--ink)", lineHeight: 1.45 }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="fade-up s2">
          <div className="tab-row">{tabs.map(t2 => <button key={t2.id} className={`tab-btn${tab === t2.id ? " on" : ""}`} onClick={() => setTab(t2.id)}>{t2.l}</button>)}</div>
          <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
            <div className="shine" />
            <div style={{ padding: "30px 34px" }}>
              {(tab === "diagnosis" || tab === "review") && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 16, borderBottom: "1px dashed rgba(22,15,6,0.09)" }}>
                    <AgentBadge k={tab === "diagnosis" ? "diagnostician" : "critic"} />
                    <span style={{ fontFamily: "var(--body)", fontSize: 14, fontStyle: "italic", color: "var(--ink4)" }}>
                      {tab === "diagnosis" ? t("results.diagnosis_sub") : t("results.review_sub")}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--body)", fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {tab === "diagnosis" ? diagnosis : review}
                  </p>
                </>
              )}
              {tab === "cot" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 16, borderBottom: "1px dashed rgba(22,15,6,0.09)" }}>
                    <span style={{ fontSize: 22 }}>🧠</span>
                    <div>
                      <p style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{t("results.cot_title")}</p>
                      <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", fontStyle: "italic" }}>{t("results.cot_desc")}</p>
                    </div>
                  </div>
                  <CotPanel title={t("results.cot_diag")} agentKey="diagnostician" thinking={cot?.diagnostician} />
                  <CotPanel title={t("results.cot_critic")} agentKey="critic" thinking={cot?.critic} />
                  {!hasCot && <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink4)", fontStyle: "italic" }}>{t("results.cot_empty")}</p>}
                </>
              )}
              {tab === "refs" && refs.map((r, i) => (
                <div key={i} className="lift" style={{ padding: "14px 18px", background: "var(--paper3)", borderRadius: 4, marginBottom: 10, border: "1px solid rgba(22,15,6,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--rose)", flexShrink: 0, fontWeight: 500 }}>[{String(i + 1).padStart(2, "0")}]</span>
                      <p style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink)", lineHeight: 1.5 }}>{r.title}</p>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", flexShrink: 0 }}>{r.score}</span>
                  </div>
                  <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", marginBottom: 6, paddingLeft: 26, fontStyle: "italic" }}>
                    {r.source || "Unknown source"} · {r.focus || "Unknown focus"} · {r.qtype || "N/A"} · QID: {r.qid || "N/A"}
                  </p>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--rose)", textDecoration: "none", paddingLeft: 26, fontWeight: 600 }}>{t("results.ref_open")}</a>
                </div>
              ))}
              {tab === "transcript" && transcript.map((m, i) => (
                <div key={i} style={{ marginBottom: 22 }}>
                  <p className="ink-label" style={{ color: m.role === "user" ? "var(--rose)" : "var(--sage)" }}>{m.role === "user" ? t("results.transcript_patient") : t("results.transcript_interviewer")}</p>
                  <p style={{ fontFamily: "var(--body)", fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.78 }}>{m.text}</p>
                  {i < transcript.length - 1 && <InkDivider />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Banner type="warn" style={{ marginTop: 14 }}>
          <strong style={{ color: "var(--amber)" }}>{t("common.disclaimer_title")}</strong>
          <span style={{ color: "var(--ink3)" }}> {t("common.disclaimer_results")}</span>
        </Banner>
      </div>
    </div>
  );
}
