"""Turn management and background summarization."""

import uuid
from typing import Optional


async def record_turn_and_summarize(
    session_id: str,
    turn_data: dict,
    store,
) -> None:
    """Record a conversation turn and trigger summarization if needed.

    Args:
        session_id: Chat session identifier
        turn_data: Dict with user_message, assistant_reply, backend_tool_calls, frontend_actions
        store: SQLAlchemyChatStore instance
    """
    messages = []

    if turn_data.get("user_message"):
        messages.append({
            "message_id": str(uuid.uuid4()),
            "role": "user",
            "content": turn_data["user_message"],
        })

    if turn_data.get("assistant_reply"):
        messages.append({
            "message_id": str(uuid.uuid4()),
            "role": "assistant",
            "content": turn_data["assistant_reply"],
            "tool_calls": turn_data.get("backend_tool_calls", []),
            "client_actions": turn_data.get("frontend_actions", []),
        })

    if messages:
        await store.append_messages(session_id=session_id, messages=messages)

    # Background summarization trigger every 4 turns
    turn_count = await store.count_turns(session_id)
    if turn_count >= 4 and turn_count % 4 == 0:
        # Generate a simple title from the first user message
        all_messages = await store.get_messages(session_id=session_id, user_id=None)
        if all_messages:
            first_msg = next((m["content"] for m in all_messages if m.get("role") == "user"), "")
            title = first_msg[:50] + ("..." if len(first_msg) > 50 else "")
            summary = f"Conversation with {turn_count} turns."
            await store.update_session_metadata(
                session_id=session_id,
                title=title or "Chat Session",
                summary=summary,
            )

