"""
Persona Intake Questionnaire — Standard Level (40-60 questions).
Covers 10 personality dimensions mapped to the PersonaProfile schema.
"""

from dataclasses import dataclass, field
from enum import Enum


class QuestionType(str, Enum):
    LIKERT = "likert"           # 1-5 scale
    FORCED_CHOICE = "forced_choice"
    OPEN_ENDED = "open_ended"
    SCENARIO = "scenario"
    MULTI_SELECT = "multi_select"


@dataclass
class Question:
    id: str
    category: str
    text: str
    question_type: QuestionType
    options: list[str] = field(default_factory=list)
    weight: float = 1.0
    thai_text: str = ""


QUESTIONNAIRE_STANDARD: list[Question] = [
    # ── PERSONALITY CORE ──────────────────────────────────────────────────────
    Question(
        id="pc_01", category="personality_core", question_type=QuestionType.LIKERT,
        text="I enjoy being in large social gatherings with many people.",
        thai_text="ฉันชอบอยู่ในงานสังสรรค์ใหญ่ที่มีคนเยอะๆ",
    ),
    Question(
        id="pc_02", category="personality_core", question_type=QuestionType.LIKERT,
        text="I prefer to plan things in advance rather than being spontaneous.",
        thai_text="ฉันชอบวางแผนล่วงหน้ามากกว่าทำอะไรตามใจ",
    ),
    Question(
        id="pc_03", category="personality_core", question_type=QuestionType.FORCED_CHOICE,
        text="Which describes you better?",
        thai_text="อะไรที่บอกลักษณะของคุณได้ดีกว่า?",
        options=[
            "I recharge by spending time alone",
            "I recharge by being around people",
        ],
    ),
    Question(
        id="pc_04", category="personality_core", question_type=QuestionType.LIKERT,
        text="I tend to overthink before making decisions.",
        thai_text="ฉันมักคิดมากก่อนตัดสินใจ",
    ),
    Question(
        id="pc_05", category="personality_core", question_type=QuestionType.SCENARIO,
        text="Your weekend plans suddenly get cancelled. What do you most likely do?",
        thai_text="แผนสุดสัปดาห์ถูกยกเลิกกะทันหัน คุณมักจะทำอะไร?",
        options=[
            "Immediately make new plans with other people",
            "Enjoy the unexpected free time alone",
            "Feel a bit lost, then find something productive to do",
            "Feel frustrated and contact the person who cancelled",
        ],
    ),
    Question(
        id="pc_06", category="personality_core", question_type=QuestionType.OPEN_ENDED,
        text="In three words, how would your closest friends describe you?",
        thai_text="เพื่อนสนิทของคุณจะบอกว่าคุณเป็นคนแบบไหนใน 3 คำ?",
    ),

    # ── EMOTIONAL PATTERNS ────────────────────────────────────────────────────
    Question(
        id="ep_01", category="emotional_patterns", question_type=QuestionType.LIKERT,
        text="When I'm upset, I find it easy to identify exactly what I'm feeling.",
        thai_text="เมื่อฉันรู้สึกไม่ดี ฉันสามารถระบุความรู้สึกได้ชัดเจน",
    ),
    Question(
        id="ep_02", category="emotional_patterns", question_type=QuestionType.LIKERT,
        text="I tend to bottle up my emotions rather than express them.",
        thai_text="ฉันมักเก็บความรู้สึกไว้คนเดียวมากกว่าแสดงออก",
    ),
    Question(
        id="ep_03", category="emotional_patterns", question_type=QuestionType.SCENARIO,
        text="A close friend forgot your birthday. How do you react?",
        thai_text="เพื่อนสนิทลืมวันเกิดของคุณ คุณจะรู้สึกอย่างไร?",
        options=[
            "Hurt but won't say anything, just remember it",
            "Tell them directly that it bothered me",
            "Brush it off — it's not a big deal",
            "Make a joke about it but feel hurt inside",
        ],
    ),
    Question(
        id="ep_04", category="emotional_patterns", question_type=QuestionType.LIKERT,
        text="My mood is heavily influenced by the mood of people around me.",
        thai_text="อารมณ์ของฉันได้รับผลกระทบมากจากอารมณ์ของคนรอบข้าง",
    ),
    Question(
        id="ep_05", category="emotional_patterns", question_type=QuestionType.MULTI_SELECT,
        text="When extremely stressed, I tend to: (select all that apply)",
        thai_text="เมื่อเครียดมากๆ ฉันมักจะ: (เลือกทุกข้อที่ตรงกับตัวเอง)",
        options=[
            "Withdraw from social contact",
            "Eat more or less than usual",
            "Sleep more or have insomnia",
            "Become irritable with people I love",
            "Throw myself into work",
            "Seek emotional support from others",
            "Cry alone",
        ],
    ),

    # ── ATTACHMENT STYLE ──────────────────────────────────────────────────────
    Question(
        id="at_01", category="attachment_style", question_type=QuestionType.LIKERT,
        text="I worry that people I care about will leave me.",
        thai_text="ฉันกังวลว่าคนที่ฉันรักจะทิ้งฉันไป",
    ),
    Question(
        id="at_02", category="attachment_style", question_type=QuestionType.LIKERT,
        text="I find it difficult to fully trust and rely on romantic partners.",
        thai_text="ฉันรู้สึกยากที่จะไว้วางใจและพึ่งพาคู่รักได้เต็มที่",
    ),
    Question(
        id="at_03", category="attachment_style", question_type=QuestionType.LIKERT,
        text="I feel comfortable with closeness and emotional intimacy.",
        thai_text="ฉันรู้สึกสบายใจกับความใกล้ชิดและความสนิททางอารมณ์",
    ),
    Question(
        id="at_04", category="attachment_style", question_type=QuestionType.SCENARIO,
        text="Your partner hasn't replied to your messages for 3 hours. What do you feel?",
        thai_text="คู่รักของคุณไม่ตอบข้อความนาน 3 ชั่วโมง คุณรู้สึกอย่างไร?",
        options=[
            "Nothing — they're probably just busy",
            "Slightly wondering but not concerned",
            "Anxious and starting to imagine worst-case scenarios",
            "Annoyed and feeling ignored",
        ],
    ),
    Question(
        id="at_05", category="attachment_style", question_type=QuestionType.LIKERT,
        text="When in conflict with someone close, I tend to pull away and need space.",
        thai_text="เมื่อขัดแย้งกับคนใกล้ชิด ฉันมักถอยห่างและต้องการพื้นที่ส่วนตัว",
    ),
    Question(
        id="at_06", category="attachment_style", question_type=QuestionType.FORCED_CHOICE,
        text="In relationships, which do you tend toward?",
        thai_text="ในความสัมพันธ์ คุณมักเป็นแบบไหน?",
        options=[
            "I sometimes feel too needy or clingy",
            "I sometimes feel too distant or unavailable",
        ],
    ),

    # ── COMMUNICATION STYLE ────────────────────────────────────────────────────
    Question(
        id="cs_01", category="communication_style", question_type=QuestionType.LIKERT,
        text="I'm comfortable initiating difficult conversations with people I care about.",
        thai_text="ฉันสบายใจที่จะเริ่มบทสนทนาที่ยากกับคนที่ฉันรัก",
    ),
    Question(
        id="cs_02", category="communication_style", question_type=QuestionType.FORCED_CHOICE,
        text="When sharing something important, I prefer:",
        thai_text="เมื่อต้องบอกเรื่องสำคัญ ฉันชอบ:",
        options=[
            "Face-to-face conversation",
            "Text/messaging (gives me time to think)",
        ],
    ),
    Question(
        id="cs_03", category="communication_style", question_type=QuestionType.LIKERT,
        text="I often use humor to lighten tense situations.",
        thai_text="ฉันมักใช้อารมณ์ขันเพื่อลดความตึงเครียดในสถานการณ์ยาก",
    ),
    Question(
        id="cs_04", category="communication_style", question_type=QuestionType.SCENARIO,
        text="A friend gives you feedback you don't agree with. You:",
        thai_text="เพื่อนให้ feedback ที่คุณไม่เห็นด้วย คุณจะ:",
        options=[
            "Listen and consider it, even if I disagree",
            "Politely but firmly push back",
            "Go quiet and think about it later",
            "Feel defensive and try to explain myself",
        ],
    ),
    Question(
        id="cs_05", category="communication_style", question_type=QuestionType.LIKERT,
        text="I often say what I mean directly without hinting.",
        thai_text="ฉันมักพูดตรงๆ ในสิ่งที่คิดโดยไม่อ้อมค้อม",
    ),

    # ── CONFLICT BEHAVIOR ──────────────────────────────────────────────────────
    Question(
        id="cb_01", category="conflict_behavior", question_type=QuestionType.LIKERT,
        text="I avoid confrontation even when something is clearly bothering me.",
        thai_text="ฉันหลีกเลี่ยงการเผชิญหน้าแม้จะมีอะไรรบกวนจิตใจชัดเจน",
    ),
    Question(
        id="cb_02", category="conflict_behavior", question_type=QuestionType.SCENARIO,
        text="During a heated argument, you tend to:",
        thai_text="เมื่อมีการโต้เถียงรุนแรง คุณมักจะ:",
        options=[
            "Stay calm and try to find a compromise",
            "Get emotional and raise your voice",
            "Shut down and stop engaging",
            "Bring up past grievances",
            "Apologize quickly just to end the conflict",
        ],
    ),
    Question(
        id="cb_03", category="conflict_behavior", question_type=QuestionType.LIKERT,
        text="After a fight, I need time alone before I can talk things through.",
        thai_text="หลังจากทะเลาะ ฉันต้องการเวลาอยู่คนเดียวก่อนจะคุยต่อได้",
    ),
    Question(
        id="cb_04", category="conflict_behavior", question_type=QuestionType.LIKERT,
        text="I find it easy to apologize when I'm wrong.",
        thai_text="ฉันสามารถขอโทษได้ง่ายเมื่อทำผิด",
    ),
    Question(
        id="cb_05", category="conflict_behavior", question_type=QuestionType.FORCED_CHOICE,
        text="When in conflict with someone you love:",
        thai_text="เมื่อขัดแย้งกับคนที่คุณรัก:",
        options=[
            "Resolving it quickly matters most to me",
            "Being understood matters more than resolving quickly",
        ],
    ),

    # ── LOVE LANGUAGE ─────────────────────────────────────────────────────────
    Question(
        id="ll_01", category="love_languages", question_type=QuestionType.MULTI_SELECT,
        text="I feel most loved when someone: (select top 2)",
        thai_text="ฉันรู้สึกได้รับความรักมากที่สุดเมื่อคนอื่น: (เลือก 2 ข้อ)",
        options=[
            "Tells me kind and appreciative things (Words of Affirmation)",
            "Spends quality focused time with me (Quality Time)",
            "Does helpful things for me (Acts of Service)",
            "Gives me thoughtful gifts (Receiving Gifts)",
            "Hugs, holds my hand, or physical touch (Physical Touch)",
        ],
    ),
    Question(
        id="ll_02", category="love_languages", question_type=QuestionType.SCENARIO,
        text="Your partner is sick. Which action feels most natural to you?",
        thai_text="คู่รักของคุณป่วย คุณจะทำอะไรเป็นธรรมชาติที่สุด?",
        options=[
            "Send sweet, encouraging messages",
            "Go take care of them in person",
            "Cook or bring them food and medicine",
            "Buy something you know they'd like",
        ],
    ),
    Question(
        id="ll_03", category="love_languages", question_type=QuestionType.LIKERT,
        text="Physical closeness (holding hands, hugging) is very important to me in relationships.",
        thai_text="ความใกล้ชิดทางกาย (จับมือ กอด) สำคัญมากสำหรับฉันในความสัมพันธ์",
    ),

    # ── TRIGGER POINTS ────────────────────────────────────────────────────────
    Question(
        id="tp_01", category="trigger_points", question_type=QuestionType.MULTI_SELECT,
        text="Which situations trigger strong negative emotions in me: (select all that apply)",
        thai_text="สถานการณ์ใดที่ทำให้ฉันมีอารมณ์ลบรุนแรง: (เลือกทุกข้อที่ตรง)",
        options=[
            "Being ignored or left on read",
            "Broken promises",
            "Public criticism or embarrassment",
            "Feeling controlled or told what to do",
            "Being compared to others",
            "Feeling like I'm not good enough",
            "Disloyalty or betrayal",
            "Being interrupted constantly",
        ],
    ),
    Question(
        id="tp_02", category="trigger_points", question_type=QuestionType.OPEN_ENDED,
        text="Describe one specific situation or behaviour that would make you feel deeply hurt or disrespected.",
        thai_text="อธิบายสถานการณ์หรือพฤติกรรมหนึ่งอย่างที่จะทำให้คุณรู้สึกเจ็บปวดหรือไม่ได้รับการเคารพอย่างมาก",
    ),
    Question(
        id="tp_03", category="trigger_points", question_type=QuestionType.LIKERT,
        text="Being excluded from group decisions or conversations affects me negatively.",
        thai_text="การถูกกีดกันออกจากการตัดสินใจหรือบทสนทนากลุ่มส่งผลเสียต่อฉัน",
    ),

    # ── DAILY LIFE PATTERNS ───────────────────────────────────────────────────
    Question(
        id="dl_01", category="daily_life_patterns", question_type=QuestionType.FORCED_CHOICE,
        text="Which are you?",
        thai_text="คุณเป็นคนแบบไหน?",
        options=["Morning person", "Night owl"],
    ),
    Question(
        id="dl_02", category="daily_life_patterns", question_type=QuestionType.MULTI_SELECT,
        text="My typical stress-relief activities include: (select all that apply)",
        thai_text="กิจกรรมคลายเครียดของฉันมักได้แก่: (เลือกทุกข้อที่ตรง)",
        options=[
            "Exercise or sports",
            "Social media / YouTube / Netflix",
            "Talking with friends",
            "Shopping (online or in-person)",
            "Cooking or eating good food",
            "Music",
            "Reading or creative hobbies",
            "Sleep or rest",
        ],
    ),
    Question(
        id="dl_03", category="daily_life_patterns", question_type=QuestionType.LIKERT,
        text="I check my phone immediately when I receive a notification.",
        thai_text="ฉันเช็คโทรศัพท์ทันทีเมื่อมีการแจ้งเตือน",
    ),
    Question(
        id="dl_04", category="daily_life_patterns", question_type=QuestionType.SCENARIO,
        text="It's 10 PM on a workday. What are you most likely doing?",
        thai_text="เวลา 22:00 ของวันทำงาน คุณมักทำอะไรอยู่?",
        options=[
            "Sleeping or preparing for bed",
            "Watching shows or scrolling social media",
            "Still working on something",
            "Chatting with someone I care about",
            "Out with friends",
        ],
    ),

    # ── MEMORY & HISTORY ──────────────────────────────────────────────────────
    Question(
        id="mh_01", category="memory_patterns", question_type=QuestionType.LIKERT,
        text="I tend to remember and replay negative events long after they happen.",
        thai_text="ฉันมักจดจำและนึกถึงเหตุการณ์ไม่ดีนานหลังจากที่เกิดขึ้นแล้ว",
    ),
    Question(
        id="mh_02", category="memory_patterns", question_type=QuestionType.FORCED_CHOICE,
        text="When someone wrongs me once:",
        thai_text="เมื่อคนทำให้ฉันผิดหวังครั้งหนึ่ง:",
        options=[
            "I forgive and genuinely forget fairly easily",
            "I forgive but don't fully forget",
        ],
    ),
    Question(
        id="mh_03", category="memory_patterns", question_type=QuestionType.LIKERT,
        text="Past relationship experiences heavily influence how I act in current relationships.",
        thai_text="ประสบการณ์ความสัมพันธ์ในอดีตส่งผลต่อการกระทำของฉันในปัจจุบันมาก",
    ),

    # ── CORE VALUES & BOUNDARIES ──────────────────────────────────────────────
    Question(
        id="cv_01", category="core_values", question_type=QuestionType.MULTI_SELECT,
        text="My top values in life include: (select up to 4)",
        thai_text="ค่านิยมสำคัญที่สุดของฉันในชีวิตได้แก่: (เลือกไม่เกิน 4 ข้อ)",
        options=[
            "Loyalty",
            "Freedom / Independence",
            "Family",
            "Ambition / Success",
            "Honesty",
            "Kindness / Compassion",
            "Fun / Enjoyment",
            "Security / Stability",
            "Growth / Learning",
            "Adventure",
        ],
    ),
    Question(
        id="cv_02", category="core_values", question_type=QuestionType.LIKERT,
        text="My personal boundaries are clearly defined and I enforce them.",
        thai_text="ขอบเขตส่วนตัวของฉันชัดเจนและฉันยึดถือมัน",
    ),
    Question(
        id="cv_03", category="core_values", question_type=QuestionType.SCENARIO,
        text="A close friend asks to borrow a large amount of money you have. You:",
        thai_text="เพื่อนสนิทขอยืมเงินก้อนใหญ่จากคุณ คุณจะ:",
        options=[
            "Lend it without hesitation — friendship first",
            "Ask some questions before deciding",
            "Make an excuse to avoid lending",
            "Decline directly — I separate money from friendship",
        ],
    ),
    Question(
        id="bd_01", category="boundaries", question_type=QuestionType.MULTI_SELECT,
        text="Things that are hard limits / absolute boundaries for me include: (select all that apply)",
        thai_text="สิ่งที่เป็นขอบเขตที่ฉันยอมรับไม่ได้เลย ได้แก่: (เลือกทุกข้อที่ตรง)",
        options=[
            "Dishonesty or lying to me",
            "Reading through my phone or invading privacy",
            "Disrespecting my family",
            "Controlling who I can see or talk to",
            "Public humiliation",
            "Ghosting without explanation",
            "Comparing me to exes",
        ],
    ),
    Question(
        id="bd_02", category="boundaries", question_type=QuestionType.OPEN_ENDED,
        text="What is one thing a partner or close friend should never do to you?",
        thai_text="อะไรหนึ่งอย่างที่คู่รักหรือเพื่อนสนิทไม่ควรทำกับคุณเด็ดขาด?",
    ),
]


def get_questions_for_level(level: int) -> list[Question]:
    """Return questions appropriate for the given questionnaire level."""
    if level == 1:
        essential_ids = {
            "pc_01", "pc_03", "pc_05",
            "at_01", "at_02", "at_04",
            "ep_03", "cb_02",
            "ll_01", "tp_01",
        }
        return [q for q in QUESTIONNAIRE_STANDARD if q.id in essential_ids]
    elif level == 2:
        return QUESTIONNAIRE_STANDARD
    else:
        return QUESTIONNAIRE_STANDARD


def serialize_questions(questions: list[Question]) -> list[dict]:
    return [
        {
            "id": q.id,
            "category": q.category,
            "text": q.text,
            "thai_text": q.thai_text,
            "question_type": q.question_type.value,
            "options": q.options,
        }
        for q in questions
    ]
