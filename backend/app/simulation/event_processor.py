"""
Event Processor — handles injected special events and turns them into
simulation inputs for the Decision Engine.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..models.db_models import InjectedEvent, CharacterState
from ..brain.emotion_engine import EmotionDelta, apply_delta, clamp
from ..brain.memory_system import add_memory, classify_event_memory_layer, MemoryLayer


EVENT_BASE_IMPACTS: dict[str, dict[str, float]] = {
    "confession": {
        "happiness": 15.0, "love": 20.0, "anxiety": 10.0, "loneliness": -10.0,
    },
    "argument": {
        "stress": 15.0, "resentment": 10.0, "happiness": -10.0, "trust": -8.0,
    },
    "breakup": {
        "happiness": -30.0, "loneliness": 25.0, "anxiety": 20.0, "love": -15.0, "trust": -10.0,
    },
    "reconciliation": {
        "happiness": 20.0, "trust": 15.0, "resentment": -10.0, "security": 10.0,
    },
    "good_news": {
        "happiness": 15.0, "stress": -5.0, "energy": 5.0,
    },
    "bad_news": {
        "happiness": -10.0, "stress": 15.0, "anxiety": 10.0,
    },
    "gift": {
        "happiness": 10.0, "love": 5.0, "security": 5.0,
    },
    "ghosted": {
        "anxiety": 20.0, "loneliness": 15.0, "trust": -15.0, "happiness": -10.0,
    },
    "surprise_visit": {
        "happiness": 10.0, "loneliness": -10.0,
    },
    "betrayal": {
        "trust": -30.0, "resentment": 25.0, "happiness": -20.0, "security": -20.0,
    },
}

SEVERITY_MULTIPLIERS = {
    "minor": 0.5,
    "moderate": 1.0,
    "major": 1.5,
    "critical": 2.0,
}


def compute_event_impact(
    event_type: str,
    severity: str,
    expected_override: dict[str, float] | None = None,
) -> dict[str, float]:
    base = EVENT_BASE_IMPACTS.get(event_type, {})
    if expected_override:
        base = {**base, **expected_override}
    multiplier = SEVERITY_MULTIPLIERS.get(severity, 1.0)
    return {k: v * multiplier for k, v in base.items()}


async def get_pending_events(
    db: AsyncSession,
    character_id: int,
) -> list[InjectedEvent]:
    result = await db.execute(
        select(InjectedEvent).where(
            InjectedEvent.target_character_id == character_id,
            InjectedEvent.processed == False,
        )
    )
    return list(result.scalars().all())


async def mark_event_processed(
    db: AsyncSession,
    event: InjectedEvent,
    tick_number: int,
    actual_impact: dict,
) -> None:
    event.processed = True
    event.processed_at_tick = tick_number
    event.actual_impact = actual_impact
    await db.commit()


def build_event_description(event: InjectedEvent) -> str:
    lines = [f"Event: {event.title}", f"Details: {event.description}"]
    if event.context:
        context_str = ", ".join(f"{k}: {v}" for k, v in event.context.items())
        lines.append(f"Context: {context_str}")
    return "\n".join(lines)


async def process_events_for_tick(
    db: AsyncSession,
    character_id: int,
    state: CharacterState,
    tick_number: int,
    sim_day: int,
    sim_time: str,
) -> tuple[list[str], dict[str, float]]:
    """
    Processes all pending injected events for a character.
    Returns (event_descriptions_list, combined_emotion_delta).
    """
    pending = await get_pending_events(db, character_id)
    event_descriptions = []
    combined_delta: dict[str, float] = {}

    for event in pending:
        impact = compute_event_impact(
            event.event_type,
            event.severity,
            event.expected_emotion_impact or None,
        )
        for k, v in impact.items():
            combined_delta[k] = combined_delta.get(k, 0.0) + v

        emotional_intensity = min(1.0, abs(sum(impact.values())) / 50.0)
        importance = SEVERITY_MULTIPLIERS.get(event.severity, 1.0) / 2.0
        layer = classify_event_memory_layer(emotional_intensity, importance, event.category)

        await add_memory(
            db=db,
            character_id=character_id,
            content=f"{event.title}: {event.description[:200]}",
            layer=layer,
            emotional_valence=sum(v for v in impact.values() if v > 0) - sum(-v for v in impact.values() if v < 0),
            emotional_intensity=emotional_intensity,
            importance_score=importance,
            sim_day=sim_day,
            sim_time=sim_time,
            tags=[event.event_type, event.category, event.severity],
        )

        await mark_event_processed(db, event, tick_number, impact)
        event_descriptions.append(build_event_description(event))

    return event_descriptions, combined_delta
