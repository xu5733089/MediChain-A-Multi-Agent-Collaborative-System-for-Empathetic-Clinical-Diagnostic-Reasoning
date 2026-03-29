export const BACKEND = "http://localhost:8000";

export function makeApi(token) {
  const h = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const hForm = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const get = async p => {
    const r = await fetch(BACKEND + p, { headers: h });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };
  const post = async (p, b) => {
    const r = await fetch(BACKEND + p, { method: "POST", headers: h, body: JSON.stringify(b) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({ detail: r.status }));
      throw new Error(e.detail || r.status);
    }
    return r.json();
  };
  const postForm = async (p, formData) => {
    const r = await fetch(BACKEND + p, { method: "POST", headers: hForm, body: formData });
    if (!r.ok) {
      const e = await r.json().catch(() => ({ detail: r.status }));
      throw new Error(e.detail || r.status);
    }
    return r.json();
  };
  const put = async (p, b) => {
    const r = await fetch(BACKEND + p, { method: "PUT", headers: h, body: JSON.stringify(b) });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };
  const del = async p => {
    const r = await fetch(BACKEND + p, { method: "DELETE", headers: h });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };

  return {
    register: b => post("/api/auth/register", b),
    loginJson: b => post("/api/auth/login/json", b),
    patients: () => get("/api/patients"),
    createPatient: b => post("/api/patients", b),
    updatePatient: (id, b) => put(`/api/patients/${id}`, b),
    deletePatient: id => del(`/api/patients/${id}`),
    patientSessions: id => get(`/api/patients/${id}/sessions`),
    start: s => post("/api/session/start", s),
    chat: b => post("/api/session/chat", b),
    diagnose: b => post("/api/session/diagnose", b),
    sessions: () => get("/api/sessions"),
    session: id => get(`/api/session/${id}`),
    sessionMessages: id => get(`/api/sessions/${id}/messages`),
    sessionUploads: id => get(`/api/sessions/${id}/uploads`),
    storeSessionMessage: (id, b) => post(`/api/sessions/${id}/messages`, b),
    uploadSessionFile: (id, file) => {
      const fd = new FormData();
      fd.append("file", file);
      return postForm(`/api/sessions/${id}/upload`, fd);
    },
    questions: () => get("/api/eval/questions"),
    evalRun: b => post("/api/eval/run", b),
    evalHist: () => get("/api/eval/history"),
    exportUrl: (id, t) => `${BACKEND}/api/session/${id}/export/${t}`,
  };
}
