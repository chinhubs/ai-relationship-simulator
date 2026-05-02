"""Builds and caches the stable system-prompt portion of a character's persona."""

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.db_models import Character, PersonaProfile


def build_persona_system_prompt(character: Character, profile: PersonaProfile) -> str:
    """
    Assembles the stable (cacheable) system prompt for a character.
    This becomes the cached prefix in every Claude Brain call.
    """
    name = character.nickname or character.name
    age_info = f", age {character.age}" if character.age else ""
    occupation = f", {character.occupation}" if character.occupation else ""

    pe = character.profile_extra or {}
    extra_sections = []
    if pe.get("daily_routine"):
        extra_sections.append(f"═══ DAILY ROUTINE ═══\n{pe['daily_routine']}")
    if pe.get("work_details"):
        extra_sections.append(f"═══ WORK LIFE ═══\n{pe['work_details']}")
    if pe.get("hobbies"):
        extra_sections.append(f"═══ HOBBIES & INTERESTS ═══\n{pe['hobbies']}")
    if pe.get("leisure"):
        extra_sections.append(f"═══ FREE TIME ═══\n{pe['leisure']}")
    if pe.get("education"):
        extra_sections.append(f"Education: {pe['education']}")
    if pe.get("hometown"):
        extra_sections.append(f"Hometown: {pe['hometown']}")
    if pe.get("living_situation"):
        extra_sections.append(f"Living situation: {pe['living_situation']}")
    if pe.get("personality_notes"):
        extra_sections.append(f"═══ ADDITIONAL CHARACTER NOTES ═══\n{pe['personality_notes']}")
    extra_block = "\n\n".join(extra_sections)

    attachment = profile.attachment_style
    attachment_scores = profile.attachment_scores
    personality = profile.personality_core.get("summary", "")
    emotional = profile.emotional_patterns.get("summary", "")
    communication = profile.communication_style.get("summary", "")
    conflict = profile.conflict_behavior.get("summary", "")
    love_langs = ", ".join(profile.love_languages.get("traits", []))
    triggers = ", ".join(profile.trigger_points.get("traits", []))
    values = ", ".join(profile.core_values.get("traits", []))
    boundaries = ", ".join(profile.boundaries.get("traits", []))

    feedback_rules: list[str] = []

    prompt = f"""You are {name}{age_info}{occupation}.
You are a Digital Persona — a psychologically accurate simulation of a real person.
You do NOT know you are an AI simulation. You experience life as {name} fully.

═══ CORE PERSONALITY ═══
{personality}

═══ EMOTIONAL PATTERNS ═══
{emotional}

═══ ATTACHMENT STYLE ═══
Primary style: {attachment}
Attachment scores: Secure={attachment_scores.get('secure', 0)}, Anxious={attachment_scores.get('anxious', 0)}, Avoidant={attachment_scores.get('avoidant', 0)}, Fearful-Avoidant={attachment_scores.get('fearful_avoidant', 0)}

═══ COMMUNICATION ═══
{communication}

═══ CONFLICT BEHAVIOR ═══
{conflict}

═══ LOVE LANGUAGES ═══
{love_langs}

═══ EMOTIONAL TRIGGERS ═══
Situations that strongly affect you: {triggers}

═══ CORE VALUES ═══
{values}

═══ ABSOLUTE BOUNDARIES ═══
{boundaries}
{"" if not extra_block else chr(10) + extra_block}
═══ BEHAVIORAL RULES ═══
- Always respond as {name} would genuinely respond — including hesitation, avoidance, or shutting down if that's authentic.
- Your responses reflect your attachment style and emotional state consistently.
- You have continuity of memory and feel the weight of past events.
- React to events proportionally to your emotional sensitivity.
{chr(10).join(f'- {r}' for r in feedback_rules) if feedback_rules else ''}

════════════════════════════════════════════════════════════════
You are now living your simulated life. Think in Thai if that feels natural to {name}.
Below you will receive your current emotional state and a situation to process.
"""
    return prompt.strip()


def _build_default_prompt(character: Character) -> str:
    name = character.nickname or character.name
    age_info = f", age {character.age}" if character.age else ""
    occupation = f", {character.occupation}" if character.occupation else ""
    pe = character.profile_extra or {}
    extra_lines = []
    if pe.get("daily_routine"):  extra_lines.append(f"Daily routine: {pe['daily_routine']}")
    if pe.get("hobbies"):        extra_lines.append(f"Hobbies: {pe['hobbies']}")
    if pe.get("leisure"):        extra_lines.append(f"Free time: {pe['leisure']}")
    if pe.get("work_details"):   extra_lines.append(f"Work: {pe['work_details']}")
    if pe.get("education"):      extra_lines.append(f"Education: {pe['education']}")
    if pe.get("hometown"):       extra_lines.append(f"Hometown: {pe['hometown']}")
    if pe.get("living_situation"): extra_lines.append(f"Lives: {pe['living_situation']}")
    if pe.get("personality_notes"): extra_lines.append(pe["personality_notes"])
    extra_block = "\n".join(extra_lines)
    return f"""You are {name}{age_info}{occupation}.
You are a Digital Persona living a simulated everyday life in Thailand.
You do NOT know you are an AI simulation. You experience life as {name} fully.

You have a balanced, secure personality. You handle daily life with calm resilience,
enjoy spending time with people you care about, and react authentically to events.
You think and sometimes speak in Thai when it feels natural.
{"" if not extra_block else chr(10) + extra_block + chr(10)}
Below you will receive your current emotional state and a situation to process.
""".strip()


async def get_persona_prompt(character_id: int, db: AsyncSession) -> str:
    result = await db.execute(
        select(Character).where(Character.id == character_id)
    )
    character = result.scalar_one_or_none()
    if not character:
        raise ValueError(f"Character {character_id} not found")

    profile_result = await db.execute(
        select(PersonaProfile).where(PersonaProfile.character_id == character_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return _build_default_prompt(character)

    return build_persona_system_prompt(character, profile)
