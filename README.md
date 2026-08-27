# 🕉️ Gurukul AI Exam Generator & Assessment Sanctuary
> *"विद्या ददाति विनयम्"* — Knowledge bestows humility, humility brings worthiness.

A full-stack, institutional-grade AI Examination and Assessment platform designed for schools, universities, and educators worldwide. Built on a privacy-first, free, and open-source architecture supporting **Teacher Paper Generation**, **Student Quiz Arena**, and **Admin Institutional Analytics**.

---

## 🏛️ Ecosystem Overview

```
                                  ┌───────────────────────────────┐
                                  │      Gurukul Web Portal       │
                                  │       (Next.js + React)       │
                                  │             :3000             │
                                  └───────────────┬───────────────┘
                                                  │
                      ┌───────────────────────────┼───────────────────────────┐
                      ▼                           ▼                           ▼
        ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
        │     👑 Admin Sanctuary    │ │     📜 Teacher Panel      │ │     🎯 Student Arena      │
        │ • Institutional Rosters   │ │ • AI Exam Generation      │ │ • Interactive Test Arena  │
        │ • 7-Digit Scholar IDs     │ │ • Custom Blueprint Engine │ │ • Live Timer & Scoring    │
        │ • Class-Wise Analytics    │ │ • RAG Syllabus Ingestion  │ │ • AI Semantic Grading     │
        │ • Student Deep-Dive Rpt   │ │ • Multi-Format Export     │ │ • Persistent Breakdown    │
        └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
                                                  │
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │     FastAPI AI Microservice   │
                                  │       (Python 3.11/3.12)      │
                                  │             :8000             │
                                  └───────────────┬───────────────┘
                                                  │
                      ┌───────────────────────────┼───────────────────────────┐
                      ▼                           ▼                           ▼
        ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
        │       Database & Cache    │ │       LLM Engine Suite    │ │      Semantic Search      │
        │ • SQLite / PostgreSQL     │ │ • Google Gemini 1.5/2.5   │ │ • SearXNG Search Engine   │
        │ • SQLAlchemy (Async)      │ │ • Groq (Llama 3.3 70B)    │ │ • Document Chunk Embeds   │
        │ • Redis Cache             │ │ • Local Ollama Models     │ │   (HuggingFace MiniLM)    │
        └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

---

## ✨ Key Features & Current Progress

### 👑 1. Admin Sanctuary & Institutional Governance
- **Role Isolation**: Strictly separated Admin and Teacher template stores and workflows.
- **Dedicated Admin Authentication**: Secure institutional access via `Admin_DSVV01`.
- **Targeted Quiz Deployment**: Assign exams and quizzes directly to specific classes/courses.
- **Student Performance Hub**: Monitor class average mastery, completion rates, and individual report cards.

### 📜 2. Teacher Panel & Offline Paper Generator
- **AI Paper Generation (Vidya / Rachna)**: Generate rigorous, curriculum-aligned exam papers with customizable marks distributions and sections (MCQs, True/False, Short Answer, Long Answer, Case Studies).
- **Template Blueprint Builder**: Create reusable exam blueprints with custom section weightage and Bloom's taxonomy difficulty levels.
- **RAG Syllabus Ingestion (Granthagar)**: Upload course syllabus PDFs or fetch web curricula to ground question generation in authentic material.
- **Rich Text & KaTeX Math Editor**: Edit questions, diagrams, formulas, and spreadsheet cell references (`$A$1`, `E10`) with live KaTeX rendering.
- **Multi-Format Export**: One-click download as PDF, Word (.docx), or Markdown.

### 🎯 3. Student Arena (Aashram) & AI Answer Evaluation
- **Interactive Quiz Player**: Clean, distraction-free test-taking arena with live countdown timers and progress tracking.
- **AI Semantic Answer Evaluation**: Automatic grading of fill-in-the-blanks and one-word answers using AI semantic comparison (e.g. recognizing equivalent phrasing or spelling variations).
- **Detailed Question Breakdown & Review**: Question-by-question review highlighting:
  - 🟢 **Correct Answer** with full option text and KaTeX formulas.
  - 🔴 **Student's Selection** with instantaneous correctness indicators.
  - ✨ **AI Evaluation Rationale**: Clear explanations showing why marks were awarded.
- **Persistent Attempt History**: Students can inspect past exam breakdowns anytime from their dashboard.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (Turbopack, App Router), React 19, TypeScript, Lucide Icons, KaTeX MathText |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (Async), Pydantic v2, Uvicorn |
| **AI / LLM** | Google Gemini (1.5 Flash / 2.5 Flash), Groq (Llama 3.3 70B), Ollama (Local) |
| **Embeddings & Search** | SentenceTransformers (`all-MiniLM-L6-v2`), SearXNG, PyPDF |
| **Database & Cache** | SQLite (development) / PostgreSQL with pgvector (production), Redis |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** & `npm`
- Free API Key for **Google Gemini** ([Google AI Studio](https://aistudio.google.com)) or **Groq** ([Groq Console](https://console.groq.com))

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # Mac / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your API key:
```ini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=models/gemini-1.5-flash
```

Start the backend server:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
API Documentation: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local

# Start development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Default Portals & Roles

| Role | Access URL | Description | Default Credentials |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | `/admin` | Institutional governance & class reports | `Admin_DSVV01` / `OmBhBS@123` |
| 📜 **Teacher** | `/teacher` | Offline paper creator (open registration) | Sign up freely at `/register` |
| 🎯 **Student** | `/student` | Quiz arena & attempt breakdown review | 7-digit Scholar ID / `student@dsvv123` |

---

## 🗺️ Future Roadmap

- [x] Multi-role isolation (Admin / Teacher / Student)
- [x] Multi-LLM provider switching (Gemini, Groq, Ollama)
- [x] KaTeX mathematical formula rendering & Excel syntax safety
- [x] AI Semantic answer grading for subjective and fill-in questions
- [x] Question-by-question breakdown & attempt history viewer
- [ ] **Class/Course Hierarchy (`ClassGroup`)**: Full batch management and class-targeted exam publishing
- [ ] **7-Digit Scholar ID Governance**: Admin-provisioned roster with batch CSV import
- [ ] **Class-Wise Analytics Dashboard**: Class average mastery % and printable student report cards
- [ ] **Automated OMR Sheet Generation & Camera Scanner**: AI grading of physical paper answer sheets
- [ ] **Multilingual Support**: Native generation in Sanskrit, Hindi, and regional languages

---

## 📜 License & Acknowledgements

Developed with reverence to traditional pedagogical values and modern AI engineering.  
Open-source under the **MIT License**.
