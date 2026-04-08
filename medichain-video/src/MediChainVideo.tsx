import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  surface: "#F0F9FF",
  card: "#FFFFFF",
  border: "#E0F2FE",
  sky: "#0EA5E9",
  teal: "#0D9488",
  cyan: "#06B6D4",
  dark: "#0F172A",
  navy: "#1E3A5F",
  muted: "#64748B",
  light: "#F8FAFF",
  rose: "#F43F5E",
  amber: "#F59E0B",
  grad1: "#0EA5E9",
  grad2: "#0D9488",
};

// ─── Utility hooks ────────────────────────────────────────────────────────────
function useFadeIn(from: number, duration = 20) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function useSlideUp(from: number, distance = 40, duration = 25) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 180 } });
  return interpolate(progress, [0, 1], [distance, 0]);
}

function useScale(from: number, duration = 20) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - from, fps, config: { damping: 12, stiffness: 200 } });
}

function AnimatedCounter({ value, from, duration = 60, prefix = "", suffix = "", style }: {
  value: number; from: number; duration?: number; prefix?: string; suffix?: string;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [from, from + duration], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const current = Math.round(progress * value);
  const display = current >= 1000 ? current.toLocaleString() : current.toString();
  return <span style={style}>{prefix}{display}{suffix}</span>;
}

// ─── Shared Layout ────────────────────────────────────────────────────────────
const GridBg: React.FC<{ opacity?: number }> = ({ opacity = 0.04 }) => (
  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke={C.sky} strokeWidth="0.8" opacity={opacity} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

const GradientOrb: React.FC<{ cx: number; cy: number; r: number; opacity?: number }> = ({ cx, cy, r, opacity = 0.08 }) => (
  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
    <radialGradient id={`orb-${cx}-${cy}`} cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor={C.sky} stopOpacity={opacity} />
      <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
    </radialGradient>
    <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.7} fill={`url(#orb-${cx}-${cy})`} />
  </svg>
);

// ─── Scene 1: Title (0–150f = 0–5s) ─────────────────────────────────────────
const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgAlpha = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoScale = spring({ frame: frame - 15, fps, config: { damping: 10, stiffness: 150 } });
  const tagFade = interpolate(frame, [45, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [45, 70], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleFade = interpolate(frame, [65, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const metaFade = interpolate(frame, [85, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringScale = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 80 } });

  const letters = "MediChain".split("");

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: bgAlpha }}>
      <GridBg opacity={0.035} />
      <GradientOrb cx={1400} cy={200} r={500} opacity={0.06} />
      <GradientOrb cx={200} cy={800} r={400} opacity={0.05} />

      {/* Animated rings */}
      <div style={{ position: "absolute", right: 180, top: "50%", transform: `translateY(-50%) scale(${ringScale})` }}>
        {[320, 250, 180, 110].map((r, i) => (
          <div key={i} style={{
            position: "absolute", top: "50%", left: "50%",
            width: r * 2, height: r * 2,
            marginLeft: -r, marginTop: -r,
            borderRadius: "50%",
            border: `1.5px solid ${i % 2 === 0 ? C.sky : C.teal}`,
            opacity: 0.15 - i * 0.02,
          }} />
        ))}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 80, height: 80, marginLeft: -40, marginTop: -40,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.sky}, ${C.teal})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 40px ${C.sky}40`,
        }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#fff", fontFamily: "serif" }}>Mc</span>
        </div>
      </div>

      {/* Left content */}
      <div style={{ position: "absolute", left: 120, top: "50%", transform: "translateY(-52%)" }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `linear-gradient(90deg, ${C.sky}18, ${C.teal}18)`,
          border: `1px solid ${C.sky}30`, borderRadius: 4,
          padding: "6px 16px", marginBottom: 28,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.teal }} />
          <span style={{ fontFamily: "monospace", fontSize: 13, color: C.teal, letterSpacing: "0.2em" }}>
            COMP9900 · FINAL PRESENTATION · UNSW
          </span>
        </div>

        {/* Title letters */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 0, marginBottom: 20 }}>
          {letters.map((l, i) => {
            const lFade = interpolate(frame, [20 + i * 3, 38 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const lY = interpolate(frame, [20 + i * 3, 40 + i * 3], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const isEm = i >= 4;
            return (
              <span key={i} style={{
                fontFamily: "Georgia, serif",
                fontSize: 128,
                fontWeight: 400,
                lineHeight: 0.9,
                color: isEm ? C.teal : C.dark,
                fontStyle: isEm ? "italic" : "normal",
                opacity: lFade,
                transform: `translateY(${lY}px)`,
                display: "inline-block",
                letterSpacing: -3,
              }}>{l}</span>
            );
          })}
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagFade, transform: `translateY(${tagY}px)`, marginBottom: 18 }}>
          <p style={{
            fontFamily: "Georgia, serif", fontSize: 28, fontStyle: "italic",
            color: C.muted, margin: 0, maxWidth: 640, lineHeight: 1.4,
          }}>
            A Multi-Agent Collaborative System for<br />
            <span style={{ color: C.sky }}>Empathetic Clinical Diagnostic Reasoning</span>
          </p>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subtitleFade, marginBottom: 28 }}>
          <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${C.sky}, ${C.teal})`, marginBottom: 16 }} />
        </div>

        {/* Meta */}
        <div style={{ opacity: metaFade, display: "flex", gap: 32 }}>
          {[
            { val: "48", lbl: "Story Points" },
            { val: "47K+", lbl: "Medical Docs" },
            { val: "6", lbl: "Modalities" },
            { val: "3", lbl: "Languages" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 36, color: C.teal, fontWeight: 400 }}>{m.val}</span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{m.lbl}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 2: Problem (150–360f = 5–12s) ─────────────────────────────────────
const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleFade = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const stats = [
    { val: 12000000, disp: "12M+", label: "Diagnostic Errors / Year", sub: "USA · Graber et al., 2013", color: C.rose, icon: "⚠" },
    { val: 40, disp: "$40B", label: "Annual Cost", sub: "Diagnostic failures · CRICO 2021", color: C.amber, icon: "💸" },
    { val: 71, disp: "71%", label: "GPT-4 on MedQA", sub: "Below 90% clinical threshold · Kung 2023", color: C.sky, icon: "🤖" },
  ];

  return (
    <AbsoluteFill style={{ background: C.light }}>
      <GridBg opacity={0.03} />
      <GradientOrb cx={960} cy={-100} r={600} opacity={0.05} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
        {/* Eyebrow */}
        <div style={{
          opacity: titleFade, transform: `translateY(${titleY}px)`,
          fontFamily: "monospace", fontSize: 13, color: C.sky, letterSpacing: "0.28em",
          textTransform: "uppercase", marginBottom: 12,
        }}>[ Motivation ]</div>

        {/* Title */}
        <div style={{ opacity: titleFade, transform: `translateY(${titleY}px)`, textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 72, color: C.dark, margin: 0, lineHeight: 0.95, letterSpacing: -2 }}>
            The <em style={{ color: C.rose, fontStyle: "italic" }}>Problem</em>
          </h2>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 20, color: C.muted, margin: "16px 0 0", fontStyle: "italic" }}>
            Diagnostic errors remain one of healthcare's most persistent and costly failures
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 28, width: "100%" }}>
          {stats.map((s, i) => {
            const delay = i * 25;
            const cardScale = spring({ frame: frame - 30 - delay, fps, config: { damping: 12, stiffness: 160 } });
            const cardFade = interpolate(frame, [30 + delay, 50 + delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div key={i} style={{
                flex: 1,
                background: C.card,
                border: `1.5px solid ${s.color}25`,
                borderRadius: 16,
                padding: "36px 32px",
                boxShadow: `0 4px 32px ${s.color}10`,
                opacity: cardFade,
                transform: `scale(${cardScale})`,
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}40)` }} />

                <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
                <div style={{
                  fontFamily: "Georgia, serif", fontSize: 72, color: s.color,
                  lineHeight: 1, fontWeight: 400, letterSpacing: -2, marginBottom: 10,
                }}>
                  {s.disp}
                </div>
                <div style={{ fontFamily: "sans-serif", fontSize: 20, color: C.dark, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: C.muted, letterSpacing: "0.08em" }}>{s.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Three-Agent System (360–660f = 12–22s) ─────────────────────────
const SceneAgents: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleFade = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 22], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const agents = [
    { name: "Interviewer", role: "Patient Intake", icon: "🩺", color: C.teal, delay: 20,
      feats: ["SOCRATES clinical framework", "Empathetic warm language", "Accepts 6 input modalities", "Decides completion criteria"] },
    { name: "Diagnostician", role: "Evidence-Based Dx", icon: "🔬", color: C.sky, delay: 50,
      feats: ["Queries 47,441 medical docs", "3–4 LLM-rewritten variants", "Ranked differential diagnosis", "PubMed citation per claim"] },
    { name: "Critic", role: "Safety Verifier", icon: "⚖️", color: C.rose, delay: 80,
      feats: ["Reviews reasoning chain", "Hallucination detection", "STEMI · Stroke · Drug safety", "Issues final verdict"] },
  ];

  // Flow arrows appear after cards
  const arrowFade = interpolate(frame, [130, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <GridBg opacity={0.03} />
      <GradientOrb cx={960} cy={1200} r={700} opacity={0.04} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
        <div style={{ opacity: titleFade, transform: `translateY(${titleY}px)`, textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: C.teal, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 10 }}>[ Core Innovation ]</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 68, color: C.dark, margin: 0, letterSpacing: -2, lineHeight: 0.95 }}>
            Three-<em style={{ color: C.sky, fontStyle: "italic" }}>Agent</em> Design
          </h2>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 18, color: C.muted, margin: "14px 0 0", fontStyle: "italic" }}>
            Mirroring a real multi-disciplinary clinical team
          </p>
        </div>

        <div style={{ display: "flex", gap: 20, width: "100%", alignItems: "stretch" }}>
          {agents.map((a, i) => {
            const sc = spring({ frame: frame - a.delay, fps, config: { damping: 12, stiffness: 150 } });
            const fade = interpolate(frame, [a.delay, a.delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <React.Fragment key={i}>
                <div style={{
                  flex: 1, background: C.card, borderRadius: 16,
                  border: `1.5px solid ${a.color}30`,
                  padding: "32px 28px",
                  boxShadow: `0 8px 40px ${a.color}12`,
                  opacity: fade, transform: `scale(${sc})`,
                  position: "relative", overflow: "hidden",
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: a.color }} />
                  <div style={{ fontSize: 44, marginBottom: 12 }}>{a.icon}</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 30, color: C.dark, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: a.color, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 20 }}>{a.role}</div>
                  <div style={{ height: 1, background: `${a.color}25`, marginBottom: 16 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                    {a.feats.map((f, j) => {
                      const fFade = interpolate(frame, [a.delay + 30 + j * 12, a.delay + 50 + j * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                      return (
                        <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", opacity: fFade }}>
                          <span style={{ color: a.color, fontSize: 16, marginTop: 1 }}>→</span>
                          <span style={{ fontFamily: "sans-serif", fontSize: 16, color: C.muted, lineHeight: 1.4 }}>{f}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Model badge */}
                  <div style={{ marginTop: 20, padding: "6px 12px", background: `${a.color}12`, borderRadius: 4, width: "fit-content" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: a.color, letterSpacing: "0.1em" }}>
                      {i === 0 ? "Claude claude-sonnet-4-6" : i === 1 ? "RAG-augmented · 47K docs" : "Hard-coded safety rules"}
                    </span>
                  </div>
                </div>

                {/* Arrow between cards */}
                {i < agents.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", opacity: arrowFade }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 2, height: 60, background: `linear-gradient(180deg, ${agents[i].color}, ${agents[i+1].color})`, borderRadius: 1 }} />
                      <span style={{ fontSize: 20, color: agents[i+1].color }}>▶</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: RAG 2.0 (660–960f = 22–32s) ────────────────────────────────────
const SceneRAG: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleFade = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const steps = [
    { num: "01", title: "LLM Query Rewrite", desc: "Patient language → SNOMED CT / MeSH terms", color: C.sky },
    { num: "02", title: "3–4 Variant Expansion", desc: "Raw · Medical · Treatment · Definition queries", color: C.cyan },
    { num: "03", title: "Qdrant Hybrid Search", desc: "Dense (BioLORD 768d) + BM25 sparse in parallel", color: C.teal },
    { num: "04", title: "RRF Fusion → Top 6", desc: "score = Σ 1/(k+rank) · threshold 0.15", color: C.sky },
    { num: "05", title: "Cited Diagnostic Output", desc: "PubMed ID · Authors · Year · Relevance score", color: C.teal },
  ];

  return (
    <AbsoluteFill style={{ background: C.light }}>
      <GridBg opacity={0.03} />
      <GradientOrb cx={1600} cy={540} r={500} opacity={0.06} />

      <div style={{ position: "absolute", inset: 0, display: "flex", gap: 60, padding: "60px 100px", alignItems: "center" }}>
        {/* Left: title + stats */}
        <div style={{ width: 420, flexShrink: 0 }}>
          <div style={{ opacity: titleFade, transform: `translateY(${titleY}px)` }}>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: C.teal, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 10 }}>[ Feature · PROJ-7 ]</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 72, color: C.dark, margin: 0, lineHeight: 0.92, letterSpacing: -2 }}>
              RAG <em style={{ color: C.teal, fontStyle: "italic" }}>2.0</em>
            </h2>
            <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${C.sky}, ${C.teal})`, margin: "20px 0" }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 17, color: C.muted, fontStyle: "italic", lineHeight: 1.6 }}>
              ChromaDB → Qdrant · BioLORD-2023 768d · BM25 + Dense · RRF fusion · 9.4× growth
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 32 }}>
            {[
              { val: 47441, label: "Medical Docs", suffix: "" },
              { val: 9, label: "× Knowledge Growth", suffix: ".4×" },
              { val: 768, label: "Embedding Dims", suffix: "d" },
              { val: 4, label: "Query Variants", suffix: "" },
            ].map((s, i) => {
              const fade = interpolate(frame, [30 + i * 15, 50 + i * 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const sc = spring({ frame: frame - 30 - i * 15, fps, config: { damping: 14, stiffness: 180 } });
              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: "20px 18px", opacity: fade, transform: `scale(${sc})`,
                  boxShadow: "0 2px 16px #0EA5E910",
                }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 36, color: C.teal, lineHeight: 1, letterSpacing: -1 }}>
                    <AnimatedCounter value={s.val} from={30 + i * 15} duration={70} suffix={s.suffix}
                      style={{ fontFamily: "Georgia, serif", fontSize: 36, color: C.teal }} />
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: pipeline steps */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map((s, i) => {
            const delay = 25 + i * 22;
            const fade = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const x = interpolate(frame, [delay, delay + 22], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            // Bar fill
            const barW = interpolate(frame, [delay + 10, delay + 50], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div key={i} style={{
                background: C.card, border: `1px solid ${s.color}20`,
                borderLeft: `4px solid ${s.color}`,
                borderRadius: "0 12px 12px 0",
                padding: "16px 22px 14px",
                opacity: fade, transform: `translateX(${x}px)`,
                boxShadow: "0 2px 16px #0EA5E908",
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: s.color, flexShrink: 0, marginTop: 2 }}>{s.num}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: C.dark, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontFamily: "sans-serif", fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{s.desc}</div>
                    {/* Progress bar */}
                    <div style={{ height: 3, background: `${s.color}15`, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                      <div style={{ width: `${barW}%`, height: "100%", background: `linear-gradient(90deg, ${s.color}, ${s.color}80)`, borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5: Multimodal + Safety (960–1260f = 32–42s) ───────────────────────
const SceneMultimodal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleFade = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const modalities = [
    { icon: "🩻", label: "DICOM Imaging", desc: "pydicom → HU normalise → Claude Vision", color: C.sky, delay: 20 },
    { icon: "🖼", label: "Medical Images", desc: "9-region annotation JSON overlay", color: C.teal, delay: 35 },
    { icon: "🎙", label: "Voice Recording", desc: "Web Speech API · 3 language codes", color: C.cyan, delay: 50 },
    { icon: "📹", label: "Video Frames", desc: "5 s capture interval · 6 max frames", color: C.sky, delay: 65 },
    { icon: "📄", label: "PDF / Text", desc: "Text extraction → semantic search", color: C.teal, delay: 80 },
    { icon: "✍", label: "OCR Handwriting", desc: "Claude Vision → structured text", color: C.cyan, delay: 95 },
  ];

  const safetyItems = [
    { cls: "Class 1", name: "Cardiac Emergency", trigger: "STEMI, chest pain + radiation", color: C.rose },
    { cls: "Class 1", name: "Stroke Protocol", trigger: "FAST criteria: face, arm, speech, time", color: C.amber },
    { cls: "Class 2", name: "Drug Interactions", trigger: "Anticoagulant + NSAID combinations", color: C.sky },
    { cls: "Class 3", name: "Reasoning Transparency", trigger: "Agent reasoning chain exposed", color: C.teal },
  ];

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <GridBg opacity={0.025} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "50px 100px" }}>
        <div style={{ opacity: titleFade, transform: `translateY(${titleY}px)`, marginBottom: 36 }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: C.sky, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>[ Features · PROJ-8 + PROJ-11 ]</div>
          <div style={{ display: "flex", gap: 40, alignItems: "baseline" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 62, color: C.dark, margin: 0, letterSpacing: -2 }}>
              Multimodal <em style={{ color: C.sky, fontStyle: "italic" }}>Input</em>
            </h2>
            <span style={{ fontFamily: "monospace", fontSize: 14, color: C.muted, letterSpacing: "0.1em" }}>+</span>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 62, color: C.dark, margin: 0, letterSpacing: -2 }}>
              <em style={{ color: C.rose, fontStyle: "italic" }}>Safety</em> Verification
            </h2>
          </div>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40 }}>
          {/* Left: 6 modalities */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {modalities.map((m, i) => {
              const sc = spring({ frame: frame - m.delay, fps, config: { damping: 12, stiffness: 180 } });
              const fade = interpolate(frame, [m.delay, m.delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  background: C.card, border: `1.5px solid ${m.color}20`, borderRadius: 12,
                  padding: "20px 16px", opacity: fade, transform: `scale(${sc})`,
                  boxShadow: `0 4px 20px ${m.color}0A`,
                  display: "flex", flexDirection: "column", gap: 8,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: m.color }} />
                  <div style={{ fontSize: 32 }}>{m.icon}</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: C.dark }}>{m.label}</div>
                  <div style={{ fontFamily: "sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{m.desc}</div>
                  <div style={{ position: "absolute", bottom: 10, right: 12 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 9, color: m.color, letterSpacing: "0.1em", background: `${m.color}12`, padding: "2px 7px", borderRadius: 3 }}>NEW</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Safety classes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              fontFamily: "monospace", fontSize: 11, color: C.rose, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4,
            }}>Safety Classification System</div>
            {safetyItems.map((s, i) => {
              const fade = interpolate(frame, [110 + i * 20, 128 + i * 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const x = interpolate(frame, [110 + i * 20, 132 + i * 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${s.color}20`,
                  borderLeft: `4px solid ${s.color}`, borderRadius: "0 12px 12px 0",
                  padding: "16px 20px",
                  opacity: fade, transform: `translateX(${x}px)`,
                  boxShadow: "0 2px 12px #00000008",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: s.color, background: `${s.color}15`, padding: "2px 8px", borderRadius: 3, letterSpacing: "0.1em" }}>{s.cls}</span>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 19, color: C.dark }}>{s.name}</span>
                  </div>
                  <div style={{ fontFamily: "sans-serif", fontSize: 14, color: C.muted }}>{s.trigger}</div>
                </div>
              );
            })}
            {/* Shield graphic */}
            <div style={{
              marginTop: "auto",
              background: `linear-gradient(135deg, ${C.rose}10, ${C.rose}05)`,
              border: `1px solid ${C.rose}20`, borderRadius: 12, padding: "20px",
              textAlign: "center",
              opacity: interpolate(frame, [200, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              <div style={{ fontSize: 40 }}>🛡</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: C.dark, marginTop: 8 }}>Pre-LLM Safety Evaluation</div>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, color: C.muted, marginTop: 4 }}>Rules checked before any AI call — O(1), injection-proof</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 6: Results Experience (1260–1560f = 42–52s) ───────────────────────
const SceneResults: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleFade = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tabs = [
    { label: "Diagnosis", icon: "🩺", color: C.teal, delay: 25 },
    { label: "Reasoning", icon: "🔗", color: C.sky, delay: 45 },
    { label: "Literature", icon: "📖", color: C.amber, delay: 65 },
    { label: "Media", icon: "🖼", color: C.cyan, delay: 85 },
  ];

  const diagItems = [
    { cond: "Stable Angina Pectoris", prob: 78, cite: "Fihn et al., JACC 2012 · PMID: 23182207" },
    { cond: "GERD with Atypical Presentation", prob: 45, cite: "Vakil et al., Am J Gastro 2006" },
    { cond: "Musculoskeletal Chest Pain", prob: 30, cite: "Klinkman et al., JAMA 1994" },
  ];

  const features = [
    { icon: "🌐", label: "3 Languages", desc: "EN / 中文 / 日本語", color: C.sky, delay: 160 },
    { icon: "📥", label: "PDF + JSON Export", desc: "Clinical record integration", color: C.teal, delay: 180 },
    { icon: "🔐", label: "Dual Auth Roles", desc: "Patient + Provider (JWT)", color: C.amber, delay: 200 },
    { icon: "📂", label: "Session History", desc: "SQLite persistence · 4 tables", color: C.cyan, delay: 220 },
  ];

  return (
    <AbsoluteFill style={{ background: C.light }}>
      <GridBg opacity={0.025} />
      <GradientOrb cx={200} cy={540} r={400} opacity={0.04} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "50px 100px", gap: 32 }}>
        {/* Title */}
        <div style={{ opacity: titleFade }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: C.sky, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 8 }}>[ System Experience ]</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 62, color: C.dark, margin: 0, letterSpacing: -2 }}>
            Diagnostic <em style={{ color: C.teal, fontStyle: "italic" }}>Results</em> Dashboard
          </h2>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 36 }}>
          {/* Left: Results mockup */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 8px 48px #0EA5E914", overflow: "hidden" }}>
            {/* Window bar */}
            <div style={{ background: C.dark, padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
              {["#F43F5E", "#F59E0B", "#10B981"].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
              ))}
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#ffffff60", marginLeft: 12 }}>MediChain — Results</span>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
              {tabs.map((t, i) => {
                const fade = interpolate(frame, [t.delay, t.delay + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const isActive = i === 0;
                return (
                  <div key={i} style={{
                    padding: "14px 22px", fontFamily: "sans-serif", fontSize: 15, fontWeight: isActive ? 600 : 400,
                    color: isActive ? t.color : C.muted,
                    borderBottom: isActive ? `2px solid ${t.color}` : "none",
                    display: "flex", gap: 8, alignItems: "center",
                    opacity: fade,
                  }}>
                    <span>{t.icon}</span> {t.label}
                  </div>
                );
              })}
            </div>

            {/* Critic verdict banner */}
            <div style={{
              margin: "16px 20px 0", padding: "12px 16px",
              background: `${C.teal}10`, border: `1px solid ${C.teal}30`, borderRadius: 8,
              display: "flex", gap: 12, alignItems: "center",
              opacity: interpolate(frame, [100, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <span style={{ fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, color: C.teal }}>Critic Agent — Consistent</span>
                <span style={{ fontFamily: "sans-serif", fontSize: 13, color: C.muted }}> · Reasoning verified · No safety flags triggered</span>
              </div>
            </div>

            {/* Diagnosis list */}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {diagItems.map((d, i) => {
                const fade = interpolate(frame, [110 + i * 20, 128 + i * 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={i} style={{
                    background: i === 0 ? `${C.teal}08` : C.light,
                    border: `1px solid ${i === 0 ? C.teal + "30" : C.border}`,
                    borderRadius: 10, padding: "14px 16px", opacity: fade,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 18, color: C.dark }}>{d.cond}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 13, color: C.teal, fontWeight: 700 }}>{d.prob}%</span>
                    </div>
                    {/* Probability bar */}
                    <div style={{ height: 4, background: `${C.teal}15`, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        width: `${interpolate(frame, [115 + i * 20, 155 + i * 20], [0, d.prob], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                        height: "100%", background: `linear-gradient(90deg, ${C.teal}, ${C.sky})`, borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, marginTop: 6 }}>📄 {d.cite}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Feature highlights */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map((f, i) => {
              const sc = spring({ frame: frame - f.delay, fps, config: { damping: 14, stiffness: 180 } });
              const fade = interpolate(frame, [f.delay, f.delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${f.color}20`, borderRadius: 12,
                  padding: "20px 20px", boxShadow: `0 4px 20px ${f.color}0A`,
                  opacity: fade, transform: `scale(${sc})`,
                  display: "flex", gap: 16, alignItems: "center",
                }}>
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: C.dark }}>{f.label}</div>
                    <div style={{ fontFamily: "sans-serif", fontSize: 14, color: C.muted, marginTop: 3 }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}

            {/* UNSW / Team info */}
            <div style={{
              marginTop: "auto", background: `linear-gradient(135deg, ${C.sky}08, ${C.teal}05)`,
              border: `1px solid ${C.sky}20`, borderRadius: 12, padding: "20px",
              opacity: interpolate(frame, [230, 250], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.sky, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>COMP9900 · UNSW Sydney</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: C.dark }}>Team 9900-W18C-CAKE</div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: C.muted, marginTop: 4 }}>48 Story Points · 2 Sprints · April 2026</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 7: Stats + Outro (1560–1800f = 52–60s) ────────────────────────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgFade = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bigStats = [
    { val: 47441, suffix: "", label: "Medical Documents in RAG", color: C.teal, delay: 10 },
    { val: 48, suffix: " SP", label: "Total Story Points", color: C.sky, delay: 30 },
    { val: 6, suffix: "", label: "Input Modalities", color: C.cyan, delay: 50 },
    { val: 3, suffix: "", label: "UI Languages", color: C.amber, delay: 70 },
    { val: 9, suffix: ".4×", label: "Knowledge Base Growth", color: C.rose, delay: 90 },
    { val: 768, suffix: "d", label: "Embedding Dimensions", color: C.teal, delay: 110 },
  ];

  const logoScale = spring({ frame: frame - 170, fps, config: { damping: 10, stiffness: 120 } });
  const logoFade = interpolate(frame, [165, 190], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagFade = interpolate(frame, [185, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.dark, opacity: bgFade }}>
      {/* Subtle grid */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <pattern id="grid-dark" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke={C.teal} strokeWidth="0.6" opacity="0.06" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dark)" />
      </svg>

      <GradientOrb cx={960} cy={300} r={600} opacity={0.08} />

      {/* Stats grid */}
      <div style={{ position: "absolute", top: 80, left: 100, right: 100, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {bigStats.map((s, i) => {
          const fade = interpolate(frame, [s.delay, s.delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const sc = spring({ frame: frame - s.delay, fps, config: { damping: 12, stiffness: 160 } });
          return (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}30`,
              borderRadius: 12, padding: "24px 24px",
              opacity: fade, transform: `scale(${sc})`,
            }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 52, color: s.color, lineHeight: 1, letterSpacing: -1 }}>
                <AnimatedCounter value={s.val} from={s.delay} duration={80} suffix={s.suffix}
                  style={{ fontFamily: "Georgia, serif", fontSize: 52, color: s.color }} />
              </div>
              <div style={{ fontFamily: "sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", marginTop: 6 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Divider line */}
      <div style={{
        position: "absolute", left: 100, right: 100, top: 520, height: 1,
        background: `linear-gradient(90deg, transparent, ${C.teal}50, transparent)`,
        opacity: interpolate(frame, [155, 172], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />

      {/* Outro logo + tagline */}
      <div style={{
        position: "absolute", bottom: 100, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        <div style={{ opacity: logoFade, transform: `scale(${logoScale})` }}>
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: 110, color: "#ffffff",
            margin: 0, lineHeight: 0.9, letterSpacing: -4,
          }}>
            Medi<em style={{ color: C.teal, fontStyle: "italic" }}>Chain</em>
          </h1>
        </div>
        <div style={{ opacity: tagFade, textAlign: "center" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "rgba(255,255,255,0.55)", margin: 0, fontStyle: "italic" }}>
            A Multi-Agent Collaborative System for Empathetic Clinical Diagnostic Reasoning
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 16 }}>
            {["COMP9900", "UNSW Sydney", "April 2026", "Team 9900-W18C-CAKE"].map((t, i) => (
              <span key={i} style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Transition overlay ───────────────────────────────────────────────────────
const Transition: React.FC<{ durationFrames?: number }> = ({ durationFrames = 15 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill style={{ background: "#ffffff", opacity, pointerEvents: "none", zIndex: 100 }} />
  );
};

// ─── Main Composition ─────────────────────────────────────────────────────────
export const MediChainVideo: React.FC = () => {
  // Scene timings (in frames at 30fps)
  const scenes = [
    { from: 0,    duration: 180, component: SceneTitle },       // 0–6s
    { from: 150,  duration: 240, component: SceneProblem },     // 5–13s (overlap 1s)
    { from: 360,  duration: 300, component: SceneAgents },      // 12–22s (overlap 1s)
    { from: 630,  duration: 330, component: SceneRAG },         // 21–32s
    { from: 930,  duration: 330, component: SceneMultimodal },  // 31–42s
    { from: 1230, duration: 330, component: SceneResults },     // 41–52s
    { from: 1530, duration: 270, component: SceneOutro },       // 51–60s
  ];

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: "sans-serif" }}>
      {scenes.map(({ from, duration, component: Scene }, i) => (
        <Sequence key={i} from={from} durationInFrames={duration}>
          <Scene />
          {/* Fade-in transition at start of each scene */}
          <Transition durationFrames={12} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
