import json
import re
import logging
import openai
from .config import settings

logger = logging.getLogger(__name__)

# Ordered by preference: best value → cheapest fallback (confirmed available)
_MODEL_FALLBACK = [
    "gpt-4.1-mini-2025-04-14",   # best value: capable + cheap
    "gpt-5-nano",                  # newer nano, good for short decisions
    "gpt-4.1-nano-2025-04-14",    # cheapest capable option
    "gpt-3.5-turbo-16k",           # reliable last resort
]

_client: openai.AsyncOpenAI | None = None
_resolved_model: str | None = None


def get_claude_client() -> openai.AsyncOpenAI:
    global _client
    if _client is None:
        _client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


def _is_model_access_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "model_not_found" in msg or "does not have access to model" in msg


async def _call_with_fallback(messages: list[dict], max_tokens: int) -> tuple[str, dict]:
    """
    Try configured model first, then fall back through the list.
    Returns (content, usage_dict) where usage_dict has:
      prompt_tokens, completion_tokens, total_tokens, cached_tokens
    """
    global _resolved_model
    client = get_claude_client()

    preferred = settings.openai_model
    candidates = [preferred] + [m for m in _MODEL_FALLBACK if m != preferred]

    if _resolved_model and _resolved_model in candidates:
        candidates = [_resolved_model] + [m for m in candidates if m != _resolved_model]

    last_exc = None
    for model in candidates:
        try:
            response = await client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=messages,
            )
            if _resolved_model != model:
                _resolved_model = model
                logger.info("Using OpenAI model: %s", model)

            usage: dict = {}
            if response.usage:
                cached = 0
                details = getattr(response.usage, "prompt_tokens_details", None)
                if details:
                    cached = getattr(details, "cached_tokens", 0) or 0
                usage = {
                    "prompt_tokens":     response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens":      response.usage.total_tokens,
                    "cached_tokens":     cached,
                }
                logger.debug(
                    "Token usage — prompt:%d completion:%d cached:%d model:%s",
                    usage["prompt_tokens"], usage["completion_tokens"], cached, model,
                )

            return response.choices[0].message.content or "", usage

        except Exception as exc:
            if _is_model_access_error(exc):
                logger.warning("Model %s not accessible, trying next...", model)
                last_exc = exc
                continue
            raise

    raise RuntimeError(f"No accessible OpenAI model found. Last error: {last_exc}")


async def call_brain(
    system_prompt: str,
    user_message: str,
    *,
    cache_persona: bool = True,
    max_tokens: int = 2048,
) -> tuple[str, dict]:
    """
    Call the AI brain. Returns (response_text, usage_dict).
    usage_dict keys: prompt_tokens, completion_tokens, total_tokens, cached_tokens
    """
    return await _call_with_fallback(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        max_tokens=max_tokens,
    )


async def call_brain_stream(
    system_prompt: str,
    user_message: str,
    *,
    cache_persona: bool = True,
    max_tokens: int = 4096,
):
    client = get_claude_client()
    model = _resolved_model or settings.openai_model
    stream = await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        stream=True,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content
        if text:
            yield text


async def analyze_persona_answers(answers_json: str) -> dict:
    system = (
        "You are a clinical psychologist specializing in attachment theory and personality modeling. "
        "Analyze questionnaire answers and return a JSON object with these exact keys:\n"
        "  personality_core, emotional_patterns, attachment_style, communication_style, "
        "conflict_behavior, love_languages, trigger_points, daily_life_patterns, "
        "core_values, boundaries\n"
        "Each key maps to an object with 'summary' (string) and 'traits' (list of strings). "
        "Also include 'attachment_scores': {secure, anxious, avoidant, fearful_avoidant} "
        "as 0-100 values summing to 100."
    )
    text, _ = await _call_with_fallback(
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Questionnaire answers (JSON):\n{answers_json}\n\nReturn only valid JSON, no markdown.",
            },
        ],
        max_tokens=3000,
    )
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    return {}
