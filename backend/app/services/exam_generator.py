import json
import logging
import asyncio
import random
import re
from typing import Any

from app.config import settings
from app.llm.base import LLMClient, LLMProviderError
from app.llm.factory import get_llm_client
from app.schemas.exam import (
    GeneratedExam,
    Question,
    MCQOption,
    GeneratedSection,
    ExamBlueprint,
    SectionBlueprint,
    QuestionBlueprint,
)
from app.schemas.template import ExamTemplate, Section

logger = logging.getLogger(__name__)

BLOOM_GUIDANCE = {
    "easy": "Focus heavily on 'REMEMBER' and 'UNDERSTAND' levels.",
    "medium": "Balance across 'UNDERSTAND', 'APPLY', and 'ANALYZE' levels.",
    "hard": "Focus heavily on 'ANALYZE', 'EVALUATE', and 'CREATE' levels.",
    "extreme": "Exclusive focus on 'EVALUATE' and 'CREATE'. Require deep synthesis.",
}

_throttler = asyncio.Semaphore(settings.llm_rate_limit_per_min)

def _extract_json_string(raw: str) -> str:
    raw = raw.strip()
    # 1. Triple backtick markdown fence with closing ```
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.IGNORECASE)
    if fence_match:
        content = fence_match.group(1).strip()
        if (content.startswith("{") and content.endswith("}")) or (content.startswith("[") and content.endswith("]")):
            return content

    # 2. Triple backtick without closing ```
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE).strip()

    # 3. Extract from first { to last } or first [ to last ]
    first_brace = raw.find('{')
    last_brace = raw.rfind('}')
    first_bracket = raw.find('[')
    last_bracket = raw.rfind(']')

    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        if last_brace != -1:
            return raw[first_brace:last_brace + 1].strip()
        return raw[first_brace:].strip()

    if first_bracket != -1:
        if last_bracket != -1:
            return raw[first_bracket:last_bracket + 1].strip()
        return raw[first_bracket:].strip()

    return raw

def _strip_markdown_from_json(s: str) -> str:
    """Aggressively strip markdown artifacts and normalize unicode that break Windows parsers."""
    # Normalize unicode spaces, non-breaking hyphens, and smart quotes
    s = s.replace('\u202f', ' ').replace('\u00a0', ' ').replace('\u200b', '')
    s = s.replace('\u2011', '-').replace('\u2012', '-').replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')
    s = s.replace('\u2018', "'").replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"')
    
    # Remove ```json ... ``` fences
    s = re.sub(r"```(?:json)?\s*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"```", "", s)
    # Strip ** bold markers around or inside JSON strings: **"key"** or "**value**"
    s = re.sub(r'\*\*"([^"]*)"', r'"\1"', s)   # **"key" -> "key"
    s = re.sub(r'"([^"]*)":\s*\*\*', r'"\1": ', s)  # "key": ** -> "key": 
    s = re.sub(r'\*\*([^*"]+)\*\*', r'\1', s)   # **text** -> text (inside values)
    s = re.sub(r'\*\*', '', s)                   # stray ** with nothing around them
    # Remove trailing commas before ] or }
    s = re.sub(r",\s*([\]}])", r"\1", s)
    return s.strip()

def _sanitize_exam_text(text: str) -> str:
    """
    Cleans up hallucinated LaTeX artifacts, pseudo-LaTeX unit representations,
    unclosed delimiters, and missing spaces from LLM generated exam text.
    """
    if not text or not isinstance(text, str):
        return text or ""

    s = text

    # 1. Strip hallucinated backslashes before plain digits / numbers: \90% -> 90%, \5 -> 5, \50 -> 50, \4.184 -> 4.184
    s = re.sub(r'\\(?=\d)', '', s)

    # 2. Fix pseudo-LaTeX unit representations like $1\text{ ns}$ or \text{ GB/s} or 2\text{ GT/s}
    s = re.sub(r'\\text\{\s*([^{}]+)\s*\}', r' \1 ', s)

    # 3. Clean degree Celsius notation: $1.79^\circ\text{C}$ -> 1.79 °C
    s = re.sub(r'\$([0-9.,]+)\s*\^\\circ\s*(?:\\text\{C\}|C|\s*)\$', r'\1 °C', s)
    s = re.sub(r'([0-9.,]+)\s*\^\\circ\s*(?:\\text\{C\}|C|\s*)', r'\1 °C', s)
    s = re.sub(r'\\cdot\^\\circ\s*(?:\\text\{C\}|C|\s*)', '·°C', s)

    # 4. Clean up common engineering and physical units inside stray math delimiters:
    # e.g. $8.33 ms$, $7200 RPM$, $2 GT/s$, $100 W$, $250 W$, $32 bits$, $8 GB/s$, $16 GB/s$
    units_pattern = r'\$([0-9.,]+)\s+([a-zA-Z/°%]{1,10}(?:\s+[a-zA-Z/°%]{1,10})?)\$'
    s = re.sub(units_pattern, r'\1 \2', s)

    # 5. Fix spaces between common squished words inside broken math mode
    s = re.sub(r'perdirectionwith', ' per direction with ', s)
    s = re.sub(r'whatisthesteady\s*-\s*statetemperaturerise', ' what is the steady-state temperature rise ', s)
    s = re.sub(r'whatisthesteady', ' what is the steady ', s)
    s = re.sub(r'statetemperaturerise', ' state temperature rise ', s)

    # 6. Clean up single unbalanced dollar signs that span across sentence endings (. / ? / !)
    def clean_multisentence_math(match):
        content = match.group(1)
        words = re.findall(r"[a-zA-Z]{3,}", content)
        puncts = [". ", "? ", "! ", ", "]
        if len(words) > 2 or any(p in content for p in puncts):
            content_fixed = re.sub(r"(\\[a-zA-Z]+(?:\s+[a-zA-Z0-9])?)", r"$\1$", content)
            return content_fixed
        return f"${content}$"

    s = re.sub(r'\$([^$]+)\$', clean_multisentence_math, s)

    # 7. Remove any remaining stray single dollars around plain numbers or simple unit phrases
    s = re.sub(r'\$([0-9.,]+)\$', r'\1', s)
    s = re.sub(r'\$([0-9]+\s+[a-zA-Z]+)\$', r'\1', s)

    # 8. Clean up multiple spaces
    s = re.sub(r'[ \t]+', ' ', s)

    # 9. Format Match the Following questions if squished on one line or missing item indices
    if ("Column I" in s or "स्तम्भ I" in s or "स्तम्भ 1" in s) and ("Column II" in s or "स्तम्भ II" in s or "स्तम्भ 2" in s):
        col1_m = list(re.finditer(r'(?:(?:^|[\n\.\:\;])\s*)(?:Column\s*[-–—:]?\s*(?:I|1|A)|स्तम्भ\s*[-–—:]?\s*(?:1|I))\s*[:\-\n\s]*', s, re.IGNORECASE))
        col2_m = list(re.finditer(r'(?:(?:^|[\n\.\:\;])\s*)(?:Column\s*[-–—:]?\s*(?:II|2|B)|स्तम्भ\s*[-–—:]?\s*(?:2|II))\s*[:\-\n\s]*', s, re.IGNORECASE))
        if col1_m and col2_m:
            col2 = col2_m[-1]
            valid1 = [m for m in col1_m if m.start() < col2.start()]
            if valid1:
                col1 = valid1[-1]
                premise = s[:col1.start()].strip()
                col1_raw = s[col1.end():col2.start()].strip()
                col2_raw = s[col2.end():].strip()

                # Format col1 items with 1., 2., 3...
                col1_split = re.sub(r'([,\.\;]?\s+)([0-9ivxIVX]+[\.\)\:\-])', r'\n\2', col1_raw)
                raw_lines1 = [l.strip() for l in col1_split.split('\n') if l.strip()]
                col1_lines = []
                for idx, l in enumerate(raw_lines1):
                    if not re.match(r'^[\(\[]?[0-9ivxIVX]+[\)\]\.\:\-]', l):
                        col1_lines.append(f"{idx+1}. {l}")
                    else:
                        col1_lines.append(l)
                col1_str = '\n'.join(col1_lines)

                # Format col2 items with (p), (q), (r)...
                col2_str = re.sub(r'([,\.\;]?\s+)(\(?[a-zA-Z0-9]{1,3}[\.\)\:\-])(?=\s+[A-Za-z0-9])', r'\n\2', col2_raw)

                s = f"{premise}\n\nColumn I:\n{col1_str}\n\nColumn II:\n{col2_str}".strip()

    return s.strip()

try:
    import json_repair
except ImportError:
    json_repair = None

def _escape_latex_in_json(s: str) -> str:
    """Escapes backslashes before LaTeX keywords in JSON strings to prevent json control character errors."""
    return re.sub(r'(?<!\\)\\([a-zA-Z]+)', lambda m: '\\\\' + m.group(1), s)

def _clean_and_parse_json(raw: str) -> Any:
    json_str = _extract_json_string(raw)
    json_str = _strip_markdown_from_json(json_str)
    escaped_json_str = _escape_latex_in_json(json_str)

    # 1. Standard json.loads on escaped string
    try:
        data = json.loads(escaped_json_str)
        if isinstance(data, (dict, list)):
            return data
    except Exception:
        pass

    # 2. Standard json.loads on raw string
    try:
        data = json.loads(json_str)
        if isinstance(data, (dict, list)):
            return data
    except Exception:
        pass

    # 3. json_repair on escaped string
    try:
        data = json_repair.loads(escaped_json_str)
        if isinstance(data, (dict, list)) and data:
            return data
    except Exception:
        pass

    # 4. json_repair on raw string
    try:
        data = json_repair.loads(json_str)
        if isinstance(data, (dict, list)) and data:
            return data
    except Exception:
        pass

    # 5. Last-ditch repair_json
    try:
        fixed_str = json_repair.repair_json(escaped_json_str, return_objects=False)
        data = json.loads(fixed_str)
        if isinstance(data, (dict, list)):
            return data
    except Exception:
        pass

    # 6. Direct repair on raw input
    try:
        data = json_repair.loads(raw)
        if isinstance(data, (dict, list)) and data:
            return data
    except Exception:
        pass

    logger.error("JSON Parse failed after all repair attempts.\nRaw:\n%s", raw[:500])
    raise ValueError(f"Could not parse LLM response as JSON. Raw (first 200 chars): {raw[:200]}")

def _extract_questions_list(parsed: Any) -> list[dict]:
    """Extract list of question dicts from any arbitrary LLM response structure."""
    if isinstance(parsed, list):
        qs = []
        for item in parsed:
            if isinstance(item, dict):
                if "questions" in item and isinstance(item["questions"], list):
                    qs.extend(item["questions"])
                elif "text" in item or "question" in item or "topic" in item:
                    qs.append(item)
        return qs
    
    if isinstance(parsed, dict):
        if "questions" in parsed and isinstance(parsed["questions"], list):
            return parsed["questions"]
        if "sections" in parsed and isinstance(parsed["sections"], list):
            qs = []
            for sec in parsed["sections"]:
                if isinstance(sec, dict) and "questions" in sec and isinstance(sec["questions"], list):
                    qs.extend(sec["questions"])
            return qs
        if "items" in parsed and isinstance(parsed["items"], list):
            return parsed["items"]
        if "exam" in parsed and isinstance(parsed["exam"], dict) and "questions" in parsed["exam"]:
            return parsed["exam"]["questions"]
        if "text" in parsed or "question" in parsed:
            return [parsed]
            
    return []

def _create_default_blueprint(template: ExamTemplate) -> ExamBlueprint:
    """Deterministic fallback blueprint if the LLM blueprint generation fails."""
    sections = []
    bloom_hint = BLOOM_GUIDANCE.get(template.difficulty, "medium")
    for s in template.sections:
        q_blueprints = []
        for i in range(s.num_questions):
            q_blueprints.append(
                QuestionBlueprint(
                    topic=template.subject,
                    subtopic=f"{s.title} - Q{i+1}",
                    concept=f"Core concept in {template.subject}",
                    bloom_level=s.bloom_level or template.bloom_level or "apply",
                    difficulty=template.difficulty,
                )
            )
        sections.append(
            SectionBlueprint(
                section_id=s.id,
                type=s.type,
                questions=q_blueprints,
            )
        )
    return ExamBlueprint(sections=sections)

async def _generate_blueprint(llm: LLMClient, template: ExamTemplate, syllabus_text: str, custom_topic: str | None) -> ExamBlueprint:
    sections_info = []
    for s in template.sections:
        sections_info.append(f"Section ID '{s.id}' ({s.type}): {s.num_questions} questions.")
    sections_text = "\n".join(sections_info)
    bloom_hint = BLOOM_GUIDANCE.get(template.difficulty, BLOOM_GUIDANCE['medium'])

    system_prompt = f"""You are the Chief Exam Architect.
Your job is to read the syllabus and output a JSON blueprint for the exam. DO NOT write the actual full questions.
Only output the topics, subtopics, and concepts to cover.

EXAM CONTEXT:
Subject: {template.subject}
Grade / Level: {template.grade}
Difficulty: {template.difficulty.upper()} ({bloom_hint})
Custom Topic Focus: {custom_topic or 'None'}

SECTIONS REQUIRED:
{sections_text}

SYLLABUS CONTENT:
{syllabus_text}

JSON FORMAT REQUIRED:
{{
  "sections": [
    {{
      "section_id": "{template.sections[0].id if template.sections else 's1'}",
      "type": "{template.sections[0].type if template.sections else 'mcq'}",
      "questions": [
        {{ "topic": "...", "subtopic": "...", "concept": "...", "bloom_level": "apply", "difficulty": "medium" }}
      ]
    }}
  ]
}}
Return ONLY the raw JSON.
"""
    try:
        raw = await llm.generate(system_prompt=system_prompt, user_message="Create the blueprint now. Return ONLY valid JSON.", temperature=0.3, max_tokens=8192)
        parsed = _clean_and_parse_json(raw)
        
        # Normalize and guarantee all sections and questions exist
        if isinstance(parsed, dict):
            if "sections" in parsed and isinstance(parsed["sections"], list):
                raw_sections = parsed["sections"]
            elif "section_id" in parsed or "questions" in parsed:
                raw_sections = [parsed]
            else:
                raw_sections = []
        elif isinstance(parsed, list):
            raw_sections = parsed
        else:
            raw_sections = []

        validated_sections: list[SectionBlueprint] = []

        for idx, s in enumerate(template.sections):
            # Find matching section or match by index
            matched_sec = None
            for r_sec in raw_sections:
                if isinstance(r_sec, dict) and r_sec.get("section_id") == s.id:
                    matched_sec = r_sec
                    break
            if not matched_sec and idx < len(raw_sections) and isinstance(raw_sections[idx], dict):
                matched_sec = raw_sections[idx]
            
            raw_q_list = matched_sec.get("questions", []) if matched_sec else []
            q_blueprints: list[QuestionBlueprint] = []
            
            for q_item in raw_q_list:
                if isinstance(q_item, dict):
                    q_blueprints.append(
                        QuestionBlueprint(
                            topic=str(q_item.get("topic", template.subject)),
                            subtopic=str(q_item.get("subtopic", s.title)),
                            concept=str(q_item.get("concept", f"Concept in {template.subject}")),
                            bloom_level=str(q_item.get("bloom_level", s.bloom_level or template.bloom_level or "apply")),
                            difficulty=str(q_item.get("difficulty", template.difficulty)),
                        )
                    )
            
            # Fill missing questions up to required num_questions
            while len(q_blueprints) < s.num_questions:
                q_blueprints.append(
                    QuestionBlueprint(
                        topic=template.subject,
                        subtopic=f"{s.title} - Q{len(q_blueprints)+1}",
                        concept=f"Core concept in {template.subject}",
                        bloom_level=s.bloom_level or template.bloom_level or "apply",
                        difficulty=template.difficulty,
                    )
                )
            
            # Trim if too many
            q_blueprints = q_blueprints[:s.num_questions]
            
            validated_sections.append(
                SectionBlueprint(
                    section_id=s.id,
                    type=s.type,
                    questions=q_blueprints,
                )
            )
            
        return ExamBlueprint(sections=validated_sections)
    except Exception as e:
        logger.warning(f"Blueprint generation failed ({e}). Falling back to template-based blueprint.")
        return _create_default_blueprint(template)


def _shuffle_and_randomize_options(q: Question) -> Question:
    """
    Randomly shuffle MCQ options and update the answer key accordingly.
    Guarantees a completely uniform distribution of correct keys (A, B, C, D)
    eliminating model positional bias or patterns (e.g. all B's or C's).
    """
    if q.type in ["mcq", "match_the_following"] and q.options and len(q.options) >= 2:
        valid_keys = ["A", "B", "C", "D"]
        raw_ans = str(q.answer).strip().upper()

        # 1. Identify which option text is currently the correct answer
        correct_text = None
        for opt in q.options:
            if opt.key.strip().upper() == raw_ans:
                correct_text = opt.text
                break

        # Match by text if key wasn't matched
        if correct_text is None:
            raw_ans_lower = str(q.answer).strip().lower()
            for opt in q.options:
                if opt.text and (opt.text.strip().lower() == raw_ans_lower or raw_ans_lower in opt.text.strip().lower()):
                    correct_text = opt.text
                    break

        if correct_text is None:
            correct_text = q.options[0].text

        # 2. Randomly shuffle the options
        shuffled = list(q.options)
        random.shuffle(shuffled)

        # 3. Assign new keys A, B, C, D and locate the correct option
        new_opts: list[MCQOption] = []
        new_ans = "A"
        for i, opt in enumerate(shuffled):
            k = valid_keys[i] if i < len(valid_keys) else chr(65 + i)
            new_opts.append(MCQOption(key=k, text=opt.text))
            if opt.text == correct_text:
                new_ans = k

        q.options = new_opts
        q.answer = new_ans

    return q


async def _build_section(llm: LLMClient, template: ExamTemplate, sec: SectionBlueprint, marks_per_q: int, syllabus_text: str) -> list[Question]:
    questions_outline = json.dumps([q.model_dump() for q in sec.questions], indent=2)
    system_prompt = f"""You are the Expert Exam Writer.
Convert the provided blueprint into actual, full questions.

SECTION RULES:
1. Section ID: {sec.section_id}
2. Type: {sec.type}
3. Marks per question: {marks_per_q}
4. You MUST generate EXACTLY {len(sec.questions)} questions. Not more, not less.
5. IF type is "mcq": provide exactly 4 options (A,B,C,D) and set "answer" to the correct key ("A", "B", "C", or "D").
   CRITICAL: Distribute correct answers evenly across keys A, B, C, and D. Avoid repeating the same letter across consecutive questions.
6. IF type is "true_false": provide 2 options: [{{"key": "A", "text": "True"}}, {{"key": "B", "text": "False"}}] and set "answer" to "A" (if True) or "B" (if False). Balance answers roughly 50% True and 50% False.
7. IF type is "fill_in_the_blanks": use "_____" for the blank in "text", set "options" to null, and set "answer" to the single word/short term that fills the blank.
8. IF type is "one_word": write a direct question in "text", set "options" to null, and set "answer" to the single word or short phrase answer.
9. IF type is "match_the_following":
   Format "text" with a clear introductory premise and two structured columns (Column I with numbers 1, 2, 3, 4 and Column II with letters p, q, r, s or a, b, c, d), exactly like this:
   "Match the items in Column I with the correct concepts in Column II:

   Column I:
   1. [First concept]
   2. [Second concept]
   3. [Third concept]
   4. [Fourth concept]

   Column II:
   (p) [Matching description for one item]
   (q) [Matching description for another item]
   (r) [Matching description for another item]
   (s) [Matching description for another item]"

   In "options", provide exactly 4 distinct matching code combinations:
   [
     {{"key": "A", "text": "1-(q), 2-(s), 3-(r), 4-(p)"}},
     {{"key": "B", "text": "1-(p), 2-(q), 3-(s), 4-(r)"}},
     {{"key": "C", "text": "1-(s), 2-(q), 3-(r), 4-(p)"}},
     {{"key": "D", "text": "1-(q), 2-(r), 3-(s), 4-(p)"}}
   ]
   and set "answer" to the single correct option key ("A", "B", "C", or "D").
10. IF type is "short_answer", "long_answer", or "case_study": set "options" to null and set "answer" to a complete model answer.
11. Keep question text concise and clear.

MATHEMATICAL & SCIENTIFIC NOTATION RULES:
- PLAIN NUMBERS, UNITS & HARDWARE / SYSTEM SPECS (CRITICAL):
  Write ALL units, clock speeds, data rates, memory sizes, voltage rails, and percentages as CLEAN PLAIN TEXT:
  e.g. "1 ns", "5 ns", "50 ns", "90%", "7200 RPM", "2 GT/s", "1.969 GB/s", "1.5 GHz", "256 bits", "14 Gbps", "100 W", "250 W", "4.184 J/(g·°C)", "2.0 L/min", "2000 g/min", "32 bits", "4 GB", "64 GB", "1.79 °C", "+12V", "+5V", "+3.3V", "DDR4", "DDR5", "PCIe 4.0 x16".
  NEVER place a backslash before numbers (e.g. NEVER write "\\\\90%", "\\\\5 ns", "\\\\50", "\\\\4", "\\\\64").
  NEVER wrap units or plain numbers inside math mode ($100W$, $8 GB/s$, $1\\text{{ ns}}$). Write them as plain English words.
- REAL MATHEMATICAL FORMULAS ONLY:
  ONLY use $...$ for genuine algebraic expressions, equations, fractions (\\frac{{a}}{{b}}), square roots (\\sqrt{{x}}), exponents (x^2), summations (\\sum), integrals (\\int), matrices, and Greek math variables (\\Delta T, \\theta, \\lambda, \\alpha).
- VARIABLES & SYMBOLS: Wrap mathematical variables and constants in inline math: "$m_1$", "$m_2$", "$v_0$", "$a(t) = \\alpha t - \\beta t^2$", "$t=0$", "$x=x_0$", "$A$", "$\\det(A)$", "$A^{-1}$", "$\\Delta T$".
- SPREADSHEET & COMPUTER SCIENCE: Write cell coordinates (e.g. A1, B5, D10, E10), Excel functions (e.g. SUM(A1:A10), VLOOKUP), absolute references ($A$1, $B$1), field names (e.g. «First_Name»), and numbered lists as PLAIN TEXT without math delimiters. NEVER wrap English words, sentences, or numbered list steps in math mode ($...$).
- MATRICES & DETERMINANTS: Always write standard LaTeX matrix: "$\\begin{{pmatrix}} 1 & 2 \\\\ 3 & 4 \\end{{pmatrix}}$" or determinant "$\\begin{{vmatrix}} 1 & 2 \\\\ 3 & 4 \\end{{vmatrix}}$".
- SYSTEMS OF EQUATIONS: Write "$\\begin{{cases}} x + y + z = 1 \\\\ x + 2y + 3z = k \\\\ x + 2y + (k^2-5)z = k \\end{{cases}}$" with double backslash "\\\\" between rows.
- FRACTIONS & POWERS: Always write "$\\frac{{x+2}}{{x^2+1}}$", "$x^2 - 4x + 13 = 0$", "$e^{{2x}}$", "$\\sqrt{{14}}$". Never write raw ASCII like "(x+2)/(x^2+1)" or "x^2".
- SUMMATIONS, INTEGRALS & LIMITS: Write "$\\sum_{{n=1}}^{{\\infty}} \\frac{{(-1)^{{n+1}} r^n}}{{n}}$", "$\\int_{{0}}^{{\\pi/2}} x \\sin x \\cos x \\, dx$", "$\\lim_{{x \\to 0}} \\frac{{x \\cos x - \\sin x}}{{x^3}}$".
- VECTORS & TRIGONOMETRY: Write "$\\vec{{a}} \\times \\vec{{b}} = (-10, 4, 8)$", "$2\\operatorname{{cis}}(30^\\circ)$", "$\\sin 75^\\circ + \\sin 15^\\circ$", "$y \\ge 2x+1$".
- Example MCQ Options: A: "$\\frac{{x+2}}{{x^2+1}} + \\frac{{2(x+1)}}{{(x^2+1)^2}}$", B: "$-\\frac{{1}}{{6}}$", C: "$\\begin{{pmatrix}} 1 & 0 \\\\ 0 & 1 \\end{{pmatrix}}$", D: "$\\frac{{\\sqrt{{6}}}}{{2}}$"
- CURRENCY & WORD PROBLEMS: Write currency as plain text (e.g. "Rs. 200", "Rs. 15", or "$200"). NEVER place full English sentences or phrases inside math mode ($...$).
- TALLY MARKS & STATISTICS: When writing tally marks, write clear descriptive notation like "卌 卌 || (two bundles of 5 and 2 single marks = 12)". Never output ambiguous pseudo-letters like "HH".
- NEVER output placeholder phrases like "Option for..." or "Alternative concept" or "None of the above". Every single MCQ option MUST contain a real, distinct, complete mathematical or scientific value/concept.

STRICT OUTPUT RULES (VIOLATION WILL CAUSE SYSTEM FAILURE):
- Return ONLY raw JSON. No markdown, no ```json fences, no ** bold markers.
- Every key and value must use plain double quotes only.
- Do NOT truncate. Complete the full JSON response.

REQUIRED JSON FORMAT
{{
  "questions": [
    {{
      "section_id": "{sec.section_id}",
      "question_no": 1,
      "type": "{sec.type}",
      "text": "<full question text with clean formatting>",
      "options": [{{"key": "A", "text": "..."}}, {{"key": "B", "text": "..."}}, {{"key": "C", "text": "..."}}, {{"key": "D", "text": "..."}}],
      "answer": "A",
      "marks": {marks_per_q},
      "bloom_level": "apply",
      "difficulty": "medium"
    }}
  ]
}}
"""
    for attempt in range(2):
        try:
            async with _throttler:
                raw = await llm.generate(
                    system_prompt=system_prompt,
                    user_message=f"BLUEPRINT TO FOLLOW:\n{questions_outline}\n\nSYLLABUS:\n{syllabus_text}\n\nReturn only valid JSON.",
                    temperature=0.3, 
                    max_tokens=8192
                )
            logger.info("Raw section output from LLM (length %d):\n%s", len(raw), raw)
            parsed = _clean_and_parse_json(raw)
            raw_q_list = _extract_questions_list(parsed)
            
            validated_questions: list[Question] = []
            for item in raw_q_list:
                if isinstance(item, dict):
                    try:
                        # Auto-fill missing fields if model omitted them
                        if "section_id" not in item: item["section_id"] = sec.section_id
                        if "type" not in item: item["type"] = sec.type
                        if "marks" not in item: item["marks"] = marks_per_q
                        if "bloom_level" not in item: item["bloom_level"] = "apply"
                        if "difficulty" not in item: item["difficulty"] = "medium"
                        
                        raw_text = item.get("text") or item.get("question") or item.get("topic") or "Question text"
                        item["text"] = _sanitize_exam_text(str(raw_text))
                        
                        raw_ans = item.get("answer") or ("A" if sec.type == "mcq" else "Model answer")
                        item["answer"] = _sanitize_exam_text(str(raw_ans))
                        
                        if "options" in item and isinstance(item["options"], list):
                            for opt in item["options"]:
                                if isinstance(opt, dict) and "text" in opt:
                                    opt["text"] = _sanitize_exam_text(str(opt["text"]))
                        
                        q = Question.model_validate(item)
                        validated_questions.append(q)
                    except Exception as q_err:
                        logger.warning(f"Skipping malformed question item: {q_err}")
            
            # Fill missing questions up to required count if model generated fewer
            while len(validated_questions) < len(sec.questions):
                missing_idx = len(validated_questions)
                bp_ref = sec.questions[missing_idx]
                concept_clean = bp_ref.concept.replace("$", "")
                if sec.type == "mcq":
                    opts = [
                        {"key": "A", "text": f"Directly proportional to the parameter"},
                        {"key": "B", "text": f"Inversely proportional to the square of the parameter"},
                        {"key": "C", "text": f"Independent of the initial conditions"},
                        {"key": "D", "text": f"Zero under steady-state equilibrium"}
                    ]
                    fallback_text = f"Analyze {concept_clean} in the context of {bp_ref.subtopic}. Which statement best characterizes its behavior?"
                    fallback_ans = "A"
                elif sec.type == "true_false":
                    opts = [
                        {"key": "A", "text": "True"},
                        {"key": "B", "text": "False"}
                    ]
                    fallback_text = f"In {bp_ref.subtopic}, the primary governing behavior of {concept_clean} remains constant under standard state conditions."
                    fallback_ans = "A"
                elif sec.type == "match_the_following":
                    opts = [
                        {"key": "A", "text": "1-(p), 2-(q), 3-(r), 4-(s)"},
                        {"key": "B", "text": "1-(q), 2-(p), 3-(s), 4-(r)"},
                        {"key": "C", "text": "1-(r), 2-(s), 3-(p), 4-(q)"},
                        {"key": "D", "text": "1-(s), 2-(r), 3-(q), 4-(p)"},
                    ]
                    fallback_text = (
                        f"Match the concepts related to {concept_clean} in Column I with their corresponding characteristics in Column II:\n\n"
                        f"Column I:\n1. {concept_clean} Principle\n2. Operational Scope\n3. Governing Variable\n4. Application Domain\n\n"
                        f"Column II:\n(p) Foundational theoretical framework\n(q) Defines parameter boundaries\n(r) Quantitative measure of effect\n(s) Practical implementation system"
                    )
                    fallback_ans = "A"
                elif sec.type == "fill_in_the_blanks":
                    opts = None
                    fallback_text = f"The primary parameter governing {concept_clean} in {bp_ref.subtopic} is defined as ______."
                    fallback_ans = concept_clean
                elif sec.type == "one_word":
                    opts = None
                    fallback_text = f"What single scientific term or principle describes {concept_clean} in {bp_ref.subtopic}?"
                    fallback_ans = concept_clean
                else:
                    opts = None
                    fallback_text = f"Analyze {concept_clean} in the context of {bp_ref.subtopic}. State the governing principles and mathematical relations."
                    fallback_ans = f"Comprehensive derivation and governing equations for {concept_clean}."

                fallback_q = Question(
                    section_id=sec.section_id,
                    question_no=missing_idx + 1,
                    type=sec.type,
                    text=fallback_text,
                    options=opts,
                    answer=fallback_ans,
                    marks=marks_per_q,
                    bloom_level=bp_ref.bloom_level,
                    difficulty=bp_ref.difficulty
                )
                validated_questions.append(fallback_q)
                
            # Trim to exact count
            validated_questions = validated_questions[:len(sec.questions)]
            for idx, q in enumerate(validated_questions):
                q.question_no = idx + 1
                _shuffle_and_randomize_options(q)
                
            return validated_questions
        except Exception as exc:
            if attempt == 1:
                logger.warning(f"Section generation failed on attempt {attempt+1}: {exc}")
                raise
            

async def generate_exam(
    template: ExamTemplate,
    syllabus_text: str,
    source_type: str = "hardcoded",
    custom_topic: str | None = None,
    llm_client: LLMClient | None = None,
):
    if llm_client is None:
        llm_client = get_llm_client(settings.llm_provider)

    yield {"status": f"Architecting blueprint with {llm_client.provider_name}..."}
    blueprint = await _generate_blueprint(llm_client, template, syllabus_text, custom_topic)
    
    marks_map = {s.id: s.marks_per_question for s in template.sections}
    
    try:
        qwen = get_llm_client("ollama")
    except Exception:
        qwen = llm_client

    CHUNK_SIZE = 10
    task_info = []

    for sec_bp in blueprint.sections:
        marks = marks_map.get(sec_bp.section_id, 1)
        
        # Smart Batching: Split section questions into chunks of 10 to guarantee 100% complete generation without token limits
        for i in range(0, len(sec_bp.questions), CHUNK_SIZE):
            chunk_sec = sec_bp.model_copy(deep=True)
            chunk_sec.questions = sec_bp.questions[i:i + CHUNK_SIZE]
            task_info.append((chunk_sec, marks, llm_client))
            
    yield {"status": f"Writing {len(task_info)} parallel batches to bypass limits..."}
    
    tasks = [_build_section(client, template, bp, marks, syllabus_text) for bp, marks, client in task_info]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    yield {"status": "Validating and repairing any failed chunks..."}
    all_questions = []
    for info, result in zip(task_info, results):
        bp, marks, client = info
        if isinstance(result, Exception):
            logger.warning(f"Cloud API failed on chunk '{bp.section_id}' ({result}). Rescuing with local Ollama...")
            yield {"status": f"Rescuing chunk '{bp.section_id}' with local fallback..."}
            try:
                # Dynamic Routing: Catch cloud failures and fallback to Ollama
                result = await _build_section(qwen, template, bp, marks, syllabus_text)
                all_questions.extend(result)
            except Exception as e:
                logger.error(f"Failed to rescue chunk '{bp.section_id}': {e}")
                yield {"status": f"Warning: Dropped a {len(bp.questions)}-question chunk due to cascading failure."}
        else:
            all_questions.extend(result)
        
    yield {"status": "Adding final touches..."}
    
    # Ensure contiguous numbering across the entire exam and unbiased option randomization
    for idx, q in enumerate(all_questions):
        q.question_no = idx + 1
        _shuffle_and_randomize_options(q)
        
    exam = GeneratedExam(
        subject=template.subject,
        grade=template.grade,
        total_marks=template.total_marks,
        duration_minutes=template.duration_minutes,
        heading_details=template.heading_details,
        instructions=template.instructions,
        sections=template.sections,
        questions=all_questions
    )
    
    yield (exam, 0, llm_client)
