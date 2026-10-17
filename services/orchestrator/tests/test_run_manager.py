"""Unit tests for RunManager state machine and invariants."""

import asyncio
import uuid
import pytest
from app.models import CreateRunRequest, ContinueRunRequest, GhostContext, ResultItem
from app.run_manager import RunManager, RunState
from app.storage.memory import MemoryRunStore
from app.llm.provider import MockLLMProvider


@pytest.fixture
def run_manager():
    store = MemoryRunStore()
    provider = MockLLMProvider()
    return RunManager(store=store, provider=provider)


@pytest.mark.asyncio
async def test_create_run_and_deduplication(run_manager):
    req_id = uuid.uuid4()
    req = CreateRunRequest(
        protocolVersion="1",
        requestId=req_id,
        message="Turn on dark mode",
        context=GhostContext(page="dashboard", values={}, availableTargets=["settings.theme_toggle"]),
        brain="Test brain context",
    )

    # 1. Create run
    resp1 = await run_manager.create_run("shophive_demo", "user_123", req)
    assert resp1.protocolVersion == "1"
    assert resp1.status in ("awaiting_actions", "completed")
    assert resp1.revision == 0
    assert resp1.runId

    # 2. Identical replay returns existing run
    resp2 = await run_manager.create_run("shophive_demo", "user_123", req)
    assert resp2.runId == resp1.runId
    assert resp2.revision == resp1.revision

    # 3. Changed payload with same requestId produces 409
    from fastapi import HTTPException
    req_altered = CreateRunRequest(
        protocolVersion="1",
        requestId=req_id,
        message="Add sneakers to cart instead",
        context=GhostContext(page="dashboard", values={}, availableTargets=[]),
        brain="Test brain context",
    )
    with pytest.raises(HTTPException) as exc:
        await run_manager.create_run("shophive_demo", "user_123", req_altered)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_continuation_lifecycle(run_manager):
    req = CreateRunRequest(
        protocolVersion="1",
        requestId=uuid.uuid4(),
        message="Turn appearance to dark mode",
        context=GhostContext(page="dashboard"),
        brain="Test brain context",
    )
    resp = await run_manager.create_run("shophive_demo", "user_123", req)
    assert resp.status == "awaiting_actions"
    assert len(resp.actions) > 0

    action_ids = [a.id for a in resp.actions]
    results = [ResultItem(id=aid, ok=True, output="completed") for aid in action_ids]

    # 1. Continue with exact revision
    cont_req = ContinueRunRequest(
        protocolVersion="1",
        eventId=uuid.uuid4(),
        revision=resp.revision,
        kind="actions",
        results=results,
    )
    cont_resp = await run_manager.continue_run(resp.runId, "shophive_demo", "user_123", cont_req)
    assert cont_resp.status == "completed"
    assert cont_resp.revision == resp.revision + 1


@pytest.mark.asyncio
async def test_revision_mismatch_rejection(run_manager):
    req = CreateRunRequest(
        protocolVersion="1",
        requestId=uuid.uuid4(),
        message="Turn appearance to dark mode",
        context=GhostContext(page="dashboard"),
        brain="Test brain context",
    )
    resp = await run_manager.create_run("shophive_demo", "user_123", req)

    from fastapi import HTTPException
    cont_req = ContinueRunRequest(
        protocolVersion="1",
        eventId=uuid.uuid4(),
        revision=999,  # Mismatched revision
        kind="actions",
        results=[ResultItem(id="act_1", ok=True)],
    )
    with pytest.raises(HTTPException) as exc:
        await run_manager.continue_run(resp.runId, "shophive_demo", "user_123", cont_req)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_expired_run_returns_410(run_manager):
    req = CreateRunRequest(
        protocolVersion="1",
        requestId=uuid.uuid4(),
        message="Hello",
        context=GhostContext(page="dashboard"),
        brain="Test brain context",
    )
    resp = await run_manager.create_run("shophive_demo", "user_123", req)

    # Force expiration in store
    raw_data = await run_manager.store.get_run(resp.runId, "shophive_demo", "user_123")
    raw_data["expires_at"] = 1.0  # Expired in past
    await run_manager.store.save_run(raw_data)

    from fastapi import HTTPException
    cont_req = ContinueRunRequest(
        protocolVersion="1",
        eventId=uuid.uuid4(),
        revision=resp.revision,
        kind="cancel",
    )
    with pytest.raises(HTTPException) as exc:
        await run_manager.continue_run(resp.runId, "shophive_demo", "user_123", cont_req)
    assert exc.value.status_code == 410

