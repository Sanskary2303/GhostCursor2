"""Ghost Cursor Cloud Orchestrator — FastAPI Application.

This is the hosted AI reasoning engine that processes user requests,
runs the Google ADK agent loop, and manages multi-turn run state.
"""

import hashlib
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import CreateRunRequest, ContinueRunRequest, RunResponse
from .run_manager import RunManager
from .storage.memory import MemoryRunStore
from .llm.provider import MockLLMProvider

load_dotenv()

logger = logging.getLogger("ghost_cursor")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MAX_BODY_BYTES = 64 * 1024  # 64 KiB
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 60  # requests per window

# Server-secret map: credential -> tenant_id
# In production, loaded from Secret Manager
TENANT_CREDENTIALS: dict[str, str] = {}
_raw = os.getenv("GHOST_TENANT_CREDENTIALS", "")
if _raw:
    for pair in _raw.split(","):
        if ":" in pair:
            cred, tid = pair.split(":", 1)
            TENANT_CREDENTIALS[cred.strip()] = tid.strip()

# Always include a dev key for local testing
DEV_KEY = os.getenv("GHOST_DEV_API_KEY", "dev-test-key-minimum-32-characters-long")
if DEV_KEY:
    TENANT_CREDENTIALS[DEV_KEY] = os.getenv("GHOST_DEV_TENANT_ID", "shophive_demo")

SUBJECT_PATTERN = re.compile(r"^[a-zA-Z0-9_.:@\-]+$")

# ---------------------------------------------------------------------------
# Instance-local rate limiter (not distributed)
# ---------------------------------------------------------------------------
_rate_buckets: dict[str, list[float]] = {}


def _check_rate_limit(key: str) -> bool:
    """Returns True if the request should be rate-limited."""
    now = time.time()
    bucket = _rate_buckets.setdefault(key, [])
    # Purge old entries
    bucket[:] = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]
    if len(bucket) >= RATE_LIMIT_MAX:
        return True
    bucket.append(now)
    return False


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize stores and providers on startup."""
    store = MemoryRunStore()
    from .llm.provider import get_llm_provider
    provider = get_llm_provider()
    app.state.run_manager = RunManager(store=store, provider=provider)
    logger.info(f"Ghost Cursor Orchestrator started (Store: MemoryStore, Provider: {provider.__class__.__name__})")
    yield
    logger.info("Ghost Cursor Orchestrator shutting down")


app = FastAPI(
    title="Ghost Cursor Cloud Orchestrator",
    version="0.1.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Enforce security headers, body limits, and Origin rejection."""
    # Reject browser-origin requests to the hosted API (defense in depth)
    if request.url.path.startswith("/v1/"):
        origin = request.headers.get("origin")
        if origin:
            return JSONResponse(
                status_code=403,
                content={"error": "Direct browser access is not permitted."},
                headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
            )

    # Body size limit
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse(
            status_code=413,
            content={"error": "Request body exceeds 64 KiB limit."},
        )

    response: Response = await call_next(request)

    # Security headers on all responses
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"

    return response


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def _authenticate(request: Request) -> str:
    """Extract and validate tenant from Bearer credential. Returns tenant_id."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization.")

    credential = auth[7:]
    if len(credential) < 32:
        raise HTTPException(status_code=401, detail="Invalid credential.")

    tenant_id = TENANT_CREDENTIALS.get(credential)
    if tenant_id is None:
        raise HTTPException(status_code=401, detail="Invalid credential.")

    return tenant_id


def _get_subject(request: Request) -> str:
    """Extract and validate X-Ghost-Subject header."""
    subject = request.headers.get("x-ghost-subject", "")
    if not subject or len(subject) > 120 or not SUBJECT_PATTERN.match(subject):
        raise HTTPException(status_code=400, detail="Missing or invalid X-Ghost-Subject.")
    return subject


# ---------------------------------------------------------------------------
# Health endpoint (no auth)
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "ghost-cursor-orchestrator"}


# ---------------------------------------------------------------------------
# Create Run
# ---------------------------------------------------------------------------
@app.post("/v1/runs", response_model=RunResponse)
async def create_run(request: Request):
    """Create a new agent run from a user message + context."""
    tenant_id = _authenticate(request)
    subject = _get_subject(request)

    if _check_rate_limit(tenant_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    body = await request.json()

    try:
        req = CreateRunRequest(**body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)[:200]}")

    run_manager: RunManager = request.app.state.run_manager
    result = await run_manager.create_run(tenant_id, subject, req)
    return result


# ---------------------------------------------------------------------------
# Continue Run
# ---------------------------------------------------------------------------
@app.post("/v1/runs/{run_id}/continue", response_model=RunResponse)
async def continue_run(run_id: str, request: Request):
    """Continue an existing run with action results, answers, or cancellation."""
    tenant_id = _authenticate(request)
    subject = _get_subject(request)

    if _check_rate_limit(tenant_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    # Validate run_id as UUID
    try:
        uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run ID format.")

    body = await request.json()

    try:
        req = ContinueRunRequest(**body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)[:200]}")

    run_manager: RunManager = request.app.state.run_manager
    result = await run_manager.continue_run(run_id, tenant_id, subject, req)
    return result

