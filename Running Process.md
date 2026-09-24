# 🕉️ Gurukul AI — Running Process & Access Handbook

> **Institutional Examination & Assessment Sanctuary**  
> Complete deployment, background execution processes, database specifications, and institutional credentials guide.

---

## 🏛️ System Architecture & Network Topology

| Component | Technology | Listening Host & Port | LAN Endpoint |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | Next.js 16 (React 19, Webpack) | `0.0.0.0:3000` | `http://<SERVER_IP>:3000` |
| **Backend AI Microservice** | FastAPI, Uvicorn, Python 3.10/3.12 | `0.0.0.0:8000` | `http://<SERVER_IP>:8000` |
| **Database Engine** | PostgreSQL 14.24 (Ubuntu) | `127.0.0.1:5432` | Local Unix Socket / Loopback |
| **API Interactive Docs** | Swagger UI (FastAPI OpenAPI) | `0.0.0.0:8000` | `http://<SERVER_IP>:8000/docs` |

---

## 🔑 Institutional Credentials Roster

All accounts are cryptographically hashed using **Bcrypt** and permanently seeded in PostgreSQL:

| Role | Username / Login Identifier | Password | Permissions & Available Modules |
| :--- | :--- | :--- | :--- |
| 👑 **Chief Admin** | `Admin_DSVV01@dsvv.ac.in` | `OmBhBS@123` | Institutional dashboard, batch roster, quiz publishing, class analytics, template governance |
| 📜 **Teacher** | `teacher@gurukul.local` | `teacher123` | AI paper synthesis (*Vidya / Rachna*), Granthagar RAG syllabus upload, custom blueprints, paper export (PDF/DOCX) |
| 🎯 **Student (Shishya)** | Scholar ID: **`2410852`** *(or `student@gurukul.local`)* | `student@dsvv123` | Student Arena (*Aashram*), timed examinations, interactive dual-column match node canvas, instant AI evaluation, attempt history review |

---

## 🐘 Database Configuration (PostgreSQL 14)

The platform runs on a **100% local Linux PostgreSQL 14** instance, completely decoupled from external cloud outages:

- **Cluster**: `14/main`
- **Port**: `5432`
- **Database Name**: `gurukul_db`
- **Database User**: `gurukul_user`
- **Database Password**: `gurukul123`
- **Async Connection URL**: `postgresql+asyncpg://gurukul_user:gurukul123@localhost:5432/gurukul_db`
- **Sync Connection URL**: `postgresql://gurukul_user:gurukul123@localhost:5432/gurukul_db`

### What is Persistently Saved in PostgreSQL:
1. **Question Papers (`generated_exams`)**: Full exam papers, sections, marks, Bloom taxonomy levels, and answer keys.
2. **Syllabus & RAG Documents (`documents` & `document_chunks`)**: Uploaded PDFs, text chunks, and embedding vectors.
3. **Examination Blueprints (`templates`)**: Subject configurations, section weightage, and difficulty blueprints.
4. **Student Attempts & Scores (`quiz_attempts`)**: Student answers, time taken, percentage scores, and AI semantic evaluation rationales.
5. **Class Groups & Batches (`classes`)**: BCA 1st Year, BCA 2nd Year, MSc Computer Science.

---

## 🚀 Step-by-Step Running Process on Linux Server

### 1. Database Initialization & Seeding (Run Once)
```bash
cd ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/
source .venv/bin/activate
cd backend
# Execute the standalone database table builder and seeder
python3 seed_postgres.py
```

---

### 2. Running the Backend Service

#### Option A: Foreground Mode (For live debugging & logs)
```bash
cd ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/
source .venv/bin/activate
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Option B: Background Daemon Mode (Keeps running 24/7 even if SSH is closed)
```bash
cd ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/
source .venv/bin/activate
cd backend
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

---

### 3. Running the Frontend Portal

#### Option A: Foreground Mode
```bash
cd ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/
source .venv/bin/activate
cd frontend
npm run dev
```

#### Option B: Background Daemon Mode (Keeps running 24/7 even if SSH is closed)
```bash
cd ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/
source .venv/bin/activate
cd frontend
nohup npm run dev > frontend.log 2>&1 &
```

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)
```ini
# ── App ──────────────────────────────────────────
APP_ENV=development
DEBUG=true

# ── 100% Local SQLite Database ───────────────────
DATABASE_URL=sqlite+aiosqlite:///./examgen.db
SYNC_DATABASE_URL=sqlite:///./examgen.db

# ── Redis ────────────────────────────────────────
REDIS_URL=redis://:redis_secret@localhost:6379/0

# ✨ LLM 
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=models/gemini-3.5-flash
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openrouter/auto
OLLAMA_MODEL=qwen3.5:latest
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

# ── Rate limiting ─────────────────────────────────
LLM_RATE_LIMIT_PER_MIN=10
LLM_MAX_RETRIES=2

```

### Frontend (`frontend/.env.local`)
```ini
# Must match your server's current LAN IP address without trailing slash
NEXT_PUBLIC_API_URL=http://192.160.108.158:8000
```

---

## 🛡️ Firewall & Network Commands

If devices on the Wi-Fi or lab LAN cannot connect, open ports in Ubuntu UFW:

```bash
# Allow Backend and Frontend ports
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw reload
```

---

## 🔍 Process Monitoring & Maintenance

### Check Listening Ports
```bash
# Verify both 8000 and 3000 are actively listening
sudo ss -tlpn | grep -E '8000|3000|5432'
# OR
sudo fuser 8000/tcp 3000/tcp
```

### Watch Live Application Logs
```bash
# Backend Live Output
tail -f ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/backend/backend.log

# Frontend Live Output
tail -f ~/Desktop/"sdc students projects"/yashvardhan/gurukul-exam-generator/frontend/frontend.log
```

### Stop All Services
```bash
# Gracefully kill backend and frontend processes
sudo fuser -k 8000/tcp 3000/tcp 2>/dev/null || true
pkill -f uvicorn 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
```

---
*Created for Gurukul AI Institutional Examination Platform.*
