"""
4-layer Memory System:
  short_term  — last ~15 events, compacted into episodic at end of each day
  episodic    — significant events, persisted long-term (capped at 80)
  semantic    — patterns and general knowledge about people/world (capped at 40)
  emotional   — emotionally charged memories, highest recall weight
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ..models.db_models import Memory, MemoryLayer


IMPORTANCE_THRESHOLDS = {
    MemoryLayer.SHORT_TERM: 0.0,
    MemoryLayer.EPISODIC:   0.4,
    MemoryLayer.SEMANTIC:   0.3,
    MemoryLayer.EMOTIONAL:  0.6,
}

SHORT_TERM_CAPACITY = 20   # per-character rolling buffer during the day
EPISODIC_CAP       = 80   # max episodic memories kept long-term
SEMANTIC_CAP       = 40   # max semantic memories kept long-term


# ── Core write ────────────────────────────────────────────────────────────────

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
    for m in result.scalars().all():
        await db.delete(m)


# ── Read ──────────────────────────────────────────────────────────────────────

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


async def get_semantic_memories(
    db: AsyncSession,
    character_id: int,
    limit: int = 5,
) -> list[Memory]:
    query = (
        select(Memory)
        .where(
            Memory.character_id == character_id,
            Memory.layer == MemoryLayer.SEMANTIC.value,
        )
        .order_by(desc(Memory.importance_score), desc(Memory.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_memories_by_day(
    db: AsyncSession,
    character_id: int,
    sim_day: int,
    limit: int = 40,
) -> list[Memory]:
    query = (
        select(Memory)
        .where(
            Memory.character_id == character_id,
            Memory.sim_day == sim_day,
        )
        .order_by(Memory.created_at)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Access tracking ───────────────────────────────────────────────────────────

def update_memory_access(memories: list[Memory]) -> None:
    """
    Bump access_count for every recalled memory.
    Every 5 recalls → +0.05 importance (rehearsal/reinforcement effect).
    No separate commit needed — changes are flushed with the caller's next db.commit().
    """
    now = datetime.utcnow()
    for m in memories:
        m.access_count = (m.access_count or 0) + 1
        m.last_accessed_at = now
        if m.access_count % 5 == 0:
            m.importance_score = min(1.0, m.importance_score + 0.05)


# ── End-of-day compaction ─────────────────────────────────────────────────────

async def create_daily_summary(
    db: AsyncSession,
    character_id: int,
    sim_day: int,
) -> None:
    """
    At midnight: compact today's short-term memories into one episodic summary entry,
    then delete the raw short-term entries (they are now preserved in the summary).
    """
    day_mems = await get_memories_by_day(db, character_id, sim_day, limit=40)
    if not day_mems:
        return

    short_mems   = [m for m in day_mems if m.layer == MemoryLayer.SHORT_TERM.value]
    notable_mems = [m for m in day_mems if m.layer in (
        MemoryLayer.EPISODIC.value, MemoryLayer.EMOTIONAL.value
    )]

    if not short_mems:
        return

    # Build chronological activity timeline (cap at 10 items for brevity)
    sorted_short = sorted(short_mems, key=lambda x: x.created_at)[:10]
    timeline_parts = []
    for m in sorted_short:
        prefix = f"[{m.sim_time}] " if m.sim_time else ""
        timeline_parts.append(prefix + m.content)
    timeline = " → ".join(timeline_parts)

    lines = [f"บันทึกวันที่ {sim_day}:", f"กิจกรรมตลอดวัน: {timeline}"]
    if notable_mems:
        highlights = "; ".join(m.content[:80] for m in notable_mems[:3])
        lines.append(f"เหตุการณ์สำคัญ: {highlights}")

    avg_valence = sum(m.emotional_valence for m in short_mems) / len(short_mems)

    summary_mem = Memory(
        character_id=character_id,
        layer=MemoryLayer.EPISODIC.value,
        content="\n".join(lines),
        emotional_valence=avg_valence,
        emotional_intensity=0.3,
        importance_score=0.4,
        sim_day=sim_day,
        sim_time="23:59",
        tags=["daily_summary"],
    )
    db.add(summary_mem)

    # Delete raw short-term entries — they are now preserved in the summary
    for m in short_mems:
        await db.delete(m)

    await db.commit()


# ── Memory pruning ────────────────────────────────────────────────────────────

async def prune_old_memories(
    db: AsyncSession,
    character_id: int,
    keep_episodic: int = EPISODIC_CAP,
    keep_semantic: int = SEMANTIC_CAP,
) -> None:
    """
    Delete lowest-importance long-term memories beyond the storage cap.
    Emotional memories are never pruned (they form permanent personality anchors).
    """
    for layer_val, keep in [
        (MemoryLayer.EPISODIC.value,  keep_episodic),
        (MemoryLayer.SEMANTIC.value,  keep_semantic),
    ]:
        result = await db.execute(
            select(Memory)
            .where(Memory.character_id == character_id, Memory.layer == layer_val)
            .order_by(desc(Memory.importance_score), desc(Memory.created_at))
            .offset(keep)
        )
        for m in result.scalars().all():
            await db.delete(m)
    await db.commit()


# ── Prompt context builder ────────────────────────────────────────────────────

async def build_memory_context(
    db: AsyncSession,
    character_id: int,
    sim_day: int,
    related_character_id: int | None = None,
) -> str:
    """Build the memory section injected into the AI decision prompt each tick."""
    short_term = await get_recent_memories(db, character_id, limit=10, layer=MemoryLayer.SHORT_TERM)
    episodic   = await get_recent_memories(db, character_id, limit=6,  layer=MemoryLayer.EPISODIC)
    emotional  = await get_emotional_memories(
        db, character_id,
        related_character_id=related_character_id,
        limit=4,
    )
    semantic   = await get_semantic_memories(db, character_id, limit=4)

    # Reinforce memories that are actively recalled (access tracking)
    update_memory_access(episodic + emotional + semantic)

    lines = ["═══ ความทรงจำ ═══"]

    if short_term:
        lines.append("เหตุการณ์ล่าสุด (วันนี้):")
        for m in sorted(short_term, key=lambda x: x.created_at):
            lines.append(f"  • [{m.sim_time or '?'}] {m.content}")

    if episodic:
        lines.append("\nความทรงจำสำคัญในอดีต:")
        for m in episodic:
            lines.append(f"  • [วันที่ {m.sim_day}] {m.content}")

    if emotional:
        lines.append("\nความทรงจำที่ฝังใจ:")
        for m in emotional:
            mood = "เชิงบวก" if m.emotional_valence > 0 else "เชิงลบ"
            lines.append(f"  • ({mood}, ความเข้ม={m.emotional_intensity:.1f}) {m.content}")

    if semantic:
        lines.append("\nสิ่งที่เรียนรู้และพัฒนาการของตัวเอง:")
        for m in semantic:
            lines.append(f"  • {m.content}")

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
