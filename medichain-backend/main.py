"""
main.py — MediChain FastAPI 后端 v4.0
新增：用户认证 (JWT) + 患者档案管理
启动：uvicorn main:app --reload --port 8000
"""
import os, json, uuid
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

load_dotenv()

from agents import call_interviewer, call_diagnostician, call_critic
from safety import classify_safety
from rag    import get_collection_size, search
from export import generate_pdf
from eval   import run_single_llm, run_multi_agent, SAMPLE_QUESTIONS
from db import get_db, init_db, now_iso, severity_to_level, severity_to_score, VALID_AGENT_TYPES
from auth   import (
    user_create, user_get_by_username, verify_password,
    create_token, get_current_user, require_user,
    patient_create, patient_get, patient_update, patient_delete, patients_list
)

app = FastAPI(title="MediChain API", version="4.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174","http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

init_db()
UPLOAD_ROOT = Path(__file__).parent / "uploads"
ALLOWED_UPLOAD_TYPES = {
    # Documents
    ".pdf": "pdf",
    ".txt": "txt",
    # Images
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".bmp": "image",
    ".webp": "image",
    # Audio
    ".mp3": "audio",
    ".wav": "audio",
    ".m4a": "audio",
    ".ogg": "audio",
    ".flac": "audio",
    # Video
    ".mp4": "video",
    ".mov": "video",
    ".avi": "video",
    ".mkv": "video",
    ".webm": "video",
}
IMAGE_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
}
MAX_UPLOAD_CONTEXT_CHARS = 6000

def _now():
    return now_iso()

# ── Session DB helpers ────────────────────────────────────
def session_get(sid):
    with get_db() as c:
        row = c.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone()
    if not row: return None
    d = dict(row)
    for k in ("symptoms","history","refs"):
        d[k] = json.loads(d[k])
    d["messages"] = session_messages_legacy(sid)
    return d


def session_message_create(session_id, role, content, agent_type=None, user_id=None):
    if role not in ("user", "agent", "system"):
        raise HTTPException(400, "role must be one of: user, agent, system")

    if role == "agent":
        if not agent_type or agent_type not in VALID_AGENT_TYPES:
            raise HTTPException(400, "agent_type must be interviewer/diagnostician/critic/safety")
    else:
        agent_type = None

    mid = str(uuid.uuid4())
    with get_db() as c:
        c.execute(
            """INSERT INTO messages(id,session_id,user_id,role,agent_type,content,created_at)
               VALUES(?,?,?,?,?,?,?)""",
            (mid, session_id, user_id, role, agent_type, content, _now())
        )
        c.commit()
    return mid


def session_messages_raw(session_id):
    with get_db() as c:
        rows = c.execute(
            """SELECT id,session_id,user_id,role,agent_type,content,created_at
               FROM messages WHERE session_id=? ORDER BY created_at ASC""",
            (session_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def session_messages_legacy(session_id):
    raw = session_messages_raw(session_id)
    out = []
    for m in raw:
        if m["role"] == "user":
            out.append({"role": "user", "text": m["content"]})
        elif m["role"] == "agent":
            out.append({"role": "ai", "agent": m.get("agent_type"), "text": m["content"]})
        else:
            out.append({"role": "system", "text": m["content"]})
    return out


def normalize_history_for_interviewer(history):
    normalized = []
    for item in history:
        role = item.get("role")
        content = item.get("content", "")
        if role in ("user", "assistant"):
            normalized.append({"role": role, "content": content})
            continue
        # Anthropic messages only supports user/assistant roles.
        normalized.append({"role": "user", "content": f"[ADDITIONAL CONTEXT]\n{content}"})
    return normalized


def session_uploads_list(session_id):
    with get_db() as c:
        rows = c.execute(
            """SELECT id, session_id, file_name, file_type, file_path, uploaded_at,
                      LENGTH(extracted_text) AS extracted_text_length
               FROM uploads
               WHERE session_id=?
               ORDER BY uploaded_at DESC""",
            (session_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def _safe_filename(name: str) -> str:
    raw = (name or "upload").strip()
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", raw)
    return safe[:120] or "upload"


def _extract_text_from_txt(path: Path) -> str:
    data = path.read_bytes()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="ignore")


def _extract_text_from_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    chunks = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks).strip()


def _analyze_medical_image(path: Path) -> str:
    import base64
    import anthropic as _anthropic

    ext = path.suffix.lower()
    media_type = IMAGE_MEDIA_TYPES.get(ext, "image/jpeg")
    image_data = base64.standard_b64encode(path.read_bytes()).decode("utf-8")

    _client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "You are a medical imaging specialist. Analyze this medical image and provide a structured clinical report covering:\n"
                            "1. **Image Type**: Identify the modality (X-ray, MRI, CT, ultrasound, dermatology photo, fundus, etc.)\n"
                            "2. **Key Findings**: Describe the main visible structures and their appearance\n"
                            "3. **Abnormalities**: Note any abnormal findings, lesions, or areas of concern with their location and characteristics\n"
                            "4. **Clinical Significance**: Explain the potential clinical relevance of the findings\n"
                            "5. **Limitations**: State any limitations in this analysis (e.g. image quality, lack of clinical context)\n\n"
                            "Be objective and thorough. If this does not appear to be a medical image, describe what you see and note that it may not be a medical image."
                        ),
                    },
                ],
            }
        ],
    )
    return response.content[0].text


def _transcribe_audio(path: Path) -> str:
    """Transcribe an audio file using SpeechRecognition + Google Speech API."""
    try:
        import speech_recognition as sr
    except ImportError:
        return f"Audio file: {path.name}. (Install SpeechRecognition to enable transcription.)"

    r = sr.Recognizer()
    try:
        with sr.AudioFile(str(path)) as source:
            audio_data = r.record(source)
        text = r.recognize_google(audio_data)
        return f"Audio transcription of '{path.name}':\n\n{text}"
    except sr.UnknownValueError:
        return f"Audio file '{path.name}' uploaded but speech could not be understood (too quiet or unclear)."
    except sr.RequestError as e:
        return f"Audio file '{path.name}' uploaded. Transcription service unavailable: {e}"
    except Exception as e:
        return (
            f"Audio file '{path.name}' uploaded. "
            f"Transcription failed (format may require ffmpeg): {e}. "
            "Consider converting to WAV format for best results."
        )


def _analyze_video(path: Path) -> str:
    """Extract key frames from a video and analyse each with Claude Vision."""
    try:
        import cv2  # type: ignore
    except ImportError:
        return f"Video file: {path.name}. (Install opencv-python-headless to enable frame analysis.)"

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return f"Video file '{path.name}' could not be opened for analysis."

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    duration = total_frames / fps

    import base64
    import anthropic as _anthropic
    _client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    frame_analyses = []
    for i, pos in enumerate([0.1, 0.5, 0.9]):
        frame_num = max(0, min(int(total_frames * pos), total_frames - 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if not ret:
            continue
        # Resize to cap payload
        h, w = frame.shape[:2]
        if max(h, w) > 1024:
            scale = 1024 / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
        b64 = base64.standard_b64encode(buf.tobytes()).decode("utf-8")
        try:
            resp = _client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=400,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
                        {"type": "text", "text": (
                            f"This is frame {i+1}/3 of a medical video at {pos*100:.0f}% of its "
                            f"{duration:.1f}s duration. Describe what you see from a medical perspective in 2-3 sentences."
                        )},
                    ],
                }],
            )
            frame_analyses.append(f"Frame {i+1} ({pos*100:.0f}%): {resp.content[0].text}")
        except Exception as e:
            frame_analyses.append(f"Frame {i+1}: analysis failed ({e})")

    cap.release()

    if not frame_analyses:
        return f"Video '{path.name}': no frames could be extracted for analysis."

    return (
        f"**Video analysis** — {path.name} ({duration:.1f}s at {fps:.0f}fps)\n\n"
        + "\n\n".join(frame_analyses)
    )


def session_update(sid, **kwargs):
    sets, vals = [], []
    for k, v in kwargs.items():
        sets.append(f"{k}=?")
        vals.append(json.dumps(v) if isinstance(v,(list,dict)) else v)
    vals += [_now(), sid]
    with get_db() as c:
        c.execute(f"UPDATE sessions SET {', '.join(sets)}, updated_at=? WHERE id=?", vals)
        c.commit()

def sessions_list(user_id=None):
    with get_db() as c:
        if user_id:
            rows = c.execute("SELECT id,status,created_at,symptoms,patient_id FROM sessions WHERE user_id=? ORDER BY created_at DESC", (user_id,)).fetchall()
        else:
            rows = c.execute("SELECT id,status,created_at,symptoms,patient_id FROM sessions ORDER BY created_at DESC").fetchall()
    return [{"id":d["id"],"status":d["status"],"created_at":d["created_at"],
             "patient_id":d["patient_id"],
             "description":json.loads(d["symptoms"]).get("description","")[:60]} for d in map(dict,rows)]


def provider_sessions_list():
    with get_db() as c:
        rows = c.execute(
            """SELECT s.id, s.status, s.created_at, s.patient_id, s.symptoms, s.severity_level,
                      u.username AS patient_username
               FROM sessions s
               LEFT JOIN users u ON s.user_id = u.id
               ORDER BY s.created_at DESC"""
        ).fetchall()

    out = []
    for row in rows:
        d = dict(row)
        symptoms = json.loads(d.get("symptoms") or "{}")
        out.append({
            "id": d["id"],
            "status": d.get("status"),
            "created_at": d.get("created_at"),
            "patient_id": d.get("patient_id"),
            "patient_username": d.get("patient_username"),
            "description": symptoms.get("description", "")[:120],
            "severity_level": d.get("severity_level") or symptoms.get("severity_level") or severity_to_level(symptoms.get("severity")),
        })
    return out


def _is_provider(user):
    return bool(user and user.get("role") == "provider")

# ── Request Models ────────────────────────────────────────
class RegisterInput(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = ""
    role: str = "patient"

class SymptomInput(BaseModel):
    description: str
    bodyPart: str = "General"
    duration: str = "1-3 days"
    severity: Union[int, str] = "moderate"
    notes: str = ""
    patient_id: Optional[str] = None
    pre_context: list[str] = []  # Analyses from pre-consultation media uploads

class ChatMessage(BaseModel):
    session_id: str
    user_message: str
    attachments: list[str] = []

class DiagnoseRequest(BaseModel):
    session_id: str


class MessageInput(BaseModel):
    role: str
    content: str
    agent_type: Optional[str] = None

class PatientInput(BaseModel):
    name: str
    dob: str = ""
    gender: str = ""
    blood_type: str = ""
    allergies: str = ""
    medications: str = ""
    conditions: str = ""
    notes: str = ""

class EvalRequest(BaseModel):
    question_id: str
    mode: str = "both"

# ── Health ────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service":"MediChain API","version":"4.0.0","rag_db_size":get_collection_size(),"status":"ok"}

@app.get("/api/rag/status")
def rag_status():
    size = get_collection_size()
    return {"document_count":size,"status":"ready" if size>0 else "empty"}

# ── Auth Routes ───────────────────────────────────────────
@app.post("/api/auth/register")
def register(body: RegisterInput):
    """用户注册"""
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if len(body.username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    user = user_create(body.username, body.email, body.password, body.full_name, body.role)
    token = create_token(user["id"], user["username"])
    return {"token": token, "user": user}

@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    """用户登录 (OAuth2 form)"""
    user = user_get_by_username(form.username)
    if not user or not verify_password(form.password, user["password"]):
        raise HTTPException(401, "Incorrect username or password")
    token = create_token(user["id"], user["username"])
    # Remove password from response
    user.pop("password", None)
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.post("/api/auth/login/json")
def login_json(body: dict):
    """用户登录 (JSON body)"""
    username = body.get("username","")
    password = body.get("password","")
    user = user_get_by_username(username)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(401, "Incorrect username or password")
    token = create_token(user["id"], user["username"])
    user.pop("password", None)
    return {"token": token, "user": user}

@app.get("/api/auth/me")
def me(user=Depends(require_user)):
    """获取当前用户信息"""
    return user

# ── Patient Routes ────────────────────────────────────────
@app.get("/api/patients")
def list_patients(user=Depends(require_user)):
    """获取当前用户的患者列表"""
    return patients_list(user["id"])

@app.post("/api/patients")
def create_patient(body: PatientInput, user=Depends(require_user)):
    """创建患者档案"""
    return patient_create(user["id"], body.model_dump())

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str, user=Depends(require_user)):
    """获取患者档案"""
    p = patient_get(patient_id)
    if not p: raise HTTPException(404, "Patient not found")
    if p["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    # attach session count
    with get_db() as c:
        count = c.execute("SELECT COUNT(*) FROM sessions WHERE patient_id=?", (patient_id,)).fetchone()[0]
    p["session_count"] = count
    return p

@app.put("/api/patients/{patient_id}")
def update_patient(patient_id: str, body: PatientInput, user=Depends(require_user)):
    """更新患者档案"""
    p = patient_get(patient_id)
    if not p: raise HTTPException(404, "Patient not found")
    if p["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    patient_update(patient_id, body.model_dump())
    return patient_get(patient_id)

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str, user=Depends(require_user)):
    """删除患者档案"""
    p = patient_get(patient_id)
    if not p: raise HTTPException(404, "Patient not found")
    if p["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    patient_delete(patient_id)
    return {"deleted": True}

@app.get("/api/patients/{patient_id}/sessions")
def patient_sessions(patient_id: str, user=Depends(require_user)):
    """获取患者的所有会话"""
    p = patient_get(patient_id)
    if not p: raise HTTPException(404, "Patient not found")
    if p["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    with get_db() as c:
        rows = c.execute(
            "SELECT id,status,created_at,symptoms FROM sessions WHERE patient_id=? ORDER BY created_at DESC",
            (patient_id,)
        ).fetchall()
    return [{"id":d["id"],"status":d["status"],"created_at":d["created_at"],
             "description":json.loads(d["symptoms"]).get("description","")[:60]} for d in map(dict,rows)]

# ── Stateless file analysis (no session required) ─────────
@app.post("/api/analyze/file")
async def analyze_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Analyse a file and return the result without persisting to any session.
    Used for pre-consultation uploads on the intake form."""
    import tempfile

    original_name = _safe_filename(file.filename or "upload")
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            400,
            "Unsupported file type. Supported: PDF, TXT, images (JPG/PNG/…), "
            "audio (MP3/WAV/M4A/OGG/FLAC), video (MP4/MOV/AVI/MKV/WEBM).",
        )
    file_type = ALLOWED_UPLOAD_TYPES[ext]
    payload = await file.read()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)

    try:
        if file_type == "txt":
            analysis = _extract_text_from_txt(tmp_path)
        elif file_type == "pdf":
            analysis = _extract_text_from_pdf(tmp_path)
        elif file_type == "image":
            analysis = _analyze_medical_image(tmp_path)
        elif file_type == "audio":
            analysis = _transcribe_audio(tmp_path)
        elif file_type == "video":
            analysis = _analyze_video(tmp_path)
        else:
            analysis = ""
    except Exception as e:
        raise HTTPException(400, f"Failed to process file: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

    return {
        "ok": True,
        "file_name": original_name,
        "file_type": file_type,
        "analysis": analysis,
        "analysis_preview": analysis[:400],
    }


# ── Session Routes ────────────────────────────────────────
@app.post("/api/session/start")
def start_session(symptoms: SymptomInput, user=Depends(get_current_user)):
    sid = str(uuid.uuid4())
    severity_level = severity_to_level(symptoms.severity)
    severity_score = severity_to_score(severity_level)
    payload = symptoms.model_dump()
    payload["severity"] = severity_score
    payload["severity_level"] = severity_level
    pre_ctx_block = ""
    if symptoms.pre_context:
        ctx_items = [c.strip() for c in symptoms.pre_context if c.strip()]
        if ctx_items:
            pre_ctx_block = (
                "\n\nPRE-CONSULTATION MEDIA CONTEXT\n" + "=" * 40 + "\n"
                + "\n\n---\n\n".join(ctx_items)
            )
    case = (
        f"Patient presents with:\n- Chief complaint: {symptoms.description}\n"
        f"- Body area: {symptoms.bodyPart}\n- Duration: {symptoms.duration}\n"
        f"- Severity: {severity_level}\n- History: {symptoms.notes or 'None'}"
        f"{pre_ctx_block}\n\nBegin empathetic interview."
    )
    history = [{"role":"user","content":case}]
    reply = call_interviewer(history)
    history.append({"role":"assistant","content":reply})
    messages = [{"role":"ai","agent":"interviewer","text":reply}]
    now = _now()
    uid = user["id"] if user else None
    with get_db() as c:
        c.execute("""INSERT INTO sessions(id,user_id,patient_id,symptoms,messages,history,turns,status,severity_level,created_at,updated_at)
            VALUES(?,?,?,?,?,?,0,'interviewing',?,?,?)""",
            (sid, uid, symptoms.patient_id,
             json.dumps(payload), json.dumps(messages), json.dumps(history), severity_level, now, now))
        c.commit()

    safety = classify_safety(symptoms.description)
    safety_content = json.dumps(
        {
            "final_risk": safety.get("final_risk", safety.get("risk_level", "low")),
            "rule_risk": safety.get("rule_risk", "low"),
            "llm_risk": safety.get("llm_risk", "low"),
            "message": safety.get("message", ""),
            "warning": safety.get("warning", ""),
        },
        ensure_ascii=False,
    )

    session_message_create(sid, role="agent", content=safety_content, agent_type="safety", user_id=uid)
    session_message_create(sid, role="agent", content=reply, agent_type="interviewer", user_id=uid)
    return {
        "session_id":sid,
        "reply":reply,
        "status":"interviewing",
        "safety": {
            "final_risk": safety.get("final_risk", safety.get("risk_level", "low")),
            "message": safety.get("message", ""),
            "warning": safety.get("warning", ""),
            "rule_risk": safety.get("rule_risk", "low"),
            "llm_risk": safety.get("llm_risk", "low"),
        },
    }


@app.post("/api/sessions")
def create_session(symptoms: SymptomInput, user=Depends(get_current_user)):
    return start_session(symptoms, user)

@app.post("/api/session/chat")
def chat(body: ChatMessage, user=Depends(get_current_user)):
    sess = session_get(body.session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess["status"]!="interviewing": raise HTTPException(400,f"Status: {sess['status']}")
    if sess.get("user_id") and (not user or sess["user_id"] != user["id"]):
        raise HTTPException(403, "Forbidden")
    history=sess["history"]; messages=sess["messages"]; turns=sess["turns"]+1

    for att in (body.attachments or []):
        att_text = (att or "").strip()
        if not att_text:
            continue
        history.append({"role":"user","content":f"[ATTACHMENT] {att_text}"})
        messages.append({"role":"user","text":f"📎 {att_text}"})
        session_message_create(body.session_id, role="user", content=f"📎 {att_text}", user_id=user["id"] if user else None)

    history.append({"role":"user","content":body.user_message})
    messages.append({"role":"user","text":body.user_message})
    session_message_create(body.session_id, role="user", content=body.user_message, user_id=user["id"] if user else None)

    safety = classify_safety(body.user_message)
    safety_content = json.dumps(
        {
            "final_risk": safety.get("final_risk", safety.get("risk_level", "low")),
            "rule_risk": safety.get("rule_risk", "low"),
            "llm_risk": safety.get("llm_risk", "low"),
            "message": safety.get("message", ""),
            "warning": safety.get("warning", ""),
        },
        ensure_ascii=False,
    )
    session_message_create(
        body.session_id,
        role="agent",
        content=safety_content,
        agent_type="safety",
        user_id=user["id"] if user else None,
    )

    MAX_TURNS = 12  # Safety ceiling — prevent runaway sessions
    reply = call_interviewer(normalize_history_for_interviewer(history))
    ready = "[READY_FOR_DIAGNOSIS]" in reply
    clean = reply.replace("[READY_FOR_DIAGNOSIS]","").strip()

    # If we hit the turn ceiling and Claude hasn't wrapped up yet, append a
    # natural closing sentence so the patient isn't left hanging.
    force_trigger = turns >= MAX_TURNS
    if force_trigger and not ready:
        clean = clean + "\n\nThank you for sharing all of that. I now have enough information to proceed with a thorough analysis."

    history.append({"role":"assistant","content":clean})
    messages.append({"role":"ai","agent":"interviewer","text":clean})
    session_message_create(body.session_id, role="agent", content=clean, agent_type="interviewer", user_id=user["id"] if user else None)
    trigger = ready or force_trigger
    session_update(body.session_id,history=history,messages=messages,
        turns=turns,status="analyzing" if trigger else "interviewing")
    return {
        "reply":clean,
        "status":"analyzing" if trigger else "interviewing",
        "trigger_diagnose":trigger,
        "safety": {
            "final_risk": safety.get("final_risk", safety.get("risk_level", "low")),
            "message": safety.get("message", ""),
            "warning": safety.get("warning", ""),
            "rule_risk": safety.get("rule_risk", "low"),
            "llm_risk": safety.get("llm_risk", "low"),
        },
    }

@app.post("/api/session/diagnose")
def diagnose(body: DiagnoseRequest, user=Depends(get_current_user)):
    sess = session_get(body.session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess.get("user_id") and (not user or sess["user_id"] != user["id"]):
        raise HTTPException(403, "Forbidden")
    s = sess["symptoms"]

    # Separate image analyses from regular conversation messages
    image_analyses = []
    lines = []
    for m in sess["messages"]:
        role = m["role"]
        text = m.get("text", "")
        if role == "system" and text.startswith("Uploaded file:") and "image" in text.lower():
            # Extract the AI analysis portion (everything after the metadata line)
            analysis_body = text.split("\n\n", 1)[1] if "\n\n" in text else text
            image_analyses.append(analysis_body)
        elif role == "user":
            lines.append(f"PATIENT: {text}")
        elif role == "system":
            lines.append(f"CONTEXT: {text}")
        else:
            lines.append(f"INTERVIEWER: {text}")

    image_section = ""
    if image_analyses:
        image_section = (
            f"\nMEDICAL IMAGE ANALYSIS\n{'='*40}\n"
            + "\n\n---\n\n".join(image_analyses)
            + "\n"
        )

    case_text = (
        f"PATIENT CASE\n{'='*40}\n"
        f"Chief complaint: {s['description']}\n"
        f"Body area: {s['bodyPart']}\nDuration: {s['duration']}\n"
        f"Severity: {s.get('severity_level', severity_to_level(s.get('severity')))}\n"
        f"History: {s['notes'] or 'None'}\n"
        f"{image_section}"
        f"\nTRANSCRIPT\n{'='*40}\n"
        + "\n\n".join(lines)
    )

    # Enrich RAG query with image findings if available
    image_query_suffix = " ".join(
        a[:200] for a in image_analyses
    ) if image_analyses else ""
    rag_query = f"{s['description']} {s['bodyPart']} {s['duration']} {image_query_suffix}".strip()

    diagnosis, refs = call_diagnostician(case_text, rag_query)
    review = call_critic(case_text, diagnosis)
    session_message_create(body.session_id, role="agent", content=diagnosis, agent_type="diagnostician", user_id=user["id"] if user else None)
    session_message_create(body.session_id, role="agent", content=review, agent_type="critic", user_id=user["id"] if user else None)
    session_update(body.session_id,diagnosis=diagnosis,review=review,refs=refs,status="done")
    return {"status":"done","diagnosis":diagnosis,"review":review,"refs":refs}

@app.get("/api/session/{session_id}")
def get_session(session_id: str, user=Depends(get_current_user)):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess.get("user_id") and (not user or (not _is_provider(user) and sess["user_id"] != user["id"])):
        raise HTTPException(403, "Forbidden")
    return sess

@app.get("/api/sessions")
def list_sessions(user=Depends(require_user)):
    if _is_provider(user):
        return sessions_list()
    return sessions_list(user["id"])


@app.get("/api/provider/sessions")
def provider_sessions(user=Depends(require_user)):
    if not _is_provider(user):
        raise HTTPException(403, "Provider access required")
    return provider_sessions_list()


@app.post("/api/sessions/{session_id}/messages")
def store_session_message(session_id: str, body: MessageInput, user=Depends(require_user)):
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not _is_provider(user) and sess["user_id"] != user["id"]):
        raise HTTPException(403, "Forbidden")

    session_message_create(
        session_id=session_id,
        role=body.role,
        content=body.content,
        agent_type=body.agent_type,
        user_id=user["id"]
    )

    legacy_messages = sess["messages"]
    if body.role == "user":
        legacy_messages.append({"role": "user", "text": body.content})
    elif body.role == "agent":
        legacy_messages.append({"role": "ai", "agent": body.agent_type, "text": body.content})
    else:
        legacy_messages.append({"role": "system", "text": body.content})
    session_update(session_id, messages=legacy_messages)

    return {"ok": True}


@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str, user=Depends(require_user)):
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not _is_provider(user) and sess["user_id"] != user["id"]):
        raise HTTPException(403, "Forbidden")
    return session_messages_raw(session_id)


@app.get("/api/sessions/{session_id}/uploads")
def get_session_uploads(session_id: str, user=Depends(get_current_user)):
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not user or (not _is_provider(user) and sess["user_id"] != user["id"])):
        raise HTTPException(403, "Forbidden")
    return session_uploads_list(session_id)


@app.post("/api/sessions/{session_id}/upload")
async def upload_session_file(session_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")
    if sess.get("user_id") and (not user or sess["user_id"] != user["id"]):
        raise HTTPException(403, "Forbidden")

    original_name = _safe_filename(file.filename or "upload")
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(400, "Only .pdf, .txt, and image files (.jpg, .jpeg, .png, .gif, .bmp, .webp) are supported")

    file_type = ALLOWED_UPLOAD_TYPES[ext]
    upload_id = str(uuid.uuid4())
    session_dir = UPLOAD_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{upload_id}{ext}"
    stored_path = session_dir / stored_name

    payload = await file.read()
    stored_path.write_bytes(payload)

    try:
        if file_type == "txt":
            extracted_text = _extract_text_from_txt(stored_path)
        elif file_type == "image":
            extracted_text = _analyze_medical_image(stored_path)
        else:
            extracted_text = _extract_text_from_pdf(stored_path)
    except Exception as e:
        raise HTTPException(400, f"Failed to process file: {e}")

    uploaded_at = _now()
    with get_db() as c:
        c.execute(
            """INSERT INTO uploads(id,session_id,file_name,file_type,file_path,extracted_text,uploaded_at)
               VALUES(?,?,?,?,?,?,?)""",
            (
                upload_id,
                session_id,
                original_name,
                file_type,
                str(stored_path),
                extracted_text,
                uploaded_at,
            ),
        )
        c.commit()

    # Push extracted content into session history so next chat turn can use it.
    context_text = extracted_text.strip()
    if len(context_text) > MAX_UPLOAD_CONTEXT_CHARS:
        context_text = context_text[:MAX_UPLOAD_CONTEXT_CHARS] + "\n...[truncated]"

    if file_type == "image":
        context_label = f"Uploaded medical image: {original_name}. AI analysis of this image:\n\n"
    else:
        context_label = f"Uploaded {file_type.upper()} file: {original_name}. Use the following extracted text as additional clinical context:\n\n"

    history = sess.get("history", [])
    history.append({
        "role": "system",
        "content": context_label + context_text,
    })

    legacy_messages = sess.get("messages", [])
    legacy_messages.append({
        "role": "system",
        "text": f"Uploaded file context added: {original_name} ({file_type})",
    })
    session_update(session_id, history=history, messages=legacy_messages)

    session_message_create(
        session_id=session_id,
        role="system",
        content=(
            f"Uploaded file: {original_name} ({file_type}), analysis length {len(extracted_text)} chars.\n\n"
            f"{context_text}"
        ),
        user_id=user["id"] if user else None,
    )

    return {
        "ok": True,
        "upload": {
            "id": upload_id,
            "session_id": session_id,
            "file_name": original_name,
            "file_type": file_type,
            "file_path": str(stored_path),
            "uploaded_at": uploaded_at,
            "extracted_text_length": len(extracted_text),
            "extracted_text_preview": extracted_text[:500],
        },
    }

# ── Export ────────────────────────────────────────────────
@app.get("/api/session/{session_id}/export/pdf")
def export_pdf(session_id: str):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess["status"]!="done": raise HTTPException(400,"Not complete")
    pdf_bytes = generate_pdf(sess)
    fname = f"MediChain_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(content=pdf_bytes,media_type="application/pdf",
        headers={"Content-Disposition":f'attachment; filename="{fname}"'})

@app.get("/api/session/{session_id}/export/json")
def export_json(session_id: str):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    data = {k:v for k,v in sess.items() if k!="history"}
    data["exported_at"] = _now()
    fname = f"MediChain_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}.json"
    return Response(content=json.dumps(data,indent=2,ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition":f'attachment; filename="{fname}"'})

# ── MedQA Eval ────────────────────────────────────────────
@app.get("/api/eval/questions")
def get_questions():
    return {"questions":[{"id":q["id"],"question":q["question"],"options":q["options"],"category":q["category"]} for q in SAMPLE_QUESTIONS]}

@app.post("/api/eval/run")
def run_eval(body: EvalRequest):
    q = next((x for x in SAMPLE_QUESTIONS if x["id"]==body.question_id), None)
    if not q: raise HTTPException(404,"Question not found")
    result = {"question_id":body.question_id,"correct":q["correct"],"category":q["category"]}
    if body.mode in ("single","both"):
        s = run_single_llm(q["question"], q["options"])
        result["single"] = s; result["single_correct"] = s["answer"]==q["correct"]
    if body.mode in ("multi","both"):
        m = run_multi_agent(q["question"], q["options"])
        result["multi"] = m; result["multi_correct"] = m["answer"]==q["correct"]
    eid = str(uuid.uuid4())
    with get_db() as c:
        c.execute("""INSERT INTO eval_runs(id,question_id,single_answer,single_reasoning,
            multi_answer,multi_reasoning,multi_pipeline,correct_answer,category,
            single_correct,multi_correct,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            (eid,body.question_id,
             result.get("single",{}).get("answer",""),result.get("single",{}).get("reasoning",""),
             result.get("multi",{}).get("answer",""),result.get("multi",{}).get("reasoning",""),
             json.dumps(result.get("multi",{}).get("pipeline",{})),
             q["correct"],q["category"],
             1 if result.get("single_correct") else 0,
             1 if result.get("multi_correct") else 0, _now()))
        c.commit()
    return result

@app.get("/api/eval/history")
def eval_history():
    with get_db() as c:
        rows = c.execute("""SELECT question_id,single_answer,multi_answer,correct_answer,
            category,single_correct,multi_correct,created_at FROM eval_runs
            ORDER BY created_at DESC LIMIT 50""").fetchall()
    records = [dict(r) for r in rows]
    if records:
        total=len(records); s_total=sum(1 for r in records if r["single_answer"]); m_total=sum(1 for r in records if r["multi_answer"])
        s_correct=sum(r["single_correct"] or 0 for r in records); m_correct=sum(r["multi_correct"] or 0 for r in records)
        cats={}
        for r in records:
            cat=r["category"]
            if cat not in cats: cats[cat]={"single":0,"single_c":0,"multi":0,"multi_c":0}
            if r["single_answer"]: cats[cat]["single"]+=1; cats[cat]["single_c"]+=r["single_correct"] or 0
            if r["multi_answer"]:  cats[cat]["multi"]+=1;  cats[cat]["multi_c"]+=r["multi_correct"] or 0
        stats={"total":total,"single_accuracy":round(s_correct/s_total*100,1) if s_total else 0,
               "multi_accuracy":round(m_correct/m_total*100,1) if m_total else 0,
               "improvement":round((m_correct-s_correct)/s_total*100,1) if s_total else 0,"by_category":cats}
    else:
        stats={"total":0,"single_accuracy":0,"multi_accuracy":0,"improvement":0,"by_category":{}}
    return {"records":records,"stats":stats}