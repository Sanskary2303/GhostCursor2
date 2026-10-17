"""PostgreSQL run store using SQLAlchemy async."""

import json
import time
from typing import Any, Dict, Optional

from sqlalchemy import Column, DateTime, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from .base import RunStore


class Base(DeclarativeBase):
    pass


class GhostRun(Base):
    """ghost_runs table - ephemeral run state with 30-minute TTL."""
    __tablename__ = "ghost_runs"

    id = Column(String(64), primary_key=True)
    tenant = Column(String(64), nullable=False)
    subject = Column(String(128), nullable=False)
    request_id = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    data = Column(JSONB, nullable=False, default={})

    __table_args__ = (
        Index("idx_ghost_runs_tenant_subject_request", "tenant", "subject", "request_id", unique=True),
        Index("idx_ghost_runs_expires", "expires_at"),
    )


class PostgresRunStore(RunStore):
    """PostgreSQL-backed run store with transactional locking.

    Uses SELECT FOR UPDATE for optimistic concurrency.
    Pool: 5 connections, 3-second lock timeout.
    """

    def __init__(self, database_url: str):
        self.engine = create_async_engine(
            database_url,
            pool_size=5,
            max_overflow=0,
            pool_timeout=3,
        )
        self.session_factory = async_sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)

    async def initialize(self):
        """Create tables if they don't exist."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def save_run(self, run_data: Dict[str, Any]) -> None:
        from datetime import datetime, timezone
        async with self.session_factory() as session:
            async with session.begin():
                existing = await session.get(GhostRun, run_data["id"], with_for_update=True)
                if existing:
                    existing.data = run_data
                    existing.expires_at = datetime.fromtimestamp(run_data["expires_at"], tz=timezone.utc)
                else:
                    run = GhostRun(
                        id=run_data["id"],
                        tenant=run_data["tenant"],
                        subject=run_data["subject"],
                        request_id=run_data["request_id"],
                        expires_at=datetime.fromtimestamp(run_data["expires_at"], tz=timezone.utc),
                        data=run_data,
                    )
                    session.add(run)

    async def get_run(self, run_id: str, tenant: str, subject: str) -> Optional[Dict[str, Any]]:
        async with self.session_factory() as session:
            run = await session.get(GhostRun, run_id)
            if run and run.tenant == tenant and run.subject == subject:
                return run.data
            return None

    async def get_run_by_request_id(self, tenant: str, subject: str, request_id: str) -> Optional[Dict[str, Any]]:
        from sqlalchemy import select
        async with self.session_factory() as session:
            result = await session.execute(
                select(GhostRun).where(
                    GhostRun.tenant == tenant,
                    GhostRun.subject == subject,
                    GhostRun.request_id == request_id,
                )
            )
            run = result.scalar_one_or_none()
            return run.data if run else None

    async def delete_expired(self) -> int:
        from datetime import datetime, timezone
        from sqlalchemy import delete
        async with self.session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    delete(GhostRun).where(GhostRun.expires_at < datetime.now(timezone.utc))
                )
                return result.rowcount

