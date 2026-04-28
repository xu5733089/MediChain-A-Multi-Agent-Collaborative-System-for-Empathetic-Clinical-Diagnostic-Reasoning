"""
main.py — MediChain FastAPI backend v4.0
JWT auth + patient record management
Run: uvicorn main:app --reload --port 8000
"""
import os, json, uuid
import re
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Query, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, field_validator, model_validator

load_dotenv()

# ── Input validation helpers ──────────────────────────────────
_INJECTION_PATTERNS = re.compile(
    r"(ignore\s+(previous|prior|all)\s+instructions?|"
    r"you\s+are\s+now|forget\s+(everything|all)|"
    r"act\s+as\s+if|pretend\s+(you\s+are|to\s+be)|"
    r"disregard\s+(your|all)|system\s+prompt|"
    r"jailbreak|do\s+anything\s+now|dan\s+mode|"
    r"<\s*script|javascript:|on\w+\s*=)",
    re.IGNORECASE,
)

def _check_injection(text: str, field: str = "input") -> None:
    """Raise 400 if text contains prompt-injection or XSS patterns."""
    if _INJECTION_PATTERNS.search(text):
        raise HTTPException(400, f"Invalid content detected in {field}.")

_ALLOWED_ROLES      = {"patient", "provider"}
_ALLOWED_GENDERS    = {"male", "female", "other", "prefer not to say", ""}
_ALLOWED_BLOOD_TYPES = {"a+", "a-", "b+", "b-", "ab+", "ab-", "o+", "o-", "unknown", ""}
_ALLOWED_MSG_ROLES  = {"user", "agent", "system"}
_ALLOWED_AGENT_TYPES = {"interviewer", "diagnostician", "critic", "safety", None}
_ALLOWED_EVAL_MODES = {"rag", "base", "both"}

from sse_starlette.sse import EventSourceResponse

from agents import (
    call_interviewer, call_diagnostician, call_critic,
    call_diagnostician_cot, call_critic_cot,
    rewrite_image_findings_for_rag,
    call_agent_commentary, call_diagnostic_roundtable,
)
from agents_async import (
    call_interviewer_async,
    call_diagnostician_cot_async, call_diagnostician_async,
    call_critic_cot_async, call_critic_async,
    call_agent_commentary_async, call_diagnostic_roundtable_async,
)
from safety import classify_safety
from rag    import get_collection_size, search, add_documents
from ingest import fetch_pmids, fetch_article_details, DEFAULT_TERMS
from export import generate_pdf
from eval   import run_single_llm, run_multi_agent, run_mistral_judge, run_mistral_diagnosis_review, SAMPLE_QUESTIONS
from db import get_db, init_db, now_iso, severity_to_level, severity_to_score, VALID_AGENT_TYPES
from auth   import (
    user_create, user_get_by_username, verify_password,
    create_token, get_current_user, require_user,
    patient_create, patient_get, patient_update, patient_delete, patients_list
)

app = FastAPI(title="MediChain API", version="4.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:5174","http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a concise, user-friendly 422 error instead of the raw Pydantic dump."""
    errors = []
    for e in exc.errors():
        field = " → ".join(str(x) for x in e["loc"] if x != "body")
        errors.append(f"{field}: {e['msg']}" if field else e["msg"])
    return JSONResponse(status_code=422, content={"detail": "; ".join(errors)})

init_db()

# ── print RAG status on startup; optionally auto-ingest ──────────
_rag_size = get_collection_size()
print(f"\n{'='*50}")
print(f"  MediChain RAG Knowledge Base")
print(f"  Documents loaded: {_rag_size}")
if _rag_size > 0:
    print(f"  Status: ✅ Ready")
else:
    print(f"  Status: ⚠️  Empty")
print(f"  ─────────────────────────────────────")
print(f"  Quick commands:")
print(f"    python ingest.py              # full ingest (78 terms, ~1000+ articles)")
print(f"    python ingest.py --status     # check DB size")
print(f"    AUTO_INGEST=1 uvicorn main:app  # auto-ingest on startup")
print(f"{'='*50}\n")

# set AUTO_INGEST=1 to pull PubMed articles automatically on startup
if os.getenv("AUTO_INGEST", "").strip() in ("1", "true", "yes"):
    from ingest import run_ingestion, DEFAULT_TERMS as _INGEST_TERMS
    print("🔄 AUTO_INGEST enabled — starting PubMed ingestion...")
    run_ingestion(_INGEST_TERMS, per_term=15)
    print()

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
    ".dcm": "dicom",
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


def _extract_latest_safety_payload(session_id: str):
    with get_db() as c:
        row = c.execute(
            """SELECT content FROM messages
               WHERE session_id=? AND role='agent' AND agent_type='safety'
               ORDER BY created_at DESC LIMIT 1""",
            (session_id,),
        ).fetchone()
    if not row:
        return None
    try:
        payload = json.loads(row["content"])
        return {
            "final_risk": payload.get("final_risk", payload.get("risk_level", "low")),
            "message": payload.get("message", ""),
            "warning": payload.get("warning", ""),
            "rule_risk": payload.get("rule_risk", "low"),
            "llm_risk": payload.get("llm_risk", "low"),
        }
    except Exception:
        return None


def _maybe_reuse_recent_session(symptoms, user_id, severity_level):
    # In dev StrictMode, ChatPage init can run twice. Reuse a very recent,
    # untouched interviewing session with the same symptom payload.
    with get_db() as c:
        if user_id:
            row = c.execute(
                """SELECT id, symptoms, severity_level, created_at, turns, status
                   FROM sessions
                   WHERE user_id=?
                   ORDER BY created_at DESC
                   LIMIT 1""",
                (user_id,),
            ).fetchone()
        else:
            row = c.execute(
                """SELECT id, symptoms, severity_level, created_at, turns, status
                   FROM sessions
                   WHERE user_id IS NULL
                   ORDER BY created_at DESC
                   LIMIT 1"""
            ).fetchone()

    if not row:
        return None

    latest = dict(row)
    if latest.get("status") != "interviewing" or int(latest.get("turns") or 0) != 0:
        return None

    try:
        created_at = datetime.fromisoformat(latest["created_at"])
    except Exception:
        return None

    if (datetime.utcnow() - created_at) > timedelta(seconds=20):
        return None

    try:
        old_symptoms = json.loads(latest.get("symptoms") or "{}")
    except Exception:
        return None

    same_payload = (
        old_symptoms.get("description") == symptoms.description
        and old_symptoms.get("bodyPart") == symptoms.bodyPart
        and old_symptoms.get("duration") == symptoms.duration
        and (old_symptoms.get("notes") or "") == (symptoms.notes or "")
        and old_symptoms.get("patient_id") == symptoms.patient_id
    )
    if not same_payload:
        return None

    old_level = latest.get("severity_level") or old_symptoms.get("severity_level")
    if severity_to_level(old_level) != severity_level:
        return None

    return latest["id"]

# ── Session DB helpers ────────────────────────────────────
def session_get(sid):
    with get_db() as c:
        row = c.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone()
    if not row: return None
    d = dict(row)
    for k in ("symptoms","history","refs"):
        d[k] = json.loads(d[k])
    # cot is stored as JSON string or None
    if d.get("cot") and isinstance(d["cot"], str):
        try:
            d["cot"] = json.loads(d["cot"])
        except Exception:
            pass  # leave as raw string
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
        # Wrap in XML tag so the model treats this as data, not instructions.
        normalized.append({"role": "user", "content": f"<uploaded_document>\n{content}\n</uploaded_document>"})
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


_MAX_IMAGE_BYTES = 3 * 1024 * 1024  # 3 MB raw → ~4 MB base64, safely under Claude's 5 MB base64 limit


def _compress_image_bytes(raw: bytes, orig_ext: str) -> tuple[bytes, str]:
    """Resize + re-encode image with Pillow until raw bytes fit within _MAX_IMAGE_BYTES."""
    import io
    from PIL import Image

    img = Image.open(io.BytesIO(raw)).convert("RGB")
    w0, h0 = img.size
    quality = 85
    scale = 1.0
    last: bytes = raw

    while True:
        w = max(1, int(w0 * scale))
        h = max(1, int(h0 * scale))
        frame = img.resize((w, h), Image.LANCZOS) if scale < 1.0 else img
        buf = io.BytesIO()
        frame.save(buf, format="JPEG", quality=quality, optimize=True)
        data = buf.getvalue()
        last = data
        if len(data) <= _MAX_IMAGE_BYTES:
            return data, "image/jpeg"
        # Reduce quality first, then shrink dimensions
        if quality > 40:
            quality -= 15
        else:
            scale *= 0.7
        if scale < 0.05:
            break  # last attempt — send even if still slightly large

    return last, "image/jpeg"


def _analyze_medical_image_bytes(raw: bytes, media_type: str) -> dict:
    """Send image bytes to Claude Vision. Returns {analysis, annotations}."""
    import base64
    import re
    import anthropic as _anthropic

    VALID_REGIONS = {
        "UPPER-LEFT", "UPPER-CENTER", "UPPER-RIGHT",
        "CENTER-LEFT", "CENTER", "CENTER-RIGHT",
        "LOWER-LEFT", "LOWER-CENTER", "LOWER-RIGHT", "OVERALL",
    }

    image_data = base64.standard_b64encode(raw).decode("utf-8")
    _client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": image_data},
                },
                {
                    "type": "text",
                    "text": (
                        "You are a medical imaging specialist. Analyze this medical image.\n\n"
                        "First write the clinical report with these sections:\n"
                        "1. **Image Type**: Modality (X-ray, MRI, CT, ultrasound, dermatology, etc.)\n"
                        "2. **Key Findings**: Main visible structures and appearance\n"
                        "3. **Abnormalities**: Any abnormal findings with location and characteristics\n"
                        "4. **Clinical Significance**: Potential clinical relevance\n"
                        "5. **Limitations**: Any limitations\n\n"
                        "Then output a JSON block (no markdown fences) exactly like this:\n"
                        'ANNOTATIONS_JSON:[{"region":"UPPER-LEFT","finding":"..."},{"region":"CENTER","finding":"..."}]\n\n'
                        "Rules for ANNOTATIONS_JSON:\n"
                        "- 3 to 6 entries\n"
                        "- region must be one of: UPPER-LEFT, UPPER-CENTER, UPPER-RIGHT, "
                        "CENTER-LEFT, CENTER, CENTER-RIGHT, LOWER-LEFT, LOWER-CENTER, LOWER-RIGHT, OVERALL\n"
                        "- finding: short phrase describing what is visible in that region\n"
                        "- Output valid JSON only, no extra text after the JSON array\n\n"
                        "If this is not a medical image, still output ANNOTATIONS_JSON with OVERALL region describing what you see."
                    ),
                },
            ],
        }],
    )
    text = response.content[0].text

    # Parse ANNOTATIONS_JSON
    annotations = []
    json_match = re.search(r"ANNOTATIONS_JSON:\s*(\[.*?\])", text, re.DOTALL)
    if json_match:
        try:
            raw_annotations = json.loads(json_match.group(1))
            for entry in raw_annotations:
                region = str(entry.get("region", "")).upper().strip()
                finding = str(entry.get("finding", "")).strip()
                if region in VALID_REGIONS and finding:
                    annotations.append({"region": region, "finding": finding})
        except (json.JSONDecodeError, AttributeError):
            pass
        text = text[:json_match.start()].strip()

    return {"analysis": text, "annotations": annotations}


def _analyze_medical_image(path: Path) -> dict:
    ext = path.suffix.lower()
    raw = path.read_bytes()
    if len(raw) > _MAX_IMAGE_BYTES:
        raw, media_type = _compress_image_bytes(raw, ext)
    else:
        media_type = IMAGE_MEDIA_TYPES.get(ext, "image/jpeg")
    return _analyze_medical_image_bytes(raw, media_type)


def _analyze_dicom(path: Path) -> dict:
    """Read DICOM file, convert pixel data to JPEG, analyze with Claude Vision."""
    try:
        import pydicom
    except ImportError:
        return {
            "analysis": f"DICOM file: {path.name}. (Install pydicom to enable DICOM analysis.)",
            "annotations": [],
        }
    import io
    import numpy as np
    from PIL import Image

    ds = pydicom.dcmread(str(path))
    arr = ds.pixel_array.astype(float)

    # Normalize to 0-255
    pmin, pmax = arr.min(), arr.max()
    if pmax > pmin:
        arr = ((arr - pmin) / (pmax - pmin) * 255).astype("uint8")
    else:
        arr = arr.astype("uint8")

    # Handle multi-frame: take middle frame
    if arr.ndim == 3 and arr.shape[0] > 1:
        arr = arr[arr.shape[0] // 2]
    elif arr.ndim == 3:
        arr = arr[0]

    img = Image.fromarray(arr).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    raw = buf.getvalue()

    # Build metadata prefix
    modality = getattr(ds, "Modality", "Unknown")
    body_part = getattr(ds, "BodyPartExamined", "")
    study_desc = getattr(ds, "StudyDescription", "")
    meta = f"DICOM — Modality: {modality}"
    if body_part:
        meta += f" | Body Part: {body_part}"
    if study_desc:
        meta += f" | Study: {study_desc}"

    result = _analyze_medical_image_bytes(raw, "image/jpeg")
    result["analysis"] = f"**{meta}**\n\n" + result["analysis"]
    return result


def _transcribe_audio(path: Path, language: str = "en-US") -> str:
    """Transcribe an audio file using SpeechRecognition + Google Speech API."""
    try:
        import speech_recognition as sr
    except ImportError:
        return f"Audio file: {path.name}. (Install SpeechRecognition to enable transcription.)"

    r = sr.Recognizer()
    wav_path = path
    tmp_wav = None
    try:
        # Convert non-WAV formats (mp3, m4a, ogg, flac, etc.) to WAV via pydub+ffmpeg
        if path.suffix.lower() != ".wav":
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(str(path))
                tmp_wav = path.with_suffix(".tmp_conv.wav")
                audio.export(str(tmp_wav), format="wav")
                wav_path = tmp_wav
            except Exception as conv_err:
                return (
                    f"Audio file '{path.name}' uploaded. "
                    f"Format conversion failed: {conv_err}. "
                    "Ensure ffmpeg is installed in the environment."
                )

        with sr.AudioFile(str(wav_path)) as source:
            audio_data = r.record(source)
        text = r.recognize_google(audio_data, language=language)
        return f"Audio transcription of '{path.name}' [{language}]:\n\n{text}"
    except sr.UnknownValueError:
        return f"Audio file '{path.name}' uploaded but speech could not be understood (too quiet or unclear)."
    except sr.RequestError as e:
        return f"Audio file '{path.name}' uploaded. Transcription service unavailable: {e}"
    except Exception as e:
        return (
            f"Audio file '{path.name}' uploaded. "
            f"Transcription failed: {e}."
        )
    finally:
        if tmp_wav and tmp_wav.exists():
            tmp_wav.unlink(missing_ok=True)


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

def _normalize_filter_value(value: Optional[str]) -> Optional[str]:
    v = (value or "").strip()
    return v if v else None


def sessions_list(
    user_id=None,
    status: Optional[str] = None,
    severity_level: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    status = _normalize_filter_value(status)
    severity_level = _normalize_filter_value(severity_level)
    date_from = _normalize_filter_value(date_from)
    date_to = _normalize_filter_value(date_to)
    q = (_normalize_filter_value(q) or "").lower()
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    where = []
    vals = []
    if user_id:
        where.append("user_id=?")
        vals.append(user_id)
    if status:
        where.append("status=?")
        vals.append(status)
    if severity_level:
        where.append("severity_level=?")
        vals.append(severity_level)
    if date_from:
        where.append("created_at>=?")
        vals.append(date_from)
    if date_to:
        where.append("created_at<=?")
        vals.append(date_to)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sql = f"""SELECT id,status,created_at,symptoms,patient_id,severity_level
              FROM sessions
              {where_sql}
              ORDER BY created_at DESC"""
    with get_db() as c:
        rows = [dict(r) for r in c.execute(sql, tuple(vals)).fetchall()]

    out = []
    for d in rows:
        symptoms = json.loads(d.get("symptoms") or "{}")
        description = symptoms.get("description", "")
        if q and q not in description.lower():
            continue
        out.append({
            "id": d["id"],
            "status": d["status"],
            "created_at": d["created_at"],
            "patient_id": d["patient_id"],
            "severity_level": d.get("severity_level") or symptoms.get("severity_level") or severity_to_level(symptoms.get("severity")),
            "description": description[:60],
        })
    return out[offset: offset + limit]


def provider_sessions_list(
    status: Optional[str] = None,
    severity_level: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    status = _normalize_filter_value(status)
    severity_level = _normalize_filter_value(severity_level)
    date_from = _normalize_filter_value(date_from)
    date_to = _normalize_filter_value(date_to)
    q = (_normalize_filter_value(q) or "").lower()
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    where = []
    vals = []
    if status:
        where.append("s.status=?")
        vals.append(status)
    if severity_level:
        where.append("s.severity_level=?")
        vals.append(severity_level)
    if date_from:
        where.append("s.created_at>=?")
        vals.append(date_from)
    if date_to:
        where.append("s.created_at<=?")
        vals.append(date_to)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    with get_db() as c:
        rows = c.execute(
            f"""SELECT s.id, s.status, s.created_at, s.patient_id, s.symptoms, s.severity_level,
                      s.provider_verdict, u.username AS patient_username
               FROM sessions s
               LEFT JOIN users u ON s.user_id = u.id
               {where_sql}
               ORDER BY s.created_at DESC""",
            tuple(vals),
        ).fetchall()

    out = []
    for row in rows:
        d = dict(row)
        symptoms = json.loads(d.get("symptoms") or "{}")
        description = symptoms.get("description", "")
        if q and q not in description.lower():
            continue
        out.append({
            "id": d["id"],
            "status": d.get("status"),
            "created_at": d.get("created_at"),
            "patient_id": d.get("patient_id"),
            "patient_username": d.get("patient_username"),
            "description": description[:120],
            "severity_level": d.get("severity_level") or symptoms.get("severity_level") or severity_to_level(symptoms.get("severity")),
            "provider_verdict": d.get("provider_verdict"),
        })
    return out[offset: offset + limit]


def _is_provider(user):
    return bool(user and user.get("role") == "provider")

# ── Request Models ────────────────────────────────────────
class RegisterInput(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str    = Field(min_length=5, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=100)
    role: str = "patient"

    @field_validator("username")
    @classmethod
    def val_username(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[A-Za-z0-9_\-]+$", v):
            raise ValueError("Username may only contain letters, digits, _ and -")
        return v

    @field_validator("email")
    @classmethod
    def val_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email address")
        return v

    @field_validator("role")
    @classmethod
    def val_role(cls, v: str) -> str:
        if v not in _ALLOWED_ROLES:
            raise ValueError(f"role must be one of: {', '.join(_ALLOWED_ROLES)}")
        return v

    @field_validator("full_name")
    @classmethod
    def val_full_name(cls, v: str) -> str:
        _check_injection(v, "full_name")
        return v.strip()


class SymptomInput(BaseModel):
    description: str = Field(min_length=2, max_length=2000)
    bodyPart: str    = Field(default="General", max_length=100)
    duration: str    = Field(default="1-3 days", max_length=50)
    severity: Union[int, str] = "moderate"
    notes: str = Field(default="", max_length=500)
    patient_id: Optional[str] = None
    pre_context: list[str] = Field(default=[], max_length=20)
    consent_to_provider_review: bool = False

    @field_validator("description")
    @classmethod
    def val_description(cls, v: str) -> str:
        v = v.strip()
        _check_injection(v, "description")
        return v

    @field_validator("severity")
    @classmethod
    def val_severity(cls, v: Union[int, str]) -> Union[int, str]:
        if isinstance(v, int) and not (1 <= v <= 10):
            raise ValueError("severity must be between 1 and 10")
        return v

    @field_validator("notes")
    @classmethod
    def val_notes(cls, v: str) -> str:
        _check_injection(v, "notes")
        return v.strip()


class ChatMessage(BaseModel):
    session_id: str  = Field(min_length=1, max_length=64)
    user_message: str = Field(min_length=1, max_length=2000)
    attachments: list[str] = Field(default=[], max_length=10)

    @field_validator("user_message")
    @classmethod
    def val_user_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        _check_injection(v, "user_message")
        return v


class DiagnoseRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)


class MessageInput(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=5000)
    agent_type: Optional[str] = None

    @field_validator("role")
    @classmethod
    def val_role(cls, v: str) -> str:
        if v not in _ALLOWED_MSG_ROLES:
            raise ValueError(f"role must be one of: {', '.join(_ALLOWED_MSG_ROLES)}")
        return v

    @field_validator("agent_type")
    @classmethod
    def val_agent_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _ALLOWED_AGENT_TYPES:
            raise ValueError("agent_type must be interviewer/diagnostician/critic/safety")
        return v

    @field_validator("content")
    @classmethod
    def val_content(cls, v: str) -> str:
        _check_injection(v, "content")
        return v


class PatientInput(BaseModel):
    name: str        = Field(min_length=1, max_length=100)
    dob: str         = Field(default="", max_length=20)
    gender: str      = Field(default="", max_length=30)
    blood_type: str  = Field(default="", max_length=10)
    allergies: str   = Field(default="", max_length=500)
    medications: str = Field(default="", max_length=500)
    conditions: str  = Field(default="", max_length=500)
    notes: str       = Field(default="", max_length=1000)

    @field_validator("name")
    @classmethod
    def val_name(cls, v: str) -> str:
        v = v.strip()
        _check_injection(v, "name")
        return v

    @field_validator("gender")
    @classmethod
    def val_gender(cls, v: str) -> str:
        if v.lower() not in _ALLOWED_GENDERS:
            raise ValueError(f"gender must be one of: {', '.join(g for g in _ALLOWED_GENDERS if g)}")
        return v

    @field_validator("blood_type")
    @classmethod
    def val_blood_type(cls, v: str) -> str:
        if v.lower() not in _ALLOWED_BLOOD_TYPES:
            raise ValueError(f"Invalid blood type: {v}")
        return v

    @field_validator("allergies", "medications", "conditions", "notes")
    @classmethod
    def val_free_text(cls, v: str) -> str:
        _check_injection(v, "patient field")
        return v.strip()


class EvalRequest(BaseModel):
    question_id: str = Field(min_length=1, max_length=50)
    mode: str = "both"

    @field_validator("mode")
    @classmethod
    def val_mode(cls, v: str) -> str:
        if v not in _ALLOWED_EVAL_MODES:
            raise ValueError(f"mode must be one of: {', '.join(_ALLOWED_EVAL_MODES)}")
        return v


class IngestRequest(BaseModel):
    terms: list[str] = Field(default=[], max_length=50)
    per_term: int    = Field(default=15, ge=1, le=100)

    @field_validator("terms")
    @classmethod
    def val_terms(cls, v: list[str]) -> list[str]:
        cleaned = []
        for t in v:
            t = t.strip()
            if len(t) > 200:
                raise ValueError("Each search term must be under 200 characters")
            _check_injection(t, "terms")
            cleaned.append(t)
        return cleaned

# ── Health ────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service":"MediChain API","version":"4.0.0","rag_db_size":get_collection_size(),"status":"ok"}

@app.get("/api/rag/status")
def rag_status():
    size = get_collection_size()
    return {"document_count":size,"status":"ready" if size>0 else "empty"}

@app.post("/api/rag/ingest")
async def rag_ingest(body: IngestRequest, user=Depends(require_user)):
    """
    Fetch fresh PubMed articles and write them into the RAG vector store.
    Provider role only.
    """
    if user.get("role") != "provider":
        raise HTTPException(403, "Only providers can trigger ingestion")
    import time as _time

    terms = body.terms if body.terms else DEFAULT_TERMS
    per_term = min(body.per_term, 50)  # cap per-term to avoid runaway fetches

    initial_size = get_collection_size()
    total_added = 0
    details = []

    for term in terms:
        pmids = fetch_pmids(term, per_term)
        if not pmids:
            details.append({"term": term, "found": 0, "added": 0})
            continue

        articles = fetch_article_details(pmids)
        if not articles:
            details.append({"term": term, "found": len(pmids), "added": 0})
            continue

        added = add_documents(articles)
        total_added += added
        details.append({
            "term": term,
            "found": len(pmids),
            "fetched": len(articles),
            "added": added,
            "skipped_duplicates": len(articles) - added,
        })
        _time.sleep(0.4)  # NCBI rate limit

    final_size = get_collection_size()
    return {
        "total_added": total_added,
        "initial_db_size": initial_size,
        "final_db_size": final_size,
        "terms_processed": len(terms),
        "details": details,
    }

# ── Auth Routes ───────────────────────────────────────────
@app.post("/api/auth/register")
def register(body: RegisterInput):
    """Register a new user account."""
    user = user_create(body.username, body.email, body.password, body.full_name, body.role)
    token = create_token(user["id"], user["username"])
    return {"token": token, "user": user}

@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 form login."""
    user = user_get_by_username(form.username)
    if not user or not verify_password(form.password, user["password"]):
        raise HTTPException(401, "Incorrect username or password")
    token = create_token(user["id"], user["username"])
    # Remove password from response
    user.pop("password", None)
    return {"access_token": token, "token_type": "bearer", "user": user}

@app.post("/api/auth/login/json")
def login_json(body: dict):
    """JSON body login — returns a JWT token."""
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
    """Return the currently authenticated user's profile."""
    return user

# ── Patient Routes ────────────────────────────────────────
@app.get("/api/patients")
def list_patients(user=Depends(require_user)):
    """List patients belonging to the current user."""
    return patients_list(user["id"])

@app.post("/api/patients")
def create_patient(body: PatientInput, user=Depends(require_user)):
    """Create a new patient record."""
    return patient_create(user["id"], body.model_dump())

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str, user=Depends(require_user)):
    """Fetch a patient record by ID."""
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
    """Update a patient record."""
    p = patient_get(patient_id)
    if not p: raise HTTPException(404, "Patient not found")
    if p["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    patient_update(patient_id, body.model_dump())
    return patient_get(patient_id)

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str, user=Depends(require_user)):
    """Delete a patient record."""
    p = patient_get(patient_id)
    if not p: raise HTTPException(404, "Patient not found")
    if p["user_id"] != user["id"]: raise HTTPException(403, "Forbidden")
    patient_delete(patient_id)
    return {"deleted": True}

@app.get("/api/patients/{patient_id}/sessions")
def patient_sessions(patient_id: str, user=Depends(require_user)):
    """List all sessions for a given patient."""
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
async def analyze_file(
    file: UploadFile = File(...),
    lang: str = Query(default="en-US"),
    user=Depends(get_current_user),
):
    """Analyse a file and return the result without persisting to any session."""
    import tempfile

    original_name = _safe_filename(file.filename or "upload")
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            400,
            "Unsupported file type. Supported: PDF, TXT, DICOM, images, audio, video.",
        )
    file_type = ALLOWED_UPLOAD_TYPES[ext]
    payload = await file.read()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)

    annotations = []
    try:
        if file_type == "txt":
            analysis = _extract_text_from_txt(tmp_path)
        elif file_type == "pdf":
            analysis = _extract_text_from_pdf(tmp_path)
        elif file_type == "image":
            result = _analyze_medical_image(tmp_path)
            analysis = result["analysis"]
            annotations = result["annotations"]
        elif file_type == "dicom":
            result = _analyze_dicom(tmp_path)
            analysis = result["analysis"]
            annotations = result["annotations"]
        elif file_type == "audio":
            analysis = _transcribe_audio(tmp_path, language=lang)
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
        "file_type": file_type if file_type != "dicom" else "image",
        "analysis": analysis,
        "analysis_preview": analysis[:400],
        "annotations": annotations,
    }


@app.post("/api/analyze/compare")
async def analyze_compare(
    files: List[UploadFile] = File(...),
    user=Depends(get_current_user),
):
    """Compare 2–6 medical images with Claude Vision."""
    import tempfile, base64
    import anthropic as _anthropic

    if len(files) < 2:
        raise HTTPException(400, "At least 2 images required for comparison.")
    if len(files) > 6:
        raise HTTPException(400, "Maximum 6 images for comparison.")

    content = []
    image_names = []

    for i, upload in enumerate(files):
        original_name = _safe_filename(upload.filename or f"image{i+1}")
        ext = Path(original_name).suffix.lower()
        raw = await upload.read()

        if ext == ".dcm":
            # DICOM → JPEG conversion
            with tempfile.NamedTemporaryFile(suffix=".dcm", delete=False) as tmp:
                tmp.write(raw)
                tmp_path = Path(tmp.name)
            try:
                result = _analyze_dicom(tmp_path)
                # Re-render pixel array to bytes for Vision
                import pydicom, io, numpy as np
                from PIL import Image as _PIL
                ds = pydicom.dcmread(str(tmp_path))
                arr = ds.pixel_array.astype(float)
                pmin, pmax = arr.min(), arr.max()
                if pmax > pmin:
                    arr = ((arr - pmin) / (pmax - pmin) * 255).astype("uint8")
                if arr.ndim == 3:
                    arr = arr[arr.shape[0] // 2]
                buf = io.BytesIO()
                _PIL.fromarray(arr).convert("RGB").save(buf, format="JPEG", quality=85)
                raw = buf.getvalue()
            finally:
                tmp_path.unlink(missing_ok=True)
            media_type = "image/jpeg"
        elif ext in IMAGE_MEDIA_TYPES:
            media_type = IMAGE_MEDIA_TYPES[ext]
        else:
            raise HTTPException(400, f"{original_name} is not a supported image type.")

        if len(raw) > _MAX_IMAGE_BYTES:
            raw, media_type = _compress_image_bytes(raw, ext)

        b64 = base64.standard_b64encode(raw).decode("utf-8")
        image_names.append(original_name)
        content.append({"type": "text", "text": f"**Image {i+1}: {original_name}**"})
        content.append({"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}})

    content.append({
        "type": "text",
        "text": (
            f"You are a medical imaging specialist. Compare these {len(files)} medical images:\n\n"
            "1. **Individual Assessment**: Brief findings for each image (1-2 sentences each)\n"
            "2. **Comparison**: Key similarities and differences\n"
            "3. **Progression/Change**: If same patient over time, describe any change\n"
            "4. **Clinical Interpretation**: Overall significance of the comparison\n\n"
            "Be systematic and objective."
        ),
    })

    _client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = _client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": content}],
    )

    return {
        "ok": True,
        "image_count": len(files),
        "image_names": image_names,
        "analysis": response.content[0].text,
    }


@app.post("/api/analyze/ocr")
async def analyze_ocr(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Extract structured medical information from a handwritten or printed medical record image."""
    import tempfile, base64
    import anthropic as _anthropic

    original_name = _safe_filename(file.filename or "upload")
    ext = Path(original_name).suffix.lower()
    if ext not in IMAGE_MEDIA_TYPES and ext != ".dcm":
        raise HTTPException(400, "OCR requires an image file (JPG, PNG, etc.) or DICOM.")

    payload = await file.read()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)

    try:
        if ext == ".dcm":
            import pydicom, io, numpy as np
            from PIL import Image as _PIL
            ds = pydicom.dcmread(str(tmp_path))
            arr = ds.pixel_array.astype(float)
            pmin, pmax = arr.min(), arr.max()
            if pmax > pmin:
                arr = ((arr - pmin) / (pmax - pmin) * 255).astype("uint8")
            if arr.ndim == 3:
                arr = arr[arr.shape[0] // 2]
            buf = io.BytesIO()
            _PIL.fromarray(arr).convert("RGB").save(buf, format="JPEG", quality=85)
            raw = buf.getvalue()
            media_type = "image/jpeg"
        else:
            raw = payload
            media_type = IMAGE_MEDIA_TYPES.get(ext, "image/jpeg")

        if len(raw) > _MAX_IMAGE_BYTES:
            raw, media_type = _compress_image_bytes(raw, ext)

        b64 = base64.standard_b64encode(raw).decode("utf-8")
        _client = _anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = _client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                    {"type": "text", "text": (
                        "You are a medical scribe specialist. This image contains a medical record, "
                        "clinical note, prescription, or handwritten patient notes.\n\n"
                        "Extract ALL readable text and organize it into structured fields:\n\n"
                        "**Patient Information** (name, DOB, gender, ID if visible)\n"
                        "**Chief Complaint / Presenting Symptoms**\n"
                        "**Medical History** (past illnesses, surgeries, family history)\n"
                        "**Current Medications** (drug name, dose, frequency)\n"
                        "**Allergies**\n"
                        "**Physical Examination Findings** (vitals, examination notes)\n"
                        "**Investigations / Test Results** (lab values, imaging reports)\n"
                        "**Assessment / Diagnosis**\n"
                        "**Treatment Plan / Prescriptions**\n"
                        "**Follow-up Instructions**\n\n"
                        "For any section not visible or not applicable, write 'Not documented'.\n"
                        "Preserve original medical terminology. Flag any illegible text with [illegible].\n"
                        "If this is not a medical document, describe what you see."
                    )},
                ],
            }],
        )
        text = response.content[0].text
    except Exception as e:
        raise HTTPException(400, f"OCR failed: {e}")
    finally:
        tmp_path.unlink(missing_ok=True)

    return {
        "ok": True,
        "file_name": original_name,
        "ocr_text": text,
        "ocr_preview": text[:400],
    }


# ── Session Routes ────────────────────────────────────────
@app.post("/api/session/start")
def start_session(symptoms: SymptomInput, user=Depends(get_current_user)):
    uid = user["id"] if user else None
    severity_level = severity_to_level(symptoms.severity)
    severity_score = severity_to_score(severity_level)

    existing_sid = _maybe_reuse_recent_session(symptoms, uid, severity_level)
    if existing_sid:
        existing = session_get(existing_sid)
        existing_reply = ""
        for m in (existing.get("messages") or []):
            if m.get("role") == "ai" and m.get("agent") == "interviewer":
                existing_reply = m.get("text") or ""
                break
        return {
            "session_id": existing_sid,
            "reply": existing_reply,
            "status": "interviewing",
            "safety": _extract_latest_safety_payload(existing_sid),
        }

    sid = str(uuid.uuid4())
    payload = symptoms.model_dump()
    payload["severity"] = severity_score
    payload["severity_level"] = severity_level
    pre_ctx_block = ""
    if symptoms.pre_context:
        ctx_items = [c.strip() for c in symptoms.pre_context if c.strip()]
        if ctx_items:
            pre_ctx_block = (
                "\n\n<uploaded_documents>\n"
                + "\n---\n".join(f"<document>{c}</document>" for c in ctx_items)
                + "\n</uploaded_documents>"
            )
    case = (
        f"Patient presents with:\n- Chief complaint: {symptoms.description}\n"
        f"- Body area: {symptoms.bodyPart}\n- Duration: {symptoms.duration}\n"
        f"- Severity: {severity_level}\n- History: {symptoms.notes or 'None'}"
        f"{pre_ctx_block}\n\nBegin empathetic interview."
    )
    history = [{"role":"user","content":case}]
    reply = call_interviewer(history)
    reply, _qr_start = _extract_quick_replies(reply)
    history.append({"role":"assistant","content":reply})
    messages = [{"role":"ai","agent":"interviewer","text":reply}]
    now = _now()
    with get_db() as c:
        c.execute("""INSERT INTO sessions(id,user_id,patient_id,symptoms,messages,history,turns,status,severity_level,consent_to_provider_review,created_at,updated_at)
            VALUES(?,?,?,?,?,?,0,'interviewing',?,?,?,?)""",
            (sid, uid, symptoms.patient_id,
             json.dumps(payload), json.dumps(messages), json.dumps(history), severity_level,
             1 if symptoms.consent_to_provider_review else 0, now, now))
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
        "quick_replies": _qr_start,
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

    # Hard-stop the interview so a reluctant model cannot keep asking questions
    # indefinitely; the diagnosis phase should receive the best available case.
    MAX_TURNS = 12
    reply = call_interviewer(normalize_history_for_interviewer(history))
    ready = "[READY_FOR_DIAGNOSIS]" in reply
    clean = reply.replace("[READY_FOR_DIAGNOSIS]","").strip()

    clean, quick_replies = _extract_quick_replies(clean)

    # When the cap is reached, close the intake politely even if the model did
    # not emit READY_FOR_DIAGNOSIS. This keeps the UX deterministic.
    force_trigger = turns >= MAX_TURNS
    if force_trigger and not ready:
        clean = clean + "\n\nThank you for sharing all of that. I now have enough information to proceed with a thorough analysis."

    history.append({"role":"assistant","content":clean})
    messages.append({"role":"ai","agent":"interviewer","text":clean})
    session_message_create(body.session_id, role="agent", content=clean, agent_type="interviewer", user_id=user["id"] if user else None)
    trigger = ready or force_trigger
    session_update(body.session_id,history=history,messages=messages,
        turns=turns,status="analyzing" if trigger else "interviewing")

    symptoms_ctx = ""
    try:
        s_payload = sess.get("symptoms") or {}
        symptoms_ctx = s_payload.get("description", "") if isinstance(s_payload, dict) else ""
    except Exception:
        pass
    agent_commentary = {}
    if not trigger:
        try:
            agent_commentary = call_agent_commentary(
                user_message=body.user_message,
                interviewer_reply=clean,
                symptoms_context=symptoms_ctx,
            )
        except Exception:
            agent_commentary = {}

    return {
        "reply":clean,
        "quick_replies": quick_replies,
        "status":"analyzing" if trigger else "interviewing",
        "trigger_diagnose":trigger,
        "agent_commentary": agent_commentary,
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

    # Image reports are treated as clinical context for RAG, not as chat turns,
    # so the diagnostician can cite text evidence while still seeing imaging data.
    image_analyses = []
    lines = []
    for m in sess["messages"]:
        role = m["role"]
        text = m.get("text", "")
        if role == "system" and text.startswith("Uploaded file:") and "image" in text.lower():
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
            "\n<uploaded_documents>\n"
            + "\n---\n".join(f"<document>{a}</document>" for a in image_analyses)
            + "\n</uploaded_documents>\n"
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

    # Visual findings often use descriptive language; rewriting them into medical
    # terms improves retrieval without letting uploaded text control instructions.
    image_medical_terms = rewrite_image_findings_for_rag(image_analyses) if image_analyses else ""
    rag_query = f"{s['description']} {s['bodyPart']} {s['duration']} {image_medical_terms}".strip()

    # Extended thinking improves difficult differentials, but it is provider/model
    # dependent. The standard path preserves diagnosis availability if CoT fails.
    try:
        diagnosis, diag_cot, refs = call_diagnostician_cot(case_text, rag_query)
        review, critic_cot = call_critic_cot(case_text, diagnosis)
        cot = {"diagnostician": diag_cot, "critic": critic_cot}
    except Exception:
        diagnosis, refs = call_diagnostician(case_text, rag_query)
        review = call_critic(case_text, diagnosis)
        cot = None

    session_message_create(body.session_id, role="agent", content=diagnosis, agent_type="diagnostician", user_id=user["id"] if user else None)
    session_message_create(body.session_id, role="agent", content=review, agent_type="critic", user_id=user["id"] if user else None)

    # Roundtable logs are explanatory UI evidence only; diagnosis persistence
    # should not fail if this secondary commentary cannot be generated.
    agent_logs = []
    try:
        agent_logs = call_diagnostic_roundtable(case_text, diagnosis, review)
    except Exception:
        agent_logs = []

    session_update(body.session_id, diagnosis=diagnosis, review=review, refs=refs, status="done",
                   cot=json.dumps(cot) if cot else None)
    return {"status": "done", "diagnosis": diagnosis, "review": review, "refs": refs, "cot": cot, "agent_logs": agent_logs}

# ── SSE helpers ───────────────────────────────────────────
def _sse(type_: str, **kwargs) -> dict:
    """Format a single SSE data frame."""
    return {"data": json.dumps({"type": type_, **kwargs}, ensure_ascii=False)}


_QR_RE = re.compile(r"QUICK_REPLIES\s*:\s*(.+?)(?:\n|$)", re.IGNORECASE)

def _extract_quick_replies(text: str) -> tuple[str, list[str]]:
    """Strip QUICK_REPLIES: ... from reply text and return (clean_text, chips)."""
    m = _QR_RE.search(text)
    if not m:
        return text.strip(), []
    chips = [c.strip() for c in m.group(1).split("|") if c.strip()]
    clean = _QR_RE.sub("", text).strip()
    return clean, chips


# ── /api/session/chat/stream ──────────────────────────────
async def _chat_stream_gen(body: "ChatMessage", user):
    """
    SSE generator for the chat endpoint.
    Events emitted (in order):
      safety_result → interviewer_reply → agent_message × 2 → done
    If trigger_diagnose the frontend should call /api/session/diagnose/stream next.
    """
    try:
        sess = await asyncio.to_thread(session_get, body.session_id)
        if not sess:
            yield _sse("error", message="Session not found"); return
        if sess["status"] != "interviewing":
            yield _sse("error", message=f"Status: {sess['status']}"); return
        if sess.get("user_id") and (not user or sess["user_id"] != user["id"]):
            yield _sse("error", message="Forbidden"); return

        uid = user["id"] if user else None
        history = sess["history"]
        messages = sess["messages"]
        turns = sess["turns"] + 1

        # Attachments
        for att in (body.attachments or []):
            att_text = (att or "").strip()
            if not att_text: continue
            history.append({"role": "user", "content": f"[ATTACHMENT] {att_text}"})
            messages.append({"role": "user", "text": f"📎 {att_text}"})
            await asyncio.to_thread(
                session_message_create, body.session_id, "user", f"📎 {att_text}", None, uid
            )

        history.append({"role": "user", "content": body.user_message})
        messages.append({"role": "user", "text": body.user_message})
        await asyncio.to_thread(
            session_message_create, body.session_id, "user", body.user_message, None, uid
        )

        # Safety check
        safety = await asyncio.to_thread(classify_safety, body.user_message)
        safety_content = json.dumps({
            "final_risk": safety.get("final_risk", safety.get("risk_level", "low")),
            "rule_risk": safety.get("rule_risk", "low"),
            "llm_risk": safety.get("llm_risk", "low"),
            "message": safety.get("message", ""),
            "warning": safety.get("warning", ""),
        }, ensure_ascii=False)
        await asyncio.to_thread(
            session_message_create, body.session_id, "agent", safety_content, "safety", uid
        )
        yield _sse("safety_result",
                   final_risk=safety.get("final_risk", safety.get("risk_level", "low")),
                   message=safety.get("message", ""),
                   warning=safety.get("warning", ""),
                   rule_risk=safety.get("rule_risk", "low"),
                   llm_risk=safety.get("llm_risk", "low"))

        # Interviewer
        MAX_TURNS = 12
        reply = await call_interviewer_async(normalize_history_for_interviewer(history))
        ready = "[READY_FOR_DIAGNOSIS]" in reply
        clean = reply.replace("[READY_FOR_DIAGNOSIS]", "").strip()

        clean, quick_replies = _extract_quick_replies(clean)
        force_trigger = turns >= MAX_TURNS
        if force_trigger and not ready:
            clean = clean + "\n\nThank you for sharing all of that. I now have enough information to proceed with a thorough analysis."
        trigger = ready or force_trigger

        history.append({"role": "assistant", "content": clean})
        messages.append({"role": "ai", "agent": "interviewer", "text": clean})
        await asyncio.to_thread(
            session_message_create, body.session_id, "agent", clean, "interviewer", uid
        )
        await asyncio.to_thread(
            session_update, body.session_id,
            history=history, messages=messages,
            turns=turns, status="analyzing" if trigger else "interviewing"
        )

        yield _sse("interviewer_reply", text=clean, trigger=trigger, quick_replies=quick_replies)

        # Inter-agent commentary (only when NOT triggering diagnosis)
        if not trigger:
            symptoms_ctx = ""
            try:
                s_pay = sess.get("symptoms") or {}
                symptoms_ctx = s_pay.get("description", "") if isinstance(s_pay, dict) else ""
            except Exception:
                pass

            commentary = await call_agent_commentary_async(body.user_message, clean, symptoms_ctx)

            if commentary.get("safety_to_interviewer"):
                await asyncio.sleep(0.2)
                yield _sse("agent_message",
                           from_agent="safety", to_agent="interviewer",
                           text=commentary["safety_to_interviewer"], phase="intake")

            if commentary.get("interviewer_to_safety"):
                await asyncio.sleep(0.35)
                yield _sse("agent_message",
                           from_agent="interviewer", to_agent="safety",
                           text=commentary["interviewer_to_safety"], phase="intake")

        yield _sse("done")

    except Exception as exc:
        yield _sse("error", message=str(exc))


@app.post("/api/session/chat/stream")
async def chat_stream(body: ChatMessage, user=Depends(get_current_user)):
    """SSE streaming version of /api/session/chat"""
    return EventSourceResponse(_chat_stream_gen(body, user))


# ── /api/session/diagnose/stream ──────────────────────────
async def _diagnose_stream_gen(body: "DiagnoseRequest", user):
    """
    SSE generator for the diagnose endpoint.
    Events: phase_sep → agent_message (diagnostician) → agent_message (critic)
            → agent_message × 3 (roundtable) → diagnosis_ready → done
    """
    try:
        sess = await asyncio.to_thread(session_get, body.session_id)
        if not sess:
            yield _sse("error", message="Session not found"); return
        if sess.get("user_id") and (not user or sess["user_id"] != user["id"]):
            yield _sse("error", message="Forbidden"); return

        uid = user["id"] if user else None
        s = sess["symptoms"]

        # Build case_text (same logic as sync endpoint)
        image_analyses, lines = [], []
        for m in sess["messages"]:
            role = m["role"]; text = m.get("text", "")
            if role == "system" and text.startswith("Uploaded file:") and "image" in text.lower():
                image_analyses.append(text.split("\n\n", 1)[1] if "\n\n" in text else text)
            elif role == "user":   lines.append(f"PATIENT: {text}")
            elif role == "system": lines.append(f"CONTEXT: {text}")
            else:                  lines.append(f"INTERVIEWER: {text}")

        image_section = ""
        if image_analyses:
            image_section = (
                f"\nMEDICAL IMAGE ANALYSIS\n{'='*40}\n"
                + "\n\n---\n\n".join(image_analyses) + "\n"
            )
        case_text = (
            f"PATIENT CASE\n{'='*40}\n"
            f"Chief complaint: {s['description']}\n"
            f"Body area: {s['bodyPart']}\nDuration: {s['duration']}\n"
            f"Severity: {s.get('severity_level', severity_to_level(s.get('severity')))}\n"
            f"History: {s['notes'] or 'None'}\n"
            f"{image_section}"
            f"\nTRANSCRIPT\n{'='*40}\n" + "\n\n".join(lines)
        )

        from agents import rewrite_image_findings_for_rag as _rw
        image_medical_terms = await asyncio.to_thread(_rw, image_analyses) if image_analyses else ""
        rag_query = f"{s['description']} {s['bodyPart']} {s['duration']} {image_medical_terms}".strip()

        # ── IMAGING ANALYSIS phase — only runs when the session has uploaded images ──
        if image_analyses:
            yield _sse("phase_sep", label="IMAGING ANALYSIS")
            await asyncio.sleep(0.15)
            yield _sse("agent_message",
                       from_agent="imaging", to_agent=None,
                       text=f"Reviewing {len(image_analyses)} uploaded medical image(s). Extracting clinical findings…",
                       phase="imaging")
            for idx, analysis in enumerate(image_analyses, 1):
                # pull the Key Findings block if present, otherwise fall back to first 200 chars
                import re as _re
                findings_match = _re.search(
                    r"\*\*Key Findings\*\*[:\s]*(.*?)(?=\n\*\*|\Z)", analysis, _re.DOTALL
                )
                if findings_match:
                    excerpt = findings_match.group(1).strip()[:300]
                else:
                    excerpt = analysis[:200].strip()
                if len(image_analyses) > 1:
                    label = f"Image {idx} — {excerpt}"
                else:
                    label = excerpt
                await asyncio.sleep(0.2)
                yield _sse("agent_message",
                           from_agent="imaging", to_agent=None,
                           text=label + ("…" if len(excerpt) >= 200 else ""),
                           phase="imaging")
            await asyncio.sleep(0.25)
            yield _sse("agent_message",
                       from_agent="imaging", to_agent="diagnostician",
                       text=f"Imaging analysis complete. Key medical terms forwarded for RAG retrieval: {image_medical_terms or 'N/A'}",
                       phase="imaging")

        # ── DIAGNOSTIC ANALYSIS phase ──
        yield _sse("phase_sep", label="DIAGNOSTIC ANALYSIS")
        await asyncio.sleep(0.15)
        yield _sse("agent_message",
                   from_agent="diagnostician", to_agent=None,
                   text="Case received. Querying medical knowledge base (MedQuAD + PubMed, hybrid dense + BM25 search)…",
                   phase="diagnosis")

        try:
            diagnosis, diag_thinking, refs = await call_diagnostician_cot_async(case_text, rag_query)
            review, critic_thinking = await call_critic_cot_async(case_text, diagnosis)
            cot = {"diagnostician": diag_thinking, "critic": critic_thinking}
        except Exception:
            diagnosis, refs = await call_diagnostician_async(case_text, rag_query)
            review = await call_critic_async(case_text, diagnosis)
            cot = None

        if refs:
            await asyncio.sleep(0.25)
            yield _sse("agent_message",
                       from_agent="diagnostician", to_agent=None,
                       text=f"Retrieved {len(refs)} supporting references from knowledge base.",
                       phase="diagnosis")

        await asyncio.sleep(0.3)
        yield _sse("agent_message",
                   from_agent="diagnostician", to_agent="critic",
                   text=diagnosis, phase="diagnosis")

        # ── PEER REVIEW phase ──
        await asyncio.sleep(0.4)
        yield _sse("phase_sep", label="PEER REVIEW")
        await asyncio.sleep(0.2)
        yield _sse("agent_message",
                   from_agent="critic", to_agent=None,
                   text="Peer review initiated. Evaluating differential for clinical soundness and completeness…",
                   phase="review")

        await asyncio.sleep(0.35)
        yield _sse("agent_message",
                   from_agent="critic", to_agent="diagnostician",
                   text=review, phase="review")

        # Roundtable debate
        roundtable = await call_diagnostic_roundtable_async(case_text, diagnosis, review)
        for entry in roundtable:
            await asyncio.sleep(0.35)
            yield _sse("agent_message",
                       from_agent=entry["from_agent"],
                       to_agent=entry["to_agent"],
                       text=entry["text"], phase="review")

        # Final safety clearance
        await asyncio.sleep(0.25)
        yield _sse("agent_message",
                   from_agent="safety", to_agent=None,
                   text="Final safety sweep complete. No escalation pathway required at this stage.",
                   phase="review")

        # Persist to DB
        await asyncio.to_thread(
            session_message_create, body.session_id, "agent", diagnosis, "diagnostician", uid
        )
        await asyncio.to_thread(
            session_message_create, body.session_id, "agent", review, "critic", uid
        )
        await asyncio.to_thread(
            session_update, body.session_id,
            diagnosis=diagnosis, review=review, refs=refs, status="done",
            cot=json.dumps(cot) if cot else None
        )

        yield _sse("diagnosis_ready",
                   diagnosis=diagnosis, review=review,
                   refs=refs, cot=cot)
        yield _sse("done")

    except Exception as exc:
        yield _sse("error", message=str(exc))


@app.post("/api/session/diagnose/stream")
async def diagnose_stream(body: DiagnoseRequest, user=Depends(get_current_user)):
    """SSE streaming version of /api/session/diagnose"""
    return EventSourceResponse(_diagnose_stream_gen(body, user))


# ── (existing non-stream endpoints continue below) ────────

@app.get("/api/session/{session_id}")
def get_session(session_id: str, user=Depends(get_current_user)):
    sess = session_get(session_id)
    if not sess: raise HTTPException(404,"Session not found")
    if sess.get("user_id") and (not user or (not _is_provider(user) and sess["user_id"] != user["id"])):
        raise HTTPException(403, "Forbidden")
    return sess

@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, user=Depends(get_current_user)):
    """
    Delete a session and all associated data (messages, uploads).
    Users may only delete their own sessions; providers may delete any.
    """
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    uid = user["id"] if user else None
    if not _is_provider(user) and sess.get("user_id") and sess["user_id"] != uid:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Delete physical upload files from disk
    with get_db() as c:
        rows = c.execute(
            "SELECT file_path FROM uploads WHERE session_id=?", (session_id,)
        ).fetchall()
    for row in rows:
        try:
            Path(row["file_path"]).unlink(missing_ok=True)
        except Exception:
            pass

    # Delete session row — messages and uploads cascade via FK
    with get_db() as c:
        c.execute("PRAGMA foreign_keys = ON")
        c.execute("DELETE FROM sessions WHERE id=?", (session_id,))
        c.commit()


class VerdictInput(BaseModel):
    verdict: str  # 'approved' | 'flagged'
    note: str = ""


@app.patch("/api/sessions/{session_id}/verdict", status_code=200)
def set_session_verdict(session_id: str, body: VerdictInput, user=Depends(require_user)):
    """Provider submits approve/flag verdict with optional revision note."""
    if body.verdict not in ("approved", "flagged"):
        raise HTTPException(status_code=400, detail="verdict must be 'approved' or 'flagged'")
    if not _is_provider(user):
        raise HTTPException(status_code=403, detail="Provider role required")
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    with get_db() as c:
        c.execute(
            "UPDATE sessions SET provider_verdict=?, provider_note=?, updated_at=? WHERE id=?",
            (body.verdict, body.note.strip(), _now(), session_id),
        )
        c.commit()
    return {"session_id": session_id, "verdict": body.verdict, "note": body.note.strip()}


@app.get("/api/sessions")
def list_sessions(
    status: Optional[str] = Query(default=None),
    severity_level: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    from_date: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = Query(default=None),
    limit: int = Query(default=50),
    offset: int = Query(default=0),
    user=Depends(require_user),
):
    if _is_provider(user):
        return sessions_list(
            status=status,
            severity_level=severity_level,
            q=q,
            date_from=from_date,
            date_to=to,
            limit=limit,
            offset=offset,
        )
    return sessions_list(
        user["id"],
        status=status,
        severity_level=severity_level,
        q=q,
        date_from=from_date,
        date_to=to,
        limit=limit,
        offset=offset,
    )


@app.get("/api/provider/sessions")
def provider_sessions(
    status: Optional[str] = Query(default=None),
    severity_level: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    from_date: Optional[str] = Query(default=None, alias="from"),
    to: Optional[str] = Query(default=None),
    limit: int = Query(default=50),
    offset: int = Query(default=0),
    user=Depends(require_user),
):
    if not _is_provider(user):
        raise HTTPException(403, "Provider access required")
    return provider_sessions_list(
        status=status,
        severity_level=severity_level,
        q=q,
        date_from=from_date,
        date_to=to,
        limit=limit,
        offset=offset,
    )


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
            result = _analyze_medical_image(stored_path)
            extracted_text = result["analysis"]
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

# ── Mistral Peer Review ────────────────────────────────────
@app.get("/api/session/{session_id}/peer-review")
def session_peer_review(session_id: str, user=Depends(get_current_user)):
    """
    Get an independent second opinion from Mistral on the Claude diagnosis.
    Result is cached in sessions.mistral_peer_review so we don't charge twice.
    """
    sess = session_get(session_id)
    if not sess:
        raise HTTPException(404, "Session not found")
    # Only enforce ownership when both session and requester have a user_id
    if user and sess.get("user_id") and sess["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if not sess.get("diagnosis"):
        raise HTTPException(400, "No diagnosis available for this session yet")

    # Return cached result if already evaluated
    if sess.get("mistral_peer_review"):
        try:
            return json.loads(sess["mistral_peer_review"])
        except Exception:
            pass

    # Build symptoms summary — sess["symptoms"] is already a parsed dict
    sym = sess.get("symptoms") or {}
    if isinstance(sym, str):
        try: sym = json.loads(sym)
        except Exception: sym = {}
    symptoms_parts = []
    if sym.get("description"):    symptoms_parts.append(f"Chief complaint: {sym['description']}")
    if sym.get("body_part"):      symptoms_parts.append(f"Location: {sym['body_part']}")
    if sym.get("duration"):       symptoms_parts.append(f"Duration: {sym['duration']}")
    if sess.get("severity_level"):symptoms_parts.append(f"Severity: {sess['severity_level']}")
    symptoms_text = "\n".join(symptoms_parts) or "No symptom details available"

    review_result = run_mistral_diagnosis_review(
        symptoms_text=symptoms_text,
        diagnosis_text=sess["diagnosis"],
        review_text=sess.get("review") or "",
    )

    # Cache in DB
    with get_db() as c:
        c.execute("UPDATE sessions SET mistral_peer_review=? WHERE id=?",
                  (json.dumps(review_result), session_id))
        c.commit()

    return review_result

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
        # Mistral acts as an independent reviewer for the Claude multi-agent output
        mj = run_mistral_judge(
            question=q["question"],
            options=q["options"],
            claude_answer=m["answer"],
            claude_reasoning=m["reasoning"],
            correct_answer=q["correct"],
        )
        result["mistral_judge"] = mj
    eid = str(uuid.uuid4())
    mj = result.get("mistral_judge", {})
    with get_db() as c:
        c.execute("""INSERT INTO eval_runs(id,question_id,single_answer,single_reasoning,
            multi_answer,multi_reasoning,multi_pipeline,correct_answer,category,
            single_correct,multi_correct,mistral_verdict,mistral_reasoning,mistral_correct,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (eid, body.question_id,
             result.get("single",{}).get("answer",""), result.get("single",{}).get("reasoning",""),
             result.get("multi",{}).get("answer",""),  result.get("multi",{}).get("reasoning",""),
             json.dumps(result.get("multi",{}).get("pipeline",{})),
             q["correct"], q["category"],
             1 if result.get("single_correct") else 0,
             1 if result.get("multi_correct")  else 0,
             mj.get("verdict",""), mj.get("assessment",""),
             1 if mj.get("correct") else 0,
             _now()))
        c.commit()
    return result

@app.get("/api/eval/history")
def eval_history():
    with get_db() as c:
        rows = c.execute("""SELECT question_id,single_answer,multi_answer,correct_answer,
            category,single_correct,multi_correct,mistral_verdict,mistral_reasoning,mistral_correct,created_at
            FROM eval_runs ORDER BY created_at DESC LIMIT 50""").fetchall()
    records = [dict(r) for r in rows]
    if records:
        total=len(records); s_total=sum(1 for r in records if r["single_answer"]); m_total=sum(1 for r in records if r["multi_answer"])
        s_correct=sum(r["single_correct"] or 0 for r in records); m_correct=sum(r["multi_correct"] or 0 for r in records)
        mj_total=sum(1 for r in records if r.get("mistral_verdict") and r["mistral_verdict"] not in ("","UNAVAILABLE","ERROR"))
        mj_agree=sum(1 for r in records if r.get("mistral_correct"))
        cats={}
        for r in records:
            cat=r["category"]
            if cat not in cats: cats[cat]={"single":0,"single_c":0,"multi":0,"multi_c":0}
            if r["single_answer"]: cats[cat]["single"]+=1; cats[cat]["single_c"]+=r["single_correct"] or 0
            if r["multi_answer"]:  cats[cat]["multi"]+=1;  cats[cat]["multi_c"]+=r["multi_correct"] or 0
        stats={"total":total,"single_accuracy":round(s_correct/s_total*100,1) if s_total else 0,
               "multi_accuracy":round(m_correct/m_total*100,1) if m_total else 0,
               "mistral_agreement":round(mj_agree/mj_total*100,1) if mj_total else None,
               "improvement":round((m_correct-s_correct)/s_total*100,1) if s_total else 0,"by_category":cats}
    else:
        stats={"total":0,"single_accuracy":0,"multi_accuracy":0,"improvement":0,"by_category":{}}
    return {"records":records,"stats":stats}