import { useState } from "react";
import { AmbientBlobs, ECGLine, IllustBranch, IllustLeaf } from "../components/illustrations";
import { AgentBadge, Banner, InkDivider, SevBadge } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { SEV } from "../core/constants";

export default function ResultsPage({ api, result, onNew, onHistory, onFlow }) {
  const [tab, setTab] = useState("diagnosis");
  const symptoms = result.symptoms || {};
  const refs = Array.isArray(result.refs) ? result.refs : [];
  const diagnosis = result.diagnosis || "";
  const review = result.review || "";
  const transcript = Array.isArray(result.transcript) ? result.transcript : [];
  const tabs = [
    { id: "diagnosis", l: "🔬 Diagnosis" },
    { id: "review", l: "⚖️ Critic Review" },
    { id: "refs", l: `📚 Literature (${refs.length})` },
    { id: "transcript", l: "💬 Transcript" },
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
              <div className="eyebrow">Diagnostic Report · {(result.date ? new Date(result.date).toLocaleDateString("en-AU") : "")}</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(44px,5vw,68px)", fontWeight: 400, color: "var(--ink)", letterSpacing: -1.2, lineHeight: 0.9, marginBottom: 16 }}>
                Diagnostic<br /><span className="grad-heading">Results</span>
              </h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge>{symptoms.bodyPart || "General"}</Badge>
                <Badge>{symptoms.duration || "—"}</Badge>
                <SevBadge n={symptoms.severity || 5} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
              {result.sessionId && <>
                <Button onClick={() => window.open(api.exportUrl(result.sessionId, "pdf"), "_blank")} className="h-9 px-5 text-sm">📄 PDF</Button>
                <Button onClick={() => window.open(api.exportUrl(result.sessionId, "json"), "_blank")} variant="outline" className="h-9 px-4 text-sm">JSON</Button>
              </>}
              <Button onClick={onFlow} variant="outline" className="h-9 px-4 text-sm">Flow →</Button>
              <Button onClick={onHistory} variant="outline" className="h-9 px-4 text-sm">History</Button>
              <Button onClick={onNew} variant="secondary" className="h-9 px-5 text-sm">+ New</Button>
            </div>
          </div>
          <div className="gold-rule" />
          <ECGLine style={{ opacity: 0.35 }} />
        </div>

        <div className="card fade-up s1" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", marginBottom: 22, overflow: "hidden" }}>
          {[
            { l: "Complaint", v: (symptoms.description || "").slice(0, 44) + "…" },
            { l: "Location", v: symptoms.bodyPart || "—" },
            { l: "Duration", v: symptoms.duration || "—" },
            { l: "Severity", v: `${symptoms.severity || 0}/10`, c: SEV(symptoms.severity || 5).c },
          ].map(({ l, v, c }, i) => (
            <div key={l} style={{ padding: "14px 20px", borderRight: i < 3 ? "1px solid rgba(22,15,6,0.09)" : undefined }}>
              <p className="ink-label" style={{ marginBottom: 4 }}>{l}</p>
              <p style={{ fontFamily: "var(--body)", fontSize: 14, fontWeight: 500, color: c || "var(--ink)", lineHeight: 1.45 }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="fade-up s2">
          <div className="tab-row">{tabs.map(t => <button key={t.id} className={`tab-btn${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>{t.l}</button>)}</div>
          <div className="card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
            <div className="shine" />
            <div style={{ padding: "30px 34px" }}>
              {(tab === "diagnosis" || tab === "review") && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 16, borderBottom: "1px dashed rgba(22,15,6,0.09)" }}>
                    <AgentBadge k={tab === "diagnosis" ? "diagnostician" : "critic"} />
                    <span style={{ fontFamily: "var(--body)", fontSize: 14, fontStyle: "italic", color: "var(--ink4)" }}>
                      {tab === "diagnosis" ? "RAG-grounded differential analysis" : "Clinical safety and evidence review"}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--body)", fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {tab === "diagnosis" ? diagnosis : review}
                  </p>
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
                  <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", marginBottom: 6, paddingLeft: 26, fontStyle: "italic" }}>{r.authors} · {r.year}</p>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--rose)", textDecoration: "none", paddingLeft: 26, fontWeight: 600 }}>View on PubMed →</a>
                </div>
              ))}
              {tab === "transcript" && transcript.map((m, i) => (
                <div key={i} style={{ marginBottom: 22 }}>
                  <p className="ink-label" style={{ color: m.role === "user" ? "var(--rose)" : "var(--sage)" }}>{m.role === "user" ? "Patient" : "Interviewer"}</p>
                  <p style={{ fontFamily: "var(--body)", fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.78 }}>{m.text}</p>
                  {i < transcript.length - 1 && <InkDivider />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Banner type="warn" style={{ marginTop: 14 }}>
          <strong style={{ color: "var(--amber)" }}>Educational use only.</strong>
          <span style={{ color: "var(--ink3)" }}> Not a substitute for professional medical advice.</span>
        </Banner>
      </div>
    </div>
  );
}
