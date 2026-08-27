"""
Phase 1 test suite — tests the generation pipeline end-to-end.

Run with:  pytest tests/ -v
Or against a live server:  pytest tests/ -v --live

Tests use a mock LLM client by default (no API key needed, no quota consumed).
The mock injects realistic failures on first attempt to exercise retry logic.
"""

import json
import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.llm.base import LLMClient
from app.schemas.exam import GeneratedExam
from app.schemas.template import ExamTemplate, Section
from app.services.exam_generator import generate_exam


# ═══════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_SYLLABUS = """
Newton's Laws of Motion:
1. First Law: An object at rest stays at rest, an object in motion stays in motion
   unless acted upon by a net external force.
2. Second Law: F = ma (Force equals mass times acceleration).
   Force is measured in Newtons (N). Mass in kg, acceleration in m/s².
3. Third Law: For every action there is an equal and opposite reaction.

Kinematics:
- Velocity = displacement / time (vector quantity)
- Acceleration = change in velocity / time
- Equations of motion: v = u + at; s = ut + ½at²; v² = u² + 2as
- Free fall acceleration g ≈ 9.8 m/s²

Energy:
- Kinetic Energy: KE = ½mv²
- Potential Energy: PE = mgh
- Conservation of Energy: energy cannot be created or destroyed.
- Work = Force × displacement × cos θ (Joules)
- Power = Work / time (Watts)
"""


@pytest.fixture
def simple_template() -> ExamTemplate:
    """A minimal valid 10-mark exam template."""
    return ExamTemplate(
        subject="Physics",
        grade="Grade 10",
        difficulty="medium",
        total_marks=10,
        duration_minutes=30,
        sections=[
            Section(
                id="s1",
                title="Section A — MCQ",
                type="mcq",
                num_questions=5,
                marks_per_question=1,
                instructions="Choose one.",
            ),
            Section(
                id="s2",
                title="Section B — Short Answer",
                type="short_answer",
                num_questions=1,
                marks_per_question=5,
                instructions="Answer briefly.",
            ),
        ],
    )


def _make_valid_exam_json(template: ExamTemplate) -> str:
    """Build a valid GeneratedExam JSON string matching the given template."""
    questions = []
    qno = 1

    for section in template.sections:
        for i in range(section.num_questions):
            q: dict = {
                "section_id": section.id,
                "question_no": i + 1,
                "type": section.type,
                "text": f"Sample question {qno} about Newton's laws.",
                "answer": "Newton's Second Law states F = ma, meaning force equals mass times acceleration.",
                "marks": section.marks_per_question,
                "bloom_level": "understand",
                "difficulty": "medium",
            }
            if section.type == "mcq":
                q["options"] = [
                    {"key": "A", "text": "First Law"},
                    {"key": "B", "text": "Second Law"},
                    {"key": "C", "text": "Third Law"},
                    {"key": "D", "text": "Law of Gravitation"},
                ]
                q["answer"] = "B"
            qno += 1
            questions.append(q)

    exam = {
        "subject": template.subject,
        "grade": template.grade,
        "total_marks": template.total_marks,
        "duration_minutes": template.duration_minutes,
        "questions": questions,
    }
    return json.dumps(exam)


# ═══════════════════════════════════════════════════════════════════════════════
# Unit Tests — Generation Service
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_generate_exam_success(simple_template: ExamTemplate) -> None:
    """Happy path: mock LLM returns valid JSON on first attempt."""

    class MockLLM(LLMClient):
        @property
        def provider_name(self) -> str:
            return "mock"

        @property
        def model_name(self) -> str:
            return "mock-model"

        async def generate(self, system_prompt, user_message, **kwargs) -> str:
            return _make_valid_exam_json(simple_template)

    exam, retries, llm = await generate_exam(
        template=simple_template,
        syllabus_text=SAMPLE_SYLLABUS,
        llm_client=MockLLM(),
    )

    assert isinstance(exam, GeneratedExam)
    assert exam.total_marks == simple_template.total_marks
    assert len(exam.questions) == sum(s.num_questions for s in simple_template.sections)
    assert retries == 0  # succeeded first try


@pytest.mark.asyncio
async def test_generate_exam_retry_on_bad_json(simple_template: ExamTemplate) -> None:
    """Retry path: first attempt returns bad JSON, second returns valid exam."""
    attempt = 0
    valid_json = _make_valid_exam_json(simple_template)

    class RetryMockLLM(LLMClient):
        @property
        def provider_name(self) -> str:
            return "mock"

        @property
        def model_name(self) -> str:
            return "mock-model"

        async def generate(self, system_prompt, user_message, **kwargs) -> str:
            nonlocal attempt
            attempt += 1
            if attempt == 1:
                return "This is not JSON at all!!! { broken"
            return valid_json

    exam, retries, llm = await generate_exam(
        template=simple_template,
        syllabus_text=SAMPLE_SYLLABUS,
        llm_client=RetryMockLLM(),
    )

    assert isinstance(exam, GeneratedExam)
    assert retries == 1  # one retry was needed


@pytest.mark.asyncio
async def test_generate_exam_fails_after_max_retries(simple_template: ExamTemplate) -> None:
    """Failure path: LLM always returns invalid JSON — should raise ValueError."""

    class AlwaysFailLLM(LLMClient):
        @property
        def provider_name(self) -> str:
            return "mock"

        @property
        def model_name(self) -> str:
            return "mock-model"

        async def generate(self, system_prompt, user_message, **kwargs) -> str:
            return "NOT JSON"

    with pytest.raises(ValueError, match="Exam generation failed"):
        await generate_exam(
            template=simple_template,
            syllabus_text=SAMPLE_SYLLABUS,
            llm_client=AlwaysFailLLM(),
        )


def test_template_mark_mismatch_raises() -> None:
    """Template validation should reject mismatched totals immediately."""
    with pytest.raises(ValueError, match="Section marks sum to"):
        ExamTemplate(
            subject="Math",
            grade="Grade 8",
            difficulty="easy",
            total_marks=999,  # wrong — sections only sum to 10
            duration_minutes=60,
            sections=[
                Section(id="s1", title="A", type="mcq", num_questions=10, marks_per_question=1),
            ],
        )


def test_mcq_question_validates_options() -> None:
    """MCQ questions must have exactly 4 A/B/C/D options."""
    from app.schemas.exam import Question

    with pytest.raises(ValueError, match="exactly 4 options"):
        Question(
            section_id="s1",
            question_no=1,
            type="mcq",
            text="What is F = ma?",
            options=[{"key": "A", "text": "Newton's First"}, {"key": "B", "text": "Second"}],
            answer="A",
            marks=1,
            bloom_level="understand",
            difficulty="easy",
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Integration Tests — HTTP endpoint (mocked LLM, real FastAPI)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def sample_request_body(simple_template: ExamTemplate) -> dict:
    return {
        "template": simple_template.model_dump(),
        "syllabus_text": SAMPLE_SYLLABUS,
        "source_type": "hardcoded",
    }


@pytest.mark.asyncio
async def test_generate_endpoint_success(
    simple_template: ExamTemplate,
    sample_request_body: dict,
) -> None:
    """POST /api/v1/generate/exam returns 201 with valid exam JSON."""
    valid_json = _make_valid_exam_json(simple_template)

    # Patch the factory so no real API key is needed
    with patch("app.routers.generate.generate_exam") as mock_gen:
        from app.llm.ollama_client import OllamaClient

        class _FakeLLM(LLMClient):
            provider_name = "mock"
            model_name = "mock-model"

            async def generate(self, *a, **kw) -> str:
                return valid_json

        mock_exam = GeneratedExam.model_validate(json.loads(valid_json))
        mock_gen.return_value = (mock_exam, 0, _FakeLLM())

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/v1/generate/exam", json=sample_request_body)

    assert resp.status_code == 201
    data = resp.json()
    assert data["total_marks"] == simple_template.total_marks
    assert len(data["questions"]) == sum(s.num_questions for s in simple_template.sections)
    assert "exam_id" in data
    assert data["retries_used"] == 0


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
