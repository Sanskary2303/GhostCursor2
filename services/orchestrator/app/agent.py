"""Google ADK Agent Definition and Mock Provider.

Defines the Ghost Cursor agent with fixed frontend action tools
and a mock provider for local testing without GCP credentials.
"""

from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Frontend Action Tool Functions
# ---------------------------------------------------------------------------
def navigate(target_page: str, explanation: str) -> dict:
    """Navigate to another page within the application."""
    return {"action": "navigate", "target_page": target_page, "explanation": explanation}


def click(target_id: str, explanation: str) -> dict:
    """Click a registered button, link, or tab."""
    return {"action": "click", "target_id": target_id, "explanation": explanation}


def fill_input(target_id: str, value: str, explanation: str) -> dict:
    """Type or set a value in a registered input or textarea."""
    return {"action": "fill_input", "target_id": target_id, "value": value, "explanation": explanation}


def select_option(target_id: str, option: str, explanation: str) -> dict:
    """Select an option from a dropdown."""
    return {"action": "select_option", "target_id": target_id, "option": option, "explanation": explanation}


def toggle_switch(target_id: str, state: bool, explanation: str) -> dict:
    """Toggle a switch or checkbox to true or false."""
    return {"action": "toggle_switch", "target_id": target_id, "state": state, "explanation": explanation}


def guided_tour(steps: List[Dict[str, str]]) -> dict:
    """Run an interactive guided tour spotlighting elements with explanations."""
    return {"action": "guided_tour", "steps": steps}


def ask_clarification(question: str, options: List[str]) -> dict:
    """Ask the user a clarifying question before proceeding."""
    return {"action": "ask_clarification", "question": question, "options": options}


# All frontend tool functions
FRONTEND_TOOLS = [navigate, click, fill_input, select_option, toggle_switch, guided_tour, ask_clarification]


def create_ghost_agent(
    brain_content: str,
    available_targets: list,
    current_context: dict,
    customer_backend_tools: Optional[list] = None,
) -> dict:
    """Build the agent configuration dict.

    In a real deployment with google-adk installed, this would return
    an actual google.adk.agents.llm_agent.Agent. For the hackathon
    baseline, we return a config dict used by the MockProvider.
    """
    instruction = f"""You are Ghost Cursor, an autonomous UI co-pilot.
You assist users by invoking frontend action tools to operate the web interface,
or querying backend knowledge tools for customer database/business context.

### BUSINESS KNOWLEDGE:
{brain_content}

### REGISTERED AVAILABLE UI TARGETS:
{available_targets}

### LIVE CLIENT CONTEXT:
Current Page: {current_context.get('page', 'unknown')}
Values on Screen: {current_context.get('values', {})}

### RULES:
1. Only use target IDs that are explicitly registered.
2. If an action requires moving to another page first, invoke 'navigate' before interacting with page targets.
3. If user intent is ambiguous or missing required fields, invoke 'ask_clarification'.
4. Query customer backend tools whenever domain data is needed before taking action.
5. Only return ONE tool invocation type per response turn.
"""
    tools = list(FRONTEND_TOOLS)
    if customer_backend_tools:
        tools.extend(customer_backend_tools)

    return {
        "name": "ghost_cursor_orchestrator",
        "model": "gemini-2.0-flash",
        "instruction": instruction,
        "tools": tools,
        "context": current_context,
    }


class MockAgentProvider:
    """Deterministic mock agent that recognizes common patterns.

    Returns structured tool calls matching expected patterns
    for local testing without real GCP/Gemini credentials.
    """

    def _match_patterns(self, message: str, context: dict, targets: list) -> dict:
        """Pattern-match user messages to generate realistic tool call responses."""
        msg = message.lower().strip()
        page = context.get("page", "")

        # --- Dark mode / theme ---
        if any(kw in msg for kw in ["dark mode", "dark theme", "switch theme", "appearance"]):
            actions = []
            if page != "settings":
                actions.append({
                    "id": "act_1",
                    "tool": "navigate",
                    "parameters": {"target_page": "settings", "explanation": "Navigating to Settings to change the theme."},
                })
            actions.append({
                "id": "act_2" if actions else "act_1",
                "tool": "toggle_switch",
                "parameters": {"target_id": "settings.theme_toggle", "state": True, "explanation": "Switching the appearance to Dark Mode."},
            })
            return {
                "reply": "I'll switch the appearance to Dark Mode for you.",
                "actions": actions,
                "status": "awaiting_actions",
            }

        # --- Add to cart ---
        if "add" in msg and "cart" in msg:
            actions = []
            # Extract size
            import re
            size_match = re.search(r"size\s*(\d+\.?\d*)", msg)
            size = size_match.group(1) if size_match else "10"

            # Extract product
            product_page = "products/air-max-90"  # default
            if "jordan" in msg:
                product_page = "products/air-jordan-1"
            elif "ultra" in msg or "boost" in msg:
                product_page = "products/ultra-boost"
            elif "550" in msg or "new balance" in msg:
                product_page = "products/nb-550"
            elif "chuck" in msg or "converse" in msg:
                product_page = "products/chuck-taylor"
            elif "dunk" in msg:
                product_page = "products/dunk-low"

            if not page.startswith("product"):
                actions.append({
                    "id": "act_1",
                    "tool": "navigate",
                    "parameters": {"target_page": product_page, "explanation": f"Navigating to the product page."},
                })

            act_offset = len(actions) + 1
            actions.append({
                "id": f"act_{act_offset}",
                "tool": "click",
                "parameters": {"target_id": f"product.size.{size}", "explanation": f"Selecting size {size}."},
            })
            actions.append({
                "id": f"act_{act_offset + 1}",
                "tool": "click",
                "parameters": {"target_id": "product.add_to_cart_btn", "explanation": "Adding the item to your cart."},
            })
            return {
                "reply": f"I'll add this item in size {size} to your cart.",
                "actions": actions,
                "status": "awaiting_actions",
            }

        # --- Checkout ---
        if "checkout" in msg:
            return {
                "reply": None,
                "questions": [{"question": "Which shipping address should I use?", "options": ["123 Main St, New York, NY 10001 (saved)", "Enter a new address"]}],
                "actions": [],
                "status": "awaiting_answer",
            }

        # --- Order tracking ---
        if "order" in msg and ("track" in msg or "where" in msg or "status" in msg):
            import re
            order_match = re.search(r"(SH-\d+|order\s*#?\s*\d+)", msg, re.IGNORECASE)
            if order_match:
                return {
                    "reply": f"Let me look up {order_match.group(1)} for you.",
                    "toolCalls": [{"id": "tc_1", "tool": "lookup_order", "parameters": {"order_id": order_match.group(1)}}],
                    "actions": [],
                    "status": "awaiting_tools",
                }
            return {
                "reply": None,
                "questions": [{"question": "Which order would you like to track?", "options": ["SH-1024", "SH-1025", "SH-1026"]}],
                "actions": [],
                "status": "awaiting_answer",
            }

        # --- Guided tour ---
        if "how" in msg and ("track" in msg or "return" in msg or "find" in msg or "order" in msg):
            return {
                "reply": "Let me show you how! Follow this guided tour.",
                "actions": [{
                    "id": "act_1",
                    "tool": "guided_tour",
                    "parameters": {"steps": [
                        {"target_id": "nav.orders", "message": "First, click on Orders in the navigation bar."},
                        {"target_id": "orders.item.SH-1024", "message": "Here's your most recent order — SH-1024."},
                        {"target_id": "orders.tracking_link", "message": "Click this link to see real-time tracking details."},
                    ]},
                }],
                "status": "awaiting_actions",
            }

        # --- Stock / sizes ---
        if "size" in msg or "stock" in msg or "available" in msg:
            values = context.get("values", {})
            return {
                "reply": "Based on the current page, here are the available sizes: 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13. Would you like me to add one to your cart?",
                "actions": [],
                "status": "completed",
            }

        # --- Fill form ---
        if "fill" in msg or "address" in msg:
            actions = []
            if page != "checkout":
                actions.append({
                    "id": "act_1",
                    "tool": "navigate",
                    "parameters": {"target_page": "checkout", "explanation": "Navigating to checkout page."},
                })
            act_offset = len(actions) + 1
            actions.extend([
                {"id": f"act_{act_offset}", "tool": "fill_input", "parameters": {"target_id": "checkout.address.street", "value": "123 Main St", "explanation": "Filling in street address."}},
                {"id": f"act_{act_offset+1}", "tool": "fill_input", "parameters": {"target_id": "checkout.address.city", "value": "New York", "explanation": "Filling in city."}},
                {"id": f"act_{act_offset+2}", "tool": "fill_input", "parameters": {"target_id": "checkout.address.state", "value": "NY", "explanation": "Filling in state."}},
                {"id": f"act_{act_offset+3}", "tool": "fill_input", "parameters": {"target_id": "checkout.address.zip", "value": "10001", "explanation": "Filling in zip code."}},
            ])
            return {
                "reply": "I'll fill in the shipping address for you.",
                "actions": actions,
                "status": "awaiting_actions",
            }

        # --- Default: contextual text reply ---
        page_descriptions = {
            "dashboard": "You're on the ShopHive home page. I can see the product catalog with sneakers and sportswear. Would you like me to help you find something specific or add items to your cart?",
            "products": "You're viewing a product detail page. I can see the available sizes and pricing. Would you like me to add this item to your cart?",
            "cart": "You're on the cart page. I can see your cart items and totals. Would you like to proceed to checkout or apply a promo code?",
            "checkout": "You're on the checkout page. I can help fill in your shipping address and complete the order.",
            "orders": "You're viewing your order history. I can help you track a specific order or show you how returns work.",
            "settings": "You're on the settings page. I can help you change your theme, notification preferences, or update your shipping address.",
        }
        default_reply = page_descriptions.get(
            page,
            f"I'm Ghost Cursor, your AI co-pilot for ShopHive! I can help you navigate the store, add items to your cart, track orders, and more. Just tell me what you'd like to do.",
        )
        return {
            "reply": default_reply,
            "actions": [],
            "status": "completed",
        }

    async def generate(self, message: str, context: dict, brain: str, targets: list, tools: list) -> dict:
        """Generate a mock agent response based on pattern matching."""
        result = self._match_patterns(message, context, targets)

        # Ensure all required fields
        return {
            "reply": result.get("reply"),
            "questions": result.get("questions", []),
            "actions": result.get("actions", []),
            "toolCalls": result.get("toolCalls", []),
            "status": result.get("status", "completed"),
        }

    async def continue_with_results(self, run_state: dict, results: list) -> dict:
        """Continue generation after receiving tool/action results."""
        # For tool results, generate a summary reply
        all_ok = all(r.get("ok", False) for r in results)
        if all_ok:
            outputs = [r.get("output", "") for r in results if r.get("output")]
            if outputs:
                reply = f"Here's what I found: {'; '.join(str(o) for o in outputs)}"
            else:
                reply = "Done! All actions completed successfully."
        else:
            errors = [r.get("error", "Unknown error") for r in results if not r.get("ok")]
            reply = f"Some actions couldn't be completed: {'; '.join(errors)}"

        return {
            "reply": reply,
            "questions": [],
            "actions": [],
            "toolCalls": [],
            "status": "completed",
        }

