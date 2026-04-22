import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
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

function MistralPeerPanel({ peerReview, loading, error }) {
  const [open, setOpen] = useState(false);

  const verdictMeta = peerReview && peerReview.verdict !== "UNAVAILABLE" && peerReview.verdict !== "ERROR"
    ? {
        PLAUSIBLE:    { label: "✓ Plausible",    color: "var(--sage)",  bg: "rgba(46,104,56,0.08)",   bd: "rgba(46,104,56,0.28)" },
        NEEDS_REVIEW: { label: "△ Needs Review", color: "var(--amber)", bg: "rgba(245,166,35,0.08)",  bd: "rgba(245,166,35,0.28)" },
        CONCERNING:   { label: "⚠ Concerning",   color: "var(--rose)",  bg: "rgba(220,38,38,0.08)",   bd: "rgba(220,38,38,0.28)" },
      }[peerReview.verdict] || null
    : null;

  return (
    <div style={{ position: "sticky", top: 90 }}>
      {/* Collapsed trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%", textAlign: "left", cursor: "pointer",
            background: "linear-gradient(135deg, rgba(245,166,35,0.08), rgba(245,166,35,0.04))",
            border: "1.5px solid rgba(245,166,35,0.3)", borderRadius: 12,
            padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8,
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.6)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(245,166,35,0.12)"; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(245,166,35,0.3)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,166,35,0.9)", fontWeight: 600 }}>
                Mistral Second Opinion
              </span>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "rgba(245,166,35,0.7)" }}>▶</span>
          </div>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(245,166,35,0.6)", animation: "pulse 1.2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink4)", fontStyle: "italic" }}>Evaluating diagnosis…</span>
            </div>
          )}
          {!loading && verdictMeta && (
            <span style={{
              alignSelf: "flex-start", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", color: verdictMeta.color,
              background: verdictMeta.bg, border: `1.5px solid ${verdictMeta.bd}`,
              borderRadius: 20, padding: "2px 12px",
            }}>
              {verdictMeta.label}
            </span>
          )}
          {!loading && error && (
            <span style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--rose)", fontStyle: "italic" }}>{error}</span>
          )}
          {!loading && !peerReview && !error && (
            <span style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink4)", fontStyle: "italic" }}>Click to view independent review</span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{
          background: "var(--paper2, #faf8f4)", border: "1.5px solid rgba(245,166,35,0.3)",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(245,166,35,0.1)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", background: "rgba(245,166,35,0.07)",
            borderBottom: "1px solid rgba(245,166,35,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 17 }}>🤖</span>
              <div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,166,35,0.9)", margin: 0, fontWeight: 600 }}>Mistral Second Opinion</p>
                <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink4)", margin: 0, marginTop: 2 }}>mistral-large via OpenRouter</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 16, color: "var(--ink4)", padding: "0 4px", lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(245,166,35,0.7)", animation: "pulse 1.2s ease-in-out infinite" }} />
                <span style={{ fontFamily: "var(--body)", fontSize: 13.5, color: "var(--ink4)", fontStyle: "italic" }}>Mistral is reviewing the diagnosis…</span>
              </div>
            )}

            {!loading && peerReview && verdictMeta && (
              <>
                {/* Verdict + Confidence row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                    color: verdictMeta.color, background: verdictMeta.bg,
                    border: `1.5px solid ${verdictMeta.bd}`, borderRadius: 20, padding: "4px 14px",
                  }}>{verdictMeta.label}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em",
                    color: "var(--ink4)", background: "var(--paper3)",
                    border: "1px solid rgba(22,15,6,0.12)", borderRadius: 20, padding: "3px 10px",
                  }}>CONFIDENCE: {peerReview.confidence}</span>
                </div>

                {/* Assessment — split sentences into bullet points */}
                {peerReview.assessment && (
                  <div style={{ paddingTop: 4 }}>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", color: "var(--ink4)", textTransform: "uppercase", marginBottom: 8 }}>Assessment</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {peerReview.assessment
                        .split(/(?<=[.!?])\s+/)
                        .filter(s => s.trim().length > 0)
                        .map((sentence, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: verdictMeta.color, fontSize: 10, flexShrink: 0, marginTop: 3, fontWeight: 700 }}>▸</span>
                            <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink2)", lineHeight: 1.7, margin: 0 }}
                               dangerouslySetInnerHTML={{ __html: sentence.trim().replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Missed diagnoses — tag chips */}
                {peerReview.missed_diagnoses && peerReview.missed_diagnoses !== "None" && (
                  <div style={{ paddingTop: 12, borderTop: "1px dashed rgba(22,15,6,0.09)" }}>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 8 }}>Missed Differentials</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {peerReview.missed_diagnoses.split(/,\s*/).map((d, i) => (
                        <span key={i} style={{
                          fontFamily: "var(--body)", fontSize: 12, color: "var(--amber)",
                          background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.3)",
                          borderRadius: 20, padding: "3px 10px",
                        }}>{d.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety flags */}
                {peerReview.safety_flags && peerReview.safety_flags !== "None" && (
                  <div style={{ borderRadius: 8, background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)", padding: "10px 14px" }}>
                    <p style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", color: "var(--rose)", textTransform: "uppercase", marginBottom: 5 }}>⚠ Safety Flags</p>
                    <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--rose)", margin: 0, lineHeight: 1.65 }}>{peerReview.safety_flags}</p>
                  </div>
                )}
              </>
            )}

            {!loading && error && (
              <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--rose)", margin: 0 }}>Error: {error}</p>
            )}

            {!loading && peerReview?.verdict === "ERROR" && (
              <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink4)", margin: 0 }}>Unavailable: {peerReview.assessment}</p>
            )}

            {!loading && !error && (!peerReview || peerReview?.verdict === "UNAVAILABLE") && (
              <p style={{ fontFamily: "var(--body)", fontSize: 13.5, color: "var(--ink4)", fontStyle: "italic", margin: 0 }}>No peer review available for this session.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Region name → center position (left%, top%) within the image
const REGION_POS = {
  "UPPER-LEFT":    { l: 17, t: 17 },
  "UPPER-CENTER":  { l: 50, t: 17 },
  "UPPER-RIGHT":   { l: 83, t: 17 },
  "CENTER-LEFT":   { l: 17, t: 50 },
  "CENTER":        { l: 50, t: 50 },
  "CENTER-RIGHT":  { l: 83, t: 50 },
  "LOWER-LEFT":    { l: 17, t: 83 },
  "LOWER-CENTER":  { l: 50, t: 83 },
  "LOWER-RIGHT":   { l: 83, t: 83 },
  "OVERALL":       { l: 50, t: 50 },
};

const MARKER_COLORS = ["#e11d48","#7c3aed","#0369a1","#047857","#b45309","#be185d"];

function AnnotatedMediaCard({ item }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const hasImage = item.previewUrl && item.fileType === "image";
  const annotations = item.annotations || [];

  return (
    <div style={{ border: "1px solid rgba(22,15,6,0.1)", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 16px", background: "var(--paper3)", borderBottom: "1px solid rgba(22,15,6,0.08)" }}>
        <span style={{ fontSize: 18 }}>{item.fileType === "image" ? "🩻" : item.fileType === "audio" ? "🎵" : "📄"}</span>
        <div>
          <p style={{ fontFamily: "var(--body)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.fileName}</p>
          <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--rose)", letterSpacing: "0.1em" }}>
            {item.fileType?.toUpperCase()}{annotations.length > 0 ? ` · ${annotations.length} findings` : ""}
          </p>
        </div>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Annotated image */}
        {hasImage && (
          <div style={{ display: "grid", gridTemplateColumns: annotations.length ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
            {/* Image with overlay markers */}
            <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
              <img
                src={item.previewUrl}
                alt={item.fileName}
                style={{ width: "100%", borderRadius: 8, display: "block", border: "1px solid rgba(22,15,6,0.1)" }}
              />
              {annotations.map((a, idx) => {
                const pos = REGION_POS[a.region] || REGION_POS["CENTER"];
                const color = MARKER_COLORS[idx % MARKER_COLORS.length];
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      position: "absolute",
                      left: `${pos.l}%`,
                      top: `${pos.t}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
                      cursor: "pointer",
                    }}
                  >
                    {/* Pulse ring */}
                    <div style={{
                      position: "absolute", inset: -6,
                      borderRadius: "50%",
                      background: `${color}30`,
                      animation: "pulse 2s ease-in-out infinite",
                    }} />
                    {/* Numbered dot */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: color, color: "#fff",
                      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                      border: "2px solid #fff",
                      transition: "transform 0.15s",
                      transform: isHovered ? "scale(1.3)" : "scale(1)",
                    }}>{idx + 1}</div>
                    {/* Tooltip */}
                    {isHovered && (
                      <div style={{
                        position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
                        background: "rgba(22,15,6,0.88)", color: "#fff",
                        fontFamily: "var(--body)", fontSize: 11, lineHeight: 1.4,
                        padding: "6px 10px", borderRadius: 6,
                        maxWidth: 200, whiteSpace: "normal",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)", zIndex: 20,
                      }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.7, display: "block", marginBottom: 2 }}>{a.region}</span>
                        {a.finding}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Findings list */}
            {annotations.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.1em", marginBottom: 4 }}>FINDINGS</p>
                {annotations.map((a, idx) => {
                  const color = MARKER_COLORS[idx % MARKER_COLORS.length];
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        padding: "8px 10px", borderRadius: 7,
                        background: hoveredIdx === idx ? `${color}12` : "var(--paper3)",
                        border: `1px solid ${hoveredIdx === idx ? color + "40" : "rgba(22,15,6,0.08)"}`,
                        cursor: "default", transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", background: color,
                        color: "#fff", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>{idx + 1}</div>
                      <div>
                        <p style={{ fontFamily: "var(--mono)", fontSize: 8, color, letterSpacing: "0.08em", marginBottom: 2 }}>{a.region}</p>
                        <p style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5 }}>{a.finding}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Full analysis text */}
        <div>
          {hasImage && annotations.length > 0 && (
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.1em", marginBottom: 10 }}>FULL ANALYSIS</p>
          )}
          <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink2)", lineHeight: 1.85, whiteSpace: "pre-wrap", margin: 0 }}>
            {item.analysis}
          </p>
        </div>
      </div>
    </div>
  );
}

// Extract bullet items under "## Recommended Investigations"
function parseInvestigations(text) {
  const m = (text || "").match(/##\s*Recommended Investigations\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map(l => l.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim())
    .filter(l => l.length > 3);
}

// Parse "1. **Condition** — Confidence: HIGH\n   Supporting..." into structured list
// Also collects the bullet lines immediately following each heading as evidence
function parseDifferential(text) {
  const lines = (text || "").split("\n");
  const items = [];
  const confidenceMap = { HIGH: 80, MEDIUM: 50, LOW: 20 };
  const colorMap = { HIGH: "var(--sage)", MEDIUM: "var(--amber)", LOW: "var(--rose)" };
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—-]\s*Confidence:\s*(HIGH|MEDIUM|LOW)/i);
    if (m) {
      const level = m[2].toUpperCase();
      // Collect supporting bullet lines until next numbered item or blank line
      const evidence = [];
      for (let j = i + 1; j < lines.length && j < i + 8; j++) {
        const l = lines[j].trim();
        if (!l) continue;
        if (/^\d+\.\s+\*\*/.test(l)) break;
        // Strip leading bullets/dashes and markdown bold
        const clean = l.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim();
        if (clean.length > 4) evidence.push(clean);
      }
      items.push({ condition: m[1].trim(), level, pct: confidenceMap[level] || 30, color: colorMap[level] || "var(--ink5)", evidence });
    }
  }
  return items;
}

function DifferentialChart({ diagnosis }) {
  const items = parseDifferential(diagnosis);
  const [animated, setAnimated] = useState(false);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, []);
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 24, padding: "18px 20px", background: "var(--paper3)", borderRadius: 10, border: "1px solid rgba(22,15,6,0.08)" }}>
      <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Differential · Confidence</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => (
          <div key={i}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, cursor: item.evidence.length ? "pointer" : "default" }}
              onClick={() => item.evidence.length && setExpanded(expanded === i ? null : i)}
            >
              <span style={{ fontFamily: "var(--body)", fontSize: 13.5, fontWeight: 500, color: "var(--ink2)", display: "flex", alignItems: "center", gap: 6 }}>
                {item.condition}
                {item.evidence.length > 0 && (
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: item.color, opacity: 0.7, transition: "transform 0.2s", display: "inline-block", transform: expanded === i ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                )}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: item.color, letterSpacing: "0.08em" }}>{item.level}</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: "rgba(22,15,6,0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, background: item.color,
                width: animated ? `${item.pct}%` : "0%",
                transition: "width 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
                transitionDelay: `${i * 0.13}s`,
                opacity: 0.85,
              }} />
            </div>
            {expanded === i && item.evidence.length > 0 && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: `${item.color}10`, border: `1px solid ${item.color}30`, borderRadius: 7, display: "flex", flexDirection: "column", gap: 5 }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: item.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Supporting Evidence</p>
                {item.evidence.map((e, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: item.color, fontSize: 10, flexShrink: 0, marginTop: 2 }}>▸</span>
                    <span style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink3)", lineHeight: 1.6 }}>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage({ api, result, onNew, onHistory, onFlow }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("diagnosis");
  const [peerReview, setPeerReview] = useState(null);
  const [peerLoading, setPeerLoading] = useState(false);
  const [peerError, setPeerError] = useState(null);

  useEffect(() => {
    if (!result.sessionId) return;
    setPeerLoading(true);
    setPeerError(null);
    api.peerReview(result.sessionId)
      .then(d => setPeerReview(d))
      .catch(e => setPeerError(e.message || "Failed to load peer review"))
      .finally(() => setPeerLoading(false));
  }, [result.sessionId, api]);
  const symptoms = result.symptoms || {};
  const severityValue = symptoms.severity_level || symptoms.severity || "moderate";
  const refs = Array.isArray(result.refs) ? result.refs : [];
  const diagnosis = result.diagnosis || "";
  const review = result.review || "";
  const transcript = Array.isArray(result.transcript) ? result.transcript : [];
  const cot = result.cot || null;
  const hasCot = cot && (cot.diagnostician || cot.critic);
  const mediaItems = (result.mediaItems || []).filter(it => !it.analysing && it.analysis);
  const tabs = [
    { id: "diagnosis", l: t("results.tab_diagnosis") },
    { id: "review", l: t("results.tab_review") },
    ...(hasCot ? [{ id: "cot", l: t("results.tab_cot") }] : []),
    { id: "refs", l: t("results.tab_refs", { count: refs.length }) },
    ...(mediaItems.length > 0 ? [{ id: "media", l: `🩻 Media (${mediaItems.length})` }] : []),
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
              <Button onClick={() => window.print()} variant="outline" size="sm">🖨 Print</Button>
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
                  {tab === "diagnosis" && (() => {
                    const items = parseDifferential(diagnosis);
                    const top = items[0];
                    if (!top) return null;
                    return (
                      <div style={{
                        marginBottom: 28, padding: "28px 30px",
                        background: `linear-gradient(135deg, ${top.color}12, ${top.color}06)`,
                        border: `1.5px solid ${top.color}40`,
                        borderRadius: 14, position: "relative", overflow: "hidden",
                      }}>
                        {/* subtle watermark */}
                        <div style={{ position: "absolute", right: -10, top: -10, fontSize: 100, opacity: 0.04, lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>🔬</div>
                        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: top.color, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10, opacity: 0.8 }}>
                          Primary Diagnosis · Most Likely
                        </p>
                        <p style={{
                          fontFamily: "var(--serif)",
                          fontSize: "clamp(28px, 4vw, 44px)",
                          fontWeight: 400, fontStyle: "italic",
                          color: "var(--ink)", lineHeight: 1.1, letterSpacing: -0.5,
                          marginBottom: 14,
                        }}>
                          {top.condition}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                          <span style={{
                            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
                            color: top.color, background: `${top.color}18`,
                            border: `1.5px solid ${top.color}50`,
                            borderRadius: 20, padding: "4px 14px", letterSpacing: "0.1em",
                          }}>{top.level} CONFIDENCE</span>
                          {top.evidence[0] && (
                            <span style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", fontStyle: "italic" }}>
                              {top.evidence[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {tab === "diagnosis" && <DifferentialChart diagnosis={diagnosis} />}
                  <div className="md-body">
                    <ReactMarkdown>{tab === "diagnosis" ? diagnosis : review}</ReactMarkdown>
                  </div>
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
              {tab === "refs" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px dashed rgba(22,15,6,0.09)" }}>
                    <span style={{ fontSize: 20 }}>📚</span>
                    <div>
                      <p style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>Medical Literature References</p>
                      <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", fontStyle: "italic" }}>{refs.length} source{refs.length !== 1 ? "s" : ""} retrieved · ranked by relevance</p>
                    </div>
                  </div>
                  {refs.map((r, i) => {
                    const scorePct = Math.round((r.score || 0) * 100);
                    const scoreColor = scorePct >= 70 ? "var(--sage)" : scorePct >= 40 ? "var(--amber)" : "var(--ink4)";
                    return (
                      <div key={i} className="lift" style={{ marginBottom: 14, background: "var(--paper3)", borderRadius: 10, border: "1px solid rgba(22,15,6,0.09)", overflow: "hidden" }}>
                        {/* Top bar: index + relevance score */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px 8px", borderBottom: "1px solid rgba(22,15,6,0.06)" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--rose)", letterSpacing: "0.12em", fontWeight: 600 }}>REF {String(i + 1).padStart(2, "0")}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 64, height: 4, borderRadius: 2, background: "rgba(22,15,6,0.1)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${scorePct}%`, background: scoreColor, borderRadius: 2, transition: "width 0.6s ease" }} />
                            </div>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: scoreColor, letterSpacing: "0.08em" }}>{scorePct}% relevance</span>
                          </div>
                        </div>
                        {/* Body */}
                        <div style={{ padding: "12px 18px 14px" }}>
                          <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, color: "var(--ink)", lineHeight: 1.55, marginBottom: 6 }}>{r.title}</p>
                          {(r.authors || r.year) && (
                            <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink4)", fontStyle: "italic", marginBottom: 8 }}>
                              {r.authors && <span>{r.authors}</span>}
                              {r.authors && r.year && <span> · </span>}
                              {r.year && <span>{r.year}</span>}
                            </p>
                          )}
                          {r.excerpt && (
                            <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.65, marginBottom: 10 }}>
                              {r.excerpt}
                            </p>
                          )}
                          {/* Tags + button row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {r.source && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", background: "rgba(22,15,6,0.06)", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>{r.source}</span>}
                            {r.focus && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", background: "rgba(22,15,6,0.06)", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>{r.focus}</span>}
                            {r.qtype && r.qtype !== "N/A" && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", background: "rgba(22,15,6,0.06)", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>{r.qtype}</span>}
                            <div style={{ flex: 1 }} />
                            {r.url && (
                              <a href={r.url} target="_blank" rel="noreferrer" style={{
                                fontFamily: "var(--mono)", fontSize: 11, color: "var(--paper)", background: "var(--rose)",
                                textDecoration: "none", borderRadius: 6, padding: "5px 12px", letterSpacing: "0.08em",
                                fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5,
                              }}>↗ PubMed</a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {refs.length === 0 && (
                    <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink4)", fontStyle: "italic" }}>No literature references retrieved for this session.</p>
                  )}
                </>
              )}
              {tab === "media" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {mediaItems.map((item, i) => (
                    <AnnotatedMediaCard key={i} item={item} />
                  ))}
                </div>
              )}
              {tab === "transcript" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
                  {/* Left: transcript messages */}
                  <div>
                    {transcript.length === 0 && (
                      <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink4)", fontStyle: "italic" }}>No transcript available.</p>
                    )}
                    {transcript.map((m, i) => (
                      <div key={i} style={{ marginBottom: 22 }}>
                        <p className="ink-label" style={{ color: m.role === "user" ? "var(--rose)" : "var(--sage)" }}>
                          {m.role === "user" ? t("results.transcript_patient") : t("results.transcript_interviewer")}
                        </p>
                        <p style={{ fontFamily: "var(--body)", fontSize: 15.5, color: "var(--ink2)", lineHeight: 1.78 }}>{m.text}</p>
                        {i < transcript.length - 1 && <InkDivider />}
                      </div>
                    ))}
                  </div>

                  {/* Right: Mistral Second Opinion panel */}
                  <MistralPeerPanel peerReview={peerReview} loading={peerLoading} error={peerError} />
                </div>
              )}
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
