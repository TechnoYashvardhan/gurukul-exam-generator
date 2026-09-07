import sqlite3
import json
import os

conn = sqlite3.connect('examgen.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

def escape_str(val):
    if val is None:
        return 'NULL'
    return "'" + str(val).replace("'", "''") + "'"

lines = []
lines.append('-- Gurukul AI SQLite -> Supabase PostgreSQL Data Migration Script')
lines.append('-- Run this in Supabase Dashboard -> SQL Editor')
lines.append('')
lines.append('BEGIN;')
lines.append('')

# Schema Tables Check
lines.append('''
-- 0. Ensure Tables & Columns exist
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    course TEXT NOT NULL,
    section TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    scholar_id TEXT UNIQUE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    hashed_pw TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    subject TEXT,
    grade TEXT,
    sha256_hash TEXT UNIQUE NOT NULL,
    page_count INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL DEFAULT 'upload',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding JSON,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    config JSON NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_exams (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    target_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL,
    exam_json JSON NOT NULL,
    exam_pdf_path TEXT,
    key_pdf_path TEXT,
    llm_provider TEXT,
    llm_model TEXT,
    created_by_role TEXT NOT NULL DEFAULT 'teacher',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_start_at TIMESTAMP WITH TIME ZONE,
    schedule_end_at TIMESTAMP WITH TIME ZONE,
    retries_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES generated_exams(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_marks INTEGER NOT NULL,
    percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    answers JSON NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
''')

# 1. Classes
classes = c.execute('SELECT * FROM classes').fetchall()
lines.append(f'-- 1. Classes ({len(classes)} rows)')
for r in classes:
    lines.append(
        f"INSERT INTO classes (id, name, course, section, created_at) "
        f"VALUES ({escape_str(r['id'])}, {escape_str(r['name'])}, {escape_str(r['course'])}, {escape_str(r['section'])}, {escape_str(r['created_at'])}) "
        f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, course = EXCLUDED.course, section = EXCLUDED.section;"
    )
lines.append('')

# 2. Users
users = c.execute('SELECT * FROM users').fetchall()
lines.append(f'-- 2. Users ({len(users)} rows)')
for r in users:
    cid = escape_str(r['class_id'])
    sid = escape_str(r['scholar_id'])
    fn = escape_str(r['full_name'])
    lines.append(
        f"INSERT INTO users (id, email, scholar_id, class_id, hashed_pw, full_name, role, is_active, created_at) "
        f"VALUES ({escape_str(r['id'])}, {escape_str(r['email'])}, {sid}, {cid}, {escape_str(r['hashed_pw'])}, {fn}, {escape_str(r['role'])}, {r['is_active']}, {escape_str(r['created_at'])}) "
        f"ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, scholar_id = EXCLUDED.scholar_id, class_id = EXCLUDED.class_id, hashed_pw = EXCLUDED.hashed_pw, full_name = EXCLUDED.full_name, role = EXCLUDED.role;"
    )
lines.append('')

# 3. Templates
templates = c.execute('SELECT * FROM templates').fetchall()
lines.append(f'-- 3. Templates ({len(templates)} rows)')
for r in templates:
    cfg = escape_str(r['config'])
    lines.append(
        f"INSERT INTO templates (id, user_id, name, subject, grade, config, created_at, updated_at) "
        f"VALUES ({escape_str(r['id'])}, {escape_str(r['user_id'])}, {escape_str(r['name'])}, {escape_str(r['subject'])}, {escape_str(r['grade'])}, {cfg}::json, {escape_str(r['created_at'])}, {escape_str(r['updated_at'])}) "
        f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, subject = EXCLUDED.subject, grade = EXCLUDED.grade, config = EXCLUDED.config;"
    )
lines.append('')

# 4. Generated Exams
exams = c.execute('SELECT * FROM generated_exams').fetchall()
lines.append(f'-- 4. Generated Exams ({len(exams)} rows)')
for r in exams:
    tid = escape_str(r['template_id'])
    did = escape_str(r['document_id'])
    tcid = escape_str(r['target_class_id'])
    ej = escape_str(r['exam_json'])
    epdf = escape_str(r['exam_pdf_path'])
    kpdf = escape_str(r['key_pdf_path'])
    llmp = escape_str(r['llm_provider'])
    llmm = escape_str(r['llm_model'])
    cbr = escape_str(r['created_by_role'])
    ip = 'TRUE' if r['is_published'] else 'FALSE'
    s_start = escape_str(r['schedule_start_at'])
    s_end = escape_str(r['schedule_end_at'])
    ru = r['retries_used'] if r['retries_used'] is not None else 0
    lines.append(
        f"INSERT INTO generated_exams (id, user_id, template_id, document_id, target_class_id, source_type, exam_json, exam_pdf_path, key_pdf_path, llm_provider, llm_model, created_by_role, is_published, schedule_start_at, schedule_end_at, retries_used, created_at) "
        f"VALUES ({escape_str(r['id'])}, {escape_str(r['user_id'])}, {tid}, {did}, {tcid}, {escape_str(r['source_type'])}, {ej}::json, {epdf}, {kpdf}, {llmp}, {llmm}, {cbr}, {ip}, {s_start}, {s_end}, {ru}, {escape_str(r['created_at'])}) "
        f"ON CONFLICT (id) DO UPDATE SET exam_json = EXCLUDED.exam_json, target_class_id = EXCLUDED.target_class_id, is_published = EXCLUDED.is_published, schedule_start_at = EXCLUDED.schedule_start_at, schedule_end_at = EXCLUDED.schedule_end_at;"
    )
lines.append('')

# 5. Quiz Attempts
attempts = c.execute('SELECT * FROM quiz_attempts').fetchall()
lines.append(f'-- 5. Quiz Attempts ({len(attempts)} rows)')
for r in attempts:
    ans = escape_str(r['answers'])
    lines.append(
        f"INSERT INTO quiz_attempts (id, user_id, exam_id, score, total_marks, percentage, time_spent_seconds, answers, created_at) "
        f"VALUES ({escape_str(r['id'])}, {escape_str(r['user_id'])}, {escape_str(r['exam_id'])}, {r['score']}, {r['total_marks']}, {r['percentage']}, {r['time_spent_seconds']}, {ans}::json, {escape_str(r['created_at'])}) "
        f"ON CONFLICT (id) DO NOTHING;"
    )
lines.append('')

# 6. Document Chunks
chunks = c.execute('SELECT * FROM document_chunks').fetchall()
lines.append(f'-- 6. Document Chunks ({len(chunks)} rows)')
for r in chunks:
    emb = escape_str(r['embedding'])
    emb_expr = f"{emb}::json" if emb != 'NULL' else 'NULL'
    tc = r['token_count'] if r['token_count'] is not None else 'NULL'
    lines.append(
        f"INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding, token_count, created_at) "
        f"VALUES ({escape_str(r['id'])}, {escape_str(r['document_id'])}, {r['chunk_index']}, {escape_str(r['content'])}, {emb_expr}, {tc}, {escape_str(r['created_at'])}) "
        f"ON CONFLICT (id) DO NOTHING;"
    )
lines.append('')

lines.append('COMMIT;')

with open('migrate_data.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f"Successfully generated migrate_data.sql ({len(lines)} lines)")
