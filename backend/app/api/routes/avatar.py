import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

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

    update_data = data.model_dump(exclude_none=True)
    clear_partner = update_data.pop("clear_partner", False)

    if clear_partner:
        # Remove partner link from both sides
        old_partner_id = char.partner_id
        char.partner_id = None
        if old_partner_id:
            old_partner_res = await db.execute(select(Character).where(Character.id == old_partner_id))
            old_partner = old_partner_res.scalar_one_or_none()
            if old_partner and old_partner.partner_id == character_id:
                old_partner.partner_id = None
    elif "partner_id" in update_data:
        new_partner_id = update_data["partner_id"]
        # Clear old partner's back-link if changed
        if char.partner_id and char.partner_id != new_partner_id:
            old_p_res = await db.execute(select(Character).where(Character.id == char.partner_id))
            old_p = old_p_res.scalar_one_or_none()
            if old_p and old_p.partner_id == character_id:
                old_p.partner_id = None
        # Set new partner bidirectionally
        new_p_res = await db.execute(select(Character).where(Character.id == new_partner_id))
        new_p = new_p_res.scalar_one_or_none()
        if not new_p:
            raise HTTPException(status_code=404, detail="Partner character not found")
        new_p.partner_id = character_id

    for field, value in update_data.items():
        setattr(char, field, value)

    if 'profile_extra' in update_data:
        flag_modified(char, 'profile_extra')

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
    try:
        analysis = await analyze_persona_answers(answers_json)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {exc}") from exc

    existing = await db.execute(
        select(PersonaProfile).where(PersonaProfile.character_id == character_id)
    )
    profile = existing.scalar_one_or_none()

    if profile is None:
        profile = PersonaProfile(character_id=character_id, calibration_version=0)
        db.add(profile)

    scores = analysis.get("attachment_scores", {})
    best_attachment = max(scores.items(), key=lambda x: x[1])[0] if scores else "secure"

    profile.questionnaire_level = data.level
    profile.raw_answers = data.answers
    profile.personality_core    = analysis.get("personality_core", {})
    profile.emotional_patterns  = analysis.get("emotional_patterns", {})
    profile.attachment_style    = best_attachment
    profile.attachment_scores   = scores
    profile.communication_style = analysis.get("communication_style", {})
    profile.conflict_behavior   = analysis.get("conflict_behavior", {})
    profile.love_languages      = analysis.get("love_languages", {})
    profile.trigger_points      = analysis.get("trigger_points", {})
    profile.daily_life_patterns = analysis.get("daily_life_patterns", {})
    profile.core_values         = analysis.get("core_values", {})
    profile.boundaries          = analysis.get("boundaries", {})
    profile.calibration_version = (profile.calibration_version or 0) + 1

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
