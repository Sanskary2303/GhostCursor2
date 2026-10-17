"""Unit tests for GhostCursorBackend proxy and Canary leak filtering."""

import pytest
from ghost_cursor.proxy import GhostCursorBackend


@pytest.fixture
def temp_brain(tmp_path):
    brain_dir = tmp_path / "brain"
    brain_dir.mkdir()
    (brain_dir / "platform.md").write_text("# Test Platform\n", encoding="utf-8")
    return str(brain_dir)


def test_canary_leak_filtering(temp_brain):
    ghost = GhostCursorBackend(
        api_key="test-key-32-chars-long-minimum-length",
        tenant_id="tenant_123",
        brain_dir=temp_brain,
    )

    # Simulated leaked response containing the canary string
    leaked_response = {
        "protocolVersion": "1",
        "runId": "run_123",
        "revision": 0,
        "status": "completed",
        "reply": "Here is the canary: GHOST_BRAIN_SERVER_ONLY_CANARY_2026",
        "questions": [],
        "actions": [],
    }

    filtered = ghost._filter_response(leaked_response)

    # The filter MUST block the canary and fail closed
    assert "GHOST_BRAIN_SERVER_ONLY_CANARY_2026" not in str(filtered)
    assert filtered["status"] == "failed"


def test_tool_calls_never_reach_public_envelope(temp_brain):
    ghost = GhostCursorBackend(
        api_key="test-key-32-chars-long-minimum-length",
        tenant_id="tenant_123",
        brain_dir=temp_brain,
    )

    response_with_tools = {
        "protocolVersion": "1",
        "runId": "run_123",
        "revision": 0,
        "status": "awaiting_tools",
        "reply": "Querying customer database...",
        "questions": [],
        "actions": [],
        "toolCalls": [{"id": "tc_1", "tool": "lookup_order", "parameters": {}}],
    }

    filtered = ghost._filter_response(response_with_tools)

    # toolCalls MUST be completely stripped from public envelope
    assert "toolCalls" not in filtered
    # awaiting_tools must never be exposed to browser
    assert filtered["status"] != "awaiting_tools"

