"""
4-layer Memory System:
  short_term  — last ~10 events, cleared each day
  episodic    — significant events, persisted long-term
  semantic    — patterns and general knowledge about people/world
  emotional   — emotionally charged memories, highest recall weight
"""

import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc

from ..models.db_models import Memory, MemoryLayer


IMPORTANCE_THRESHOLDS = {
    MemoryLayer.SHORT_TERM: 0.0,
    MemoryLayer.EPISODIC: 0.4,
    MemoryLayer.SEMANTIC: 0.3,
    MemoryLayer.EMOTIONAL: 0.6,
}

SHORT_TERM_CAPACITY = 15


async def add_memory(
    db: AsyncSession,
    character_id: int,
    content: str,
    layer: MemoryLayer = MemoryLayer.EPISODIC,
    emotional_valence: float = 0.0,
    emotional_intensity: float = 0.5,
    importance_score: float = 0.5,
    related_character_id: int | None = None,
    tags: list[str] | None = None,
    sim_day: int = 1,
    sim_time: str | None = None,
) -> Memory:
    memory = Memory(
        character_id=character_id,
        layer=layer.value,
        content=content,
        emotional_valence=emotional_valence,
        emotional_intensity=emotional_intensity,
        importance_score=importance_score,
        related_character_id=related_character_id,
        tags=tags or [],
        sim_day=sim_day,
        sim_time=sim_time,
    )
    db.add(memory)

    if layer == MemoryLayer.SHORT_TERM:
        await _trim_short_term(db, character_id)

    await db.commit()
    await db.refresh(memory)
    return memory


async def _trim_short_term(db: AsyncSession, character_id: int) -> None:
    result = await db.execute(
        select(Memory)
        .where(Memory.character_id == character_id, Memory.layer == MemoryLayer.SHORT_TERM.value)
        .order_by(desc(Memory.created_at))
        .offset(SHORT_TERM_CAPACITY)
    )
    old_memories = result.scalars().all()
    for m in old_memories:
        await db.delete(m)


async def get_recent_memories(
    db: AsyncSession,
    character_id: int,
    limit: int = 10,
    layer: MemoryLayer | None = None,
) -> list[Memory]:
    query = select(Memory).where(Memory.character_id == character_id)
    if layer:
        query = query.where(Memory.layer == layer.value)
    query = query.order_by(desc(Memory.importance_score), desc(Memory.created_at)).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_emotional_memories(
    db: AsyncSession,
    character_id: int,
    related_character_id: int | None = None,
    limit: int = 5,
) -> list[Memory]:
    query = (
        select(Memory)
        .where(
            Memory.character_id == character_id,
            Memory.layer == MemoryLayer.EMOTIONAL.value,
        )
        .order_by(desc(Memory.emotional_intensity))
        .limit(limit)
    )
    if related_character_id:
        query = query.where(Memory.related_character_id == related_character_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def build_memory_context(
    db: AsyncSession,
    character_id: int,
    sim_day: int,
    related_character_id: int | None = None,
) -> str:
    """Build the memory section of the volatile prompt for the Brain call."""
    short_term = await get_recent_memories(db, character_id, limit=8, layer=MemoryLayer.SHORT_TERM)
    episodic = await get_recent_memories(db, character_id, limit=5, layer=MemoryLayer.EPISODIC)
    emotional = await get_emotional_memories(db, character_id, related_character_id=related_character_id, limit=3)

    lines = ["═══ MEMORY CONTEXT ═══"]

    if short_term:
        lines.append("Recent events (today):")
        for m in short_term:
            lines.append(f"  • [{m.sim_time or '?'}] {m.content}")

    if episodic:
        lines.append("\nSignificant past memories:")
        for m in episodic:
            lines.append(f"  • [Day {m.sim_day}] {m.content}")

    if emotional:
        lines.append("\nEmotionally significant memories:")
        for m in emotional:
            valence = "positive" if m.emotional_valence > 0 else "negative"
            lines.append(f"  • ({valence}, intensity={m.emotional_intensity:.1f}) {m.content}")

    return "\n".join(lines)


def classify_event_memory_layer(
    emotional_intensity: float,
    importance_score: float,
    event_category: str,
) -> MemoryLayer:
    """Determine which memory layer an event should go into."""
    if emotional_intensity >= 0.7 or event_category in ("conflict", "breakup", "loss", "declaration"):
        return MemoryLayer.EMOTIONAL
    elif importance_score >= 0.5:
        return MemoryLayer.EPISODIC
    return MemoryLayer.SHORT_TERM
