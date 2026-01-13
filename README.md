# TalentGraph

AI-powered recruitment platform built with **Angular 19** and **LangGraph Agent Backend**. Features intelligent candidate screening with streaming AI conversations, automated resume analysis, and comprehensive recruiter dashboard for talent management.

## 🎯 What's Inside

This repository demonstrates a complete AI-driven recruitment platform with three core layers:

1. **AI Recruitment Agent (LangGraph)**: Sophisticated agent backend with intelligent routing, action triggers, and performance optimizations **([see full architecture →](docs/AGENT_ARCHITECTURE.md))**
2. **Candidate Management**: Resume parsing, scoring system, and multi-job application tracking with automated screening
3. **Recruiter Dashboard**: Comprehensive job posting management, candidate pipeline, and AI-powered interview assistant

## 🧠 Backend Agent Architecture (v3.0 - January 2026)

The recruitment intelligence is powered by a **production-ready LangGraph agent** with advanced features:

- **StateGraph orchestration** with **28 specialized nodes** organized in 5 categories:
  - Entry & Logging (2 nodes: state_logger_start, state_logger_end)
  - Action Trigger System (6 nodes: trigger_checker, selection_resolver, question/email/comparison generators, direct_response)
  - Multi-Level Detection ✨ NEW (7 nodes: silent_load_detector, pending_action_resolver, job_mention_checker, candidate_detector, job_list_checker, candidate_filter, talk_with_state)
  - Context Management (4 nodes: silent_loader_checker, context_resolver, context_loader, context_enricher)
  - Intent & Domain Routing (9 nodes: domain_checker, intent_checker, job/resume handlers, resume_matcher, general_talk, llm_node, etc.)
- **14 conditional routes** for intelligent flow control:
  - post_trigger_route, trigger_route, action_generator_route
  - silent_load_detector_route ✨ NEW
  - job_mention_route ✨ NEW, candidate_detector_route ✨ NEW, job_list_route ✨ NEW
  - silent_loader_route, context_resolver_route
  - domain_route, context_loader_route, intent_route
- **Multi-model strategy**: GPT-4o-mini for conversations + Claude Haiku for fast classification (~50-100ms)
- **Performance optimizations v3.0**:
  - ⚡ Multi-level detection (7 layers of detection nodes, < 5ms each)
  - 🚀 **Fast Path v3.0** - context_resolver → talk_with_state (< 10ms, skips domain_checker + context_loader)
  - 🎯 Action triggers (< 5ms detection - frontend explicit 0ms, heuristic ~1ms)
  - 🔇 Silent loading (~500ms one-time pre-load, then 0ms cached)
  - ⚡ Fast path general (~1ms + LLM, no DB queries)
  - 🔍 Fuzzy matching (30% threshold for jobs/candidates)
  - 💥 Conflict handling (candidate_detector + pending_action_resolver)
  - 📦 Context enricher in ALL paths before LLM (~0-6ms)
  - 💾 Smart cache invalidation (domain=hr_related forces reload)
- **PostgreSQL checkpointing** for conversation state persistence
- **SSE streaming** for real-time token-by-token responses

👉 **[Complete Backend Documentation →](docs/AGENT_ARCHITECTURE.md)** - Detailed technical guide covering:
- **5 Key Agent Flows**: Action Trigger, Silent Loading, Fast Path v3.0 (Early Detection), Fast Path General, Complete HR Path
- **28 node implementations** with detailed logic (7 new detection nodes in v3.0)
- **14 conditional routes** with decision logic tables
- **Multi-level detection system**: triggers → silent load → pending action → job mention → candidate → job list → context resolver
- Production safeguards (duplicate detection, conflict handling, fuzzy matching 30%, context isolation, error recovery)
- Performance metrics (< 5ms triggers, < 10ms fast path v3.0, ~500ms context load, ~1ms fast path general, ~962ms TTFT)
- API endpoints and deployment guide

## 🧑‍💼 User Roles

| Role | Capabilities | Routes |
|------|-------------|---------|
| **Recruiter** | AI agent chat, job CRUD, candidate review, resume analysis | `/recruiter`, `/job-crud`, `/recruiter-account` |
| **Candidate** | Job browsing, application submission, resume upload | `/candidate`, `/job/:jobId` |

## 🎓 Key Features

### AI Agent Chat System (LangGraph Backend)
- **Multi-threaded Conversations**: Each recruitment context maintains separate conversation threads
- **Streaming Responses**: Real-time SSE (Server-Sent Events) for ChatGPT-like experience
- **Context-Aware Intelligence**: Agent has access to jobs, candidates, and resumes for informed responses
- **Action Triggers**: Fast path for specific actions (generate questions, draft emails, compare candidates)
- **Smart Performance**: Silent loading, context caching, and intelligent routing (< 5ms trigger detection)
- **Subscription-based Limits**: Thread limits based on recruiter subscription level (1-20 threads)
- **Multi-language Support**: Automatic detection and response in Spanish, English, or French
- **Text-to-Speech**: Optional audio playback of AI responses for hands-free interaction
- **Session Persistence**: Thread history maintained across sessions with PostgreSQL checkpointing

### Candidate Screening
- **Resume Parsing**: Automated extraction of skills, experience, education, and certifications
- **Position Scoring**: AI-powered relevance scoring for job-candidate matching
- **Multi-job Tracking**: Candidates can apply to multiple positions with dedicated resumes
- **Thumb Up/Down**: Quick recruiter feedback system for candidate filtering

### Recruiter Dashboard
- **Job Management**: Full CRUD with salary ranges, requirements, and exam assignments
- **Candidate Pipeline**: Organized view of applicants per job with filtering
- **Resume Viewer**: In-app PDF viewer with candidate data overlay
- **Sync to Agent**: PostgreSQL synchronization for AI agent data access

### Job Posting System
- **Flexible Salary**: Hourly/weekly/monthly/yearly options with currency selection
- **Optional Exams**: Attach screening exams to job postings
- **Active/Inactive Toggle**: Control job visibility
- **Public Candidate View**: Dedicated pages for job applications

---

## 🧠 Advanced Features: LangGraph AI Agent Architecture

This platform integrates with a sophisticated **LangGraph-powered agent backend** that handles recruitment conversations with intelligent routing, action triggers, and performance optimizations:

### Agent Architecture Overview

```mermaid
sequenceDiagram
    participant R as Recruiter (Angular)
    participant F as Frontend
    participant B as LangGraph Backend
    participant DB as PostgreSQL
    participant LLM as LLM (GPT-4o-mini/Claude Haiku)

    R->>F: "Generate interview questions for Lucía Gómez"
    F->>B: POST /chat_agent/{threadId}/stream<br/>{message, recruiterId, max_threads, trigger}
    B->>B: Load thread state from PostgreSQL

    alt Action Trigger Detected
        B->>B: trigger_checker (< 5ms)
        B->>B: Detect language from message
        B->>B: question_generator
        B->>LLM: Generate personalized questions
    else Normal HR Query
        B->>B: domain_checker (Claude Haiku ~50ms)
        B->>DB: context_loader - Query jobs & resumes
        DB-->>B: Return data with job_name JOINs
        B->>B: intent_checker (GPT-4o-mini)
        alt Job Query
            B->>B: job_handler → resume_matcher
        else Resume Query
            B->>B: resume_handler (duplicate detection)
        else General Query
            B->>B: general_talk (format context)
        end
        B->>LLM: llm_response (streaming)
    else General Conversation
        B->>B: Fast path (no DB queries)
        B->>LLM: llm_response (streaming)
    end

    loop Stream chunks
        LLM-->>B: Response tokens
        B-->>F: SSE chunk
        F-->>R: Display in real-time
    end
    B->>DB: Save thread state
```

### LangGraph State Machine

The backend uses **LangGraph StateGraph** with hierarchical conditional routing:

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

# Define agent state
class HRState(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]

    # Recruiter context
    recruiter_id: str

    # Jobs
    job_id: str | None
    job_name: str | None
    available_jobs: List[Dict] | None

    # Resumes
    resumeId: str | None
    resume_name: str | None
    available_resumes: List[Dict] | None  # Includes job_name via JOIN
    duplicate_resumes: List[Dict] | None  # For disambiguation
    matched_resumes: List[Dict] | None    # Filtered by job_id

    # Routing & Detection
    domain: str | None           # "hr_related" | "general"
    user_intent: str | None      # "job" | "resume" | "general"
    language: str | None         # "es" | "en" | "fr"
    silent_load: bool | None     # Pre-loading flag
    action_trigger: str | None   # "questions" | "email" | "compare"

# Build graph with optimized routing
builder = StateGraph(HRState)

# Add nodes
builder.add_node("trigger_checker", trigger_checker)        # < 5ms
builder.add_node("silent_loader_checker", silent_loader_checker)
builder.add_node("domain_checker", domain_checker)          # Claude Haiku
builder.add_node("context_loader", context_loader)          # DB with cache
builder.add_node("intent_checker", intent_checker)          # GPT-4o-mini
builder.add_node("job_handler", job_handler)
builder.add_node("resume_handler", resume_handler)          # Duplicate detection
builder.add_node("resume_matcher", resume_matcher)
builder.add_node("general_talk", general_talk)              # Prompt builder
builder.add_node("question_generator", question_generator)  # NEW
builder.add_node("llm_response", llm_node)                  # Streaming

# Conditional routing
builder.add_conditional_edges("trigger_checker", trigger_route)
builder.add_conditional_edges("silent_loader_checker", silent_loader_route)
builder.add_conditional_edges("domain_checker", domain_route)
builder.add_conditional_edges("context_loader", context_loader_route)
builder.add_conditional_edges("intent_checker", intent_route)

# Entry point
builder.add_edge(START, "trigger_checker")

agent = builder.compile(checkpointer=checkpointer)
```

### Key Agent Capabilities

#### 1. Intelligent Context Loading
The agent loads recruiter-specific data with smart caching:

**Context Loader Strategy:**
```python
# Smart cache invalidation
if state.get("domain") == "hr_related":
    # Force reload - new candidates might exist
    load_from_db_with_joins()
elif state.get("available_jobs") and state.get("available_resumes"):
    # Use cache (0ms)
    return state
else:
    # First time
    load_from_db_with_joins()

# Optimized JOIN for job names
for resume in resumes:
    job_name = "Sin puesto asignado"
    if resume.jobRelated_id:
        job = db.query(Job).filter_by(job_id=resume.jobRelated_id).first()
        if job:
            job_name = job.name

    available_resumes.append({
        "resumeId": resume.resumeId,
        "name": resume.name,
        "jobRelated_id": resume.jobRelated_id,
        "job_name": job_name,  # ✨ Loaded via JOIN
        "scoreToPosition": resume.scoreToPosition,
        "thumbUp": resume.thumbUp
    })
```

**Performance:**
- First load: ~500ms (DB queries + JOINs)
- Cached: 0ms
- Invalidated reload: ~500ms

#### 2. Action Triggers (< 5ms detection)
Fast path for specific user actions:

**Supported Triggers:**
```python
# Frontend can send explicit trigger
{
  "message": "Generate interview questions",
  "trigger": "questions"  # 0ms - immediate routing
}

# Or heuristic keyword detection (~1ms)
KEYWORDS = {
    "questions": [
        "preguntas de entrevista",  # ES
        "interview questions",       # EN
        "questions d'entretien"      # FR
    ],
    "email": ["escribe email", "send email", "envoyer mail"],
    "compare": ["compara candidatos", "compare candidates", "comparer candidats"]
}
```

**Example - Question Generator:**
```
User: "Generate interview questions for Lucía Gómez"

Flow:
1. trigger_checker detects "questions" (< 1ms)
2. Loads language from message (Spanish)
3. question_generator:
   - Loads full resume data
   - Loads related job if exists
   - Prepares prompt with:
     * Work experience
     * Skills
     * Education
     * Certifications
4. llm_response generates personalized questions in Spanish
5. Returns: Technical, situational, and motivational questions
```

#### 3. Thread-based Conversation Management
- **Unique Thread IDs**: `${recruiterUID}_${timestamp}_${random}`
- **State Persistence**: Full conversation state stored in PostgreSQL via LangGraph checkpointer
- **Context Continuity**: Agent remembers previous questions within thread
- **Multi-thread Support**: Parallel conversations (e.g., different job postings)

#### 4. Streaming Response Architecture
```python
# FastAPI endpoint with SSE streaming
@app.post("/chat_agent/{thread_id}/stream")
async def stream_agent_response(
    thread_id: str,
    item: Message,
    checkpointer: CheckpointerDep,
    db: DBDep
):
    config = {
        "configurable": {
            "thread_id": thread_id,
            "recruiterId": item.recruiterId,
            "trigger": item.trigger  # Optional: "questions", "email", "compare"
        }
    }

    async def event_generator():
        async for event in agent.astream_events(
            {"messages": [HumanMessage(content=item.message)]},
            config=config,
            version="v2"
        ):
            # Filter only llm_response node chunks
            if (event["event"] == "on_chat_model_stream" and
                event["metadata"].get("langgraph_node") == "llm_response"):

                chunk = event["data"]["chunk"]
                if hasattr(chunk, 'content') and chunk.content:
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"

        yield f"data: {json.dumps({'type': 'end'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Key Features:**
- Filters chunks from `llm_response` node only
- Real-time token-by-token delivery
- Automatic state persistence via checkpointer
- Clean JSON SSE format

#### 5. Subscription-Based Resource Management
Frontend sends `max_threads` based on subscription tier:

```typescript
// agent-chat.service.ts
getSubscriptionLevel(): number {
  const level = this.recruiterService.currentRecruiterSubscriptionLevel();

  if (level >= 9) return 20;  // Enterprise
  if (level >= 7) return 10;  // Professional
  if (level >= 5) return 5;   // Business
  if (level >= 3) return 2;   // Starter
  return 1;                    // Free
}
```

Backend enforces limits via thread cleanup:
```python
# utils/thread_management.py
def cleanup_old_threads(checkpointer, recruiter_id, max_threads, current_thread_id):
    # Keep only N most recent threads per recruiter
    threads = get_recruiter_threads(recruiter_id)
    if len(threads) > max_threads:
        old_threads = threads[max_threads:]
        for thread in old_threads:
            if thread.id != current_thread_id:
                delete_thread(checkpointer, thread.id)
```

### Production Safeguards

**Context Isolation**:
```python
# context_loader only accesses recruiter's own data
jobs = db.query(Job).filter_by(owner_id=recruiter_id).all()
resumes = db.query(Resume).filter_by(recruiter_id=recruiter_id).all()

# Prevent cross-recruiter data leaks
if resume.recruiter_id != state["recruiter_id"]:
    raise UnauthorizedError("Access denied")
```

**Duplicate Detection & Disambiguation**:
```python
# resume_handler detects multiple candidates with same name
duplicates = [r for r in available_resumes if r["name"] == resume_name]

if len(duplicates) > 1:
    # Load full data with job_name for each
    state["duplicate_resumes"] = load_full_duplicate_data(duplicates)

    # general_talk formats clarification prompt with priority:
    # 1. Job position (most important)
    # 2. ThumbUp status
    # 3. Score (least important)
```

**Multi-language Support**:
```python
# All prompts in neutral English
PROMPT = """
You are a helpful HR recruitment assistant.
Respond in the SAME LANGUAGE the user writes in.
"""

# Language detection in context_loader and trigger_checker
language = detect_language(message, job_names)  # "es", "en", "fr"
state["language"] = language
```

**Error Recovery**:
```python
# Graceful fallback on DB failures
try:
    resumes = db.query(Resume).filter_by(recruiter_id=recruiter_id).all()
except Exception as e:
    logger.error(f"DB query failed: {e}")
    state["available_resumes"] = []
    # Agent continues with empty context
```

### Technical Stack (Backend)

- **Agent Framework**: LangGraph 1.0.1+ (state machine orchestration)
- **LLM Integration**: LangChain 1.0.2+
  - **GPT-4o-mini** (OpenAI): Intent detection, conversation, analysis, question generation
  - **Claude Haiku** (Anthropic): Fast domain classification (~50-100ms)
- **API Framework**: FastAPI (async, streaming SSE)
- **Database**: PostgreSQL 15 (jobs, candidates, resumes, thread states)
- **ORM**: SQLAlchemy 2.0 + Alembic
- **Checkpointer**: LangGraph PostgresSaver (conversation state persistence)
- **Package Manager**: uv (modern Python package manager)

### 📂 Backend Architecture Documentation

Detailed documentation on the LangGraph agent implementation:

👉 **[docs/AGENT_ARCHITECTURE.md](docs/AGENT_ARCHITECTURE.md)** - Complete guide covering:
- LangGraph state machine design
- Tool implementation patterns
- Thread management and persistence
- Streaming SSE protocol
- Deployment and scaling strategies

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Angular 19 (standalone components, signals)
- **UI:** Angular Material 19 + Tailwind CSS 3.4
- **i18n:** Transloco (English, Spanish, French)
- **Build:** Angular CLI 19

### Backend & Services
- **Authentication:** Firebase Auth (Google OAuth)
- **Database:** Cloud Firestore + PostgreSQL (agent backend)
- **AI Agent:** LangGraph + LangChain + FastAPI
- **File Storage:** Firebase Storage (resumes, PDFs)
- **Payments:** Stripe (subscriptions)

## 🚀 Quick Start

### Prerequisites
```bash
# Node.js LTS (v22.x recommended)
node -v  # v22.20.0

# Angular CLI
npm install -g @angular/cli
```

### Environment Setup
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Set up Railway/Render backend deployment for LangGraph agent
3. Create environment files:

```typescript
// src/environments/environment.development.ts
export const environment = {
  BACK_AGENT_BRIDGE: 'http://localhost:8000',  // LangGraph backend
  BACK_CHAT_URL: 'your-legacy-backend-url',
  WEBSITE_NAME: 'TalentGraph',
  STRIPE_PUBLIC_KEY: 'pk_test_...',
  firebase: {
    apiKey: "your-api-key",
    authDomain: "talent-graph.firebaseapp.com",
    projectId: "talent-graph",
    storageBucket: "talent-graph.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  }
};
```

```typescript
// src/environments/environment.ts (production)
export const environment = {
  BACK_AGENT_BRIDGE: 'https://agent-ai-bridge-to-works-production.up.railway.app',
  // ... same structure as development
};
```

### Installation & Run

#### Frontend
```bash
# Install dependencies
npm install

# Run development server
ng serve
# Navigate to http://localhost:4200

# Build for production
ng build
```

#### Backend (LangGraph Agent)
See [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md) for detailed instructions:
```bash
cd backend/
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY="sk-..."
export DATABASE_URL="postgresql://..."

# Run FastAPI server
uvicorn main:app --reload
# Agent API available at http://localhost:8000
```

### Firebase Configuration
```bash
# Set default Firebase project
firebase use talent-graph

# Deploy to Firebase Hosting
firebase deploy
```

## 📁 Project Structure

```
src/app/
├── components/
│   ├── recruiter/                 # Main recruiter features
│   │   ├── agent-chat/            # ⭐ LangGraph agent interface
│   │   ├── agent-chats-list/      # Thread management (WIP)
│   │   ├── recruiter-dashboard/   # Central hub with view switching
│   │   ├── jobs-list/             # Job postings table
│   │   ├── candidates-list/       # Candidate pipeline
│   │   ├── login-and-register/    # Google OAuth + email auth
│   │   ├── own-resumes/           # Recruiter's saved resumes
│   │   ├── resume-viewer/         # PDF viewer with data overlay
│   │   ├── sync-job/              # PostgreSQL sync component
│   │   └── sync-resume/           # Resume sync to agent DB
│   ├── candidate/                 # Candidate-facing components
│   │   ├── user-candidate-page/   # Job browsing
│   │   └── candidate-application/ # Application flow
│   └── shared/                    # Reusable components
│       ├── pdf-show/              # PDF renderer
│       ├── loading-bar/           # Loading states
│       └── lang-switcher/         # i18n toggle
├── guards/
│   ├── auth.guard.ts              # Protects /recruiter routes
│   └── public.guard.ts            # Redirects logged-in users
├── models/
│   ├── recruiter.ts               # Recruiter, subscription levels
│   ├── job.ts                     # Job postings
│   ├── candidate.ts               # Candidate profiles
│   ├── resume.ts                  # Resume data structure
│   └── chatMessage.ts             # Agent chat messages
├── services/
│   ├── auth.service.ts            # Firebase auth wrapper
│   ├── recruiter-auth.service.ts  # Recruiter-specific auth
│   ├── agent-chat.service.ts      # ⭐ LangGraph agent client
│   ├── agent-sync.service.ts      # PostgreSQL sync service
│   ├── job-crud.service.ts        # Job CRUD operations
│   ├── candidate.service.ts       # Candidate queries
│   └── resume.service.ts          # Resume management
├── pages/
│   ├── mainpage-bridgetoworks/    # Landing page
│   ├── recruiter-page/            # Recruiter dashboard wrapper
│   └── candidate-page/            # Public job view
└── app.routes.ts                  # Route configuration
```

### Backend Structure (Refactored v2.0)
```
backend/src/
├── api/                           # FastAPI application layer
│   ├── main.py                    # App entry point (36 lines)
│   ├── config.py                  # Centralized configuration
│   ├── dependencies.py            # Dependency injection
│   ├── db.py                      # Database setup & checkpointer
│   ├── models.py                  # SQLAlchemy models (Resume, Job)
│   │
│   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── chat.py                # Message, ChatResponse
│   │   ├── resume.py              # ResumeData, SyncResumesRequest
│   │   └── job.py                 # JobData, SyncJobsRequest
│   │
│   ├── routes/                    # API endpoints by domain
│   │   ├── health.py              # Health checks
│   │   ├── chat.py                # ⭐ Chat + SSE streaming
│   │   ├── resumes.py             # Resume sync & CRUD
│   │   ├── jobs.py                # Job sync & CRUD
│   │   └── threads.py             # Thread management
│   │
│   └── utils/                     # Helper functions
│       ├── text_extraction.py     # Resume/job full-text extraction
│       └── thread_management.py   # Thread cleanup utilities
│
├── agents/first_agent/            # ⭐ LangGraph agent implementation
│   ├── first_agent.py             # StateGraph compilation
│   ├── state.py                   # HRState TypedDict
│   │
│   ├── nodes/                     # Agent processing nodes
│   │   ├── trigger_checker/       # Action trigger detection
│   │   ├── silent_loader_checker/ # Silent loading detection
│   │   ├── domain_checker/        # HR vs general classification
│   │   ├── context_loader/        # Load jobs + resumes with JOINs
│   │   ├── intent_checker/        # Job/resume/general intent
│   │   ├── job_handler/           # Job identification
│   │   ├── resume_handler/        # Candidate identification + duplicates
│   │   ├── resume_matcher/        # Candidate analysis for job
│   │   ├── general_talk/          # Prompt builder
│   │   ├── llm_node/              # LLM invocation with streaming
│   │   ├── question_generator/    # Interview questions generator
│   │   └── state_logger/          # State logging
│   │
│   ├── helpers/                   # Shared utilities
│   │   ├── keywords.py            # Confirmation/rejection keywords
│   │   ├── trigger_keywords.py    # Action trigger keywords
│   │   ├── text_utils.py          # Normalization, fuzzy search
│   │   └── formatters.py          # Data formatters
│   │
│   └── routes/                    # Conditional routing logic
│       ├── trigger_route/         # Route by action_trigger
│       ├── silent_loader_route/   # Route silent loading
│       ├── domain_route/          # Route by domain
│       ├── context_loader_route/  # Route after context load
│       └── intent_route.py        # Route by user_intent
│
├── pyproject.toml                 # Dependencies (uv format)
├── uv.lock                        # Locked versions
└── docker-compose.yml             # PostgreSQL + pgAdmin
```

## 🎮 Recruiter Workflow

```mermaid
graph TD
    A[Recruiter logs in via Google OAuth] --> B[Redirect to /recruiter]
    B --> C[RecruiterDashboard loads]
    C --> D[forkJoin: Jobs, Candidates, Resumes]
    D --> E{Default View: agent_chat}
    E --> F[AgentChat Component]
    F --> G[User types message]
    G --> H[Generate threadId: uid_timestamp_random]
    H --> I[POST to LangGraph backend /stream]
    I --> J[Backend loads thread state]
    J --> K[LangGraph agent processes]
    K --> L{Agent decides}
    L -->|Need data| M[Call tools: get_candidates, etc.]
    L -->|Have context| N[Generate response]
    M --> K
    N --> O[Stream SSE chunks to frontend]
    O --> P[Display real-time in chat]
    P --> Q[Optional: Text-to-Speech]
    Q --> R[Save thread state to PostgreSQL]
```

## 🔐 Authentication & Guards

### Auth Guard
```typescript
// Protects /recruiter, /job-crud, /recruiter-account
authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  return authService.user$.pipe(
    map(user => !!user),
    tap(isLoggedIn => {
      if (!isLoggedIn) {
        inject(Router).navigate(['/login']);
      }
    })
  );
};
```

### Public Guard
```typescript
// Redirects logged-in users away from /login
publicGuard: CanActivateFn = (route, state) => {
  // If user is logged in, redirect to /recruiter
  // Otherwise, allow access to /login
};
```

## 📊 Data Models

### Recruiter
```typescript
interface Recruiter {
  recruiterUID: string;
  email: string;
  username: string;
  subscriptionLevel: number;        // 1-10 (controls features)
  businessName?: string;
  useExams?: boolean;               // Enable exam assignments
  useManager?: boolean;             // Team management
  useAgentsAI?: boolean;            // AI agent access
}
```

### Job
```typescript
interface Job {
  jobId: string;
  name: string;
  description: string;
  ownerId: string;                  // recruiterUID
  active: boolean;
  examId?: string;
  // Salary configuration
  showSalary?: boolean;
  minSalary?: number;
  maxSalary?: number;
  fixSalary?: number;
  salaryHour?: boolean;
  salaryWeek?: boolean;
  salaryMonth?: boolean;
  salaryYear?: boolean;
  currencySalary?: string;          // USD, EUR, etc.
  hoursPerWeek?: number;
}
```

### Resume
```typescript
interface Resume {
  candidateUID: string;
  jobRelated: string;               // jobId
  recruiterId: string;
  scoreToPosition?: number;         // AI-generated score
  thumbUp?: boolean;                // Recruiter feedback
  // Parsed data
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills?: string[];
  languages?: string[];
  works?: Work[];
  certifications?: Certification[];
  education?: Education[];
  useWithAgent?: boolean;           // Sync to agent DB
}
```

### Chat Message
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  threadId?: string;
}
```

## 🌐 Agent Chat API

### Stream Endpoint
```http
POST /chat_agent/{threadId}/stream
Content-Type: application/json

{
  "message": "Show me candidates for Software Engineer position",
  "recruiterId": "abc123",
  "max_threads": 10
}
```

**Response (SSE)**:
```
data: {"type": "content", "content": "Let me check your "}
data: {"type": "content", "content": "active Software Engineer "}
data: {"type": "content", "content": "positions...\n\n"}
data: {"type": "tool_call", "tool": "get_recruiter_jobs"}
data: {"type": "content", "content": "I found 3 candidates:\n\n"}
data: {"type": "content", "content": "1. **John Doe** - 5 years Python\n"}
```

### Thread Management
```http
# Clear conversation history
DELETE /threads/{threadId}

# Get thread history
GET /threads/{threadId}

# List recruiter's threads
GET /threads/recruiter/{recruiterId}
```

## 🎯 Subscription Tiers

| Level | Max Threads | Features |
|-------|-------------|----------|
| 1-2 (Free) | 1 | Basic job posting, limited agent |
| 3-4 (Starter) | 2 | Multiple jobs, basic analytics |
| 5-6 (Business) | 5 | Exams, advanced filtering |
| 7-8 (Professional) | 10 | Team management, API access |
| 9-10 (Enterprise) | 20 | White-label, custom integrations |

## 🚢 Deployment

### Frontend (Firebase Hosting)
```bash
# Build production bundle
ng build

# Deploy to Firebase
firebase deploy --only hosting
```

### Backend (Railway/Render)
```bash
# Railway deployment
railway up

# Or using Docker
docker build -t bridge-agent .
docker push registry.railway.app/bridge-agent
```

### Environment Variables (Backend)
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:pass@host:5432/bridge
REDIS_URL=redis://host:6379
FIREBASE_ADMIN_SDK={"type": "service_account", ...}
```

## 🔑 Key Architectural Patterns

### Angular Signals
```typescript
// Reactive state management
recruiterSig = signal<Recruiter | null>(null);
jobsSig = signal<Job[]>([]);

// Computed values
activeJobsCount = computed(() =>
  this.jobsSig().filter(job => job.active).length
);
```

### RxJS Patterns
```typescript
// Parallel data loading
forkJoin({
  candidates: this.candidateService.getCandidatesByRecruiter(uid),
  jobs: this.jobService.getJobs(uid),
  resumes: this.resumeService.getResumesForRecruiter(uid)
}).pipe(take(1)).subscribe(results => {
  // Process all data
});
```

### SSE Streaming Client
```typescript
// Real-time agent responses
async streamResponse(message: string, threadId: string) {
  const response = await fetch(`${BACK_AGENT_BRIDGE}/chat_agent/${threadId}/stream`, {
    method: 'POST',
    body: JSON.stringify({ message, recruiterId, max_threads })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'content') {
          // Append to message in real-time
          this.appendToCurrentMessage(data.content);
        }
      }
    }
  }
}
```

## 🎯 Production Features

- ✅ **Real-time AI Chat**: LangGraph-powered agent with streaming
- ✅ **Multi-threading**: Parallel conversation contexts
- ✅ **Session Persistence**: Thread state saved to PostgreSQL
- ✅ **Subscription Control**: Feature gating based on tier
- ✅ **Resume Parsing**: Automated data extraction
- ✅ **Job Posting**: Full CRUD with advanced options
- ✅ **Text-to-Speech**: Accessibility and audio learning
- ✅ **Google OAuth**: Secure, frictionless authentication
- ✅ **Multi-language**: English, Spanish, French
- ✅ **Action Triggers**: Fast path for questions, emails, comparisons
- ✅ **Smart Caching**: Context invalidation for fresh data
- ✅ **Duplicate Detection**: Intelligent candidate disambiguation
- ✅ **Vector Embeddings**: OpenAI embeddings for semantic resume search

---

## ⚡ Performance Metrics (v3.0)

Real-world latency measurements from production:

| Operation | Latency | Notes |
|-----------|---------|-------|
| **Action Trigger Detection** | < 5ms | Frontend explicit: 0ms, Heuristic: ~1ms |
| **Silent Load Detection** ✨ | < 1ms | Detects "start-loading-state" |
| **Pending Action Resolver** ✨ | ~1-5ms | Resolves conflicts from previous turn |
| **Job Mention Checker** ✨ | ~1-5ms | Fuzzy matching for job detection |
| **Candidate Detector** ✨ | ~1-3ms | Fuzzy matching + conflict detection |
| **Job List Checker** ✨ | < 1ms | Detects list request keywords |
| **Candidate Filter** ✨ | ~1-3ms | Filters candidates by job + keywords |
| **Talk With State** ✨ | < 5ms | Fast path prompt preparation (v3.0) |
| **Fast Path v3.0** ✨ | **< 10ms + LLM** | context_resolver → talk_with_state (skips domain + context_loader) |
| **Silent Loading** | ~500ms → 0ms | One-time pre-load, then cached |
| **Context Resolver** | ~3-50ms | Fuzzy matching for candidate context |
| **Context Enricher** | ~0-6ms | Enrichment in all paths |
| **Fast Path (General)** | ~1ms + LLM | No DB queries for casual conversation |
| **HR Path (First Load)** | ~500ms + LLM | Context loader with JOINs + analysis |
| **HR Path (Cached)** | 0ms + LLM | Cache hit - no DB queries |
| **HR Path (Invalidated)** | ~500ms + LLM | Force reload when `domain=hr_related` |
| **TTFT (Time to First Token)** | ~962ms | Typical for GPT-4o-mini |
| **Total LLM Response** | ~2275ms | Medium-length response |
| **Domain Check (Haiku)** | ~50-100ms | Claude Haiku classification |
| **Domain Check (Heuristic)** | ~1ms | Short message fast path |
| **Intent Detection** | ~100-150ms | GPT-4o-mini structured output |
| **Question Generation** | ~2-3s | Personalized questions with context |
| **Email Generation** | ~2-3s | Personalized emails with candidate data |
| **Candidate Comparison** | ~50ms | Deterministic, no LLM (direct_response) |

### Optimization Impact

| Optimization | Improvement | Description |
|--------------|-------------|-------------|
| Silent Loading | 500ms → 0ms | Pre-load context on mount |
| Fast Path | 500ms → 1ms | Skip DB for general talk |
| Context Cache | 500ms → 0ms | Reuse loaded data |
| Action Triggers | 200ms → 5ms | Skip domain/intent checks |
| Haiku for Domain | 200ms → 50ms | Faster classification model |
| Heuristic Routing | 50ms → 1ms | Keyword-based decisions |

## 🔧 Development Notes

### Path Aliases
```typescript
// tsconfig.json
"@models/*": ["src/app/models/*"]
"@services/*": ["src/app/services/*"]
"@recruiter/*": ["src/app/components/recruiter/*"]
"@candidate/*": ["src/app/components/candidate/*"]
```

### Code Conventions
- Components: `kebab-case.component.ts`
- Services: `kebab-case.service.ts`
- Signals: `nameSig` or `nameSignal`
- Observables: `name$`
- Models: `PascalCase` interfaces

### Legacy Code Warning
The project contains legacy educational platform code in:
- `components/teacher/`
- `components/school/`
- `components/evaluation/`
- `components/superadmin/`

**Do not modify these directories** - they are maintained for backward compatibility but not actively used.

## 🔍 Troubleshooting

### Common Issues & Solutions

**Issue: "Agent responds in wrong language"**
- ✅ **Fixed** - All prompts now in neutral English
- System prompts include: "Respond in the SAME LANGUAGE the user writes in"
- Language detected automatically in `context_loader` and `trigger_checker`

**Issue: "New candidates not showing up"**
- ✅ **Fixed** - Smart cache invalidation implemented
- When `domain=hr_related` → forces context reload
- Ensures fresh data when recruiter asks about candidates

**Issue: "Multiple candidates with same name - unclear which one"**
- ✅ **Fixed** - Duplicate detection implemented
- Agent shows distinguishing info with priority:
  1. Job position (most important)
  2. ThumbUp status (recruiter approval)
  3. Score (least important)
- Multi-language disambiguation prompts (ES/EN/FR)

**Issue: "Question generator responds in English even when user writes in Spanish"**
- ✅ **Fixed** - Language detection moved to `trigger_checker`
- Language detected before action generators run
- `question_generator` uses language from state

**Issue: "Slow first message in conversation"**
- ✅ **Fixed** - Silent loading implemented
- Frontend sends "start-loading-state" on component mount
- Context pre-loaded (~500ms one-time cost)
- Subsequent messages feel instant

**Issue: "Messages disappearing from history"**
- ✅ **Fixed** - Chunk accumulation implemented
- `llm_node` accumulates full content before creating AIMessage
- Empty messages filtered in `/history` endpoint

---

## 🤝 Contributing

Contributions welcome! Please:
1. Review [docs/AGENT_ARCHITECTURE.md](docs/AGENT_ARCHITECTURE.md) for backend details
2. Follow existing code conventions
3. Test new features with Bruno collection (`/Bruno-Bridge-agent`)
4. Update documentation for any new nodes or routes

### Backend Development

**Local Setup:**
```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies
uv sync

# Run server
uv run uvicorn src.api.main:app --reload --port 8000
```

**Adding New Agent Nodes:**
1. Create folder in `src/agents/first_agent/nodes/`
2. Add `node.py` with processing logic
3. Add `prompt.py` if using LLM
4. Register node in `first_agent.py`
5. Add routing logic if needed
6. Update `HRState` if new fields required

**Testing:**
- Use Bruno collection for API tests
- Check pgAdmin for database state
- Monitor logs for node execution flow

---

## 📚 References

### Documentation
- **LangGraph:** https://langchain-ai.github.io/langgraph/
- **LangChain:** https://python.langchain.com/
- **FastAPI:** https://fastapi.tiangolo.com/
- **Angular:** https://angular.dev/
- **Firebase:** https://firebase.google.com/docs

### Backend Repository
- Production: https://agent-ai-bridge-to-works-production.up.railway.app
- GitHub: [Contact maintainer for access]

### Related Documentation
- [docs/AGENT_ARCHITECTURE.md](docs/AGENT_ARCHITECTURE.md) - Detailed backend architecture

---

## 📝 License

MIT License - see LICENSE file for details

---

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Review existing documentation
- Check troubleshooting section above

---

**Built with ❤️ using Angular 19, LangGraph, LangChain, and Firebase**

*Intelligent recruitment powered by state-of-the-art AI agents*

**Key Technologies:**
- **Frontend:** Angular 19 + Signals + RxJS + Material UI
- **Backend:** LangGraph + FastAPI + PostgreSQL
- **AI Models:** GPT-4o-mini (OpenAI) + Claude Haiku (Anthropic)
- **State Management:** LangGraph PostgresSaver checkpointer
- **Deployment:** Firebase Hosting + Railway
