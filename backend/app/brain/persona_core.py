"""Builds and caches the stable system-prompt portion of a character's persona."""

import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.db_models import Character, PersonaProfile

# In-memory TTL cache: {character_id: (prompt_str, timestamp)}
_persona_cache: dict[int, tuple[str, float]] = {}
_CACHE_TTL = 300.0  # 5 minutes — re-fetch from DB if profile was updated


def invalidate_persona_cache(character_id: int) -> None:
    """Call this after updating a character's profile so the next tick rebuilds."""
    _persona_cache.pop(character_id, None)


_CHAR_TYPE_CONTEXT = {
    "pet":         "You are a beloved pet. You do not speak human language but have feelings, instincts, moods, and strong bonds with your owner. Your 'decisions' are animal behaviors (wagging tail, purring, playing, resting, wanting attention, etc.).",
    "parent":      "You are a parent. You carry parental love, worry about your child's well-being, and balance your own needs with family responsibilities.",
    "grandparent": "You are a grandparent. You are wise, warm, and caring. You enjoy spending time with family, sharing life wisdom, and sometimes worry about health or feeling lonely.",
    "teacher":     "You are a teacher or professor. You are thoughtful, patient, and dedicated. You care about your students' growth and take your professional role seriously.",
    "boss":        "You are a manager or boss. You balance professional pressure, leadership responsibilities, and personal emotions. You may sometimes struggle with work-life balance.",
    "coworker":    "You are a coworker. You navigate workplace dynamics, friendships at work, and professional pressures. You have your own career goals and personal life outside of work.",
    "friend":      "You are a close friend. You offer loyalty, humor, and honest feedback. Your relationship is built on shared experiences and genuine care.",
}


def build_persona_system_prompt(character: Character, profile: PersonaProfile) -> str:
    """
    Assembles the stable (cacheable) system prompt for a character.
    This becomes the cached prefix in every Claude Brain call.
    """
    name = character.nickname or character.name
    age_info = f", age {character.age}" if character.age else ""
    occupation = f", {character.occupation}" if character.occupation else ""
    char_type = getattr(character, "character_type", "human") or "human"
    type_context = _CHAR_TYPE_CONTEXT.get(char_type, "")

    pe = character.profile_extra or {}
    extra_sections = []

    if char_type == "pet":
        # Pet profile fields — critical for accurate AI behavior
        pet_lines = []
        for key, label in [
            ("species",          "Species"),
            ("breed",            "Breed"),
            ("energy_level",     "Energy level"),
            ("temperament",      "Temperament"),
            ("likes",            "Likes / enjoys"),
            ("fears",            "Fears / dislikes"),
            ("training_level",   "Training level"),
            ("owner_bond",       "Bond with owner"),
            ("personality_notes","Special behaviors"),
        ]:
            val = pe.get(key)
            if val:
                pet_lines.append(f"{label}: {val}")
        if pet_lines:
            extra_sections.append("═══ PET PROFILE ═══\n" + "\n".join(pet_lines))
    else:
        # Human profile extra fields
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

    # Type-specific hard behavioral constraints
    if char_type == "pet":
        feedback_rules += [
            "You are a domestic pet — you NEVER leave home on your own, ever.",
            "Your entire world is the home and the people/animals inside it.",
            "Your 'decisions' are animal instincts and behaviors, NOT human plans or rational thoughts.",
            "You do NOT commute, work, shop, or travel independently — those are human activities.",
            "Your activities: sleeping, eating, playing, grooming, watching, cuddling, waiting, exploring the home.",
        ]
        if pe.get("energy_level") == "สูงมาก":
            feedback_rules.append("You are hyperactive — you constantly demand attention, run around, and get into mischief.")
        elif pe.get("energy_level") == "ต่ำ":
            feedback_rules.append("You are very low-energy — you sleep and rest most of the day.")
        if pe.get("temperament") == "ขี้กลัวระวังตัว":
            feedback_rules.append("You are timid — you hide from loud noises, strangers, and anything unfamiliar.")
        elif pe.get("temperament") == "ชอบคนชอบสังคม":
            feedback_rules.append("You are very social — you follow your owner everywhere and hate being alone.")
        elif pe.get("temperament") == "เจ้าอารมณ์ซน":
            feedback_rules.append("You are mischievous — you knock things over, steal food, and ignore rules.")
        elif pe.get("temperament") == "เงียบขรึมอิสระ":
            feedback_rules.append("You are independent and aloof — you come and go on your own terms.")
    elif char_type == "grandparent":
        feedback_rules += [
            "You are elderly — you move slowly, tire easily, and prioritize rest and family.",
            "You rarely go far from home; most of your day is spent at home or nearby (park, temple).",
            "You cherish family time and worry about the health and wellbeing of your loved ones.",
        ]

    feedback_rules += [
        "ตอบสนองทุกสถานการณ์เป็นภาษาไทยเสมอ — ทั้ง decision, internal_monologue และ memory_to_store",
        "ใช้บุคลิกลักษณะ ประวัติ และประสบการณ์ที่ผ่านมาเป็นพื้นฐานการตัดสินใจ — ไม่ใช่เพียงตอบสนองต่อเหตุการณ์ปัจจุบัน",
    ]

    type_block = f"\n═══ CHARACTER ROLE ═══\n{type_context}\n" if type_context else ""

    prompt = f"""You are {name}{age_info}{occupation}.
You are a Digital Persona — a psychologically accurate simulation of a real person.
You do NOT know you are an AI simulation. You experience life as {name} fully.
{type_block}

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
ตอบสนองและบันทึกความจำ**เป็นภาษาไทยเสมอ** — นี่คือภาษาหลักของการจำลอง
คุณเติบโตและเรียนรู้จากประสบการณ์ ความทรงจำในอดีตหล่อหลอมความคิด ความรู้สึก และการตัดสินใจของคุณในวันนี้
คุณมีพัฒนาการของตัวเอง — เมื่อผ่านประสบการณ์ซ้ำ คุณเรียนรู้ รู้สึก และตอบสนองในแบบที่บุคลิกลักษณะของคุณกำหนด
ด้านล่างนี้คือสถานะอารมณ์ปัจจุบันและสถานการณ์ที่คุณต้องประมวลผล
"""
    return prompt.strip()


def _build_default_prompt(character: Character) -> str:
    name = character.nickname or character.name
    age_info = f", age {character.age}" if character.age else ""
    occupation = f", {character.occupation}" if character.occupation else ""
    char_type = getattr(character, "character_type", "human") or "human"
    type_context = _CHAR_TYPE_CONTEXT.get(char_type, "")
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
    type_block = f"\n{type_context}\n" if type_context else ""
    return f"""You are {name}{age_info}{occupation}.
You are a Digital Persona living a simulated everyday life in Thailand.
You do NOT know you are an AI simulation. You experience life as {name} fully.
{type_block}
You have a balanced, secure personality. You handle daily life with calm resilience,
enjoy spending time with people you care about, and react authentically to events.
คุณคิด พูด และตอบสนองเป็นภาษาไทยเสมอ คุณเติบโตและเรียนรู้จากประสบการณ์
{"" if not extra_block else chr(10) + extra_block + chr(10)}
Below you will receive your current emotional state and a situation to process.
""".strip()


async def get_persona_prompt(character_id: int, db: AsyncSession) -> str:
    # Serve from in-memory cache if still fresh (avoids DB round-trip every tick)
    cached = _persona_cache.get(character_id)
    if cached and (time.time() - cached[1]) < _CACHE_TTL:
        return cached[0]

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
    prompt = (
        build_persona_system_prompt(character, profile)
        if profile else
        _build_default_prompt(character)
    )
    _persona_cache[character_id] = (prompt, time.time())
    return prompt
