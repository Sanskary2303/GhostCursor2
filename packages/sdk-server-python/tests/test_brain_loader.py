"""Unit tests for BrainLoader and Canary detection."""

import os
from pathlib import Path
import pytest
from ghost_cursor.brain_loader import BrainLoader, CANARY_MARKER


@pytest.fixture
def temp_brain(tmp_path):
    brain_dir = tmp_path / "brain"
    brain_dir.mkdir()
    pages_dir = brain_dir / "pages"
    pages_dir.mkdir()

    # Create platform.md
    (brain_dir / "platform.md").write_text(
        "# Test Platform\nPlatform business rules here.\nGHOST_BRAIN_SERVER_ONLY_CANARY_2026\n",
        encoding="utf-8"
    )

    # Create pages/settings.md
    (pages_dir / "settings.md").write_text(
        "# Settings Page\nSettings business rules.\n",
        encoding="utf-8"
    )

    return str(brain_dir)


@pytest.mark.asyncio
async def test_brain_loader_platform_and_page(temp_brain):
    loader = BrainLoader(temp_brain)
    ctx = await loader.load_context("settings")

    assert "Test Platform" in ctx
    assert "Settings Page" in ctx
    assert CANARY_MARKER in ctx


@pytest.mark.asyncio
async def test_brain_loader_path_traversal_defense(temp_brain):
    loader = BrainLoader(temp_brain)
    # Attempt directory traversal — should raise ValueError
    with pytest.raises(ValueError):
        await loader.load_context("../../etc/passwd")


@pytest.mark.asyncio
async def test_brain_loader_unknown_page(temp_brain):
    loader = BrainLoader(temp_brain)
    ctx = await loader.load_context("non_existent_page")
    assert "Test Platform" in ctx
    assert "<!-- page:non_existent_page -->" not in ctx


@pytest.mark.asyncio
async def test_brain_loader_url_paths(temp_brain):
    loader = BrainLoader(temp_brain)
    # Leading slash route should resolve correctly
    ctx_settings = await loader.load_context("/settings")
    assert "Settings Page" in ctx_settings

    # Root route should not throw ValueError
    ctx_root = await loader.load_context("/")
    assert "Test Platform" in ctx_root


