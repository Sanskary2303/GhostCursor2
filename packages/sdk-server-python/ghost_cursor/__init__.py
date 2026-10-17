"""
Ghost Cursor Backend SDK — AI Co-pilot Integration.

This package provides the server-side SDK for integrating Ghost Cursor
into your Python backend. Install with ``pip install ghost-cursor``.

Main exports
------------
- **GhostCursorBackend** – orchestrator that proxies browser turns to the
  Ghost Cursor service, manages tool dispatch, and filters responses.
- **BrainLoader** – reads Markdown brain files from disk and injects
  the server-only canary marker.
- **SQLAlchemyChatStore** – thin persistence layer for chat sessions /
  messages backed by any SQLAlchemy-supported database.
"""

from ghost_cursor.brain_loader import BrainLoader
from ghost_cursor.storage import SQLAlchemyChatStore
from ghost_cursor.proxy import GhostCursorBackend
from ghost_cursor.fastapi import create_ghost_router

__all__ = [
    "GhostCursorBackend",
    "BrainLoader",
    "SQLAlchemyChatStore",
    "create_ghost_router",
]


__version__ = "0.1.0"
