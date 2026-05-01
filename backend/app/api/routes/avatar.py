import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...core.database import get_db
from ...models.db_models import Character, PersonaProfile, CharacterState, SimulationStatus
from ...models.schemas import (
    CharacterCreate, CharacterRead, CharacterUpdate,
    QuestionnaireSubmit, PersonaProfileRead,
)
from ...questionnaire.persona_intake import get_questions_for_level, serialize_questions
from ...core.claude_client import analyze_persona_answers

router = APIRouter(prefix="/avatars", tags=["avatars"])


@router.post("", response_model=CharacterRead, status_code=201)
async def create_character(data: CharacterCreate, db: AsyncSession = Depends(get_db)):
    char = Character(**data.model_dump())
    db.add(char)
    await db.commit()
    await db.refresh(char)

    state = CharacterState(
        character_id=char.id,
        simulation_status=SimulationStatus.IDLE.value,
    )
    db.add(state)
    await db.commit()

    return char


@router.get("", response_model=list[CharacterRead])
async def list_characters(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.is_active == True))
    return list(result.scalars().all())


@router.get("/{character_id}", response_model=CharacterRead)
async def get_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


@router.patch("/{character_id}", response_model=CharacterRead)
async def update_character(character_id: int, data: CharacterUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(char, field, value)
    await db.commit()
    await db.refresh(char)
    return char


@router.delete("/{character_id}", status_code=204)
async def delete_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    char.is_active = False
    await db.commit()


@router.get("/{character_id}/questionnaire")
async def get_questionnaire(character_id: int, level: int = 2):
    if level not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Level must be 1, 2, or 3")
    questions = get_questions_for_level(level)
    return {
        "character_id": character_id,
        "level": level,
        "question_count": len(questions),
        "questions": serialize_questions(questions),
    }


@router.post("/{character_id}/questionnaire", response_model=PersonaProfileRead, status_code=201)
async def submit_questionnaire(
    character_id: int,
    data: QuestionnaireSubmit,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    answers_json = json.dumps(data.answers, ensure_ascii=False)
    analysis = await analyze_persona_answers(answers_json)

    existing = await db.execute(
        select(PersonaProfile).where(PersonaProfile.character_id == character_id)
    )
    profile = existing.scalar_one_or_none()

    if profile is None:
        profile = PersonaProfile(character_id=character_id)
        db.add(profile)

    profile.questionnaire_level = data.level
    profile.raw_answers = data.answers
    profile.personality_core = analysis.get("personality_core", {})
    profile.emotional_patterns = analysis.get("emotional_patterns", {})
    profile.attachment_style = (
        analysis.get("attachment_scores", {}) and
        max(analysis.get("attachment_scores", {}).items(), key=lambda x: x[1], default=("secure", 0))[0]
    ) or "secure"
    profile.attachment_scores = analysis.get("attachment_scores", {})
    profile.communication_style = analysis.get("communication_style", {})
    profile.conflict_behavior = analysis.get("conflict_behavior", {})
    profile.love_languages = analysis.get("love_languages", {})
    profile.trigger_points = analysis.get("trigger_points", {})
    profile.daily_life_patterns = analysis.get("daily_life_patterns", {})
    profile.core_values = analysis.get("core_values", {})
    profile.boundaries = analysis.get("boundaries", {})
    profile.calibration_version += 1

    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/{character_id}/persona", response_model=PersonaProfileRead)
async def get_persona(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PersonaProfile).where(PersonaProfile.character_id == character_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No persona profile found. Complete the questionnaire first.")
    return profile
