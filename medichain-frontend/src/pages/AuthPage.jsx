import { useState } from "react";
import { AmbientBlobs, Caduceus, ECGLine, IllustFlower, IllustLeaf, ParticleField } from "../components/illustrations";
import { Banner, FormField, InkDivider } from "../components/ui";
import { Button } from "../components/ui/button";

function RoleCard({ role, icon, title, description, selected, onClick }) {
  const isProvider = role === "provider";
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: selected ? (isProvider ? "linear-gradient(145deg,var(--navy),#1a3a8a)" : "linear-gradient(145deg,var(--rose),var(--roseB))") : "var(--paper2)",
        border: selected ? "2px solid transparent" : "2px solid rgba(22,15,6,0.11)",
        borderRadius: 18,
        padding: "36px 24px 32px",
        cursor: "pointer",
        transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
        textAlign: "center",
        color: selected ? "#fff" : "var(--ink)",
        boxShadow: selected ? (isProvider ? "0 8px 32px rgba(22,50,104,0.32)" : "0 8px 32px rgba(184,56,48,0.28)") : "0 2px 12px rgba(22,15,6,0.06)",
        transform: selected ? "translateY(-3px)" : "translateY(0)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {selected && (
        <div style={{ position: "absolute", top: 14, right: 14, width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>
      )}
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", fontWeight: 600, marginBottom: 10, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontFamily: "var(--body)", fontSize: 14, lineHeight: 1.6, opacity: selected ? 0.88 : 0.6 }}>{description}</div>
    </button>
  );
}

export default function AuthPage({ api, onLogin, onSkip }) {
  // Step 1: role selection; Step 2: login/register form
  const [step, setStep] = useState("role");
  const [selectedRole, setSelectedRole] = useState(null);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", full_name: "", role: "patient" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [ok, setOk] = useState("");
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  function chooseRole(role) {
    setSelectedRole(role);
    setForm(p => ({ ...p, role }));
    setApiErr("");
    setErrors({});
    setOk("");
  }

  function proceedToAuth() {
    if (!selectedRole) return;
    setStep("auth");
  }

  function backToRole() {
    setStep("role");
    setApiErr("");
    setErrors({});
    setOk("");
  }

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
        if (selectedRole === "provider" && actualRole !== "provider") {
          setApiErr("This account is not a provider account. Please use Patient Login.");
          setLoading(false);
          return;
        }
        if (selectedRole === "patient" && actualRole !== "patient") {
          setApiErr("This account is not a patient account. Please use Provider Login.");
          setLoading(false);
          return;
        }
      }

      setOk(mode === "login" ? "Welcome back." : "Account created successfully.");
      setTimeout(() => onLogin(data.token || data.access_token, data.user), 700);
    } catch (e) {
      setApiErr(e.message || "An error occurred.");
    }
    setLoading(false);
  }

  const isProvider = selectedRole === "provider";

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px 48px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <AmbientBlobs />
      <IllustLeaf w={160} h={240} style={{ position: "fixed", top: "-3%", right: "2%", animation: "float1 8s ease-in-out infinite", pointerEvents: "none" }} color="var(--sage)" opacity={0.22} />
      <IllustFlower size={130} style={{ position: "fixed", bottom: "6%", left: "2%", animation: "float2 10s ease-in-out infinite", pointerEvents: "none" }} color="var(--rose)" opacity={0.2} />
      <IllustLeaf w={100} h={150} style={{ position: "fixed", top: "35%", left: "0%", animation: "float3 7s ease-in-out infinite", transform: "rotate(25deg)", pointerEvents: "none" }} color="var(--amber)" opacity={0.16} />
      <ParticleField count={12} style={{ position: "fixed", inset: 0 }} />

      {/* ── STEP 1: Role Selection ── */}
      {step === "role" && (
        <div style={{ width: "100%", maxWidth: 580, position: "relative", zIndex: 1 }}>
          <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="ink-bloom" style={{ display: "inline-flex", width: 80, height: 80, borderRadius: 22, background: "linear-gradient(135deg,var(--paper2),var(--paper3))", border: "2px solid rgba(22,15,6,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "var(--shadow-lg)", animation: "glowPulse 3s ease-in-out infinite", color: "var(--rose)" }}>
              <Caduceus size={48} />
            </div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 40, fontWeight: 400, fontStyle: "italic", color: "var(--ink)", letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 10 }}>
              Welcome to MediChain
            </h1>
            <p style={{ fontFamily: "var(--body)", fontSize: 16, color: "var(--ink4)", marginBottom: 4 }}>Select your role to continue</p>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.2em" }}>CLINICAL AI · THREE-AGENT SYSTEM</p>
            <ECGLine style={{ marginTop: 14, opacity: 0.55 }} />
          </div>

          <div className="fade-up s1" style={{ display: "flex", gap: 18, marginBottom: 24 }}>
            <RoleCard
              role="patient"
              icon="🧑‍⚕️"
              title="Patient"
              description="Describe your symptoms and receive an AI-powered clinical assessment from our multi-agent diagnostic system."
              selected={selectedRole === "patient"}
              onClick={() => chooseRole("patient")}
            />
            <RoleCard
              role="provider"
              icon="👨‍⚕️"
              title="Healthcare Provider"
              description="Review patient consultations, monitor diagnostic sessions, and access clinical AI reports across your patient list."
              selected={selectedRole === "provider"}
              onClick={() => chooseRole("provider")}
            />
          </div>

          <div className="fade-up s2" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <Button
              onClick={proceedToAuth}
              disabled={!selectedRole}
              size="xl"
              className="w-full"
              style={{ opacity: selectedRole ? 1 : 0.45 }}
            >
              {selectedRole
                ? `Continue as ${selectedRole === "provider" ? "Healthcare Provider" : "Patient"} →`
                : "Select a role to continue"}
            </Button>
            <Button onClick={onSkip} variant="outline" size="default">
              Continue as guest →
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Login / Register form ── */}
      {step === "auth" && (
        <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
          <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
            {/* Role identity badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: isProvider ? "var(--navyPale)" : "var(--rosePale,#fdf0ef)", border: `1.5px solid ${isProvider ? "var(--navy)" : "var(--rose)"}30`, borderRadius: 30, padding: "7px 18px", marginBottom: 22 }}>
              <span style={{ fontSize: 18 }}>{isProvider ? "👨‍⚕️" : "🧑‍⚕️"}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", color: isProvider ? "var(--navy)" : "var(--rose)", fontWeight: 700 }}>
                {isProvider ? "HEALTHCARE PROVIDER" : "PATIENT"}
              </span>
              <button
                onClick={backToRole}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--body)", fontSize: 12, color: "var(--ink5)", textDecoration: "underline", padding: 0, marginLeft: 4 }}
              >
                Change
              </button>
            </div>

            <h1 style={{ fontFamily: "var(--serif)", fontSize: 38, fontWeight: 400, fontStyle: "italic", color: "var(--ink)", letterSpacing: -0.5, lineHeight: 1.05, marginBottom: 6 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink5)", letterSpacing: "0.2em" }}>CLINICAL AI · THREE-AGENT SYSTEM</p>
            <ECGLine style={{ marginTop: 14, opacity: 0.55 }} />
          </div>

          <div className="card fade-up s1" style={{ padding: "36px 40px", boxShadow: "var(--shadow-xl)" }}>
            <div className="shine" />
            <div className="mode-pill" style={{ marginBottom: 28, width: "100%" }}>
              {[{ id: "login", l: "Sign In" }, { id: "register", l: "Register" }].map(m => (
                <button key={m.id} className={`mode-opt${mode === m.id ? " on" : ""}`} onClick={() => { setMode(m.id); setErrors({}); setApiErr(""); setOk(""); }}>{m.l}</button>
              ))}
            </div>

            {ok && <Banner type="success" style={{ marginBottom: 16, animation: "slide-r 0.35s ease both" }}><span style={{ color: "var(--sage)" }}>{ok}</span></Banner>}
            {apiErr && <Banner type="error" style={{ marginBottom: 16, animation: "slide-r 0.35s ease both" }}><span style={{ color: "var(--rose)" }}>{apiErr}</span></Banner>}

            {mode === "register" && <FormField label="Full Name" value={form.full_name} onChange={f("full_name")} placeholder={isProvider ? "Dr. Jane Smith" : "Your full name"} />}
            <FormField label="Username" value={form.username} onChange={f("username")} placeholder="your_username" error={errors.username} />
            {mode === "register" && <FormField label="Email Address" type="email" value={form.email} onChange={f("email")} placeholder={isProvider ? "you@hospital.com" : "you@email.com"} error={errors.email} />}
            <FormField label="Password" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" error={errors.password} />
            {mode === "register" && <FormField label="Confirm Password" type="password" value={form.confirm} onChange={f("confirm")} placeholder="••••••••" error={errors.confirm} />}

            <Button
              onClick={submit}
              disabled={loading || !!ok}
              size="lg"
              className="mt-1 w-full"
              style={{ background: isProvider ? "linear-gradient(135deg,var(--navy),#2050a8)" : undefined }}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
            </Button>

            <InkDivider style={{ margin: "20px 0 16px" }} />
            <p style={{ textAlign: "center", fontFamily: "var(--body)", fontSize: 14, color: "var(--ink3)" }}>
              {mode === "login" ? "New to MediChain? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); setApiErr(""); }}
                style={{ background: "none", border: "none", color: isProvider ? "var(--navy)" : "var(--rose)", fontFamily: "var(--body)", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                {mode === "login" ? "Register here" : "Sign in"}
              </button>
            </p>
          </div>

          <div className="fade-up s3" style={{ textAlign: "center", marginTop: 18 }}>
            <Button onClick={onSkip} variant="outline" size="default">
              Continue as guest →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
