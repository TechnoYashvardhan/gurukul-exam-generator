"""
Stand-alone seeding and verification script for PostgreSQL.
Run this with: python seed_postgres.py
"""

import asyncio
import uuid

from app.database import engine, Base, AsyncSessionLocal
from app.models.db import User, ClassGroup, Template
from app.services.auth import get_password_hash


async def seed_database():
    print("🐘 [PostgreSQL] Initializing tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ All tables created / verified in PostgreSQL!")

    _admin_uid = uuid.UUID("00000000-0000-0000-0000-000000000002")
    _teacher_uid = uuid.UUID("00000000-0000-0000-0000-000000000001")
    _student_uid = uuid.UUID("00000000-0000-0000-0000-000000000003")

    _class_1_id = uuid.UUID("10000000-0000-0000-0000-000000000001")

    async with AsyncSessionLocal() as session:
        # 1. Class
        c1 = await session.get(ClassGroup, _class_1_id)
        if not c1:
            session.add(ClassGroup(
                id=_class_1_id,
                name="BCA - 1st Year",
                course="BCA",
                section="Batch 2026-27",
            ))
            print("✅ Seeded Class: BCA - 1st Year")

        # 2. Admin
        admin = await session.get(User, _admin_uid)
        admin_hash = get_password_hash("OmBhBS@123")
        if not admin:
            session.add(User(
                id=_admin_uid,
                email="Admin_DSVV01@dsvv.ac.in",
                hashed_pw=admin_hash,
                full_name="Chief Admin DSVV",
                role="admin"
            ))
            print("✅ Seeded Chief Admin: Admin_DSVV01@dsvv.ac.in")
        else:
            admin.hashed_pw = admin_hash
            admin.role = "admin"

        # 3. Teacher
        teacher = await session.get(User, _teacher_uid)
        teacher_hash = get_password_hash("teacher123")
        if not teacher:
            session.add(User(
                id=_teacher_uid,
                email="teacher@gurukul.local",
                hashed_pw=teacher_hash,
                full_name="Gurukul Teacher",
                role="teacher"
            ))
            print("✅ Seeded Teacher: teacher@gurukul.local")
        else:
            teacher.hashed_pw = teacher_hash
            teacher.role = "teacher"

        # 4. Student
        student = await session.get(User, _student_uid)
        student_hash = get_password_hash("student@dsvv123")
        if not student:
            session.add(User(
                id=_student_uid,
                email="student@gurukul.local",
                scholar_id="2410852",
                class_id=str(_class_1_id),
                hashed_pw=student_hash,
                full_name="Arjuna Student",
                role="student"
            ))
            print("✅ Seeded Student: Scholar ID 2410852 (student@dsvv123)")
        else:
            student.hashed_pw = student_hash
            student.scholar_id = "2410852"
            student.class_id = str(_class_1_id)
            student.role = "student"

        # 5. Default Blueprint Template
        _tpl_1_id = uuid.UUID("20000000-0000-0000-0000-000000000001")
        t1 = await session.get(Template, _tpl_1_id)
        if not t1:
            session.add(Template(
                id=_tpl_1_id,
                user_id=_admin_uid,
                name="BCA - Computer Hardware & Components",
                subject="Computer Hardware & Components",
                grade="BCA",
                config={
                    "subject": "Computer Hardware & Components",
                    "grade": "BCA",
                    "difficulty": "medium",
                    "total_marks": 40,
                    "duration_minutes": 180,
                    "heading_details": "Dev Sanskriti Vishwavidyalaya<br>Practice Quiz<br>Course: BCA",
                    "instructions": "All questions are compulsory.\nRead all the questions carefully.",
                    "sections": [
                        {"id": "sec-a", "title": "Multiple Choice Questions", "type": "mcq", "num_questions": 5, "marks_per_question": 2},
                        {"id": "sec-b", "title": "Short Answer Questions", "type": "short_answer", "num_questions": 4, "marks_per_question": 5},
                        {"id": "sec-c", "title": "Match the Following", "type": "match_the_following", "num_questions": 2, "marks_per_question": 5},
                    ]
                }
            ))
            print("✅ Seeded Default Blueprint: Computer Hardware & Components")

        await session.commit()
        print("\n🎉 [PostgreSQL] Database setup & initial seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_database())
