from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ...core.database import get_db
from ...models.db_models import InjectedEvent
from ...models.schemas import EventInject, EventRead

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventRead, status_code=201)
async def inject_event(data: EventInject, db: AsyncSession = Depends(get_db)):
    event = InjectedEvent(
        target_character_id=data.target_character_id,
        event_type=data.event_type,
        category=data.category,
        title=data.title,
        description=data.description,
        severity=data.severity,
        expected_emotion_impact=data.expected_emotion_impact,
        involved_character_ids=data.involved_character_ids,
        context=data.context,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{character_id}", response_model=list[EventRead])
async def list_events(
    character_id: int,
    include_processed: bool = False,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = select(InjectedEvent).where(InjectedEvent.target_character_id == character_id)
    if not include_processed:
        query = query.where(InjectedEvent.processed == False)
    query = query.order_by(desc(InjectedEvent.injected_at)).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete("/{event_id}", status_code=204)
async def cancel_event(event_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InjectedEvent).where(InjectedEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.processed:
        raise HTTPException(status_code=409, detail="Event already processed")
    await db.delete(event)
    await db.commit()
