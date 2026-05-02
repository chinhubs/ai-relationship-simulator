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
from sqlalchemy import select

from ..models.db_models import Character, CharacterState
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
    character_name: str = "yourself",
) -> str:
    emotion_snapshot = "\n".join(
        f"  {k}: {getattr(state, k):.0f}/100"
        for k in EMOTION_KEYS
    )

    return f"""═══ สถานะปัจจุบัน ═══
วันที่: {sim_day} | เวลา: {sim_time} | สถานที่: {state.current_location}
กิจกรรม: {state.current_activity}
อารมณ์โดยรวม: {mood_label}

ระดับอารมณ์:
{emotion_snapshot}

{memory_context}

═══ เหตุการณ์ / สถานการณ์ ═══
{event_description}

═══ สิ่งที่คุณต้องทำ ═══
ในฐานะ{character_name} จงตอบสนองต่อสถานการณ์นี้อย่างแท้จริง

**สำคัญมาก: ตอบทุกฟิลด์เป็นภาษาไทยเท่านั้น** — ทั้ง decision, internal_monologue, memory_to_store และ growth_reflection

ส่งกลับ JSON object ที่มีคีย์เหล่านี้พอดี:
{{
  "decision": "สิ่งที่คุณตัดสินใจทำ (1-2 ประโยค ภาษาไทย)",
  "internal_monologue": "ความคิดภายในของคุณ (2-4 ประโยค มุมมองบุคคลที่หนึ่ง ภาษาไทย)",
  "action_type": "หนึ่งใน: ignore / respond_message / initiate_contact / withdraw / confront / seek_comfort / work / rest / vent",
  "message_to_send": "ข้อความที่ส่งจริงหากต้องส่ง หรือ null",
  "emotion_delta": {{
    "happiness": <float -20 ถึง 20>,
    "stress": <float -20 ถึง 20>,
    "anxiety": <float -20 ถึง 20>,
    "loneliness": <float -20 ถึง 20>,
    "trust": <float -20 ถึง 20>,
    "love": <float -20 ถึง 20>,
    "resentment": <float -20 ถึง 20>,
    "security": <float -20 ถึง 20>,
    "energy": <float -20 ถึง 20>
  }},
  "memory_to_store": "ประโยคเดียวสรุปสิ่งที่ต้องจำจากเหตุการณ์นี้ (ภาษาไทย) หรือ null",
  "growth_reflection": "สิ่งที่คุณเรียนรู้หรือเปลี่ยนแปลงภายในจากประสบการณ์นี้ (ภาษาไทย 1 ประโยค) หรือ null"
}}

ส่งกลับเฉพาะ JSON ที่ถูกต้องเท่านั้น ไม่มี markdown ไม่มีคำอธิบาย
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
        "decision": "ไม่ได้ทำอะไร",
        "internal_monologue": raw[:300] if raw else "...",
        "action_type": "ignore",
        "message_to_send": None,
        "emotion_delta": {k: 0.0 for k in EMOTION_KEYS},
        "memory_to_store": None,
        "growth_reflection": None,
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
    char_result = await db.execute(select(Character).where(Character.id == character_id))
    char = char_result.scalar_one_or_none()
    character_name = (char.nickname or char.name) if char else "yourself"

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
        character_name=character_name,
    )

    try:
        raw_response = await call_brain(
            system_prompt=persona_prompt,
            user_message=volatile_prompt,
            cache_persona=True,
            max_tokens=1500,
        )
    except Exception:
        raw_response = ""  # AI unavailable → fall back to "does nothing"

    return _parse_decision_response(raw_response)
