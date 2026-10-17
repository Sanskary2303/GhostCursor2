"""
Pydantic models for the Ghost Cursor SDK.

These models define the public-facing request/response contracts
exchanged between the browser widget and the customer's backend.
Validators enforce that the browser can never supply privileged
fields (brain, subject, tenant, tool results).
"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Request models — browser → customer backend
# ---------------------------------------------------------------------------


class BrowserStartRequest(BaseModel):
    """
    Payload sent by the browser widget to start a new turn.

    The browser supplies a ``command='start'``, a unique ``request_id``,
    the user's message, and optional UI context.  Privileged fields
    (brain, subject, tenant, tool results) are rejected by validators.
    """

    command: str = Field("start", pattern="^start$")
    request_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        alias="requestId",
        description="Client-generated UUID for idempotency.",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=16_000,
        description="The user's natural-language message.",
    )
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary UI context the browser wants to share.",
    )

    model_config = {"populate_by_name": True}

    # -- safety validators --------------------------------------------------

    @field_validator("context", mode="before")
    @classmethod
    def _reject_privileged_context_keys(cls, v: Any) -> Any:
        """Reject browser attempts to inject privileged keys into context."""
        if isinstance(v, dict):
            forbidden = {"brain", "subject", "tenant", "toolResults", "tool_results"}
            overlap = forbidden & set(v.keys())
            if overlap:
                raise ValueError(
                    f"Browser context must not contain privileged keys: {overlap}"
                )
        return v


class BrowserContinueRequest(BaseModel):
    """
    Payload sent by the browser widget to continue an in-progress run.

    Used when the assistant asks the user a question or the browser
    reports completed client-side actions.
    """

    command: str = Field("continue", pattern="^continue$")
    run_id: str = Field(
        ...,
        alias="runId",
        min_length=1,
        max_length=120,
        description="The run ID returned by the initial /run response.",
    )
    event_id: str = Field(
        ...,
        alias="eventId",
        min_length=1,
        max_length=120,
        description="The event the client is replying to.",
    )
    revision: int = Field(
        ...,
        ge=0,
        description="Monotonically increasing revision counter.",
    )
    kind: str = Field(
        ...,
        pattern="^(answer|action_results)$",
        description="'answer' when replying to a question, "
        "'action_results' when reporting action outcomes.",
    )
    results: list[dict[str, Any]] | None = Field(
        default=None,
        description="Action results from the browser (only for kind='action_results').",
    )
    answer: str | None = Field(
        default=None,
        max_length=16_000,
        description="User's answer to a follow-up question.",
    )
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Updated UI context.",
    )

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def _check_kind_payload(self) -> "BrowserContinueRequest":
        """Ensure the payload matches the declared kind."""
        if self.kind == "answer" and not self.answer:
            raise ValueError("'answer' kind requires a non-empty answer field.")
        if self.kind == "action_results" and not self.results:
            raise ValueError(
                "'action_results' kind requires a non-empty results list."
            )
        return self

    @field_validator("context", mode="before")
    @classmethod
    def _reject_privileged_context_keys(cls, v: Any) -> Any:
        """Reject browser attempts to inject privileged keys into context."""
        if isinstance(v, dict):
            forbidden = {"brain", "subject", "tenant", "toolResults", "tool_results"}
            overlap = forbidden & set(v.keys())
            if overlap:
                raise ValueError(
                    f"Browser context must not contain privileged keys: {overlap}"
                )
        return v


# ---------------------------------------------------------------------------
# Response model — customer backend → browser
# ---------------------------------------------------------------------------


class PublicResponse(BaseModel):
    """
    The filtered response envelope returned to the browser widget.

    **Security invariant:** this model intentionally omits ``toolCalls``
    and any internal brain data.  The proxy layer constructs this after
    stripping server-only information from the upstream response.
    """

    protocol_version: str = Field(
        "1",
        alias="protocolVersion",
        description="Wire-protocol version.",
    )
    run_id: str = Field(
        ...,
        alias="runId",
        description="Opaque run identifier.",
    )
    revision: int = Field(
        ...,
        ge=0,
        description="Response revision counter.",
    )
    status: str = Field(
        ...,
        pattern="^(completed|awaiting_user|awaiting_actions|error)$",
        description="Current run status visible to the browser.",
    )
    reply: str | None = Field(
        default=None,
        description="The assistant's natural-language reply.",
    )
    questions: list[dict[str, Any]] | None = Field(
        default=None,
        description="Follow-up questions the assistant is asking.",
    )
    actions: list[dict[str, Any]] | None = Field(
        default=None,
        description="Client-side actions the browser should execute.",
    )

    model_config = {"populate_by_name": True, "by_alias": True}
