"""
Tick Engine — the core simulation loop.
Each tick advances the simulation by 60 minutes of sim-time.
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.db_models import (
    Character, CharacterState, SimulationTick, SimulationStatus,
    EmotionSnapshot,
)
from ..brain.emotion_engine import (
    apply_decay, apply_delta, apply_activity_effects,
    parse_ai_emotion_delta, EmotionDelta, EMOTION_KEYS,
)
from ..brain.decision_engine import run_decision
from ..brain.memory_system import (
    add_memory, MemoryLayer,
    create_daily_summary, prune_old_memories,
)
from ..brain.relationship_manager import (
    update_relationship, derive_relationship_deltas_from_action,
    build_relationship_context_string, get_or_create_relationship,
)
from ..simulation.daily_routine import get_routine_slot, personalise_work_slot, is_weekend, advance_time
from ..simulation.event_processor import process_events_for_tick


_NOTABLE_ACTION_TYPES = {
    "respond_message", "initiate_contact", "confront",
    "seek_comfort", "vent", "withdraw",
}

_AI_SKIP_INTERVAL = 2  # call AI every Nth routine tick to reduce costs


def _should_skip_ai(event_descriptions: list, state: CharacterState, tick_number: int) -> bool:
    if event_descriptions:
        return False
    if tick_number % _AI_SKIP_INTERVAL == 0:
        return False
    return all(15 <= getattr(state, k, 50) <= 85 for k in ("happiness", "stress", "anxiety", "loneliness"))


def _routine_decision() -> dict:
    return {
        "decision": "ทำกิจกรรมตามปกติ",
        "internal_monologue": None,
        "action_type": "ignore",
        "message_to_send": None,
        "emotion_delta": {k: 0.0 for k in EMOTION_KEYS},
        "memory_to_store": None,
        "growth_reflection": None,
        "_token_usage": {},
    }


def _determine_notable(
    decision_result: dict,
    event_descriptions: list,
    ai_delta_raw: dict,
) -> tuple[bool, str | None]:
    """Return (is_notable, reason_string) for a tick."""
    reasons = []

    if event_descriptions:
        reasons.append("⚡ มีเหตุการณ์")

    action_type = decision_result.get("action_type", "ignore")
    if action_type in _NOTABLE_ACTION_TYPES:
        reasons.append(f"💬 {action_type}")

    max_delta = max((abs(float(v)) for v in ai_delta_raw.values()), default=0.0)
    if max_delta >= 12:
        reasons.append(f"😤 กระทบจิตใจ ±{round(max_delta)}")

    if decision_result.get("memory_to_store"):
        reasons.append("🧠 จดจำ")

    if reasons:
        return True, " · ".join(reasons)
    return False, None


async def _get_state(db: AsyncSession, character_id: int) -> CharacterState | None:
    result = await db.execute(
        select(CharacterState).where(CharacterState.character_id == character_id)
    )
    return result.scalar_one_or_none()


async def run_tick(
    db: AsyncSession,
    character_id: int,
    related_character_id: int | None = None,
) -> dict:
    """
    Execute one simulation tick for a character.
    Returns a summary dict of what happened.
    """
    state = await _get_state(db, character_id)
    if state is None:
        raise ValueError(f"No CharacterState for character {character_id}")

    if state.simulation_status not in (SimulationStatus.RUNNING, "running"):
        raise RuntimeError(f"Simulation not running for character {character_id}")

    tick_number = state.tick_count + 1
    sim_day = state.sim_day
    sim_time = state.current_sim_time
    weekend = is_weekend(sim_day)

    # Fetch character once — used for type-aware routine and dialogue
    _char_res = await db.execute(select(Character).where(Character.id == character_id))
    _char = _char_res.scalar_one_or_none()
    char_type = (_char.character_type or "human") if _char else "human"

    routine = get_routine_slot(sim_time, is_weekend=weekend, char_type=char_type)
    # Override generic "office" slots with the character's actual workplace
    if _char:
        pe = _char.profile_extra or {}
        routine = personalise_work_slot(
            routine,
            occupation=_char.occupation or "",
            work_details=pe.get("work_details", "") or "",
            daily_routine_notes=pe.get("daily_routine", "") or "",
            sim_day=sim_day,
            char_id=character_id,
        )
    state.current_location = routine.location
    state.current_activity = routine.activity

    # 1. Natural decay toward baseline
    decayed = apply_decay(state)
    for k, v in decayed.items():
        setattr(state, k, v)

    # 2. Activity-based emotion effects
    activity_delta = apply_activity_effects(routine.activity, state)
    activity_updated = apply_delta(state, activity_delta)
    for k, v in activity_updated.items():
        setattr(state, k, v)

    # 3. Process pending injected events
    event_descriptions, event_emotion_delta = await process_events_for_tick(
        db, character_id, state, tick_number, sim_day, sim_time
    )

    # 4. Build situation description for Claude
    if event_descriptions:
        situation = "มีหลายสิ่งที่เกิดขึ้น:\n" + "\n---\n".join(event_descriptions)
    else:
        situation = f"เวลา {sim_time} คุณกำลัง{state.current_activity} ที่ {state.current_location} ไม่มีเหตุการณ์พิเศษ"

    # 5. AI Decision Engine (skip on routine ticks to reduce API cost)
    _tick_usage: dict = {}
    if _should_skip_ai(event_descriptions, state, tick_number):
        decision_result = _routine_decision()
    else:
        decision_result = await run_decision(
            db=db,
            character_id=character_id,
            state=state,
            event_description=situation,
            sim_day=sim_day,
            sim_time=sim_time,
            related_character_id=related_character_id,
        )
    for k, v in (decision_result.get("_token_usage") or {}).items():
        _tick_usage[k] = _tick_usage.get(k, 0) + (v or 0)

    # 6. Apply AI emotion delta
    ai_delta_raw = decision_result.get("emotion_delta", {})
    ai_delta = parse_ai_emotion_delta(ai_delta_raw)
    ai_applied = apply_delta(state, ai_delta)
    for k, v in ai_applied.items():
        setattr(state, k, v)

    # 7. Apply injected event emotion impact
    if event_emotion_delta:
        event_ed = EmotionDelta(**{k: event_emotion_delta.get(k, 0.0) for k in EMOTION_KEYS})
        event_applied = apply_delta(state, event_ed)
        for k, v in event_applied.items():
            setattr(state, k, v)

    # 8. Store memories — short-term always; significant events to episodic; growth to semantic
    memory_text = decision_result.get("memory_to_store")
    max_delta_val = max((abs(float(v)) for v in ai_delta_raw.values()), default=0.0)

    if memory_text:
        await add_memory(
            db=db,
            character_id=character_id,
            content=memory_text,
            layer=MemoryLayer.SHORT_TERM,
            emotional_valence=ai_delta.happiness,
            emotional_intensity=abs(ai_delta.happiness) / 20.0,
            importance_score=0.3,
            sim_day=sim_day,
            sim_time=sim_time,
        )
    else:
        # Gap-fill: always record what the character did this tick so no hour is lost
        routine_note = f"{state.current_activity} ที่ {state.current_location}"
        await add_memory(
            db=db,
            character_id=character_id,
            content=routine_note,
            layer=MemoryLayer.SHORT_TERM,
            emotional_valence=0.0,
            emotional_intensity=0.05,
            importance_score=0.1,
            sim_day=sim_day,
            sim_time=sim_time,
        )

    # Auto-promote to episodic when emotion impact is significant
    if max_delta_val >= 10.0 and memory_text:
        await add_memory(
            db=db,
            character_id=character_id,
            content=memory_text,
            layer=MemoryLayer.EPISODIC,
            emotional_valence=ai_delta.happiness,
            emotional_intensity=min(1.0, max_delta_val / 20.0),
            importance_score=min(1.0, max_delta_val / 15.0),
            related_character_id=related_character_id,
            sim_day=sim_day,
            sim_time=sim_time,
        )

    # Store growth reflection to semantic memory (character development/learning)
    growth_note = decision_result.get("growth_reflection")
    if growth_note and len(growth_note) > 8:
        await add_memory(
            db=db,
            character_id=character_id,
            content=growth_note,
            layer=MemoryLayer.SEMANTIC,
            emotional_valence=ai_delta.happiness,
            emotional_intensity=0.5,
            importance_score=0.7,
            sim_day=sim_day,
            sim_time=sim_time,
        )

    # 9. Update relationship if a message was sent to the related character
    action_type = decision_result.get("action_type", "ignore")
    tone = "neutral"
    if decision_result.get("message_to_send") and related_character_id:
        from ..brain.dialogue_engine import generate_message
        char = _char  # already fetched above
        sender_name = (char.nickname or char.name) if char else "Character"

        rel = await get_or_create_relationship(db, character_id, related_character_id)
        rel_context = build_relationship_context_string(rel)
        dialogue = await generate_message(
            db=db,
            sender_id=character_id,
            sender_name=sender_name,
            receiver_name="the other person",
            state=state,
            context=situation,
            decision=decision_result.get("decision", ""),
            relationship_context=rel_context,
        )
        tone = dialogue.get("tone", "neutral")
        decision_result["generated_message"] = dialogue.get("message", "")
        decision_result["message_tone"] = tone
        decision_result["message_subtext"] = dialogue.get("subtext", "")
        for k, v in (dialogue.get("_token_usage") or {}).items():
            _tick_usage[k] = _tick_usage.get(k, 0) + (v or 0)

        rel_deltas = derive_relationship_deltas_from_action(action_type, tone)
        await update_relationship(
            db=db,
            char_a_id=character_id,
            char_b_id=related_character_id,
            sim_day=sim_day,
            interaction_type=action_type,
            **rel_deltas,
        )

    # 10. Record emotion snapshot every 4 ticks
    if tick_number % 4 == 0:
        snapshot = EmotionSnapshot(
            character_id=character_id,
            sim_day=sim_day,
            sim_time=sim_time,
            tick_count=tick_number,
            happiness=state.happiness,
            stress=state.stress,
            anxiety=state.anxiety,
            loneliness=state.loneliness,
            trust=state.trust,
            love=state.love,
            resentment=state.resentment,
            security=state.security,
            energy=state.energy,
            trigger_event=event_descriptions[0][:200] if event_descriptions else None,
        )
        db.add(snapshot)

    # 11. Record tick log
    is_notable, notable_reason = _determine_notable(decision_result, event_descriptions, ai_delta_raw)
    tick_log = SimulationTick(
        character_id=character_id,
        tick_number=tick_number,
        sim_day=sim_day,
        sim_time=sim_time,
        location=state.current_location,
        activity=state.current_activity,
        decision_made=decision_result.get("decision"),
        internal_monologue=decision_result.get("internal_monologue"),
        emotion_delta={k: float(ai_delta_raw.get(k, 0)) for k in EMOTION_KEYS},
        events_processed=[e[:200] for e in event_descriptions],
        action_type=action_type,
        is_notable=is_notable,
        notable_reason=notable_reason,
        token_usage=_tick_usage,
    )
    db.add(tick_log)

    # 12. Advance sim time
    new_time, crossed_midnight = advance_time(sim_time, minutes=60)
    state.current_sim_time = new_time
    state.tick_count = tick_number
    state.last_tick_at = datetime.utcnow()

    if crossed_midnight:
        state.sim_day = sim_day + 1
        await db.commit()  # commit state first so summary queries see current data
        # Compact today's short-term memories into one episodic daily summary
        await create_daily_summary(db, character_id, sim_day)
        # Prune long-term memory banks to stay within capacity limits
        await prune_old_memories(db, character_id)
    else:
        await db.commit()

    return {
        "tick_number": tick_number,
        "sim_day": sim_day,
        "sim_time": sim_time,
        "next_sim_time": new_time,
        "location": routine.location,
        "activity": routine.activity,
        "decision": decision_result.get("decision", ""),
        "internal_monologue": decision_result.get("internal_monologue", ""),
        "action_type": action_type,
        "message_to_send": decision_result.get("generated_message"),
        "message_tone": decision_result.get("message_tone"),
        "growth_reflection": decision_result.get("growth_reflection"),
        "events_processed": event_descriptions,
        "emotion_after": {k: getattr(state, k) for k in EMOTION_KEYS},
    }


async def start_simulation(db: AsyncSession, character_id: int) -> CharacterState:
    state = await _get_state(db, character_id)
    if state is None:
        state = CharacterState(
            character_id=character_id,
            simulation_status=SimulationStatus.RUNNING.value,
        )
        db.add(state)
    else:
        state.simulation_status = SimulationStatus.RUNNING.value
    await db.commit()
    await db.refresh(state)
    return state


async def pause_simulation(db: AsyncSession, character_id: int) -> CharacterState:
    state = await _get_state(db, character_id)
    if state:
        state.simulation_status = SimulationStatus.PAUSED.value
        await db.commit()
        await db.refresh(state)
    return state


async def stop_simulation(db: AsyncSession, character_id: int) -> CharacterState:
    state = await _get_state(db, character_id)
    if state:
        state.simulation_status = SimulationStatus.ENDED.value
        await db.commit()
        await db.refresh(state)
    return state
