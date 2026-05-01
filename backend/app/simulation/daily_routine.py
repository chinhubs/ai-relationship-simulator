"""
Daily Routine Scheduler — returns the activity and location for a given sim time.
Based on typical Thai young-professional life pattern.
"""

from dataclasses import dataclass


@dataclass
class RoutineSlot:
    start: str  # "HH:MM"
    activity: str
    location: str
    energy_drain: float = 0.0
    social: bool = False


DAILY_SCHEDULE: list[RoutineSlot] = [
    RoutineSlot("00:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("01:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("02:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("03:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("04:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("05:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("06:00", "waking up and getting ready", "home", 5.0),
    RoutineSlot("07:00", "breakfast and commute", "home / BTS / road", 3.0),
    RoutineSlot("08:00", "arriving at work, checking messages", "office", -3.0),
    RoutineSlot("09:00", "working", "office", -4.0),
    RoutineSlot("10:00", "working", "office", -4.0),
    RoutineSlot("11:00", "working", "office", -4.0),
    RoutineSlot("12:00", "lunch break", "near office / 7-Eleven", 5.0, social=True),
    RoutineSlot("13:00", "working", "office", -4.0),
    RoutineSlot("14:00", "working / meeting", "office", -5.0),
    RoutineSlot("15:00", "working", "office", -4.0),
    RoutineSlot("16:00", "wrapping up work", "office", -3.0),
    RoutineSlot("17:00", "commuting home", "BTS / road", -2.0),
    RoutineSlot("18:00", "dinner / evening routine", "home / restaurant", 5.0, social=True),
    RoutineSlot("19:00", "relaxing — phone, shows, social media", "home", 3.0),
    RoutineSlot("20:00", "personal time — chatting, hobbies", "home", 2.0, social=True),
    RoutineSlot("21:00", "winding down", "home", 1.0),
    RoutineSlot("22:00", "getting ready for sleep", "home (bedroom)", 0.0),
    RoutineSlot("23:00", "sleeping", "home (bedroom)", -0.5),
]

WEEKEND_SCHEDULE: list[RoutineSlot] = [
    RoutineSlot("00:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("01:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("02:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("03:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("04:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("05:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("06:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("07:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("08:00", "waking up slowly", "home", 3.0),
    RoutineSlot("09:00", "breakfast / brunch at home", "home", 4.0),
    RoutineSlot("10:00", "weekend chores or relaxing", "home", 2.0),
    RoutineSlot("11:00", "getting ready to go out", "home", 2.0),
    RoutineSlot("12:00", "lunch with family or friends", "restaurant / shopping mall", 6.0, social=True),
    RoutineSlot("13:00", "shopping / hanging out", "Central / shopping mall / market", 4.0, social=True),
    RoutineSlot("14:00", "leisure activities", "shopping mall / park / cafe", 3.0),
    RoutineSlot("15:00", "cafe or errands", "cafe / 7-Eleven", 2.0),
    RoutineSlot("16:00", "heading home / nap", "home", 2.0),
    RoutineSlot("17:00", "free time", "home", 2.0),
    RoutineSlot("18:00", "evening meal", "home / restaurant", 5.0, social=True),
    RoutineSlot("19:00", "relaxing", "home", 3.0, social=True),
    RoutineSlot("20:00", "social media / chatting", "home", 2.0, social=True),
    RoutineSlot("21:00", "winding down", "home", 1.0),
    RoutineSlot("22:00", "getting ready for sleep", "home (bedroom)", 0.0),
    RoutineSlot("23:00", "sleeping", "home (bedroom)", -0.5),
]


def get_routine_slot(sim_time: str, is_weekend: bool = False) -> RoutineSlot:
    schedule = WEEKEND_SCHEDULE if is_weekend else DAILY_SCHEDULE
    hour = int(sim_time.split(":")[0])
    for slot in reversed(schedule):
        slot_hour = int(slot.start.split(":")[0])
        if hour >= slot_hour:
            return slot
    return schedule[0]


def is_weekend(sim_day: int) -> bool:
    return (sim_day % 7) in (6, 0)


def advance_time(sim_time: str, minutes: int = 60) -> tuple[str, bool]:
    """
    Advance sim_time by `minutes`. Returns (new_time, crossed_midnight).
    """
    h, m = map(int, sim_time.split(":"))
    total = h * 60 + m + minutes
    crossed_midnight = total >= 1440
    total = total % 1440
    return f"{total // 60:02d}:{total % 60:02d}", crossed_midnight
