import { useState, useEffect, useRef, createContext, useContext } from "react";

const BACKEND = "http://localhost:8000";

// ── Theme Context ─────────────────────────────────────────
const ThemeCtx = createContext();
function useTheme(){ return useContext(ThemeCtx); }

function ThemeProvider({ children }){
  const [dark, setDark] = useState(()=>localStorage.getItem("mc_theme")!=="light");
  function toggle(){ setDark(v=>{ localStorage.setItem("mc_theme",v?"light":"dark"); return !v; }); }
  return <ThemeCtx.Provider value={{dark,toggle}}>{children}</ThemeCtx.Provider>;
}

// ── Design tokens ─────────────────────────────────────────
function useT(){
  const {dark} = useTheme();
  return {
    dark,
    bg:       dark?"#070d1a":"#f0f4f8",
    bgCard:   dark?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.9)",
    bgInput:  dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
    bgNav:    dark?"rgba(7,13,26,0.95)":"rgba(255,255,255,0.95)",
    border:   dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.1)",
    borderHi: dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.2)",
    text:     dark?"#f0f4f8":"#0f172a",
    textSub:  dark?"#94a3b8":"#64748b",
    textMute: dark?"#475569":"#94a3b8",
    textFaint:dark?"#334155":"#cbd5e1",
    shadow:   dark?"0 32px 80px rgba(0,0,0,0.5)":"0 32px 80px rgba(0,0,0,0.12)",
    cyan:     "#22d3ee",
    purple:   "#a78bfa",
    orange:   "#fb923c",
    green:    "#4ade80",
    red:      "#f87171",
    amber:    "#fbbf24",
  };
}

const AGENTS = {
  interviewer:  { short:"Interviewer",  icon:"🩺", color:"#22d3ee", bg:"rgba(34,211,238,0.08)",  border:"rgba(34,211,238,0.25)"  },
  diagnostician:{ short:"Diagnostician",icon:"🔬", color:"#a78bfa", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.25)" },
  critic:       { short:"Critic",       icon:"⚖️", color:"#fb923c", bg:"rgba(251,146,60,0.08)",  border:"rgba(251,146,60,0.25)"  },
};

// ── Auth Store ────────────────────────────────────────────
function useAuth(){
  const [user,setUser]   = useState(null);
  const [token,setToken] = useState(()=>localStorage.getItem("mc_token")||"");
  const [ready,setReady] = useState(false);
  useEffect(()=>{ token ? fetchMe() : setReady(true); },[]);
  async function fetchMe(){
    try{ const r=await fetch(BACKEND+"/api/auth/me",{headers:{Authorization:`Bearer ${token}`}}); if(r.ok){setUser(await r.json());}else{logout();} }
    catch(e){ logout(); }
    setReady(true);
  }
  function login(t,u){ setToken(t); setUser(u); localStorage.setItem("mc_token",t); }
  function logout(){ setToken(""); setUser(null); localStorage.removeItem("mc_token"); }
  return {user,token,ready,login,logout};
}

// ── API factory ───────────────────────────────────────────
function makeApi(token){
  const h  = {"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})};
  const get = async p =>{ const r=await fetch(BACKEND+p,{headers:h}); if(!r.ok) throw new Error(`${r.status}`); return r.json(); };
  const post= async(p,b)=>{ const r=await fetch(BACKEND+p,{method:"POST",headers:h,body:JSON.stringify(b)}); if(!r.ok){const e=await r.json().catch(()=>({detail:r.status})); throw new Error(e.detail||r.status);} return r.json(); };
  const put = async(p,b)=>{ const r=await fetch(BACKEND+p,{method:"PUT",headers:h,body:JSON.stringify(b)}); if(!r.ok) throw new Error(`${r.status}`); return r.json(); };
  const del = async p   =>{ const r=await fetch(BACKEND+p,{method:"DELETE",headers:h}); if(!r.ok) throw new Error(`${r.status}`); return r.json(); };
  return {
    register:      b   => post("/api/auth/register",b),
    loginJson:     b   => post("/api/auth/login/json",b),
    patients:      ()  => get("/api/patients"),
    createPatient: b   => post("/api/patients",b),
    updatePatient: (id,b)=>put(`/api/patients/${id}`,b),
    deletePatient: id  => del(`/api/patients/${id}`),
    patientSessions:id => get(`/api/patients/${id}/sessions`),
    start:    s  => post("/api/session/start",s),
    chat:     b  => post("/api/session/chat",b),
    diagnose: b  => post("/api/session/diagnose",b),
    sessions: () => get("/api/sessions"),
    session:  id => get(`/api/session/${id}`),
    questions:() => get("/api/eval/questions"),
    evalRun:  b  => post("/api/eval/run",b),
    evalHist: () => get("/api/eval/history"),
    exportUrl:(id,t)=>`${BACKEND}/api/session/${id}/export/${t}`,
  };
}

// ── Helpers ───────────────────────────────────────────────
const sevColor = n=>n<=3?"#4ade80":n<=6?"#fbbf24":n<=8?"#fb923c":"#f87171";
const sevLabel = n=>n<=3?"Mild":n<=5?"Moderate":n<=7?"Significant":n<=9?"Severe":"Critical";
const fmtTime  = d=>d.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"});
const fmtDate  = s=>new Date(s).toLocaleDateString("en-AU");

// ── Shared UI ─────────────────────────────────────────────
function Badge({k,size="sm"}){
  const a=AGENTS[k];
  return <span style={{background:a.bg,color:a.color,border:`1px solid ${a.border}`,borderRadius:20,padding:size==="sm"?"2px 10px":"5px 14px",fontSize:size==="sm"?11:13,fontWeight:600,fontFamily:"mono",display:"inline-flex",alignItems:"center",gap:5}}>{a.icon} {a.short}</span>;
}
function Dots({color}){
  return <div style={{display:"flex",gap:4,padding:"6px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:color,animation:`mcdot 1.2s ${i*.2}s infinite`}}/>)}</div>;
}
function StatusPill({phase}){
  const c={interviewing:{color:"#22d3ee",label:"● History Taking"},analyzing:{color:"#a78bfa",label:"◉ Analyzing"},done:{color:"#4ade80",label:"✓ Complete"}}[phase]||{color:"#22d3ee",label:"● Active"};
  return <span style={{background:`${c.color}18`,color:c.color,border:`1px solid ${c.color}40`,borderRadius:20,padding:"4px 14px",fontSize:12,fontFamily:"mono"}}>{c.label}</span>;
}
function ExportBtns({url,small}){
  const p=small?"6px 12px":"9px 18px"; const fs=small?12:13;
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button onClick={()=>window.open(url("pdf"),"_blank")} style={{background:"linear-gradient(135deg,#fb923c,#f97316)",border:"none",borderRadius:9,padding:p,color:"#fff",fontSize:fs,fontWeight:700,cursor:"pointer"}}>📄 PDF</button>
      <button onClick={()=>window.open(url("json"),"_blank")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:9,padding:p,color:"#94a3b8",fontSize:fs,cursor:"pointer"}}>{"{ }"} JSON</button>
    </div>
  );
}

function FormInput({label,type="text",value,onChange,placeholder,error,t}){
  const [focused,setFocused]=useState(false);
  return(
    <div style={{marginBottom:18}}>
      {label&&<label style={{display:"block",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        placeholder={placeholder}
        style={{width:"100%",boxSizing:"border-box",background:t.bgInput,border:`1.5px solid ${error?"#f87171":focused?"#22d3ee":t.border}`,borderRadius:10,padding:"12px 14px",color:t.text,fontSize:14,fontFamily:"sans-serif",outline:"none",transition:"border-color 0.2s"}}/>
      {error&&<div style={{color:"#f87171",fontSize:11,marginTop:5,display:"flex",alignItems:"center",gap:4}}>⚠ {error}</div>}
    </div>
  );
}

// ── Theme Toggle Button ───────────────────────────────────
function ThemeToggle(){
  const {dark,toggle} = useTheme();
  return(
    <button onClick={toggle} title={dark?"Switch to Light Mode":"Switch to Dark Mode"}
      style={{background:dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",border:`1px solid ${dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}`,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
      {dark?"☀️":"🌙"}
      <span style={{fontSize:11,fontFamily:"mono",color:dark?"#94a3b8":"#64748b"}}>{dark?"Light":"Dark"}</span>
    </button>
  );
}

// ── Top Navigation ────────────────────────────────────────
function TopNav({user,onLogout,onNav,page}){
  const t=useT();
  const [menu,setMenu]=useState(false);
  const initials=(user?.full_name?.split(" ").map(n=>n[0]).join("").slice(0,2)||user?.username?.slice(0,2)||"?").toUpperCase();
  const navItems=[{id:"input",label:"Consult"},{id:"patients",label:"Patients"},{id:"history",label:"History"},{id:"eval",label:"MedQA"}];
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:t.bgNav,borderBottom:`1px solid ${t.border}`,backdropFilter:"blur(20px)"}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:28}}>
          <span style={{color:t.cyan,fontFamily:"mono",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:-0.5}} onClick={()=>onNav("input")}>⚕️ MediChain</span>
          {user&&(
            <div style={{display:"flex",gap:2}}>
              {navItems.map(({id,label})=>(
                <button key={id} onClick={()=>onNav(id)} style={{background:page===id?`${t.cyan}15`:"transparent",border:"none",borderRadius:8,padding:"6px 13px",color:page===id?t.cyan:t.textMute,fontSize:13,cursor:"pointer",fontFamily:"sans-serif",transition:"all 0.15s",fontWeight:page===id?600:400}}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <ThemeToggle/>
          {user?(
            <div style={{position:"relative"}}>
              <button onClick={()=>setMenu(v=>!v)} style={{display:"flex",alignItems:"center",gap:9,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:10,padding:"6px 12px",cursor:"pointer",transition:"all 0.15s"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#22d3ee,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",color:"#070d1a",fontSize:11,fontWeight:800,flexShrink:0}}>{initials}</div>
                <span style={{color:t.text,fontSize:13,fontWeight:500,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.full_name||user.username}</span>
                <span style={{color:t.textMute,fontSize:10}}>{menu?"▲":"▼"}</span>
              </button>
              {menu&&(
                <div style={{position:"absolute",right:0,top:46,background:t.dark?"#0f1d36":"#ffffff",border:`1px solid ${t.border}`,borderRadius:14,padding:8,minWidth:200,boxShadow:t.shadow,zIndex:200}}>
                  <div style={{padding:"10px 14px",borderBottom:`1px solid ${t.border}`,marginBottom:4}}>
                    <div style={{color:t.text,fontSize:13,fontWeight:600}}>{user.full_name||user.username}</div>
                    <div style={{color:t.textMute,fontSize:11,fontFamily:"mono",marginTop:2}}>{user.email}</div>
                    <div style={{background:`${t.cyan}15`,color:t.cyan,border:`1px solid ${t.cyan}30`,borderRadius:8,padding:"3px 8px",fontSize:10,fontFamily:"mono",display:"inline-block",marginTop:6}}>● Active Session</div>
                  </div>
                  {navItems.map(({id,label})=>(
                    <button key={id} onClick={()=>{onNav(id);setMenu(false);}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",borderRadius:9,padding:"9px 14px",color:t.textSub,fontSize:13,cursor:"pointer",fontFamily:"sans-serif"}}>
                      {{input:"🩺",patients:"👤",history:"📋",eval:"📊"}[id]} {label}
                    </button>
                  ))}
                  <div style={{borderTop:`1px solid ${t.border}`,marginTop:4,paddingTop:4}}>
                    <button onClick={()=>{onLogout();setMenu(false);}} style={{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",borderRadius:9,padding:"9px 14px",color:"#f87171",fontSize:13,cursor:"pointer",fontFamily:"sans-serif"}}>
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ):(
            <button onClick={()=>onNav("auth")} style={{background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:10,padding:"8px 18px",color:"#070d1a",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Login / Register
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Auth Page ─────────────────────────────────────────────
function AuthPage({api,onLogin,onSkip}){
  const t=useT();
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({username:"",email:"",password:"",confirm:"",full_name:""});
  const [errors,setErrors]=useState({});
  const [loading,setLoading]=useState(false);
  const [apiError,setApiError]=useState("");
  const [success,setSuccess]=useState("");
  const f=k=>v=>setForm(p=>({...p,[k]:v}));

  function validate(){
    const e={};
    if(!form.username.trim()) e.username="Required";
    else if(form.username.length<3) e.username="At least 3 characters";
    if(!form.password) e.password="Required";
    else if(form.password.length<6) e.password="At least 6 characters";
    if(mode==="register"){
      if(!form.email.trim()) e.email="Required";
      else if(!/\S+@\S+\.\S+/.test(form.email)) e.email="Invalid email format";
      if(form.confirm!==form.password) e.confirm="Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length===0;
  }

  async function submit(){
    if(!validate()) return;
    setApiError(""); setLoading(true);
    try{
      let data;
      if(mode==="login"){ data=await api.loginJson({username:form.username,password:form.password}); }
      else{ data=await api.register({username:form.username,email:form.email,password:form.password,full_name:form.full_name}); }
      setSuccess(mode==="login"?"Welcome back!":"Account created!");
      setTimeout(()=>onLogin(data.token||data.access_token,data.user),600);
    }catch(e){ setApiError(e.message||"An error occurred"); }
    setLoading(false);
  }

  return(
    <div style={{minHeight:"100vh",background:t.dark?"radial-gradient(ellipse at 20% 20%,#0d1f3c,#070d1a 60%)":t.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 20px 40px"}}>
      <div style={{width:"100%",maxWidth:460}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#22d3ee20,#a78bfa20)",border:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 20px"}}>⚕️</div>
          <h1 style={{color:t.text,fontSize:28,fontWeight:300,margin:"0 0 8px",fontFamily:"serif",letterSpacing:-0.5}}>
            {mode==="login"?"Welcome Back":"Create Account"}
          </h1>
          <p style={{color:t.textMute,fontSize:14,margin:0}}>MediChain · AI Diagnostic System</p>
        </div>

        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:22,padding:"32px 36px",boxShadow:t.shadow}}>
          {/* Mode tabs */}
          <div style={{display:"flex",gap:3,marginBottom:28,background:t.dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)",borderRadius:12,padding:4,border:`1px solid ${t.border}`}}>
            {[{id:"login",label:"🔑 Login"},{id:"register",label:"✨ Register"}].map(m=>(
              <button key={m.id} onClick={()=>{setMode(m.id);setErrors({});setApiError("");setSuccess("");}}
                style={{flex:1,background:mode===m.id?t.dark?"rgba(255,255,255,0.08)":"#ffffff":"transparent",border:"none",borderRadius:9,padding:"10px",color:mode===m.id?t.text:t.textMute,fontSize:13,cursor:"pointer",fontWeight:mode===m.id?600:400,fontFamily:"sans-serif",boxShadow:mode===m.id&&!t.dark?"0 2px 8px rgba(0,0,0,0.1)":"none",transition:"all 0.2s"}}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Success banner */}
          {success&&(
            <div style={{background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.25)",borderRadius:10,padding:"12px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>✅</span><span style={{color:"#4ade80",fontSize:13}}>{success}</span>
            </div>
          )}

          {/* API Error */}
          {apiError&&(
            <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:10,padding:"12px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>⚠️</span><span style={{color:"#f87171",fontSize:13}}>{apiError}</span>
            </div>
          )}

          {mode==="register"&&<FormInput label="Full Name" value={form.full_name} onChange={f("full_name")} placeholder="Dr. Jane Smith" t={t}/>}
          <FormInput label="Username" value={form.username} onChange={f("username")} placeholder="your_username" error={errors.username} t={t}/>
          {mode==="register"&&<FormInput label="Email" type="email" value={form.email} onChange={f("email")} placeholder="you@example.com" error={errors.email} t={t}/>}
          <FormInput label="Password" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" error={errors.password} t={t}/>
          {mode==="register"&&<FormInput label="Confirm Password" type="password" value={form.confirm} onChange={f("confirm")} placeholder="••••••••" error={errors.confirm} t={t}/>}

          <button onClick={submit} disabled={loading||!!success}
            style={{width:"100%",padding:"14px",background:loading||success?"rgba(34,211,238,0.3)":"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:12,color:"#070d1a",fontSize:15,fontWeight:700,cursor:loading||success?"not-allowed":"pointer",marginTop:6,transition:"all 0.2s"}}>
            {loading?"⏳ Loading…":mode==="login"?"Login →":"Create Account →"}
          </button>

          <div style={{textAlign:"center",marginTop:18,color:t.textMute,fontSize:13}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"register":"login");setErrors({});setApiError("");}}
              style={{background:"none",border:"none",color:t.cyan,cursor:"pointer",fontSize:13,fontWeight:600}}>
              {mode==="login"?"Register here":"Login here"}
            </button>
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:20}}>
          <button onClick={onSkip} style={{background:"none",border:`1px solid ${t.border}`,borderRadius:10,padding:"9px 22px",color:t.textMute,fontSize:13,cursor:"pointer"}}>
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patients Page ─────────────────────────────────────────
function PatientsPage({api,onStartConsult}){
  const t=useT();
  const [patients,setPatients]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editP,setEditP]=useState(null);
  const [form,setForm]=useState({name:"",dob:"",gender:"",blood_type:"",allergies:"",medications:"",conditions:"",notes:""});
  const [saving,setSaving]=useState(false);
  const [selP,setSelP]=useState(null);
  const [pSessions,setPSessions]=useState([]);
  const ff=k=>v=>setForm(p=>({...p,[k]:v}));
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setPatients(await api.patients());}catch(e){}setLoading(false);}
  async function save(){
    setSaving(true);
    try{ if(editP){await api.updatePatient(editP.id,form);}else{await api.createPatient(form);}
    await load();setShowForm(false);setEditP(null);setForm({name:"",dob:"",gender:"",blood_type:"",allergies:"",medications:"",conditions:"",notes:""});}
    catch(e){alert(e.message);}
    setSaving(false);
  }
  async function del(id){if(!window.confirm("Delete this patient?"))return;await api.deletePatient(id);load();}
  async function selectPatient(p){
    if(selP?.id===p.id){setSelP(null);setPSessions([]);return;}
    setSelP(p);try{setPSessions(await api.patientSessions(p.id));}catch(e){}
  }
  function startEdit(p){setEditP(p);setForm({name:p.name,dob:p.dob||"",gender:p.gender||"",blood_type:p.blood_type||"",allergies:p.allergies||"",medications:p.medications||"",conditions:p.conditions||"",notes:p.notes||""});setShowForm(true);}
  const genderColors={"Male":"#38bdf8","Female":"#f472b6","Other":"#a78bfa"};

  return(
    <div style={{minHeight:"100vh",background:t.bg,padding:"72px 24px 40px"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div>
            <h2 style={{color:t.text,fontSize:26,fontWeight:300,margin:0,fontFamily:"serif"}}>Patient Profiles</h2>
            <div style={{color:t.textFaint,fontSize:11,fontFamily:"mono",marginTop:4,letterSpacing:1.5}}>{patients.length} PATIENTS REGISTERED</div>
          </div>
          <button onClick={()=>{setShowForm(true);setEditP(null);setForm({name:"",dob:"",gender:"",blood_type:"",allergies:"",medications:"",conditions:"",notes:""}); }}
            style={{background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:10,padding:"10px 20px",color:"#070d1a",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            + New Patient
          </button>
        </div>

        {/* Modal */}
        {showForm&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
            <div style={{background:t.dark?"#0f1d36":"#ffffff",border:`1px solid ${t.border}`,borderRadius:22,padding:"30px 34px",width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:t.shadow}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
                <h3 style={{color:t.text,fontSize:18,fontWeight:600,margin:0}}>{editP?"Edit Patient":"New Patient Profile"}</h3>
                <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",color:t.textMute,cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
              </div>
              <FormInput label="Full Name *" value={form.name} onChange={ff("name")} placeholder="Patient full name" t={t}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div>
                  <label style={{display:"block",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e=>ff("dob")(e.target.value)}
                    style={{width:"100%",boxSizing:"border-box",background:t.bgInput,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 14px",color:t.text,fontSize:14,outline:"none",marginBottom:18}}/>
                </div>
                <div>
                  <label style={{display:"block",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>Gender</label>
                  <select value={form.gender} onChange={e=>ff("gender")(e.target.value)}
                    style={{width:"100%",boxSizing:"border-box",background:t.dark?"#0d1829":t.bgInput,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 14px",color:t.text,fontSize:14,outline:"none",marginBottom:18,appearance:"none"}}>
                    <option value="">Select</option>
                    {["Male","Female","Other"].map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <FormInput label="Blood Type" value={form.blood_type} onChange={ff("blood_type")} placeholder="A+, B-, O+, AB+…" t={t}/>
              <FormInput label="Allergies" value={form.allergies} onChange={ff("allergies")} placeholder="Penicillin, peanuts…" t={t}/>
              <FormInput label="Current Medications" value={form.medications} onChange={ff("medications")} placeholder="Metformin 500mg…" t={t}/>
              <FormInput label="Chronic Conditions" value={form.conditions} onChange={ff("conditions")} placeholder="Type 2 diabetes…" t={t}/>
              <FormInput label="Notes" value={form.notes} onChange={ff("notes")} placeholder="Additional notes…" t={t}/>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button onClick={()=>setShowForm(false)} style={{flex:1,padding:"12px",background:"rgba(255,255,255,0.04)",border:`1px solid ${t.border}`,borderRadius:10,color:t.textSub,fontSize:14,cursor:"pointer"}}>Cancel</button>
                <button onClick={save} disabled={!form.name.trim()||saving}
                  style={{flex:2,padding:"12px",background:form.name.trim()&&!saving?"linear-gradient(135deg,#22d3ee,#0ea5e9)":"rgba(255,255,255,0.05)",border:"none",borderRadius:10,color:form.name.trim()&&!saving?"#070d1a":t.textMute,fontSize:14,fontWeight:700,cursor:form.name.trim()&&!saving?"pointer":"not-allowed"}}>
                  {saving?"Saving…":editP?"Save Changes":"Create Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading
          ? <div style={{textAlign:"center",padding:"60px",color:t.textFaint,fontFamily:"mono"}}>Loading patients…</div>
          : patients.length===0
            ? <div style={{textAlign:"center",padding:"80px 40px",color:t.textFaint,fontFamily:"mono",background:t.bgCard,borderRadius:20,border:`1px solid ${t.border}`}}>
                <div style={{fontSize:48,marginBottom:16}}>👤</div>
                <div style={{marginBottom:8,color:t.textSub}}>No patient profiles yet</div>
                <div style={{color:t.textFaint,fontSize:12}}>Create a profile to track sessions per patient</div>
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {patients.map(p=>(
                  <div key={p.id} style={{background:selP?.id===p.id?`${t.cyan}08`:t.bgCard,border:`1px solid ${selP?.id===p.id?`${t.cyan}30`:t.border}`,borderRadius:16,overflow:"hidden",boxShadow:t.dark?"none":"0 2px 12px rgba(0,0,0,0.07)"}}>
                    <div onClick={()=>selectPatient(p)} style={{padding:"18px 20px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${t.cyan}20,${t.purple}20)`,border:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                          {p.gender==="Male"?"👨":p.gender==="Female"?"👩":"🧑"}
                        </div>
                        <div>
                          <div style={{color:t.text,fontSize:15,fontWeight:600}}>{p.name}</div>
                          <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                            {p.gender&&<span style={{color:genderColors[p.gender]||t.textMute,fontSize:11,fontFamily:"mono"}}>{p.gender}</span>}
                            {p.blood_type&&<span style={{background:"rgba(248,113,113,0.1)",color:"#f87171",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,padding:"1px 6px",fontSize:10,fontFamily:"mono"}}>{p.blood_type}</span>}
                          </div>
                        </div>
                      </div>
                      {p.conditions&&<div style={{color:t.textMute,fontSize:12,lineHeight:1.6,marginBottom:4}}><span style={{color:t.textFaint}}>Conditions: </span>{p.conditions.slice(0,60)}{p.conditions.length>60?"…":""}</div>}
                      {p.allergies&&<div style={{color:t.textMute,fontSize:12}}><span style={{color:t.textFaint}}>Allergies: </span>{p.allergies.slice(0,50)}</div>}
                    </div>
                    <div style={{borderTop:`1px solid ${t.border}`,padding:"10px 18px",display:"flex",gap:8}}>
                      <button onClick={()=>onStartConsult(p)} style={{flex:1,background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:8,padding:"8px",color:"#070d1a",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Consult</button>
                      <button onClick={()=>startEdit(p)} style={{background:t.bgInput,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 11px",color:t.textSub,fontSize:12,cursor:"pointer"}}>✏️</button>
                      <button onClick={()=>del(p.id)} style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:8,padding:"8px 11px",color:"#f87171",fontSize:12,cursor:"pointer"}}>🗑️</button>
                    </div>
                    {selP?.id===p.id&&(
                      <div style={{borderTop:`1px solid ${t.border}`,padding:"12px 18px",background:t.dark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)"}}>
                        <div style={{color:t.textFaint,fontSize:10,fontFamily:"mono",letterSpacing:1.5,marginBottom:8}}>PAST SESSIONS ({pSessions.length})</div>
                        {pSessions.length===0
                          ? <div style={{color:t.textFaint,fontSize:11,fontFamily:"mono"}}>No sessions yet</div>
                          : pSessions.slice(0,3).map(s=>(
                              <div key={s.id} style={{marginBottom:7}}>
                                <div style={{color:t.textSub,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.description}</div>
                                <div style={{color:t.textFaint,fontSize:10,fontFamily:"mono"}}>{fmtDate(s.created_at)} · <span style={{color:s.status==="done"?"#4ade80":"#fbbf24"}}>{s.status}</span></div>
                              </div>
                            ))
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  );
}

// ── Input Page ────────────────────────────────────────────
function InputPage({api,onSubmit,onEval,selectedPatient,onClearPatient}){
  const t=useT();
  const [form,setForm]=useState({description:"",bodyPart:"General",duration:"1–3 days",severity:5,notes:selectedPatient?.conditions||""});
  useEffect(()=>{ if(selectedPatient) setForm(f=>({...f,notes:selectedPatient.conditions||""})); },[selectedPatient]);
  const bodyParts=["General","Head / Face","Neck","Chest","Abdomen","Back","Arm / Shoulder","Leg / Hip","Skin","Multiple Areas"];
  const durations=["< 24 hours","1–3 days","4–7 days","1–2 weeks","2–4 weeks","> 1 month","Chronic (> 3 months)"];
  const valid=form.description.trim().length>15;

  return(
    <div style={{minHeight:"100vh",background:t.dark?"radial-gradient(ellipse at 20% 20%,#0d1f3c,#070d1a 60%)":t.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 20px 40px"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,background:`${t.cyan}10`,border:`1px solid ${t.cyan}25`,borderRadius:40,padding:"8px 22px",marginBottom:22}}>
          <span>⚕️</span><span style={{color:t.cyan,fontFamily:"mono",fontSize:12,letterSpacing:3}}>MEDICHAIN · AI DIAGNOSTIC SYSTEM</span>
        </div>
        <h1 style={{fontSize:"clamp(30px,5vw,50px)",fontWeight:300,color:t.text,margin:"0 0 10px",letterSpacing:-1.5,lineHeight:1.1,fontFamily:"serif"}}>
          Describe Your<br/>
          <span style={{background:"linear-gradient(90deg,#22d3ee,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontStyle:"italic"}}>Symptoms</span>
        </h1>
        <p style={{color:t.textMute,fontSize:14,margin:0}}>3 specialized AI agents will collaboratively analyze your case</p>
      </div>

      {selectedPatient&&(
        <div style={{width:"100%",maxWidth:620,background:`${t.cyan}08`,border:`1px solid ${t.cyan}25`,borderRadius:14,padding:"12px 18px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>{selectedPatient.gender==="Male"?"👨":selectedPatient.gender==="Female"?"👩":"🧑"}</span>
            <div>
              <div style={{color:t.cyan,fontSize:13,fontWeight:600}}>{selectedPatient.name}</div>
              <div style={{color:t.textMute,fontSize:11,fontFamily:"mono"}}>Patient profile linked</div>
            </div>
          </div>
          <button onClick={onClearPatient} style={{background:"none",border:"none",color:t.textMute,cursor:"pointer",fontSize:18}}>×</button>
        </div>
      )}

      <div style={{width:"100%",maxWidth:620,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:24,padding:"30px 34px",boxShadow:t.shadow}}>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:8,textTransform:"uppercase"}}>Primary Complaint *</label>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe your symptoms in detail (min. 15 chars)…" rows={4}
            style={{width:"100%",boxSizing:"border-box",background:t.bgInput,border:`1.5px solid ${valid?"#22d3ee":t.border}`,borderRadius:12,padding:"14px 16px",color:t.text,fontSize:14,lineHeight:1.6,fontFamily:"sans-serif",resize:"vertical",outline:"none",transition:"border-color 0.2s"}}/>
          <div style={{color:valid?"#4ade80":t.textFaint,fontSize:11,marginTop:4,textAlign:"right",fontFamily:"mono"}}>{form.description.length} chars {!valid&&form.description.length>0?"— need more detail":valid?"✓":""}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          {[{label:"Body Area",key:"bodyPart",opts:bodyParts},{label:"Duration",key:"duration",opts:durations}].map(({label,key,opts})=>(
            <div key={key}>
              <label style={{display:"block",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>{label}</label>
              <select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                style={{width:"100%",boxSizing:"border-box",background:t.dark?"#0d1829":t.bgInput,border:`1px solid ${t.border}`,borderRadius:10,padding:"11px 14px",color:t.text,fontSize:14,outline:"none",cursor:"pointer",appearance:"none"}}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"flex",justifyContent:"space-between",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>
            <span>Severity</span>
            <span style={{color:sevColor(form.severity),fontWeight:700}}>{sevLabel(form.severity)} — {form.severity}/10</span>
          </label>
          <input type="range" min={1} max={10} value={form.severity} onChange={e=>setForm({...form,severity:Number(e.target.value)})} style={{width:"100%",accentColor:sevColor(form.severity),cursor:"pointer"}}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            {[1,3,5,7,10].map(n=><span key={n} style={{color:t.textFaint,fontSize:10,fontFamily:"mono"}}>{n}</span>)}
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",color:t.textMute,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:7,textTransform:"uppercase"}}>Medical History (Optional)</label>
          <input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Allergies, medications, conditions…"
            style={{width:"100%",boxSizing:"border-box",background:t.bgInput,border:`1px solid ${t.border}`,borderRadius:10,padding:"11px 14px",color:t.text,fontSize:14,outline:"none"}}/>
        </div>
        <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"12px 16px",display:"flex",gap:10,marginBottom:20,alignItems:"flex-start"}}>
          <span style={{flexShrink:0}}>⚠️</span>
          <p style={{color:t.dark?"#92400e":"#78350f",fontSize:12,margin:0,lineHeight:1.65}}><strong style={{color:"#fbbf24"}}>Educational Use Only.</strong> Not medical advice. Consult a qualified healthcare professional.</p>
        </div>
        <button onClick={()=>valid&&onSubmit({...form,patient_id:selectedPatient?.id||null})} disabled={!valid}
          style={{width:"100%",padding:"14px",background:valid?"linear-gradient(135deg,#22d3ee,#0ea5e9)":"rgba(128,128,128,0.15)",border:"none",borderRadius:12,color:valid?"#070d1a":t.textMute,fontSize:15,fontWeight:700,cursor:valid?"pointer":"not-allowed",marginBottom:10,transition:"all 0.2s"}}>
          Begin AI Consultation →
        </button>
        <button onClick={onEval} style={{width:"100%",padding:"10px",background:`${t.purple}10`,border:`1px solid ${t.purple}30`,borderRadius:12,color:t.purple,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          📊 MedQA Evaluation Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Chat Page ─────────────────────────────────────────────
function ChatPage({api,symptoms,onComplete,onBack}){
  const t=useT();
  const [msgs,setMsgs]=useState([]);
  const [logs,setLogs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [phase,setPhase]=useState("interviewing");
  const [sessionId,setSessionId]=useState(null);
  const [showPanel,setShowPanel]=useState(true);
  const msgEnd=useRef(null); const logEnd=useRef(null);
  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  useEffect(()=>{logEnd.current?.scrollIntoView({behavior:"smooth"});},[logs]);
  useEffect(()=>{init();},[]);
  function addLog(ag,text,time=new Date()){setLogs(p=>[...p,{id:Math.random().toString(36).slice(2),agent:ag,text,time}]);}
  async function init(){
    setLoading(true);
    try{const d=await api.start(symptoms);setSessionId(d.session_id);setMsgs([{role:"ai",agent:"interviewer",text:d.reply,time:new Date()}]);addLog("interviewer","Session initialized. Beginning SOCRATES-based assessment.");}
    catch(e){addLog("interviewer",`⚠️ Backend error: ${e.message}`);}
    setLoading(false);
  }
  async function send(){
    if(!input.trim()||loading||phase!=="interviewing"||!sessionId)return;
    const txt=input.trim();setInput("");
    setMsgs(p=>[...p,{role:"user",text:txt,time:new Date()}]);setLoading(true);
    try{
      const d=await api.chat({session_id:sessionId,user_message:txt});
      setMsgs(p=>[...p,{role:"ai",agent:"interviewer",text:d.reply,time:new Date()}]);
      addLog("interviewer",`Response recorded. ${d.trigger_diagnose?"Triggering diagnosis.":"Continuing."}`);
      if(d.trigger_diagnose){
        setPhase("analyzing");addLog("diagnostician","📥 Querying ChromaDB PubMed database…");
        await new Promise(r=>setTimeout(r,600));
        const dd=await api.diagnose({session_id:sessionId});
        addLog("diagnostician",dd.diagnosis,new Date());
        if(dd.refs?.length>0)addLog("diagnostician",`📚 ${dd.refs.length} PubMed articles retrieved`,new Date());
        addLog("critic","📥 Senior review in progress…");await new Promise(r=>setTimeout(r,400));
        addLog("critic",dd.review,new Date());
        setPhase("done");
        setTimeout(()=>onComplete({symptoms,date:new Date(),sessionId,transcript:msgs.concat([{role:"user",text:txt}]),diagnosis:dd.diagnosis,review:dd.review,refs:dd.refs||[]}),1500);
      }
    }catch(e){addLog("interviewer",`⚠️ ${e.message}`);}
    setLoading(false);
  }
  const userBubble=t.dark?"linear-gradient(135deg,#0ea5e9,#22d3ee)":"linear-gradient(135deg,#22d3ee,#38bdf8)";
  const aiBubble=t.dark?"rgba(255,255,255,0.05)":t.bgCard;
  return(
    <div style={{height:"100vh",background:t.bg,display:"flex",flexDirection:"column",overflow:"hidden",paddingTop:56}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",flexShrink:0,borderBottom:`1px solid ${t.border}`,background:t.dark?"rgba(0,0,0,0.3)":t.bgCard}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:t.textMute,cursor:"pointer",fontSize:18}}>←</button>
          {sessionId&&<span style={{color:t.textFaint,fontSize:10,fontFamily:"mono"}}>{sessionId.slice(0,8)}…</span>}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <StatusPill phase={phase}/>
          <button onClick={()=>setShowPanel(v=>!v)} style={{background:showPanel?`${t.purple}15`:t.bgInput,border:`1px solid ${showPanel?`${t.purple}35`:t.border}`,borderRadius:8,padding:"6px 13px",color:showPanel?t.purple:t.textMute,fontSize:12,cursor:"pointer",fontFamily:"mono"}}>
            {showPanel?"Hide":"Show"} Agents
          </button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:showPanel?"0 0 54%":"1",display:"flex",flexDirection:"column",borderRight:showPanel?`1px solid ${t.border}`:"none"}}>
          <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
            <div style={{background:`${t.cyan}08`,border:`1px solid ${t.cyan}20`,borderRadius:14,padding:"12px 16px",marginBottom:16}}>
              <div style={{color:t.cyan,fontSize:9,fontFamily:"mono",letterSpacing:2,marginBottom:4}}>ACTIVE CASE</div>
              <div style={{color:t.textSub,fontSize:13}}><span style={{color:t.text,fontWeight:500}}>{symptoms.description}</span><span style={{color:t.textMute,marginLeft:8}}>· {symptoms.bodyPart} · {symptoms.severity}/10</span></div>
            </div>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:10,marginBottom:12,alignItems:"flex-end"}}>
                {m.role!=="user"&&<div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:AGENTS.interviewer.bg,border:`1px solid ${AGENTS.interviewer.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🩺</div>}
                <div style={{maxWidth:"78%"}}>
                  {m.role!=="user"&&<div style={{color:AGENTS.interviewer.color,fontSize:9,fontFamily:"mono",marginBottom:4}}>INTERVIEWER</div>}
                  <div style={{background:m.role==="user"?userBubble:aiBubble,border:m.role==="user"?"none":`1px solid ${t.border}`,borderRadius:m.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px",padding:"10px 14px",color:m.role==="user"?"#070d1a":t.text,fontSize:14,lineHeight:1.65,boxShadow:t.dark?"none":"0 2px 8px rgba(0,0,0,0.06)"}}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            {loading&&phase==="interviewing"&&<div style={{display:"flex",gap:10,alignItems:"flex-end"}}><div style={{width:32,height:32,borderRadius:"50%",background:AGENTS.interviewer.bg,border:`1px solid ${AGENTS.interviewer.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🩺</div><div style={{background:aiBubble,border:`1px solid ${t.border}`,borderRadius:"4px 18px 18px 18px",padding:"10px 14px"}}><Dots color={AGENTS.interviewer.color}/></div></div>}
            {phase==="analyzing"&&<div style={{textAlign:"center",padding:"24px",background:`${t.purple}08`,border:`1px solid ${t.purple}20`,borderRadius:16,marginTop:12}}><div style={{fontSize:28,marginBottom:8}}>🔬</div><div style={{color:t.purple,fontFamily:"mono",fontSize:13}}>AI Medical Team Analyzing…</div></div>}
            {phase==="done"&&<div style={{textAlign:"center",padding:"24px",background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:16,marginTop:12}}><div style={{fontSize:28,marginBottom:8}}>✅</div><div style={{color:"#4ade80",fontFamily:"mono",fontSize:13}}>Complete — Loading Results…</div></div>}
            <div ref={msgEnd}/>
          </div>
          {phase==="interviewing"&&(
            <div style={{padding:"12px 18px",borderTop:`1px solid ${t.border}`,display:"flex",gap:10,background:t.dark?"rgba(0,0,0,0.2)":t.bgCard,flexShrink:0}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Type your response…" disabled={loading}
                style={{flex:1,background:t.bgInput,border:`1px solid ${t.border}`,borderRadius:11,padding:"11px 14px",color:t.text,fontSize:14,fontFamily:"sans-serif",outline:"none"}}/>
              <button onClick={send} disabled={!input.trim()||loading}
                style={{background:input.trim()&&!loading?"linear-gradient(135deg,#22d3ee,#0ea5e9)":"rgba(128,128,128,0.15)",border:"none",borderRadius:11,padding:"11px 18px",color:input.trim()&&!loading?"#070d1a":t.textMute,fontSize:14,fontWeight:700,cursor:input.trim()&&!loading?"pointer":"not-allowed",whiteSpace:"nowrap"}}>Send →</button>
            </div>
          )}
        </div>
        {showPanel&&(
          <div style={{flex:"0 0 46%",display:"flex",flexDirection:"column",background:t.dark?"rgba(0,0,0,0.25)":t.bg}}>
            <div style={{padding:"12px 20px",borderBottom:`1px solid ${t.border}`,flexShrink:0}}><div style={{color:t.textFaint,fontFamily:"mono",fontSize:10,letterSpacing:2}}>AGENT REASONING + RAG</div></div>
            <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
              {logs.length===0&&<div style={{color:t.textFaint,textAlign:"center",paddingTop:40,fontFamily:"mono",fontSize:11}}>Awaiting agent activity…</div>}
              {logs.map(log=>(
                <div key={log.id} style={{marginBottom:16,borderLeft:`2px solid ${AGENTS[log.agent].color}`,paddingLeft:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><Badge k={log.agent}/><span style={{color:t.textFaint,fontSize:10,fontFamily:"mono"}}>{fmtTime(log.time)}</span></div>
                  <div style={{color:t.textSub,fontSize:11,lineHeight:1.7,fontFamily:"mono",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{log.text}</div>
                </div>
              ))}
              <div ref={logEnd}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Results Page ──────────────────────────────────────────
function ResultsPage({api,result,onNew,onHistory,onFlow}){
  const t=useT();
  const [tab,setTab]=useState("diagnosis");
  const tabs=[{id:"diagnosis",label:"🔬 Diagnosis"},{id:"review",label:"⚖️ Critic"},{id:"refs",label:`📚 Refs (${result.refs.length})`},{id:"transcript",label:"💬 Transcript"}];
  return(
    <div style={{minHeight:"100vh",background:t.bg,padding:"72px 24px 40px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:14}}>
          <div>
            <div style={{color:t.textFaint,fontFamily:"mono",fontSize:10,letterSpacing:2,marginBottom:5}}>DIAGNOSTIC REPORT · {result.date.toLocaleDateString("en-AU")}</div>
            <h2 style={{color:t.text,fontSize:26,fontWeight:300,margin:0,fontFamily:"serif",letterSpacing:-0.5}}>Diagnostic Result Dashboard</h2>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {result.sessionId&&<ExportBtns url={t2=>api.exportUrl(result.sessionId,t2)}/>}
            <button onClick={onFlow} style={{background:`${t.cyan}10`,border:`1px solid ${t.cyan}25`,borderRadius:10,padding:"9px 14px",color:t.cyan,fontSize:13,cursor:"pointer",fontWeight:600}}>🔀 Flow</button>
            <button onClick={onHistory} style={{background:t.bgInput,border:`1px solid ${t.border}`,borderRadius:10,padding:"9px 14px",color:t.textSub,fontSize:13,cursor:"pointer"}}>📋 History</button>
            <button onClick={onNew} style={{background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:10,padding:"9px 16px",color:"#070d1a",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ New</button>
          </div>
        </div>
        <div style={{background:`${t.cyan}06`,border:`1px solid ${t.cyan}18`,borderRadius:14,padding:"14px 20px",marginBottom:18,display:"flex",gap:28,flexWrap:"wrap"}}>
          {[{l:"COMPLAINT",v:result.symptoms.description.slice(0,60)+(result.symptoms.description.length>60?"…":"")},{l:"AREA",v:result.symptoms.bodyPart},{l:"DURATION",v:result.symptoms.duration},{l:"SEVERITY",v:`${result.symptoms.severity}/10 — ${sevLabel(result.symptoms.severity)}`}].map(({l,v})=>(
            <div key={l}><div style={{color:t.textFaint,fontSize:9,fontFamily:"mono",letterSpacing:1.5}}>{l}</div><div style={{color:t.text,fontSize:13,marginTop:3,fontWeight:500}}>{v}</div></div>
          ))}
        </div>
        <div style={{display:"flex",gap:3,marginBottom:16,background:t.dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.03)",borderRadius:12,padding:4,width:"fit-content",border:`1px solid ${t.border}`}}>
          {tabs.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} style={{background:tab===tb.id?t.dark?"rgba(255,255,255,0.08)":"#ffffff":"transparent",border:"none",borderRadius:9,padding:"8px 14px",color:tab===tb.id?t.text:t.textMute,fontSize:13,cursor:"pointer",fontWeight:tab===tb.id?600:400,boxShadow:tab===tb.id&&!t.dark?"0 2px 8px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"}}>{tb.label}</button>)}
        </div>
        <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:18,padding:"24px 28px",boxShadow:t.dark?"none":"0 4px 24px rgba(0,0,0,0.06)"}}>
          {(tab==="diagnosis"||tab==="review")&&(
            <><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><Badge k={tab==="diagnosis"?"diagnostician":"critic"} size="md"/><span style={{color:t.textMute,fontSize:13}}>{tab==="diagnosis"?"RAG-grounded differential diagnosis":"Safety review & evidence check"}</span></div>
            <div style={{color:t.text,fontSize:13,lineHeight:1.85,fontFamily:"mono",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{tab==="diagnosis"?result.diagnosis:result.review}</div></>
          )}
          {tab==="refs"&&result.refs.map((r,i)=>(
            <div key={i} style={{marginBottom:18,paddingBottom:18,borderBottom:i<result.refs.length-1?`1px solid ${t.border}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:4}}>
                <div style={{color:t.text,fontSize:13,fontWeight:500}}>[{i+1}] {r.title}</div>
                <span style={{background:`${t.purple}15`,color:t.purple,borderRadius:8,padding:"2px 8px",fontSize:10,fontFamily:"mono",whiteSpace:"nowrap"}}>{r.score}</span>
              </div>
              <div style={{color:t.textMute,fontSize:12,marginBottom:5}}>{r.authors} · {r.year}</div>
              <a href={r.url} target="_blank" rel="noreferrer" style={{color:t.cyan,fontSize:12,textDecoration:"none"}}>→ PubMed ↗</a>
            </div>
          ))}
          {tab==="transcript"&&result.transcript.map((m,i)=>(
            <div key={i} style={{marginBottom:16}}>
              <div style={{color:m.role==="user"?t.cyan:t.textMute,fontSize:9,fontFamily:"mono",letterSpacing:1.5,marginBottom:4}}>{m.role==="user"?"PATIENT":"INTERVIEWER"}</div>
              <div style={{color:t.textSub,fontSize:14,lineHeight:1.65}}>{m.text}</div>
              {i<result.transcript.length-1&&<div style={{borderTop:`1px solid ${t.border}`,marginTop:14}}/>}
            </div>
          ))}
        </div>
        <div style={{marginTop:14,padding:"12px 16px",background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:10}}>
          <p style={{color:t.dark?"#92400e":"#78350f",fontSize:11,margin:0}}>⚠️ <strong style={{color:"#fbbf24"}}>Disclaimer:</strong> <span>Educational use only. Not medical advice.</span></p>
        </div>
      </div>
    </div>
  );
}

// ── Flow Page ─────────────────────────────────────────────
function FlowPage({result,onBack}){
  const t=useT();
  const [active,setActive]=useState(null);
  const nodes=[
    {id:"input",    x:60, y:30, w:180,h:60, icon:"📋",title:"PATIENT INPUT",  color:"#64748b",info:`${result.symptoms.description.slice(0,80)}`},
    {id:"interview",x:60, y:150,w:200,h:110,icon:"🩺",title:"INTERVIEWER",    color:"#22d3ee",info:`${result.transcript.length} messages\nSOCRATES framework`},
    {id:"rag",      x:290,y:150,w:180,h:110,icon:"📚",title:"RAG · ChromaDB", color:"#38bdf8",info:`${result.refs.length} PubMed docs\nall-MiniLM-L6-v2`},
    {id:"diag",     x:175,y:320,w:200,h:100,icon:"🔬",title:"DIAGNOSTICIAN",  color:"#a78bfa",info:result.diagnosis.slice(0,200)+"…"},
    {id:"critic",   x:175,y:480,w:200,h:100,icon:"⚖️",title:"CRITIC AGENT",   color:"#fb923c",info:result.review.slice(0,200)+"…"},
    {id:"output",   x:175,y:640,w:200,h:60, icon:"✅",title:"REPORT",         color:"#4ade80",info:`PDF + JSON export\nSession: ${result.sessionId?.slice(0,8)}…`},
  ];
  const an=nodes.find(n=>n.id===active);
  return(
    <div style={{minHeight:"100vh",background:t.bg,padding:"72px 24px 40px"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",color:t.textMute,cursor:"pointer",fontSize:14,marginBottom:6,display:"block"}}>← Back</button>
            <h2 style={{color:t.text,fontSize:24,fontWeight:300,margin:0,fontFamily:"serif"}}>Reasoning Flow</h2>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"500px 1fr",gap:20}}>
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:20,padding:24,position:"relative",height:760,overflow:"hidden",boxShadow:t.dark?"none":"0 4px 24px rgba(0,0,0,0.06)"}}>
            <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",pointerEvents:"none"}}>
              {[["155","90","155","148"],["155","260","265","318"],["375","260","265","318"],["265","420","265","478"],["265","580","265","638"]].map(([x1,y1,x2,y2],i)=>(
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.dark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"} strokeWidth="1.5" strokeDasharray="4 3"/>
              ))}
            </svg>
            {nodes.map(n=>(
              <div key={n.id} onClick={()=>setActive(active===n.id?null:n.id)} style={{position:"absolute",left:n.x,top:n.y,width:n.w,height:n.h,background:active===n.id?`${n.color}12`:t.dark?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.7)",border:`${active===n.id?2:1}px solid ${active===n.id?n.color:n.color+"40"}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",transition:"all 0.2s",boxShadow:active===n.id?`0 0 20px ${n.color}25`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:15}}>{n.icon}</span>
                  <span style={{color:n.color,fontSize:10,fontFamily:"mono",fontWeight:700,letterSpacing:1}}>{n.title}</span>
                </div>
                <div style={{color:t.textMute,fontSize:10,fontFamily:"mono",lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.info.split("\n")[0]}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:16,padding:20,minHeight:200,boxShadow:t.dark?"none":"0 2px 12px rgba(0,0,0,0.05)"}}>
              {an?<><div style={{color:an.color,fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:12}}>{an.title}</div>
                <div style={{color:t.textSub,fontSize:12,lineHeight:1.75,fontFamily:"mono",whiteSpace:"pre-wrap"}}>{an.info}</div></>
               :<div style={{color:t.textFaint,textAlign:"center",paddingTop:50,fontFamily:"mono",fontSize:11}}>Click a node to see details</div>}
            </div>
            <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:16,padding:16}}>
              <div style={{color:t.textFaint,fontSize:10,fontFamily:"mono",letterSpacing:2,marginBottom:12}}>PIPELINE STATS</div>
              {[{l:"Interview turns",v:result.transcript.length,c:t.cyan},{l:"RAG docs",v:result.refs.length,c:"#38bdf8"},{l:"Agents",v:"3",c:t.purple},{l:"Safety",v:result.review.includes("CRITICAL")?"⚠ CRITICAL":"✓ Clear",c:result.review.includes("CRITICAL")?"#f87171":"#4ade80"}].map(({l,v,c})=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{color:t.textMute,fontSize:11,fontFamily:"mono"}}>{l}</span>
                  <span style={{color:c,fontSize:11,fontFamily:"mono",fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── History Page ──────────────────────────────────────────
function HistoryPage({api,onBack,onNew}){
  const t=useT();
  const [sessions,setSessions]=useState([]); const [loading,setLoading]=useState(true);
  const [sel,setSel]=useState(null); const [detail,setDetail]=useState(null);
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setSessions(await api.sessions());}catch(e){}setLoading(false);}
  async function loadDetail(id){if(sel===id){setSel(null);setDetail(null);return;}setSel(id);try{setDetail(await api.session(id));}catch(e){}}
  return(
    <div style={{minHeight:"100vh",background:t.bg,padding:"72px 24px 40px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
          <div>
            <h2 style={{color:t.text,fontSize:26,fontWeight:300,margin:0,fontFamily:"serif"}}>Session History</h2>
            <div style={{color:t.textFaint,fontSize:11,fontFamily:"mono",marginTop:4}}>{loading?"Loading…":`${sessions.length} sessions · SQLite`}</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={load} style={{background:t.bgInput,border:`1px solid ${t.border}`,borderRadius:10,padding:"9px 16px",color:t.textSub,fontSize:13,cursor:"pointer"}}>↻ Refresh</button>
            <button onClick={onNew} style={{background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:10,padding:"9px 18px",color:"#070d1a",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ New</button>
          </div>
        </div>
        {loading?<div style={{textAlign:"center",padding:"60px",color:t.textFaint,fontFamily:"mono"}}>Loading…</div>
        :sessions.length===0?<div style={{textAlign:"center",padding:"80px",color:t.textFaint,fontFamily:"mono",background:t.bgCard,borderRadius:20,border:`1px solid ${t.border}`}}><div style={{fontSize:44,marginBottom:16}}>📋</div>No sessions yet</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sessions.map(s=>(
            <div key={s.id}>
              <div onClick={()=>loadDetail(s.id)} style={{background:sel===s.id?`${t.cyan}05`:t.bgCard,border:`1px solid ${sel===s.id?`${t.cyan}25`:t.border}`,borderRadius:sel===s.id?"14px 14px 0 0":14,padding:"16px 20px",cursor:"pointer",boxShadow:t.dark?"none":"0 2px 8px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{color:t.text,fontSize:14,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:500,fontWeight:500}}>{s.description}</div>
                  <div style={{display:"flex",gap:12}}><span style={{color:t.textMute,fontSize:11,fontFamily:"mono"}}>{fmtDate(s.created_at)}</span><span style={{color:s.status==="done"?"#4ade80":"#fbbf24",fontSize:11,fontFamily:"mono"}}>● {s.status}</span></div></div>
                  <span style={{color:t.textFaint}}>{sel===s.id?"▲":"▼"}</span>
                </div>
              </div>
              {sel===s.id&&detail&&(
                <div style={{background:t.dark?"rgba(255,255,255,0.02)":t.bgCard,border:`1px solid ${t.cyan}18`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"16px 20px"}}>
                  {detail.status==="done"&&<div style={{marginBottom:12}}><ExportBtns url={t2=>api.exportUrl(s.id,t2)} small/></div>}
                  <div style={{color:t.textMute,fontSize:12,lineHeight:1.7,fontFamily:"mono",whiteSpace:"pre-wrap"}}>{detail.diagnosis?.slice(0,500)}{detail.diagnosis?.length>500?"\n…":""}</div>
                </div>
              )}
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ── MedQA Eval ────────────────────────────────────────────
function EvalPage({api}){
  const t=useT();
  const [questions,setQuestions]=useState([]);
  const [history,setHistory]=useState({records:[],stats:{total:0,single_accuracy:0,multi_accuracy:0,improvement:0,by_category:{}}});
  const [running,setRunning]=useState(null);
  const [results,setResults]=useState({});
  const [selQ,setSelQ]=useState(null);
  useEffect(()=>{loadData();},[]);
  async function loadData(){
    try{
      const [qs,hist]=await Promise.all([api.questions(),api.evalHist()]);
      setQuestions(qs.questions||[]); setHistory(hist);
      const rm={};
      for(const r of hist.records||[]){if(!rm[r.question_id])rm[r.question_id]={single:{answer:r.single_answer,reasoning:r.single_reasoning},multi:{answer:r.multi_answer,reasoning:r.multi_reasoning},single_correct:!!r.single_correct,multi_correct:!!r.multi_correct};}
      setResults(rm);
    }catch(e){}
  }
  async function runQ(qid){
    setRunning(qid);
    try{const d=await api.evalRun({question_id:qid,mode:"both"});setResults(p=>({...p,[qid]:d}));await loadData();}
    catch(e){alert(e.message);}
    setRunning(null);
  }
  async function runAll(){for(const q of questions){await runQ(q.id);await new Promise(r=>setTimeout(r,500));}}
  const st=history.stats;
  const catColors={"Cardiology":"#f87171","Neurology":"#a78bfa","Endocrinology":"#fbbf24","Pulmonology":"#38bdf8"};
  return(
    <div style={{minHeight:"100vh",background:t.bg,padding:"72px 24px 40px"}}>
      <div style={{maxWidth:1000,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:14}}>
          <div>
            <h2 style={{color:t.text,fontSize:26,fontWeight:300,margin:0,fontFamily:"serif"}}>MedQA Evaluation</h2>
            <div style={{color:t.textFaint,fontSize:11,fontFamily:"mono",marginTop:4,letterSpacing:1.5}}>MULTI-AGENT vs SINGLE-LLM BENCHMARK</div>
          </div>
          <button onClick={runAll} disabled={!!running} style={{background:running?"rgba(128,128,128,0.15)":"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",borderRadius:10,padding:"10px 20px",color:running?"#64748b":"#fff",fontSize:13,fontWeight:700,cursor:running?"not-allowed":"pointer"}}>
            {running?"⏳ Running…":"▶ Run All"}
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
          {[{l:"Total Runs",v:st.total,c:t.textMute,s:""},{l:"Single LLM",v:st.single_accuracy,c:"#38bdf8",s:"%"},{l:"Multi-Agent",v:st.multi_accuracy,c:t.purple,s:"%"},{l:"Improvement",v:(st.improvement>=0?"+":"")+st.improvement,c:st.improvement>=0?"#4ade80":"#f87171",s:"%"}].map(({l,v,c,s})=>(
            <div key={l} style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,padding:"16px 18px",boxShadow:t.dark?"none":"0 2px 8px rgba(0,0,0,0.05)"}}>
              <div style={{color:t.textFaint,fontSize:9,fontFamily:"mono",letterSpacing:1.5,marginBottom:6}}>{l.toUpperCase()}</div>
              <div style={{color:c,fontSize:26,fontWeight:700,fontFamily:"mono"}}>{v}{s}</div>
            </div>
          ))}
        </div>
        {st.total>0&&(
          <div style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,padding:"16px 20px",marginBottom:18}}>
            {[{l:"Single LLM",c:"#38bdf8",v:st.single_accuracy},{l:"Multi-Agent",c:t.purple,v:st.multi_accuracy}].map(({l,c,v})=>(
              <div key={l} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:t.textSub,fontSize:12,fontFamily:"mono"}}>{l}</span><span style={{color:c,fontSize:12,fontFamily:"mono",fontWeight:700}}>{v}%</span></div>
                <div style={{height:8,background:t.dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)",borderRadius:4}}><div style={{height:"100%",width:`${v}%`,background:c,borderRadius:4,opacity:.85,transition:"width 1s"}}/></div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {questions.map(q=>{
            const r=results[q.id];const isRunning=running===q.id;
            return(
              <div key={q.id} style={{background:t.bgCard,border:`1px solid ${selQ===q.id?`${t.purple}40`:t.border}`,borderRadius:14,overflow:"hidden",boxShadow:t.dark?"none":"0 2px 8px rgba(0,0,0,0.05)"}}>
                <div onClick={()=>setSelQ(selQ===q.id?null:q.id)} style={{padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      <span style={{background:`${catColors[q.category]||"#64748b"}20`,color:catColors[q.category]||t.textMute,border:`1px solid ${catColors[q.category]||"#64748b"}40`,borderRadius:20,padding:"2px 10px",fontSize:10,fontFamily:"mono"}}>{q.category}</span>
                      {r&&<>
                        <span style={{color:r.single_correct?"#4ade80":"#f87171",fontSize:10,fontFamily:"mono"}}>Single: {r.single?.answer} {r.single_correct?"✓":"✗"}</span>
                        <span style={{color:r.multi_correct?"#4ade80":"#f87171",fontSize:10,fontFamily:"mono"}}>Multi: {r.multi?.answer} {r.multi_correct?"✓":"✗"}</span>
                      </>}
                    </div>
                    <div style={{color:t.text,fontSize:13,lineHeight:1.6}}>{q.question}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();runQ(q.id);}} disabled={isRunning||!!running}
                    style={{background:isRunning?"rgba(128,128,128,0.1)":r?`${t.purple}15`:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:r?`1px solid ${t.purple}30`:"none",borderRadius:9,padding:"7px 14px",color:isRunning?t.textMute:r?t.purple:"#fff",fontSize:12,fontWeight:700,cursor:isRunning||running?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    {isRunning?"⏳…":r?"↻ Re-run":"▶ Run"}
                  </button>
                </div>
                {selQ===q.id&&(
                  <div style={{padding:"0 20px 18px",borderTop:`1px solid ${t.border}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14,marginBottom:r?16:0}}>
                      {Object.entries(q.options).map(([k,v])=>(
                        <div key={k} style={{background:k===q.correct?"rgba(74,222,128,0.08)":t.bgInput,border:`1px solid ${k===q.correct?"rgba(74,222,128,0.3)":t.border}`,borderRadius:10,padding:"10px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
                          <span style={{color:k===q.correct?"#4ade80":t.textMute,fontSize:12,fontFamily:"mono",fontWeight:700,flexShrink:0}}>{k}.</span>
                          <span style={{color:k===q.correct?t.text:t.textMute,fontSize:12,flex:1}}>{v}</span>
                          <div style={{display:"flex",gap:3,flexShrink:0}}>
                            {r?.single?.answer===k&&<span style={{background:"rgba(56,189,248,0.15)",color:"#38bdf8",borderRadius:4,padding:"1px 5px",fontSize:9,fontFamily:"mono"}}>S</span>}
                            {r?.multi?.answer===k&&<span style={{background:`${t.purple}20`,color:t.purple,borderRadius:4,padding:"1px 5px",fontSize:9,fontFamily:"mono"}}>M</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {r&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        {[{l:"🔵 Single LLM",c:"#38bdf8",d:r.single,ok:r.single_correct},{l:"🟣 Multi-Agent",c:t.purple,d:r.multi,ok:r.multi_correct}].map(({l,c,d,ok})=>(
                          <div key={l} style={{background:`${c}08`,border:`1px solid ${c}25`,borderRadius:12,padding:14}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:c,fontSize:11,fontFamily:"mono",fontWeight:700}}>{l}</span><span style={{color:ok?"#4ade80":"#f87171",fontSize:11,fontFamily:"mono"}}>{d?.answer} {ok?"✓":"✗"}</span></div>
                            <div style={{color:t.textMute,fontSize:11,lineHeight:1.65,fontFamily:"mono"}}>{d?.reasoning?.slice(0,150)}{d?.reasoning?.length>150?"…":""}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────
function AppInner(){
  const auth   = useAuth();
  const t      = useT();
  const [page,setPage]           = useState("input");
  const [symptoms,setSymptoms]   = useState(null);
  const [result,setResult]       = useState(null);
  const [selPatient,setSelPatient] = useState(null);
  const api = makeApi(auth.token);

  useEffect(()=>{
    const link=document.createElement("link"); link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,300;1,300&display=swap";
    document.head.appendChild(link);
    const st=document.createElement("style");
    st.textContent=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{background:${t.bg};font-family:'DM Sans',sans-serif;transition:background 0.2s}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.2);border-radius:4px}@keyframes mcdot{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-5px);opacity:1}}select{appearance:none}input[type=range]{-webkit-appearance:none;width:100%;height:5px;border-radius:5px;background:rgba(128,128,128,0.2);outline:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid ${t.bg};background:currentColor}`;
    document.head.appendChild(st);
    return()=>{try{document.head.removeChild(link);document.head.removeChild(st);}catch(_){}};
  },[t.dark]);

  if(!auth.ready) return(
    <div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",color:t.cyan,fontFamily:"mono",fontSize:13}}>
      ⚕️ Loading MediChain…
    </div>
  );

  function goNew(){ setSymptoms(null); setResult(null); setPage("input"); }
  function handleNav(p){ setPage(p); }
  function handleLogin(tk,u){ auth.login(tk,u); setPage("input"); }
  function handleLogout(){ auth.logout(); setPage("input"); }
  function startConsultForPatient(p){ setSelPatient(p); setPage("input"); }

  return(
    <>
      <TopNav user={auth.user} onLogout={handleLogout} onNav={handleNav} page={page}/>
      {page==="auth"&&<AuthPage api={api} onLogin={handleLogin} onSkip={()=>setPage("input")}/>}
      {page==="input"&&<InputPage api={api} onSubmit={f=>{setSymptoms(f);setPage("chat");}} onEval={()=>setPage("eval")} selectedPatient={selPatient} onClearPatient={()=>setSelPatient(null)}/>}
      {page==="patients"&&auth.user&&<PatientsPage api={api} onStartConsult={startConsultForPatient}/>}
      {page==="patients"&&!auth.user&&<AuthPage api={api} onLogin={handleLogin} onSkip={()=>setPage("input")}/>}
      {page==="chat"&&symptoms&&<ChatPage api={api} symptoms={symptoms} onBack={()=>setPage("input")} onComplete={r=>{setResult(r);setPage("result");}}/>}
      {page==="result"&&result&&<ResultsPage api={api} result={result} onNew={goNew} onHistory={()=>setPage("history")} onFlow={()=>setPage("flow")}/>}
      {page==="flow"&&result&&<FlowPage result={result} onBack={()=>setPage("result")}/>}
      {page==="history"&&<HistoryPage api={api} onBack={()=>result?setPage("result"):setPage("input")} onNew={goNew}/>}
      {page==="eval"&&<EvalPage api={api}/>}
    </>
  );
}

export default function MediChainApp(){
  return(
    <ThemeProvider>
      <AppInner/>
    </ThemeProvider>
  );
}
