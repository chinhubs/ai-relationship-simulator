"""
Daily Routine Scheduler — returns the activity and location for a given sim time.
Based on typical Thai young-professional life pattern.
"""

import random
from dataclasses import dataclass, replace as _dc_replace


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


PET_SCHEDULE: list[RoutineSlot] = [
    RoutineSlot("00:00", "sleeping soundly in their spot", "home (bedroom)", -0.3),
    RoutineSlot("01:00", "sleeping", "home (bedroom)", -0.3),
    RoutineSlot("02:00", "sleeping", "home (bedroom)", -0.3),
    RoutineSlot("03:00", "sleeping", "home (bedroom)", -0.3),
    RoutineSlot("04:00", "sleeping", "home (bedroom)", -0.3),
    RoutineSlot("05:00", "waking up early, stretching and grooming", "home", 1.5),
    RoutineSlot("06:00", "exploring the house and looking out the window", "home (living room)", 2.0),
    RoutineSlot("07:00", "waiting eagerly for breakfast", "home (kitchen)", 2.0),
    RoutineSlot("08:00", "eating breakfast", "home (kitchen)", 3.0),
    RoutineSlot("09:00", "playing with toys", "home (living room)", 3.0),
    RoutineSlot("10:00", "sunbathing by the window", "home (living room)", 1.5),
    RoutineSlot("11:00", "mid-morning nap", "home (bedroom)", -0.3),
    RoutineSlot("12:00", "napping", "home (bedroom)", -0.3),
    RoutineSlot("13:00", "grooming after nap", "home", 1.5),
    RoutineSlot("14:00", "exploring and playing around the house", "home (living room)", 2.0),
    RoutineSlot("15:00", "watching birds and people from the window", "home (living room)", 1.0),
    RoutineSlot("16:00", "waiting near the door for owner to return", "home", 3.0),
    RoutineSlot("17:00", "playing with owner after they return home", "home", 5.0, social=True),
    RoutineSlot("18:00", "eating dinner", "home (kitchen)", 3.0),
    RoutineSlot("19:00", "cuddling and relaxing with owner", "home (living room)", 3.5, social=True),
    RoutineSlot("20:00", "evening play or grooming session", "home (living room)", 2.0, social=True),
    RoutineSlot("21:00", "settling down for the night", "home (bedroom)", 0.5),
    RoutineSlot("22:00", "sleeping", "home (bedroom)", -0.3),
    RoutineSlot("23:00", "sleeping", "home (bedroom)", -0.3),
]

GRANDPARENT_SCHEDULE: list[RoutineSlot] = [
    RoutineSlot("00:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("01:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("02:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("03:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("04:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("05:00", "waking up early, morning prayers or meditation", "home", 2.0),
    RoutineSlot("06:00", "morning walk in the park", "park", 3.0),
    RoutineSlot("07:00", "breakfast and morning routines", "home", 3.0),
    RoutineSlot("08:00", "reading newspaper or watching morning news", "home (living room)", 1.5),
    RoutineSlot("09:00", "light household chores or tending to plants", "home", 2.0),
    RoutineSlot("10:00", "resting and watching TV", "home (living room)", 2.0),
    RoutineSlot("11:00", "preparing or waiting for lunch", "home (kitchen)", 2.0),
    RoutineSlot("12:00", "lunch", "home (kitchen)", 3.0, social=True),
    RoutineSlot("13:00", "afternoon nap", "home (bedroom)", -0.3),
    RoutineSlot("14:00", "afternoon nap", "home (bedroom)", -0.3),
    RoutineSlot("15:00", "afternoon tea and resting", "home (living room)", 2.0),
    RoutineSlot("16:00", "watching TV or chatting with family", "home (living room)", 2.0, social=True),
    RoutineSlot("17:00", "light dinner preparations", "home (kitchen)", 2.0),
    RoutineSlot("18:00", "dinner with family", "home", 4.0, social=True),
    RoutineSlot("19:00", "relaxing and watching evening programs", "home (living room)", 2.0),
    RoutineSlot("20:00", "winding down, light reading or TV", "home", 1.5),
    RoutineSlot("21:00", "getting ready for sleep", "home (bedroom)", 0.5),
    RoutineSlot("22:00", "sleeping", "home (bedroom)", -0.5),
    RoutineSlot("23:00", "sleeping", "home (bedroom)", -0.5),
]


def get_routine_slot(sim_time: str, is_weekend: bool = False, char_type: str = "human") -> RoutineSlot:
    if char_type == "pet":
        schedule = PET_SCHEDULE
    elif char_type == "grandparent":
        schedule = GRANDPARENT_SCHEDULE
    else:
        schedule = WEEKEND_SCHEDULE if is_weekend else DAILY_SCHEDULE
    hour = int(sim_time.split(":")[0])
    for slot in reversed(schedule):
        slot_hour = int(slot.start.split(":")[0])
        if hour >= slot_hour:
            return slot
    return schedule[0]


def is_weekend(sim_day: int) -> bool:
    # Day 1 = Sunday, Day 7 = Saturday. Weekends: 1%7=1 (Sun), 7%7=0 (Sat)
    return (sim_day % 7) in (0, 1)


def advance_time(sim_time: str, minutes: int = 60) -> tuple[str, bool]:
    """
    Advance sim_time by `minutes`. Returns (new_time, crossed_midnight).
    """
    h, m = map(int, sim_time.split(":"))
    total = h * 60 + m + minutes
    crossed_midnight = total >= 1440
    total = total % 1440
    return f"{total // 60:02d}:{total % 60:02d}", crossed_midnight


# Keywords that identify a "generic office/work" slot needing personalisation
_WORK_SLOT_KEYS = frozenset({
    "office", "work", "ที่ทำงาน", "สำนักงาน", "ออฟฟิศ", "บริษัท", "near office",
})


def personalise_work_slot(
    slot: RoutineSlot,
    occupation: str,
    work_details: str,
    daily_routine_notes: str,
    sim_day: int,
    char_id: int,
) -> RoutineSlot:
    """
    Replace the generic "office" location in a RoutineSlot with the character's
    actual workplace derived from their occupation / profile_extra.

    Uses a day+id seeded RNG so decisions are stable across all ticks of the
    same sim-day (a WFH worker who goes in on Tuesday stays in all day).
    """
    loc_lower = slot.location.lower()
    if not any(k in loc_lower for k in _WORK_SLOT_KEYS):
        return slot  # sleeping, home, commute — leave unchanged

    combined = f"{occupation} {work_details} {daily_routine_notes}".lower()
    rng = random.Random(sim_day * 10007 + char_id)

    # ── Work from home / fully remote ─────────────────────────────────────────
    wfh_kw = [
        "work from home", "wfh", "ทำงานที่บ้าน", "ทำงานจากบ้าน",
        "freelance", "ฟรีแลนซ์", "remote work", "remote",
        "ทำงานออนไลน์", "งานออนไลน์", "content creator", "youtuber",
        "streamer", "influencer", "นักเขียน", "writer", "นักแปล",
    ]
    if any(k in combined for k in wfh_kw):
        office_kw = ["office", "ออฟฟิศ", "บริษัท", "meeting", "ประชุม", "client"]
        goes_in = any(k in combined for k in office_kw) and rng.random() < 0.28
        if goes_in:
            label = occupation or "ที่ทำงาน"
            return _dc_replace(slot,
                               location=f"ออฟฟิศ — นัดประชุม {label}",
                               activity=f"เข้า office วันนี้ — {slot.activity}")
        return _dc_replace(slot,
                           location="home / ทำงานที่บ้าน",
                           activity=f"working from home — {slot.activity}")

    # ── Mall-based clinic: beauty / cosmetic / aesthetic ─────────────────────
    mall_clinic_kw = [
        "คลีนิก", "คลินิก", "ความงาม", "beauty", "cosmetic", "aesthetic",
        "dermatol", "สปา", "spa", "ผิวพรรณ", "ผิว", "laser", "filler",
        "botox", "ห้าง", "mall", "central", "emquartier", "paragon",
        "terminal21", "สยาม", "เซ็นทรัล", "icon", "megabangna",
    ]
    if any(k in combined for k in mall_clinic_kw):
        label = occupation or "คลีนิก"
        return _dc_replace(slot,
                           location=f"ห้างสรรพสินค้า — {label}",
                           activity=f"ดูแลลูกค้าที่คลีนิก — {slot.activity}")

    # ── Hospital / clinical medicine ──────────────────────────────────────────
    hosp_kw = [
        "hospital", "โรงพยาบาล", "แพทย์", "หมอ", "doctor", "physician",
        "surgeon", "พยาบาล", "nurse", "pharmacist", "เภสัช",
        "กุมาร", "ศัลย", "อายุรกรรม", "ฉุกเฉิน", "er ",
        "ทันตกรรม", "ฟัน", "dentist", "ทันตแพทย์",
    ]
    if any(k in combined for k in hosp_kw):
        label = occupation or "แผนกการแพทย์"
        return _dc_replace(slot,
                           location=f"โรงพยาบาล — {label}",
                           activity=f"ทำงานที่โรงพยาบาล — {slot.activity}")

    # ── Cafe / coffee shop ────────────────────────────────────────────────────
    cafe_kw = ["cafe", "coffee", "คาเฟ่", "กาแฟ", "barista", "บาริสต้า", "ร้านกาแฟ"]
    if any(k in combined for k in cafe_kw):
        label = occupation or "ร้านกาแฟ"
        return _dc_replace(slot,
                           location=f"คาเฟ่ — {label}",
                           activity=f"ทำงานที่คาเฟ่ — {slot.activity}")

    # ── Restaurant / kitchen ──────────────────────────────────────────────────
    rest_kw = [
        "restaurant", "ร้านอาหาร", "chef", "cook", "พ่อครัว", "แม่ครัว",
        "เชฟ", "ครัว", "kitchen", "ร้านก๋วยเตี๋ยว", "ร้านข้าว",
    ]
    if any(k in combined for k in rest_kw):
        label = occupation or "ร้านอาหาร"
        return _dc_replace(slot,
                           location=f"ร้านอาหาร — {label}",
                           activity=f"ทำงานที่ร้านอาหาร — {slot.activity}")

    # ── Bank / finance ────────────────────────────────────────────────────────
    bank_kw = ["bank", "ธนาคาร", "finance", "การเงิน", "นายธนาคาร", "banker"]
    if any(k in combined for k in bank_kw):
        label = occupation or "สาขา"
        return _dc_replace(slot,
                           location=f"ธนาคาร — {label}",
                           activity=f"ทำงานที่ธนาคาร — {slot.activity}")

    # ── School / university / teaching ───────────────────────────────────────
    school_kw = [
        "school", "university", "โรงเรียน", "มหาวิทยาลัย",
        "teacher", "professor", "อาจารย์", "ครู", "tutor", "ติวเตอร์",
        "สอน", "วิทยาลัย", "college", "kindergarten", "อนุบาล",
    ]
    if any(k in combined for k in school_kw):
        label = occupation or "ห้องเรียน"
        return _dc_replace(slot,
                           location=f"โรงเรียน — {label}",
                           activity=f"สอนหนังสือ — {slot.activity}")

    # ── Gym / fitness / sport ─────────────────────────────────────────────────
    gym_kw = [
        "gym", "ฟิตเนส", "fitness", "personal trainer", "เทรนเนอร์",
        "yoga", "pilates", "สนามกีฬา", "โค้ช", "coach", "นักกีฬา",
    ]
    if any(k in combined for k in gym_kw):
        label = occupation or "สนามกีฬา"
        return _dc_replace(slot,
                           location=f"ฟิตเนส — {label}",
                           activity=f"ทำงานที่ฟิตเนส — {slot.activity}")

    # ── Retail / store ────────────────────────────────────────────────────────
    retail_kw = [
        "store", "shop", "ร้านค้า", "retail", "ขาย", "cashier",
        "แคชเชียร์", "convenience", "7-eleven", "minimart", "ตลาด",
    ]
    if any(k in combined for k in retail_kw):
        label = occupation or "ร้านค้า"
        return _dc_replace(slot,
                           location=f"ร้านค้า — {label}",
                           activity=f"ทำงานที่ร้านค้า — {slot.activity}")

    # ── IT / tech — partial WFH tendency ─────────────────────────────────────
    tech_kw = [
        "developer", "programmer", "software", "โปรแกรมเมอร์", "นักพัฒนา",
        "data scientist", "data analyst", "ux", "ui designer", "graphic designer",
        "กราฟิก", "digital", "full stack", "backend", "frontend",
        "devops", "cloud", "ai engineer", "machine learning",
    ]
    if any(k in combined for k in tech_kw):
        if rng.random() < 0.35:
            return _dc_replace(slot,
                               location="home / ทำงานที่บ้าน",
                               activity=f"working from home — {slot.activity}")
        label = occupation or "tech company"
        return _dc_replace(slot,
                           location=f"ออฟฟิศ — {label}",
                           activity=slot.activity)

    # ── Default: office but label with actual occupation ──────────────────────
    if occupation:
        return _dc_replace(slot,
                           location=f"ออฟฟิศ — {occupation}",
                           activity=slot.activity)
    return slot
