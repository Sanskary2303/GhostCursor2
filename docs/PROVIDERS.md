# 🤖 Ghost Cursor — Model Providers & Google ADK Integration

## 1. Supported Providers

Ghost Cursor is engineered around **Google Agent Development Kit (ADK)** and Vertex AI Gemini 2.0:

| Provider | Model | Latency | Primary Role |
|---|---|---|---|
| **Google Vertex AI** | `gemini-2.0-flash` | ~300ms | Default for fast conversational turns & UI action planning |
| **Google Vertex AI** | `gemini-2.0-pro` | ~900ms | Complex multi-page business reasoning & financial simulations |
| **Mock Provider** | Deterministic Fixtures | <10ms | Offline local development and CI testing |

---

## 2. Google ADK Agent Definition

The core agent loop uses the Google ADK Python SDK:

```python
from google.adk.agents.llm_agent import Agent
from google.adk.tools import FunctionTool

agent = Agent(
    name="ghost_cursor_orchestrator",
    model="gemini-2.0-flash",
    instruction=system_instruction,
    tools=[
        FunctionTool(navigate),
        FunctionTool(click),
        FunctionTool(fill_input),
        FunctionTool(toggle_switch),
        FunctionTool(guided_tour),
        FunctionTool(ask_clarification),
        *customer_registered_tools
    ]
)
```

---

## 3. Tool-Calling Specification

The model outputs strictly typed tool calls matching registered target schemas:

```json
{
  "tool": "click",
  "parameters": {
    "target_id": "product.add_to_cart_btn",
    "explanation": "Add the selected size 10 sneakers to the cart."
  }
}
```

### Safety Constraints:
- Only ONE of `questions`, `actions`, or `toolCalls` may be populated in a single response turn.
- Targets must match registered IDs matching `^[a-zA-Z0-9_.:-]+$`.
- Model output cannot generate raw DOM scripts, CSS selectors, or arbitrary URLs.
- Canary strings (`GHOST_BRAIN_SERVER_ONLY_CANARY_2026`) are filtered out by customer gateway interceptors before browser delivery.

