"""
AI-powered semantic answer evaluator for student quiz attempts.
Accurately evaluates fill_in_the_blanks, one_word, short_answer, and subjective questions,
handling word-to-number equivalences (e.g., '1' vs 'one'), synonyms, spelling tolerance,
algebraic forms (e.g. 'x = 17' vs '17'), and scientific terms (e.g. 'O2' vs 'Oxygen').
"""

import asyncio
import json
import logging
import re
from typing import Any, Optional
from pydantic import BaseModel

from app.config import settings
from app.llm.factory import get_llm_client

logger = logging.getLogger(__name__)

NUMBER_WORDS: dict[str, str] = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13",
    "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
    "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30",
    "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70",
    "eighty": "80", "ninety": "90", "hundred": "100",
}


def normalize_text(text: str) -> str:
    """Normalize text for quick matching by stripping LaTeX, punctuation, and mapping number words."""
    if not text:
        return ""
    cleaned = str(text).replace("$", "").replace("\\", "").strip().lower()
    
    # Word-by-word number conversion
    words = cleaned.split()
    converted_words = [NUMBER_WORDS.get(w, w) for w in words]
    cleaned = " ".join(converted_words)
    
    # Keep only alphanumeric and basic operators
    return re.sub(r"[^a-zA-Z0-9\s]", "", cleaned).strip()


def is_fast_match(user_ans: str, expected_ans: str) -> bool:
    """Check if the user answer directly matches the expected answer via normalization or numeric equivalence."""
    u_str = str(user_ans).strip()
    e_str = str(expected_ans).strip()
    
    if not u_str or not e_str:
        return False
        
    if u_str.lower() == e_str.lower():
        return True
        
    norm_u = normalize_text(u_str)
    norm_e = normalize_text(e_str)
    if norm_u and norm_e and norm_u == norm_e:
        return True
        
    # Check numeric equivalence e.g. "1.0" == "1"
    try:
        if float(u_str) == float(e_str):
            return True
    except ValueError:
        pass
        
    return False


class EvaluationItem(BaseModel):
    question_no: int
    is_correct: bool
    score_ratio: float = 1.0  # Between 0.0 and 1.0
    explanation: Optional[str] = None


async def evaluate_answers_with_ai(
    items_to_eval: list[dict[str, Any]],
    timeout_seconds: float = 8.0,
) -> dict[int, EvaluationItem]:
    """
    Use LLM to evaluate student answers conceptually and semantically.
    Batch-evaluates all questions in one prompt to minimize latency.
    """
    if not items_to_eval:
        return {}

    eval_dict: dict[int, EvaluationItem] = {}

    system_prompt = """You are an Expert Semantic Exam Grader.
Your job is to evaluate whether a student's answer to an exam question is conceptually and factually correct compared to the expected answer.

EVALUATION CRITERIA:
1. SEMANTIC EQUIVALENCE: Accept synonyms, equivalent phrases, and alternate valid terms (e.g., '1' vs 'one', '0.5' vs '1/2', 'Oxygen' vs 'O2', 'commutative' vs 'commutative property', 'additive identity' vs '0').
2. MATHEMATICAL & ALGEBRAIC EQUIVALENCE: Recognize equivalent algebraic equations or solutions (e.g. 'x = 17', '17', 'x=17', or 'y = 2x+1').
3. TYPO TOLERANCE: For one-word / fill-in-the-blank answers, tolerate minor spelling errors if phonetic intent and meaning are unmistakably correct.
4. PARTIAL / SUBJECTIVE CREDIT: For short explanations or descriptive questions, award a score_ratio between 0.0 and 1.0 according to key concept coverage.
5. IF TOTALLY WRONG / UNRELATED: Set is_correct = false, score_ratio = 0.0.

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "evaluations": [
    {
      "question_no": 1,
      "is_correct": true,
      "score_ratio": 1.0,
      "explanation": "Brief 1-sentence rationale"
    }
  ]
}
"""

    user_payload = json.dumps(
        [
            {
                "question_no": item["question_no"],
                "question_text": item.get("text", ""),
                "type": item.get("type", "fill_in_the_blanks"),
                "expected_answer": item.get("expected_answer", ""),
                "student_answer": item.get("student_answer", ""),
                "max_marks": item.get("marks", 1),
            }
            for item in items_to_eval
        ],
        indent=2,
    )

    prompt = f"Please evaluate these student answers against the expected answers:\n\n{user_payload}"

    try:
        llm = get_llm_client(settings.llm_provider)
        response = await asyncio.wait_for(
            llm.generate(prompt, system_prompt=system_prompt),
            timeout=timeout_seconds,
        )
        
        # Clean JSON fences if any
        cleaned_resp = response.strip()
        if cleaned_resp.startswith("```json"):
            cleaned_resp = cleaned_resp[7:]
        elif cleaned_resp.startswith("```"):
            cleaned_resp = cleaned_resp[3:]
        if cleaned_resp.endswith("```"):
            cleaned_resp = cleaned_resp[:-3]
        cleaned_resp = cleaned_resp.strip()

        data = json.loads(cleaned_resp)
        eval_list = data.get("evaluations", [])
        for ev in eval_list:
            q_no = ev.get("question_no")
            if q_no is not None:
                eval_dict[int(q_no)] = EvaluationItem(
                    question_no=int(q_no),
                    is_correct=bool(ev.get("is_correct", False)),
                    score_ratio=float(ev.get("score_ratio", 1.0 if ev.get("is_correct") else 0.0)),
                    explanation=ev.get("explanation"),
                )
    except Exception as e:
        logger.warning(f"AI semantic answer evaluation failed or timed out ({e}). Falling back to heuristic matching.")
        # Fallback to heuristic normalization for each item
        for item in items_to_eval:
            q_no = item["question_no"]
            u = str(item.get("student_answer", "")).strip()
            exp = str(item.get("expected_answer", "")).strip()
            matched = is_fast_match(u, exp)
            eval_dict[q_no] = EvaluationItem(
                question_no=q_no,
                is_correct=matched,
                score_ratio=1.0 if matched else 0.0,
                explanation="Conceptually matched" if matched else "Incorrect",
            )

    return eval_dict
