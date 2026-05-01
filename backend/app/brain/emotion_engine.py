"""
Emotion Engine — rules-based state machine for the 9 emotion scores.
Handles decay, mood modifiers, and event-driven emotion changes.
"""

from dataclasses import dataclass
from ..models.db_models import CharacterState


EMOTION_KEYS = [
    "happiness", "stress", "anxiety", "loneliness",
    "trust", "love", "resentment", "security", "energy",
]

# Natural decay rates per tick (positive = moves toward baseline)
BASELINE = {
    "happiness": 60.0,
    "stress": 30.0,
    "anxiety": 25.0,
    "loneliness": 30.0,
    "trust": 65.0,
    "love": 70.0,
    "resentment": 10.0,
    "security": 65.0,
    "energy": 75.0,
}

DECAY_RATE = {
    "happiness": 0.5,
    "stress": -0.8,
    "anxiety": -0.6,
    "loneliness": 0.3,
    "trust": 0.2,
    "love": 0.1,
    "resentment": -0.4,
    "security": 0.2,
    "energy": 0.8,
}


@dataclass
class EmotionDelta:
    happiness: float = 0.0
    stress: float = 0.0
    anxiety: float = 0.0
    loneliness: float = 0.0
    trust: float = 0.0
    love: float = 0.0
    resentment: float = 0.0
    security: float = 0.0
    energy: float = 0.0

    def to_dict(self) -> dict:
        return {k: getattr(self, k) for k in EMOTION_KEYS}


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def apply_decay(state: CharacterState) -> dict[str, float]:
    """Move each emotion one step toward its baseline."""
    updated = {}
    for key in EMOTION_KEYS:
        current = getattr(state, key)
        baseline = BASELINE[key]
        diff = baseline - current
        decay = DECAY_RATE[key]
        new_val = current + (diff * abs(decay) / 100)
        new_val = clamp(new_val)
        updated[key] = new_val
    return updated


def apply_delta(state: CharacterState, delta: EmotionDelta) -> dict[str, float]:
    """Apply an emotion delta and return updated values."""
    updated = {}
    for key in EMOTION_KEYS:
        current = getattr(state, key)
        change = getattr(delta, key)
        updated[key] = clamp(current + change)
    return updated


def apply_activity_effects(activity: str, state: CharacterState) -> EmotionDelta:
    """Rules-based emotion changes from common daily activities."""
    delta = EmotionDelta()

    activity_lower = activity.lower()

    if any(word in activity_lower for word in ["sleep", "sleeping", "rest", "nap"]):
        delta.energy = 20.0
        delta.stress = -5.0
        delta.anxiety = -3.0

    elif any(word in activity_lower for word in ["work", "meeting", "deadline"]):
        delta.energy = -5.0
        delta.stress = 8.0

    elif any(word in activity_lower for word in ["exercise", "gym", "run", "sport"]):
        delta.happiness = 5.0
        delta.energy = 10.0
        delta.stress = -8.0
        delta.anxiety = -5.0

    elif any(word in activity_lower for word in ["eat", "meal", "food", "lunch", "dinner", "breakfast"]):
        delta.happiness = 3.0
        delta.energy = 5.0

    elif any(word in activity_lower for word in ["chat", "talk", "call", "friend", "social"]):
        delta.happiness = 5.0
        delta.loneliness = -8.0

    elif any(word in activity_lower for word in ["alone", "solitude", "reading", "relaxing"]):
        delta.energy = 5.0
        delta.loneliness = 3.0

    return delta


def parse_ai_emotion_delta(ai_output: dict) -> EmotionDelta:
    """Convert AI-returned emotion_delta dict into an EmotionDelta dataclass."""
    delta = EmotionDelta()
    for key in EMOTION_KEYS:
        if key in ai_output:
            setattr(delta, key, float(ai_output[key]))
    return delta


def get_mood_label(state: CharacterState) -> str:
    """Return a single descriptive mood label based on dominant emotions."""
    if state.happiness >= 75 and state.stress <= 25:
        return "very happy"
    elif state.stress >= 70:
        return "very stressed"
    elif state.anxiety >= 70:
        return "very anxious"
    elif state.loneliness >= 65:
        return "lonely"
    elif state.resentment >= 50:
        return "resentful"
    elif state.happiness >= 60:
        return "content"
    elif state.happiness <= 30:
        return "sad"
    elif state.energy <= 20:
        return "exhausted"
    return "neutral"
