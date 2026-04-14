import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { AmbientBlobs } from "../components/illustrations";
import { Button } from "../components/ui/button";
import { fmtD } from "../core/utils";

function dedupeProviderRows(items) {
  const rows = Array.isArray(items) ? [...items] : [];
  rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const chosen = [];
  const WINDOW_MS = 10 * 60 * 1000;

  for (const row of rows) {
    const keyPatient = row.patient_id || row.patient_username || "";
    const keyDesc = (row.description || "").trim().toLowerCase();
    const t = new Date(row.created_at || 0).getTime();

    let replaced = false;
    for (let i = 0; i < chosen.length; i++) {
      const cur = chosen[i];
      const curPatient = cur.patient_id || cur.patient_username || "";
      const curDesc = (cur.description || "").trim().toLowerCase();
      const curT = new Date(cur.created_at || 0).getTime();

      const sameTask = keyPatient === curPatient && keyDesc && keyDesc === curDesc;
      const closeEnough = Number.isFinite(t) && Number.isFinite(curT) && Math.abs(t - curT) <= WINDOW_MS;
      if (!sameTask || !closeEnough) continue;

      const rowDone = row.status === "done";
      const curDone = cur.status === "done";
      if (rowDone && !curDone) {
        chosen[i] = row;
      }
      replaced = true;
      break;
    }

    if (!replaced) chosen.push(row);
  }

  return chosen;
}

function StatCard({ icon, value, label, color = "var(--rose)" }) {
  return (
    <div className="card" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 400, color, lineHeight: 1, letterSpacing: -1 }}>{value}</p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>{label}</p>
      </div>
    </div>
  );
}

export default function ProviderDashboard({ api }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: statusFilter || undefined,
        severity_level: severityFilter || undefined,
        q: keyword.trim() || undefined,
        from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        to: dateTo ? `${dateTo}T23:59:59` : undefined,
      };
      const data = await api.providerSessions(filters);
      setRows(dedupeProviderRows(data));
    } catch { setRows([]); }
    setLoading(false);
  }, [api, statusFilter, severityFilter, keyword, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  async function openSession(id) {
    if (selected === id) { setSelected(null); setDetail(null); setMessages([]); return; }
    setSelected(id);
    try {
      const [sess, msgs] = await Promise.all([api.session(id), api.sessionMessages(id).catch(() => [])]);
      setDetail(sess);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch { setDetail(null); setMessages([]); }
  }

  function renderSafetyMessage(content) {
    try {
      const payload = JSON.parse(content || "{}");
      const level = (payload.final_risk || payload.risk_level || "low").toLowerCase();
      const levelColor =
        level === "high" ? "var(--rose)"
          : level === "medium" ? "var(--amber)"
            : "var(--sage)";
      const warning = (payload.warning || "").trim();
      const message = (payload.message || "").trim();

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.1em" }}>
              Risk Level
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: levelColor,
                background: "rgba(22,15,6,0.06)",
                border: "1px solid rgba(22,15,6,0.1)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              {level.toUpperCase()}
            </span>
          </div>
          {!!warning && (
            <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--rose)", lineHeight: 1.6 }}>
              ⚠ {warning}
            </p>
          )}
          {!!message && (
            <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.6 }}>
              {message}
            </p>
          )}
          {!warning && !message && (
            <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)", lineHeight: 1.6 }}>
              No additional safety warning for this turn.
            </p>
          )}
        </div>
      );
    } catch {
      return (
        <p style={{ margin: "5px 0 0", fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {content}
        </p>
      );
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", paddingTop: 72, paddingBottom: 40, position: "relative", zIndex: 1 }}>
      <AmbientBlobs />
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "24px 28px 0", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">{t("provider.eyebrow")}</div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 44, fontWeight: 400, color: "var(--ink)", lineHeight: 0.95 }}>{t("provider.title")}</h2>
            <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink4)", marginTop: 8 }}>
              {loading ? t("provider.loading") : t("provider.count", { count: rows.length })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={async () => {
              setIngesting(true); setIngestResult(null);
              try {
                const res = await api.ragIngest({});
                setIngestResult(res);
              } catch (e) { setIngestResult({ error: e.message }); }
              setIngesting(false);
            }} variant="outline" size="sm" disabled={ingesting}>
              {ingesting ? "Ingesting PubMed…" : "Update RAG Knowledge"}
            </Button>
            <Button onClick={load} variant="outline" size="sm">{t("provider.refresh")}</Button>
          </div>
        </div>

        {ingestResult && (
          <div className="card" style={{ padding: "12px 16px", marginBottom: 12, background: ingestResult.error ? "var(--rosePale)" : "var(--paper2)" }}>
            {ingestResult.error ? (
              <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--rose)" }}>Ingestion failed: {ingestResult.error}</p>
            ) : (
              <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)" }}>
                Added <strong>{ingestResult.total_added}</strong> articles from {ingestResult.terms_processed} search terms. DB size: {ingestResult.initial_db_size} → <strong>{ingestResult.final_db_size}</strong>
              </p>
            )}
          </div>
        )}
        <div className="card" style={{ marginBottom: 14, padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr 1fr 1fr", gap: 10 }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: 34, border: "1px solid rgba(22,15,6,0.14)", borderRadius: 6, background: "var(--paper)", padding: "0 10px", fontFamily: "var(--body)", fontSize: 13 }}>
            <option value="">All Status</option>
            <option value="interviewing">Interviewing</option>
            <option value="analyzing">Analyzing</option>
            <option value="done">Done</option>
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ height: 34, border: "1px solid rgba(22,15,6,0.14)", borderRadius: 6, background: "var(--paper)", padding: "0 10px", fontFamily: "var(--body)", fontSize: 13 }}>
            <option value="">All Severity</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search complaint..."
            style={{ height: 34, border: "1px solid rgba(22,15,6,0.14)", borderRadius: 6, background: "var(--paper)", padding: "0 10px", fontFamily: "var(--body)", fontSize: 13 }}
          />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ height: 34, border: "1px solid rgba(22,15,6,0.14)", borderRadius: 6, background: "var(--paper)", padding: "0 10px", fontFamily: "var(--body)", fontSize: 13 }} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ height: 34, border: "1px solid rgba(22,15,6,0.14)", borderRadius: 6, background: "var(--paper)", padding: "0 10px", fontFamily: "var(--body)", fontSize: 13 }} />
        </div>

        {!loading && rows.length > 0 && (() => {
          const today = new Date().toDateString();
          const todayCount = rows.filter(r => new Date(r.created_at).toDateString() === today).length;
          const highRisk = rows.filter(r => (r.severity_level || "").toLowerCase() === "severe").length;
          const doneCount = rows.filter(r => r.status === "done").length;
          const uniquePatients = new Set(rows.map(r => r.patient_username || r.patient_id).filter(Boolean)).size;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
              <StatCard icon="📋" value={rows.length} label="Total Sessions" color="var(--rose)" />
              <StatCard icon="📅" value={todayCount} label="Today" color="var(--navy)" />
              <StatCard icon="⚠️" value={highRisk} label="Severe Cases" color="var(--amber)" />
              <StatCard icon="👤" value={uniquePatients} label="Unique Patients" color="var(--sage)" />
            </div>
          );
        })()}

        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.1fr 0.8fr 0.9fr 1.2fr", gap: 10, padding: "11px 16px", borderBottom: "1px solid rgba(22,15,6,0.1)", background: "var(--paper3)", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.1em" }}>
            <div>{t("provider.col_complaint")}</div>
            <div>{t("provider.col_severity")}</div>
            <div>{t("provider.col_status")}</div>
            <div>{t("provider.col_created")}</div>
          </div>

          {loading ? (
            <div style={{ padding: 18, fontFamily: "var(--body)", color: "var(--ink4)" }}>{t("provider.loading_records")}</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 18, fontFamily: "var(--body)", color: "var(--ink4)" }}>{t("provider.empty")}</div>
          ) : (
            rows.map((r) => (
              <div key={r.id}>
                <button onClick={() => openSession(r.id)} style={{ width: "100%", textAlign: "left", border: "none", background: selected === r.id ? "var(--rosePale)" : "var(--paper)", borderBottom: selected === r.id ? "none" : "1px solid rgba(22,15,6,0.08)", padding: "12px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: "2.1fr 0.8fr 0.9fr 1.2fr", gap: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 14, color: "var(--ink2)", lineHeight: 1.5 }}>{r.description || t("provider.no_desc")}</p>
                    <p style={{ margin: "4px 0 0", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)" }}>{t("provider.patient_label", { name: r.patient_username || "unknown" })}</p>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: (r.severity_level || "").toLowerCase() === "severe" ? "var(--rose)" : (r.severity_level || "").toLowerCase() === "mild" ? "var(--sage)" : "var(--amber)", letterSpacing: "0.08em" }}>{(r.severity_level || "moderate").toUpperCase()}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.status === "done" ? "var(--sage)" : "var(--amber)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: r.status === "done" ? "var(--sage)" : "var(--amber)", letterSpacing: "0.08em" }}>{(r.status || "active").toUpperCase()}</span>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink5)" }}>{fmtD(r.created_at)}</div>
                </button>

                {selected === r.id && (
                  <div style={{ background: "var(--paper2)", borderTop: "1px solid rgba(22,15,6,0.06)", borderBottom: "1px solid rgba(22,15,6,0.08)", padding: "14px 16px" }}>
                    <p style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.1em" }}>
                      {t("provider.detail_title", { id: selected.slice(0, 8).toUpperCase() })}
                    </p>
                    {detail && (
                      <p style={{ margin: "8px 0 12px", fontFamily: "var(--body)", fontSize: 14, color: "var(--ink3)", whiteSpace: "pre-wrap" }}>
                        {(detail.symptoms && detail.symptoms.description) || "-"}
                      </p>
                    )}
                    <div style={{ maxHeight: 260, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                      {messages.map((m) => (
                        <div key={m.id} style={{ border: "1px solid rgba(22,15,6,0.12)", borderRadius: 6, padding: "8px 10px", background: "var(--paper)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)", letterSpacing: "0.1em" }}>{m.role === "agent" ? (m.agent_type || "agent") : m.role}</span>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink5)" }}>{fmtD(m.created_at)}</span>
                          </div>
                          <div style={{ marginTop: 5 }}>
                            {m.role === "agent" && m.agent_type === "safety" ? (
                              renderSafetyMessage(m.content)
                            ) : (m.role === "agent" || m.role === "user") ? (
                              <div className="md-body" style={{ fontSize: 13 }}>
                                <ReactMarkdown>{m.content || ""}</ReactMarkdown>
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink3)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                {m.content}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {!messages.length && <p style={{ margin: 0, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink4)" }}>{t("provider.no_messages")}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
