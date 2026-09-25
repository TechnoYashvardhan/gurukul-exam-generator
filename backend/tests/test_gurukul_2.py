import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas.template import ExamTemplate, Section


@pytest.mark.asyncio
async def test_section_topic_query_schema():
    sec = Section(
        id="s1",
        title="Section A — Kinematics",
        type="mcq",
        num_questions=5,
        marks_per_question=2,
        topic_query="Chapter 3: Motion in a Straight Line",
    )
    assert sec.topic_query == "Chapter 3: Motion in a Straight Line"
    assert sec.section_marks == 10

    tpl = ExamTemplate(
        subject="Physics",
        grade="Grade 11",
        difficulty="medium",
        total_marks=10,
        duration_minutes=60,
        sections=[sec],
    )
    assert tpl.sections[0].topic_query == "Chapter 3: Motion in a Straight Line"


@pytest.mark.asyncio
async def test_analyze_pyq_endpoint_with_text():
    transport = ASGITransport(app=app)
    sample_text = """
    CBSE CLASS 12 PHYSICS BOARD PAPER
    Time: 3 Hours
    Total Marks: 70
    General Instructions:
    1. There are 33 questions in all. All questions are compulsory.
    2. Section A contains sixteen questions, twelve MCQ and four Assertion Reasoning of 1 mark each.
    3. Section B contains five questions of 2 marks each.
    4. Section C contains seven questions of 3 marks each.
    5. Section D contains two case study based questions of 4 marks each.
    6. Section E contains three long answer questions of 5 marks each.
    """
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/templates/analyze-pyq",
            data={"text": sample_text},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        tpl = data["template"]
        assert tpl["subject"] in ["Physics", "General Studies"]
        assert len(tpl["sections"]) >= 1
        # Check that marks match mathematically
        comp = sum(s["num_questions"] * s["marks_per_question"] for s in tpl["sections"])
        assert comp == tpl["total_marks"]


@pytest.mark.asyncio
async def test_analyze_pyq_endpoint_validation_error():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/templates/analyze-pyq",
            data={"text": "too short"},
        )
        assert res.status_code == 400
