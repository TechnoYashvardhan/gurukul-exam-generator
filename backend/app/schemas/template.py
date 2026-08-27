"""
Pydantic schemas for exam templates (input to the generation pipeline).
These mirror the JSONB config stored in the templates table.
"""

from typing import Literal
from pydantic import BaseModel, Field, model_validator


class Section(BaseModel):
    """One section of an exam (e.g., 'Section A — MCQ')."""

    id: str = Field(..., description="Unique section identifier, e.g. 's1'")
    title: str = Field(..., description="Display title, e.g. 'Section A — Multiple Choice'")
    type: Literal[
        "mcq",
        "short_answer",
        "long_answer",
        "case_study",
        "fill_in_the_blanks",
        "true_false",
        "match_the_following",
        "one_word",
    ] = Field(
        ..., description="Question format for this section"
    )
    num_questions: int = Field(..., ge=1, description="Number of questions in this section")
    marks_per_question: int = Field(..., ge=1, description="Marks awarded per question")
    instructions: str | None = Field(
        None, description="Optional per-section instructions shown on the paper"
    )
    bloom_level: str | None = Field(
        None, description="Optional Bloom's taxonomy override for this specific section"
    )

    @property
    def section_marks(self) -> int:
        return self.num_questions * self.marks_per_question


class ExamTemplate(BaseModel):
    """
    Full exam template — validated before being passed to the generation pipeline.
    Stored as-is in the templates.config JSONB column.
    """

    subject: str = Field(..., description="Subject name, e.g. 'Physics'")
    grade: str = Field(..., description="Grade/year level, e.g. 'Grade 10'")
    difficulty: Literal["easy", "medium", "hard", "extreme"] = Field(
        "medium", description="Overall difficulty — maps to Bloom's Taxonomy level"
    )
    bloom_level: str | None = Field(
        None,
        description=(
            "Override the auto-mapped Bloom's level. "
            "E.g. 'apply', 'analyze'. If omitted, difficulty → bloom mapping is used."
        ),
    )
    total_marks: int = Field(..., ge=1, description="Total marks for the exam")
    duration_minutes: int = Field(..., ge=10, description="Exam duration in minutes")
    heading_details: str | None = Field(None, description="School/Org name, Class, Session, etc.")
    instructions: str | None = Field(None, description="General exam instructions")
    sections: list[Section] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_marks(self) -> "ExamTemplate":
        computed = sum(s.section_marks for s in self.sections)
        if computed != self.total_marks:
            raise ValueError(
                f"Section marks sum to {computed} but total_marks={self.total_marks}. "
                "Adjust num_questions, marks_per_question, or total_marks so they match."
            )
        return self


class SaveTemplateRequest(BaseModel):
    """Request body for POST /api/v1/templates — saves a template for reuse."""
    name: str = Field(..., min_length=1, max_length=200)
    template: ExamTemplate
