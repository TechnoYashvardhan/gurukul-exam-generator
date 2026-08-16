"""
Core exam generation service.

Pipeline:
  1. Build a structured system prompt from the template + syllabus text
  2. Call the LLM (via abstraction layer) within the rate limiter
  3. Extract JSON from the response (handles markdown fences)
  4. Validate with Pydantic (mark totals, MCQ structure, etc.)
  5. On failure: append the error to the prompt and retry (up to LLM_MAX_RETRIES)
  6. Return (GeneratedExam, retries_used) or raise after exhausted retries

All LLM failures and retry attempts are logged explicitly.
"""

import json
import logging
import re

from asyncio_throttle import Throttler

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError
from app.llm.factory import get_llm_client
from app.schemas.exam import GeneratedExam
from app.schemas.template import ExamTemplate

logger = logging.getLogger(__name__)

# ── Module-level throttler (shared across all requests in process) ────────────
# asyncio-throttle: token bucket, configured via env var
_throttler = Throttler(
    rate_limit=settings.llm_rate_limit_per_min,
    period=60,
)

# ── Bloom's Taxonomy difficulty → guidance mapping ────────────────────────────
BLOOM_GUIDANCE: dict[str, str] = {
    "easy": (
        "REMEMBER and UNDERSTAND (Bloom's levels 1–2). "
        "Questions should test direct recall of facts, definitions, and basic comprehension. "
        "Avoid trick questions. Vocabulary should be grade-appropriate and straightforward."
    ),
    "medium": (
        "APPLY and ANALYZE (Bloom's levels 3–4). "
        "Questions should require students to use knowledge in new contexts, "
        "compare concepts, or break down information into components."
    ),
    "hard": (
        "EVALUATE (Bloom's level 5). "
        "Questions should require critical evaluation, justification of positions, "
        "comparison of competing approaches, and evidence-based reasoning."
    ),
    "extreme": (
        "CREATE (Bloom's level 6). "
        "Questions should require synthesis across multiple concepts, original design, "
        "novel problem-solving, or construction of new frameworks. "
        "Include multi-step problems with partial marks for working shown."
    ),
}


def _build_system_prompt(template: ExamTemplate, syllabus_text: str, custom_topic: str | None = None) -> str:
    """Construct the LLM system prompt from template + syllabus."""
    sections_desc = "\n".join(
        f"  - Section ID '{s.id}' ('{s.title}'): MUST contain EXACTLY {s.num_questions} questions of type '{s.type}'. Each is {s.marks_per_question} mark(s)."
        + (f" Instructions: {s.instructions}" if s.instructions else "")
        for s in template.sections
    )
    section_ids = [s.id for s in template.sections]
    bloom_hint = BLOOM_GUIDANCE.get(template.difficulty, BLOOM_GUIDANCE["medium"])
    
    topic_hint = f"\n═════════════ CUSTOM TOPIC/PROMPT ═════════════\nThe user has requested the exam to specifically focus on:\n{custom_topic}\nMake sure all questions strictly align with this request while still drawing from the provided syllabus content.\n" if custom_topic else ""

    return f"""You are an expert educational exam paper writer.

════════════════════════ TASK ════════════════════════
Generate a complete, high-quality exam paper.
Return ONLY a single valid JSON object — no markdown, no commentary, no explanation.
{topic_hint}
════════════════════ EXAM TEMPLATE ══════════════════
Subject:          {template.subject}
Grade / Level:    {template.grade}
Total Marks:      {template.total_marks}
Duration:         {template.duration_minutes} minutes
Difficulty:       {template.difficulty.upper()}
Bloom's Target:   {bloom_hint}

SECTIONS:
{sections_desc}

════════════════ SYLLABUS CONTENT ═══════════════════
Draw all questions exclusively from the following content.
Do NOT invent topics not covered below.

{syllabus_text}

══════════════════════ RULES ════════════════════════
1.  Generate EXACTLY the number of questions specified per section.
2.  Marks must sum to EXACTLY {template.total_marks}.  This is non-negotiable.
3.  Each question's "marks" must equal the section's marks_per_question.
4.  "section_id" must be one of: {section_ids}. The question's "type" MUST exactly match the required type for that section.
5.  For MCQ: provide exactly 4 options keyed A, B, C, D.  "answer" = the correct key (e.g. "B").
6.  For non-MCQ: omit the "options" field entirely.  "answer" = a full model answer (2–6 sentences).
7.  "bloom_level" must be one of: remember, understand, apply, analyze, evaluate, create.
8.  "difficulty" must be one of: easy, medium, hard, extreme.
9.  Avoid repetition — vary topics, question styles, and cognitive demands across the paper.
10. Number questions sequentially within each section starting from 1.
11. KEEP TEXT EXTREMELY CONCISE. Do not write unnecessarily long questions or answers, to avoid hitting token limits.

══════════════════ REQUIRED JSON FORMAT ═════════════
{{
  "subject": "<subject>",
  "grade": "<grade>",
  "total_marks": <integer>,
  "duration_minutes": <integer>,
  "questions": [
    {{
      "section_id": "<one of {section_ids}>",
      "question_no": <integer starting at 1 per section>,
      "type": "<mcq|short_answer|long_answer|case_study>",
      "text": "<full question text>",
      "options": [{{"key": "A", "text": "..."}}, {{"key": "B", "text": "..."}}, {{"key": "C", "text": "..."}}, {{"key": "D", "text": "..."}}],
      "answer": "<key for MCQ, or model answer text for others>",
      "marks": <integer>,
      "bloom_level": "<remember|understand|apply|analyze|evaluate|create>",
      "difficulty": "<easy|medium|hard|extreme>"
    }}
  ]
}}

REMINDER: Return ONLY the JSON. No ```json fences. No text before or after.
"""


def _extract_json_string(raw: str) -> str:
    """
    Strip markdown code fences if present, returning a bare JSON string.
    Handles: ```json ... ```, ``` ... ```, and plain JSON responses.
    """
    raw = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()
    brace_match = re.search(r"\{[\s\S]*\}", raw)
    if brace_match:
        return brace_match.group(0).strip()
    return raw


def _clean_and_parse_json(raw: str) -> dict:
    """
    Parse JSON with automatic recovery for common LLM syntax issues
    (e.g., trailing commas, unescaped quotes, truncated closing brackets).
    """
    json_str = _extract_json_string(raw)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Step 1: Strip trailing commas
        cleaned = re.sub(r",\s*([\]}])", r"\1", json_str)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Step 2: Auto-repair unclosed quotes and brackets
        open_braces = cleaned.count("{") - cleaned.count("}")
        open_brackets = cleaned.count("[") - cleaned.count("]")
        if open_braces > 0 or open_brackets > 0:
            if cleaned.count('"') % 2 != 0:
                cleaned += '"'
            cleaned = re.sub(r",\s*$", "", cleaned)
            cleaned += ("]" * max(0, open_brackets)) + ("}" * max(0, open_braces))
            cleaned = re.sub(r",\s*([\]}])", r"\1", cleaned)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass

        # If repair still fails, re-raise original JSONDecodeError
        return json.loads(json_str)


async def generate_exam(
    template: ExamTemplate,
    syllabus_text: str,
    source_type: str = "hardcoded",
    custom_topic: str | None = None,
    llm_client: LLMClient | None = None,
) -> tuple[GeneratedExam, int, LLMClient]:
    """
    Run the full generation + validation pipeline.

    Args:
        template:      Validated ExamTemplate.
        syllabus_text: Raw syllabus content to draw questions from.
        source_type:   'hardcoded' | 'document' | 'web_fetch'
        custom_topic:  Optional user prompt to guide the exam generation.
        llm_client:    Optional override (useful for testing).

    Returns:
        (GeneratedExam, retries_used, llm_client_used)

    Raises:
        ValueError: After all retries are exhausted.
        LLMProviderError: On unrecoverable API failure.
    """
    llm = llm_client or get_llm_client()
    system_prompt = _build_system_prompt(template, syllabus_text, custom_topic)
    base_user_message = (
        "Generate the exam paper now following all the rules. "
        "Return ONLY the JSON object."
    )

    max_retries = settings.llm_max_retries
    last_error: str | None = None

    for attempt in range(max_retries + 1):
        user_message = base_user_message
        if last_error and attempt > 0:
            user_message = (
                f"{base_user_message}\n\n"
                f"⚠️  YOUR PREVIOUS RESPONSE FAILED VALIDATION. FIX THE FOLLOWING ERROR:\n"
                f"{last_error}\n\n"
                "Try again, return ONLY the corrected valid JSON."
            )

        logger.info(
            "LLM generation attempt %d/%d | provider=%s | model=%s | source=%s",
            attempt + 1,
            max_retries + 1,
            llm.provider_name,
            llm.model_name,
            source_type,
        )

        # Generous token budget tuned for 12,000 TPM limit (Prompt ~2500 + Output ~5500 = 8000 TPM)
        total_questions = sum(s.num_questions for s in template.sections)
        dynamic_max_tokens = min(5800, max(1800, total_questions * 140 + 300))

        # ── Rate-limited LLM call ─────────────────────────────────────────────
        async with _throttler:
            try:
                raw_response = await llm.generate(
                    system_prompt=system_prompt,
                    user_message=user_message,
                    temperature=0.3,
                    max_tokens=dynamic_max_tokens,
                )
            except LLMProviderError:
                raise

        logger.debug(
            "Raw LLM response (attempt %d) — first 800 chars:\n%s",
            attempt + 1,
            raw_response[:800],
        )

        # ── JSON extraction + Pydantic validation ─────────────────────────────
        try:
            parsed = _clean_and_parse_json(raw_response)
            exam = GeneratedExam.model_validate(parsed)
            logger.info(
                "✓ Exam validated successfully on attempt %d | %d questions | %d marks",
                attempt + 1,
                len(exam.questions),
                exam.total_marks,
            )
            return exam, attempt, llm

        except json.JSONDecodeError as exc:
            last_error = f"Invalid JSON: {exc}. Raw response start: {raw_response[:300]}"
            logger.warning(
                "JSON parse failed on attempt %d: %s", attempt + 1, last_error
            )
        except ValueError as exc:
            last_error = str(exc)
            logger.warning(
                "Pydantic validation failed on attempt %d: %s", attempt + 1, last_error
            )

    # All retries exhausted
    raise ValueError(
        f"Exam generation failed after {max_retries + 1} attempt(s). "
        f"Last validation error: {last_error}"
    )
