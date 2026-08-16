"""
SQLAlchemy ORM models — all 5 tables defined up front.
Phases 1-4 will progressively use more of these models.
"""

import uuid
from datetime import datetime


from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    hashed_pw: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    documents: Mapped[list["Document"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    templates: Mapped[list["Template"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    generated_exams: Mapped[list["GeneratedExam"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Documents (uploaded PDFs or web-fetched syllabi)
# ─────────────────────────────────────────────────────────────────────────────
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str | None] = mapped_column(Text, nullable=True)
    grade: Mapped[str | None] = mapped_column(Text, nullable=True)
    # SHA-256 hash of the file — used for deduplication (Phase 3)
    sha256_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # pending | processing | ready | error
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    # upload | web_fetch
    source: Mapped[str] = mapped_column(Text, default="upload", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Document Chunks (with embeddings for pgvector similarity search)
# ─────────────────────────────────────────────────────────────────────────────
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # bge-small-en-v1.5 → 384 dimensions
    embedding: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    document: Mapped["Document"] = relationship(back_populates="chunks")


# ─────────────────────────────────────────────────────────────────────────────
# Exam Templates
# ─────────────────────────────────────────────────────────────────────────────
class Template(Base):
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str | None] = mapped_column(Text, nullable=True)
    grade: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Full template JSON blob — see schemas/template.py for shape
    config: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="templates")
    generated_exams: Mapped[list["GeneratedExam"]] = relationship(
        back_populates="template"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Generated Exams (persisted output from the LLM pipeline)
# ─────────────────────────────────────────────────────────────────────────────
class GeneratedExam(Base):
    __tablename__ = "generated_exams"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    # document | web_fetch | hardcoded
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    # Full validated exam JSON
    exam_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Paths to generated PDFs (Phase 4)
    exam_pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_provider: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    retries_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="generated_exams")
    template: Mapped["Template | None"] = relationship(back_populates="generated_exams")
    document: Mapped["Document | None"] = relationship()
