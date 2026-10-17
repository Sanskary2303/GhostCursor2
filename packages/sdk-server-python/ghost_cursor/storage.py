"""
SQLAlchemyChatStore — lightweight chat persistence layer.

Uses **SQLAlchemy Core** (not the ORM) so the customer can bring any
engine (PostgreSQL, SQLite, …) without importing a full ORM stack.

Table schemas mirror the Ghost Cursor DDL:

* ``ghost_chat_sessions`` – one row per conversation.
* ``ghost_chat_messages`` – one row per message (user, assistant,
  tool-call, or client-action).
"""

from __future__ import annotations

import datetime
import json
import logging
import uuid
from typing import Any

import sqlalchemy as sa
from sqlalchemy import MetaData, Table, Column, String, Integer, Text, DateTime
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncConnection

logger = logging.getLogger(__name__)

# ── Metadata & table definitions ──────────────────────────────────────────

metadata = MetaData()

ghost_chat_sessions = Table(
    "ghost_chat_sessions",
    metadata,
    Column("session_id", String(120), primary_key=True),
    Column("tenant_id", String(120), nullable=False, index=True),
    Column("user_id", String(120), nullable=False, index=True),
    Column("title", String(512), nullable=False, server_default="New Conversation"),
    Column("summary", Text, nullable=True),
    Column(
        "created_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
    Column(
        "updated_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    ),
)

ghost_chat_messages = Table(
    "ghost_chat_messages",
    metadata,
    Column("message_id", String(120), primary_key=True),
    Column(
        "session_id",
        String(120),
        sa.ForeignKey("ghost_chat_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("role", String(32), nullable=False),
    Column("content", Text, nullable=True),
    Column("tool_calls", Text, nullable=True),      # JSON-encoded
    Column("client_actions", Text, nullable=True),   # JSON-encoded
    Column("token_count", Integer, nullable=True),
    Column(
        "created_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    ),
)


class SQLAlchemyChatStore:
    """
    Async chat session / message store backed by SQLAlchemy Core.

    Parameters
    ----------
    db_engine : AsyncEngine
        An **async** SQLAlchemy engine (e.g. created with
        ``create_async_engine(...)``).
    tenant_id : str
        The Ghost Cursor tenant identifier.  All rows written through
        this store are scoped to this tenant.
    """

    def __init__(self, db_engine: AsyncEngine, tenant_id: str = "default") -> None:
        self._engine = db_engine
        self._tenant_id = tenant_id

    # ------------------------------------------------------------------
    # Bootstrap
    # ------------------------------------------------------------------

    async def create_tables(self) -> None:
        """
        Create the ``ghost_chat_sessions`` and ``ghost_chat_messages``
        tables if they do not already exist.

        Idempotent — safe to call on every application startup.
        """
        async with self._engine.begin() as conn:
            await conn.run_sync(metadata.create_all)
        logger.info("Ghost Cursor chat tables ensured.")

    # ------------------------------------------------------------------
    # Session operations
    # ------------------------------------------------------------------

    async def create_session(
        self,
        user_id: str,
        title: str = "New Conversation",
    ) -> dict[str, Any]:
        """
        Insert a new chat session row.

        Parameters
        ----------
        user_id : str
            The authenticated user identifier.
        title : str
            Human-readable session title.

        Returns
        -------
        dict
            ``{"session_id": ..., "title": ..., "created_at": ...}``
        """
        session_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc)

        async with self._engine.begin() as conn:
            await conn.execute(
                ghost_chat_sessions.insert().values(
                    session_id=session_id,
                    tenant_id=self._tenant_id,
                    user_id=user_id,
                    title=title,
                    created_at=now,
                    updated_at=now,
                )
            )

        return {"session_id": session_id, "title": title, "created_at": now.isoformat()}

    async def list_sessions(
        self,
        user_id: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Return the most recent sessions for *user_id*, newest first.

        Parameters
        ----------
        user_id : str
            The authenticated user identifier.
        limit : int
            Maximum number of sessions to return.

        Returns
        -------
        list[dict]
            Each dict contains ``session_id``, ``title``, ``summary``,
            ``created_at``, and ``updated_at``.
        """
        query = (
            sa.select(
                ghost_chat_sessions.c.session_id,
                ghost_chat_sessions.c.title,
                ghost_chat_sessions.c.summary,
                ghost_chat_sessions.c.created_at,
                ghost_chat_sessions.c.updated_at,
            )
            .where(
                ghost_chat_sessions.c.tenant_id == self._tenant_id,
                ghost_chat_sessions.c.user_id == user_id,
            )
            .order_by(ghost_chat_sessions.c.updated_at.desc())
            .limit(limit)
        )

        async with self._engine.connect() as conn:
            rows = (await conn.execute(query)).mappings().all()

        return [
            {
                "session_id": r["session_id"],
                "title": r["title"],
                "summary": r["summary"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Message operations
    # ------------------------------------------------------------------

    async def get_messages(
        self,
        session_id: str,
        user_id: str,
    ) -> list[dict[str, Any]]:
        """
        Fetch all messages for a session **with an ownership check**.

        Parameters
        ----------
        session_id : str
            Target session identifier.
        user_id : str
            The authenticated user — must own the session.

        Returns
        -------
        list[dict]
            Ordered message dicts.

        Raises
        ------
        PermissionError
            If *user_id* does not own *session_id*.
        """
        # Ownership check
        await self._assert_session_owner(session_id, user_id)

        query = (
            sa.select(
                ghost_chat_messages.c.message_id,
                ghost_chat_messages.c.role,
                ghost_chat_messages.c.content,
                ghost_chat_messages.c.tool_calls,
                ghost_chat_messages.c.client_actions,
                ghost_chat_messages.c.token_count,
                ghost_chat_messages.c.created_at,
            )
            .where(ghost_chat_messages.c.session_id == session_id)
            .order_by(ghost_chat_messages.c.created_at.asc())
        )

        async with self._engine.connect() as conn:
            rows = (await conn.execute(query)).mappings().all()

        return [self._message_row_to_dict(r) for r in rows]

    async def append_messages(
        self,
        session_id: str,
        messages: list[dict[str, Any]],
    ) -> None:
        """
        Bulk-insert messages into ``ghost_chat_messages``.

        Each dict in *messages* should contain at least ``role`` and
        ``content``.  Optional keys: ``tool_calls``, ``client_actions``,
        ``token_count``.

        Parameters
        ----------
        session_id : str
            The owning session.
        messages : list[dict]
            Message payloads to insert.
        """
        if not messages:
            return

        rows = []
        now = datetime.datetime.now(datetime.timezone.utc)
        for msg in messages:
            rows.append(
                {
                    "message_id": str(uuid.uuid4()),
                    "session_id": session_id,
                    "role": msg["role"],
                    "content": msg.get("content"),
                    "tool_calls": _json_dumps(msg.get("tool_calls")),
                    "client_actions": _json_dumps(msg.get("client_actions")),
                    "token_count": msg.get("token_count"),
                    "created_at": now,
                }
            )

        async with self._engine.begin() as conn:
            await conn.execute(ghost_chat_messages.insert(), rows)

        # Touch the session's updated_at timestamp
        async with self._engine.begin() as conn:
            await conn.execute(
                ghost_chat_sessions.update()
                .where(ghost_chat_sessions.c.session_id == session_id)
                .values(updated_at=now)
            )

    async def count_turns(self, session_id: str) -> int:
        """
        Count the number of messages in a session.

        Parameters
        ----------
        session_id : str
            Target session.

        Returns
        -------
        int
            Message count.
        """
        query = (
            sa.select(sa.func.count())
            .select_from(ghost_chat_messages)
            .where(ghost_chat_messages.c.session_id == session_id)
        )

        async with self._engine.connect() as conn:
            result = await conn.execute(query)
            return result.scalar_one()

    async def update_session_metadata(
        self,
        session_id: str,
        *,
        title: str | None = None,
        summary: str | None = None,
    ) -> None:
        """
        Selectively update a session's title and/or summary.

        Parameters
        ----------
        session_id : str
            Target session.
        title : str | None
            New title (unchanged if ``None``).
        summary : str | None
            New summary (unchanged if ``None``).
        """
        values: dict[str, Any] = {
            "updated_at": datetime.datetime.now(datetime.timezone.utc),
        }
        if title is not None:
            values["title"] = title
        if summary is not None:
            values["summary"] = summary

        async with self._engine.begin() as conn:
            await conn.execute(
                ghost_chat_sessions.update()
                .where(ghost_chat_sessions.c.session_id == session_id)
                .values(**values)
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _assert_session_owner(
        self,
        session_id: str,
        user_id: str,
    ) -> None:
        """Raise ``PermissionError`` if *user_id* does not own the session."""
        query = sa.select(ghost_chat_sessions.c.user_id).where(
            ghost_chat_sessions.c.session_id == session_id,
            ghost_chat_sessions.c.tenant_id == self._tenant_id,
        )

        async with self._engine.connect() as conn:
            row = (await conn.execute(query)).first()

        if row is None:
            raise LookupError(f"Session not found: {session_id}")
        if row[0] != user_id:
            raise PermissionError("User does not own this session.")

    @staticmethod
    def _message_row_to_dict(row: Any) -> dict[str, Any]:
        """Convert a raw DB row mapping to a public dict."""
        return {
            "message_id": row["message_id"],
            "role": row["role"],
            "content": row["content"],
            "tool_calls": _json_loads(row["tool_calls"]),
            "client_actions": _json_loads(row["client_actions"]),
            "token_count": row["token_count"],
            "created_at": (
                row["created_at"].isoformat() if row["created_at"] else None
            ),
        }


# ── Module-level utilities ────────────────────────────────────────────────


def _json_dumps(obj: Any | None) -> str | None:
    """Serialise *obj* to a JSON string, or return ``None``."""
    if obj is None:
        return None
    return json.dumps(obj, separators=(",", ":"), default=str)


def _json_loads(raw: str | None) -> Any | None:
    """Deserialise a JSON string, or return ``None``."""
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None
