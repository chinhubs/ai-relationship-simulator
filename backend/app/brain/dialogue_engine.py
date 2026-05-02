"""
Dialogue Engine — generates authentic character messages/responses.
Builds on top of the Decision Engine result when a message needs to be sent.
"""

import json
import re
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.db_models import CharacterState
from ..brain.emotion_engine import get_mood_label
from ..brain.persona_core import get_persona_prompt
from ..core.claude_client import call_brain


def _build_dialogue_prompt(
    sender_name: str,
    receiver_name: str,
    state: CharacterState,
    context: str,
    decision: str,
    mood_label: str,
    relationship_context: str = "",
) -> str:
    return f"""═══ DIALOGUE GENERATION ═══
You are {sender_name}. You need to send a message to {receiver_name}.

Your current mood: {mood_label}
Your happiness: {state.happiness:.0f}/100 | stress: {state.stress:.0f}/100 | love: {state.love:.0f}/100

{relationship_context}

Context leading to this message:
{context}

Your decided action: {decision}

Write the actual message {sender_name} would send to {receiver_name}.
- Use {sender_name}'s authentic voice, vocabulary, and communication style
- Reflect current emotional state naturally (don't state emotions explicitly)
- May use Thai language, LINE-style abbreviations, or emoji if character typically does
- Keep it realistic in length — like a real text message or LINE message
- Do NOT include quotation marks around the message

Return JSON:
{{
  "message": "the actual message text",
  "tone": "one of: warm / cold / playful / hurt / anxious / loving / angry / neutral",
  "subtext": "what the sender really means or feels but didn't say directly"
}}

Return ONLY valid JSON.
"""


def _parse_dialogue_response(raw: str) -> dict:
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {
        "message": raw.strip('"\'') if raw else "...",
        "tone": "neutral",
        "subtext": "",
    }


async def generate_message(
    db: AsyncSession,
    sender_id: int,
    sender_name: str,
    receiver_name: str,
    state: CharacterState,
    context: str,
    decision: str,
    relationship_context: str = "",
) -> dict:
    persona_prompt = await get_persona_prompt(sender_id, db)
    mood_label = get_mood_label(state)

    dialogue_prompt = _build_dialogue_prompt(
        sender_name=sender_name,
        receiver_name=receiver_name,
        state=state,
        context=context,
        decision=decision,
        mood_label=mood_label,
        relationship_context=relationship_context,
    )

    raw_response, tok_usage = await call_brain(
        system_prompt=persona_prompt,
        user_message=dialogue_prompt,
        cache_persona=True,
        max_tokens=800,
    )

    result = _parse_dialogue_response(raw_response)
    result["_token_usage"] = tok_usage
    return result


async def generate_diary_entry(
    db: AsyncSession,
    character_id: int,
    character_name: str,
    state: CharacterState,
    key_events_today: list[str],
    sim_day: int,
) -> str:
    """Generate an end-of-day diary/reflection entry."""
    persona_prompt = await get_persona_prompt(character_id, db)
    mood_label = get_mood_label(state)
    events_text = "\n".join(f"  • {e}" for e in key_events_today) if key_events_today else "  (nothing notable)"

    diary_prompt = f"""═══ END OF DAY DIARY ENTRY ═══
It is the end of Day {sim_day} for {character_name}.

Today's mood arc: ending on {mood_label}
Happiness: {state.happiness:.0f} | Stress: {state.stress:.0f} | Love: {state.love:.0f} | Loneliness: {state.loneliness:.0f}

Key events today:
{events_text}

Write a diary/journal entry as {character_name} reflecting on their day.
- Write in first person, authentic voice
- 3-5 sentences, natural and personal
- May be in Thai or Thai-English mix
- Reflect genuine emotions without over-dramatizing
- No headers, no bullet points — just prose

Return only the diary text, no JSON.
"""

    text, _ = await call_brain(
        system_prompt=persona_prompt,
        user_message=diary_prompt,
        cache_persona=True,
        max_tokens=600,
    )
    return text
