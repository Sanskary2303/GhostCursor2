"""Abstract base class for run storage backends."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class RunStore(ABC):
    """Abstract interface for persisting agent run state."""

    @abstractmethod
    async def save_run(self, run_data: Dict[str, Any]) -> None:
        """Create or update a run in the store."""
        ...

    @abstractmethod
    async def get_run(self, run_id: str, tenant: str, subject: str) -> Optional[Dict[str, Any]]:
        """Retrieve a run by ID, scoped to tenant and subject."""
        ...

    @abstractmethod
    async def get_run_by_request_id(self, tenant: str, subject: str, request_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a run by request_id for deduplication."""
        ...

    @abstractmethod
    async def delete_expired(self) -> int:
        """Delete expired runs. Returns count of deleted runs."""
        ...

