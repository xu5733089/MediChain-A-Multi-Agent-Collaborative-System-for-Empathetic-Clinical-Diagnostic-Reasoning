"""
main.py — MediChain FastAPI 后端 (Sprint 3 + PROJ-13/14)
启动：uvicorn main:app --reload --port 8000
"""
import os, json, sqlite3, uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

load_dotenv()

from agents import call_interviewer, call_diagnostician, call_critic
from rag    import get_collection_size, search
from export import generate_pdf
from eval   import run_single_llm, run_multi_agent, SAMPLE_QUESTIONS

app = FastAPI(title="MediChain API", version="3.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:3000"],
    allow_methods=["*"], allow_headers=["*"])

# ── SQLite ────────────────────────────────────────────────
DB_FILE = Path(__file__).parent / "medichain.db"

def get_db():
    c = sqlite3.connect(str(DB_FILE)); c.row_factory = sqlite3.Row; return c

def init_db():
    with get_db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY, symptoms TEXT NOT NULL,
            messages TEXT NOT NULL DEFAULT '[]', history TEXT NOT NULL DEFAULT '[]',
            turns INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'interviewing',
            diagnosis TEXT, review TEXT, refs TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""")
        c.execute("""CREATE TABLE IF NOT EXISTS eval_runs (
            id TEXT PRIMARY KEY, question_id TEXT NOT NULL,
            single_answer TEXT, single_reasoning TEXT,
            multi_answer TEXT, multi_reasoning TEXT, multi_pipeline TEXT,
            correct_answer TEXT, category TEXT,
            single_correct INTEGER, multi_correct INTEGER,
            created_at TEXT NOT NULL)""")
        c.commit()

init_db()

def _now(): return datetime.utcnow().isoformat()

def session_get(sid):
    with get_db() as c:
        row = c.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone()
    if not row: return None
    d = dict(row)
    for k in ("symptoms","messages","history","refs"):
        d[k] = json.loads(d[k])
    return d

def session_update(sid, **kwargs):
    sets, vals = [], []
    for k, v in kwargs.items():
        sets.append(f"{k}=?")
        vals.append(json.dumps(v) if isinstance(v,(list,dict)) else v)
    vals += [_now(), sid]
    with get_db() as c:
        c.execute(f"UPDATE sessions SET {', '.join(sets)}, updated_at=? WHERE id=?", vals)
        c.commit()

def sessions_list():
    with get_db() as c:
        rows = c.execute("SELECT id,status,created_at,symptoms FROM sessions ORDER BY created_at DESC").fetchall()
    return [{"id":d["id"],"status":d["status"],"created_at":d["created_at"],
             "description":json.loads(d["symptoms"]).get("description","")[:60]} for d in map(dict,rows)]

# ── Models ────────────────────────────────────────────────
class SymptomInput(BaseModel):
    description:str; bodyPart:str="General"; duration:str="1-3 days"; severity:int=5; notes:str=""

class ChatMessage(BaseModel):
    session_id:str; user_message:str

class DiagnoseRequest(BaseModel):
    session_id:str

class EvalRequest(BaseModel):
    question_id: str
    mode: str = "both"  # "single" | "multi" | "both"

# ── Core Routes ───────────────────────────────────────────
@app.get("/")
def root():
    return {"service":"MediChain API","version":"3.0.0","rag_db_size":get_collection_size(),"status":"ok"}

@app.get("/api/rag/status")
def rag_status():
    size = get_collection_size()
    return {"document_count":size,"status":"ready" if size>0 else "empty"}

@app.get("/api/rag/search")
def rag_search(q:str, n:int=5):
    return {"query":q,"results":search(q,n_results=n)}

@app.post("/api/session/start")
def start_session(symptoms:SymptomInput):
    sid = str(uuid.uuid4())
    case = (f"Patient presents with:\n- Chief complaint: {symptoms.description}\n"
            f"- Body area: {symptoms.bodyPart}\n- Duration: {symptoms.duration}\n"
            f"- Severity: {symptoms.severity}/10\n- History: {symptoms.notes or 'None'}\n\nBegin empathetic interview.")
    history = [{"role":"user","content":case}]
    reply = call_interviewer(history)
    history.append({"role":"assistant","content":reply})
    messages = [{"role":"ai","agent":"interviewer","text":reply}]
    now = _now()
    with get_db() as c:
        c.execute("INSERT INTO sessions(id,symptoms,messages,history,turns,status,created_at,updated_at) VALUES(?,?,?,?,0,'interviewing',?,?)",
            (sid,json.dumps(symptoms.model_dump()),json.dumps(messages),json.dumps(history),now,now))
        c.commit()
    return {"session_id":sid,"reply":reply,"status":"interviewing"}

@app.post("/api/session/chat")
def chat(body:ChatMessage):
    sess = session_get(body.session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess["status"]!="interviewing": raise HTTPException(400,f"Status: {sess['status']}")
    history=sess["history"]; messages=sess["messages"]; turns=sess["turns"]+1
    history.append({"role":"user","content":body.user_message})
    messages.append({"role":"user","text":body.user_message})
    reply = call_interviewer(history)
    ready = "[READY_FOR_DIAGNOSIS]" in reply
    clean = reply.replace("[READY_FOR_DIAGNOSIS]","").strip()
    history.append({"role":"assistant","content":clean})
    messages.append({"role":"ai","agent":"interviewer","text":clean})
    trigger = turns>=2 or ready
    session_update(body.session_id,history=history,messages=messages,
        turns=turns,status="analyzing" if trigger else "interviewing")
    return {"reply":clean,"status":"analyzing" if trigger else "interviewing","trigger_diagnose":trigger}

@app.post("/api/session/diagnose")
def diagnose(body:DiagnoseRequest):
    sess = session_get(body.session_id)
    if not sess: raise HTTPException(404,"Session not found")
    s = sess["symptoms"]
    lines = [f"{'PATIENT' if m['role']=='user' else 'INTERVIEWER'}: {m['text']}" for m in sess["messages"]]
    case_text = (f"PATIENT CASE\n{'='*40}\nChief complaint: {s['description']}\n"
                 f"Body area: {s['bodyPart']}\nDuration: {s['duration']}\n"
                 f"Severity: {s['severity']}/10\nHistory: {s['notes'] or 'None'}\n\n"
                 f"TRANSCRIPT\n{'='*40}\n"+"\n\n".join(lines))
    rag_query = f"{s['description']} {s['bodyPart']} {s['duration']}"
    diagnosis, refs = call_diagnostician(case_text, rag_query)
    review = call_critic(case_text, diagnosis)
    session_update(body.session_id,diagnosis=diagnosis,review=review,refs=refs,status="done")
    return {"status":"done","diagnosis":diagnosis,"review":review,"refs":refs}

@app.get("/api/session/{session_id}")
def get_session(session_id:str):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    return sess

@app.get("/api/sessions")
def list_sessions(): return sessions_list()

# ── Export ────────────────────────────────────────────────
@app.get("/api/session/{session_id}/export/pdf")
def export_pdf(session_id:str):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess["status"]!="done": raise HTTPException(400,"Not complete")
    pdf_bytes = generate_pdf(sess)
    fname = f"MediChain_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=pdf_bytes,media_type="application/pdf",
        headers={"Content-Disposition":f'attachment; filename="{fname}"'})

@app.get("/api/session/{session_id}/export/json")
def export_json(session_id:str):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    data = {k:v for k,v in sess.items() if k!="history"}
    data["exported_at"] = _now()
    fname = f"MediChain_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.json"
    return Response(content=json.dumps(data,indent=2,ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition":f'attachment; filename="{fname}"'})

# ── PROJ-14: MedQA Evaluation ─────────────────────────────
@app.get("/api/eval/questions")
def get_questions():
    """返回题库"""
    return {"questions":[
        {"id":q["id"],"question":q["question"],"options":q["options"],"category":q["category"]}
        for q in SAMPLE_QUESTIONS
    ]}

@app.post("/api/eval/run")
def run_eval(body:EvalRequest):
    """运行单题评估"""
    q = next((x for x in SAMPLE_QUESTIONS if x["id"]==body.question_id), None)
    if not q: raise HTTPException(404,"Question not found")

    result = {"question_id":body.question_id,"correct":q["correct"],"category":q["category"]}

    if body.mode in ("single","both"):
        s = run_single_llm(q["question"], q["options"])
        result["single"] = s
        result["single_correct"] = s["answer"]==q["correct"]

    if body.mode in ("multi","both"):
        m = run_multi_agent(q["question"], q["options"])
        result["multi"] = m
        result["multi_correct"] = m["answer"]==q["correct"]

    # 持久化
    eid = str(uuid.uuid4())
    with get_db() as c:
        c.execute("""INSERT INTO eval_runs(id,question_id,single_answer,single_reasoning,
            multi_answer,multi_reasoning,multi_pipeline,correct_answer,category,
            single_correct,multi_correct,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            (eid, body.question_id,
             result.get("single",{}).get("answer",""),
             result.get("single",{}).get("reasoning",""),
             result.get("multi",{}).get("answer",""),
             result.get("multi",{}).get("reasoning",""),
             json.dumps(result.get("multi",{}).get("pipeline",{})),
             q["correct"], q["category"],
             1 if result.get("single_correct") else 0,
             1 if result.get("multi_correct") else 0,
             _now()))
        c.commit()

    return result

@app.get("/api/eval/history")
def eval_history():
    """返回历史评估记录和统计"""
    with get_db() as c:
        rows = c.execute("""SELECT question_id,single_answer,multi_answer,correct_answer,
            category,single_correct,multi_correct,created_at FROM eval_runs
            ORDER BY created_at DESC LIMIT 50""").fetchall()
    records = [dict(r) for r in rows]

    # 统计
    if records:
        total    = len(records)
        s_total  = sum(1 for r in records if r["single_answer"])
        m_total  = sum(1 for r in records if r["multi_answer"])
        s_correct = sum(r["single_correct"] or 0 for r in records)
        m_correct = sum(r["multi_correct"] or 0 for r in records)

        # 按类别
        cats = {}
        for r in records:
            cat = r["category"]
            if cat not in cats:
                cats[cat] = {"single":0,"single_c":0,"multi":0,"multi_c":0}
            if r["single_answer"]:
                cats[cat]["single"]+=1; cats[cat]["single_c"]+=r["single_correct"] or 0
            if r["multi_answer"]:
                cats[cat]["multi"]+=1;  cats[cat]["multi_c"]+=r["multi_correct"] or 0

        stats = {
            "total": total,
            "single_accuracy": round(s_correct/s_total*100,1) if s_total else 0,
            "multi_accuracy":  round(m_correct/m_total*100,1) if m_total else 0,
            "improvement":     round((m_correct-s_correct)/s_total*100,1) if s_total else 0,
            "by_category":     cats,
        }
    else:
        stats = {"total":0,"single_accuracy":0,"multi_accuracy":0,"improvement":0,"by_category":{}}

    return {"records":records,"stats":stats}
