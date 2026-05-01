"""
Decision Engine — Claude-powered action selection.
Given the character's current state + incoming event, Claude decides:
  - What action the character takes
  - Their internal monologue
  - Emotion deltas
  - Any messages they send
"""

import json
import re
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.db_models import CharacterState
from ..brain.emotion_engine import EMOTION_KEYS, get_mood_label
from ..brain.memory_system import build_memory_context
from ..brain.persona_core import get_persona_prompt
from ..core.claude_client import call_brain


def _build_volatile_prompt(
    state: CharacterState,
    event_description: str,
    memory_context: str,
    sim_time: str,
    sim_day: int,
    mood_label: str,
) -> str:
    emotion_snapshot = "\n".join(
        f"  {k}: {getattr(state, k):.0f}/100"
        for k in EMOTION_KEYS
    )

    return f"""═══ CURRENT STATE ═══
Day: {sim_day} | Time: {sim_time} | Location: {state.current_location}
Activity: {state.current_activity}
Overall mood: {mood_label}

Emotion levels:
{emotion_snapshot}

{memory_context}

═══ EVENT / SITUATION ═══
{event_description}

═══ YOUR TASK ═══
As {state.character.name if hasattr(state, 'character') and state.character else 'yourself'}, respond to this situation authentically.

Return a JSON object with exactly these keys:
{{
  "decision": "what you decide to do (1-2 sentences)",
  "internal_monologue": "your inner thoughts (2-4 sentences, first person)",
  "action_type": "one of: ignore / respond_message / initiate_contact / withdraw / confront / seek_comfort / work / rest / vent",
  "message_to_send": "the actual message text if sending one, else null",
  "emotion_delta": {{
    "happiness": <float -20 to 20>,
    "stress": <float -20 to 20>,
    "anxiety": <float -20 to 20>,
    "loneliness": <float -20 to 20>,
    "trust": <float -20 to 20>,
    "love": <float -20 to 20>,
    "resentment": <float -20 to 20>,
    "security": <float -20 to 20>,
    "energy": <float -20 to 20>
  }},
  "memory_to_store": "one sentence summarizing what to remember from this event, or null"
}}

Return ONLY valid JSON. No markdown, no explanation.
"""


def _parse_decision_response(raw: str) -> dict:
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
        "decision": "does nothing",
        "internal_monologue": raw[:300] if raw else "...",
        "action_type": "ignore",
        "message_to_send": None,
        "emotion_delta": {k: 0.0 for k in EMOTION_KEYS},
        "memory_to_store": None,
    }


async def run_decision(
    db: AsyncSession,
    character_id: int,
    state: CharacterState,
    event_description: str,
    sim_day: int,
    sim_time: str,
    related_character_id: int | None = None,
) -> dict:
    persona_prompt = await get_persona_prompt(character_id, db)
    memory_context = await build_memory_context(
        db, character_id, sim_day, related_character_id=related_character_id
    )
    mood_label = get_mood_label(state)

    volatile_prompt = _build_volatile_prompt(
        state=state,
        event_description=event_description,
        memory_context=memory_context,
        sim_time=sim_time,
        sim_day=sim_day,
        mood_label=mood_label,
    )

    raw_response = await call_brain(
        system_prompt=persona_prompt,
        user_message=volatile_prompt,
        cache_persona=True,
        max_tokens=1500,
    )

    return _parse_decision_response(raw_response)
