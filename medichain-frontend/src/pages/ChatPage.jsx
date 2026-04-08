import { useCallback, useEffect, useRef, useState } from "react";

const SOCRATES_DIMS = [
  { key: "S", label: "Site",      keywords: ["where", "location", "site", "located", "part of your body", "which area"] },
  { key: "O", label: "Onset",     keywords: ["when", "start", "onset", "began", "how long", "first notice"] },
  { key: "C", label: "Character", keywords: ["describe", "character", "feel like", "sharp", "dull", "burning", "aching", "crushing", "pressure", "what does"] },
  { key: "R", label: "Radiation", keywords: ["spread", "radiat", "arm", "jaw", "back", "shoulder", "neck", "anywhere else", "move"] },
  { key: "A", label: "Associated", keywords: ["associated", "other symptom", "nausea", "fever", "sweat", "vomit", "shortness", "dizz", "alongside"] },
  { key: "T", label: "Timing",    keywords: ["constant", "come and go", "intermittent", "how often", "timing", "always there", "episode", "continuous"] },
  { key: "E", label: "Factors",   keywords: ["worse", "better", "reliev", "exacerbat", "trigger", "aggravat", "rest", "exercise", "eating", "stress", "position"] },
  { key: "S2", label: "Severity", keywords: ["severe", "mild", "moderate", "rate", "scale", "how bad", "affect your", "daily", "impact"] },
];

function detectSocrates(msgs) {
  const aiText = msgs.filter(m => m.role === "ai").map(m => (m.text || "").toLowerCase()).join(" ");
  return new Set(SOCRATES_DIMS.filter(d => d.keywords.some(kw => aiText.includes(kw))).map(d => d.key));
}
import { useTranslation } from "react-i18next";
import { AmbientBlobs, ECGLine, IllustFlower, IllustLeaf, ParticleField } from "../components/illustrations";
import { AgentBadge, SevBadge, TypingDots } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { fmtT } from "../core/utils";
import CameraCapture from "../components/CameraCapture";

export default function ChatPage({ api, symptoms, onComplete, onBack }) {
  const { t } = useTranslation();
  const [msgs, setMsgs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("interviewing");
  const [sid, setSid] = useState(null);
  const [panel, setPanel] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMeta, setUploadMeta] = useState(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadImageUrl, setUploadImageUrl] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [safetyAlert, setSafetyAlert] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState(null); // { displayed, full, time }
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  // Single ref object — avoids stale-closure issues across restarts
  const msgEnd = useRef(null);
  const logEnd = useRef(null);

  // cleanup streaming on unmount
  useEffect(() => () => { if (streamRef.current) clearInterval(streamRef.current); }, []);

  const pushAiMsg = useCallback((text, time = new Date()) => {
    if (streamRef.current) clearInterval(streamRef.current);
    let i = 0;
    setStreamingMsg({ displayed: "", full: text, time });
    streamRef.current = setInterval(() => {
      i += 4;
      if (i >= text.length) {
        clearInterval(streamRef.current);
        streamRef.current = null;
        setStreamingMsg(null);
        setMsgs(p => [...p, { role: "ai", agent: "interviewer", text, time }]);
      } else {
        setStreamingMsg(s => s ? { ...s, displayed: text.slice(0, i) } : null);
      }
    }, 16);
  }, []);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { logEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  const addLog = useCallback((ag, text, time = new Date()) => {
    setLogs(p => [...p, { id: Math.random().toString(36).slice(2), agent: ag, text, time }]);
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.start(symptoms);
      setSid(d.session_id);
      const safety = d?.safety || null;
      if ((safety?.final_risk || safety?.risk_level) === "high") {
        setSafetyAlert({
          final_risk: "high",
          message: safety?.warning || safety?.message || "This may be a serious condition. Seek urgent medical care.",
        });
      } else {
        setSafetyAlert(null);
      }
      try {
        const files = await api.sessionUploads(d.session_id);
        setUploadedFiles(Array.isArray(files) ? files : []);
      } catch {
        setUploadedFiles([]);
      }
      setMsgs([]);
      pushAiMsg(d.reply);
      addLog("interviewer", "Session opened. Structured history-taking active.");
    } catch (e) {
      addLog("interviewer", `Connection error: ${e.message}`);
    }
    setLoading(false);
  }, [api, symptoms, addLog]);

  useEffect(() => { init(); }, [init]);

  async function send() {
    if (!input.trim() || loading || phase !== "interviewing" || !sid) return;
    const txt = input.trim();
    const attachments = [...pendingAttachments];
    setInput("");
    setPendingAttachments([]);
    setMsgs(p => [
      ...p,
      ...attachments.map(a => ({ role: "user", text: `📎 ${a}`, time: new Date() })),
      { role: "user", text: txt, time: new Date() },
    ]);
    setLoading(true);
    try {
      const d = await api.chat({ session_id: sid, user_message: txt, attachments });
      const safety = d?.safety || null;
      if ((safety?.final_risk || safety?.risk_level) === "high") {
        setSafetyAlert({
          final_risk: "high",
          message: safety?.warning || safety?.message || "This may be a serious condition. Seek urgent medical care.",
        });
      }
      // Clear one-shot upload chip after content has been sent into the chat turn.
      setUploadMeta(null);
      setUploadPreview("");
      setUploadError("");
      if (uploadImageUrl) {
        URL.revokeObjectURL(uploadImageUrl);
        setUploadImageUrl(null);
      }
      pushAiMsg(d.reply);
      addLog("interviewer", d.trigger_diagnose ? "Sufficient history collected. Initiating multi-agent pipeline." : "Continuing structured intake.");
      if (d.trigger_diagnose) {
        setPhase("analyzing");
        addLog("diagnostician", "Querying ChromaDB vector store (MedQuAD corpus)…");
        await new Promise(r => setTimeout(r, 700));
        const dd = await api.diagnose({ session_id: sid });
        addLog("diagnostician", dd.diagnosis);
        if (dd.refs?.length > 0) addLog("diagnostician", `Retrieved ${dd.refs.length} supporting references.`);
        addLog("critic", "Initiating senior peer review…");
        await new Promise(r => setTimeout(r, 400));
        addLog("critic", dd.review);
        setPhase("done");
        const safeRefs = Array.isArray(dd.refs) ? dd.refs : Array.isArray(dd.references) ? dd.references : [];
        const fullSession = await api.session(sid);
        const transcript = Array.isArray(fullSession?.messages)
          ? fullSession.messages.filter(m => m.role === "user" || m.role === "ai")
          : [];
        setTimeout(() => onComplete({ symptoms, date: new Date(), sessionId: sid, transcript, diagnosis: dd.diagnosis || dd.result || JSON.stringify(dd), review: dd.review || dd.critique || "", refs: safeRefs, cot: dd.cot || null, mediaItems: symptoms.pre_items || [] }), 1500);
      }
    } catch (e) {
      addLog("interviewer", `Error: ${e.message}`);
    }
    setLoading(false);
  }

  function onCameraCapture({ transcript, frameAnalyses }) {
    // Build combined context message
    const parts = [];
    if (transcript) parts.push(`**Patient description (transcribed):**\n${transcript}`);
    if (frameAnalyses.length > 0) {
      parts.push(`**Video frame analysis (${frameAnalyses.length} frames captured):**`);
      frameAnalyses.forEach(f => parts.push(`Frame ${f.frame}: ${f.analysis}`));
    }
    const combined = parts.join("\n\n");
    if (combined) {
      setPendingAttachments(prev => [...prev, combined]);
      setInput(prev => prev || transcript || "Please review my video description above.");
    }
  }

  const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const AUDIO_EXTS = [".mp3", ".wav", ".m4a", ".ogg", ".flac"];
  const VIDEO_EXTS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

  async function onUploadFile(e) {
    const f = e.target.files?.[0];
    if (!f || !sid || uploading) return;

    const lowerName = f.name.toLowerCase();
    const isImage = IMAGE_EXTS.some(ext => lowerName.endsWith(ext));
    const isAudio = AUDIO_EXTS.some(ext => lowerName.endsWith(ext));
    const isVideo = VIDEO_EXTS.some(ext => lowerName.endsWith(ext));
    const isPdf = lowerName.endsWith(".pdf");
    const isTxt = lowerName.endsWith(".txt");

    if (!isImage && !isAudio && !isVideo && !isPdf && !isTxt) {
      setUploadError("Supported: PDF, TXT, images (JPG/PNG…), audio (MP3/WAV…), video (MP4/MOV…).");
      e.target.value = "";
      return;
    }

    // Show local image/video preview immediately before upload completes
    if (isImage || isVideo) {
      const objectUrl = URL.createObjectURL(f);
      setUploadImageUrl(objectUrl);
    } else {
      setUploadImageUrl(null);
    }

    setUploadError("");
    setUploading(true);
    try {
      const res = await api.uploadSessionFile(sid, f);
      const up = res?.upload || null;
      setUploadMeta(up);
      setUploadPreview(up?.extracted_text_preview || "");
      const typeLabel = isImage ? "IMAGE" : isAudio ? "AUDIO" : isVideo ? "VIDEO" : (up?.file_type || (isPdf ? "pdf" : "txt")).toUpperCase();
      const attachmentSummary = `Uploaded file: ${up?.file_name || f.name} (${typeLabel})`;
      setPendingAttachments(p => [...p, attachmentSummary]);
      try {
        const files = await api.sessionUploads(sid);
        setUploadedFiles(Array.isArray(files) ? files : []);
      } catch {}
      const logSuffix = isImage
        ? `medical image analysed (${up?.extracted_text_length || 0} chars of AI analysis).`
        : isAudio
        ? `audio transcribed (${up?.extracted_text_length || 0} chars).`
        : isVideo
        ? `video frames analysed (${up?.extracted_text_length || 0} chars).`
        : `extracted ${up?.extracted_text_length || 0} characters.`;
      addLog("interviewer", `Uploaded ${up?.file_name || f.name}; ${logSuffix}`);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
      setUploadImageUrl(null);
      addLog("interviewer", `Upload failed: ${err.message || "unknown error"}`);
    }
    setUploading(false);
    e.target.value = "";
  }

  function clearUploadedFileView() {
    setUploadMeta(null);
    setUploadPreview("");
    setUploadError("");
    if (uploadImageUrl) {
      URL.revokeObjectURL(uploadImageUrl);
      setUploadImageUrl(null);
    }
  }

  const phaseConf = {
    interviewing: { label: t("chat.taking_history"), c: "var(--sage)", bg: "var(--sagePale)" },
    analyzing: { label: t("chat.analysing"), c: "var(--amber)", bg: "var(--amberPale)" },
    done: { label: t("chat.complete"), c: "var(--navy)", bg: "var(--navyPale)" },
  }[phase];

  return (
    <div style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 0, background: "var(--paper)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 44, borderBottom: "1px solid rgba(22,15,6,0.09)", background: "var(--paper2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={onBack} variant="outline" size="xs">{t("common.back")}</Button>
          {sid && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.12em" }}>{t("chat.session", { id: sid.slice(0, 8).toUpperCase() })}</span>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Badge className="rounded-[20px] px-3 py-[3px] text-[13px] italic" style={{ fontFamily: "var(--body)", color: phaseConf.c, background: phaseConf.bg, borderColor: `${phaseConf.c}40` }}>{phaseConf.label}</Badge>
          <Button onClick={() => setPanel(v => !v)} variant="outline" size="xs">{panel ? t("chat.hide_reasoning") : t("chat.show_reasoning")}</Button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: panel ? "0 0 54%" : 1, display: "flex", flexDirection: "column", borderRight: panel ? "1px solid rgba(22,15,6,0.09)" : "none" }}>
          <div style={{ padding: "9px 18px", borderBottom: "1px solid rgba(22,15,6,0.07)", background: "var(--sagePale)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Badge variant="sage" className="text-[9px]">{t("chat.active_case")}</Badge>
            <span style={{ fontFamily: "var(--body)", fontSize: 14, fontStyle: "italic", color: "var(--ink2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{symptoms.description}</span>
            <SevBadge n={symptoms.severity_level || symptoms.severity || "moderate"} />
          </div>
          {phase === "interviewing" && (() => {
            const covered = detectSocrates(msgs);
            const coveredCount = covered.size;
            return (
              <div style={{ padding: "7px 18px", borderBottom: "1px solid rgba(22,15,6,0.06)", background: "var(--paper2)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.12em", flexShrink: 0 }}>SOCRATES</span>
                  <div style={{ display: "flex", gap: 5, flex: 1 }}>
                    {SOCRATES_DIMS.map(dim => {
                      const done = covered.has(dim.key);
                      return (
                        <div key={dim.key} title={dim.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div style={{ width: "100%", height: 4, borderRadius: 2, background: done ? "var(--sage)" : "rgba(22,15,6,0.1)", transition: "background 0.4s ease" }} />
                          <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: done ? "var(--sage)" : "var(--ink5)", letterSpacing: "0.05em", transition: "color 0.4s ease" }}>{dim.key === "S2" ? "Sev" : dim.key}</span>
                        </div>
                      );
                    })}
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: coveredCount >= 6 ? "var(--sage)" : "var(--ink5)", flexShrink: 0 }}>{coveredCount}/8</span>
                </div>
              </div>
            );
          })()}

          {safetyAlert?.final_risk === "high" && (
            <div style={{ padding: "10px 18px 0", background: "var(--paper2)", flexShrink: 0 }}>
              <Alert
                variant="error"
                style={{ marginBottom: 8, borderWidth: 2, fontFamily: "var(--body)", fontSize: 13 }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong style={{ marginRight: 8 }}>Safety Warning:</strong>
                    {safetyAlert.message}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSafetyAlert(null)}
                    aria-label="Dismiss safety warning"
                    title="Dismiss"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--rose)",
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                      padding: 0,
                      marginTop: -1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </Alert>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px" }}>
            {msgs.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 10, marginBottom: 16, alignItems: "flex-end" }}>
                  {!isUser && (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,var(--sagePale),var(--sageDim))", border: "1.5px solid var(--sage)40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 2px 8px rgba(46,104,56,0.15)" }}>🩺</div>
                  )}
                  <div style={isUser ? { width: "78%", display: "flex", justifyContent: "flex-end" } : { maxWidth: "78%" }}>
                    {!isUser && <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--sage)", marginBottom: 4, letterSpacing: "0.12em" }}>INTERVIEWER · {fmtT(m.time)}</p>}
                    <div className={isUser ? "bubble-user" : "bubble-ai"}>{m.text}</div>
                  </div>
                </div>
              );
            })}
            {streamingMsg && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,var(--sagePale),var(--sageDim))", border: "1.5px solid var(--sage)40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 2px 8px rgba(46,104,56,0.15)" }}>🩺</div>
                <div style={{ maxWidth: "78%" }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--sage)", marginBottom: 4, letterSpacing: "0.12em" }}>INTERVIEWER · {fmtT(streamingMsg.time)}</p>
                  <div className="bubble-ai">{streamingMsg.displayed}<span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--sage)", marginLeft: 2, verticalAlign: "text-bottom", animation: "blink 0.8s step-end infinite" }} /></div>
                </div>
              </div>
            )}
            {loading && !streamingMsg && phase === "interviewing" && (
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
                <p style={{ fontFamily: "var(--serif)", fontSize: 19, fontStyle: "italic", color: "var(--amber)", marginBottom: 4, position: "relative", zIndex: 1 }}>{t("chat.pipeline_progress")}</p>
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", position: "relative", zIndex: 1 }}>{t("chat.pipeline_desc")}</p>
                <ECGLine style={{ marginTop: 14, opacity: 0.5 }} color="var(--amber)" />
              </div>
            )}
            {phase === "done" && (
              <div className="scale-in" style={{ margin: "18px 0", padding: "18px 22px", background: "var(--sagePale)", border: "1.5px solid var(--sage)40", borderRadius: 6, textAlign: "center" }}>
                <p style={{ fontFamily: "var(--serif)", fontSize: 19, fontStyle: "italic", color: "var(--sage)" }}>{t("chat.analysis_done")}</p>
              </div>
            )}
            <div ref={msgEnd} />
          </div>

          {phase === "interviewing" && (
            <div style={{ padding: "10px 18px 12px", borderTop: "1px solid rgba(22,15,6,0.09)", background: "var(--paper2)", flexShrink: 0 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.mov,.avi,.mkv,.webm,application/pdf,text/plain,image/*,audio/*,video/*"
                style={{ display: "none" }}
                onChange={onUploadFile}
              />

              {(uploadedFiles.length > 0 || uploadMeta || uploadError) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 9 }}>
                  {uploadedFiles.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.08em" }}>
                        {t("chat.context_files", { count: uploadedFiles.length })}
                      </span>
                      <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink4)" }}>
                        {uploadedFiles.slice(0, 3).map(f => f.file_name).join(" · ")}
                        {uploadedFiles.length > 3 ? ` · +${uploadedFiles.length - 3} more` : ""}
                      </span>
                    </div>
                  )}

                  {!!uploadMeta && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content", maxWidth: "100%", background: "var(--paper)", border: "1px solid rgba(22,15,6,0.14)", borderRadius: 999, padding: "6px 10px" }}>
                        <span style={{ fontSize: 12, lineHeight: 1 }}>
                          {uploadMeta.file_type === "image" ? "🩻" : uploadMeta.file_type === "audio" ? "🎵" : uploadMeta.file_type === "video" ? "🎬" : "📄"}
                        </span>
                        <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 380 }}>
                          {uploadMeta.file_name} · {uploadMeta.file_type.toUpperCase()} · {uploadMeta.extracted_text_length} chars
                        </span>
                        <button
                          type="button"
                          onClick={clearUploadedFileView}
                          style={{ border: "none", background: "transparent", color: "var(--ink5)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
                          title="Dismiss"
                        >
                          ×
                        </button>
                      </div>
                      {(uploadMeta.file_type === "image" || uploadMeta.file_type === "video") && uploadImageUrl && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          {uploadMeta.file_type === "video" ? (
                            <video
                              src={uploadImageUrl}
                              controls
                              style={{ maxHeight: 120, maxWidth: 220, borderRadius: 6, border: "1px solid rgba(22,15,6,0.14)", background: "#000" }}
                            />
                          ) : (
                          <img
                            src={uploadImageUrl}
                            alt="Uploaded medical image"
                            style={{ maxHeight: 120, maxWidth: 180, borderRadius: 6, border: "1px solid rgba(22,15,6,0.14)", objectFit: "contain", background: "#f8f8f8" }}
                          />
                          )}
                          {!!uploadPreview && (
                            <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink5)", lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
                              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink4)", display: "block", marginBottom: 2 }}>{t("chat.analysis_preview")}</span>
                              {uploadPreview.slice(0, 200)}{uploadPreview.length > 200 ? "…" : ""}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {pendingAttachments.length > 0 && (
                    <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink5)", lineHeight: 1.5, maxWidth: 760 }}>
                      {t("chat.queued", { count: pendingAttachments.length })}
                    </p>
                  )}

                  {!!uploadError && (
                    <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--rose)" }}>
                      Upload error: {uploadError}
                    </p>
                  )}

                  {!!uploadMeta && !["image", "video"].includes(uploadMeta.file_type) && !!uploadPreview && (
                    <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink5)", lineHeight: 1.5, maxWidth: 760 }}>
                      {uploadPreview.slice(0, 160)}{uploadPreview.length > 160 ? "…" : ""}
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="icon"
                  disabled={!sid || uploading}
                  title={t("chat.attach_file")}
                  className="shrink-0"
                  style={{ borderRadius: 999 }}
                >
                  {uploading ? "…" : "📎"}
                </Button>
                <CameraCapture
                  api={api}
                  onCapture={onCameraCapture}
                  onClose={() => setCameraOpen(false)}
                  disabled={!sid || loading || phase !== "interviewing"}
                />
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder={t("chat.placeholder")} disabled={loading} style={{ flex: 1, fontSize: 15, fontFamily: "var(--body)", borderRadius: 999 }} />
                <Button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  size="lg"
                  className="shrink-0"
                  style={{ minWidth: 112, borderRadius: 999 }}
                >
                  {t("chat.send")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {panel && (
          <div style={{ flex: "0 0 46%", display: "flex", flexDirection: "column", background: "var(--paper2)", position: "relative", overflow: "hidden" }}>
            <IllustLeaf w={70} h={105} style={{ position: "absolute", bottom: -10, right: -5, opacity: 0.1, pointerEvents: "none", animation: "float1 9s infinite" }} color="var(--sage)" />
            <div style={{ padding: "11px 20px", borderBottom: "1px solid rgba(22,15,6,0.09)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink2)" }}>{t("chat.reasoning_log")}</p>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)" }}>{t("chat.log_entries", { count: logs.length })}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
              {logs.length === 0 && <p style={{ fontFamily: "var(--body)", fontSize: 14, fontStyle: "italic", color: "var(--ink5)", paddingTop: 40, textAlign: "center" }}>{t("chat.log_empty")}</p>}
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
