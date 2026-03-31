import { useState } from "react";
import { AmbientBlobs, Caduceus, ECGLine, IllustFlower, IllustLeaf, ParticleField } from "../components/illustrations";
import { Banner, FormField, InkDivider } from "../components/ui";
import { Button } from "../components/ui/button";

export default function AuthPage({ api, onLogin, onSkip }) {
  const [mode, setMode] = useState("login");
  const [entryRole, setEntryRole] = useState("patient");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", full_name: "", role: "patient" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [ok, setOk] = useState("");
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    else if (form.username.length < 3) e.username = "Min 3 characters";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 6) e.password = "Min 6 characters";
    if (mode === "register") {
      if (!form.email.trim()) e.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
      if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setApiErr("");
    setLoading(true);
    try {
      const data = mode === "login"
        ? await api.loginJson({ username: form.username, password: form.password })
        : await api.register(form);

      if (mode === "login") {
        const actualRole = data?.user?.role;
        if (entryRole === "provider" && actualRole !== "provider") {
          setApiErr("This account is not a provider account.");
          setLoading(false);
          return;
        }
        if (entryRole === "patient" && actualRole !== "patient") {
          setApiErr("This account is not a patient account.");
          setLoading(false);
          return;
        }
      }

      setOk(mode === "login" ? "Welcome back." : "Account created.");
      setTimeout(() => onLogin(data.token || data.access_token, data.user), 700);
    } catch (e) {
      setApiErr(e.message || "An error occurred.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 48px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <AmbientBlobs />
      <IllustLeaf w={160} h={240} style={{ position: "fixed", top: "-3%", right: "2%", animation: "float1 8s ease-in-out infinite", pointerEvents: "none" }} color="var(--sage)" opacity={0.22} />
      <IllustFlower size={130} style={{ position: "fixed", bottom: "6%", left: "2%", animation: "float2 10s ease-in-out infinite", pointerEvents: "none" }} color="var(--rose)" opacity={0.2} />
      <IllustLeaf w={100} h={150} style={{ position: "fixed", top: "35%", left: "0%", animation: "float3 7s ease-in-out infinite", transform: "rotate(25deg)", pointerEvents: "none" }} color="var(--amber)" opacity={0.16} />
      <ParticleField count={12} style={{ position: "fixed", inset: 0 }} />

      <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 36 }}>
          <div className="ink-bloom" style={{ display: "inline-flex", width: 80, height: 80, borderRadius: 22, background: "linear-gradient(135deg,var(--paper2),var(--paper3))", border: "2px solid rgba(22,15,6,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "var(--shadow-lg)", animation: "glowPulse 3s ease-in-out infinite", color: "var(--rose)" }}>
            <Caduceus size={48} />
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 42, fontWeight: 400, fontStyle: "italic", color: "var(--ink)", letterSpacing: -0.5, lineHeight: 1.05, marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Join MediChain"}
          </h1>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.2em" }}>CLINICAL AI · THREE-AGENT SYSTEM</p>
          <ECGLine style={{ marginTop: 14, opacity: 0.55 }} />
        </div>

        <div className="card fade-up s1" style={{ padding: "38px 42px", boxShadow: "var(--shadow-xl)" }}>
          <div className="shine" />
          <div className="mode-pill" style={{ marginBottom: 28, width: "100%" }}>
            {[{ id: "login", l: "Sign In" }, { id: "register", l: "Register" }].map(m => (
              <button key={m.id} className={`mode-opt${mode === m.id ? " on" : ""}`} onClick={() => { setMode(m.id); setErrors({}); setApiErr(""); setOk(""); }}>{m.l}</button>
            ))}
          </div>

          {mode === "login" && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.12em", marginBottom: 8 }}>
                ENTRY
              </p>
              <div className="mode-pill" style={{ width: "100%" }}>
                <button className={`mode-opt${entryRole === "patient" ? " on" : ""}`} onClick={() => { setEntryRole("patient"); setApiErr(""); }}>
                  Patient Login
                </button>
                <button className={`mode-opt${entryRole === "provider" ? " on" : ""}`} onClick={() => { setEntryRole("provider"); setApiErr(""); }}>
                  Provider Login
                </button>
              </div>
            </div>
          )}

          {ok && <Banner type="success" style={{ marginBottom: 16, animation: "slide-r 0.35s ease both" }}><span style={{ color: "var(--sage)" }}>{ok}</span></Banner>}
          {apiErr && <Banner type="error" style={{ marginBottom: 16, animation: "slide-r 0.35s ease both" }}><span style={{ color: "var(--rose)" }}>{apiErr}</span></Banner>}

          {mode === "register" && <FormField label="Full Name" value={form.full_name} onChange={f("full_name")} placeholder="Dr. Jane Smith" />}
          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label className="ink-label">Account Role</label>
              <div className="mode-pill" style={{ width: "100%" }}>
                <button className={`mode-opt${form.role === "patient" ? " on" : ""}`} onClick={() => f("role")("patient")}>
                  Patient
                </button>
                <button className={`mode-opt${form.role === "provider" ? " on" : ""}`} onClick={() => f("role")("provider")}>
                  Provider
                </button>
              </div>
            </div>
          )}
          <FormField label="Username" value={form.username} onChange={f("username")} placeholder="your_username" error={errors.username} />
          {mode === "register" && <FormField label="Email Address" type="email" value={form.email} onChange={f("email")} placeholder="you@hospital.com" error={errors.email} />}
          <FormField label="Password" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" error={errors.password} />
          {mode === "register" && <FormField label="Confirm Password" type="password" value={form.confirm} onChange={f("confirm")} placeholder="••••••••" error={errors.confirm} />}

          <Button onClick={submit} disabled={loading || !!ok} className="mt-1 h-12 w-full text-base">
            {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
          </Button>

          <InkDivider style={{ margin: "20px 0 16px" }} />
          <p style={{ textAlign: "center", fontFamily: "var(--body)", fontSize: 14, color: "var(--ink3)" }}>
            {mode === "login" ? "New to MediChain? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); setApiErr(""); }}
              style={{ background: "none", border: "none", color: "var(--rose)", fontFamily: "var(--body)", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
            >
              {mode === "login" ? "Register here" : "Sign in"}
            </button>
          </p>
        </div>

        <div className="fade-up s3" style={{ textAlign: "center", marginTop: 20 }}>
          <Button onClick={onSkip} variant="outline" className="h-10 px-7 text-sm">Continue as guest →</Button>
        </div>
      </div>
    </div>
  );
}
