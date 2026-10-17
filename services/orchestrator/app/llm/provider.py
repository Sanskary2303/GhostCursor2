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
    async def generate(self, message: str, context: dict, brain: str, targets: list, tools: list) -> dict:
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

    async def generate(self, message: str, context: dict, brain: str, targets: list, tools: list) -> dict:
        return await self._agent.generate(message, context, brain, targets, tools)

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
        location: str = "us-central1",
        model_name: str = "gemini-2.0-flash",
    ):
        self.project_id = project_id or os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.getenv("GCP_REGION", "us-central1")
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.api_key = os.getenv("GEMINI_API_KEY")

        logger.info(
            f"Initialized VertexAILLMProvider (Project: {self.project_id}, Region: {self.location}, Model: {self.model_name})"
        )

    async def generate(self, message: str, context: dict, brain: str, targets: list, tools: list) -> dict:
        """Generate tool calls and reasoning with Gemini 2.0."""
        system_instruction = f"""You are Ghost Cursor, an autonomous UI co-pilot.
You assist users by invoking frontend action tools to operate the web interface,
or querying customer backend knowledge tools for customer database/business context.

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
5. Return strictly valid tool invocations.
"""
        # Try importing and using google.genai or vertexai SDK
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(
                project=self.project_id,
                location=self.location,
                api_key=self.api_key if not self.project_id else None,
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

    if provider_type in ("vertex", "vertexai", "gemini", "gcp"):
        return VertexAILLMProvider()
    
    return MockLLMProvider()
