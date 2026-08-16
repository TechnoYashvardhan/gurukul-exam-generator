# 🎓 AI-Powered Exam Generator

A full-stack web application that lets teachers generate customized exam papers using AI. Built on a fully **free and open-source** stack.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose Stack                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Postgres │  │  Redis   │  │ SearXNG  │  │  FastAPI  │  │
│  │ +pgvector│  │ (cache)  │  │ (search) │  │ (backend) │  │
│  │  :5432   │  │  :6379   │  │  :8080   │  │  :8000    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────┘
              ▲
              │ (Phase 2+)
    ┌─────────────────────┐
    │  Next.js Frontend   │
    │       :3000         │
    └─────────────────────┘
```

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A free Groq API key (see below)

### Step 1 — Get a Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (no credit card required)
3. Navigate to **API Keys → Create API Key**
4. Copy the key — it starts with `gsk_`

**Free tier:** ~14,400 requests/day on Llama 3.3 70B · 6,000 tokens/minute

### Step 2 — Configure Environment

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set your key:
```
GROQ_API_KEY=gsk_your_actual_key_here
```

> The rest of the defaults work out of the box for local development.

### Step 3 — Start the Stack

```bash
# From the project root (where docker-compose.yml lives)
docker compose up -d
```

This spins up:
| Service | URL | Purpose |
|---------|-----|---------|
| FastAPI backend | http://localhost:8000 | API + LLM pipeline |
| API Docs (Swagger) | http://localhost:8000/docs | Interactive API explorer |
| SearXNG | http://localhost:8080 | Syllabus web search (Phase 3) |
| Postgres | localhost:5432 | Database + embeddings |
| Redis | localhost:6379 | Document cache |

Database migrations run automatically on backend startup.

### Step 4 — Test the Generation Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/generate/exam \
  -H "Content-Type: application/json" \
  -d @backend/tests/fixtures/sample_request.json | python -m json.tool
```

Or open **http://localhost:8000/docs** and try the `/generate/exam` endpoint interactively.

---

## Switching LLM Providers

Change one line in `backend/.env` — no code changes needed:

```bash
# Use Groq (default — fastest free option)
LLM_PROVIDER=groq

# Use Gemini 1.5 Flash (1,500 req/day free)
# Get key at: https://aistudio.google.com
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIza_your_key_here

# Use local Ollama (completely free, runs on your machine)
# Install: https://ollama.ai → then: ollama pull llama3.2
LLM_PROVIDER=ollama
```

Then restart the backend:
```bash
docker compose restart backend
```

---

## Development (without Docker)

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt

# Start Postgres+Redis+SearXNG only
docker compose up postgres redis searxng -d

# Copy env and set DATABASE_URL to use localhost
cp .env.example .env
# Edit .env: change postgres/redis hosts from service names to localhost

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

Tests use mock LLM clients — **no API key or database needed** to run the test suite.

---

## Project Structure

```
Question Paper Generator/
├── docker-compose.yml          # Full stack orchestration
├── searxng/
│   └── settings.yml            # SearXNG configuration
├── README.md
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── alembic.ini
    ├── pytest.ini
    ├── .env.example             # ← copy to .env and fill in keys
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │       └── 001_initial_schema.py
    ├── app/
    │   ├── main.py              # FastAPI app + logging
    │   ├── config.py            # pydantic-settings
    │   ├── database.py          # async SQLAlchemy engine
    │   ├── llm/
    │   │   ├── base.py          # Abstract LLMClient interface
    │   │   ├── groq_client.py   # Groq (Llama 3.3 70B)
    │   │   ├── gemini_client.py # Gemini 1.5 Flash
    │   │   ├── ollama_client.py # Local Ollama
    │   │   └── factory.py       # get_llm_client() — the single switch
    │   ├── models/
    │   │   └── db.py            # SQLAlchemy ORM (all 5 tables)
    │   ├── schemas/
    │   │   ├── template.py      # ExamTemplate, Section
    │   │   └── exam.py          # GeneratedExam, Question, MCQOption
    │   ├── services/
    │   │   └── exam_generator.py # Generation + validation + retry
    │   └── routers/
    │       └── generate.py      # POST /api/v1/generate/exam
    └── tests/
        ├── fixtures/
        │   └── sample_request.json
        └── test_generate.py
```

---

## API Reference

### `GET /api/v1/health`
Returns the configured LLM provider and model.

### `POST /api/v1/generate/exam`
Generate a complete exam paper from a template + syllabus text.

**Request body:**
```json
{
  "template": {
    "subject": "Physics",
    "grade": "Grade 10",
    "difficulty": "medium",
    "total_marks": 50,
    "duration_minutes": 120,
    "sections": [
      {
        "id": "s1",
        "title": "Section A — MCQ",
        "type": "mcq",
        "num_questions": 10,
        "marks_per_question": 1,
        "instructions": "Choose one answer."
      },
      {
        "id": "s2",
        "title": "Section B — Short Answer",
        "type": "short_answer",
        "num_questions": 8,
        "marks_per_question": 5,
        "instructions": "Answer in 3-5 sentences."
      }
    ]
  },
  "syllabus_text": "Your syllabus content here...",
  "source_type": "hardcoded"
}
```

**Question types:** `mcq` · `short_answer` · `long_answer` · `case_study`
**Difficulty levels:** `easy` · `medium` · `hard` · `extreme` (maps to Bloom's Taxonomy)

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Teacher accounts (auth in Phase 4) |
| `documents` | Uploaded PDFs + web-fetched syllabi (Phase 3) |
| `document_chunks` | Text chunks with 384-dim embeddings for RAG (Phase 3) |
| `templates` | Saved exam templates (Phase 2) |
| `generated_exams` | Validated LLM output + PDF paths (Phases 1–4) |

---

## Free Tier Limits Summary

| Provider | Free Limit | Key Required | Card Required |
|----------|-----------|--------------|---------------|
| **Groq** (Llama 3.3 70B) | 14,400 req/day · 6K tok/min | Yes | ❌ No |
| **Gemini** (1.5 Flash) | 1,500 req/day | Yes | ❌ No |
| **Ollama** (any model) | Unlimited (local) | ❌ No | ❌ No |

The built-in rate limiter (`LLM_RATE_LIMIT_PER_MIN=10`) prevents accidental quota exhaustion during testing.

---

## Build Phases

| Phase | Status | Features |
|-------|--------|---------|
| **Phase 1** | ✅ Complete | Backend AI proof of concept — LLM pipeline, validation, retry, Docker stack |
| **Phase 2** | 🔜 Next | Template Builder frontend (Next.js + TypeScript + Tailwind) |
| **Phase 3** | ⏳ | PDF ingestion → chunking → embeddings → pgvector RAG + SearXNG web fetch |
| **Phase 4** | ⏳ | PDF output generation, Library tab UI, JWT auth, multi-tenancy |

---

## Troubleshooting

**Backend fails to start:** Check `docker compose logs backend` — usually a missing `GROQ_API_KEY` or Postgres not ready yet.

**`alembic upgrade head` fails:** Make sure Postgres is healthy: `docker compose ps postgres`

**LLM returns invalid JSON:** This is expected occasionally — the retry logic handles it (up to 2 retries). Check logs: `docker compose logs backend -f`

**SearXNG returns no results:** The first startup can take 30s. Visit http://localhost:8080 to verify it's running.
