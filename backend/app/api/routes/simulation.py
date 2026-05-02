from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ...core.database import get_db
from ...models.db_models import CharacterState, SimulationTick, EmotionSnapshot, DiaryEntry
from ...models.schemas import (
    SimulationControlRequest, TickResult, CharacterStateRead,
    EmotionState, SimulationTickRead, DiaryEntryRead,
)
from ...simulation.tick_engine import run_tick, start_simulation, pause_simulation, stop_simulation
from ...brain.dialogue_engine import generate_diary_entry
from ...brain.memory_system import get_recent_memories, MemoryLayer
from ...models.schemas import MemoryRead

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.post("/control")
async def control_simulation(data: SimulationControlRequest, db: AsyncSession = Depends(get_db)):
    char_id = data.character_id
    action = data.action

    if action == "start":
        state = await start_simulation(db, char_id)
        return {"status": "started", "sim_day": state.sim_day, "sim_time": state.current_sim_time}

    elif action == "pause":
        state = await pause_simulation(db, char_id)
        return {"status": "paused"}

    elif action == "stop":
        state = await stop_simulation(db, char_id)
        return {"status": "stopped"}

    elif action == "tick":
        result = await run_tick(db, char_id)
        return result

    raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


@router.post("/{character_id}/tick")
async def execute_tick(
    character_id: int,
    related_character_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await run_tick(db, character_id, related_character_id=related_character_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)[:300]}")


@router.get("/{character_id}/state", response_model=CharacterStateRead)
async def get_character_state(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CharacterState).where(CharacterState.character_id == character_id)
    )
    state = result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail="No simulation state found")

    return CharacterStateRead(
        character_id=state.character_id,
        simulation_status=state.simulation_status,
        current_location=state.current_location,
        current_activity=state.current_activity,
        current_sim_time=state.current_sim_time,
        sim_day=state.sim_day,
        tick_count=state.tick_count,
        emotions=EmotionState(
            happiness=state.happiness,
            stress=state.stress,
            anxiety=state.anxiety,
            loneliness=state.loneliness,
            trust=state.trust,
            love=state.love,
            resentment=state.resentment,
            security=state.security,
            energy=state.energy,
        ),
        last_tick_at=state.last_tick_at,
    )


@router.get("/{character_id}/ticks", response_model=list[SimulationTickRead])
async def get_tick_history(character_id: int, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SimulationTick)
        .where(SimulationTick.character_id == character_id)
        .order_by(desc(SimulationTick.tick_number))
        .limit(limit)
    )
    return list(result.scalars().all())


@router.get("/{character_id}/emotions/history")
async def get_emotion_history(character_id: int, limit: int = 48, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmotionSnapshot)
        .where(EmotionSnapshot.character_id == character_id)
        .order_by(desc(EmotionSnapshot.recorded_at))
        .limit(limit)
    )
    snapshots = list(result.scalars().all())
    return [
        {
            "sim_day": s.sim_day,
            "sim_time": s.sim_time,
            "happiness": s.happiness,
            "stress": s.stress,
            "anxiety": s.anxiety,
            "loneliness": s.loneliness,
            "trust": s.trust,
            "love": s.love,
            "resentment": s.resentment,
            "security": s.security,
            "energy": s.energy,
            "trigger": s.trigger_event,
        }
        for s in snapshots
    ]


@router.get("/{character_id}/memories", response_model=list[MemoryRead])
async def get_memories(
    character_id: int,
    layer: str | None = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    mem_layer = MemoryLayer(layer) if layer else None
    memories = await get_recent_memories(db, character_id, limit=limit, layer=mem_layer)
    return memories


@router.post("/{character_id}/diary")
async def generate_daily_diary(character_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select as sa_select
    from ...models.db_models import Character, SimulationTick

    char_result = await db.execute(sa_select(Character).where(Character.id == character_id))
    char = char_result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    state_result = await db.execute(
        sa_select(CharacterState).where(CharacterState.character_id == character_id)
    )
    state = state_result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail="No simulation state")

    ticks_result = await db.execute(
        sa_select(SimulationTick)
        .where(
            SimulationTick.character_id == character_id,
            SimulationTick.sim_day == state.sim_day,
        )
        .order_by(SimulationTick.tick_number)
    )
    ticks = list(ticks_result.scalars().all())
    key_events = [t.decision_made for t in ticks if t.decision_made][:10]

    diary_text = await generate_diary_entry(
        db=db,
        character_id=character_id,
        character_name=char.nickname or char.name,
        state=state,
        key_events_today=key_events,
        sim_day=state.sim_day,
    )

    entry = DiaryEntry(
        character_id=character_id,
        sim_day=state.sim_day,
        entry_type="daily_reflection",
        content=diary_text,
        key_events=key_events,
        emotion_snapshot={
            k: getattr(state, k)
            for k in ["happiness", "stress", "anxiety", "loneliness", "trust", "love", "resentment", "security", "energy"]
        },
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {"sim_day": state.sim_day, "diary": diary_text}


@router.get("/{character_id}/diary", response_model=list[DiaryEntryRead])
async def get_diary_entries(character_id: int, limit: int = 10, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DiaryEntry)
        .where(DiaryEntry.character_id == character_id)
        .order_by(desc(DiaryEntry.sim_day))
        .limit(limit)
    )
    return list(result.scalars().all())
