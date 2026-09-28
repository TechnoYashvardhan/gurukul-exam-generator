"""
Pydantic schemas for exam templates (input to the generation pipeline).
These mirror the JSONB config stored in the templates table.
"""

from typing import Literal
from pydantic import BaseModel, Field, model_validator


class CaseStudySubQConfig(BaseModel):
    """Configuration for a sub-question type breakdown in a Case Study / Reading Passage."""

    type: Literal[
        "mcq",
        "short_answer",
        "long_answer",
        "case_study",
        "fill_in_the_blanks",
        "true_false",
        "match_the_following",
        "one_word",
    ] = Field(..., description="Sub-question format")
    count: int = Field(default=1, ge=1, description="Number of sub-questions of this type")
    marks_per_sub: int = Field(default=1, ge=1, description="Marks awarded per sub-question")

    @property
    def total_marks(self) -> int:
        return self.count * self.marks_per_sub


class SubSection(BaseModel):
    """A sub-section or part under a parent Section (e.g. 'Part I — Context Extracts', 'Part II — Short Answer')."""

    id: str = Field(..., description="Unique sub-section identifier, e.g. 's1_p1'")
    title: str = Field(..., description="Display title, e.g. 'Part I — Context Extracts'")
    type: Literal[
        "mcq",
        "short_answer",
        "long_answer",
        "case_study",
        "fill_in_the_blanks",
        "true_false",
        "match_the_following",
        "one_word",
    ] = Field(..., description="Question format for this sub-section")
    num_questions: int = Field(default=1, ge=1, description="Number of questions in this sub-section")
    marks_per_question: int = Field(default=1, ge=1, description="Marks awarded per question")
    instructions: str | None = Field(
        None, description="Optional per-sub-section instructions"
    )
    bloom_level: str | None = Field(
        None, description="Optional Bloom's level override for this sub-section"
    )
    topic_query: str | None = Field(
        None, description="Optional focused topic/chapter query for this sub-section"
    )
    case_study_config: list[CaseStudySubQConfig] | None = Field(
        None, description="Custom sub-question breakdown if type is case_study"
    )
    internal_choice_count: int = Field(
        default=0, ge=0, description="Number of questions in this sub-section with internal OR choice"
    )

    @property
    def sub_section_marks(self) -> int:
        if self.type == "case_study" and self.case_study_config and len(self.case_study_config) > 0:
            marks_per_case = sum(c.count * c.marks_per_sub for c in self.case_study_config)
            return self.num_questions * marks_per_case
        return self.num_questions * self.marks_per_question

    @model_validator(mode="after")
    def sync_sub_marks(self) -> "SubSection":
        if self.type == "case_study" and self.case_study_config and len(self.case_study_config) > 0:
            self.marks_per_question = sum(c.count * c.marks_per_sub for c in self.case_study_config)
        return self


class Section(BaseModel):
    """One section of an exam (e.g., 'Section A — MCQ' or 'Section C — Literature')."""

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
        ..., description="Question format for this section (if not split into sub-sections)"
    )
    num_questions: int = Field(default=1, ge=1, description="Number of questions in this section")
    marks_per_question: int = Field(default=1, ge=1, description="Marks awarded per question")
    instructions: str | None = Field(
        None, description="Optional per-section instructions shown on the paper"
    )
    bloom_level: str | None = Field(
        None, description="Optional Bloom's taxonomy override for this specific section"
    )
    topic_query: str | None = Field(
        None, description="Optional focused chapter/topic query for this section"
    )
    case_study_config: list[CaseStudySubQConfig] | None = Field(
        None, description="Custom sub-question breakdown if section type is case_study"
    )
    sub_sections: list[SubSection] | None = Field(
        None, description="Optional sub-sections / parts within this parent section"
    )
    internal_choice_count: int = Field(
        default=0, ge=0, description="Number of questions in this section with internal OR choice"
    )

    @property
    def section_marks(self) -> int:
        if self.sub_sections and len(self.sub_sections) > 0:
            return sum(sub.sub_section_marks for sub in self.sub_sections)
        if self.type == "case_study" and self.case_study_config and len(self.case_study_config) > 0:
            marks_per_case = sum(c.count * c.marks_per_sub for c in self.case_study_config)
            return self.num_questions * marks_per_case
        return self.num_questions * self.marks_per_question

    @model_validator(mode="after")
    def sync_marks_per_question(self) -> "Section":
        if self.sub_sections and len(self.sub_sections) > 0:
            tot_m = sum(sub.sub_section_marks for sub in self.sub_sections)
            tot_q = sum(sub.num_questions for sub in self.sub_sections)
            if tot_q > 0 and tot_m % tot_q == 0:
                self.num_questions = tot_q
                self.marks_per_question = tot_m // tot_q
            else:
                self.num_questions = 1
                self.marks_per_question = tot_m
        elif self.type == "case_study" and self.case_study_config and len(self.case_study_config) > 0:
            self.marks_per_question = sum(c.count * c.marks_per_sub for c in self.case_study_config)
        return self


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
