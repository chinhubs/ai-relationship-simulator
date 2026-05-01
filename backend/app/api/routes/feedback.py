from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...core.database import get_db
from ...models.db_models import FeedbackRule, PersonaProfile
from ...models.schemas import FeedbackCreate

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", status_code=201)
async def submit_feedback(data: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    rule = FeedbackRule(
        character_id=data.character_id,
        feedback_type=data.feedback_type,
        situation_context=data.situation_context,
        ai_behavior_observed=data.ai_behavior_observed,
        expected_behavior=data.expected_behavior,
        correction_instruction=data.correction_instruction,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"id": rule.id, "message": "Feedback recorded. It will influence future simulation behavior."}


@router.get("/{character_id}")
async def list_feedback(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FeedbackRule)
        .where(FeedbackRule.character_id == character_id, FeedbackRule.is_active == True)
        .order_by(FeedbackRule.created_at.desc())
    )
    rules = result.scalars().all()
    return [
        {
            "id": r.id,
            "feedback_type": r.feedback_type,
            "situation_context": r.situation_context,
            "correction_instruction": r.correction_instruction,
            "applied_count": r.applied_count,
        }
        for r in rules
    ]


@router.delete("/{feedback_id}", status_code=204)
async def delete_feedback(feedback_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedbackRule).where(FeedbackRule.id == feedback_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Feedback rule not found")
    rule.is_active = False
    await db.commit()


@router.post("/{character_id}/recalibrate")
async def recalibrate_persona(character_id: int, db: AsyncSession = Depends(get_db)):
    """
    Re-generates the persona profile by incorporating all active feedback rules.
    Uses Claude to synthesize the corrections into updated persona fields.
    """
    from ...core.claude_client import get_claude_client
    import json

    profile_result = await db.execute(
        select(PersonaProfile).where(PersonaProfile.character_id == character_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No persona profile found")

    rules_result = await db.execute(
        select(FeedbackRule)
        .where(FeedbackRule.character_id == character_id, FeedbackRule.is_active == True)
    )
    rules = list(rules_result.scalars().all())
    if not rules:
        return {"message": "No active feedback rules to apply"}

    client = get_claude_client()
    feedback_text = "\n".join(
        f"[{r.feedback_type}] Situation: {r.situation_context}\n"
        f"  Observed: {r.ai_behavior_observed}\n"
        f"  Should be: {r.expected_behavior}\n"
        f"  Instruction: {r.correction_instruction}"
        for r in rules
    )

    current_profile_json = json.dumps({
        "personality_core": profile.personality_core,
        "emotional_patterns": profile.emotional_patterns,
        "communication_style": profile.communication_style,
        "conflict_behavior": profile.conflict_behavior,
        "trigger_points": profile.trigger_points,
    }, ensure_ascii=False)

    response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=3000,
        messages=[
            {
                "role": "system",
                "content": "You are a psychological profiler. Update a character's personality profile to incorporate user corrections.",
            },
            {
                "role": "user",
                "content": (
                    f"Current personality profile:\n{current_profile_json}\n\n"
                    f"User feedback corrections:\n{feedback_text}\n\n"
                    "Update the profile fields to incorporate these corrections. "
                    "Return the same JSON structure with updated 'summary' and 'traits' where appropriate. "
                    "Return ONLY valid JSON."
                ),
            },
        ],
    )

    updated_text = response.choices[0].message.content or "{}"
    try:
        updated = json.loads(updated_text)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", updated_text, re.DOTALL)
        updated = json.loads(match.group()) if match else {}

    if updated:
        for field, value in updated.items():
            if hasattr(profile, field) and isinstance(value, dict):
                setattr(profile, field, value)
        profile.calibration_version += 1

    for rule in rules:
        rule.applied_count += 1

    await db.commit()
    return {"message": "Persona recalibrated", "calibration_version": profile.calibration_version}
