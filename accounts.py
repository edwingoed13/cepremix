"""
Cuentas de usuario y biblioteca personal (playlists, favoritos, historial) por usuario.

- Base de datos: SQLite en `cepremix.db` (cambiar con CEPREMIX_DB). Viene con Python.
- Contraseñas: bcrypt. Sesiones: token aleatorio que viaja como `Authorization: Bearer`;
  en la base solo se guarda su SHA-256.
- Registro: abierto (pensado para la red de la oficina). Si se define REGISTRATION_CODE,
  hace falta ese código para crear cuenta.
- Biblioteca: un documento JSON por usuario con versión. El cliente sube el documento
  completo con la versión en la que se basó; si otro dispositivo guardó antes, responde
  409 con lo del servidor para que el cliente lo fusione y reintente.
"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from typing import Any, Dict, Optional

import bcrypt
from fastapi import APIRouter, Body, Request
from fastapi.responses import JSONResponse

DB_PATH = os.getenv("CEPREMIX_DB", "cepremix.db")
REGISTRATION_CODE = os.getenv("REGISTRATION_CODE", "").strip()
SESSION_TTL = 90 * 24 * 3600  # 90 días sin uso -> la sesión caduca
MAX_LIBRARY_BYTES = 2 * 1024 * 1024
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,24}$")

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _lock, _connect() as c:
        c.execute("PRAGMA journal_mode = WAL")
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id            TEXT PRIMARY KEY,
                username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
                display_name  TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at    REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at REAL NOT NULL,
                last_seen  REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS libraries (
                user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                data       TEXT NOT NULL,
                version    INTEGER NOT NULL,
                updated_at REAL NOT NULL
            );
            """
        )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _public(row: sqlite3.Row) -> Dict[str, Any]:
    return {"id": row["id"], "username": row["username"], "display_name": row["display_name"]}


def _new_session(c: sqlite3.Connection, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    c.execute(
        "INSERT INTO auth_sessions (token_hash, user_id, created_at, last_seen) VALUES (?, ?, ?, ?)",
        (_hash_token(token), user_id, now, now),
    )
    return token


def user_from_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    """Usuario dueño de un token de sesión válido (o None). Renueva last_seen."""
    if not token:
        return None
    th = _hash_token(token)
    now = time.time()
    with _lock, _connect() as c:
        row = c.execute(
            "SELECT u.*, s.last_seen FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?",
            (th,),
        ).fetchone()
        if not row:
            return None
        if now - row["last_seen"] > SESSION_TTL:
            c.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (th,))
            return None
        if now - row["last_seen"] > 3600:  # no escribir en cada petición
            c.execute("UPDATE auth_sessions SET last_seen = ? WHERE token_hash = ?", (now, th))
        return _public(row)


def _bearer(request: Request) -> Optional[str]:
    h = request.headers.get("authorization") or ""
    return h[7:].strip() if h.lower().startswith("bearer ") else None


def current_user(request: Request) -> Optional[Dict[str, Any]]:
    return user_from_token(_bearer(request))


def _unauthorized() -> JSONResponse:
    return JSONResponse({"error": "Inicia sesión para continuar"}, status_code=401)


router = APIRouter(prefix="/api")


@router.get("/auth/config")
def auth_config():
    return {"registration_code_required": bool(REGISTRATION_CODE)}


@router.post("/auth/register")
def register(
    username: str = Body(...),
    password: str = Body(...),
    display_name: str = Body(""),
    code: str = Body(""),
):
    username = username.strip()
    display_name = (display_name or "").strip()[:40] or username
    if REGISTRATION_CODE and not secrets.compare_digest(code.strip(), REGISTRATION_CODE):
        return JSONResponse({"error": "Código de registro incorrecto"}, status_code=403)
    if not USERNAME_RE.match(username):
        return JSONResponse(
            {"error": "Usuario: 3 a 24 caracteres (letras, números, punto, guion o guion bajo)"},
            status_code=400,
        )
    if len(password) < 6:
        return JSONResponse({"error": "La contraseña debe tener al menos 6 caracteres"}, status_code=400)
    pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_id = "a_" + secrets.token_hex(6)
    with _lock, _connect() as c:
        try:
            c.execute(
                "INSERT INTO users (id, username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, username, display_name, pw_hash, time.time()),
            )
        except sqlite3.IntegrityError:
            return JSONResponse({"error": "Ese usuario ya existe"}, status_code=409)
        token = _new_session(c, user_id)
    return {"token": token, "user": {"id": user_id, "username": username, "display_name": display_name}}


@router.post("/auth/login")
def login(username: str = Body(...), password: str = Body(...)):
    with _lock, _connect() as c:
        row = c.execute("SELECT * FROM users WHERE username = ?", (username.strip(),)).fetchone()
    ok = bool(row) and bcrypt.checkpw(password.encode("utf-8"), row["password_hash"].encode("utf-8"))
    if not ok:
        time.sleep(0.6)  # frena intentos por fuerza bruta (corre en un hilo del pool)
        return JSONResponse({"error": "Usuario o contraseña incorrectos"}, status_code=401)
    with _lock, _connect() as c:
        token = _new_session(c, row["id"])
    return {"token": token, "user": _public(row)}


@router.post("/auth/logout")
def logout(request: Request):
    token = _bearer(request)
    if token:
        with _lock, _connect() as c:
            c.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (_hash_token(token),))
    return {"ok": True}


@router.get("/auth/me")
def me(request: Request):
    user = current_user(request)
    return {"user": user} if user else _unauthorized()


EMPTY_LIBRARY = {"favorites": [], "history": [], "playlists": []}


def _read_library(c: sqlite3.Connection, user_id: str) -> Dict[str, Any]:
    row = c.execute("SELECT data, version FROM libraries WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        return {"data": EMPTY_LIBRARY, "version": 0}
    return {"data": json.loads(row["data"]), "version": row["version"]}


@router.get("/me/library")
def get_library(request: Request):
    user = current_user(request)
    if not user:
        return _unauthorized()
    with _lock, _connect() as c:
        return _read_library(c, user["id"])


@router.put("/me/library")
def put_library(request: Request, data: Dict[str, Any] = Body(...), base_version: int = Body(0)):
    user = current_user(request)
    if not user:
        return _unauthorized()
    clean = {k: data.get(k) if isinstance(data.get(k), list) else [] for k in EMPTY_LIBRARY}
    raw = json.dumps(clean, ensure_ascii=False)
    if len(raw.encode("utf-8")) > MAX_LIBRARY_BYTES:
        return JSONResponse({"error": "La biblioteca es demasiado grande"}, status_code=413)
    with _lock, _connect() as c:
        current = _read_library(c, user["id"])
        if base_version != current["version"]:
            # Otro dispositivo guardó antes: devolver lo del servidor para fusionar
            return JSONResponse({"error": "conflict", **current}, status_code=409)
        version = current["version"] + 1
        c.execute(
            "INSERT INTO libraries (user_id, data, version, updated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, version = excluded.version, "
            "updated_at = excluded.updated_at",
            (user["id"], raw, version, time.time()),
        )
    return {"version": version}
