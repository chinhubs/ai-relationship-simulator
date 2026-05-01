from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...core.database import get_db
from ...models.db_models import RelationshipState
from ...models.schemas import RelationshipStateRead
from ...brain.relationship_manager import get_or_create_relationship

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("/{char_a_id}/{char_b_id}", response_model=RelationshipStateRead)
async def get_relationship(char_a_id: int, char_b_id: int, db: AsyncSession = Depends(get_db)):
    rel = await get_or_create_relationship(db, char_a_id, char_b_id)
    return rel


@router.get("/{character_id}")
async def list_relationships(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RelationshipState).where(
            (RelationshipState.character_a_id == character_id) |
            (RelationshipState.character_b_id == character_id)
        )
    )
    rels = result.scalars().all()
    return [
        {
            "other_character_id": r.character_b_id if r.character_a_id == character_id else r.character_a_id,
            "closeness": r.closeness,
            "trust_level": r.trust_level,
            "conflict_level": r.conflict_level,
            "dynamic_label": r.dynamic_label,
            "last_interaction_day": r.last_interaction_day,
            "milestones": r.milestones,
        }
        for r in rels
    ]
