import sqlite3

conn = sqlite3.connect('examgen.db')
cur = conn.cursor()

columns = [row[1] for row in cur.execute('PRAGMA table_info(users)').fetchall()]
print("Current columns in users:", columns)

if 'role' not in columns:
    cur.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'teacher'")
    conn.commit()
    print("Added role column to users table.")

exam_cols = [row[1] for row in cur.execute('PRAGMA table_info(generated_exams)').fetchall()]
print("Current columns in generated_exams:", exam_cols)

if 'created_by_role' not in exam_cols:
    cur.execute("ALTER TABLE generated_exams ADD COLUMN created_by_role TEXT DEFAULT 'teacher'")
    conn.commit()
    print("Added created_by_role column to generated_exams table.")

if 'is_published' not in exam_cols:
    cur.execute("ALTER TABLE generated_exams ADD COLUMN is_published BOOLEAN DEFAULT 0")
    conn.commit()
    print("Added is_published column to generated_exams table.")

conn.close()
