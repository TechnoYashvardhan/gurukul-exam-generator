"""
Admin Router — Class Management, Shishya Roster Provisioning, and Performance Deep-Dive Reports.
"""

import logging
import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.db import User, ClassGroup, GeneratedExam, QuizAttempt
from app.services.auth import require_current_user, require_role, get_password_hash

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClassCreateRequest(BaseModel):
    name: str = Field(..., description="Class name, e.g. BCA 1st Year")
    course: str = Field(..., description="Course name, e.g. BCA, B.Tech, Class 10")
    section: Optional[str] = Field(None, description="Section or batch, e.g. Batch 2026-27")


class ClassSummaryResponse(BaseModel):
    id: str
    name: str
    course: str
    section: Optional[str] = None
    created_at: str
    student_count: int = 0
    assigned_quizzes_count: int = 0


class StudentCreateRequest(BaseModel):
    scholar_id: str = Field(..., description="7-digit Scholar ID, e.g. 2410852")
    full_name: str
    email: str


class StudentRosterItem(BaseModel):
    id: str
    scholar_id: str
    full_name: str
    email: str
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    created_at: str
    attempts_count: int = 0
    avg_percentage: float = 0.0
    highest_percentage: float = 0.0
    last_attempt_at: Optional[str] = None


class StudentReportAttempt(BaseModel):
    attempt_id: str
    exam_id: str
    exam_title: str
    subject: str
    grade: str
    score: float
    total_marks: int
    percentage: float
    time_spent_seconds: int
    created_at: str
    breakdown: list[dict]


class StudentFullReportResponse(BaseModel):
    student_id: str
    scholar_id: str
    full_name: str
    email: str
    class_name: Optional[str] = None
    course: Optional[str] = None
    total_quizzes_taken: int
    overall_avg_percentage: float
    overall_highest_percentage: float
    total_time_spent_seconds: int
    attempts: list[StudentReportAttempt]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/classes", response_model=list[ClassSummaryResponse])
async def list_classes(
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all classes with student and quiz counts."""
    result = await db.execute(select(ClassGroup).order_by(ClassGroup.name.asc()))
    classes = result.scalars().all()

    summaries = []
    for cg in classes:
        # Count students
        std_count_res = await db.execute(
            select(func.count(User.id)).where(User.class_id == cg.id, User.role == "student")
        )
        std_count = std_count_res.scalar() or 0

        # Count assigned exams
        quiz_count_res = await db.execute(
            select(func.count(GeneratedExam.id)).where(GeneratedExam.target_class_id == cg.id)
        )
        quiz_count = quiz_count_res.scalar() or 0

        summaries.append(
            ClassSummaryResponse(
                id=str(cg.id),
                name=cg.name,
                course=cg.course,
                section=cg.section,
                created_at=cg.created_at.isoformat() if cg.created_at else "",
                student_count=std_count,
                assigned_quizzes_count=quiz_count,
            )
        )
    return summaries


@router.post("/classes", response_model=ClassSummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    body: ClassCreateRequest,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new class group."""
    # Check uniqueness
    existing = await db.execute(select(ClassGroup).where(ClassGroup.name == body.name.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class with name '{body.name}' already exists.",
        )

    cg = ClassGroup(
        id=uuid.uuid4(),
        name=body.name.strip(),
        course=body.course.strip(),
        section=body.section.strip() if body.section else None,
    )
    db.add(cg)
    await db.commit()
    await db.refresh(cg)

    return ClassSummaryResponse(
        id=str(cg.id),
        name=cg.name,
        course=cg.course,
        section=cg.section,
        created_at=cg.created_at.isoformat() if cg.created_at else "",
        student_count=0,
        assigned_quizzes_count=0,
    )


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(
    class_id: uuid.UUID,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a class group."""
    cg = await db.get(ClassGroup, class_id)
    if not cg:
        raise HTTPException(status_code=404, detail="Class not found.")

    await db.delete(cg)
    await db.commit()


@router.get("/classes/{class_id}/students", response_model=list[StudentRosterItem])
async def list_class_students(
    class_id: uuid.UUID,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all students enrolled in a class with performance stats."""
    cg = await db.get(ClassGroup, class_id)
    if not cg:
        raise HTTPException(status_code=404, detail="Class not found.")

    students_res = await db.execute(
        select(User)
        .where(User.class_id == class_id, User.role == "student")
        .order_by(User.scholar_id.asc(), User.full_name.asc())
    )
    students = students_res.scalars().all()

    roster = []
    for s in students:
        attempts_res = await db.execute(
            select(QuizAttempt).where(QuizAttempt.user_id == s.id).order_by(desc(QuizAttempt.created_at))
        )
        attempts = attempts_res.scalars().all()

        count = len(attempts)
        avg_pct = round(sum(a.percentage for a in attempts) / count, 1) if count > 0 else 0.0
        high_pct = round(max((a.percentage for a in attempts), default=0.0), 1)
        last_at = attempts[0].created_at.isoformat() if attempts and attempts[0].created_at else None

        roster.append(
            StudentRosterItem(
                id=str(s.id),
                scholar_id=s.scholar_id or "—",
                full_name=s.full_name or s.email,
                email=s.email,
                class_id=str(cg.id),
                class_name=cg.name,
                created_at=s.created_at.isoformat() if s.created_at else "",
                attempts_count=count,
                avg_percentage=avg_pct,
                highest_percentage=high_pct,
                last_attempt_at=last_at,
            )
        )
    return roster


@router.post("/classes/{class_id}/students", response_model=StudentRosterItem, status_code=status.HTTP_201_CREATED)
async def add_student_to_class(
    class_id: uuid.UUID,
    body: StudentCreateRequest,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a student to a class roster with 7-digit Scholar ID and default password student@dsvv123."""
    cg = await db.get(ClassGroup, class_id)
    if not cg:
        raise HTTPException(status_code=404, detail="Class not found.")

    scholar_id = body.scholar_id.strip()
    if not (scholar_id.isdigit() and len(scholar_id) == 7):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scholar ID must be exactly 7 digits (e.g. 2410852).",
        )

    clean_email = body.email.lower().strip()

    # Check if scholar_id or email is already in use
    existing_id = await db.execute(
        select(User).where((User.scholar_id == scholar_id) | (User.email == clean_email))
    )
    if existing_id.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scholar ID '{scholar_id}' or Email '{clean_email}' is already registered.",
        )

    student = User(
        id=uuid.uuid4(),
        scholar_id=scholar_id,
        email=clean_email,
        full_name=body.full_name.strip(),
        hashed_pw=get_password_hash("student@dsvv123"),
        role="student",
        is_active=True,
        class_id=cg.id,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    return StudentRosterItem(
        id=str(student.id),
        scholar_id=student.scholar_id,
        full_name=student.full_name,
        email=student.email,
        class_id=str(cg.id),
        class_name=cg.name,
        created_at=student.created_at.isoformat() if student.created_at else "",
        attempts_count=0,
        avg_percentage=0.0,
        highest_percentage=0.0,
        last_attempt_at=None,
    )


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: uuid.UUID,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a student from the system."""
    student = await db.get(User, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    await db.delete(student)
    await db.commit()


@router.get("/students/{student_id}/report", response_model=StudentFullReportResponse)
async def get_student_deep_dive_report(
    student_id: uuid.UUID,
    current_user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch complete academic performance report card for a student with question breakdowns."""
    student = await db.get(User, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    class_name = None
    course = None
    if student.class_id:
        cg = await db.get(ClassGroup, student.class_id)
        if cg:
            class_name = cg.name
            course = cg.course

    # Fetch attempts with related exam
    attempts_res = await db.execute(
        select(QuizAttempt, GeneratedExam)
        .join(GeneratedExam, QuizAttempt.exam_id == GeneratedExam.id)
        .where(QuizAttempt.user_id == student_id)
        .order_by(desc(QuizAttempt.created_at))
    )
    rows = attempts_res.all()

    report_attempts = []
    total_time = 0
    percentages = []

    for attempt, exam in rows:
        exam_json = exam.exam_json if isinstance(exam.exam_json, dict) else {}
        questions = exam_json.get("questions", [])
        title = exam_json.get("title") or f"{exam_json.get('subject', 'General')} Exam"
        subject = exam_json.get("subject", "General")
        grade = exam_json.get("grade", "Standard")

        percentages.append(attempt.percentage)
        total_time += attempt.time_spent_seconds

        # Build detailed breakdown
        user_answers = attempt.answers if isinstance(attempt.answers, dict) else {}
        breakdown = []
        for q in questions:
            q_num = str(q.get("question_no", ""))
            response_data = user_answers.get(q_num, {})
            if not isinstance(response_data, dict):
                response_data = {"user_answer": response_data, "is_correct": False, "score": 0}

            breakdown.append({
                "question_no": q.get("question_no"),
                "text": q.get("text"),
                "type": q.get("type"),
                "marks": q.get("marks", 1),
                "options": q.get("options", []),
                "correct_answer": q.get("answer"),
                "user_answer": response_data.get("user_answer"),
                "is_correct": response_data.get("is_correct", False),
                "score_awarded": response_data.get("score", 0),
                "evaluation_reason": response_data.get("evaluation") or response_data.get("reason"),
            })

        report_attempts.append(
            StudentReportAttempt(
                attempt_id=str(attempt.id),
                exam_id=str(exam.id),
                exam_title=title,
                subject=subject,
                grade=grade,
                score=attempt.score,
                total_marks=attempt.total_marks,
                percentage=attempt.percentage,
                time_spent_seconds=attempt.time_spent_seconds,
                created_at=attempt.created_at.isoformat() if attempt.created_at else "",
                breakdown=breakdown,
            )
        )

    count = len(report_attempts)
    avg_pct = round(sum(percentages) / count, 1) if count > 0 else 0.0
    high_pct = round(max(percentages, default=0.0), 1)

    return StudentFullReportResponse(
        student_id=str(student.id),
        scholar_id=student.scholar_id or "—",
        full_name=student.full_name or student.email,
        email=student.email,
        class_name=class_name,
        course=course,
        total_quizzes_taken=count,
        overall_avg_percentage=avg_pct,
        overall_highest_percentage=high_pct,
        total_time_spent_seconds=total_time,
        attempts=report_attempts,
    )
