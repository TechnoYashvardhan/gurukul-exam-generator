import json
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from app.main import app
from app.models.db import User, GeneratedExam, QuizAttempt
from app.database import AsyncSessionLocal, engine, Base


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    from app.database import fallback_to_local_sqlite
    fallback_to_local_sqlite()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        for sql in [
            "ALTER TABLE users ADD COLUMN scholar_id TEXT",
            "ALTER TABLE users ADD COLUMN class_id TEXT",
            "ALTER TABLE generated_exams ADD COLUMN target_class_id TEXT",
            "ALTER TABLE generated_exams ADD COLUMN schedule_start_at DATETIME",
            "ALTER TABLE generated_exams ADD COLUMN schedule_end_at DATETIME",
            "ALTER TABLE quiz_attempts ADD COLUMN is_disqualified BOOLEAN DEFAULT 0",
            "ALTER TABLE quiz_attempts ADD COLUMN warnings_count INTEGER DEFAULT 0",
            "ALTER TABLE quiz_attempts ADD COLUMN integrity_status VARCHAR(50) DEFAULT 'clean'",
            "ALTER TABLE quiz_attempts ADD COLUMN violation_log JSON",
            "ALTER TABLE quiz_attempts ADD COLUMN integrity_remarks TEXT",
        ]:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass

    student_uid = uuid.UUID("00000000-0000-0000-0000-000000000003")
    async with AsyncSessionLocal() as session:
        student = await session.get(User, student_uid)
        if not student:
            session.add(
                User(
                    id=student_uid,
                    email="student@test.local",
                    scholar_id="2410852",
                    hashed_pw="placeholder",
                    full_name="Test Student",
                    role="student",
                    is_active=True,
                )
            )
            await session.commit()


@pytest.mark.asyncio
async def test_kavach_disqualification_and_integrity_logging():
    exam_id = uuid.uuid4()
    student_uid = uuid.UUID("00000000-0000-0000-0000-000000000003")

    async with AsyncSessionLocal() as session:
        exam = GeneratedExam(
            id=exam_id,
            user_id=student_uid,
            source_type="curriculum_synthesis",
            exam_json={
                "subject": "Physics",
                "grade": "Grade 10",
                "total_marks": 10,
                "duration_minutes": 30,
                "questions": [
                    {
                        "question_no": 1,
                        "type": "mcq",
                        "text": "What is the SI unit of electric resistance?",
                        "options": [
                            {"key": "A", "text": "Ohm"},
                            {"key": "B", "text": "Volt"},
                            {"key": "C", "text": "Ampere"},
                            {"key": "D", "text": "Watt"},
                        ],
                        "answer": "A",
                        "marks": 5,
                    },
                    {
                        "question_no": 2,
                        "type": "mcq",
                        "text": "What is the unit of power?",
                        "options": [
                            {"key": "A", "text": "Watt"},
                            {"key": "B", "text": "Joule"},
                        ],
                        "answer": "A",
                        "marks": 5,
                    },
                ],
            },
            llm_provider="mock",
            llm_model="mock-model",
            created_by_role="teacher",
            is_published=True,
        )
        session.add(exam)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test clean submission
        res_clean = await client.post(
            f"/api/v1/student/quiz/{exam_id}/submit",
            json={
                "answers": {"1": "A", "2": "A"},
                "time_spent_seconds": 120,
                "is_disqualified": False,
                "warnings_count": 0,
            },
        )
        assert res_clean.status_code == 200
        clean_data = res_clean.json()
        assert clean_data["score"] == 10.0
        assert clean_data["percentage"] == 100.0
        assert clean_data["is_disqualified"] is False
        assert clean_data["integrity_status"] == "clean"

        # 2. Test disqualified submission with 3 strikes
        res_disq = await client.post(
            f"/api/v1/student/quiz/{exam_id}/submit",
            json={
                "answers": {"1": "A", "2": "A"},
                "time_spent_seconds": 180,
                "is_disqualified": True,
                "warnings_count": 3,
                "violations": [
                    {"type": "tab_switch", "timestamp": "17:00:10", "warning_number": 1, "detail": "Tab switched"},
                    {"type": "window_blur", "timestamp": "17:01:20", "warning_number": 2, "detail": "Window unfocused"},
                    {"type": "tab_switch", "timestamp": "17:02:45", "warning_number": 3, "detail": "Tab switched Strike 3"},
                ],
                "disqualification_reason": "Disqualified on Strike 3: Tab switched",
            },
        )
        assert res_disq.status_code == 200
        disq_data = res_disq.json()
        assert disq_data["score"] == 0.0
        assert disq_data["percentage"] == 0.0
        assert disq_data["is_disqualified"] is True
        assert disq_data["integrity_status"] == "disqualified"
        assert len(disq_data["violation_log"]) == 3
