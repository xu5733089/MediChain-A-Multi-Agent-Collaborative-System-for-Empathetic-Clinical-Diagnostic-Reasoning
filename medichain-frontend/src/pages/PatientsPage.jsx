import { useEffect, useState } from "react";
import { AmbientBlobs, IllustBranch, IllustFlower } from "../components/illustrations";
import { FormField, InkDivider } from "../components/ui";
import { fmtD } from "../core/utils";

export default function PatientsPage({ api, onStartConsult }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editP, setEditP] = useState(null);
  const blank = { name: "", dob: "", gender: "", blood_type: "", allergies: "", medications: "", conditions: "", notes: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [selP, setSelP] = useState(null);
  const [pSess, setPSess] = useState([]);
  const ff = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setPatients(await api.patients());
    } catch {}
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      if (editP) {
        await api.updatePatient(editP.id, form);
      } else {
        await api.createPatient(form);
      }
      await load();
      setShowForm(false);
      setEditP(null);
      setForm(blank);
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  }

  async function del(id) {
    if (!confirm("Delete this patient profile?")) return;
    await api.deletePatient(id);
    load();
  }

  async function pick(p) {
    if (selP?.id === p.id) {
      setSelP(null);
      setPSess([]);
      return;
    }
    setSelP(p);
    try {
      setPSess(await api.patientSessions(p.id));
    } catch {}
  }

  function startEdit(p) {
    setEditP(p);
    setForm({
      name: p.name,
      dob: p.dob || "",
      gender: p.gender || "",
      blood_type: p.blood_type || "",
      allergies: p.allergies || "",
      medications: p.medications || "",
      conditions: p.conditions || "",
      notes: p.notes || "",
    });
    setShowForm(true);
  }

  const genderEmoji = g => g === "Male" ? "👨" : g === "Female" ? "👩" : "🧑";
  const bgColors = ["linear-gradient(135deg,var(--rosePale),var(--amberPale))", "linear-gradient(135deg,var(--sagePale),var(--navyPale))", "linear-gradient(135deg,var(--amberPale),var(--goldPale))", "linear-gradient(135deg,var(--navyPale),var(--plumPale))"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingTop: 72, paddingBottom: 56, position: "relative", zIndex: 1, overflow: "hidden" }}>
      <AmbientBlobs />
      <IllustBranch w={190} h={124} style={{ position: "fixed", bottom: "6%", right: "-1%", animation: "float3 10s ease-in-out infinite", pointerEvents: "none", transform: "scaleX(-1)" }} opacity={0.13} />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 28px 0", position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 18 }}>
          <div>
            <div className="eyebrow">Patient Registry</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 400, color: "var(--ink)", letterSpacing: -1.2, lineHeight: 0.9 }}>
              Patient<br /><span className="grad-heading">Profiles</span>
            </h2>
            <p style={{ fontFamily: "var(--body)", fontSize: 15, color: "var(--ink4)", marginTop: 10 }}>{patients.length} profiles in registry</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditP(null); setForm(blank); }} className="btn-rose" style={{ padding: "12px 26px", fontSize: 15 }}>+ New profile</button>
        </div>
        <div className="gold-rule" style={{ marginBottom: 24 }} />

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(22,15,6,0.62)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(6px)" }}
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div className="card scale-in" style={{ width: "100%", maxWidth: 530, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-xl)", padding: "34px 38px" }}>
              <div className="shine" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.16em", marginBottom: 5 }}>{editP ? "EDIT PROFILE" : "NEW PROFILE"}</p>
                  <h3 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 400, fontStyle: "italic", color: "var(--ink)" }}>{editP ? "Update information" : "Create patient profile"}</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="btn-outline" style={{ width: 34, height: 34, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, borderRadius: "50%", flexShrink: 0 }}>×</button>
              </div>
              <InkDivider style={{ margin: "0 0 18px" }} />
              <FormField label="Full Name *" value={form.name} onChange={ff("name")} placeholder="Patient full name" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ marginBottom: 16 }}>
                  <label className="ink-label">Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => ff("dob")(e.target.value)} className="field" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="ink-label">Gender</label>
                  <select value={form.gender} onChange={e => ff("gender")(e.target.value)} className="field" style={{ background: "var(--paper)" }}>
                    <option value="">—</option>
                    {["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <FormField label="Blood Type" value={form.blood_type} onChange={ff("blood_type")} placeholder="A+, B-, O+, AB+…" />
              <FormField label="Known Allergies" value={form.allergies} onChange={ff("allergies")} placeholder="Penicillin, latex, NSAIDs…" />
              <FormField label="Current Medications" value={form.medications} onChange={ff("medications")} placeholder="Metformin 500mg bd…" />
              <FormField label="Chronic Conditions" value={form.conditions} onChange={ff("conditions")} placeholder="Type 2 Diabetes, Hypertension…" />
              <FormField label="Clinical Notes" value={form.notes} onChange={ff("notes")} placeholder="Additional clinical notes…" />
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowForm(false)} className="btn-outline" style={{ flex: 1, padding: "12px" }}>Cancel</button>
                <button onClick={save} disabled={!form.name.trim() || saving} className="btn-rose" style={{ flex: 2, padding: "12px", fontSize: 15 }}>
                  {saving ? "Saving…" : editP ? "Save changes" : "Create profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading
          ? <div style={{ textAlign: "center", padding: 80, fontFamily: "var(--body)", fontStyle: "italic", color: "var(--ink4)", fontSize: 17 }}>Loading registry…</div>
          : patients.length === 0
            ? <div style={{ textAlign: "center", padding: "80px 40px", border: "1.5px dashed rgba(22,15,6,0.18)", borderRadius: 6 }}>
                <IllustFlower size={90} opacity={0.28} color="var(--rose)" style={{ margin: "0 auto 18px" }} />
                <p style={{ fontFamily: "var(--serif)", fontSize: 24, fontStyle: "italic", color: "var(--ink3)" }}>No profiles yet</p>
              </div>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(294px,1fr))", gap: 13 }}>
                {patients.map((p, i) => (
                  <div key={p.id} className="card fade-up" style={{ animationDelay: `${i * 0.05}s`, overflow: "hidden", borderColor: selP?.id === p.id ? "var(--rose)" : undefined }}>
                    <div className="shine" />
                    <div style={{ height: 8, background: bgColors[i % bgColors.length] }} />
                    <div onClick={() => pick(p)} style={{ padding: "18px 20px", cursor: "pointer" }}>
                      <div style={{ display: "flex", gap: 13, marginBottom: 12 }}>
                        <div style={{ width: 50, height: 50, borderRadius: 14, background: bgColors[i % bgColors.length], border: "1px solid rgba(22,15,6,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, boxShadow: "var(--shadow-sm)", animation: selP?.id === p.id ? "pulse 2s ease-in-out infinite" : "none" }}>
                          {genderEmoji(p.gender)}
                        </div>
                        <div>
                          <p style={{ fontFamily: "var(--serif)", fontSize: 17, fontStyle: "italic", color: "var(--ink)", fontWeight: 400 }}>{p.name}</p>
                          <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                            {p.gender && <span className="tag" style={{ fontSize: 9, padding: "2px 8px" }}>{p.gender}</span>}
                            {p.blood_type && <span className="tag rose" style={{ fontSize: 9, padding: "2px 8px" }}>{p.blood_type}</span>}
                            {p.dob && <span className="tag" style={{ fontSize: 9, padding: "2px 8px" }}>{new Date(p.dob).getFullYear()}</span>}
                          </div>
                        </div>
                      </div>
                      {p.conditions && <p style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink4)", fontStyle: "italic", lineHeight: 1.5 }}>{p.conditions.slice(0, 72)}{p.conditions.length > 72 ? "…" : ""}</p>}
                    </div>
                    <div style={{ borderTop: "1px solid rgba(22,15,6,0.08)", padding: "9px 16px", display: "flex", gap: 7 }}>
                      <button onClick={() => onStartConsult(p)} className="btn-rose" style={{ flex: 1, padding: "7px", fontSize: 13 }}>+ Consult</button>
                      <button onClick={() => startEdit(p)} className="btn-outline" style={{ padding: "7px 13px", fontSize: 13 }}>Edit</button>
                      <button onClick={() => del(p.id)} style={{ padding: "7px 13px", fontSize: 13, border: "1.5px solid var(--rose)45", color: "var(--rose)", background: "var(--roseDim)", borderRadius: 4, cursor: "pointer", fontFamily: "var(--body)", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--rosePale)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--roseDim)"; }}>Del</button>
                    </div>
                    {selP?.id === p.id && pSess.length > 0 && (
                      <div className="scale-in" style={{ borderTop: "1px solid rgba(22,15,6,0.08)", padding: "12px 18px", background: "var(--paper3)" }}>
                        <p className="ink-label" style={{ marginBottom: 8 }}>Past sessions ({pSess.length})</p>
                        {pSess.slice(0, 3).map(s => (
                          <div key={s.id} style={{ marginBottom: 8 }}>
                            <p style={{ fontFamily: "var(--body)", fontSize: 12.5, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{s.description}</p>
                            <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)" }}>{fmtD(s.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}
