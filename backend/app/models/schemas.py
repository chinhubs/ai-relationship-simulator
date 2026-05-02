from datetime import datetime
from pydantic import BaseModel, Field


class CharacterCreate(BaseModel):
    name: str
    nickname: str | None = None
    age: int | None = None
    occupation: str | None = None
    avatar_emoji: str | None = None
    gender: str = "unspecified"
    relationship_status: str = "single"
    partner_id: int | None = None
    character_type: str = "human"
    profile_extra: dict = Field(default_factory=dict)


class CharacterRead(BaseModel):
    id: int
    name: str
    nickname: str | None
    age: int | None
    occupation: str | None
    avatar_emoji: str | None
    gender: str
    relationship_status: str
    partner_id: int | None
    character_type: str
    profile_extra: dict
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CharacterUpdate(BaseModel):
    name: str | None = None
    nickname: str | None = None
    age: int | None = None
    occupation: str | None = None
    avatar_emoji: str | None = None
    gender: str | None = None
    relationship_status: str | None = None
    partner_id: int | None = None
    clear_partner: bool = False
    character_type: str | None = None
    profile_extra: dict | None = None


class EmotionState(BaseModel):
    happiness: float = Field(ge=0, le=100, default=70.0)
    stress: float = Field(ge=0, le=100, default=30.0)
    anxiety: float = Field(ge=0, le=100, default=25.0)
    loneliness: float = Field(ge=0, le=100, default=20.0)
    trust: float = Field(ge=0, le=100, default=75.0)
    love: float = Field(ge=0, le=100, default=80.0)
    resentment: float = Field(ge=0, le=100, default=5.0)
    security: float = Field(ge=0, le=100, default=70.0)
    energy: float = Field(ge=0, le=100, default=80.0)


class CharacterStateRead(BaseModel):
    character_id: int
    simulation_status: str
    current_location: str
    current_activity: str
    current_sim_time: str
    sim_day: int
    tick_count: int
    emotions: EmotionState
    last_tick_at: datetime | None

    model_config = {"from_attributes": True}


class QuestionnaireSubmit(BaseModel):
    character_id: int
    level: int = Field(ge=1, le=3, default=2)
    answers: dict[str, str | int | list]


class PersonaProfileRead(BaseModel):
    id: int
    character_id: int
    attachment_style: str
    attachment_scores: dict
    personality_core: dict
    emotional_patterns: dict
    love_languages: dict
    calibration_version: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventInject(BaseModel):
    target_character_id: int
    event_type: str
    category: str
    title: str
    description: str
    severity: str = "moderate"
    expected_emotion_impact: dict[str, float] = {}
    involved_character_ids: list[int] = []
    context: dict = {}


class EventRead(BaseModel):
    id: int
    target_character_id: int
    event_type: str
    title: str
    severity: str
    processed: bool
    injected_at: datetime

    model_config = {"from_attributes": True}


class SimulationTickRead(BaseModel):
    id: int
    character_id: int
    tick_number: int
    sim_day: int
    sim_time: str
    location: str
    activity: str
    decision_made: str | None
    internal_monologue: str | None
    emotion_delta: dict
    is_notable: bool = False
    notable_reason: str | None = None
    action_type: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MemoryRead(BaseModel):
    id: int
    character_id: int
    layer: str
    content: str
    emotional_valence: float
    emotional_intensity: float
    importance_score: float
    tags: list
    sim_day: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DiaryEntryRead(BaseModel):
    id: int
    character_id: int
    sim_day: int
    entry_type: str
    content: str
    mood_summary: str | None
    key_events: list
    emotion_snapshot: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackCreate(BaseModel):
    character_id: int
    feedback_type: str
    situation_context: str
    ai_behavior_observed: str
    expected_behavior: str
    correction_instruction: str


class RelationshipStateRead(BaseModel):
    id: int
    character_a_id: int
    character_b_id: int
    closeness: float
    trust_level: float
    conflict_level: float
    attraction: float
    communication_quality: float
    dynamic_label: str
    milestones: list
    updated_at: datetime

    model_config = {"from_attributes": True}


class SimulationControlRequest(BaseModel):
    character_id: int
    action: str = Field(pattern="^(start|pause|resume|stop|tick)$")


class TickResult(BaseModel):
    tick_number: int
    sim_day: int
    sim_time: str
    location: str
    activity: str
    decision: str
    internal_monologue: str
    emotion_after: EmotionState
    events_processed: list[str]
