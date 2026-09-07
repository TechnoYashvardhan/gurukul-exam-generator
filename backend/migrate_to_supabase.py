"""
One-click data migration script: SQLite (examgen.db) -> Supabase PostgreSQL.

Transfers all records in correct dependency order:
  1. classes
  2. users
  3. documents & document_chunks
  4. templates
  5. generated_exams (quizzes)
  6. quiz_attempts (student stats & test history)

Usage:
  python migrate_to_supabase.py --target "postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
  
  Or set TARGET_DATABASE_URL in your environment.
"""

import argparse
import asyncio
import logging
import os
import re
import ssl
import sys
import urllib.parse
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("migration")

# Import models from local app
from app.models.db import (
    Base,
    ClassGroup,
    Document,
    DocumentChunk,
    GeneratedExam,
    QuizAttempt,
    Template,
    User,
)


def normalize_postgres_url(url: str) -> str:
    url = url.strip()
    # Remove accidental brackets around password: :[password]@ -> :password@
    url = re.sub(r':\[(.*?)\]@', r':\1@', url)

    # Encode raw password if needed
    m = re.match(r'^(https?|postgres(?:ql)?(?:\+[a-z0-9]+)?):\/\/([^:]+):(.+)@([^@]+)$', url)
    if m:
        scheme, user, raw_pw, host_part = m.groups()
        if "%" not in raw_pw:
            encoded_pw = urllib.parse.quote_plus(raw_pw)
            url = f"{scheme}://{user}:{encoded_pw}@{host_part}"

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def get_target_engine(target_url: str):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    connect_args = {
        "ssl": ctx,
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "timeout": 15,
        "command_timeout": 30,
    }
    return create_async_engine(
        target_url,
        echo=False,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


async def migrate(sqlite_path: str, target_url: str):
    norm_url = normalize_postgres_url(target_url)
    logger.info("Connecting to source SQLite database: %s", sqlite_path)
    logger.info("Target connection normalized for asyncpg.")

    src_engine = create_async_engine(f"sqlite+aiosqlite:///{sqlite_path}", echo=False)
    src_sm = async_sessionmaker(src_engine, class_=AsyncSession, expire_on_commit=False)

    tgt_engine = get_target_engine(norm_url)
    tgt_sm = async_sessionmaker(tgt_engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Initialize tables and run migrations on target
    logger.info("Initializing tables on target database...")
    async with tgt_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Apply schema columns if missing
        migrations = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS scholar_id TEXT;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id UUID;",
            "ALTER TABLE generated_exams ADD COLUMN IF NOT EXISTS target_class_id UUID;",
            "ALTER TABLE generated_exams ADD COLUMN IF NOT EXISTS schedule_start_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE generated_exams ADD COLUMN IF NOT EXISTS schedule_end_at TIMESTAMP WITH TIME ZONE;",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception as e:
                logger.debug("Migration notice: %s", e)

    stats = {}

    async with src_sm() as src, tgt_sm() as tgt:
        # Step 1: Classes
        classes = (await src.execute(select(ClassGroup))).scalars().all()
        class_count = 0
        for c in classes:
            existing = await tgt.get(ClassGroup, c.id)
            if not existing:
                tgt.add(ClassGroup(
                    id=c.id,
                    name=c.name,
                    course=c.course,
                    section=c.section,
                    created_at=c.created_at,
                ))
                class_count += 1
            else:
                existing.name = c.name
                existing.course = c.course
                existing.section = c.section
        await tgt.commit()
        stats["Classes"] = f"{class_count} new / {len(classes)} total"
        logger.info("Classes processed: %d", len(classes))

        # Step 2: Users
        users = (await src.execute(select(User))).scalars().all()
        user_count = 0
        for u in users:
            existing = await tgt.get(User, u.id)
            if not existing:
                # Also check email collision
                email_match = (await tgt.execute(select(User).where(User.email == u.email))).scalar_one_or_none()
                if not email_match:
                    tgt.add(User(
                        id=u.id,
                        email=u.email,
                        scholar_id=u.scholar_id,
                        class_id=u.class_id,
                        hashed_pw=u.hashed_pw,
                        full_name=u.full_name,
                        role=u.role,
                        is_active=u.is_active,
                        created_at=u.created_at,
                    ))
                    user_count += 1
            else:
                existing.scholar_id = u.scholar_id
                existing.class_id = u.class_id
                existing.hashed_pw = u.hashed_pw
                existing.full_name = u.full_name
                existing.role = u.role
        await tgt.commit()
        stats["Users"] = f"{user_count} new / {len(users)} total"
        logger.info("Users processed: %d", len(users))

        # Step 3: Documents & Chunks
        docs = (await src.execute(select(Document))).scalars().all()
        doc_count = 0
        for d in docs:
            existing = await tgt.get(Document, d.id)
            if not existing:
                tgt.add(Document(
                    id=d.id,
                    user_id=d.user_id,
                    filename=d.filename,
                    subject=d.subject,
                    grade=d.grade,
                    sha256_hash=d.sha256_hash,
                    page_count=d.page_count,
                    status=d.status,
                    source=d.source,
                    created_at=d.created_at,
                ))
                doc_count += 1
        await tgt.commit()
        stats["Documents"] = f"{doc_count} new / {len(docs)} total"

        chunks = (await src.execute(select(DocumentChunk))).scalars().all()
        chunk_count = 0
        for ch in chunks:
            existing = await tgt.get(DocumentChunk, ch.id)
            if not existing:
                tgt.add(DocumentChunk(
                    id=ch.id,
                    document_id=ch.document_id,
                    chunk_index=ch.chunk_index,
                    content=ch.content,
                    embedding=ch.embedding,
                    token_count=ch.token_count,
                    created_at=ch.created_at,
                ))
                chunk_count += 1
        await tgt.commit()
        stats["Document Chunks"] = f"{chunk_count} new / {len(chunks)} total"

        # Step 4: Templates (Vidya Blueprints)
        templates = (await src.execute(select(Template))).scalars().all()
        tpl_count = 0
        for t in templates:
            existing = await tgt.get(Template, t.id)
            if not existing:
                tgt.add(Template(
                    id=t.id,
                    user_id=t.user_id,
                    name=t.name,
                    subject=t.subject,
                    grade=t.grade,
                    config=t.config,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                ))
                tpl_count += 1
            else:
                existing.name = t.name
                existing.subject = t.subject
                existing.grade = t.grade
                existing.config = t.config
        await tgt.commit()
        stats["Templates"] = f"{tpl_count} new / {len(templates)} total"
        logger.info("Templates processed: %d", len(templates))

        # Step 5: Generated Exams / Quizzes
        exams = (await src.execute(select(GeneratedExam))).scalars().all()
        exam_count = 0
        for e in exams:
            existing = await tgt.get(GeneratedExam, e.id)
            if not existing:
                tgt.add(GeneratedExam(
                    id=e.id,
                    user_id=e.user_id,
                    template_id=e.template_id,
                    document_id=e.document_id,
                    target_class_id=e.target_class_id,
                    source_type=e.source_type,
                    exam_json=e.exam_json,
                    exam_pdf_path=e.exam_pdf_path,
                    key_pdf_path=e.key_pdf_path,
                    llm_provider=e.llm_provider,
                    llm_model=e.llm_model,
                    created_by_role=e.created_by_role,
                    is_published=e.is_published,
                    schedule_start_at=e.schedule_start_at,
                    schedule_end_at=e.schedule_end_at,
                    retries_used=e.retries_used,
                    created_at=e.created_at,
                ))
                exam_count += 1
            else:
                existing.is_published = e.is_published
                existing.schedule_start_at = e.schedule_start_at
                existing.schedule_end_at = e.schedule_end_at
                existing.exam_json = e.exam_json
                existing.target_class_id = e.target_class_id
        await tgt.commit()
        stats["Quizzes / Exams"] = f"{exam_count} new / {len(exams)} total"
        logger.info("Generated Exams / Quizzes processed: %d", len(exams))

        # Step 6: Quiz Attempts (Student Performance & Scores)
        attempts = (await src.execute(select(QuizAttempt))).scalars().all()
        att_count = 0
        for a in attempts:
            existing = await tgt.get(QuizAttempt, a.id)
            if not existing:
                tgt.add(QuizAttempt(
                    id=a.id,
                    user_id=a.user_id,
                    exam_id=a.exam_id,
                    score=a.score,
                    total_marks=a.total_marks,
                    percentage=a.percentage,
                    time_spent_seconds=a.time_spent_seconds,
                    answers=a.answers,
                    created_at=a.created_at,
                ))
                att_count += 1
        await tgt.commit()
        stats["Student Quiz Attempts"] = f"{att_count} new / {len(attempts)} total"
        logger.info("Student Quiz Attempts processed: %d", len(attempts))

    await src_engine.dispose()
    await tgt_engine.dispose()

    logger.info("========================================")
    logger.info("   MIGRATION COMPLETED SUCCESSFULLY!    ")
    logger.info("========================================")
    for category, detail in stats.items():
        logger.info("  * %-24s : %s", category, detail)


def main():
    parser = argparse.ArgumentParser(description="Migrate local SQLite data to Supabase PostgreSQL.")
    parser.add_argument(
        "--target",
        "-t",
        default=os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL"),
        help="Target Supabase connection string (URI)",
    )
    parser.add_argument(
        "--sqlite",
        "-s",
        default="./examgen.db",
        help="Path to local sqlite db file (default: ./examgen.db)",
    )
    args = parser.parse_args()

    target = args.target
    if not target or target.startswith("sqlite"):
        print("\n[!] Error: Please provide your Supabase target connection string via --target.")
        print("    Example: python migrate_to_supabase.py --target \"postgresql://postgres.xxxx:pw@aws-0-xxxx.pooler.supabase.com:5432/postgres\"\n")
        sys.exit(1)

    if not os.path.exists(args.sqlite):
        print(f"\n[!] Error: SQLite database '{args.sqlite}' not found.\n")
        sys.exit(1)

    asyncio.run(migrate(args.sqlite, target))


if __name__ == "__main__":
    main()
