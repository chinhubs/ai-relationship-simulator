from datetime import datetime
from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from ..core.database import Base


class AttachmentStyle(str, enum.Enum):
    SECURE = "secure"
    ANXIOUS = "anxious"
    AVOIDANT = "avoidant"
    FEARFUL_AVOIDANT = "fearful_avoidant"


class SimulationStatus(str, enum.Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ENDED = "ended"


class MemoryLayer(str, enum.Enum):
    SHORT_TERM = "short_term"
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    EMOTIONAL = "emotional"


class EventSeverity(str, enum.Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CRITICAL = "critical"


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(100))
    age: Mapped[int | None] = mapped_column(Integer)
    occupation: Mapped[str | None] = mapped_column(String(200))
    avatar_emoji: Mapped[str | None] = mapped_column(String(10))
    gender: Mapped[str] = mapped_column(String(20), default="unspecified")
    relationship_status: Mapped[str] = mapped_column(String(30), default="single")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    persona: Mapped["PersonaProfile | None"] = relationship("PersonaProfile", back_populates="character", uselist=False)
    state: Mapped["CharacterState | None"] = relationship("CharacterState", back_populates="character", uselist=False)
    emotion_history: Mapped[list["EmotionSnapshot"]] = relationship("EmotionSnapshot", back_populates="character")
    memories: Mapped[list["Memory"]] = relationship("Memory", foreign_keys="Memory.character_id", back_populates="character")
    diary_entries: Mapped[list["DiaryEntry"]] = relationship("DiaryEntry", back_populates="character")


class PersonaProfile(Base):
    __tablename__ = "persona_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), unique=True)
    questionnaire_level: Mapped[int] = mapped_column(Integer, default=2)
    raw_answers: Mapped[dict] = mapped_column(JSON, default=dict)
    personality_core: Mapped[dict] = mapped_column(JSON, default=dict)
    emotional_patterns: Mapped[dict] = mapped_column(JSON, default=dict)
    attachment_style: Mapped[str] = mapped_column(String(30), default=AttachmentStyle.SECURE)
    attachment_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    communication_style: Mapped[dict] = mapped_column(JSON, default=dict)
    conflict_behavior: Mapped[dict] = mapped_column(JSON, default=dict)
    love_languages: Mapped[dict] = mapped_column(JSON, default=dict)
    trigger_points: Mapped[dict] = mapped_column(JSON, default=dict)
    daily_life_patterns: Mapped[dict] = mapped_column(JSON, default=dict)
    core_values: Mapped[dict] = mapped_column(JSON, default=dict)
    boundaries: Mapped[dict] = mapped_column(JSON, default=dict)
    calibration_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    character: Mapped["Character"] = relationship("Character", back_populates="persona")


class CharacterState(Base):
    """Live simulation state for a character — updated every tick."""
    __tablename__ = "character_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), unique=True)
    simulation_status: Mapped[str] = mapped_column(String(20), default=SimulationStatus.IDLE)
    current_location: Mapped[str] = mapped_column(String(200), default="home")
    current_activity: Mapped[str] = mapped_column(String(200), default="sleeping")
    current_sim_time: Mapped[str] = mapped_column(String(20), default="06:00")
    sim_day: Mapped[int] = mapped_column(Integer, default=1)
    tick_count: Mapped[int] = mapped_column(Integer, default=0)
    happiness: Mapped[float] = mapped_column(Float, default=70.0)
    stress: Mapped[float] = mapped_column(Float, default=30.0)
    anxiety: Mapped[float] = mapped_column(Float, default=25.0)
    loneliness: Mapped[float] = mapped_column(Float, default=20.0)
    trust: Mapped[float] = mapped_column(Float, default=75.0)
    love: Mapped[float] = mapped_column(Float, default=80.0)
    resentment: Mapped[float] = mapped_column(Float, default=5.0)
    security: Mapped[float] = mapped_column(Float, default=70.0)
    energy: Mapped[float] = mapped_column(Float, default=80.0)
    pending_events: Mapped[list] = mapped_column(JSON, default=list)
    active_mood_modifiers: Mapped[list] = mapped_column(JSON, default=list)
    last_tick_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    character: Mapped["Character"] = relationship("Character", back_populates="state")


class EmotionSnapshot(Base):
    """Historical record of emotion states over time."""
    __tablename__ = "emotion_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    sim_day: Mapped[int] = mapped_column(Integer)
    sim_time: Mapped[str] = mapped_column(String(20))
    tick_count: Mapped[int] = mapped_column(Integer)
    happiness: Mapped[float] = mapped_column(Float)
    stress: Mapped[float] = mapped_column(Float)
    anxiety: Mapped[float] = mapped_column(Float)
    loneliness: Mapped[float] = mapped_column(Float)
    trust: Mapped[float] = mapped_column(Float)
    love: Mapped[float] = mapped_column(Float)
    resentment: Mapped[float] = mapped_column(Float)
    security: Mapped[float] = mapped_column(Float)
    energy: Mapped[float] = mapped_column(Float)
    trigger_event: Mapped[str | None] = mapped_column(String(500))
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    character: Mapped["Character"] = relationship("Character", back_populates="emotion_history")


class RelationshipState(Base):
    __tablename__ = "relationship_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_a_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    character_b_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    closeness: Mapped[float] = mapped_column(Float, default=50.0)
    trust_level: Mapped[float] = mapped_column(Float, default=50.0)
    conflict_level: Mapped[float] = mapped_column(Float, default=0.0)
    attraction: Mapped[float] = mapped_column(Float, default=50.0)
    communication_quality: Mapped[float] = mapped_column(Float, default=60.0)
    shared_history_score: Mapped[float] = mapped_column(Float, default=0.0)
    dynamic_label: Mapped[str] = mapped_column(String(100), default="acquaintances")
    last_interaction_day: Mapped[int] = mapped_column(Integer, default=0)
    last_interaction_type: Mapped[str | None] = mapped_column(String(200))
    unresolved_conflicts: Mapped[list] = mapped_column(JSON, default=list)
    milestones: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    layer: Mapped[str] = mapped_column(String(20), default=MemoryLayer.EPISODIC)
    content: Mapped[str] = mapped_column(Text)
    emotional_valence: Mapped[float] = mapped_column(Float, default=0.0)
    emotional_intensity: Mapped[float] = mapped_column(Float, default=0.5)
    importance_score: Mapped[float] = mapped_column(Float, default=0.5)
    related_character_id: Mapped[int | None] = mapped_column(ForeignKey("characters.id"), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    sim_day: Mapped[int] = mapped_column(Integer, default=1)
    sim_time: Mapped[str | None] = mapped_column(String(20))
    access_count: Mapped[int] = mapped_column(Integer, default=0)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    character: Mapped["Character"] = relationship("Character", foreign_keys=[character_id], back_populates="memories")


class SimulationTick(Base):
    __tablename__ = "simulation_ticks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    tick_number: Mapped[int] = mapped_column(Integer)
    sim_day: Mapped[int] = mapped_column(Integer)
    sim_time: Mapped[str] = mapped_column(String(20))
    location: Mapped[str] = mapped_column(String(200))
    activity: Mapped[str] = mapped_column(String(200))
    decision_made: Mapped[str | None] = mapped_column(Text)
    internal_monologue: Mapped[str | None] = mapped_column(Text)
    emotion_delta: Mapped[dict] = mapped_column(JSON, default=dict)
    events_processed: Mapped[list] = mapped_column(JSON, default=list)
    token_usage: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InjectedEvent(Base):
    __tablename__ = "injected_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target_character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), default=EventSeverity.MODERATE)
    expected_emotion_impact: Mapped[dict] = mapped_column(JSON, default=dict)
    involved_character_ids: Mapped[list] = mapped_column(JSON, default=list)
    context: Mapped[dict] = mapped_column(JSON, default=dict)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    processed_at_tick: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_impact: Mapped[dict] = mapped_column(JSON, default=dict)
    injected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    sim_day: Mapped[int] = mapped_column(Integer)
    entry_type: Mapped[str] = mapped_column(String(50), default="daily_reflection")
    content: Mapped[str] = mapped_column(Text)
    mood_summary: Mapped[str | None] = mapped_column(String(200))
    key_events: Mapped[list] = mapped_column(JSON, default=list)
    emotion_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    character: Mapped["Character"] = relationship("Character", back_populates="diary_entries")


class FeedbackRule(Base):
    """User-provided calibration feedback to make AI behave more like the real person."""
    __tablename__ = "feedback_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), index=True)
    feedback_type: Mapped[str] = mapped_column(String(100))
    situation_context: Mapped[str] = mapped_column(Text)
    ai_behavior_observed: Mapped[str] = mapped_column(Text)
    expected_behavior: Mapped[str] = mapped_column(Text)
    correction_instruction: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    applied_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
