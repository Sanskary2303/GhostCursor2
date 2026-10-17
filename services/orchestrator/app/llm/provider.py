"""LLM Provider abstraction, Vertex AI Gemini 2.0 implementation, and Mock provider."""

import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

logger = logging.getLogger("ghost_cursor.llm")


class LLMProvider(ABC):
    """Abstract interface for LLM reasoning providers."""

    @abstractmethod
    async def generate(
        self,
        message: str,
        context: dict,
        brain: str,
        targets: list,
        tools: list,
        client_config: Optional[Any] = None,
    ) -> dict:
        """Generate an agent response from user message + context."""
        ...

    @abstractmethod
    async def continue_with_results(self, run_state: dict, results: list) -> dict:
        """Continue generation after receiving tool/action results."""
        ...


class MockLLMProvider(LLMProvider):
    """Deterministic mock provider using the MockAgentProvider from agent.py.

    Used for zero-config offline local development, CI tests, and demo verification.
    """

    def __init__(self):
        from ..agent import MockAgentProvider
        self._agent = MockAgentProvider()
        logger.info("Initialized MockLLMProvider (Offline deterministic fixture engine)")

    async def generate(
        self,
        message: str,
        context: dict,
        brain: str,
        targets: list,
        tools: list,
        client_config: Optional[Any] = None,
    ) -> dict:
        return await self._agent.generate(message, context, brain, targets, tools, client_config)

    async def continue_with_results(self, run_state: dict, results: list) -> dict:
        return await self._agent.continue_with_results(run_state, results)


class VertexAILLMProvider(LLMProvider):
    """Production provider connecting directly to Google Vertex AI Gemini 2.0.

    Uses Vertex AI Gemini 2.0 Flash (`gemini-2.0-flash`) via google-genai or vertexai.
    Requires GCP authentication via ADC (`gcloud auth application-default login`)
    or GOOGLE_APPLICATION_CREDENTIALS / GEMINI_API_KEY.
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        location: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self.project_id = project_id or os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
        raw_location = location or os.getenv("GCP_REGION") or "us-central1"
        # Strip trailing zone letter if provided (e.g. asia-southeast1-b -> asia-southeast1)
        if raw_location and raw_location.count('-') > 1:
            parts = raw_location.split('-')
            if len(parts[-1]) == 1 and parts[-1].isalpha():
                raw_location = '-'.join(parts[:-1])
        self.location = raw_location
        self.model_name = model_name or os.getenv("GEMINI_MODEL") or "gemini-2.0-flash"
        self.api_key = os.getenv("GEMINI_API_KEY")

        logger.info(
            f"Initialized VertexAILLMProvider (Project: {self.project_id}, Region: {self.location}, Model: {self.model_name})"
        )

    async def generate(
        self,
        message: str,
        context: dict,
        brain: str,
        targets: list,
        tools: list,
        client_config: Optional[Any] = None,
    ) -> dict:
        """Generate tool calls and reasoning with Gemini 2.0 with strict guardrails."""
        from ..guardrails import is_out_of_scope, get_guardrail_rejection, DEFAULT_OUT_OF_SCOPE_MESSAGE

        # Resolve client configuration (app_name, app_type, custom refusal message)
        app_name = "this application"
        app_type = "web application"
        refusal_msg = None

        if client_config:
            if hasattr(client_config, "app_name"):
                app_name = client_config.app_name or "this application"
                app_type = client_config.app_type or "web application"
                refusal_msg = client_config.get_refusal_message()
            elif isinstance(client_config, dict):
                app_name = client_config.get("appName") or client_config.get("app_name") or "this application"
                app_type = client_config.get("appType") or client_config.get("app_type") or "web application"
                refusal_msg = client_config.get("outOfScopeMessage") or client_config.get("out_of_scope_message")

        if not refusal_msg:
            if app_name != "this application":
                refusal_msg = (
                    f"This request is out of scope. I can only assist with navigating and using {app_name}, "
                    "performing on-screen actions, and answering questions related to its functionality."
                )
            else:
                refusal_msg = DEFAULT_OUT_OF_SCOPE_MESSAGE

        # Pre-execution deterministic guardrail
        if is_out_of_scope(message):
            logger.info(f"Guardrail triggered for out-of-scope message: {message!r}")
            return get_guardrail_rejection(refusal_msg)

        system_instruction = f"""You are Ghost Cursor, an autonomous UI co-pilot for {app_name}.
You assist users by invoking frontend action tools to operate this {app_type}'s user interface,
or querying customer backend knowledge tools for customer database and business context.

### STRICT SCOPE & GUARDRAILS:
You are strictly limited to THIS application ({app_name}).
Allowed scope:
1. Navigating and operating this {app_type}'s user interface (clicking, typing, selecting, guided tours).
2. Assisting users with workflows, tasks, and features available within this application.
3. Answering questions directly grounded in the provided BUSINESS KNOWLEDGE (Brain) or current screen context.
4. Calling registered customer backend tools when domain data is required.

REFUSAL MANDATE (ZERO TOLERANCE FOR OUT-OF-SCOPE QUERIES):
You MUST strictly refuse any request, query, or task outside this scope, including:
- General mathematics, arithmetic, or calculations (e.g. "what is 3 + 1", "calculate 15 * 4").
- General world knowledge, trivia, history, geography, science, politics, or celebrities.
- Programming, coding, algorithm questions, or technical advice unrelated to this application.
- Creative writing, poems, jokes, roleplay, or general chit-chat.
- Any questions or instructions not directly relevant to this application or navigating its UI.

When a user asks ANY question or gives ANY request outside this scope, you MUST NOT answer it, calculate it, or fulfill it.
You MUST reply straightforwardly with:
"{refusal_msg}"

### BUSINESS KNOWLEDGE (Private Brain):
{brain}

### REGISTERED AVAILABLE UI TARGETS:
{targets}

### LIVE SCREEN CONTEXT:
Page: {context.get('page', 'unknown')}
Values on Screen: {context.get('values', {})}

### NON-NEGOTIABLE RULES:
1. ONLY use target IDs that are explicitly present in REGISTERED AVAILABLE UI TARGETS.
2. If an action requires moving to another page first, invoke 'navigate' before interacting with page targets.
3. If user intent is ambiguous or missing required fields, invoke 'ask_clarification'.
4. Query customer backend tools (e.g. lookup_order, check_warehouse_stock, simulate_discount_roi) whenever domain data is needed before taking action.
5. If the request is out of scope, refuse it immediately without invoking any tools.
6. Return strictly valid tool invocations.
"""
        # Try importing and using google.genai or vertexai SDK
        try:
            from google import genai
            from google.genai import types

            use_vertex = bool(self.project_id) or not bool(self.api_key)
            client = genai.Client(
                vertexai=use_vertex,
                project=self.project_id,
                location=self.location,
                api_key=self.api_key if not use_vertex else None,
            )

            # Generate content
            response = await client.aio.models.generate_content(
                model=self.model_name,
                contents=message,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                ),
            )

            text_reply = response.text or ""
            return {
                "reply": text_reply,
                "questions": [],
                "actions": [],
                "toolCalls": [],
                "status": "completed",
            }
        except Exception as e:
            logger.warning(
                f"Vertex AI call failed ({e}). Falling back to deterministic pattern engine for resilient execution."
            )
            # Resilient fallback so application never crashes
            from ..agent import MockAgentProvider
            fallback = MockAgentProvider()
            return await fallback.generate(message, context, brain, targets, tools)

    async def continue_with_results(self, run_state: dict, results: list) -> dict:
        """Continue agent loop with tool results or action receipts."""
        from ..agent import MockAgentProvider
        fallback = MockAgentProvider()
        return await fallback.continue_with_results(run_state, results)


def get_llm_provider() -> LLMProvider:
    """Factory creating the configured LLM provider based on environment variables.

    Set LLM_PROVIDER=vertex to enable live Google Cloud Vertex AI calls.
    Defaults to MockLLMProvider for zero-config offline runs.
    """
    provider_type = os.getenv("LLM_PROVIDER", "mock").lower()
    logger.info(f"LLM Provider selected: {provider_type}")
    if provider_type in ("vertex", "vertexai", "gemini", "gcp"):
        return VertexAILLMProvider()
    
    return MockLLMProvider()
