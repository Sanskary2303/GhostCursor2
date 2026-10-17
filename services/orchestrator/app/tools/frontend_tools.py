"""
Ghost Cursor Frontend Tool Definitions
========================================
Tool functions that get registered with the ADK agent to perform
frontend actions.  Each tool returns a dict describing the action
the SDK should execute on the client side.
"""

from __future__ import annotations

from typing import Any


def navigate(target_page: str, explanation: str) -> dict[str, Any]:
    """
    Navigate the user to a different page or view in the application.

    Args:
        target_page: The page identifier or route to navigate to.
        explanation: Human-readable reason for the navigation.

    Returns:
        Action descriptor for the SDK.
    """
    return {
        "tool": "navigate",
        "parameters": {
            "target_page": target_page,
            "explanation": explanation,
        },
    }


def click(target_id: str, explanation: str) -> dict[str, Any]:
    """
    Click an interactive element in the UI.

    Args:
        target_id: Logical ID of the element to click.
        explanation: Human-readable reason for the click.

    Returns:
        Action descriptor for the SDK.
    """
    return {
        "tool": "click",
        "parameters": {
            "target_id": target_id,
            "explanation": explanation,
        },
    }


def fill_input(target_id: str, value: str, explanation: str) -> dict[str, Any]:
    """
    Fill an input field with a value.

    Args:
        target_id: Logical ID of the input element.
        value: The value to fill into the input.
        explanation: Human-readable reason for the fill.

    Returns:
        Action descriptor for the SDK.
    """
    return {
        "tool": "fill_input",
        "parameters": {
            "target_id": target_id,
            "value": value,
            "explanation": explanation,
        },
    }


def toggle_switch(target_id: str, state: bool, explanation: str) -> dict[str, Any]:
    """
    Toggle a switch or checkbox element.

    Args:
        target_id: Logical ID of the switch element.
        state: Desired state — True for on, False for off.
        explanation: Human-readable reason for the toggle.

    Returns:
        Action descriptor for the SDK.
    """
    return {
        "tool": "toggle_switch",
        "parameters": {
            "target_id": target_id,
            "state": state,
            "explanation": explanation,
        },
    }


def guided_tour(steps: list[dict[str, str]]) -> dict[str, Any]:
    """
    Launch a guided tour highlighting multiple UI elements in sequence.

    Args:
        steps: List of step dicts, each with at least 'target_id' and 'message'.

    Returns:
        Action descriptor for the SDK.
    """
    return {
        "tool": "guided_tour",
        "parameters": {
            "steps": steps,
        },
    }


def ask_clarification(question: str, options: list[str]) -> dict[str, Any]:
    """
    Ask the user a clarification question before proceeding.

    Args:
        question: The question text.
        options: Suggested answer options.

    Returns:
        Action descriptor for the SDK.
    """
    return {
        "tool": "ask_clarification",
        "parameters": {
            "question": question,
            "options": options,
        },
    }


# ---------------------------------------------------------------------------
# All frontend tools as a list for convenient registration
# ---------------------------------------------------------------------------

FRONTEND_TOOLS = [
    navigate,
    click,
    fill_input,
    toggle_switch,
    guided_tour,
    ask_clarification,
]
