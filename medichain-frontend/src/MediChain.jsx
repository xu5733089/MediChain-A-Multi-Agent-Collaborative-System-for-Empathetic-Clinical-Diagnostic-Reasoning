import { useState } from "react";
import {
  Caduceus,
  IllustWreath,
  ECGLine,
  AmbientBlobs,
} from "./components/illustrations";
import TopNav from "./components/TopNav";
import AuthPage from "./pages/AuthPage";
import InputPage from "./pages/InputPage";
import ChatPage from "./pages/ChatPage";
import ResultsPage from "./pages/ResultsPage";
import FlowPage from "./pages/FlowPage";
import HistoryPage from "./pages/HistoryPage";
import PatientsPage from "./pages/PatientsPage";
import EvalPage from "./pages/EvalPage";
import { makeApi } from "./core/api";
import { useAuth } from "./core/auth";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./styles/medichain-global.css";

/* ═══════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════ */
function AppInner() {
  const auth = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [symptoms, setSymp] = useState(null);
  const [result, setResult] = useState(null);
  const [selPat, setSelPat] = useState(null);
  const api = makeApi(auth.token);
  const page = location.pathname.replace(/^\//, "") || "input";

  if (!auth.ready) return (
    <div style={{ minHeight:"100vh", background:"var(--paper)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1 }}>
      <AmbientBlobs/>
      <IllustWreath size={280} style={{ position:"absolute", opacity:0.14, animation:"drift 14s infinite" }}/>
      <div style={{ textAlign:"center", position:"relative", zIndex:1 }}>
        <div className="ink-bloom" style={{ display:"inline-flex", width:80, height:80, borderRadius:22, background:"linear-gradient(135deg,var(--paper2),var(--paper3))", border:"2px solid rgba(22,15,6,0.1)", alignItems:"center", justifyContent:"center", marginBottom:22, boxShadow:"var(--shadow-lg)", animation:"glowPulse 2.5s infinite", color:"var(--rose)" }}>
          <Caduceus size={48}/>
        </div>
        <p style={{ fontFamily:"var(--serif)", fontSize:24, fontStyle:"italic", color:"var(--ink3)" }}>Loading MediChain…</p>
        <ECGLine style={{ marginTop:16, opacity:0.45, maxWidth:240, margin:"16px auto 0" }}/>
      </div>
    </div>
  );

  const go = (nextPage) => navigate(`/${nextPage}`);
  const goNew = () => { setSymp(null); setResult(null); go("input"); };
  return (
    <>
      <TopNav user={auth.user} onLogout={() => { auth.logout(); go("input"); }} onNav={go} page={page} dark={dark} toggle={toggle}/>
      <Routes>
        <Route path="/" element={<Navigate to="/input" replace />} />
        <Route path="/auth" element={<AuthPage api={api} onLogin={(t, u) => { auth.login(t, u); go("input"); }} onSkip={() => go("input")}/>} />
        <Route path="/input" element={<InputPage api={api} onSubmit={f => { setSymp(f); go("chat"); }} onEval={() => go("eval")} selectedPatient={selPat} onClearPatient={() => setSelPat(null)}/>} />
        <Route path="/patients" element={auth.user
          ? <PatientsPage api={api} onStartConsult={p => { setSelPat(p); go("input"); }}/>
          : <AuthPage api={api} onLogin={(t, u) => { auth.login(t, u); go("patients"); }} onSkip={() => go("input")}/>
        } />
        <Route path="/chat" element={symptoms
          ? <ChatPage api={api} symptoms={symptoms} onBack={() => go("input")} onComplete={r => { setResult(r); go("result"); }}/>
          : <Navigate to="/input" replace />
        } />
        <Route path="/result" element={result
          ? <ResultsPage api={api} result={result} onNew={goNew} onHistory={() => go("history")} onFlow={() => go("flow")}/>
          : <Navigate to="/input" replace />
        } />
        <Route path="/flow" element={result
          ? <FlowPage result={result} onBack={() => go("result")}/>
          : <Navigate to="/input" replace />
        } />
        <Route path="/history" element={<HistoryPage api={api} onNew={goNew}/>} />
        <Route path="/eval" element={<EvalPage api={api}/>} />
        <Route path="*" element={<Navigate to="/input" replace />} />
      </Routes>
    </>
  );
}

export default function MediChainApp() {
  return (
    <ThemeProvider><AppInner/></ThemeProvider>
  );
}
