import { useCallback, useEffect, useState } from "react";
import { AmbientBlobs } from "../components/illustrations";
import { Button } from "../components/ui/button";
import { fmtD } from "../core/utils";

export default function ProviderDashboard({ api }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.providerSessions();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function openSession(id) {
    if (selected === id) {
      setSelected(null);
      setDetail(null);
      setMessages([]);
      return;
    }

    setSelected(id);
    try {
      const [sess, msgs] = await Promise.all([
        api.session(id),
        api.sessionMessages(id).catch(() => []),
      ]);
      setDetail(sess);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setDetail(null);
      setMessages([]);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingTop: 72, paddingBottom: 40, position: "relative", zIndex: 1 }}>
      <AmbientBlobs />
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "24px 28px 0", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">Provider View</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 400, color: "var(--ink)", lineHeight: 0.95 }}>
              Session Records
            </h2>
            <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink4)", marginTop: 8 }}>
              {loading ? "Loading..." : `${rows.length} sessions`}
            </p>
          </div>
          <Button onClick={load} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.1fr 0.8fr 0.9fr 1.2fr", gap: 10, padding: "11px 16px", borderBottom: "1px solid rgba(22,15,6,0.1)", background: "var(--paper3)", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.1em" }}>
            <div>Chief Complaint / Patient</div>
            <div>Severity</div>
            <div>Status</div>
            <div>Created</div>
          </div>

          {loading ? (
            <div style={{ padding: 18, fontFamily: "var(--body)", color: "var(--ink4)" }}>Loading records...</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 18, fontFamily: "var(--body)", color: "var(--ink4)" }}>No records available.</div>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                onClick={() => openSession(r.id)}
                style={{ width: "100%", textAlign: "left", border: "none", background: selected === r.id ? "var(--rosePale)" : "var(--paper)", borderBottom: "1px solid rgba(22,15,6,0.08)", padding: "12px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: "2.1fr 0.8fr 0.9fr 1.2fr", gap: 10 }}
              >
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 14, color: "var(--ink2)", lineHeight: 1.5 }}>
                    {r.description || "(no description)"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)" }}>
                    Patient: {r.patient_username || "unknown"}
                  </p>
                </div>
                <div style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)" }}>{r.severity_level || "moderate"}</div>
                <div style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)" }}>{r.status || "-"}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink5)" }}>{fmtD(r.created_at)}</div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="card" style={{ marginTop: 16, padding: "14px 16px" }}>
            <p style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.1em" }}>
              SESSION DETAIL · {selected}
            </p>
            {detail && (
              <p style={{ margin: "8px 0 12px", fontFamily: "var(--body)", fontSize: 14, color: "var(--ink3)", whiteSpace: "pre-wrap" }}>
                {(detail.symptoms && detail.symptoms.description) || "-"}
              </p>
            )}
            <div style={{ maxHeight: 260, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((m) => (
                <div key={m.id} style={{ border: "1px solid rgba(22,15,6,0.12)", borderRadius: 6, padding: "8px 10px", background: "var(--paper2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.1em" }}>
                      {m.role === "agent" ? (m.agent_type || "agent") : m.role}
                    </span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)" }}>{fmtD(m.created_at)}</span>
                  </div>
                  <p style={{ margin: "5px 0 0", fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </p>
                </div>
              ))}
              {!messages.length && <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)" }}>No messages.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
