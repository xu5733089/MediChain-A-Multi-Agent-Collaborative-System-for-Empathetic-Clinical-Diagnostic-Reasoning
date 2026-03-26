import { useCallback, useEffect, useState } from "react";
import { AmbientBlobs, ECGLine, IllustFlower, IllustLeaf } from "../components/illustrations";
import { Button } from "../components/ui/button";
import { fmtD } from "../core/utils";

export default function HistoryPage({ api, onNew }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await api.sessions());
    } catch {}
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);

  async function loadDetail(id) {
    if (sel === id) {
      setSel(null);
      setDetail(null);
      return;
    }
    setSel(id);
    try {
      setDetail(await api.session(id));
    } catch {}
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingTop: 72, paddingBottom: 56, position: "relative", zIndex: 1, overflow: "hidden" }}>
      <AmbientBlobs />
      <IllustLeaf w={150} h={225} style={{ position: "fixed", top: "12%", right: "0%", animation: "float1 9s ease-in-out infinite", pointerEvents: "none" }} color="var(--amber)" opacity={0.13} />
      <div style={{ maxWidth: 910, margin: "0 auto", padding: "28px 28px 0", position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 18 }}>
          <div>
            <div className="eyebrow">Consultation Records</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 400, color: "var(--ink)", letterSpacing: -1.2, lineHeight: 0.9 }}>
              Session<br /><span className="grad-heading">History</span>
            </h2>
            <p style={{ fontFamily: "var(--body)", fontSize: 15, color: "var(--ink4)", marginTop: 10 }}>
              {loading ? "Loading…" : `${sessions.length} consultations on record`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={load} variant="outline" className="h-9 px-5 text-sm">↻ Refresh</Button>
            <Button onClick={onNew} className="h-9 px-6 text-sm">+ New consult</Button>
          </div>
        </div>
        <div className="gold-rule" />
        <ECGLine style={{ opacity: 0.32, marginBottom: 22 }} />

        {loading
          ? <div style={{ textAlign: "center", padding: 80, fontFamily: "var(--body)", fontStyle: "italic", color: "var(--ink4)", fontSize: 17 }}>Loading records…</div>
          : sessions.length === 0
            ? (
              <div style={{ textAlign: "center", padding: "80px 40px", border: "1.5px dashed rgba(22,15,6,0.18)", borderRadius: 6 }}>
                <IllustFlower size={90} opacity={0.28} color="var(--rose)" style={{ margin: "0 auto 18px" }} />
                <p style={{ fontFamily: "var(--serif)", fontSize: 26, fontStyle: "italic", color: "var(--ink3)", marginBottom: 8 }}>No records yet</p>
                <p style={{ fontFamily: "var(--body)", fontSize: 16, color: "var(--ink4)" }}>Start a consultation to build your history.</p>
              </div>
            )
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {sessions.map((s, i) => (
                  <div key={s.id} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div onClick={() => loadDetail(s.id)} className="card lift"
                      style={{ padding: "16px 24px", cursor: "pointer", borderColor: sel === s.id ? "var(--rose)" : undefined, borderRadius: sel === s.id ? "6px 6px 0 0" : 6, transition: "all 0.25s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", color: "var(--ink)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</p>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)" }}>{fmtD(s.created_at)}</span>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: s.status === "done" ? "var(--sage)" : "var(--amber)", letterSpacing: "0.1em" }}>● {s.status}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 20, color: "var(--ink5)", marginLeft: 16, transition: "transform 0.25s", display: "inline-block", transform: sel === s.id ? "rotate(180deg)" : "none" }}>↓</span>
                      </div>
                    </div>
                    {sel === s.id && detail && (
                      <div className="scale-in" style={{ background: "var(--paper3)", border: "1.5px solid var(--rose)40", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "18px 24px" }}>
                        {detail.status === "done" && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                            <Button onClick={() => window.open(api.exportUrl(s.id, "pdf"), "_blank")} className="h-8 px-4 text-[13px]">📄 PDF</Button>
                            <Button onClick={() => window.open(api.exportUrl(s.id, "json"), "_blank")} variant="outline" className="h-8 px-3 text-[13px]">JSON</Button>
                          </div>
                        )}
                        <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink3)", lineHeight: 1.84 }}>
                          {detail.diagnosis?.slice(0, 450)}{detail.diagnosis?.length > 450 ? "\n…" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
        }
      </div>
    </div>
  );
}
