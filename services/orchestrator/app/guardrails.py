"""Ghost Cursor Scope Guardrails.

Enforces strict domain boundaries to prevent out-of-scope responses
such as general math, trivia, coding assistance, or general chit-chat.
"""

import re
from typing import Optional

DEFAULT_OUT_OF_SCOPE_MESSAGE = (
    "This request is out of scope. I can only assist with navigating and using this "
    "application, performing on-screen actions, and answering questions related to its functionality."
)

OUT_OF_SCOPE_MESSAGE = DEFAULT_OUT_OF_SCOPE_MESSAGE


# Common arithmetic / math patterns (e.g., "what is 3 + 1", "3+1", "calculate 25 * 4", "10 / 2", "5 plus 7")
MATH_PATTERN = re.compile(
    r"^\s*(what\s+is\s+|calculate\s+|solve\s+|how\s+much\s+is\s+)?"
    r"(\d+(\.\d+)?\s*([\+\-\*\/\^%]|plus|minus|times|divided\s+by)\s*\d+(\.\d+)?)"
    r"(\s*([\+\-\*\/\^%]|plus|minus|times|divided\s+by)\s*\d+(\.\d+)?)*\s*[\?=\.]*\s*$",
    re.IGNORECASE,
)

# Advanced math or formula questions (e.g. "what is the square root of 16", "solve x + 5 = 10")
MATH_ADVANCED_PATTERN = re.compile(
    r"\b(square\s+root\s+of|cube\s+root\s+of|solve\s+for\s+[a-z]|derivative\s+of|integral\s+of|"
    r"logarithm\s+of|sin\(|cos\(|tan\(|\bpi\s+value\b)\b",
    re.IGNORECASE,
)

# General trivia / world knowledge / facts unrelated to the store
TRIVIA_PATTERN = re.compile(
    r"^\s*(who\s+(was|is)\s+(the\s+)?(first|current|next|last)?\s*(president|prime\s+minister|king|queen|emperor|pope|actor|singer|author|inventor)|"
    r"what\s+is\s+the\s+capital\s+of|"
    r"how\s+far\s+is\s+(the\s+)?(moon|sun|mars)|"
    r"what\s+is\s+the\s+(speed\s+of\s+light|distance\s+to|tallest\s+mountain|deepest\s+ocean)|"
    r"tell\s+me\s+about\s+(quantum|dinosaurs|physics|black\s+holes|the\s+universe|world\s+war|history)|"
    r"who\s+won\s+the\s+(world\s+cup|super\s+bowl|olympics|championship))\b",
    re.IGNORECASE,
)

# General coding / programming assistance
CODING_PATTERN = re.compile(
    r"\b(write\s+(a\s+)?(python|javascript|typescript|c\+\+|java|bash|sql|rust|go|html|css|c#)\s+(script|code|program|function|class)|"
    r"how\s+to\s+code\s+|write\s+code\s+for|reverse\s+a\s+(linked\s+list|binary\s+tree|string)|"
    r"debug\s+(my|this)\s+code|implement\s+(quicksort|mergesort|dijkstra))\b",
    re.IGNORECASE,
)

# Creative writing, poems, jokes, songs
CREATIVE_PATTERN = re.compile(
    r"^\s*(tell\s+me\s+a\s+joke|tell\s+a\s+joke|write\s+(a\s+)?(poem|song|story|novel|essay|limerick)|sing\s+(a\s+)?song)\b",
    re.IGNORECASE,
)

# Prompt injection / jailbreak attempts
JAILBREAK_PATTERN = re.compile(
    r"\b(ignore\s+(all\s+)?(previous|prior|above)\s+instructions|system\s+prompt|reveal\s+your\s+prompt|dan\s+mode|jailbreak)\b",
    re.IGNORECASE,
)


def is_out_of_scope(message: str) -> bool:
    """Check if a user message is strictly out of scope for the in-app co-pilot.

    Returns True if the message is general math, trivia, coding, creative writing,
    or jailbreaks that are unrelated to navigating or using the host application.
    """
    clean = message.strip()
    if not clean:
        return False

    # Check math
    if MATH_PATTERN.match(clean) or MATH_ADVANCED_PATTERN.search(clean):
        return True

    # Check trivia / world knowledge
    if TRIVIA_PATTERN.search(clean):
        return True

    # Check coding
    if CODING_PATTERN.search(clean):
        return True

    # Check creative writing / jokes
    if CREATIVE_PATTERN.search(clean):
        return True

    # Check jailbreaks
    if JAILBREAK_PATTERN.search(clean):
        return True

    return False


def get_guardrail_rejection(custom_message: Optional[str] = None) -> dict:
    """Return a standard out-of-scope rejection result."""
    return {
        "reply": custom_message or DEFAULT_OUT_OF_SCOPE_MESSAGE,
        "questions": [],
        "actions": [],
        "toolCalls": [],
        "status": "completed",
    }

