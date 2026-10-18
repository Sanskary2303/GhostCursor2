"""Tests for Gemini backend tools declarations in VertexAILLMProvider."""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.llm.provider import VertexAILLMProvider
from app.models import ToolDeclaration, CreateRunRequest, GhostContext
from app.run_manager import RunManager
from app.storage.memory import MemoryRunStore


def test_normalize_tool_declarations_dict_and_models():
    """Verify tool declarations from dicts and Pydantic models are normalized."""
    tools = [
        {
            "name": "lookup_order",
            "description": "Checks order status and shipment tracking",
            "parameters": {
                "type": "object",
                "properties": {"order_id": {"type": "string"}},
                "required": ["order_id"],
            },
        },
        ToolDeclaration(
            name="check_warehouse_stock",
            description="Checks warehouse inventory count",
            parameters={
                "type": "object",
                "properties": {"sku": {"type": "string"}, "size": {"type": "string"}},
                "required": ["sku", "size"],
            },
        ),
    ]

    normalized = VertexAILLMProvider._normalize_tool_declarations(tools)
    assert len(normalized) == 2
    assert normalized[0]["name"] == "lookup_order"
    assert normalized[0]["description"] == "Checks order status and shipment tracking"
    assert normalized[0]["parameters"]["required"] == ["order_id"]

    assert normalized[1]["name"] == "check_warehouse_stock"
    assert normalized[1]["description"] == "Checks warehouse inventory count"
    assert normalized[1]["parameters"]["required"] == ["sku", "size"]


def test_build_system_instruction_includes_tool_declarations():
    """Verify backend tools (name, description, parameters) are added to the Gemini system prompt."""
    provider = VertexAILLMProvider(project_id="test-proj")
    tools = [
        {
            "name": "lookup_order",
            "description": "Checks order status, shipment tracking, and items for the authenticated user",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "Order ID to lookup, e.g. 'SH-1024'",
                    }
                },
                "required": ["order_id"],
            },
        }
    ]

    prompt = provider._build_system_instruction(
        app_name="ShopHive",
        app_type="e-commerce store",
        refusal_msg="Out of scope refusal",
        brain="Platform knowledge",
        targets=["orders.tracking_link"],
        tools=tools,
        context={"page": "orders"},
    )

    # 1. Assert backend tools section exists
    assert "CUSTOMER BACKEND TOOLS AVAILABLE" in prompt

    # 2. Assert tool name, description, parameters are included
    assert "lookup_order" in prompt
    assert "name: lookup_order" in prompt
    assert "description: Checks order status, shipment tracking, and items for the authenticated user" in prompt
    assert "parameters:" in prompt
    assert "order_id" in prompt

    # 3. Assert instructions for toolCalls return format
    assert "toolCalls" in prompt
    assert "awaiting_tools" in prompt
    assert '"id": "tc_1"' in prompt


@pytest.mark.asyncio
async def test_vertex_provider_parses_tool_calls_dict():
    """Verify VertexAILLMProvider correctly parses toolCalls from Gemini response."""
    provider = VertexAILLMProvider(project_id="test-proj")

    gemini_json_response = json.dumps({
        "reply": "Let me look up order SH-1024 for you.",
        "status": "awaiting_tools",
        "actions": [],
        "questions": [],
        "toolCalls": [
            {
                "id": "tc_1",
                "tool": "lookup_order",
                "parameters": {"order_id": "SH-1024"},
            }
        ],
    })

    # Mock client and response
    mock_resp = MagicMock()
    mock_resp.text = gemini_json_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    with patch("google.genai.Client", return_value=mock_client):
        result = await provider.generate(
            message="Where is my order SH-1024?",
            context={"page": "orders"},
            brain="ShopHive orders info",
            targets=[],
            tools=[{"name": "lookup_order", "description": "Lookup order", "parameters": {}}],
        )

    assert result["status"] == "awaiting_tools"
    assert result["reply"] == "Let me look up order SH-1024 for you."
    assert len(result["toolCalls"]) == 1
    assert result["toolCalls"][0]["tool"] == "lookup_order"
    assert result["toolCalls"][0]["parameters"] == {"order_id": "SH-1024"}
    assert result["actions"] == []
    assert result["questions"] == []


@pytest.mark.asyncio
async def test_vertex_provider_normalizes_snake_case_tool_calls():
    """Verify tool_calls with name and arguments are normalized to toolCalls with tool and parameters."""
    provider = VertexAILLMProvider(project_id="test-proj")

    gemini_json_response = json.dumps({
        "reply": "Checking stock now.",
        "tool_calls": [
            {
                "name": "check_warehouse_stock",
                "arguments": {"sku": "NK-AM90-01", "size": "10"},
            }
        ],
    })

    mock_resp = MagicMock()
    mock_resp.text = gemini_json_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    with patch("google.genai.Client", return_value=mock_client):
        result = await provider.generate(
            message="Do you have size 10 in stock?",
            context={"page": "products"},
            brain="ShopHive products",
            targets=[],
            tools=[{"name": "check_warehouse_stock", "description": "Check stock", "parameters": {}}],
        )

    assert result["status"] == "awaiting_tools"
    assert len(result["toolCalls"]) == 1
    assert result["toolCalls"][0]["id"] == "tc_1"
    assert result["toolCalls"][0]["tool"] == "check_warehouse_stock"
    assert result["toolCalls"][0]["parameters"] == {"sku": "NK-AM90-01", "size": "10"}


@pytest.mark.asyncio
async def test_vertex_provider_parses_tool_call_list():
    """Verify parsed tool call list with backend tool is mapped to status awaiting_tools."""
    provider = VertexAILLMProvider(project_id="test-proj")

    gemini_list_response = json.dumps([
        {
            "tool": "lookup_order",
            "parameters": {"order_id": "SH-1024"},
        }
    ])

    mock_resp = MagicMock()
    mock_resp.text = gemini_list_response

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp)

    with patch("google.genai.Client", return_value=mock_client):
        result = await provider.generate(
            message="Track SH-1024",
            context={"page": "orders"},
            brain="ShopHive",
            targets=[],
            tools=[{"name": "lookup_order", "description": "Lookup order", "parameters": {}}],
        )

    assert result["status"] == "awaiting_tools"
    assert len(result["toolCalls"]) == 1
    assert result["toolCalls"][0]["tool"] == "lookup_order"
    assert result["toolCalls"][0]["parameters"] == {"order_id": "SH-1024"}

