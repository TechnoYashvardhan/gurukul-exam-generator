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


@pytest.mark.asyncio
async def test_sub_question_and_case_study_schema():
    from app.schemas.exam import Question, SubQuestion, MCQOption

    sub1 = SubQuestion(
        sub_no="i",
        type="mcq",
        text="What is the central theme of the passage?",
        options=[
            MCQOption(key="A", text="Sustainable living"),
            MCQOption(key="B", text="Industrial growth"),
            MCQOption(key="C", text="Space exploration"),
            MCQOption(key="D", text="Digital marketing"),
        ],
        answer="A",
        marks=1,
    )
    sub2 = SubQuestion(
        sub_no="ii",
        type="fill_in_the_blanks",
        text="The author describes eco-resilience as _____.",
        answer="imperative",
        marks=1,
    )
    sub3 = SubQuestion(
        sub_no="iii",
        type="short_answer",
        text="Infer two reasons for the observed shifts.",
        answer="1. Climatic variance 2. Policy adoption",
        marks=2,
    )

    q = Question(
        section_id="s1",
        question_no=1,
        type="case_study",
        text="Read the following passage carefully and answer the questions that follow:",
        passage="Global ecological transitions have stimulated widespread discourse on sustainable frameworks...",
        sub_questions=[sub1, sub2, sub3],
        answer="Comprehensive answer key for sub-questions (i)-(iii)",
        marks=4,
        bloom_level="analyze",
        difficulty="medium",
    )

    assert q.passage is not None
    assert len(q.sub_questions) == 3
    assert q.sub_questions[0].type == "mcq"
    assert q.sub_questions[0].answer == "A"
    assert q.sub_questions[1].answer == "imperative"
    assert q.options is None  # options is sanitized to None when sub_questions is present
    assert sum(s.marks for s in q.sub_questions) == 4


@pytest.mark.asyncio
async def test_analyze_pyq_cbse_multi_tier():
    transport = ASGITransport(app=app)
    sample_cbse_paper = """
    CBSE Senior School Certificate Examination 2025-26
    ENGLISH CORE (Code No. 301)
    Time Allowed: 3 hours                                Maximum Marks: 80
    
    General Instructions:
    1. 15-minute prior reading time allotted.
    2. The Question Paper contains THREE sections-READING, WRITING and LITERATURE.
    3. Attempt questions based on specific instructions for each part.
    
    SECTION A: READING SKILLS (22 Marks)
    1. Read the following passage carefully and answer the questions that follow. (12 Marks)
       [Passage text here...]
       (i) Which of the following best describes the author's tone? (1)
       (ii) Complete the sentence: The primary factor is _____ (1)
    2. Read the following factual passage carefully. (10 Marks)
       [Passage text here...]
       
    SECTION B: CREATIVE WRITING SKILLS (18 Marks)
    3. Notice writing (4 Marks)
    4. Formal Invitation (4 Marks)
    5. Letter to Editor (5 Marks)
    6. Article Writing (5 Marks)
    
    SECTION C: LITERATURE (40 Marks)
    7. Read the given extract and answer questions. (6 Marks)
    8. Read the given prose extract. (4 Marks)
    9. Short answer questions from Flamingo (5 x 2 = 10 Marks)
    10. Short answer questions from Vistas (2 x 2 = 4 Marks)
    11. Long answer question (5 Marks)
    12. Long answer question (5 Marks)
    13. Analytical question (6 Marks)
    """
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/templates/analyze-pyq",
            data={"text": sample_cbse_paper},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        tpl = data["template"]
        assert tpl["subject"] in ["English Core", "General Studies", "English"]
        assert tpl["total_marks"] in [80, 70]
        assert len(tpl["sections"]) >= 1
        comp = sum(s["num_questions"] * s["marks_per_question"] for s in tpl["sections"])
        assert comp == tpl["total_marks"]


@pytest.mark.asyncio
async def test_sub_sections_template_and_generation():
    from app.schemas.template import ExamTemplate, Section, SubSection, CaseStudySubQConfig
    from app.services.exam_generator import generate_exam
    from app.llm.base import LLMClient

    # Define a Mock LLM that triggers the rich deterministic fallback
    class MockFailingLLM(LLMClient):
        @property
        def provider_name(self) -> str:
            return "mock-failing"

        @property
        def model_name(self) -> str:
            return "mock-failing-model"

        async def generate(self, system_prompt: str, user_message: str, temperature: float = 0.7, max_tokens: int = 4096) -> str:
            raise RuntimeError("Intentional mock fallback trigger")

    csc = [
        CaseStudySubQConfig(type="mcq", count=2, marks_per_sub=1),
        CaseStudySubQConfig(type="fill_in_the_blanks", count=1, marks_per_sub=1),
        CaseStudySubQConfig(type="short_answer", count=1, marks_per_sub=2),
    ]  # 2*1 + 1*1 + 1*2 = 5 Marks per case study

    sec_c = Section(
        id="sec_c",
        title="Section C — Literature",
        type="long_answer",
        num_questions=1,
        marks_per_question=26,
        sub_sections=[
            SubSection(
                id="sec_c_p1",
                title="Part I — Context Extracts",
                type="case_study",
                num_questions=2,
                marks_per_question=5,
                case_study_config=csc,
            ),  # 2 * 5 = 10 Marks
            SubSection(
                id="sec_c_p2",
                title="Part II — Short Answer Questions",
                type="short_answer",
                num_questions=3,
                marks_per_question=2,
            ),  # 3 * 2 = 6 Marks
            SubSection(
                id="sec_c_p3",
                title="Part III — Long Answer Questions",
                type="long_answer",
                num_questions=2,
                marks_per_question=5,
            ),  # 2 * 5 = 10 Marks
        ],
    )
    assert sec_c.section_marks == 26

    sec_a = Section(
        id="sec_a",
        title="Section A — Multiple Choice",
        type="mcq",
        num_questions=4,
        marks_per_question=1,
    )  # 4 Marks

    tpl = ExamTemplate(
        subject="English Literature",
        grade="Grade 12",
        difficulty="medium",
        total_marks=30,
        duration_minutes=90,
        sections=[sec_a, sec_c],
    )
    assert tpl.total_marks == 30

    mock_llm = MockFailingLLM()
    gen = generate_exam(tpl, syllabus_text="English syllabus content", llm_client=mock_llm)
    final_exam = None
    async for item in gen:
        if isinstance(item, tuple):
            final_exam = item[0]

    assert final_exam is not None
    assert len(final_exam.questions) == 11  # 4 (Sec A) + 2 (Part I) + 3 (Part II) + 2 (Part III)
    
    # Check that sub-section metadata is preserved
    part1_qs = [q for q in final_exam.questions if q.sub_section_id == "sec_c_p1"]
    assert len(part1_qs) == 2
    for q in part1_qs:
        assert q.type == "case_study"
        assert q.passage is not None
        assert q.sub_questions is not None
        assert len(q.sub_questions) == 4  # 2 MCQs + 1 Blank + 1 Short Ans
        assert sum(s.marks for s in q.sub_questions) == 5
        assert q.marks == 5

    part2_qs = [q for q in final_exam.questions if q.sub_section_id == "sec_c_p2"]
    assert len(part2_qs) == 3
    for q in part2_qs:
        assert q.type == "short_answer"
        assert q.marks == 2

    part3_qs = [q for q in final_exam.questions if q.sub_section_id == "sec_c_p3"]
    assert len(part3_qs) == 2
    for q in part3_qs:
        assert q.type == "long_answer"
        assert q.marks == 5


