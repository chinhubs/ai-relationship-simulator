"""
Relationship State Manager — tracks closeness, trust, conflict, and dynamics
between two characters. Updates based on interaction outcomes.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.db_models import RelationshipState
from ..brain.emotion_engine import clamp


DYNAMIC_LABELS = [
    (90, 85, "deeply bonded"),
    (80, 70, "close partners"),
    (70, 60, "good friends"),
    (55, 45, "friendly"),
    (50, 30, "acquaintances"),
    (40, 50, "strained"),
    (30, 65, "distant and tense"),
    (0,  80, "estranged"),
]


def compute_dynamic_label(closeness: float, conflict: float) -> str:
    for close_thresh, conflict_thresh, label in DYNAMIC_LABELS:
        if closeness >= close_thresh and conflict <= conflict_thresh:
            return label
    return "estranged"


async def get_or_create_relationship(
    db: AsyncSession,
    char_a_id: int,
    char_b_id: int,
) -> RelationshipState:
    lo, hi = sorted([char_a_id, char_b_id])
    result = await db.execute(
        select(RelationshipState).where(
            RelationshipState.character_a_id == lo,
            RelationshipState.character_b_id == hi,
        )
    )
    rel = result.scalar_one_or_none()
    if rel is None:
        rel = RelationshipState(character_a_id=lo, character_b_id=hi)
        db.add(rel)
        await db.commit()
        await db.refresh(rel)
    return rel


async def update_relationship(
    db: AsyncSession,
    char_a_id: int,
    char_b_id: int,
    closeness_delta: float = 0.0,
    trust_delta: float = 0.0,
    conflict_delta: float = 0.0,
    attraction_delta: float = 0.0,
    communication_delta: float = 0.0,
    interaction_type: str | None = None,
    sim_day: int = 1,
) -> RelationshipState:
    rel = await get_or_create_relationship(db, char_a_id, char_b_id)

    rel.closeness = clamp(rel.closeness + closeness_delta)
    rel.trust_level = clamp(rel.trust_level + trust_delta)
    rel.conflict_level = clamp(rel.conflict_level + conflict_delta)
    rel.attraction = clamp(rel.attraction + attraction_delta)
    rel.communication_quality = clamp(rel.communication_quality + communication_delta)
    rel.dynamic_label = compute_dynamic_label(rel.closeness, rel.conflict_level)

    if interaction_type:
        rel.last_interaction_day = sim_day
        rel.last_interaction_type = interaction_type

    await db.commit()
    await db.refresh(rel)
    return rel


def derive_relationship_deltas_from_action(action_type: str, tone: str) -> dict[str, float]:
    """Map action + tone to relationship score changes."""
    base: dict[str, float] = {
        "closeness_delta": 0.0,
        "trust_delta": 0.0,
        "conflict_delta": 0.0,
        "communication_delta": 0.0,
    }

    if action_type == "respond_message":
        base["closeness_delta"] = 1.0
        base["communication_delta"] = 1.0
    elif action_type == "initiate_contact":
        base["closeness_delta"] = 2.0
        base["communication_delta"] = 2.0
    elif action_type == "confront":
        base["conflict_delta"] = 5.0
        base["closeness_delta"] = -1.0
    elif action_type == "withdraw":
        base["closeness_delta"] = -2.0
        base["conflict_delta"] = 2.0
    elif action_type == "seek_comfort":
        base["closeness_delta"] = 3.0
        base["trust_delta"] = 2.0

    if tone == "loving":
        base["closeness_delta"] += 2.0
        base["trust_delta"] += 1.0
    elif tone == "cold":
        base["closeness_delta"] -= 2.0
    elif tone == "angry":
        base["conflict_delta"] += 3.0
    elif tone == "hurt":
        base["conflict_delta"] += 1.0
        base["trust_delta"] -= 1.0

    return base


def build_relationship_context_string(rel: RelationshipState | None) -> str:
    if rel is None:
        return ""
    return (
        f"Relationship with this person: {rel.dynamic_label} | "
        f"Closeness: {rel.closeness:.0f}/100 | Trust: {rel.trust_level:.0f}/100 | "
        f"Conflict tension: {rel.conflict_level:.0f}/100"
    )
