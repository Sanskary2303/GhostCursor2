"""In-memory run store for development and testing."""

import time
from typing import Any, Dict, Optional

from .base import RunStore


class MemoryRunStore(RunStore):
    """In-memory dictionary-backed run store.

    WARNING: For testing and development only.
    Data is lost on restart. Not suitable for production.
    """

    def __init__(self):
        self._runs: Dict[str, Dict[str, Any]] = {}

    async def save_run(self, run_data: Dict[str, Any]) -> None:
        self._runs[run_data["id"]] = run_data

    async def get_run(self, run_id: str, tenant: str, subject: str) -> Optional[Dict[str, Any]]:
        run = self._runs.get(run_id)
        if run and run["tenant"] == tenant and run["subject"] == subject:
            return run
        return None

    async def get_run_by_request_id(self, tenant: str, subject: str, request_id: str) -> Optional[Dict[str, Any]]:
        for run in self._runs.values():
            if run["tenant"] == tenant and run["subject"] == subject and run["request_id"] == request_id:
                return run
        return None

    async def delete_expired(self) -> int:
        now = time.time()
        expired = [rid for rid, r in self._runs.items() if r.get("expires_at", 0) < now]
        for rid in expired:
            del self._runs[rid]
        return len(expired)

