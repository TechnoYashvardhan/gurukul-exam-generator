"""
Student router: Quizzes list, Quiz taking, Quiz submission & automated grading,
Student statistics and history.
"""

from datetime import datetime, timezone
import re
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db import GeneratedExam, QuizAttempt, User
from app.services.auth import get_current_user, require_current_user
from app.services.answer_evaluator import evaluate_answers_with_ai, is_fast_match

router = APIRouter(prefix="/student", tags=["student"])


class QuizListItem(BaseModel):
    id: str
    subject: str
    grade: str
    total_marks: int
    duration_minutes: int
    num_questions: int
    created_at: str
    heading_details: Optional[str] = None
    instructions: Optional[str] = None
    attempted: bool = False
    best_score: Optional[float] = None


class QuizSubmitRequest(BaseModel):
    answers: dict[str, Any]  # question index or question_no as string -> student's answer
    time_spent_seconds: int = 0


class QuestionFeedback(BaseModel):
    question_no: int
    section_id: str
    type: str
    text: str
    options: Optional[list] = None
    user_answer: Optional[Any] = None
    correct_answer: str
    is_correct: bool
    marks_awarded: float
    max_marks: float
    explanation: Optional[str] = None


class QuizResultResponse(BaseModel):
    attempt_id: str
    exam_id: str
    subject: str
    grade: str
    score: float
    total_marks: int
    percentage: float
    time_spent_seconds: int
    questions_feedback: list[QuestionFeedback]
    completed_at: str


class StudentStatsResponse(BaseModel):
    total_quizzes_attempted: int
    average_percentage: float
    highest_percentage: float
    total_time_spent_minutes: int
    recent_attempts: list[dict]


def _normalize_text(text: str) -> str:
    """Normalize text for grading fill in blanks and one word answers."""
    return re.sub(r"[^a-zA-Z0-9]", "", text).lower().strip()


@router.get("/quizzes", response_model=list[QuizListItem])
async def list_available_quizzes(
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all available quizzes for students — filtered by their enrolled class or global quizzes."""
    conditions = [
        GeneratedExam.created_by_role == "admin",
        GeneratedExam.is_published == True,
    ]
    if user and user.class_id:
        conditions.append(
            (GeneratedExam.target_class_id == user.class_id) | (GeneratedExam.target_class_id == None)
        )

    result = await db.execute(
        select(GeneratedExam)
        .where(*conditions)
        .order_by(desc(GeneratedExam.created_at))
        .limit(50)
    )
    exams = result.scalars().all()

    # If user is logged in, fetch their attempts
    user_attempts_map: dict[uuid.UUID, float] = {}
    if user:
        attempts_result = await db.execute(
            select(QuizAttempt).where(QuizAttempt.user_id == user.id)
        )
        for att in attempts_result.scalars().all():
            current_best = user_attempts_map.get(att.exam_id, 0)
            user_attempts_map[att.exam_id] = max(current_best, att.percentage)

    items = []
    for ex in exams:
        exam_json = ex.exam_json or {}
        questions = exam_json.get("questions", [])
        subject = exam_json.get("subject") or "General"
        grade = exam_json.get("grade") or "All Grades"
        total_marks = exam_json.get("total_marks") or sum(q.get("marks", 1) for q in questions) or 100
        duration_minutes = exam_json.get("duration_minutes") or 30

        items.append(
            QuizListItem(
                id=str(ex.id),
                subject=subject,
                grade=grade,
                total_marks=total_marks,
                duration_minutes=duration_minutes,
                num_questions=len(questions),
                created_at=ex.created_at.isoformat() if ex.created_at else "",
                heading_details=exam_json.get("heading_details"),
                instructions=exam_json.get("instructions"),
                attempted=ex.id in user_attempts_map,
                best_score=user_attempts_map.get(ex.id),
            )
        )
    return items


@router.get("/quiz/{quiz_id}")
async def get_quiz_for_taking(
    quiz_id: str,
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get exam/quiz details. Hides answers so student cannot inspect them in DOM."""
    try:
        exam_uuid = uuid.UUID(quiz_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    result = await db.execute(select(GeneratedExam).where(GeneratedExam.id == exam_uuid))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Quiz not found")

    exam_json = dict(exam.exam_json)
    questions = []
    for q in exam_json.get("questions", []):
        q_copy = dict(q)
        # Strip answer for test taking
        q_copy.pop("answer", None)
        questions.append(q_copy)

    exam_json["questions"] = questions
    exam_json["id"] = str(exam.id)
    return exam_json


@router.post("/quiz/{quiz_id}/submit", response_model=QuizResultResponse)
async def submit_quiz_attempt(
    quiz_id: str,
    body: QuizSubmitRequest,
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Automatically grade the quiz submission, record attempt, and return detailed feedback."""
    try:
        exam_uuid = uuid.UUID(quiz_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID")

    result = await db.execute(select(GeneratedExam).where(GeneratedExam.id == exam_uuid))
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Quiz not found")

    exam_json = exam.exam_json or {}
    questions = exam_json.get("questions", [])
    total_marks = exam_json.get("total_marks") or sum(q.get("marks", 1) for q in questions) or 1

    # Phase 1: Fast rule-based checks & identify questions needing AI semantic evaluation
    items_to_ai_eval: list[dict[str, Any]] = []
    eval_state: dict[int, dict[str, Any]] = {}

    for idx, q in enumerate(questions):
        q_no = q.get("question_no", idx + 1)
        q_type = q.get("type", "mcq")
        max_marks = float(q.get("marks", 1))
        correct_ans = str(q.get("answer", "")).strip()

        # User's answer for this question
        user_ans = body.answers.get(str(q_no)) or body.answers.get(str(idx)) or body.answers.get(f"q_{idx}") or ""
        user_ans_str = str(user_ans).strip()

        is_correct = False
        marks_awarded = 0.0
        explanation: Optional[str] = None

        if not user_ans_str:
            is_correct = False
            marks_awarded = 0.0
            explanation = "Unanswered"
        elif q_type in ["mcq", "match_the_following"]:
            if user_ans_str.upper() == correct_ans.upper():
                is_correct = True
                marks_awarded = max_marks
                explanation = "Correct option selected"
            elif q.get("options"):
                for opt in q["options"]:
                    if opt.get("key", "").upper() == correct_ans.upper() and opt.get("text", "").strip().lower() == user_ans_str.lower():
                        is_correct = True
                        marks_awarded = max_marks
                        explanation = "Correct option selected"
                        break
            if not is_correct:
                explanation = "Incorrect option"
        elif q_type == "true_false":
            norm_user = user_ans_str.lower()
            norm_correct = correct_ans.lower()
            if (norm_user in ["a", "true"] and norm_correct in ["a", "true"]) or \
               (norm_user in ["b", "false"] and norm_correct in ["b", "false"]) or \
               (norm_user == norm_correct):
                is_correct = True
                marks_awarded = max_marks
                explanation = "Correct answer"
            else:
                explanation = "Incorrect"
        else:
            # Non-MCQ: fill_in_the_blanks, one_word, short_answer, long_answer, case_study
            if is_fast_match(user_ans_str, correct_ans):
                is_correct = True
                marks_awarded = max_marks
                explanation = "Exact match"
            else:
                # Requires semantic evaluation (e.g. 'one' vs '1', 'O2' vs 'Oxygen', synonyms)
                items_to_ai_eval.append({
                    "question_no": q_no,
                    "text": q.get("text", ""),
                    "type": q_type,
                    "expected_answer": correct_ans,
                    "student_answer": user_ans_str,
                    "marks": max_marks,
                })

        eval_state[q_no] = {
            "is_correct": is_correct,
            "marks_awarded": marks_awarded,
            "explanation": explanation,
            "user_ans": user_ans,
            "user_ans_str": user_ans_str,
            "correct_ans": correct_ans,
            "q_type": q_type,
            "max_marks": max_marks,
        }

    # Phase 2: Batch AI Semantic Evaluation for all subjective/fill-in/one-word answers
    if items_to_ai_eval:
        ai_results = await evaluate_answers_with_ai(items_to_ai_eval)
        for item in items_to_ai_eval:
            q_no = item["question_no"]
            ev = ai_results.get(q_no)
            if ev:
                eval_state[q_no]["is_correct"] = ev.is_correct
                eval_state[q_no]["marks_awarded"] = round(eval_state[q_no]["max_marks"] * ev.score_ratio, 2)
                eval_state[q_no]["explanation"] = ev.explanation or ("AI Evaluation: Matched" if ev.is_correct else "AI Evaluation: Incorrect")

    # Phase 3: Compile results and feedback
    feedback_list: list[QuestionFeedback] = []
    total_score = 0.0

    for idx, q in enumerate(questions):
        q_no = q.get("question_no", idx + 1)
        ev_info = eval_state.get(q_no, {})
        is_correct = ev_info.get("is_correct", False)
        marks_awarded = ev_info.get("marks_awarded", 0.0)
        total_score += marks_awarded

        feedback_list.append(
            QuestionFeedback(
                question_no=q_no,
                section_id=q.get("section_id", "s1"),
                type=ev_info.get("q_type", q.get("type", "mcq")),
                text=q.get("text", ""),
                options=q.get("options"),
                user_answer=ev_info.get("user_ans"),
                correct_answer=ev_info.get("correct_ans", ""),
                is_correct=is_correct,
                marks_awarded=marks_awarded,
                max_marks=ev_info.get("max_marks", float(q.get("marks", 1))),
                explanation=ev_info.get("explanation"),
            )
        )

    percentage = round((total_score / total_marks) * 100, 1) if total_marks > 0 else 0.0

    attempt = QuizAttempt(
        id=uuid.uuid4(),
        user_id=user.id,
        exam_id=exam.id,
        score=total_score,
        total_marks=total_marks,
        percentage=percentage,
        time_spent_seconds=body.time_spent_seconds,
        answers={
            "feedback": [f.model_dump() for f in feedback_list],
            "raw_answers": body.answers,
        },
        created_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    await db.commit()

    return QuizResultResponse(
        attempt_id=str(attempt.id),
        exam_id=str(exam.id),
        subject=exam_json.get("subject", "General"),
        grade=exam_json.get("grade", "All"),
        score=total_score,
        total_marks=total_marks,
        percentage=percentage,
        time_spent_seconds=body.time_spent_seconds,
        questions_feedback=feedback_list,
        completed_at=attempt.created_at.isoformat(),
    )


@router.get("/attempt/{attempt_id}", response_model=QuizResultResponse)
async def get_quiz_attempt(
    attempt_id: str,
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full detailed quiz breakdown and answers for a past attempt."""
    try:
        att_uuid = uuid.UUID(attempt_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid attempt ID")

    result = await db.execute(
        select(QuizAttempt, GeneratedExam)
        .join(GeneratedExam, QuizAttempt.exam_id == GeneratedExam.id)
        .where(QuizAttempt.id == att_uuid, QuizAttempt.user_id == user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, exam = row
    exam_json = exam.exam_json or {}
    feedback_data = (attempt.answers or {}).get("feedback", [])

    return QuizResultResponse(
        attempt_id=str(attempt.id),
        exam_id=str(attempt.exam_id),
        subject=exam_json.get("subject", "General"),
        grade=exam_json.get("grade", "All"),
        score=attempt.score,
        total_marks=attempt.total_marks,
        percentage=attempt.percentage,
        time_spent_seconds=attempt.time_spent_seconds,
        questions_feedback=feedback_data,
        completed_at=attempt.created_at.isoformat() if attempt.created_at else "",
    )


@router.get("/stats", response_model=StudentStatsResponse)
async def get_student_stats(
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch dashboard statistics and recent quiz attempts with subject metadata for the student."""
    result = await db.execute(
        select(QuizAttempt, GeneratedExam)
        .join(GeneratedExam, QuizAttempt.exam_id == GeneratedExam.id)
        .where(QuizAttempt.user_id == user.id)
        .order_by(desc(QuizAttempt.created_at))
    )
    rows = result.all()

    total_attempted = len(rows)
    avg_pct = round(sum(att.percentage for att, _ in rows) / total_attempted, 1) if total_attempted > 0 else 0.0
    highest_pct = round(max((att.percentage for att, _ in rows), default=0.0), 1)
    total_time_min = round(sum(att.time_spent_seconds for att, _ in rows) / 60)

    recent = []
    for att, ex in rows[:20]:
        ex_json = ex.exam_json or {}
        recent.append({
            "id": str(att.id),
            "exam_id": str(att.exam_id),
            "subject": ex_json.get("subject", "General"),
            "grade": ex_json.get("grade", "All"),
            "title": ex_json.get("heading_details") or f"{ex_json.get('subject', 'Quiz')} ({ex_json.get('grade', '')})",
            "score": att.score,
            "total_marks": att.total_marks,
            "percentage": att.percentage,
            "time_spent_seconds": att.time_spent_seconds,
            "created_at": att.created_at.isoformat() if att.created_at else "",
        })

    return StudentStatsResponse(
        total_quizzes_attempted=total_attempted,
        average_percentage=avg_pct,
        highest_percentage=highest_pct,
        total_time_spent_minutes=total_time_min,
        recent_attempts=recent,
    )
