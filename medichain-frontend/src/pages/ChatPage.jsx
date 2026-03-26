import { useEffect, useRef, useState } from "react";
import { AmbientBlobs, ECGLine, IllustFlower, IllustLeaf, ParticleField } from "../components/illustrations";
import { AgentBadge, SevBadge, TypingDots } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { fmtT } from "../core/utils";

export default function ChatPage({ api, symptoms, onComplete, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("interviewing");
  const [sid, setSid] = useState(null);
  const [panel, setPanel] = useState(true);
  const msgEnd = useRef(null);
  const logEnd = useRef(null);

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
      setSid(d.session_id);
      setMsgs([{ role: "ai", agent: "interviewer", text: d.reply, time: new Date() }]);
      addLog("interviewer", "Session opened. Structured history-taking active.");
    } catch (e) {
      addLog("interviewer", `Connection error: ${e.message}`);
    }
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading || phase !== "interviewing" || !sid) return;
    const txt = input.trim();
    setInput("");
    setMsgs(p => [...p, { role: "user", text: txt, time: new Date() }]);
    setLoading(true);
    try {
      const d = await api.chat({ session_id: sid, user_message: txt });
      setMsgs(p => [...p, { role: "ai", agent: "interviewer", text: d.reply, time: new Date() }]);
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
        setTimeout(() => onComplete({ symptoms, date: new Date(), sessionId: sid, transcript: msgs.concat([{ role: "user", text: txt }]), diagnosis: dd.diagnosis || dd.result || JSON.stringify(dd), review: dd.review || dd.critique || "", refs: safeRefs }), 1500);
      }
    } catch (e) {
      addLog("interviewer", `Error: ${e.message}`);
    }
    setLoading(false);
  }

  const phaseConf = {
    interviewing: { label: "Taking history…", c: "var(--sage)", bg: "var(--sagePale)" },
    analyzing: { label: "Analysing…", c: "var(--amber)", bg: "var(--amberPale)" },
    done: { label: "Complete ✓", c: "var(--navy)", bg: "var(--navyPale)" },
  }[phase];

  return (
    <div style={{ height: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: 56, position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 42, borderBottom: "1px solid rgba(22,15,6,0.09)", background: "var(--paper2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={onBack} variant="outline" className="h-7 px-[13px] text-[13px]">← Back</Button>
          {sid && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.12em" }}>Session {sid.slice(0, 8).toUpperCase()}</span>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Badge className="rounded-[20px] px-3 py-[3px] text-[13px] italic" style={{ fontFamily: "var(--body)", color: phaseConf.c, background: phaseConf.bg, borderColor: `${phaseConf.c}40` }}>{phaseConf.label}</Badge>
          <Button onClick={() => setPanel(v => !v)} variant="outline" className="h-7 px-[13px] text-[13px]">{panel ? "Hide" : "Show"} reasoning</Button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: panel ? "0 0 54%" : 1, display: "flex", flexDirection: "column", borderRight: panel ? "1px solid rgba(22,15,6,0.09)" : "none" }}>
          <div style={{ padding: "9px 18px", borderBottom: "1px solid rgba(22,15,6,0.07)", background: "var(--sagePale)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Badge variant="sage" className="text-[9px]">Active case</Badge>
            <span style={{ fontFamily: "var(--body)", fontSize: 14, fontStyle: "italic", color: "var(--ink2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{symptoms.description}</span>
            <SevBadge n={symptoms.severity} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
                {m.role !== "user" && (
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,var(--sagePale),var(--sageDim))", border: "1.5px solid var(--sage)40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 2px 8px rgba(46,104,56,0.15)" }}>🩺</div>
                )}
                <div style={{ maxWidth: "78%" }}>
                  {m.role !== "user" && <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--sage)", marginBottom: 4, letterSpacing: "0.12em" }}>INTERVIEWER · {fmtT(m.time)}</p>}
                  <div className={m.role === "user" ? "bubble-user" : "bubble-ai"}>{m.text}</div>
                </div>
              </div>
            ))}
            {loading && phase === "interviewing" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,var(--sagePale),var(--sageDim))", border: "1.5px solid var(--sage)40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🩺</div>
                <div className="bubble-ai"><TypingDots /></div>
              </div>
            )}
            {phase === "analyzing" && (
              <div className="scale-in" style={{ margin: "20px 0", padding: "26px 24px", background: "var(--amberPale)", border: "1.5px solid var(--amber)40", borderRadius: 6, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 4px 28px rgba(160,88,8,0.15)" }}>
                <ParticleField count={8} style={{ opacity: 0.4 }} />
                <IllustFlower size={60} style={{ position: "absolute", top: -10, right: -10, animation: "float3 4s infinite", pointerEvents: "none" }} color="var(--amber)" opacity={0.3} />
                <div style={{ fontSize: 38, marginBottom: 10, animation: "pulse 1.5s ease-in-out infinite" }}>🔬</div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 19, fontStyle: "italic", color: "var(--amber)", marginBottom: 4, position: "relative", zIndex: 1 }}>Multi-agent analysis in progress…</p>
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", position: "relative", zIndex: 1 }}>Querying literature · Generating diagnosis · Peer review</p>
                <ECGLine style={{ marginTop: 14, opacity: 0.5 }} color="var(--amber)" />
              </div>
            )}
            {phase === "done" && (
              <div className="scale-in" style={{ margin: "18px 0", padding: "18px 22px", background: "var(--sagePale)", border: "1.5px solid var(--sage)40", borderRadius: 6, textAlign: "center" }}>
                <p style={{ fontFamily: "var(--serif)", fontSize: 19, fontStyle: "italic", color: "var(--sage)" }}>✓ Analysis complete — loading your report…</p>
              </div>
            )}
            <div ref={msgEnd} />
          </div>

          {phase === "interviewing" && (
            <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(22,15,6,0.09)", display: "flex", gap: 10, background: "var(--paper2)", flexShrink: 0 }}>
              <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Type your response…" disabled={loading} style={{ flex: 1, fontSize: 15, fontFamily: "var(--body)" }} />
              <Button onClick={send} disabled={!input.trim() || loading} className="h-10 px-[22px] text-sm shrink-0">Send →</Button>
            </div>
          )}
        </div>

        {panel && (
          <div style={{ flex: "0 0 46%", display: "flex", flexDirection: "column", background: "var(--paper2)", position: "relative", overflow: "hidden" }}>
            <IllustLeaf w={70} h={105} style={{ position: "absolute", bottom: -10, right: -5, opacity: 0.1, pointerEvents: "none", animation: "float1 9s infinite" }} color="var(--sage)" />
            <div style={{ padding: "11px 20px", borderBottom: "1px solid rgba(22,15,6,0.09)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink2)" }}>Agent reasoning log</p>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)" }}>{logs.length} entries</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
              {logs.length === 0 && <p style={{ fontFamily: "var(--body)", fontSize: 14, fontStyle: "italic", color: "var(--ink5)", paddingTop: 40, textAlign: "center" }}>Awaiting agent activity…</p>}
              {logs.map((log, i) => (
                <div key={log.id} className="slide-r" style={{ marginBottom: 18, paddingBottom: 14, borderBottom: i < logs.length - 1 ? "1px dashed rgba(22,15,6,0.09)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <AgentBadge k={log.agent} sm />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)" }}>{fmtT(log.time)}</span>
                  </div>
                  <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</p>
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
