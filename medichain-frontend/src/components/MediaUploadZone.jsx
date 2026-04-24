import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { SPEECH_LOCALES } from "../config/uiLanguages";

const ACCEPTED_TYPES = {
  image: { exts: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".dcm"], icon: "🩻", label: "Image", color: "var(--rose)" },
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

const REGION_COLOR = {
  "UPPER-LEFT": "var(--navy)", "UPPER-CENTER": "var(--navy)", "UPPER-RIGHT": "var(--navy)",
  "CENTER-LEFT": "var(--plum)", "CENTER": "var(--plum)", "CENTER-RIGHT": "var(--plum)",
  "LOWER-LEFT": "var(--sage)", "LOWER-CENTER": "var(--sage)", "LOWER-RIGHT": "var(--sage)",
  "OVERALL": "var(--rose)",
};

function AnnotationTags({ annotations }) {
  if (!annotations?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
      <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.1em" }}>ANNOTATIONS</p>
      {annotations.map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 8, color: "#fff",
            background: REGION_COLOR[a.region] || "var(--ink4)",
            borderRadius: 3, padding: "1px 5px", flexShrink: 0, letterSpacing: "0.06em",
          }}>{a.region}</span>
          <span style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink3)", lineHeight: 1.45 }}>{a.finding}</span>
        </div>
      ))}
    </div>
  );
}

function AttachmentChip({ item, onRemove, onOcrResult, api }) {
  const { t } = useTranslation();
  const [ocring, setOcring] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const kind = ACCEPTED_TYPES[item.fileType] || ACCEPTED_TYPES.txt;

  async function runOcr() {
    if (!item.file || ocring) return;
    setOcring(true);
    setOcrText("");
    try {
      const res = await api.analyzeOcr(item.file);
      setOcrText(res.ocr_text || "");
      onOcrResult?.(item.id, res.ocr_text || "");
    } catch (e) {
      setOcrText(`OCR failed: ${e.message}`);
    }
    setOcring(false);
  }

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
        {/* OCR button for images */}
        {item.fileType === "image" && !item.analysing && item.file && (
          <button
            onClick={runOcr}
            disabled={ocring}
            title="Extract text / OCR medical record"
            style={{
              background: ocring ? "var(--amberPale)" : "transparent",
              border: "1px solid rgba(22,15,6,0.15)",
              borderRadius: 5, cursor: ocring ? "not-allowed" : "pointer",
              fontSize: 11, padding: "2px 6px", color: "var(--amber)", fontFamily: "var(--mono)",
              letterSpacing: "0.06em",
            }}
          >{ocring ? "…" : "📋 OCR"}</button>
        )}
        <button onClick={() => onRemove(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink5)", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4 }}>×</button>
      </div>
      {item.analysisPreview && !item.analysing && (
        <div>
          <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink4)", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
            {analysisExpanded || item.analysisPreview.length <= 300
              ? item.analysisPreview
              : item.analysisPreview.slice(0, 300) + "…"}
          </p>
          {item.analysisPreview.length > 300 && (
            <button
              onClick={() => setAnalysisExpanded(v => !v)}
              style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink4)", background: "none", border: "none", cursor: "pointer", padding: "2px 0", letterSpacing: "0.06em" }}
            >{analysisExpanded ? "▲ Show less" : "▼ Show full analysis"}</button>
          )}
        </div>
      )}
      {item.annotations?.length > 0 && !item.analysing && (
        <AnnotationTags annotations={item.annotations} />
      )}
      {ocrText && (
        <div style={{ background: "var(--amberPale)", border: "1px solid rgba(160,88,8,0.2)", borderRadius: 7, padding: "8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)", letterSpacing: "0.1em", margin: 0 }}>OCR · EXTRACTED MEDICAL RECORD</p>
            {ocrText.length > 400 && (
              <button
                onClick={() => setOcrExpanded(v => !v)}
                style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", letterSpacing: "0.06em" }}
              >{ocrExpanded ? "▲ Collapse" : "▼ Show all"}</button>
            )}
          </div>
          <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink2)", lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0 }}>
            {ocrExpanded || ocrText.length <= 400 ? ocrText : ocrText.slice(0, 400) + "…"}
          </p>
        </div>
      )}
      {item.error && (
        <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--rose)", margin: 0 }}>{item.error}</p>
      )}
    </div>
  );
}


// ── Main export ────────────────────────────────────────────
export default function MediaUploadZone({ api, onUpdate, disabled }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [audioLang, setAudioLang] = useState("en-US");
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const fileInputRef = useRef(null);

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
      annotations: [], previewUrl, error: null, file,
    }]);

    try {
      const res = await api.analyzeFile(file, kind === "audio" ? audioLang : "en-US");
      setItems(prev => prev.map(it => it.id !== id ? it : {
        ...it,
        analysing: false,
        analysis: res.analysis || "",
        analysisPreview: res.analysis_preview || "",
        analysisLength: (res.analysis || "").length,
        annotations: res.annotations || [],
      }));
    } catch (err) {
      setItems(prev => prev.map(it => it.id !== id ? it : {
        ...it, analysing: false, error: err.message || "Analysis failed",
      }));
    }
  }, [api, audioLang]);

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
    setCompareResult(null);
  }


  const readyImages = items.filter(it => it.fileType === "image" && !it.analysing && !it.error && it.file);

  async function runCompare() {
    if (readyImages.length < 2) return;
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await api.analyzeCompare(readyImages.map(it => it.file));
      setCompareResult(res.analysis);
    } catch (err) {
      setCompareResult(`Error: ${err.message}`);
    }
    setComparing(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Audio language selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.08em" }}>{t("upload.audio_lang")}</span>
        {SPEECH_LOCALES.map(l => (
          <button
            key={l.code}
            onClick={() => setAudioLang(l.code)}
            style={{
              fontFamily: "var(--mono)", fontSize: 11, padding: "3px 10px",
              borderRadius: 5, border: "1.5px solid",
              borderColor: audioLang === l.code ? "var(--navy)" : "rgba(22,15,6,0.15)",
              background: audioLang === l.code ? "var(--navyPale)" : "none",
              color: audioLang === l.code ? "var(--navy)" : "var(--ink4)",
              cursor: "pointer", fontWeight: audioLang === l.code ? 700 : 400,
              transition: "all 0.15s",
            }}
          >{l.label}</button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--rose)" : "rgba(22,15,6,0.18)"}`,
          borderRadius: 12, padding: "20px 18px", textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: dragging ? "var(--roseDim)" : "var(--paper3)",
          transition: "all 0.18s", opacity: disabled ? 0.5 : 1,
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
          {t("upload.drop_types")} · DICOM
        </p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--navy)", letterSpacing: "0.08em", marginTop: 6, opacity: 0.7 }}>
          🔍 Upload 2+ images to enable before/after comparison
        </p>
      </div>


      {/* Attachment chips */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(item => (
            <AttachmentChip
              key={item.id}
              item={item}
              onRemove={removeItem}
              api={api}
              onOcrResult={(id, ocrText) => {
                setItems(prev => prev.map(it => it.id !== id ? it : {
                  ...it,
                  analysis: it.analysis + `\n\n**OCR — Extracted Medical Record:**\n${ocrText}`,
                  analysisLength: it.analysis.length + ocrText.length,
                }));
              }}
            />
          ))}
        </div>
      )}

      {/* Multi-image compare — shown as soon as 1 image is ready */}
      {readyImages.length >= 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runCompare}
              disabled={readyImages.length < 2 || comparing || disabled}
              style={{ gap: 6, flex: 1 }}
            >
              <span style={{ fontSize: 14 }}>🔍</span>
              {comparing ? "Comparing…" : readyImages.length >= 2 ? `Compare ${readyImages.length} images` : "Compare images"}
            </Button>
            {readyImages.length < 2 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                +{2 - readyImages.length} more image needed
              </span>
            )}
          </div>
          {compareResult && (
            <div style={{
              background: "var(--navyPale)", border: "1px solid rgba(22,15,6,0.12)",
              borderRadius: 8, padding: "12px 14px",
            }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--navy)", letterSpacing: "0.1em", marginBottom: 6 }}>
                IMAGE COMPARISON · {readyImages.length} IMAGES
              </p>
              <p style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink3)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {compareResult}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
