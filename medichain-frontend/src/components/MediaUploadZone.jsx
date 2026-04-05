import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

const ACCEPTED_TYPES = {
  image: { exts: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"], icon: "🩻", label: "Image", color: "var(--rose)" },
  audio: { exts: [".mp3", ".wav", ".m4a", ".ogg", ".flac"], icon: "🎵", label: "Audio", color: "var(--navy)" },
  video: { exts: [".mp4", ".mov", ".avi", ".mkv", ".webm"], icon: "🎬", label: "Video", color: "var(--plum)" },
  pdf:   { exts: [".pdf"], icon: "📄", label: "PDF", color: "var(--amber)" },
  txt:   { exts: [".txt"], icon: "📝", label: "TXT", color: "var(--sage)" },
};

const ALL_ACCEPT = Object.values(ACCEPTED_TYPES).flatMap(t => t.exts).join(",");

function getFileKind(filename) {
  const ext = ("." + filename.split(".").pop()).toLowerCase();
  return Object.entries(ACCEPTED_TYPES).find(([, { exts }]) => exts.includes(ext))?.[0] || null;
}

function AttachmentChip({ item, onRemove }) {
  const { t } = useTranslation();
  const kind = ACCEPTED_TYPES[item.fileType] || ACCEPTED_TYPES.txt;
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      background: "var(--paper)", border: "1px solid rgba(22,15,6,0.12)",
      borderRadius: 10, padding: "10px 12px", position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {item.previewUrl && item.fileType === "image" ? (
          <img src={item.previewUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
        ) : item.previewUrl && item.fileType === "video" ? (
          <video src={item.previewUrl} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} muted />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${kind.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {item.analysing ? "⏳" : kind.icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink2)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.fileName}</p>
          <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: kind.color, letterSpacing: "0.1em", marginTop: 1 }}>
            {item.analysing ? t("upload.analysing") : kind.label.toUpperCase()}
            {!item.analysing && item.analysisLength ? ` · ${item.analysisLength} chars` : ""}
          </p>
        </div>
        <button onClick={() => onRemove(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink5)", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4 }}>×</button>
      </div>
      {item.analysisPreview && !item.analysing && (
        <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink4)", lineHeight: 1.55, margin: 0 }}>
          {item.analysisPreview.slice(0, 160)}{item.analysisPreview.length > 160 ? "…" : ""}
        </p>
      )}
      {item.error && (
        <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--rose)", margin: 0 }}>{item.error}</p>
      )}
    </div>
  );
}

// ── Microphone recorder using Web Speech API ───────────────
function MicButton({ onTranscript, disabled }) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  // Single ref object to avoid stale-closure issues across restarts
  const sr = useRef({ active: false, text: "", rec: null });
  const supported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function launch() {
    const s = sr.current;
    if (!s.active) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = e => {
      let buf = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) s.text += e.results[i][0].transcript + " ";
        else buf += e.results[i][0].transcript;
      }
      setInterim(buf);
    };

    rec.onerror = e => {
      // "aborted" fires when stop() is called — ignore it, onend handles finalization
      if (e.error === "aborted" || e.error === "no-speech" || e.error === "audio-capture") return;
      s.rec = null;
      if (s.active) setTimeout(launch, 250);
      else { setRecording(false); setInterim(""); }
    };

    rec.onend = () => {
      s.rec = null;
      setInterim("");
      if (s.active) {
        // Delay prevents rapid-restart rejection by Chrome
        setTimeout(launch, 150);
      } else {
        setRecording(false);
        if (s.text.trim()) onTranscript(s.text.trim());
        s.text = "";
      }
    };

    try { rec.start(); s.rec = rec; }
    catch (_) { if (s.active) setTimeout(launch, 300); }
  }

  function start() {
    sr.current = { active: true, text: "", rec: null };
    setRecording(true);
    launch();
  }

  function stop() {
    const s = sr.current;
    s.active = false;
    if (s.rec) {
      s.rec.stop(); // onend will finalize
    } else {
      // No active rec (between restarts) — finalize immediately
      setRecording(false);
      if (s.text.trim()) onTranscript(s.text.trim());
      s.text = "";
    }
  }

  useEffect(() => () => { sr.current.active = false; sr.current.rec?.abort(); }, []);

  if (!supported) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Button
        type="button"
        variant={recording ? "danger" : "outline"}
        size="sm"
        onClick={recording ? stop : start}
        disabled={disabled}
        style={{ gap: 6 }}
      >
        <span style={{ fontSize: 15 }}>{recording ? "⏹" : "🎙"}</span>
        {recording ? t("upload.stop") : t("upload.record")}
      </Button>
      {interim && (
        <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink4)", fontStyle: "italic", lineHeight: 1.5 }}>
          {interim}
        </p>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────
export default function MediaUploadZone({ api, onUpdate, disabled }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Notify parent whenever items change
  useEffect(() => {
    const analyses = items
      .filter(it => !it.analysing && it.analysis)
      .map(it => it.analysis);
    onUpdate(analyses, items);
  }, [items, onUpdate]);

  const processFile = useCallback(async (file) => {
    const kind = getFileKind(file.name);
    if (!kind) return;

    const id = Math.random().toString(36).slice(2);
    const previewUrl = (kind === "image" || kind === "video") ? URL.createObjectURL(file) : null;

    setItems(prev => [...prev, {
      id, fileName: file.name, fileType: kind,
      analysing: true, analysis: "", analysisPreview: "", analysisLength: 0,
      previewUrl, error: null,
    }]);

    try {
      const res = await api.analyzeFile(file);
      setItems(prev => prev.map(it => it.id !== id ? it : {
        ...it,
        analysing: false,
        analysis: res.analysis || "",
        analysisPreview: res.analysis_preview || "",
        analysisLength: (res.analysis || "").length,
      }));
    } catch (err) {
      setItems(prev => prev.map(it => it.id !== id ? it : {
        ...it, analysing: false, error: err.message || "Analysis failed",
      }));
    }
  }, [api]);

  function handleFiles(files) {
    Array.from(files).forEach(processFile);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeItem(id) {
    setItems(prev => {
      const item = prev.find(it => it.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(it => it.id !== id);
    });
  }

  function onMicTranscript(text) {
    const id = Math.random().toString(36).slice(2);
    setItems(prev => [...prev, {
      id, fileName: "Voice recording", fileType: "audio",
      analysing: false,
      analysis: `Voice recording transcription:\n\n${text}`,
      analysisPreview: text,
      analysisLength: text.length,
      previewUrl: null, error: null,
    }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--rose)" : "rgba(22,15,6,0.18)"}`,
          borderRadius: 12,
          padding: "20px 18px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: dragging ? "var(--roseDim)" : "var(--paper3)",
          transition: "all 0.18s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALL_ACCEPT}
          style={{ display: "none" }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
          disabled={disabled}
        />
        <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>🩻🎵🎬</div>
        <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink3)", marginBottom: 4 }}>
          {t("upload.drop_title")} <span style={{ color: "var(--rose)", fontWeight: 600 }}>{t("upload.drop_browse")}</span>
        </p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.08em" }}>
          {t("upload.drop_types")}
        </p>
      </div>

      {/* Microphone button */}
      <MicButton onTranscript={onMicTranscript} disabled={disabled} />

      {/* Attachment chips */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(item => (
            <AttachmentChip key={item.id} item={item} onRemove={removeItem} />
          ))}
        </div>
      )}
    </div>
  );
}
