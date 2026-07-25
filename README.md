# AI-Powered Customer Complaint Management System

An intelligent complaint intake and management system built for the pharmaceutical manufacturing industry. It uses a LangGraph AI agent to automatically extract structured data from complaint documents and populate a QMS-ready form — eliminating manual data entry and accelerating complaint triage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Redux Toolkit |
| State Management | @reduxjs/toolkit + react-redux |
| HTTP Client | Axios |
| File Upload | react-dropzone |
| Backend | Python + FastAPI |
| AI Agent Framework | LangGraph (StateGraph) |
| LLM | Groq API — `gemma2-9b-it` (primary), `llama-3.3-70b-versatile` (secondary) |
| Database | PostgreSQL via SQLAlchemy ORM |
| Font | Google Inter |

---

## Features

**Core**
- Two-panel UI: AI Intake Assistant (right) + Complaint Form (left)
- Drag-and-drop document upload — supports PDF, DOCX, TXT, EML (max 10MB)
- Paste complaint text or email directly into the assistant
- AI auto-populates all 14 form fields from the uploaded content
- Animated extraction progress bar with live status messages
- AI chat assistant — user can say "change the quantity to 500 tablets" and the form field updates automatically
- Save complaints to PostgreSQL database
- View all saved complaints in a sortable table

**Bonus Features**
- **Complaint Completeness Checker** — shows a live % score based on mandatory fields filled; lists missing fields in red
- **Duplicate Detection** — checks DB for same batch number + product before saving; shows a warning modal with the existing complaint ID
- **CAPA + Risk Classification** — AI generates root cause hypothesis, risk type (Patient Safety / Product Quality / Regulatory Compliance), and corrective action recommendations
- **AI Summary** — auto-generated 2-sentence executive summary stored with every complaint

---

## Project Structure

```
aivoa-complaint-system/
├── backend/
│   ├── main.py                  ← FastAPI app + CORS setup
│   ├── database.py              ← SQLAlchemy engine + session
│   ├── .env.example             ← Environment variable template
│   ├── models/
│   │   └── complaint.py         ← SQLAlchemy Complaint model
│   ├── routers/
│   │   └── complaints.py        ← All API route handlers
│   ├── agents/
│   │   └── complaint_agent.py   ← LangGraph StateGraph agent
│   └── services/
│       └── extraction.py        ← PDF/text parsing helpers
├── frontend/
│   ├── src/
│   │   ├── index.js             ← Redux Provider wraps App
│   │   ├── App.js               ← Routes
│   │   ├── store/
│   │   │   ├── index.js         ← Redux store
│   │   │   └── complaintSlice.js← All form fields + UI state
│   │   ├── components/
│   │   │   ├── ComplaintForm.jsx ← Left panel (4 form sections)
│   │   │   ├── AIAssistant.jsx  ← Right panel (upload + chat)
│   │   │   ├── ComplaintsList.jsx← Saved complaints table
│   │   │   └── Navbar.jsx
│   │   └── services/
│   │       └── api.js           ← Axios API calls
├── sample_complaints/
│   ├── complaint1.txt           ← Demo: Metformin color variation (Moderate)
│   └── complaint2.txt           ← Demo: Amoxicillin contamination (Critical)
├── .gitignore
└── README.md
```

---

## LangGraph Agent Architecture

The core of this system is a **LangGraph StateGraph** — a directed graph where each node is a Python function that performs one step of AI reasoning. State flows through every node like a shared data store that each function can read from and write to.

### Agent State

```python
class AgentState(TypedDict):
    raw_text: str           # Original complaint text or extracted document content
    extracted_fields: dict  # All structured form fields extracted by the LLM
    needs_retry: bool       # True if mandatory fields are missing after extraction
    retry_count: int        # Prevents infinite retry loops (max 2 retries)
    risk_assessment: dict   # severity, priority, risk_type, root_cause_hypothesis
    ai_summary: str         # 2-sentence executive summary for the complaint record
    error: Optional[str]    # Error message if a node fails
```

### Nodes

**1. `parse_document`**
Receives the raw input (uploaded file content or pasted text). Cleans whitespace and encoding issues. Stores the cleaned text in `state["raw_text"]` for downstream nodes.

**2. `extract_fields`**
Calls Groq `gemma2-9b-it` with a structured prompt instructing the model to return a JSON object containing all 11 complaint fields (product name, batch number, customer name, dates, quantity, complaint type, description, etc.). Parses the JSON response and stores it in `state["extracted_fields"]`. If the three mandatory fields — `product_name`, `batch_number`, `description` — are null, sets `state["needs_retry"] = True`.

**3. `validate_fields`**
Checks the extracted fields for completeness. If `needs_retry` is True and `retry_count < 2`, increments the retry count and keeps `needs_retry = True`. If the extraction is complete (or max retries reached), clears the retry flag so the graph can move forward.

**4. `assess_risk`**
Calls Groq again with the extracted complaint details. The LLM acts as a pharma QMS expert and returns a JSON object containing: severity level (Minor/Moderate/Major/Critical), priority (Low/Medium/High/Critical), risk type, a one-sentence root cause hypothesis, and a 2-sentence executive summary. This data populates the severity/priority dropdowns and the `ai_summary` field stored in the database.

### Graph Flow

```
START
  └── parse_document
        └── extract_fields
              └── validate_fields
                    ├── [needs_retry AND retry_count < 2] ──► extract_fields (retry)
                    └── [complete OR max retries reached] ──► assess_risk ──► END
```

The **conditional edge** after `validate_fields` is what makes this a real agent graph. Instead of a linear API call chain, the graph can loop back to `extract_fields` when the LLM returns incomplete data — mimicking human judgment ("that didn't look right, let me try again").

### Why `gemma2-9b-it`?

It is available on Groq's free tier with very low latency (Groq runs on custom LPU hardware). For structured JSON extraction from semi-structured text like complaint emails, a 9B parameter instruction-tuned model is sufficient and significantly faster than larger models. `llama-3.3-70b-versatile` is used as a fallback for the chat assistant, where richer context handling matters more than extraction speed.

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/extract` | Upload file or paste text → run LangGraph agent → return extracted fields |
| POST | `/api/complaints` | Save a completed complaint to the database |
| GET | `/api/complaints` | Fetch all saved complaints |
| POST | `/api/chat` | AI chat assistant — answer questions about the current complaint |
| GET | `/api/complaints/check-duplicate` | Check if same batch + product already exists in DB |
| POST | `/api/analyze` | Generate CAPA recommendations and risk classification |

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (or a free cloud instance at [neon.tech](https://neon.tech))
- Groq API key — free at [console.groq.com](https://console.groq.com)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/aivoa-complaint-system.git
cd aivoa-complaint-system
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv pydantic \
            langgraph langchain langchain-groq pypdf python-multipart

cp .env.example .env
# Open .env and fill in your GROQ_API_KEY and DATABASE_URL
```

**.env.example contents:**
```
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/aivoa_complaints
```

## Database Setup

This project uses **PostgreSQL** (via Neon.tech) by default.

> **No PostgreSQL?** No problem — if `DATABASE_URL` is not set in `.env`, 
> the app automatically falls back to **SQLite** (zero setup required).

## Free PostgreSQL Setup (2 minutes)
1. Go to neon.tech → Sign up free
2. Create new project → Copy connection string
3. Paste in .env as DATABASE_URL

```bash
uvicorn main:app --reload
# API runs at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm install @reduxjs/toolkit react-redux axios react-dropzone react-router-dom
npm start
# App runs at http://localhost:3000
```

### 4. Test with sample complaints

Two sample complaint files are included in `sample_complaints/`. Upload either one via the AI Intake Assistant panel to see the full extraction flow:

- `complaint1.txt` — Metformin color variation complaint (Moderate severity)
- `complaint2.txt` — Amoxicillin foreign particle contamination (Critical severity, patient safety risk)

---

## Database Schema

Table: `complaints`

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | Auto-increment |
| complaint_source | String | Email / Phone / Portal |
| customer_name | String | |
| product_name | String | e.g. Metformin 500mg |
| product_strength | String | e.g. 500mg, Grade A |
| batch_number | String | e.g. BT-2024-0892 |
| manufacturing_date | Date | |
| expiry_date | Date | |
| quantity_affected | Float | |
| quantity_unit | String | kg / tablets |
| complaint_type | String | e.g. Color variation, Foreign particle |
| complaint_date | Date | |
| description | Text | Full complaint description |
| severity | String | Minor / Moderate / Major / Critical |
| priority | String | Low / Medium / High / Critical |
| status | String | Default: "Pending Triage" |
| ai_summary | Text | AI-generated 2-sentence summary |
| created_at | DateTime | Auto-set on insert |

---

## Key Design Decisions

**Why LangGraph instead of a single LLM call?**
A single prompt-to-JSON call has no error recovery. LangGraph lets the agent detect incomplete extraction and retry with a refined prompt — without the caller knowing it happened. It also cleanly separates concerns: `extract_fields` knows nothing about risk assessment, and `assess_risk` knows nothing about raw document parsing. Each node is independently testable.

**Why a retry loop and not just a bigger prompt?**
Larger prompts on fast/small models tend to hallucinate field values rather than return null. It is more reliable to let the model attempt extraction, validate the output programmatically, and re-prompt with a stricter instruction on retry than to try to prevent hallucination through prompt engineering alone.

**Why Redux for frontend state?**
The form and the AI assistant are in separate components but must stay in sync. When the AI chat receives an edit instruction ("change the quantity"), it dispatches a single `updateField` action and the form re-renders immediately — no prop drilling, no local state synchronization issues.

**Why Groq instead of OpenAI?**
Groq's LPU inference is significantly faster for this use case and the free tier is sufficient for a demo. Extraction latency on `gemma2-9b-it` via Groq is typically under 2 seconds, which keeps the UI progress bar feeling responsive.

---

## Pharma Domain Context

**QMS (Quality Management System):** A structured framework pharma manufacturers use to document processes and ensure FDA / WHO GMP regulatory compliance. Customer complaint management is a mandatory QMS module.

**Why batch numbers matter:** Every manufactured batch is traceable. A defective batch can be recalled by lot number without affecting other production runs.

**CAPA (Corrective and Preventive Action):** The formal investigation process after a quality failure — identifying root cause and implementing changes to prevent recurrence. Required under GMP regulations.

**Severity definitions used in this system:**

| Severity | Meaning |
|---|---|
| Critical | Potential patient safety risk — contamination, wrong drug, mislabeling |
| Major | Significant quality defect likely to affect efficacy |
| Moderate | Quality deviation unlikely to cause immediate patient harm |
| Minor | Cosmetic or labeling issue with no safety impact |

---

## Submission

- Submission form: https://forms.gle/HrZ2tzqsoxKiNe7B6
- Assignment by: AIVOA (aivoa.ai) — Round 1 Full Stack Developer Assessment
