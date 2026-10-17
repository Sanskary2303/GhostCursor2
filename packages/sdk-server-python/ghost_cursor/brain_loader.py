"""
BrainLoader — server-side Markdown brain context assembler.

Reads the customer's *brain directory* from disk and constructs the
context string injected into every upstream request.  The loader:

* Always includes ``platform.md`` (the global system prompt).
* Dynamically appends ``pages/<current_page>.md`` when the browser
  reports which page the user is viewing.
* Embeds the ``GHOST_BRAIN_SERVER_ONLY_CANARY_2026`` canary so the
  proxy layer can detect accidental brain leakage.
* Enforces a hard 32 000-character ceiling on total brain content.
* Guards against path-traversal attacks.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────
CANARY_MARKER = "GHOST_BRAIN_SERVER_ONLY_CANARY_2026"
BRAIN_CONTEXT_LIMIT = 32_000


class BrainLoader:
    """
    Load and assemble Markdown brain files for the Ghost Cursor service.

    Parameters
    ----------
    brain_dir : str
        Absolute (or relative) filesystem path to the brain directory.
        Expected layout::

            brain_dir/
              platform.md          # required — global system prompt
              pages/
                dashboard.md       # per-page contextual prompt
                settings.md
                ...
    """

    def __init__(self, brain_dir: str) -> None:
        self._brain_dir = Path(brain_dir).resolve()

        if not self._brain_dir.is_dir():
            raise FileNotFoundError(
                f"Brain directory does not exist: {self._brain_dir}"
            )

        self._platform_path = self._brain_dir / "platform.md"
        if not self._platform_path.is_file():
            logger.warning(
                "platform.md not found in brain directory %s; "
                "global context will be empty.",
                self._brain_dir,
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def load_context(self, current_page: str | None = None) -> str:
        """
        Build the full brain context string.

        Parameters
        ----------
        current_page : str | None
            Logical page name supplied by the browser (e.g. ``"dashboard"``).
            If provided, ``pages/<current_page>.md`` is appended to the
            platform context.

        Returns
        -------
        str
            The assembled brain context, including the canary marker,
            truncated to at most :data:`BRAIN_CONTEXT_LIMIT` characters.

        Raises
        ------
        ValueError
            If *current_page* contains path-traversal sequences.
        """

        sections: list[str] = []

        # 1. Canary header — always first --------------------------------
        sections.append(f"<!-- {CANARY_MARKER} -->")

        # 2. Platform-level context ---------------------------------------
        platform_text = self._safe_read(self._platform_path)
        if platform_text:
            sections.append(platform_text)

        # 3. Page-level context -------------------------------------------
        if current_page:
            page_path = self._resolve_page_path(current_page)
            if page_path is not None:
                page_text = self._safe_read(page_path)
                if page_text:
                    sections.append(
                        f"<!-- page:{current_page} -->\n{page_text}"
                    )

        full_context = "\n\n".join(sections)

        # 4. Enforce size ceiling -----------------------------------------
        if len(full_context) > BRAIN_CONTEXT_LIMIT:
            logger.warning(
                "Brain context exceeds %d chars (%d); truncating.",
                BRAIN_CONTEXT_LIMIT,
                len(full_context),
            )
            full_context = full_context[:BRAIN_CONTEXT_LIMIT]

        return full_context

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _resolve_page_path(self, page_name: str) -> Path | None:
        """
        Resolve a page name to a filesystem path, guarding against
        path-traversal attacks.

        Parameters
        ----------
        page_name : str
            Logical page identifier or URL path (e.g. ``"dashboard"``, ``"/"``, ``"/settings"``).

        Returns
        -------
        Path | None
            Resolved path under ``brain_dir/pages/``, or None if not found.

        Raises
        ------
        ValueError
            If the page name contains ``..`` traversal patterns.
        """
        # Reject directory traversal attempts
        if ".." in page_name:
            raise ValueError(
                f"Invalid page name (path traversal rejected): {page_name!r}"
            )

        # Normalize URL path by stripping leading/trailing slashes
        cleaned = page_name.strip("/\\")

        # Handle root / home path
        if not cleaned:
            for fallback in ["dashboard", "home", "catalog", "index"]:
                candidate = (self._brain_dir / "pages" / f"{fallback}.md").resolve()
                if candidate.is_file():
                    return candidate
            return None

        # Build candidate names
        safe_name = os.path.basename(cleaned)
        candidates = [safe_name]
        first_segment = cleaned.replace("\\", "/").split("/")[0]
        if first_segment and first_segment not in candidates:
            candidates.append(first_segment)
        if first_segment.endswith("s"):
            candidates.append(first_segment[:-1])
        else:
            candidates.append(first_segment + "s")

        pages_dir = (self._brain_dir / "pages").resolve()
        for cand in candidates:
            page_path = (self._brain_dir / "pages" / f"{cand}.md").resolve()
            if str(page_path).startswith(str(pages_dir)) and page_path.is_file():
                return page_path

        return None

    @staticmethod
    def _safe_read(path: Path | None) -> str | None:
        """
        Read a file and return its contents, or ``None`` if missing.

        Logs a debug message when a file is skipped.
        """
        if path is None:
            return None
        try:
            return path.read_text(encoding="utf-8")
        except FileNotFoundError:
            logger.debug("Brain file not found (skipped): %s", path)
            return None
        except OSError:
            logger.exception("Error reading brain file: %s", path)
            return None
