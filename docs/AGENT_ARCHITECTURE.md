# LangGraph Agent Backend - Talent-Graph

This is the **production-ready LangGraph agent** that powers the TalentGraph recruitment platform's AI chat interface.

## 🎯 What This Demonstrates

This FastAPI + LangGraph application showcases **9 key agent optimizations**:

1. **Action Triggers with Selection Resolver** - Ultra-fast routing (< 5ms) with fuzzy matching for job/candidate detection
2. **Context Resolver** - Detects context BEFORE domain routing, enables early termination with pending_action
3. **Context Enricher** - Universal enrichment in ALL paths before LLM (~0-6ms)
4. **Silent Loading** - Pre-loads context on mount (~500ms one-time, then 0ms cached)
5. **Fast Path** - General conversation without DB queries (~1ms + LLM)
6. **Smart Caching** - Context invalidation based on domain (domain=hr_related forces reload)
7. **Direct Response** - Streaming of deterministic responses without LLM (comparison_generator)
8. **Multi-Model Strategy** - GPT-4o-mini for conversation + Claude Haiku for fast classification (~50-100ms)
9. **PostgreSQL Checkpointing** - Full conversation state persistence via LangGraph

---

## 🏗️ Architecture Overview

### LangGraph State Machine

The agent uses a **StateGraph** with **19 specialized nodes** organized in **5 categories** and **8 conditional routes**:

```
START → state_logger_start → trigger_checker → post_trigger_route
                                                        ↓
                               ┌────────────────────────┴────────────────────────┐
                               ↓                                                 ↓
                    action_trigger activo                            action_trigger=None
                    (questions/email/compare)                                    ↓
                               ↓                                        silent_loader_checker
                      selection_resolver                                         ↓
                               ↓                               ┌─────────────────┴─────────────────┐
                         trigger_route                         ↓                                   ↓
                ┌──────────────┼──────────────┐       silent_load=True                   silent_load=False
                ↓              ↓              ↓                ↓                                   ↓
         question_gen    email_gen    comparison_gen   context_loader                      context_resolver
                ↓              ↓              ↓          (pre-carga)                               ↓
    action_generator_route     │              │                ↓                          context_resolver_route
         ↓           ↓          │              │               END                         ↓                  ↓
   AIMessage  SystemMessage     │              │                                  pending_action       sin pending_action
         ↓           ↓          │              │                                          ↓                  ↓
   direct_resp  llm_response    │              │                                    llm_response        domain_checker
         ↓           ↓          │              │                                          ↓                  ↓
        END         END    action_generator_route                                       END          domain_route
                                ↓           ↓                                                    ↓            ↓
                           AIMessage  SystemMessage                                        general    hr_related
                                ↓           ↓                                                    ↓            ↓
                           direct_resp llm_resp                                       context_enricher context_loader
                                ↓           ↓                                                    ↓            ↓
                               END         END                                           general_talk   intent_checker
                                                                                                ↓      ┌─────┼─────┐
                                                                                         llm_response  │     │     │
                                                                                                ↓     job resume general
                                                                                               END    │     │     │
                                                                                                      ↓     ↓     ↓
                                                                                             job_handler resume_handler context_enricher
                                                                                                      ↓     ↓     ↓
                                                                                            resume_matcher│     │
                                                                                                      ↓     │     │
                                                                                             context_enricher   │
                                                                                                      ↓     │     │
                                                                                                general_talk↓  ↓
                                                                                                      ↓  general_talk
                                                                                                llm_response ↓
                                                                                                      ↓  llm_response
                                                                                                     END ↓
                                                                                                        END
```

### 5 Key Agent Flows

#### 1️⃣ Action Trigger Path (< 5ms)
- **Frontend sends explicit trigger** → selection_resolver → action generator → direct_response/llm_response
- **Supported triggers:** `questions`, `email`, `compare`
- **Performance:** < 5ms detection (0ms frontend explicit, ~1ms heuristic)
- **Example:** "Generate interview questions for María López"

#### 2️⃣ Silent Loading Path (~500ms → 0ms)
- **Frontend sends "start-loading-state"** on component mount
- **Flow:** silent_loader_checker → context_loader → END (no response)
- **Purpose:** Pre-loads jobs + resumes for instant access
- **Performance:** ~500ms one-time, then 0ms cached

#### 3️⃣ Fast Path - General (~1ms + LLM)
- **Casual conversation** without HR context
- **Flow:** domain_checker → context_enricher → general_talk → llm_response
- **Performance:** ~1ms + LLM (no DB queries)
- **Example:** "Hello", "How are you?"

#### 4️⃣ HR Path - Context Analysis (~500ms + analysis)
- **HR-related questions** about jobs/candidates
- **Flow:** domain_checker → context_loader → intent_checker → job/resume handlers
- **All paths** go through context_enricher before general_talk
- **Performance:** ~500ms context load (or 0ms cached) + LLM

#### 5️⃣ Context Resolver Path (early termination)
- **Detects ambiguity** in job/candidate mentions
- **Flow:** context_resolver → generates pending_action → llm_response → END
- **Purpose:** Prevents unnecessary processing, asks for clarification
- **Example:** Multiple candidates with same name

---

## 📊 Performance Metrics

| Operation | Latency | Description |
|-----------|---------|-------------|
| **Action Trigger Detection** | < 5ms | Frontend explicit (0ms) or heuristic (~1ms) |
| **Silent Loading** | ~500ms → 0ms | One-time pre-load, then cached |
| **Context Resolver** | ~0-50ms | Fuzzy matching for context detection |
| **Context Enricher** | ~0-6ms | Enrichment in all paths |
| **Fast Path** | ~1ms + LLM | No DB queries for general conversation |
| **HR Path (First)** | ~500ms + LLM | Context load with JOINs + analysis |
| **HR Path (Cached)** | 0ms + LLM | Cache hit - no DB queries |
| **HR Path (Invalidated)** | ~500ms + LLM | Force reload when domain=hr_related |
| **TTFT** | ~962ms | Time to first token from GPT-4o-mini |
| **Total LLM** | ~2275ms | Complete response generation |

### Optimization Impact

- **Action Triggers:** 200ms → 5ms (skip domain/intent checks)
- **Silent Loading:** 500ms → 0ms (pre-load eliminates first message delay)
- **Fast Path:** 500ms → 1ms (no DB for casual conversation)
- **Context Caching:** 500ms → 0ms (reuse loaded data)
- **Context Enricher:** Universal enrichment (~0-6ms across all paths)
- **Direct Response:** ~50ms (deterministic, no LLM for comparisons)

---

## 🧠 State Management

### HRState (TypedDict)

The agent's state includes:

```python
class HRState(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]

    # Recruiter
    recruiter_id: str

    # Jobs
    job_id: str | None
    job_name: str | None
    job_description: str | None
    job_data: dict | None
    available_jobs: List[Dict[str, str]] | None

    # Resumes
    resumeId: str | None
    resume_name: str | None
    resume_job_related_id: str | None
    resume_job_related_id_score: str | None
    available_resumes: List[Dict[str, Any]] | None  # Includes job_name via JOIN
    matched_resumes: List[Dict[str, Any]] | None
    matched_resumes_info: str | None
    duplicate_resumes: List[Dict[str, Any]] | None

    # Domain & Intent & Language
    domain: str | None  # "hr_related" | "general"
    user_intent: str | None  # "job" | "resume" | "general"
    language: str | None  # "es" | "en" | "fr"
    silent_load: bool | None

    # Action Triggers
    action_trigger: str | None  # "questions" | "email" | "compare" | None

    # Early Termination
    pending_action: str | None  # For context_resolver ambiguity
```

**Key Features:**
- `add_messages` reducer appends messages (doesn't replace)
- `available_resumes` includes `job_name` from JOIN optimization
- `duplicate_resumes` for disambiguation (multiple candidates, same name)
- `action_trigger` for fast path routing
- `pending_action` for early termination with clarification

---

## 🔧 Node Categories (19 Total)

### 1️⃣ Entry & Logging (2 nodes)
- **state_logger_start** - Initial state logging with counts
- **state_logger_end** - Final state logging + metrics

### 2️⃣ Action Trigger System (6 nodes)
- **trigger_checker** - Detects action triggers (< 5ms)
  - Priority: Frontend explicit (0ms) → Heuristic keywords (~1ms)
  - Supports: ES/EN/FR keywords
- **selection_resolver** - Resolves job/candidate selection
  - Fuzzy matching (30% threshold)
  - Searches in user message if not in state
- **question_generator** - Generates interview questions
  - Loads complete resume data
  - Personalizes based on experience, skills, education
- **email_generator** - Generates personalized emails
  - Types: rejection, invitation, request_info, follow_up
  - Uses candidate + job context
- **comparison_generator** - Generates candidate comparisons
  - Deterministic format with structured data
  - Filters by job_id
- **direct_response** - Streams AIMessage without LLM
  - Pass-through for deterministic responses
  - Used by comparison_generator (always)

### 3️⃣ Context Management (4 nodes)
- **silent_loader_checker** - Detects "start-loading-state"
- **context_resolver** - Detects context BEFORE domain routing ✨ NEW
  - Fuzzy matching for jobs (exact → keyword → fuzzy 30%)
  - Fuzzy matching for candidates (exact → fuzzy 30%)
  - Generates `pending_action` if ambiguous
  - Enables early termination
- **context_loader** - Loads jobs + resumes from DB
  - JOIN optimization for job_name
  - Cache invalidation when domain=hr_related
  - Language detection (first load only)
- **context_enricher** - Enriches context in ALL paths ✨ NEW
  - Detects additional mentions
  - Universal execution before general_talk
  - ~0-6ms performance

### 4️⃣ Intent & Domain Routing (5 nodes)
- **domain_checker** - HR vs general pre-filter
  - Heuristic (~1ms): Short messages without HR keywords → general
  - LLM (Claude Haiku ~50-100ms): If heuristic inconclusive
- **intent_checker** - Detects job/resume/general mention
  - GPT-4o-mini with structured output
- **job_handler** - Identifies specific job
  - Fuzzy matching with available_jobs
  - Falls back to list if no match
- **resume_handler** - Identifies candidate + duplicates
  - Searches by name with fuzzy matching
  - Loads duplicate_resumes if multiple found
- **resume_matcher** - Analyzes candidates for job
  - Filters by jobRelated_id == job_id
  - Streaming analysis

### 5️⃣ LLM Invocation (2 nodes)
- **general_talk** - Prepares system prompts
  - Special handling for duplicates (priority: job → thumbUp → score)
  - Formats context with job_name for resumes
  - Multi-language prompts (ES/EN/FR)
- **llm_node** - Invokes LLM with streaming
  - GPT-4o-mini (temp=0.3)
  - Accumulates full content before AIMessage
  - Measures TTFT + total time

---

## 🛤️ Conditional Routes (8 Total)

| Route | From Node | Logic | Destinations |
|-------|-----------|-------|--------------|
| **post_trigger_route** | trigger_checker | Has action_trigger? | selection_resolver / silent_loader_checker |
| **trigger_route** | selection_resolver | Which trigger? | question_gen / email_gen / comparison_gen |
| **action_generator_route** | question/email_gen | Message type? | direct_response (AIMessage) / llm_response (SystemMessage) |
| **silent_loader_route** | silent_loader_checker | Silent load? | context_loader / context_resolver |
| **context_resolver_route** | context_resolver | Pending action? | llm_response (ambiguity) / domain_checker (continue) |
| **domain_route** | domain_checker | HR related? | context_loader / context_enricher |
| **context_loader_route** | context_loader | Silent load? | END / intent_checker |
| **intent_route** | intent_checker | Intent type? | job_handler / resume_handler / context_enricher |

---

## 🚀 API Endpoints

### Chat Endpoints

**POST /chat_agent/{thread_id}/stream** - Streaming SSE chat
```json
{
  "message": "Generate interview questions for María López",
  "recruiterId": "rec-123",
  "max_threads": 10,
  "trigger": "questions"  // Optional: "questions", "email", "compare"
}
```

**Response (SSE):**
```
data: {"type": "start"}
data: {"type": "content", "content": "**Interview"}
data: {"type": "content", "content": " Questions"}
...
data: {"type": "end"}
```

**GET /chat_agent/{thread_id}/history** - Conversation history
- Returns only HumanMessage and AIMessage
- Filters empty messages

### Sync Endpoints

**POST /resumes/sync** - Bulk candidate sync
```json
{
  "resumes": [
    {
      "resumeId": "r1",
      "name": "María López",
      "email": "maria@example.com",
      "jobRelated_id": "j1",
      "skills": ["React", "TypeScript"],
      ...
    }
  ]
}
```

**POST /jobs/sync** - Bulk job sync
```json
{
  "jobs": [
    {
      "job_id": "j1",
      "name": "Frontend Developer",
      "description": "We are looking for...",
      "owner_id": "rec-123",
      ...
    }
  ]
}
```

### Thread Management

**GET /threads?recruiterId=xxx** - List recruiter's threads

**DELETE /threads/{thread_id}** - Delete specific thread

**POST /maintenance/cleanup-orphaned-blobs** - Cleanup orphaned blobs

---

## 💡 Key Design Patterns

### 1. Early Termination Pattern
- **context_resolver** detects ambiguity → generates `pending_action` → llm_response → END
- Prevents unnecessary processing when clarification needed
- Example: "Tell me about María" (multiple Marías exist)

### 2. Universal Enrichment Pattern
- **ALL paths** go through `context_enricher` before `general_talk`
- Ensures consistent context enrichment
- Performance: ~0-6ms across all paths

### 3. Dual Response Pattern
- **action_generator_route** decides:
  - AIMessage → `direct_response` (deterministic, no LLM)
  - SystemMessage → `llm_response` (LLM processing)
- Used by question_generator and email_generator

### 4. Cache Invalidation Pattern
- **context_loader** checks `domain=hr_related`
- Forces cache reload to ensure fresh data
- 0ms cached → ~500ms when invalidated

### 5. Fuzzy Matching Pattern
- Used in: selection_resolver, context_resolver, job_handler, resume_handler
- Threshold: **30% similarity** for typo tolerance
- Example: "Maria" matches "María" (accent insensitive)

---

## 📦 Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
    job_id VARCHAR PRIMARY KEY,
    owner_id VARCHAR NOT NULL,  -- recruiter ID
    name VARCHAR NOT NULL,
    description TEXT,
    show_salary BOOLEAN,
    min_salary NUMERIC,
    max_salary NUMERIC,
    full_text_content TEXT,     -- For search
    synced_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_jobs_owner ON jobs(owner_id);
```

### Resumes Table
```sql
CREATE TABLE resumes (
    resumeId VARCHAR PRIMARY KEY,
    candidate_uid VARCHAR,
    recruiter_id VARCHAR NOT NULL,
    jobRelated_id VARCHAR,      -- FK to jobs
    name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    scoreToPosition VARCHAR,
    thumbUp BOOLEAN,
    skills JSON,                -- Array
    languages JSON,             -- Array
    works JSON,                 -- Array of objects
    education JSON,             -- Array
    certifications JSON,        -- Array
    full_text_content TEXT,     -- For search
    synced_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_resumes_recruiter ON resumes(recruiter_id);
CREATE INDEX idx_resumes_job ON resumes(jobRelated_id);
```

### Checkpoints Table (LangGraph)
```sql
-- Managed automatically by LangGraph PostgresSaver
-- Stores full conversation state per thread
```

---

## 🧪 Testing

### With Bruno (Recommended)

Collection available in `/Bruno-Bridge-agent`:
```bash
bruno open Bruno-Bridge-agent/
```

**Tests included:**
- `dev-post-stream-test.bru` - Local streaming
- `post-test-rail.bru` - Railway deployment
- `dev-post-test.bru` - Synchronous chat

### With curl

**Streaming chat:**
```bash
curl -X POST http://localhost:8000/chat_agent/thread-123/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate questions for María López",
    "recruiterId": "rec-456",
    "trigger": "questions"
  }'
```

**History:**
```bash
curl http://localhost:8000/chat_agent/thread-123/history
```

---

## 🏛️ Tech Stack

**Core:**
- Python 3.13
- FastAPI (async web framework)
- uv (package manager)

**AI/LLM:**
- LangGraph 1.0+ (agent orchestration)
- LangChain 1.0+ (LLM abstraction)
- OpenAI GPT-4o-mini (primary model)
- Anthropic Claude Haiku (fast classification)

**Database:**
- PostgreSQL 15
- SQLAlchemy 2.0 (ORM)
- psycopg3 (adapter)
- LangGraph PostgresSaver (checkpointing)

**Infrastructure:**
- Docker Compose (local dev)
- Railway (deployment)
- Nixpacks (build system)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- PostgreSQL 15+
- Docker (optional)

### Installation

1. **Install uv:**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Clone and install:**
   ```bash
   git clone <repo>
   cd agent-back-bridgetoworks
   uv sync
   ```

3. **Configure .env:**
   ```env
   OPENAI_API_KEY=sk-proj-...
   ANTHROPIC_API_KEY=sk-ant-api03-...
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_test
   ```

4. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

5. **Run server:**
   ```bash
   uv run fastapi dev src/api/main.py --port 8000
   ```

Server available at http://localhost:8000

---

## 📝 Production Features

✅ **19 Specialized Nodes** - Organized in 5 categories
✅ **8 Conditional Routes** - Intelligent flow control
✅ **5 Key Agent Flows** - Action triggers, silent loading, fast path, HR path, context resolver
✅ **Fuzzy Matching** - 30% threshold for typo tolerance
✅ **Early Termination** - Context resolver with pending_action
✅ **Universal Enrichment** - Context enricher in ALL paths
✅ **Direct Response** - Deterministic responses without LLM
✅ **Multi-Model Strategy** - GPT-4o-mini + Claude Haiku
✅ **Smart Caching** - Invalidation based on domain
✅ **PostgreSQL Checkpointing** - Full state persistence
✅ **SSE Streaming** - Real-time responses
✅ **Multi-language** - ES/EN/FR support
✅ **Duplicate Detection** - Intelligent disambiguation

---

## 🤝 Contributing

This project demonstrates advanced LangGraph patterns for production AI agents. Key areas for improvement:

1. **Vector Search** - Semantic candidate search with embeddings
2. **Workflow Agents** - Multi-step interview scheduling
3. **Tool Integration** - Calendar APIs, email sending
4. **Analytics** - Recruitment metrics and insights

**For recruiters viewing this:**
This agent showcases production-ready patterns including intelligent routing, performance optimization, and robust error handling - all crucial for real-world AI applications.

---

**Last updated:** 2026-01-08
**Version:** 2.3.0
**Backend Repository:** https://github.com/your-org/agent-back-bridgetoworks
**Contact:** For questions about this architecture, reach out via GitHub issues.
