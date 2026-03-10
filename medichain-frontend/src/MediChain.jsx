import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND = "http://localhost:8000";

const AGENTS = {
  interviewer:  { short:"Interviewer",  icon:"🩺", color:"#22d3ee", bg:"rgba(34,211,238,0.08)",  border:"rgba(34,211,238,0.25)"  },
  diagnostician:{ short:"Diagnostician",icon:"🔬", color:"#a78bfa", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.25)" },
  critic:       { short:"Critic",       icon:"⚖️", color:"#fb923c", bg:"rgba(251,146,60,0.08)",  border:"rgba(251,146,60,0.25)"  },
};

// ── API ──────────────────────────────────────────────────
const api = {
  start:      s  => post("/api/session/start", s),
  chat:       b  => post("/api/session/chat", b),
  diagnose:   b  => post("/api/session/diagnose", b),
  sessions:   () => get("/api/sessions"),
  session:    id => get(`/api/session/${id}`),
  questions:  () => get("/api/eval/questions"),
  evalRun:    b  => post("/api/eval/run", b),
  evalHist:   () => get("/api/eval/history"),
};
async function get(p){ const r=await fetch(BACKEND+p); if(!r.ok) throw new Error(`${r.status}`); return r.json(); }
async function post(p,b){ const r=await fetch(BACKEND+p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}); if(!r.ok) throw new Error(`${r.status}`); return r.json(); }
function dlBackend(url){ const a=document.createElement("a"); a.href=BACKEND+url; a.target="_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a); }

// ── Helpers ───────────────────────────────────────────────
const sevColor = n=>n<=3?"#4ade80":n<=6?"#fbbf24":n<=8?"#fb923c":"#f87171";
const sevLabel = n=>n<=3?"Mild":n<=5?"Moderate":n<=7?"Significant":n<=9?"Severe":"Critical";
const fmtTime  = d=>d.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"});
const fmtDate  = s=>new Date(s).toLocaleDateString("en-AU");
const clamp    = (v,a,b)=>Math.max(a,Math.min(b,v));

// ── Shared Components ─────────────────────────────────────
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
function ExportBtns({sessionId,small}){
  const [ld,setLd]=useState(null);
  const p=small?"6px 12px":"9px 18px"; const fs=small?12:13;
  return(
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button onClick={()=>{setLd("pdf");dlBackend(`/api/session/${sessionId}/export/pdf`);setTimeout(()=>setLd(null),1500);}} disabled={ld==="pdf"}
        style={{background:ld==="pdf"?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#fb923c,#f97316)",border:"none",borderRadius:9,padding:p,color:ld==="pdf"?"#64748b":"#fff",fontSize:fs,fontWeight:700,cursor:ld==="pdf"?"not-allowed":"pointer"}}>
        {ld==="pdf"?"⏳ Generating…":"📄 Export PDF"}
      </button>
      <button onClick={()=>{setLd("json");dlBackend(`/api/session/${sessionId}/export/json`);setTimeout(()=>setLd(null),1500);}} disabled={ld==="json"}
        style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,padding:p,color:"#94a3b8",fontSize:fs,cursor:"pointer"}}>
        {ld==="json"?"⏳…":"{ } JSON"}
      </button>
    </div>
  );
}

// ── PROJ-13: Reasoning Flow Visualizer ───────────────────
function FlowNode({x,y,w,h,color,icon,title,status,children,onClick,active}){
  const border=active?`2px solid ${color}`:`1px solid ${color}40`;
  const glow=active?`0 0 20px ${color}40`:"none";
  return(
    <div onClick={onClick} style={{position:"absolute",left:x,top:y,width:w,height:h,
      background:active?`linear-gradient(135deg,${color}15,${color}08)`:"rgba(255,255,255,0.025)",
      border,borderRadius:16,padding:16,cursor:"pointer",transition:"all 0.2s",boxShadow:glow}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <span style={{fontSize:18}}>{icon}</span>
        <div>
          <div style={{color,fontSize:11,fontFamily:"mono",fontWeight:700,letterSpacing:1}}>{title}</div>
          <div style={{color:status==="done"?"#4ade80":status==="active"?color:"#334155",fontSize:10,fontFamily:"mono"}}>{status==="done"?"✓ Complete":status==="active"?"◉ Processing":"○ Waiting"}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Arrow({x1,y1,x2,y2,color,animated}){
  const mx=(x1+x2)/2;
  return(
    <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible"}}>
      <defs>
        <marker id={`arr-${color.slice(1)}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color}/>
        </marker>
      </defs>
      <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
        stroke={color} strokeWidth={animated?2:1.5} fill="none" opacity={animated?1:0.4}
        strokeDasharray={animated?"8 4":"none"}
        markerEnd={`url(#arr-${color.slice(1)})`}
        style={animated?{animation:"dash 1.5s linear infinite"}:{}}/>
    </svg>
  );
}

function ReasoningFlowPage({result, onBack}){
  const [active,setActive]=useState(null);
  const [detail,setDetail]=useState(null);

  const phases=[
    {id:"input",    icon:"📋",title:"PATIENT INPUT",      color:"#64748b",status:"done",
     content:`Chief: ${result.symptoms.description.slice(0,80)}\nArea: ${result.symptoms.bodyPart} · Duration: ${result.symptoms.duration} · Severity: ${result.symptoms.severity}/10`},
    {id:"interview",icon:"🩺",title:"INTERVIEWER AGENT",  color:"#22d3ee",status:"done",
     content:`SOCRATES framework history-taking.\n${result.transcript.filter(m=>m.role!=="user").length} AI turns · ${result.transcript.filter(m=>m.role==="user").length} patient responses\nSignal: [READY_FOR_DIAGNOSIS] triggered`},
    {id:"rag",      icon:"📚",title:"RAG RETRIEVAL",       color:"#38bdf8",status:"done",
     content:`ChromaDB semantic search\n${result.refs.length} PubMed articles retrieved\nModel: all-MiniLM-L6-v2\nTop score: ${result.refs[0]?.score||"N/A"}`},
    {id:"diag",     icon:"🔬",title:"DIAGNOSTICIAN AGENT", color:"#a78bfa",status:"done",
     content:result.diagnosis.slice(0,300)+"…"},
    {id:"critic",   icon:"⚖️",title:"CRITIC AGENT",        color:"#fb923c",status:"done",
     content:result.review.slice(0,300)+"…"},
    {id:"output",   icon:"✅",title:"DIAGNOSTIC REPORT",   color:"#4ade80",status:"done",
     content:`Report generated\n${result.refs.length} RAG citations\nExport: PDF · JSON\nSession: ${result.sessionId?.slice(0,8)}…`},
  ];

  const coords=[
    {x:30, y:20},  // input
    {x:30, y:180}, // interview
    {x:430,y:180}, // rag
    {x:230,y:350}, // diag
    {x:230,y:520}, // critic
    {x:230,y:690}, // output
  ];

  function select(id){
    const ph=phases.find(p=>p.id===id);
    setActive(id); setDetail(ph);
  }

  return(
    <div style={{minHeight:"100vh",background:"#070d1a",padding:"28px 24px"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,marginBottom:8,display:"block"}}>← Back to Results</button>
            <h2 style={{color:"#f0f4f8",fontSize:26,fontWeight:300,margin:0,fontFamily:"serif",letterSpacing:-0.5}}>Reasoning Flow Visualization</h2>
            <div style={{color:"#334155",fontSize:11,fontFamily:"mono",marginTop:4,letterSpacing:1.5}}>PROJ-13 · MULTI-AGENT PIPELINE TRACE</div>
          </div>
          {result.sessionId&&<ExportBtns sessionId={result.sessionId}/>}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
          {/* Flow canvas */}
          <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:20,padding:24,minHeight:820,position:"relative",overflow:"hidden"}}>
            {/* Grid background */}
            <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",opacity:0.03}} xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
            </svg>

            <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible"}}>
              {/* Input → Interview */}
              <line x1="130" y1="92" x2="130" y2="190" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
              <polygon points="126,185 130,195 134,185" fill="#64748b" opacity="0.5"/>
              {/* Interview → RAG */}
              <line x1="260" y1="255" x2="430" y2="255" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
              <polygon points="425,251 435,255 425,259" fill="#38bdf8" opacity="0.5"/>
              {/* Interview → Diag */}
              <line x1="130" y1="310" x2="280" y2="358" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
              <polygon points="275,354 285,362 282,350" fill="#a78bfa" opacity="0.5"/>
              {/* RAG → Diag */}
              <line x1="480" y1="310" x2="360" y2="358" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
              <polygon points="365,354 355,362 358,350" fill="#a78bfa" opacity="0.5"/>
              {/* Diag → Critic */}
              <line x1="310" y1="480" x2="310" y2="525" stroke="#fb923c" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
              <polygon points="306,520 310,530 314,520" fill="#fb923c" opacity="0.5"/>
              {/* Critic → Output */}
              <line x1="310" y1="648" x2="310" y2="695" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
              <polygon points="306,690 310,700 314,690" fill="#4ade80" opacity="0.5"/>
            </svg>

            {/* Nodes */}
            {[
              {id:"input",    x:30, y:20, w:200,h:68, icon:"📋",title:"PATIENT INPUT",      color:"#64748b"},
              {id:"interview",x:30, y:170,w:220,h:128,icon:"🩺",title:"INTERVIEWER AGENT",  color:"#22d3ee"},
              {id:"rag",      x:300,y:170,w:200,h:128,icon:"📚",title:"RAG · ChromaDB",     color:"#38bdf8"},
              {id:"diag",     x:150,y:345,w:320,h:128,icon:"🔬",title:"DIAGNOSTICIAN AGENT",color:"#a78bfa"},
              {id:"critic",   x:150,y:515,w:320,h:118,icon:"⚖️",title:"CRITIC AGENT",       color:"#fb923c"},
              {id:"output",   x:150,y:685,w:320,h:80, icon:"✅",title:"DIAGNOSTIC REPORT",  color:"#4ade80"},
            ].map(n=>(
              <div key={n.id} onClick={()=>select(n.id)} style={{
                position:"absolute",left:n.x,top:n.y,width:n.w,height:n.h,
                background:active===n.id?`${n.color}12`:"rgba(255,255,255,0.025)",
                border:`${active===n.id?"2":"1"}px solid ${active===n.id?n.color:n.color+"40"}`,
                borderRadius:14,padding:"12px 14px",cursor:"pointer",transition:"all 0.2s",
                boxShadow:active===n.id?`0 0 24px ${n.color}30`:"none",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:16}}>{n.icon}</span>
                  <span style={{color:n.color,fontSize:10,fontFamily:"mono",fontWeight:700,letterSpacing:1}}>{n.title}</span>
                </div>
                <div style={{color:"#475569",fontSize:10,fontFamily:"mono",lineHeight:1.5}}>
                  {n.id==="input"&&`${result.symptoms.description.slice(0,40)}…`}
                  {n.id==="interview"&&`${result.transcript.length} messages · SOCRATES framework`}
                  {n.id==="rag"&&`${result.refs.length} PubMed docs · cosine similarity`}
                  {n.id==="diag"&&`Differential diagnoses · Evidence-grounded`}
                  {n.id==="critic"&&`Safety review · Evidence quality check`}
                  {n.id==="output"&&`✓ PDF + JSON export ready`}
                </div>
                {active===n.id&&<div style={{position:"absolute",top:8,right:10,width:6,height:6,borderRadius:"50%",background:n.color,boxShadow:`0 0 8px ${n.color}`}}/>}
              </div>
            ))}

            {/* Legend */}
            <div style={{position:"absolute",bottom:16,left:16,display:"flex",gap:12,flexWrap:"wrap"}}>
              {[["#22d3ee","AI Agent"],["#38bdf8","RAG/DB"],["#64748b","I/O"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:10,height:2,background:c,opacity:.6}}/>
                  <span style={{color:"#334155",fontSize:9,fontFamily:"mono"}}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Selected node */}
            <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:20,minHeight:260}}>
              {detail?(
                <>
                  <div style={{color:phases.find(p=>p.id===active)?.color||"#64748b",fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:12}}>{detail.title}</div>
                  <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.75,fontFamily:"mono",whiteSpace:"pre-wrap"}}>{detail.content}</div>
                </>
              ):(
                <div style={{color:"#1e293b",textAlign:"center",paddingTop:60,fontFamily:"mono",fontSize:11}}>
                  Click a node to see details
                </div>
              )}
            </div>

            {/* RAG refs quick view */}
            <div style={{background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:16,padding:16}}>
              <div style={{color:"#38bdf8",fontSize:10,fontFamily:"mono",letterSpacing:2,marginBottom:12}}>RAG RETRIEVED · {result.refs.length} ARTICLES</div>
              {result.refs.slice(0,3).map((r,i)=>(
                <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <div style={{color:"#e2e8f0",fontSize:11,marginBottom:3}}>{r.title?.slice(0,55)}…</div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:"#475569",fontSize:10,fontFamily:"mono"}}>{r.year}</span>
                    <span style={{color:"#a78bfa",fontSize:10,fontFamily:"mono"}}>{r.score}</span>
                  </div>
                </div>
              ))}
              {result.refs.length>3&&<div style={{color:"#334155",fontSize:10,fontFamily:"mono"}}>+{result.refs.length-3} more…</div>}
            </div>

            {/* Stats */}
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:16}}>
              <div style={{color:"#334155",fontSize:10,fontFamily:"mono",letterSpacing:2,marginBottom:12}}>PIPELINE STATS</div>
              {[
                {label:"Interview turns",  val:result.transcript.length,        color:"#22d3ee"},
                {label:"RAG documents",    val:result.refs.length,               color:"#38bdf8"},
                {label:"Agents invoked",   val:"3 (sequential)",                 color:"#a78bfa"},
                {label:"Safety flags",     val:result.review.includes("CRITICAL")?"⚠ CRITICAL":"✓ Clear", color:result.review.includes("CRITICAL")?"#f87171":"#4ade80"},
              ].map(({label,val,color})=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{color:"#475569",fontSize:11,fontFamily:"mono"}}>{label}</span>
                  <span style={{color,fontSize:11,fontFamily:"mono",fontWeight:700}}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROJ-14: MedQA Evaluation Dashboard ──────────────────
function EvalDashboard({onBack}){
  const [questions,setQuestions] = useState([]);
  const [history,setHistory]     = useState({records:[],stats:{total:0,single_accuracy:0,multi_accuracy:0,improvement:0,by_category:{}}});
  const [running,setRunning]     = useState(null);
  const [results,setResults]     = useState({});
  const [selQ,setSelQ]           = useState(null);
  const [tab,setTab]             = useState("eval");

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    try{
      const [qs,hist] = await Promise.all([api.questions(), api.evalHist()]);
      setQuestions(qs.questions||[]);
      setHistory(hist);
      // build results map from history
      const rm={};
      for(const r of hist.records||[]){
        if(!rm[r.question_id]) rm[r.question_id]={
          single:{answer:r.single_answer,reasoning:r.single_reasoning},
          multi:{answer:r.multi_answer,reasoning:r.multi_reasoning},
          single_correct:!!r.single_correct, multi_correct:!!r.multi_correct,
        };
      }
      setResults(rm);
    }catch(e){console.error(e);}
  }

  async function runQuestion(qid){
    setRunning(qid);
    try{
      const data = await api.evalRun({question_id:qid,mode:"both"});
      setResults(prev=>({...prev,[qid]:data}));
      await loadData();
    }catch(e){alert(`Error: ${e.message}`);}
    setRunning(null);
  }

  async function runAll(){
    for(const q of questions){
      await runQuestion(q.id);
      await new Promise(r=>setTimeout(r,500));
    }
  }

  const st = history.stats;
  const catColors={"Cardiology":"#f87171","Neurology":"#a78bfa","Endocrinology":"#fbbf24","Pulmonology":"#38bdf8","General":"#4ade80"};

  return(
    <div style={{minHeight:"100vh",background:"#070d1a",padding:"28px 24px"}}>
      <div style={{maxWidth:1000,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:16}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,marginBottom:8,display:"block"}}>← Back</button>
            <h2 style={{color:"#f0f4f8",fontSize:26,fontWeight:300,margin:0,fontFamily:"serif",letterSpacing:-0.5}}>MedQA Evaluation Dashboard</h2>
            <div style={{color:"#334155",fontSize:11,fontFamily:"mono",marginTop:4,letterSpacing:1.5}}>PROJ-14 · MULTI-AGENT vs SINGLE-LLM BENCHMARK</div>
          </div>
          <button onClick={runAll} disabled={!!running} style={{background:running?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",borderRadius:10,padding:"10px 20px",color:running?"#64748b":"#fff",fontSize:13,fontWeight:700,cursor:running?"not-allowed":"pointer"}}>
            {running?`⏳ Running ${running}…`:"▶ Run All Questions"}
          </button>
        </div>

        {/* Stats cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          {[
            {label:"Questions Run",    val:st.total,               color:"#64748b",suffix:""},
            {label:"Single LLM Acc.",  val:st.single_accuracy,     color:"#38bdf8",suffix:"%"},
            {label:"Multi-Agent Acc.", val:st.multi_accuracy,      color:"#a78bfa",suffix:"%"},
            {label:"Improvement",      val:(st.improvement>=0?"+":"")+st.improvement, color:st.improvement>=0?"#4ade80":"#f87171",suffix:"%"},
          ].map(({label,val,color,suffix})=>(
            <div key={label} style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${color}25`,borderRadius:14,padding:"18px 20px"}}>
              <div style={{color:"#475569",fontSize:10,fontFamily:"mono",letterSpacing:1.5,marginBottom:8}}>{label.toUpperCase()}</div>
              <div style={{color,fontSize:28,fontWeight:700,fontFamily:"mono"}}>{val}{suffix}</div>
            </div>
          ))}
        </div>

        {/* Accuracy bar chart */}
        {st.total>0&&(
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"20px 24px",marginBottom:24}}>
            <div style={{color:"#334155",fontSize:10,fontFamily:"mono",letterSpacing:2,marginBottom:16}}>ACCURACY COMPARISON</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[{label:"Single LLM",color:"#38bdf8",val:st.single_accuracy},{label:"Multi-Agent",color:"#a78bfa",val:st.multi_accuracy}].map(({label,color,val})=>(
                <div key={label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{color:"#94a3b8",fontSize:12,fontFamily:"mono"}}>{label}</span>
                    <span style={{color,fontSize:12,fontFamily:"mono",fontWeight:700}}>{val}%</span>
                  </div>
                  <div style={{height:10,background:"rgba(255,255,255,0.05)",borderRadius:6,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${val}%`,background:`linear-gradient(90deg,${color}80,${color})`,borderRadius:6,transition:"width 1s ease"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:3,marginBottom:20,background:"rgba(255,255,255,0.02)",borderRadius:12,padding:4,width:"fit-content",border:"1px solid rgba(255,255,255,0.06)"}}>
          {[{id:"eval",label:"📝 Questions"},{id:"breakdown",label:"📊 Category Breakdown"},{id:"history",label:"📋 Run History"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"rgba(255,255,255,0.07)":"transparent",border:"none",borderRadius:9,padding:"8px 16px",color:tab===t.id?"#f0f4f8":"#64748b",fontSize:13,cursor:"pointer",fontFamily:"sans-serif"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Questions tab */}
        {tab==="eval"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {questions.map(q=>{
              const r=results[q.id];
              const isRunning=running===q.id;
              return(
                <div key={q.id} style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${selQ===q.id?"rgba(167,139,250,0.3)":"rgba(255,255,255,0.07)"}`,borderRadius:16,overflow:"hidden"}}>
                  <div onClick={()=>setSelQ(selQ===q.id?null:q.id)} style={{padding:"18px 22px",cursor:"pointer",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                        <span style={{background:`${catColors[q.category]||"#64748b"}20`,color:catColors[q.category]||"#64748b",border:`1px solid ${catColors[q.category]||"#64748b"}40`,borderRadius:20,padding:"2px 10px",fontSize:10,fontFamily:"mono"}}>{q.category}</span>
                        <span style={{color:"#334155",fontSize:10,fontFamily:"mono"}}>{q.id.toUpperCase()}</span>
                        {r&&<>
                          <span style={{background:r.single_correct?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",color:r.single_correct?"#4ade80":"#f87171",border:`1px solid ${r.single_correct?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}`,borderRadius:20,padding:"2px 10px",fontSize:10,fontFamily:"mono"}}>
                            Single: {r.single?.answer||"?"} {r.single_correct?"✓":"✗"}
                          </span>
                          <span style={{background:r.multi_correct?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",color:r.multi_correct?"#4ade80":"#f87171",border:`1px solid ${r.multi_correct?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}`,borderRadius:20,padding:"2px 10px",fontSize:10,fontFamily:"mono"}}>
                            Multi: {r.multi?.answer||"?"} {r.multi_correct?"✓":"✗"}
                          </span>
                        </>}
                      </div>
                      <div style={{color:"#e2e8f0",fontSize:13,lineHeight:1.6}}>{q.question}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",flexShrink:0}}>
                      <button onClick={e=>{e.stopPropagation();runQuestion(q.id);}} disabled={isRunning||!!running}
                        style={{background:isRunning?"rgba(255,255,255,0.04)":r?"rgba(167,139,250,0.12)":"linear-gradient(135deg,#a78bfa,#7c3aed)",border:r?`1px solid rgba(167,139,250,0.3)`:"none",borderRadius:9,padding:"7px 14px",color:isRunning?"#64748b":r?"#a78bfa":"#fff",fontSize:12,fontWeight:700,cursor:isRunning||running?"not-allowed":"pointer",whiteSpace:"nowrap"}}>
                        {isRunning?"⏳ Running…":r?"↻ Re-run":"▶ Run"}
                      </button>
                      <span style={{color:"#334155",fontSize:12}}>{selQ===q.id?"▲":"▼"}</span>
                    </div>
                  </div>

                  {selQ===q.id&&(
                    <div style={{padding:"0 22px 20px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                      {/* Options */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:16,marginBottom:r?20:0}}>
                        {Object.entries(q.options).map(([k,v])=>{
                          const isCorrect=k===q.correct;
                          const sPicked=r?.single?.answer===k;
                          const mPicked=r?.multi?.answer===k;
                          return(
                            <div key={k} style={{background:isCorrect?"rgba(74,222,128,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${isCorrect?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.06)"}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"flex-start",gap:8}}>
                              <span style={{fontFamily:"mono",fontSize:12,color:isCorrect?"#4ade80":"#475569",fontWeight:700,flexShrink:0}}>{k}.</span>
                              <span style={{color:isCorrect?"#e2e8f0":"#64748b",fontSize:12,flex:1}}>{v}</span>
                              <div style={{display:"flex",gap:4,flexShrink:0}}>
                                {sPicked&&<span style={{background:"rgba(56,189,248,0.15)",color:"#38bdf8",borderRadius:4,padding:"1px 5px",fontSize:9,fontFamily:"mono"}}>S</span>}
                                {mPicked&&<span style={{background:"rgba(167,139,250,0.15)",color:"#a78bfa",borderRadius:4,padding:"1px 5px",fontSize:9,fontFamily:"mono"}}>M</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {r&&(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                          {[{label:"🔵 Single LLM",color:"#38bdf8",data:r.single,correct:r.single_correct},
                            {label:"🟣 Multi-Agent",color:"#a78bfa",data:r.multi,correct:r.multi_correct}].map(({label,color,data,correct})=>(
                            <div key={label} style={{background:`${color}08`,border:`1px solid ${color}25`,borderRadius:12,padding:14}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                                <span style={{color,fontSize:11,fontFamily:"mono",fontWeight:700}}>{label}</span>
                                <span style={{color:correct?"#4ade80":"#f87171",fontSize:11,fontFamily:"mono"}}>{data?.answer} {correct?"✓ Correct":"✗ Wrong"}</span>
                              </div>
                              <div style={{color:"#64748b",fontSize:11,lineHeight:1.65,fontFamily:"mono"}}>{data?.reasoning?.slice(0,160)}{data?.reasoning?.length>160?"…":""}</div>
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
        )}

        {/* Category breakdown */}
        {tab==="breakdown"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
            {Object.entries(st.by_category||{}).map(([cat,data])=>{
              const sAcc=data.single>0?Math.round(data.single_c/data.single*100):null;
              const mAcc=data.multi>0?Math.round(data.multi_c/data.multi*100):null;
              const catColor=catColors[cat]||"#64748b";
              return(
                <div key={cat} style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${catColor}25`,borderRadius:16,padding:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:catColor}}/>
                    <span style={{color:catColor,fontSize:12,fontFamily:"mono",fontWeight:700}}>{cat.toUpperCase()}</span>
                    <span style={{color:"#334155",fontSize:10,fontFamily:"mono",marginLeft:"auto"}}>{data.single} runs</span>
                  </div>
                  {[{label:"Single LLM",color:"#38bdf8",acc:sAcc},{label:"Multi-Agent",color:"#a78bfa",acc:mAcc}].map(({label,color,acc})=>(
                    <div key={label} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{color:"#475569",fontSize:11,fontFamily:"mono"}}>{label}</span>
                        <span style={{color:acc===null?"#334155":acc>=70?"#4ade80":acc>=50?"#fbbf24":"#f87171",fontSize:11,fontFamily:"mono",fontWeight:700}}>{acc===null?"—":acc+"%"}</span>
                      </div>
                      {acc!==null&&<div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:4}}><div style={{height:"100%",width:`${acc}%`,background:color,borderRadius:4,opacity:0.7}}/></div>}
                    </div>
                  ))}
                </div>
              );
            })}
            {Object.keys(st.by_category||{}).length===0&&(
              <div style={{color:"#334155",textAlign:"center",padding:"60px",fontFamily:"mono",fontSize:12,gridColumn:"1/-1"}}>No data yet — run some questions first.</div>
            )}
          </div>
        )}

        {/* History tab */}
        {tab==="history"&&(
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:0}}>
              {["QUESTION","CATEGORY","CORRECT","SINGLE","MULTI"].map(h=>(
                <div key={h} style={{padding:"12px 16px",color:"#334155",fontSize:10,fontFamily:"mono",letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</div>
              ))}
              {(history.records||[]).map((r,i)=>{
                const q=questions.find(x=>x.id===r.question_id);
                return[
                  <div key={`q${i}`} style={{padding:"12px 16px",color:"#94a3b8",fontSize:12,borderBottom:"1px solid rgba(255,255,255,0.04)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q?.question?.slice(0,50)||r.question_id}…</div>,
                  <div key={`c${i}`} style={{padding:"12px 16px",color:catColors[r.category]||"#64748b",fontSize:11,fontFamily:"mono",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{r.category}</div>,
                  <div key={`a${i}`} style={{padding:"12px 16px",color:"#4ade80",fontSize:12,fontFamily:"mono",fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{r.correct_answer}</div>,
                  <div key={`s${i}`} style={{padding:"12px 16px",color:r.single_correct?"#4ade80":"#f87171",fontSize:12,fontFamily:"mono",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{r.single_answer} {r.single_correct?"✓":"✗"}</div>,
                  <div key={`m${i}`} style={{padding:"12px 16px",color:r.multi_correct?"#4ade80":"#f87171",fontSize:12,fontFamily:"mono",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>{r.multi_answer} {r.multi_correct?"✓":"✗"}</div>,
                ];
              })}
              {!history.records?.length&&(
                <div style={{gridColumn:"1/-1",padding:"60px",textAlign:"center",color:"#334155",fontFamily:"mono",fontSize:12}}>No evaluation runs yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PAGE 1: Input ─────────────────────────────────────────
function InputPage({onSubmit, onEval}){
  const [form,setForm]=useState({description:"",bodyPart:"General",duration:"1–3 days",severity:5,notes:""});
  const bodyParts=["General","Head / Face","Neck","Chest","Abdomen","Back","Arm / Shoulder","Leg / Hip","Skin","Multiple Areas"];
  const durations=["< 24 hours","1–3 days","4–7 days","1–2 weeks","2–4 weeks","> 1 month","Chronic (> 3 months)"];
  const valid=form.description.trim().length>15;

  return(
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 20%,#0d1f3c,#070d1a 60%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <div style={{textAlign:"center",marginBottom:44}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(34,211,238,0.07)",border:"1px solid rgba(34,211,238,0.18)",borderRadius:40,padding:"8px 22px",marginBottom:28}}>
          <span>⚕️</span><span style={{color:"#22d3ee",fontFamily:"mono",fontSize:12,letterSpacing:3}}>MEDICHAIN · AI DIAGNOSTIC SYSTEM</span>
        </div>
        <h1 style={{fontSize:"clamp(34px,5vw,54px)",fontWeight:300,color:"#f0f4f8",margin:"0 0 14px",letterSpacing:-1.5,lineHeight:1.1,fontFamily:"serif"}}>
          Describe Your<br/>
          <span style={{background:"linear-gradient(90deg,#22d3ee,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontStyle:"italic"}}>Symptoms</span>
        </h1>
        <p style={{color:"#64748b",fontSize:15,margin:0}}>Our AI medical team of 3 specialized agents will collaboratively analyze your case</p>
      </div>

      <div style={{width:"100%",maxWidth:620,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:24,padding:"36px 40px",boxShadow:"0 32px 80px rgba(0,0,0,0.5)"}}>
        <div style={{marginBottom:26}}>
          <label style={{display:"block",color:"#64748b",fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>Primary Complaint *</label>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe your symptoms in detail…" rows={4}
            style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${valid?"rgba(34,211,238,0.35)":"rgba(255,255,255,0.09)"}`,borderRadius:12,padding:"14px 16px",color:"#f0f4f8",fontSize:14,lineHeight:1.6,fontFamily:"sans-serif",resize:"vertical",outline:"none"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:26}}>
          {[{label:"Body Area",key:"bodyPart",opts:bodyParts},{label:"Duration",key:"duration",opts:durations}].map(({label,key,opts})=>(
            <div key={key}>
              <label style={{display:"block",color:"#64748b",fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>{label}</label>
              <select value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                style={{width:"100%",boxSizing:"border-box",background:"#0d1829",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"11px 14px",color:"#f0f4f8",fontSize:14,fontFamily:"sans-serif",outline:"none",cursor:"pointer"}}>
                {opts.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{marginBottom:26}}>
          <label style={{display:"flex",justifyContent:"space-between",color:"#64748b",fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:12,textTransform:"uppercase"}}>
            <span>Severity</span><span style={{color:sevColor(form.severity)}}>{sevLabel(form.severity)} — {form.severity}/10</span>
          </label>
          <input type="range" min={1} max={10} value={form.severity} onChange={e=>setForm({...form,severity:Number(e.target.value)})} style={{width:"100%",accentColor:sevColor(form.severity),cursor:"pointer"}}/>
        </div>
        <div style={{marginBottom:28}}>
          <label style={{display:"block",color:"#64748b",fontSize:11,fontFamily:"mono",letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>Medical History (Optional)</label>
          <input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Allergies, medications, conditions…"
            style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"11px 14px",color:"#f0f4f8",fontSize:14,fontFamily:"sans-serif",outline:"none"}}/>
        </div>
        <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.18)",borderRadius:10,padding:"12px 16px",display:"flex",gap:10,marginBottom:22}}>
          <span>⚠️</span>
          <p style={{color:"#92400e",fontSize:12,margin:0,lineHeight:1.65}}><strong style={{color:"#fbbf24"}}>Educational Use Only.</strong> Not medical advice. Consult a qualified healthcare professional.</p>
        </div>
        <button onClick={()=>valid&&onSubmit(form)} disabled={!valid}
          style={{width:"100%",padding:"15px",background:valid?"linear-gradient(135deg,#22d3ee,#0ea5e9)":"rgba(255,255,255,0.05)",border:"none",borderRadius:12,color:valid?"#070d1a":"#475569",fontSize:15,fontWeight:700,cursor:valid?"pointer":"not-allowed",marginBottom:10}}>
          Begin AI Consultation →
        </button>
        <button onClick={onEval}
          style={{width:"100%",padding:"11px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:12,color:"#a78bfa",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          📊 MedQA Evaluation Dashboard
        </button>
      </div>
    </div>
  );
}

// ── PAGE 2: Chat ──────────────────────────────────────────
function ChatPage({symptoms,onComplete,onBack}){
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
    try{
      const d=await api.start(symptoms);
      setSessionId(d.session_id);
      setMsgs([{role:"ai",agent:"interviewer",text:d.reply,time:new Date()}]);
      addLog("interviewer","Session initialized. Beginning SOCRATES-based assessment.");
    }catch(e){addLog("interviewer",`⚠️ Backend error: ${e.message}. Check uvicorn on port 8000.`);}
    setLoading(false);
  }

  async function send(){
    if(!input.trim()||loading||phase!=="interviewing"||!sessionId) return;
    const txt=input.trim(); setInput("");
    setMsgs(p=>[...p,{role:"user",text:txt,time:new Date()}]);
    setLoading(true);
    try{
      const d=await api.chat({session_id:sessionId,user_message:txt});
      setMsgs(p=>[...p,{role:"ai",agent:"interviewer",text:d.reply,time:new Date()}]);
      addLog("interviewer",`Response recorded. ${d.trigger_diagnose?"Triggering diagnosis pipeline.":"Continuing history-taking."}`);
      if(d.trigger_diagnose){
        setPhase("analyzing");
        addLog("diagnostician","📥 Querying ChromaDB PubMed database…");
        await new Promise(r=>setTimeout(r,600));
        const dd=await api.diagnose({session_id:sessionId});
        addLog("diagnostician",dd.diagnosis,new Date());
        if(dd.refs?.length>0) addLog("diagnostician",`📚 RAG: ${dd.refs.length} articles\n`+dd.refs.map((r,i)=>`[${i+1}] ${r.title} (${r.year}) ${r.score}`).join("\n"),new Date());
        addLog("critic","📥 Receiving proposal for review…");
        await new Promise(r=>setTimeout(r,400));
        addLog("critic",dd.review,new Date());
        setPhase("done");
        setTimeout(()=>onComplete({symptoms,date:new Date(),sessionId,transcript:msgs.concat([{role:"user",text:txt}]),diagnosis:dd.diagnosis,review:dd.review,refs:dd.refs||[]}),1500);
      }
    }catch(e){addLog("interviewer",`⚠️ ${e.message}`);}
    setLoading(false);
  }

  return(
    <div style={{height:"100vh",background:"#070d1a",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:18}}>←</button>
          <span style={{color:"#22d3ee",fontFamily:"mono",fontSize:13}}>⚕️ MediChain</span>
          {sessionId&&<span style={{color:"#1e293b",fontSize:10,fontFamily:"mono"}}>{sessionId.slice(0,8)}…</span>}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <StatusPill phase={phase}/>
          <button onClick={()=>setShowPanel(v=>!v)} style={{background:showPanel?"rgba(167,139,250,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${showPanel?"rgba(167,139,250,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"6px 14px",color:showPanel?"#a78bfa":"#64748b",fontSize:12,cursor:"pointer",fontFamily:"mono"}}>
            {showPanel?"Hide":"Show"} Agent Panel
          </button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:showPanel?"0 0 54%":"1",display:"flex",flexDirection:"column",borderRight:showPanel?"1px solid rgba(255,255,255,0.06)":"none"}}>
          <div style={{padding:"14px 24px 0",flexShrink:0}}><div style={{color:"#334155",fontFamily:"mono",fontSize:10,letterSpacing:2,marginBottom:12}}>PATIENT CONSULTATION</div></div>
          <div style={{flex:1,overflowY:"auto",padding:"8px 24px 16px"}}>
            <div style={{background:"rgba(34,211,238,0.05)",border:"1px solid rgba(34,211,238,0.12)",borderRadius:14,padding:"14px 18px",marginBottom:20}}>
              <div style={{color:"#22d3ee",fontSize:10,fontFamily:"mono",letterSpacing:2,marginBottom:8}}>ACTIVE CASE</div>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.65}}><span style={{color:"#e2e8f0"}}>{symptoms.description}</span><span style={{color:"#475569",marginLeft:6}}>· {symptoms.bodyPart} · {symptoms.duration} · {symptoms.severity}/10</span></div>
            </div>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:10,marginBottom:14,alignItems:"flex-end"}}>
                {m.role!=="user"&&<div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:AGENTS.interviewer.bg,border:`1px solid ${AGENTS.interviewer.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🩺</div>}
                <div style={{maxWidth:"78%"}}>
                  {m.role!=="user"&&<div style={{color:AGENTS.interviewer.color,fontSize:10,fontFamily:"mono",marginBottom:5}}>INTERVIEWER AGENT</div>}
                  <div style={{background:m.role==="user"?"linear-gradient(135deg,#0ea5e9,#22d3ee)":"rgba(255,255,255,0.05)",border:m.role==="user"?"none":"1px solid rgba(255,255,255,0.07)",borderRadius:m.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px",padding:"11px 15px",color:m.role==="user"?"#070d1a":"#cbd5e1",fontSize:14,lineHeight:1.65}}>{m.text}</div>
                  <div style={{color:"#1e293b",fontSize:10,marginTop:3,textAlign:m.role==="user"?"right":"left",fontFamily:"mono"}}>{fmtTime(m.time)}</div>
                </div>
              </div>
            ))}
            {loading&&phase==="interviewing"&&<div style={{display:"flex",gap:10,alignItems:"flex-end"}}><div style={{width:34,height:34,borderRadius:"50%",background:AGENTS.interviewer.bg,border:`1px solid ${AGENTS.interviewer.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🩺</div><div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"4px 18px 18px 18px",padding:"10px 15px"}}><Dots color={AGENTS.interviewer.color}/></div></div>}
            {phase==="analyzing"&&<div style={{textAlign:"center",padding:"28px 20px",background:"rgba(167,139,250,0.05)",border:"1px solid rgba(167,139,250,0.12)",borderRadius:16,marginTop:12}}><div style={{fontSize:30,marginBottom:10}}>🔬</div><div style={{color:"#a78bfa",fontFamily:"mono",fontSize:13}}>AI Medical Team Analyzing…</div></div>}
            {phase==="done"&&<div style={{textAlign:"center",padding:"28px 20px",background:"rgba(74,222,128,0.05)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:16,marginTop:12}}><div style={{fontSize:30,marginBottom:10}}>✅</div><div style={{color:"#4ade80",fontFamily:"mono",fontSize:13}}>Complete — Loading Results…</div></div>}
            <div ref={msgEnd}/>
          </div>
          {phase==="interviewing"&&(
            <div style={{padding:"14px 20px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:10,background:"rgba(0,0,0,0.2)",flexShrink:0}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Type your response…" disabled={loading}
                style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:11,padding:"11px 15px",color:"#f0f4f8",fontSize:14,fontFamily:"sans-serif",outline:"none"}}/>
              <button onClick={send} disabled={!input.trim()||loading}
                style={{background:input.trim()&&!loading?"linear-gradient(135deg,#22d3ee,#0ea5e9)":"rgba(255,255,255,0.05)",border:"none",borderRadius:11,padding:"11px 20px",color:input.trim()&&!loading?"#070d1a":"#475569",fontSize:14,fontWeight:700,cursor:input.trim()&&!loading?"pointer":"not-allowed",whiteSpace:"nowrap"}}>Send →</button>
            </div>
          )}
        </div>
        {showPanel&&(
          <div style={{flex:"0 0 46%",display:"flex",flexDirection:"column",background:"rgba(0,0,0,0.25)"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}><div style={{color:"#334155",fontFamily:"mono",fontSize:10,letterSpacing:2}}>INTERNAL AGENT REASONING + RAG</div></div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
              {logs.length===0&&<div style={{color:"#1e293b",textAlign:"center",paddingTop:48,fontFamily:"mono",fontSize:12}}>Awaiting agent activity…</div>}
              {logs.map(log=>(
                <div key={log.id} style={{marginBottom:18,borderLeft:`2px solid ${AGENTS[log.agent].color}`,paddingLeft:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}><Badge k={log.agent}/><span style={{color:"#1e293b",fontSize:10,fontFamily:"mono"}}>{fmtTime(log.time)}</span></div>
                  <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.75,fontFamily:"mono",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{log.text}</div>
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

// ── PAGE 3: Results ───────────────────────────────────────
function ResultsPage({result,onNew,onHistory,onFlow}){
  const [tab,setTab]=useState("diagnosis");
  const tabs=[{id:"diagnosis",label:"🔬 Diagnosis"},{id:"review",label:"⚖️ Critic Review"},{id:"refs",label:`📚 RAG Refs (${result.refs.length})`},{id:"transcript",label:"💬 Transcript"}];
  return(
    <div style={{minHeight:"100vh",background:"#070d1a",padding:"32px 24px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:30,flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{color:"#334155",fontFamily:"mono",fontSize:10,letterSpacing:2,marginBottom:8}}>DIAGNOSTIC REPORT · {result.date.toLocaleDateString("en-AU")}</div>
            <h2 style={{color:"#f0f4f8",fontSize:28,fontWeight:300,margin:0,fontFamily:"serif",letterSpacing:-0.5}}>Diagnostic Result Dashboard</h2>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {result.sessionId&&<ExportBtns sessionId={result.sessionId}/>}
            <button onClick={onFlow} style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10,padding:"9px 16px",color:"#38bdf8",fontSize:13,cursor:"pointer",fontWeight:600}}>🔀 Flow View</button>
            <button onClick={onHistory} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"9px 16px",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>📋 History</button>
            <button onClick={onNew} style={{background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:10,padding:"9px 18px",color:"#070d1a",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ New</button>
          </div>
        </div>
        <div style={{background:"rgba(34,211,238,0.05)",border:"1px solid rgba(34,211,238,0.1)",borderRadius:14,padding:"16px 22px",marginBottom:22,display:"flex",gap:32,flexWrap:"wrap"}}>
          {[{l:"CHIEF COMPLAINT",v:result.symptoms.description.slice(0,70)+(result.symptoms.description.length>70?"…":"")},{l:"BODY AREA",v:result.symptoms.bodyPart},{l:"DURATION",v:result.symptoms.duration},{l:"SEVERITY",v:`${result.symptoms.severity}/10 — ${sevLabel(result.symptoms.severity)}`}].map(({l,v})=>(
            <div key={l}><div style={{color:"#334155",fontSize:10,fontFamily:"mono",letterSpacing:1.5}}>{l}</div><div style={{color:"#e2e8f0",fontSize:13,marginTop:3}}>{v}</div></div>
          ))}
        </div>
        <div style={{display:"flex",gap:3,marginBottom:20,background:"rgba(255,255,255,0.02)",borderRadius:12,padding:4,width:"fit-content",border:"1px solid rgba(255,255,255,0.06)"}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"rgba(255,255,255,0.07)":"transparent",border:"none",borderRadius:9,padding:"8px 16px",color:tab===t.id?"#f0f4f8":"#64748b",fontSize:13,cursor:"pointer"}}>{t.label}</button>)}
        </div>
        <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"28px 32px"}}>
          {(tab==="diagnosis"||tab==="review")&&(
            <><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}><Badge k={tab==="diagnosis"?"diagnostician":"critic"} size="md"/><span style={{color:"#475569",fontSize:13}}>{tab==="diagnosis"?"RAG-grounded differential diagnosis":"Senior consultant review & safety check"}</span></div>
            <div style={{color:"#cbd5e1",fontSize:13.5,lineHeight:1.85,fontFamily:"mono",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{tab==="diagnosis"?result.diagnosis:result.review}</div></>
          )}
          {tab==="refs"&&(
            <>{result.refs.map((r,i)=>(
              <div key={i} style={{marginBottom:20,paddingBottom:20,borderBottom:i<result.refs.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:6}}>
                  <div style={{color:"#e2e8f0",fontSize:13,fontWeight:500}}>[{i+1}] {r.title}</div>
                  <span style={{background:"rgba(167,139,250,0.1)",color:"#a78bfa",border:"1px solid rgba(167,139,250,0.2)",borderRadius:8,padding:"2px 8px",fontSize:11,fontFamily:"mono",whiteSpace:"nowrap"}}>Score: {r.score}</span>
                </div>
                <div style={{color:"#64748b",fontSize:12,marginBottom:6}}>{r.authors} · {r.year}</div>
                <div style={{color:"#475569",fontSize:12,lineHeight:1.65,marginBottom:8}}>{r.excerpt}</div>
                <a href={r.url} target="_blank" rel="noreferrer" style={{color:"#22d3ee",fontSize:12,textDecoration:"none"}}>→ View on PubMed ↗</a>
              </div>
            ))}</>
          )}
          {tab==="transcript"&&result.transcript.map((m,i)=>(
            <div key={i} style={{marginBottom:18}}>
              <div style={{color:m.role==="user"?"#22d3ee":"#64748b",fontSize:10,fontFamily:"mono",letterSpacing:1.5,marginBottom:5}}>{m.role==="user"?"PATIENT":"INTERVIEWER"}</div>
              <div style={{color:"#94a3b8",fontSize:14,lineHeight:1.65}}>{m.text}</div>
              {i<result.transcript.length-1&&<div style={{borderTop:"1px solid rgba(255,255,255,0.04)",marginTop:16}}/>}
            </div>
          ))}
        </div>
        <div style={{marginTop:20,padding:"13px 18px",background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:11}}>
          <p style={{color:"#92400e",fontSize:12,margin:0}}>⚠️ <strong style={{color:"#fbbf24"}}>Disclaimer:</strong> <span style={{color:"#a16207"}}>Educational and research purposes only. Not medical advice.</span></p>
        </div>
      </div>
    </div>
  );
}

// ── PAGE 5: History ───────────────────────────────────────
function HistoryPage({onBack,onNew}){
  const [sessions,setSessions]=useState([]); const [loading,setLoading]=useState(true); const [sel,setSel]=useState(null); const [detail,setDetail]=useState(null);
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);try{setSessions(await api.sessions());}catch(e){}setLoading(false);}
  async function loadDetail(id){if(sel===id){setSel(null);setDetail(null);return;}setSel(id);try{setDetail(await api.session(id));}catch(e){}}
  return(
    <div style={{minHeight:"100vh",background:"#070d1a",padding:"32px 24px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32,flexWrap:"wrap",gap:12}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,marginBottom:10,display:"block"}}>← Back</button>
            <h2 style={{color:"#f0f4f8",fontSize:28,fontWeight:300,margin:0,fontFamily:"serif"}}>Session History</h2>
            <div style={{color:"#334155",fontSize:12,fontFamily:"mono",marginTop:4}}>{loading?"Loading…":`${sessions.length} sessions · SQLite`}</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={load} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:"9px 16px",color:"#94a3b8",fontSize:13,cursor:"pointer"}}>↻ Refresh</button>
            <button onClick={onNew} style={{background:"linear-gradient(135deg,#22d3ee,#0ea5e9)",border:"none",borderRadius:10,padding:"10px 18px",color:"#070d1a",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ New</button>
          </div>
        </div>
        {loading?<div style={{textAlign:"center",padding:"60px",color:"#334155",fontFamily:"mono"}}>Loading…</div>
        :sessions.length===0?<div style={{textAlign:"center",padding:"80px",color:"#334155",fontFamily:"mono"}}><div style={{fontSize:44,marginBottom:16}}>📋</div>No sessions yet</div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {sessions.map(s=>(
            <div key={s.id}>
              <div onClick={()=>loadDetail(s.id)} style={{background:sel===s.id?"rgba(34,211,238,0.04)":"rgba(255,255,255,0.025)",border:`1px solid ${sel===s.id?"rgba(34,211,238,0.18)":"rgba(255,255,255,0.06)"}`,borderRadius:sel===s.id?"14px 14px 0 0":14,padding:"18px 22px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{color:"#e2e8f0",fontSize:14,marginBottom:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:500}}>{s.description}</div>
                  <div style={{display:"flex",gap:12}}><span style={{color:"#475569",fontSize:12,fontFamily:"mono"}}>{fmtDate(s.created_at)}</span><span style={{color:s.status==="done"?"#4ade80":"#fbbf24",fontSize:12,fontFamily:"mono"}}>● {s.status}</span></div></div>
                  <span style={{color:"#334155"}}>{sel===s.id?"▲":"▼"}</span>
                </div>
              </div>
              {sel===s.id&&detail&&(
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(34,211,238,0.1)",borderTop:"none",borderRadius:"0 0 14px 14px",padding:"20px 22px"}}>
                  {detail.status==="done"&&<div style={{marginBottom:16}}><ExportBtns sessionId={s.id} small/></div>}
                  <div style={{color:"#64748b",fontSize:12,lineHeight:1.7,fontFamily:"mono",whiteSpace:"pre-wrap"}}>{detail.diagnosis?.slice(0,500)}{detail.diagnosis?.length>500?"\n…":""}</div>
                </div>
              )}
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────
export default function MediChainApp(){
  const [page,setPage]       = useState("input");
  const [symptoms,setSymptoms] = useState(null);
  const [result,setResult]   = useState(null);

  useEffect(()=>{
    const link=document.createElement("link"); link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,300;1,300&display=swap";
    document.head.appendChild(link);
    const st=document.createElement("style");
    st.textContent=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{background:#070d1a;font-family:'DM Sans',sans-serif}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}@keyframes mcdot{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-5px);opacity:1}}select{appearance:none}input[type=range]{-webkit-appearance:none;width:100%;height:5px;border-radius:5px;background:rgba(255,255,255,0.1);outline:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid #070d1a;background:currentColor}@keyframes dash{to{stroke-dashoffset:-24}}`;
    document.head.appendChild(st);
    return()=>{try{document.head.removeChild(link);document.head.removeChild(st);}catch(_){}};
  },[]);

  function goNew(){setSymptoms(null);setResult(null);setPage("input");}

  return(
    <>
      {page==="input"&&<InputPage onSubmit={f=>{setSymptoms(f);setPage("chat");}} onEval={()=>setPage("eval")}/>}
      {page==="chat"&&symptoms&&<ChatPage symptoms={symptoms} onBack={()=>setPage("input")} onComplete={r=>{setResult(r);setPage("result");}}/>}
      {page==="result"&&result&&<ResultsPage result={result} onNew={goNew} onHistory={()=>setPage("history")} onFlow={()=>setPage("flow")}/>}
      {page==="flow"&&result&&<ReasoningFlowPage result={result} onBack={()=>setPage("result")}/>}
      {page==="history"&&<HistoryPage onBack={()=>result?setPage("result"):setPage("input")} onNew={goNew}/>}
      {page==="eval"&&<EvalDashboard onBack={()=>setPage("input")}/>}
    </>
  );
}
