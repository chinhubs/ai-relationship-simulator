import openai
from .config import settings

_client: openai.AsyncOpenAI | None = None

MODEL = "gpt-4o"


def get_claude_client() -> openai.AsyncOpenAI:
    global _client
    if _client is None:
        _client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def call_brain(
    system_prompt: str,
    user_message: str,
    *,
    cache_persona: bool = True,
    max_tokens: int = 2048,
) -> str:
    client = get_claude_client()
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content or ""


async def call_brain_stream(
    system_prompt: str,
    user_message: str,
    *,
    cache_persona: bool = True,
    max_tokens: int = 4096,
):
    client = get_claude_client()
    stream = await client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        stream=True,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content
        if text:
            yield text


async def analyze_persona_answers(answers_json: str) -> dict:
    client = get_claude_client()
    system = (
        "You are a clinical psychologist specializing in attachment theory and personality modeling. "
        "Analyze questionnaire answers and return a JSON object with these exact keys:\n"
        "  personality_core, emotional_patterns, attachment_style, communication_style, "
        "conflict_behavior, love_languages, trigger_points, daily_life_patterns, "
        "core_values, boundaries\n"
        "Each key maps to an object with 'summary' (string) and 'traits' (list of strings). "
        "Also include 'attachment_scores': {secure, anxious, avoidant, fearful_avoidant} as 0-100 values summing to 100."
    )
    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=3000,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Questionnaire answers (JSON):\n{answers_json}\n\nReturn only valid JSON, no markdown.",
            },
        ],
    )
    import json, re
    text = response.choices[0].message.content or ""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    return {}
