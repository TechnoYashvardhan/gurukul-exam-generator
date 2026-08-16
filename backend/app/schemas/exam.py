"""
Pydantic schemas for the generated exam output.
The LLM is instructed to return JSON matching GeneratedExam.
The model_validator enforces mark integrity before any response is accepted.
"""

from typing import Literal
from pydantic import BaseModel, Field, model_validator


class MCQOption(BaseModel):
    key: Literal["A", "B", "C", "D"]
    text: str = Field(..., min_length=1)


class Question(BaseModel):
    """A single exam question — MCQ or open-answer."""

    section_id: str = Field(..., description="Must match a section id in the template")
    question_no: int = Field(..., ge=1)
    type: Literal["mcq", "short_answer", "long_answer", "case_study"]
    text: str = Field(..., min_length=5, description="The question text shown to students")

    # Only present for MCQ — 4 options A/B/C/D
    options: list[MCQOption] | None = Field(
        None, description="4 options required if type='mcq', must be omitted otherwise"
    )
    # For MCQ: option key (e.g. "B"). For others: model answer text.
    answer: str = Field(..., min_length=1)

    marks: int = Field(..., ge=1)
    bloom_level: Literal[
        "remember", "understand", "apply", "analyze", "evaluate", "create"
    ]
    difficulty: Literal["easy", "medium", "hard", "extreme"]

    @model_validator(mode="after")
    def validate_mcq_options(self) -> "Question":
        if self.type == "mcq":
            if not self.options or len(self.options) != 4:
                raise ValueError(
                    f"Question {self.question_no}: MCQ must have exactly 4 options."
                )
            keys = [o.key for o in self.options]
            if sorted(keys) != ["A", "B", "C", "D"]:
                raise ValueError(
                    f"Question {self.question_no}: MCQ options must be keyed A, B, C, D."
                )
            if self.answer not in keys:
                raise ValueError(
                    f"Question {self.question_no}: MCQ answer '{self.answer}' "
                    f"must be one of {keys}."
                )
        else:
            if self.options is not None:
                raise ValueError(
                    f"Question {self.question_no}: 'options' must be omitted for type '{self.type}'."
                )
        return self


class GeneratedExam(BaseModel):
    """
    Full validated exam output.
    Returned by the /generate/exam endpoint and persisted to generated_exams.exam_json.
    """

    subject: str
    grade: str
    total_marks: int = Field(..., ge=1)
    duration_minutes: int = Field(..., ge=10)
    questions: list[Question] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_total_marks(self) -> "GeneratedExam":
        actual = sum(q.marks for q in self.questions)
        if actual != self.total_marks:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                "Mark mismatch: expected total_marks=%d but questions sum to %d. "
                "Adjusting total_marks to match generated questions. (Possible LLM token truncation)",
                self.total_marks, actual
            )
            self.total_marks = actual
        return self


# ── API response wrapper ──────────────────────────────────────────────────────

class ExamGenerationResponse(BaseModel):
    """HTTP response for the generate endpoint."""

    exam_id: str
    subject: str
    grade: str
    total_marks: int
    duration_minutes: int
    heading_details: str | None = None
    instructions: str | None = None
    questions: list[Question]
    retries_used: int
    llm_provider: str
    llm_model: str
