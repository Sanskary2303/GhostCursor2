"""FastAPI integration helpers for Ghost Cursor Backend SDK.

Provides ready-to-use APIRouter that customers mount in their FastAPI app.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel


class TurnRequest(BaseModel):
    """Browser turn request."""
    command: str = "start"
    message: Optional[str] = None
    context: Optional[dict] = None
    runId: Optional[str] = None
    eventId: Optional[str] = None
    revision: Optional[int] = None
    kind: Optional[str] = None
    results: Optional[list] = None
    answer: Optional[str] = None


class CreateSessionRequest(BaseModel):
    title: str = "New Conversation"


def create_ghost_router(ghost, get_current_user=None) -> APIRouter:
    """Create a FastAPI router with Ghost Cursor proxy endpoints.

    Args:
        ghost: GhostCursorBackend instance
        get_current_user: Optional dependency for user authentication.
                          Should return an object with .id attribute.
                          If None, uses a mock user.

    Returns:
        APIRouter with /run, /sessions, /sessions/{id}/messages endpoints
    """
    router = APIRouter(prefix="/api/ghost-cursor", tags=["Ghost Cursor"])

    async def _get_user(request: Request):
        """Get authenticated user from request."""
        if get_current_user:
            return await get_current_user(request)
        # Mock user for demo
        class MockUser:
            id = "demo_user_1"
            name = "Demo User"
        return MockUser()

    @router.post("")
    @router.post("/")
    @router.post("/run")
    async def handle_ghost_turn(request: Request):
        """Proxy user message & context to Ghost Cursor Cloud."""
        user = await _get_user(request)
        payload = await request.json()

        # Reject browser-supplied privileged fields
        for forbidden in ["brain", "subject", "tenant", "toolResults", "capabilities"]:
            payload.pop(forbidden, None)

        result = await ghost.handle_turn(
            payload=payload,
            user_id=str(user.id),
            current_page=payload.get("context", {}).get("page", ""),
        )

        # Record turn in chat store if attached
        if ghost._chat_store and payload.get("message"):
            session_id = payload.get("sessionId")
            if session_id:
                try:
                    from .manager import record_turn_and_summarize
                    await record_turn_and_summarize(
                        session_id=session_id,
                        turn_data={
                            "user_message": payload.get("message", ""),
                            "assistant_reply": result.get("reply", ""),
                            "backend_tool_calls": [],
                            "frontend_actions": result.get("actions", []),
                        },
                        store=ghost._chat_store,
                    )
                except Exception:
                    pass  # Don't fail the turn if logging fails

        return result

    @router.post("/sessions")
    async def create_session(body: CreateSessionRequest, request: Request):
        """Create a new chat session."""
        user = await _get_user(request)
        if not ghost._chat_store:
            raise HTTPException(status_code=501, detail="Chat storage not configured.")
        return await ghost._chat_store.create_session(
            user_id=str(user.id),
            title=body.title,
        )

    @router.get("/sessions")
    async def list_sessions(request: Request):
        """List user's chat sessions."""
        user = await _get_user(request)
        if not ghost._chat_store:
            return []
        return await ghost._chat_store.list_sessions(user_id=str(user.id))

    @router.get("/sessions/{session_id}/messages")
    async def get_messages(session_id: str, request: Request):
        """Get messages for a chat session."""
        user = await _get_user(request)
        if not ghost._chat_store:
            return []
        return await ghost._chat_store.get_messages(
            session_id=session_id,
            user_id=str(user.id),
        )

    @router.get("/suggestions")
    @router.post("/suggestions")
    async def get_page_suggestions(request: Request):
        """Get page-contextual suggested questions for quick prompt chips."""
        user = await _get_user(request)
        if request.method == "POST":
            body = await request.json()
            page = body.get("page", "")
            targets = body.get("availableTargets", [])
            count = body.get("count", 3)
        else:
            page = request.query_params.get("page", "")
            targets = request.query_params.getlist("targets") if "targets" in request.query_params else []
            count = int(request.query_params.get("count", 3))

        suggestions = await ghost.get_suggestions(
            current_page=page,
            available_targets=targets,
            count=count,
            user_id=str(user.id),
        )
        return {"page": page, "suggestions": suggestions}

    return router


