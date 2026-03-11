"""
auth.py — MediChain 用户认证模块
JWT Token + 密码哈希
"""
import os
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY  = os.environ.get("SECRET_KEY", "medichain-secret-key-change-in-production")
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

DB_FILE = Path(__file__).parent / "medichain.db"

def get_db():
    c = sqlite3.connect(str(DB_FILE))
    c.row_factory = sqlite3.Row
    return c

def init_auth_db():
    with get_db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            username    TEXT UNIQUE NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            full_name   TEXT,
            role        TEXT NOT NULL DEFAULT 'patient',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS patients (
            id          TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL,
            name        TEXT NOT NULL,
            dob         TEXT,
            gender      TEXT,
            blood_type  TEXT,
            allergies   TEXT,
            medications TEXT,
            conditions  TEXT,
            notes       TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""")
        c.commit()

# ── Password ──────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password[:72].encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain[:72].encode(), hashed.encode())

# ── Token ─────────────────────────────────────────────────
def create_token(user_id: str, username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "username": username, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM
    )

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

# ── User DB ───────────────────────────────────────────────
def _now(): return datetime.utcnow().isoformat()

def user_create(username: str, email: str, password: str, full_name: str = "") -> dict:
    uid = str(uuid.uuid4())
    now = _now()
    with get_db() as c:
        try:
            c.execute(
                "INSERT INTO users(id,username,email,password,full_name,role,created_at,updated_at) VALUES(?,?,?,?,?,'patient',?,?)",
                (uid, username.lower().strip(), email.lower().strip(),
                 hash_password(password), full_name, now, now)
            )
            c.commit()
        except sqlite3.IntegrityError as e:
            if "username" in str(e):
                raise HTTPException(400, "Username already taken")
            if "email" in str(e):
                raise HTTPException(400, "Email already registered")
            raise HTTPException(400, str(e))
    return user_get_by_id(uid)

def user_get_by_id(uid: str) -> Optional[dict]:
    with get_db() as c:
        row = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return _user_safe(row)

def user_get_by_username(username: str) -> Optional[dict]:
    with get_db() as c:
        row = c.execute("SELECT * FROM users WHERE username=?", (username.lower(),)).fetchone()
    if not row: return None
    return dict(row)  # includes password for verification

def _user_safe(row) -> Optional[dict]:
    if not row: return None
    d = dict(row)
    d.pop("password", None)
    return d

# ── Patient DB ────────────────────────────────────────────
def patient_create(user_id: str, data: dict) -> dict:
    pid = str(uuid.uuid4())
    now = _now()
    with get_db() as c:
        c.execute("""INSERT INTO patients(id,user_id,name,dob,gender,blood_type,
            allergies,medications,conditions,notes,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            (pid, user_id, data.get("name",""), data.get("dob",""),
             data.get("gender",""), data.get("blood_type",""),
             data.get("allergies",""), data.get("medications",""),
             data.get("conditions",""), data.get("notes",""), now, now))
        c.commit()
    return patient_get(pid)

def patient_get(pid: str) -> Optional[dict]:
    with get_db() as c:
        row = c.execute("SELECT * FROM patients WHERE id=?", (pid,)).fetchone()
    return dict(row) if row else None

def patient_update(pid: str, data: dict):
    fields = ["name","dob","gender","blood_type","allergies","medications","conditions","notes"]
    sets, vals = [], []
    for f in fields:
        if f in data:
            sets.append(f"{f}=?")
            vals.append(data[f])
    if not sets: return
    vals += [_now(), pid]
    with get_db() as c:
        c.execute(f"UPDATE patients SET {', '.join(sets)}, updated_at=? WHERE id=?", vals)
        c.commit()

def patient_delete(pid: str):
    with get_db() as c:
        c.execute("DELETE FROM patients WHERE id=?", (pid,))
        c.commit()

def patients_list(user_id: str) -> list:
    with get_db() as c:
        rows = c.execute(
            "SELECT * FROM patients WHERE user_id=? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]

# ── FastAPI Dependency ────────────────────────────────────
async def get_current_user(token: str = Depends(oauth2_scheme)) -> Optional[dict]:
    """Optional auth — returns None if no token"""
    if not token: return None
    payload = decode_token(token)
    if not payload: return None
    return user_get_by_id(payload.get("sub",""))

async def require_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Required auth — raises 401 if no valid token"""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user