import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AmbientBlobs, ECGLine, IllustBranch, IllustFlower, IllustLeaf, IllustWreath, ParticleField } from "../components/illustrations";
import { Banner, SevBadge } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import MediaUploadZone from "../components/MediaUploadZone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { SEV } from "../core/constants";

export default function InputPage({ api, onSubmit, onEval, selectedPatient, onClearPatient }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ description: "", bodyPart: "General", duration: "1–3 days", severity: 5, notes: selectedPatient?.conditions || "" });
  const [preContext, setPreContext] = useState([]);
  const [preItems, setPreItems] = useState([]);
  useEffect(() => { if (selectedPatient) setForm(f => ({ ...f, notes: selectedPatient.conditions || "" })); }, [selectedPatient]);

  const onMediaUpdate = useCallback((analyses, items) => {
    setPreContext(analyses);
    setPreItems(items);
  }, []);

  const bodyParts = t("input.body_parts", { returnObjects: true });
  const durations = t("input.durations", { returnObjects: true });
  const severityOptions = [
    { value: 2, label: t("common.mild"), description: t("input.mild_desc") },
    { value: 5, label: t("common.moderate"), description: t("input.moderate_desc") },
    { value: 9, label: t("common.severe"), description: t("input.severe_desc") },
  ];
  // Valid if: description typed, OR at least one fully-analysed file uploaded
  const hasReadyFile = preItems.some(it => !it.analysing && !it.error && it.analysis);
  const valid = form.description.trim().length > 15 || hasReadyFile;
  const s = SEV(form.severity);
  const activeSeverity = severityOptions.find(o => o.value === form.severity) || severityOptions[1];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingTop: 72, paddingBottom: 56, position: "relative", zIndex: 1, overflow: "hidden" }}>
      <AmbientBlobs />
      <ParticleField count={14} style={{ position: "fixed", inset: 0, opacity: 0.7 }} />
      <IllustLeaf w={200} h={300} style={{ position: "fixed", top: "-5%", right: "-2%", animation: "float1 9s ease-in-out infinite", pointerEvents: "none" }} color="var(--sage)" opacity={0.14} />
      <IllustBranch w={230} h={150} style={{ position: "fixed", bottom: "8%", left: "-2%", animation: "float2 11s ease-in-out infinite", pointerEvents: "none" }} opacity={0.16} />
      <IllustFlower size={110} style={{ position: "fixed", top: "30%", right: "1%", animation: "float3 8s ease-in-out infinite", pointerEvents: "none" }} color="var(--rose)" opacity={0.12} />
      <IllustLeaf w={110} h={165} style={{ position: "fixed", bottom: "22%", right: "7%", animation: "float1 10s 3s ease-in-out infinite", transform: "rotate(-35deg)", pointerEvents: "none" }} color="var(--amber)" opacity={0.12} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 28px 0", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div className="eyebrow hero-eyebrow">{t("input.eyebrow")}</div>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(48px,5.5vw,76px)", fontWeight: 400, color: "var(--ink)", lineHeight: 0.9, letterSpacing: -2, marginBottom: 20 }}>
                <span className="hero-line1">{t("input.title_line1")}</span>
                <span className="grad-heading hero-line2">{t("input.title_line2")}</span>
              </h1>
              <p className="hero-sub" style={{ fontFamily: "var(--body)", fontSize: 17, color: "var(--ink3)", maxWidth: 520, lineHeight: 1.75 }}>
                {t("input.subtitle")}
              </p>
              <div className="hero-badges" style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
                <div className="live-badge">
                  <div className="live-dot" />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--sage)", letterSpacing: "0.14em" }}>{t("input.agents_online")}</span>
                </div>
                <Button onClick={onEval} variant="outline" size="xs">{t("input.eval_btn")}</Button>
              </div>
            </div>
            <div className="fade-up s2" style={{ flexShrink: 0, animation: "drift 16s ease-in-out infinite" }}>
              <IllustWreath size={200} opacity={0.4} />
            </div>
          </div>
          <div className="gold-rule" style={{ marginTop: 28 }} />
          <ECGLine style={{ opacity: 0.38 }} />
        </div>

        {selectedPatient && (
          <div className="slide-r" style={{ marginBottom: 20, padding: "13px 20px", background: "var(--sagePale)", border: "1.5px solid rgba(46,104,56,0.4)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 14px rgba(46,104,56,0.14)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <span style={{ fontSize: 28, animation: "pulse 2s ease-in-out infinite" }}>{selectedPatient.gender === "Male" ? "👨" : selectedPatient.gender === "Female" ? "👩" : "🧑"}</span>
              <div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", color: "var(--ink)" }}>{selectedPatient.name}</p>
                <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--sage)", letterSpacing: "0.12em" }}>{t("input.profile_linked")}</p>
              </div>
            </div>
            <Button onClick={onClearPatient} variant="outline" size="xs">{t("input.unlink")}</Button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card fade-up s1" style={{ padding: "26px 30px" }}>
              <div className="shine" />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,var(--rosePale),var(--amberPale))", border: "1px solid var(--rose)30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🩺</div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{t("input.complaint_title")}</p>
              </div>
              <label className="ink-label">{t("input.complaint_label")}</label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={t("input.complaint_placeholder")}
                rows={6}
                className="text-[15px]"
                style={{ borderColor: valid ? "var(--sage)" : undefined, boxShadow: valid ? "0 0 0 3px var(--sageDim)" : undefined, fontFamily: "var(--body)" }}
              />
              {/* Symptom quick tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {["Chest pain", "Headache", "Fever", "Nausea", "Shortness of breath", "Fatigue", "Dizziness", "Back pain", "Abdominal pain", "Palpitations", "Cough", "Sore throat"].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, description: f.description ? f.description.trimEnd() + ", " + tag : tag }))}
                    style={{
                      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.05em",
                      color: "var(--ink3)", background: "var(--paper3)",
                      border: "1px solid rgba(22,15,6,0.14)", borderRadius: 20,
                      padding: "3px 10px", cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--rosePale)"; e.currentTarget.style.borderColor = "var(--rose)"; e.currentTarget.style.color = "var(--rose)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--paper3)"; e.currentTarget.style.borderColor = "rgba(22,15,6,0.14)"; e.currentTarget.style.color = "var(--ink3)"; }}
                  >{tag}</button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: valid ? "var(--sage)" : "var(--ink5)", transition: "color 0.3s" }}>
                  {valid && hasReadyFile && !form.description.trim()
                    ? `✓  ${preItems.filter(it => !it.analysing && !it.error && it.analysis).length} file(s) ready — text description optional`
                    : valid ? t("input.sufficient") : t("input.min_chars", { count: form.description.length })}
                </span>
                {valid && <Badge variant="sage" className="scale-in">{t("input.ready")}</Badge>}
              </div>
            </div>

            <div className="card fade-up s2" style={{ padding: "22px 30px" }}>
              <div className="shine" />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,var(--navyPale),var(--plumPale,#f0e8f4))", border: "1px solid rgba(22,50,104,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🩻</div>
                <div>
                  <p style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{t("input.media_title")}</p>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.1em" }}>{t("input.media_subtitle")}</p>
                </div>
                {preItems.length > 0 && (
                  <Badge variant="sage" className="ml-auto text-[10px]">{t("input.media_attached", { count: preItems.length })}</Badge>
                )}
              </div>
              <MediaUploadZone api={api} onUpdate={onMediaUpdate} />
            </div>

            <div className="card fade-up s3" style={{ padding: "22px 30px" }}>
              <div className="shine" />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,var(--amberPale),var(--goldPale))", border: "1px solid var(--amber)30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{t("input.params_title")}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[{ label: t("input.body_label"), key: "bodyPart", opts: bodyParts }, { label: t("input.duration_label"), key: "duration", opts: durations }].map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className="ink-label">{label}</label>
                    <Select value={form[key]} onValueChange={v => setForm({ ...form, [key]: v })}>
                      <SelectTrigger style={{ fontFamily: "var(--body)" }}>
                        <SelectValue placeholder={label} />
                      </SelectTrigger>
                      <SelectContent>
                        {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card fade-up s2" style={{ padding: "22px 24px" }}>
              <div className="shine" />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, border: `1px solid ${s.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "background 0.3s" }}>⚡</div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{t("input.severity_title")}</p>
              </div>
              <div style={{ textAlign: "center", margin: "8px 0 16px", padding: "18px 12px", background: "var(--paper3)", borderRadius: 4, border: "1px solid rgba(22,15,6,0.07)" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 58, fontWeight: 400, color: s.c, lineHeight: 1, display: "block", transition: "color 0.3s", animation: form.severity === "severe" ? "pulse 1.5s ease-in-out infinite" : "none" }}>{activeSeverity.label}</span>
                <p style={{ marginTop: 10, fontFamily: "var(--body)", fontSize: 14, lineHeight: 1.6, color: "var(--ink4)" }}>{activeSeverity.description}</p>
                <div style={{ marginTop: 10 }}><SevBadge n={form.severity} /></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {severityOptions.map(opt => {
                  const active = form.severity === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setForm({ ...form, severity: opt.value })}
                      style={{
                        width: "100%", textAlign: "left", borderRadius: 8,
                        border: active ? `1.5px solid ${s.c}` : "1px solid rgba(22,15,6,0.12)",
                        padding: "10px 12px",
                        background: active ? s.bg : "var(--paper2)",
                        transition: "all 0.2s ease", cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)" }}>{opt.label}</span>
                        {active && <Badge variant="sage" className="text-[10px]">{t("common.selected")}</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card fade-up s3" style={{ padding: "20px 24px" }}>
              <div className="shine" />
              <p style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>
                {t("input.history_title")} <em style={{ fontStyle: "italic", fontWeight: 300, fontSize: 13, color: "var(--ink4)" }}>{t("input.history_optional")}</em>
              </p>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder={t("input.history_placeholder")} rows={3} className="text-[15px]" style={{ resize: "none", fontFamily: "var(--body)" }} />
            </div>

            <Banner type="warn" style={{ animation: "none" }}>
              <strong style={{ color: "var(--amber)" }}>{t("common.disclaimer_title")}</strong>
              <span style={{ color: "var(--ink3)" }}> {t("common.disclaimer_body")}</span>
            </Banner>

            <Button
              onClick={() => {
                if (!valid) return;
                let description = form.description.trim();
                if (!description && hasReadyFile) {
                  // Auto-generate description from file analyses
                  const fileSummaries = preItems
                    .filter(it => !it.analysing && !it.error && it.analysis)
                    .map(it => `[${it.fileName}]: ${it.analysis.slice(0, 300)}`)
                    .join("\n\n");
                  description = `Medical record uploaded for analysis:\n\n${fileSummaries}`;
                }
                onSubmit({ ...form, description, patient_id: selectedPatient?.id || null, pre_context: preContext, pre_items: preItems });
              }}
              disabled={!valid || preItems.some(it => it.analysing)}
              size="xl" className="fade-up s4 w-full"
            >
              {t("input.begin")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
